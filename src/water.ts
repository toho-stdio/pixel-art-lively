import { HEIGHT, WIDTH, type Settings, type VillageScene, type WaterRenderer } from './types';

const PALETTES: Record<Settings['palette'], readonly (readonly [number, number, number])[]> = {
  jade: [[13, 43, 42], [19, 61, 55], [29, 82, 68], [43, 105, 79], [66, 128, 91], [91, 151, 104], [138, 184, 128], [177, 199, 137], [105, 111, 69], [54, 83, 57]],
  golden: [[44, 48, 38], [61, 64, 43], [82, 83, 48], [109, 103, 53], [137, 125, 65], [168, 151, 83], [205, 181, 111], [224, 201, 135], [124, 96, 57], [79, 89, 53]],
  moon: [[17, 35, 53], [22, 49, 70], [30, 67, 88], [42, 87, 108], [60, 110, 131], [83, 135, 151], [126, 166, 177], [162, 190, 194], [75, 82, 100], [46, 68, 86]],
};
const MAX_RIPPLES = 32;
const MAX_RAIN = 80;
const REFLECTION_PLANE = 190;
const REFLECTION_SQUASH = 0.52;

interface Drop { x: number; y: number; age: number; life: number; }

/** Cached 8-neighbour chamfer distance from every water pixel to dry land. */
export function waterDistance(mask: Uint8Array, width = WIDTH, height = HEIGHT): Uint8Array {
  const n = width * height;
  const d = new Uint8Array(n);
  d.fill(255);
  for (let i = 0; i < n; i++) if (!mask[i]) d[i] = 0;
  // Forward/backward chamfer passes provide a stable pixel distance field in O(WH).
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * width + x;
    if (mask[i]) {
      let v = d[i];
      if (x && d[i - 1] + 3 < v) v = d[i - 1] + 3;
      if (y && d[i - width] + 3 < v) v = d[i - width] + 3;
      if (x && y && d[i - width - 1] + 4 < v) v = d[i - width - 1] + 4;
      if (x + 1 < width && y && d[i - width + 1] + 4 < v) v = d[i - width + 1] + 4;
      d[i] = v;
    }
  }
  for (let y = height - 1; y >= 0; y--) for (let x = width - 1; x >= 0; x--) {
    const i = y * width + x;
    if (mask[i]) {
      let v = d[i];
      if (x + 1 < width && d[i + 1] + 3 < v) v = d[i + 1] + 3;
      if (y + 1 < height && d[i + width] + 3 < v) v = d[i + width] + 3;
      if (x + 1 < width && y + 1 < height && d[i + width + 1] + 4 < v) v = d[i + width + 1] + 4;
      if (x && y + 1 < height && d[i + width - 1] + 4 < v) v = d[i + width - 1] + 4;
      d[i] = v;
    }
  }
  return d;
}

