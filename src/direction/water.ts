import type { StudyScene } from '../study/types';
import type { Settings, WaterRenderer } from '../types';
import { attenuateReflectionTone, isArchitecturalContact, isLotusContact, sampleReflectionCluster } from './water-polish';

// The direction scene offers three independent ten-color water ramps; land remains untouched.
// Each ramp keeps dark mirror tones, mid-water hues, and reserved highlights distinct.
const PALETTES: Record<Settings['palette'], readonly (readonly [number, number, number])[]> = {
  jade: [
    [8, 35, 42], [12, 49, 56], [18, 65, 70], [27, 82, 83], [39, 101, 98],
    [57, 123, 116], [83, 148, 137], [119, 174, 158], [161, 198, 177], [91, 111, 91],
  ],
  golden: [
    [39, 35, 29], [56, 47, 34], [76, 61, 38], [98, 76, 42], [122, 94, 48],
    [148, 115, 59], [174, 139, 76], [198, 164, 103], [220, 190, 137], [115, 104, 72],
  ],
  moon: [
    [20, 31, 50], [28, 43, 69], [39, 57, 87], [52, 73, 108], [69, 91, 128],
    [91, 111, 149], [117, 135, 169], [147, 162, 190], [180, 189, 210], [85, 98, 120],
  ],
};
const MAX_RIPPLES = 32;
// Master-aligned fixed mirror plane, independent of the variable shoreline silhouette.
const PLANE_NATIVE_640 = 198;
const REFLECTION_SQUASH = 0.52;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function hash(x: number, y: number): number {
  let n = (x * 374761393 + y * 668265263) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

/** Native-grid chamfer distances in thirds of a pixel. Uint16 avoids saturation at 960x540. */
function nativeDistance(mask: Uint8Array, width: number, height: number): Uint16Array {
  const d = new Uint16Array(width * height);
  d.fill(0xffff);
  for (let i = 0; i < d.length; i++) if (!mask[i]) d[i] = 0;
  for (let y = 0; y < height; y++) for (let x = 0, i = y * width; x < width; x++, i++) {
    if (!mask[i]) continue;
    let v = d[i];
    if (x && d[i - 1] + 3 < v) v = d[i - 1] + 3;
    if (y && d[i - width] + 3 < v) v = d[i - width] + 3;
    if (x && y && d[i - width - 1] + 4 < v) v = d[i - width - 1] + 4;
    if (x + 1 < width && y && d[i - width + 1] + 4 < v) v = d[i - width + 1] + 4;
    d[i] = v;
  }
  for (let y = height - 1; y >= 0; y--) for (let x = width - 1, i = y * width + x; x >= 0; x--, i--) {
    if (!mask[i]) continue;
    let v = d[i];
    if (x + 1 < width && d[i + 1] + 3 < v) v = d[i + 1] + 3;
    if (y + 1 < height && d[i + width] + 3 < v) v = d[i + width] + 3;
    if (x + 1 < width && y + 1 < height && d[i + width + 1] + 4 < v) v = d[i + width + 1] + 4;
    if (x && y + 1 < height && d[i + width - 1] + 4 < v) v = d[i + width - 1] + 4;
    d[i] = v;
  }
  return d;
}

export function createDirectionWaterRenderer(scene: StudyScene): WaterRenderer {
  const { width, height, scale, offsetX } = scene.camera;
  if (scene.mask.length !== width * height || scene.bankY.length !== width)
    throw new Error('Study water mask and bankY must match the native camera dimensions');
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) throw new Error('Canvas 2D is unavailable');
  const image = ctx.createImageData(width, height);
  const indices = new Uint8Array(width * height);
  const distance = nativeDistance(scene.mask, width, height);
  const groundCtx = scene.ground.getContext('2d');
  let ground: Uint8ClampedArray | null = null;
  try { ground = groundCtx?.getImageData(0, 0, width, height).data || null; } catch { ground = null; }
  const ripples: { x: number; y: number; born: number; strength: number }[] = [];
  const glints: { x: number; y: number; phase: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const x = clamp(Math.round(offsetX + (28 + i * 53) * scale), 0, width - 1);
    let y = (scene.bankY[x] ?? height) + Math.round((52 + (i % 3) * 14) * scale);
    while (y < height - 3 && !scene.mask[y * width + x]) y++;
    if (y < height - 3 && scene.mask[y * width + x] && distance[y * width + x] > 12)
      glints.push({ x, y, phase: i * 2.399963229728653 });
  }
  const plane = Math.round(PLANE_NATIVE_640 * height / 360);
  const rainDrops: { x: number; y: number; age: number; life: number }[] = [];
  let rainAccumulator = 0;
  let rainSeed = 0;
  let lastTime = 0;
  let frozenTime = 0;
  let timeOrigin = 0;
  let timeInitialized = false;
  let lastFrameKey = '';

  const addRipple = (x: number, y: number, time: number, strength = 1): boolean => {
    const ix = Math.round(x), iy = Math.round(y);
    if (ix < 0 || iy < 0 || ix >= width || iy >= height || !scene.mask[iy * width + ix]) return false;
    if (ripples.length >= MAX_RIPPLES) ripples.shift();
    ripples.push({ x: ix, y: iy, born: time, strength: clamp(strength, 0.25, 2) });
    return true;
  };

  function render(time: number, settings: Settings, objects: HTMLCanvasElement): void {
    const requested = Number.isFinite(time) ? time : lastTime;
    if (!timeInitialized) { timeOrigin = requested; frozenTime = requested; }
    else if (!settings.paused) frozenTime = requested;
    timeInitialized = true;
    const activeTime = settings.paused ? frozenTime : requested;
    const t = timeOrigin + Math.floor((activeTime - timeOrigin) * 10 + 1e-7) / 10;
    const dt = settings.paused ? 0 : clamp(t - lastTime, 0, 0.1);
    lastTime = t;
    const frameKey = [t, settings.depth, settings.sky, settings.reflections, settings.shoreline,
      settings.backBank, settings.particles, settings.rain, settings.distortion, settings.speed,
      settings.wind, settings.palette, settings.paused, ripples.length].join('|');
    if (frameKey === lastFrameKey) return;
    lastFrameKey = frameKey;
    const distortion = clamp(settings.distortion, 0, 6);
    let obj: Uint8ClampedArray | null = null;
    if (settings.reflections && objects?.width === width && objects.height === height) {
      try { obj = objects.getContext('2d')?.getImageData(0, 0, width, height).data || null; } catch { obj = null; }
    }

    for (let y = 0, p = 0; y < height; y++) {
      for (let x = 0; x < width; x++, p++) {
        if (!scene.mask[p]) { indices[p] = 0; continue; }
        // Distance is measured once on the native mask then interpreted in world units.
        const depthWorld = distance[p] / (3 * scale);
        let tone = settings.depth ? (depthWorld < 2 ? 4 : depthWorld < 6 ? 3 : 2) : 3;
        const bank = scene.bankY[x] ?? height;
        const row = (y - bank) / scale;
        if (settings.sky && row > 25 && depthWorld > 2) tone = Math.min(5, tone + (row > 120 ? 2 : 1));
        // Low-amplitude broken wave texture; deterministic 10 Hz animation, no large blobs/bands.
        const wave = Math.sin(y * 0.31 + Math.sin(x * 0.025 + t * 0.31) * 0.24 - t * 0.55);
        const fleck = Math.sin(x * 0.117 + y * 0.019 + t * 0.2);
        if (wave > 0.975 && fleck > 0.55 && tone < 5) tone++;

        if (settings.reflections && obj && y >= plane) {
          const mirrorRow = y - plane;
          // Native-pixel row wobble is capped at one pixel at the default setting and is
          // mathematically zero when distortion is zero, leaving a static, readable mirror.
          const amplitude = distortion === 0 ? 0 : Math.min(4 * scale, distortion * scale);
          const shift = amplitude === 0 ? 0 : Math.round(Math.sin(mirrorRow * 0.095 / scale - t * 1.1) * amplitude);
          const sx = x + shift;
          const sy = Math.round(plane - mirrorRow / REFLECTION_SQUASH);
          if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
            const cluster = sampleReflectionCluster(obj, width, height, sx, sy, mirrorRow / scale);
            if (cluster) {
              const lum = cluster.luminance;
              const reflectedTone = lum < 20 ? 0 : lum < 70 ? 1 : lum < 95 ? 2 : lum < 120 ? 3
                : lum < 155 ? 4 : lum < 185 ? 5 : lum < 215 ? 6 : 7;
              tone = attenuateReflectionTone(reflectedTone, mirrorRow / scale);
            }
          }
        }
        if (settings.backBank && row >= 2 && row <= 9 && depthWorld < 4
          && hash(Math.floor(x / (8 * scale)), Math.floor(row / 4)) > 0.46
          && (Math.floor(x / scale) + Math.floor(row)) % 4 !== 0) {
          const gy = bank - Math.round(row * scale);
          if (ground && gy >= 0) {
            const q = (gy * width + x) * 4;
            // Vegetation and stone remain distinguishable, but neither paints a continuous
            // high-contrast stripe around the pond.
            tone = ground[q + 1] > ground[q] + 12 ? 4 : 5;
          } else tone = 4;
        }
        // Selective dark contact at the stone-step / banyan-planter waterline. Unlike a
        // global shoreline outline, only broken one-to-three-pixel marks are eligible.
        if (settings.shoreline && (distance[p] <= 3 || isLotusContact(x, y, width, height, scale))) {
          const architectural = distance[p] <= 3 && isArchitecturalContact(x, y, bank, width, scale);
          const lotus = isLotusContact(x, y, width, height, scale);
          const dash = hash(Math.floor(x / scale), Math.floor(y / scale));
          if ((architectural && dash > 0.42) || (lotus && dash > 0.52)) tone = Math.min(tone, 1);
          // Sparse, dim surface glints remain a distinct highlight treatment.
          else if (!architectural && !lotus && dash > 0.94 && tone < 5) tone = 5;
        }
        indices[p] = tone;
      }
    }

    if (settings.particles) {
      for (const g of glints) {
        const pulse = Math.sin(t * 0.9 + g.phase);
        if (pulse > 0.35) {
          const tone = pulse > 0.86 ? 7 : 5;
          for (let dx = -1; dx <= 1; dx++) {
            const x = g.x + dx, p = g.y * width + x;
            if (x >= 0 && x < width && scene.mask[p] && (dx === 0 || pulse > 0.68)) indices[p] = tone;
          }
        }
      }
      // Three sparse deterministic drifting leaf clusters. Snap a cluster down to the
      // first water pixel at its x so it remains visible on curved native-grid shorelines.
      for (let i = 0; i < 3; i++) {
        const x = Math.floor((offsetX + (218 + i * 137 + t * (0.65 + settings.wind * 0.45)) * scale) % width);
        let y = Math.round((248 + i * 28) * scale + Math.sin(t * 0.45 + i * 2) * scale * 2);
        while (y < height - 2 && !scene.mask[y * width + x]) y++;
        for (let dy = 0; dy < 2; dy++) for (let dx = -1; dx <= 1; dx++) {
          const px = x + dx, py = y + dy;
          if (px >= 0 && px < width && py < height && scene.mask[py * width + px]) indices[py * width + px] = dy === 0 ? 8 : 9;
        }
      }
    }

    if (settings.rain <= 0) { rainDrops.length = 0; rainAccumulator = 0; }
    else {
      for (let i = rainDrops.length - 1; i >= 0; i--) {
        const drop = rainDrops[i];
        drop.age += dt;
        if (drop.age > drop.life || !scene.mask[drop.y * width + drop.x]) rainDrops.splice(i, 1);
      }
      rainAccumulator = Math.min(1, rainAccumulator + dt * Math.min(24, settings.rain * 7));
      while (rainAccumulator >= 1 && rainDrops.length < 80) {
        rainAccumulator--;
        const seed = ++rainSeed;
        const x = Math.abs((seed * 97 + 31) % width), y = Math.abs((seed * 53 + 19) % height);
        if (scene.mask[y * width + x]) rainDrops.push({ x, y, age: 0, life: 0.45 + (seed % 20) / 100 });
      }
      for (const drop of rainDrops) {
        const y = drop.y + Math.floor(drop.age / drop.life * Math.max(1, Math.round(3 * scale / 2)));
        if (y < height && scene.mask[y * width + drop.x]) indices[y * width + drop.x] = 5;
      }
    }

    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i], age = Math.max(0, t - r.born);
      if (age > 1.35) { ripples.splice(i, 1); continue; }
      if (!settings.particles) continue;
      const radius = (1 + age * 15) * scale, ry = radius * 0.36;
      const left = Math.max(0, Math.floor(r.x - radius - 1)), right = Math.min(width - 1, Math.ceil(r.x + radius + 1));
      const top = Math.max(0, Math.floor(r.y - ry - 1)), bottom = Math.min(height - 1, Math.ceil(r.y + ry + 1));
      for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) {
        const dx = (x - r.x) / radius, dy = (y - r.y) / ry;
        if (scene.mask[y * width + x] && Math.abs(Math.sqrt(dx * dx + dy * dy) - 1) < 0.11 && hash(x + 9, y + 23) > 0.15)
          indices[y * width + x] = r.strength > 1.35 ? 6 : 5;
      }
    }

    const palette = PALETTES[settings.palette] ?? PALETTES.jade;
    const rgba = image.data;
    for (let i = 0, q = 0; i < indices.length; i++, q += 4) {
      if (!scene.mask[i]) { rgba[q] = rgba[q + 1] = rgba[q + 2] = rgba[q + 3] = 0; continue; }
      const c = palette[Math.min(9, indices[i])];
      rgba[q] = c[0]; rgba[q + 1] = c[1]; rgba[q + 2] = c[2]; rgba[q + 3] = 255;
    }
    ctx!.putImageData(image, 0, 0);
  }

  return { canvas, addRipple, render, get rippleCount() { return ripples.length; } };
}