function hash(x: number, y: number): number {
  let n = (x * 374761393 + y * 668265263) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

export function createWaterRenderer(scene: VillageScene): WaterRenderer {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH; canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) throw new Error('Canvas 2D is unavailable');
  const image = ctx.createImageData(WIDTH, HEIGHT);
  const indices = new Uint8Array(WIDTH * HEIGHT);
  const distance = waterDistance(scene.mask, WIDTH, HEIGHT);
  let ground: Uint8ClampedArray | null = null;
  try { ground = scene.ground.getContext('2d')?.getImageData(0, 0, WIDTH, HEIGHT).data || null; } catch { ground = null; }
  const ripples: { x: number; y: number; born: number; strength: number }[] = [];
  const glints: { x: number; y: number; phase: number }[] = [];
  for (let i = 0; i < 10; i++) {
    const x = 42 + i * 61;
    const bank = scene.bankY[x] ?? HEIGHT;
    let y = bank + 76 + (i % 3) * 18;
    while (y < HEIGHT - 4 && !scene.mask[y * WIDTH + x]) y++;
    if (y < HEIGHT - 4 && scene.mask[y * WIDTH + x] && distance[y * WIDTH + x] > 12)
      glints.push({ x, y, phase: (i / 10) * Math.PI * 2 });
  }
  const rain: Drop[] = [];
  let rainAccumulator = 0;
  let previousTime = 0;

  const addRipple = (x: number, y: number, time: number, strength = 1): boolean => {
    const ix = Math.round(x), iy = Math.round(y);
    if (ix < 0 || iy < 0 || ix >= WIDTH || iy >= HEIGHT || !scene.mask[iy * WIDTH + ix]) return false;
    if (ripples.length >= MAX_RIPPLES) ripples.shift();
    ripples.push({ x: ix, y: iy, born: time, strength: Math.max(0.25, Math.min(2, strength)) });
    return true;
  };

  function drawRain(dt: number, rate: number, t: number): void {
    if (rate <= 0) { rain.length = 0; rainAccumulator = 0; return; }
    for (let i = rain.length - 1; i >= 0; i--) {
      const p = rain[i]; p.age += dt;
      if (p.age > p.life || !scene.mask[p.y * WIDTH + p.x]) rain.splice(i, 1);
    }
    rainAccumulator = Math.min(1, rainAccumulator + dt * Math.min(24, rate * 7));
    while (rainAccumulator >= 1 && rain.length < MAX_RAIN) {
      rainAccumulator -= 1;
      // Deterministic placement from simulation time; drops never allocate per frame.
      const seed = Math.floor(t * 11 + rain.length * 17 + rainAccumulator * 101);
      const x = Math.abs((seed * 97 + 31) % WIDTH);
      const y = Math.abs((seed * 53 + 19) % HEIGHT);
      if (scene.mask[y * WIDTH + x]) rain.push({ x, y, age: 0, life: 0.45 + (seed % 20) / 100 });
    }
    for (const p of rain) {
      const k = Math.floor(p.age / p.life * 3);
      const x = Math.round(p.x + Math.sin(p.age * 12) * p.age * 4), y = p.y + k;
      if (x >= 0 && x < WIDTH && y < HEIGHT && scene.mask[y * WIDTH + x]) indices[y * WIDTH + x] = 5;
    }
  }

  function render(time: number, settings: Settings, objects: HTMLCanvasElement): void {
    const t = Number.isFinite(time) ? time : previousTime;
    const dt = Math.max(0, Math.min(0.1, t - previousTime));
    previousTime = t;
    const palette = PALETTES[settings.palette] || PALETTES.jade;
    const distortion = Math.max(0, Math.min(6, settings.distortion));
    let obj: Uint8ClampedArray | null = null;
    if (settings.reflections && objects && objects.width >= WIDTH && objects.height >= HEIGHT) {
      try { obj = objects.getContext('2d')?.getImageData(0, 0, WIDTH, HEIGHT).data || null; } catch { obj = null; }
    }
    for (let y = 0, p = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++, p++) {
        if (!scene.mask[p]) { indices[p] = 0; continue; }
        const depth = distance[p] / 3;
        let tone = settings.depth ? (depth < 2 ? 4 : depth < 6 ? 3 : 2) : 3;
        const bank = scene.bankY[x] ?? HEIGHT;
        const row = y - bank;
        if (settings.sky && row > 25 && depth > 2) tone = Math.min(5, tone + (row > 120 ? 2 : 1));
        // Quiet, elongated wavelets. Slow horizontal phase drift avoids large oval patches.
        const wavePhase = y * 0.34 + Math.sin(x * 0.027 + t * 0.36) * (0.22 + distortion * 0.045)
          + Math.sin(x * 0.009 - t * 0.19) * 0.15 - t * 0.58;
        const wave = Math.sin(wavePhase);
        const waveBreak = Math.sin(x * 0.13 + y * 0.012 + t * 0.22);
        if (wave > 0.99 && waveBreak > 0.85 && tone < 5) tone++;
        if (settings.reflections && obj && y >= REFLECTION_PLANE) {
          // A stable planar mirror anchor keeps the scene's scalloped shoreline
          // from bending the reflected roof/tree; the mask still clips all water pixels.
          const mirrorRow = y - REFLECTION_PLANE;
          const wobble = mirrorRow < 3 ? 0 : Math.round(
            Math.sin(mirrorRow * 0.31 - t * 1.1) * distortion * 0.6
            + Math.sin(mirrorRow * 0.13 + t * 0.7) * distortion * 0.3);
          const sx = x + wobble;
          const sy = Math.round(REFLECTION_PLANE - mirrorRow / REFLECTION_SQUASH);
          // Broken horizontal wavelets, not diagonal sine stripes crossing the image.
          const interrupt = mirrorRow > 5 && Math.sin(mirrorRow * 0.9 - t * 0.5) > 0.83
            && Math.sin(x * 0.11 + mirrorRow * 0.03) > -0.4;
          if (!interrupt && sx >= 0 && sx < WIDTH && sy >= 0 && sy < HEIGHT) {
            const q = (sy * WIDTH + sx) * 4;
            if (obj[q + 3] > 72) {
              const red = obj[q], green = obj[q + 1], blue = obj[q + 2];
              const lum = (red * 3 + green * 6 + blue) / 10;
              // Palette-mass reflection: terracotta roof/trunk in earth tone, canopy in jade.
              if (red > green * 1.12 && red > blue * 1.12) tone = lum > 145 ? 8 : 2;
              else if (green > red * 1.08 && green > blue * 0.9) tone = lum < 76 ? 3 : 4;
              else if (lum < 34) tone = 2;
              else if (lum < 75) tone = 3;
              else if (lum < 135) tone = 4;
              else tone = 5;
            }
          }
        }
        // Very sparse broad-value leaf/sky reflections carry into the quiet foreground.
        if (settings.reflections && y > REFLECTION_PLANE + 105 && depth > 5) {
          const field = Math.sin(x * 0.022 + Math.sin(y * 0.024 + t * 0.08) * 0.8)
            + Math.sin(x * 0.061 - y * 0.013 + t * 0.11) * 0.32;
          const broken = Math.sin(x * 0.09 + y * 0.04 + t * 0.15);
          if (field > 1.08 && broken > -0.2 && tone < 5) tone++;
        }
        if (settings.shoreline && depth < 1.1) {
          const dash = Math.sin(x * 0.19 + y * 0.09 - t * 1.5) + Math.sin(x * 0.061 + t * 0.7);
          if (dash > 0.95 && tone < 5) tone = 4;
          else if (tone > 1) tone = 2;
        }
        // Rear-bank ground reflection is its own toggle; dashes avoid a continuous bright rim.
        if (settings.backBank && row >= 2 && row <= 9 && depth < 4
          && Math.sin(x * 0.17 - t * 1.2) > 0.35 && (x + row) % 4 !== 0) {
          const sy = bank - row;
          if (ground && sy >= 0) {
            const q = (sy * WIDTH + x) * 4;
            tone = ground[q + 1] > ground[q] + 12 ? 4 : 8;
          } else tone = settings.palette === 'moon' ? 3 : 4;
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
            const x = g.x + dx, p = g.y * WIDTH + x;
            if (x >= 0 && x < WIDTH && scene.mask[p] && (dx === 0 || pulse > 0.68)) indices[p] = tone;
          }
        }
      }
      // Three tiny drifting fallen leaves; palette writes remain clipped and deterministic.
      for (let i = 0; i < 3; i++) {
        const x = Math.floor((235 + i * 137 + t * (0.65 + settings.wind * 0.45)) % WIDTH);
        const y = 248 + i * 28 + Math.round(Math.sin(t * 0.45 + i * 2) * 2);
        for (let dy = 0; dy < 2; dy++) for (let dx = -2; dx <= 2; dx++) {
          const px = x + dx, py = y + dy;
          if (px >= 0 && px < WIDTH && py >= 0 && py < HEIGHT && scene.mask[py * WIDTH + px]
            && (dy === 0 || Math.abs(dx) < 2)) indices[py * WIDTH + px] = dy === 0 ? 8 : 9;
        }
      }
    }
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i], age = Math.max(0, t - r.born);
      if (age > 1.35) { ripples.splice(i, 1); continue; }
      if (!settings.particles) continue;
      const radius = 1 + age * 15, ry = radius * 0.36;
        const left = Math.max(0, Math.floor(r.x - radius - 1)), right = Math.min(WIDTH - 1, Math.ceil(r.x + radius + 1));
        const top = Math.max(0, Math.floor(r.y - ry - 1)), bottom = Math.min(HEIGHT - 1, Math.ceil(r.y + ry + 1));
        for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) {
          const dx = (x - r.x) / radius, dy = (y - r.y) / ry;
          const ring = Math.sqrt(dx * dx + dy * dy);
          if (scene.mask[y * WIDTH + x] && Math.abs(ring - 1) < 0.11 && hash(x + 9, y + 23) > 0.15) indices[y * WIDTH + x] = r.strength > 1.35 ? 6 : 5;
      }
    }
    drawRain(dt, settings.rain, t);
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
