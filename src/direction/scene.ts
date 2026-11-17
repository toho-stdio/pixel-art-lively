import type { StudyCamera, StudyScene } from '../study/types';

export interface DirectionMetadata {
  version?: string;
  reflectionPlanes?: Array<{ id: string; y: number; xStart?: number; xEnd?: number }>;
  motion?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface DirectionScene extends StudyScene {
  /** Unmodified canonical master at this exact native resolution, for static comparison. */
  original: HTMLCanvasElement;
  metadata?: DirectionMetadata;
  dispose(): void;
}

const SUPPORTED = new Set(['640x360', '960x540']);
const REFLECTION_PLANE_640 = 198;
const MOTION_MASKS = [
  { id: 'canopy', file: 'canopy-motion-mask.png', amplitude: 1.0, rate: 0.42, phase: 0.2 },
  // These are color/ROI masks, not cutouts. Keep roots and lotus at subpixel-range force;
  // their integer-raster displacement only reaches one native pixel in stronger wind.
  { id: 'roots', file: 'roots-motion-mask.png', amplitude: 0.65, rate: 0.31, phase: 2.1 },
  { id: 'lotus', file: 'lotus-motion-mask.png', amplitude: 0.65, rate: 0.68, phase: 4.4 },
] as const;

type Pixels = ImageData;
const makeCanvas = (width: number, height: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

async function loadPixels(url: string, width: number, height: number): Promise<Pixels> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Unable to load direction asset ${url}: HTTP ${response.status}`);
  const bitmap = await createImageBitmap(await response.blob());
  try {
    if (bitmap.width !== width || bitmap.height !== height)
      throw new Error(`Direction asset ${url} must be exactly ${width}x${height}; got ${bitmap.width}x${bitmap.height}`);
    const canvas = makeCanvas(width, height);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas 2D is unavailable');
    context.drawImage(bitmap, 0, 0);
    return context.getImageData(0, 0, width, height);
  } finally {
    bitmap.close();
  }
}

function isWhiteMaskPixel(data: Uint8ClampedArray, p: number): boolean {
  const v = data[p];
  if (data[p + 3] !== 255 || (v !== 0 && v !== 255) || data[p + 1] !== v || data[p + 2] !== v)
    throw new Error(`Direction masks must be opaque, binary black/white (pixel byte offset ${p})`);
  return v === 255;
}

/**
 * Load the approved high-resolution plate at its own authored grid. No browser scaling or
 * reuse of the old scene is allowed: each supported size has a separately prepared asset set.
 */
export async function createDirectionScene(width = 640, height = 360): Promise<DirectionScene> {
  const key = `${width}x${height}`;
  if (!SUPPORTED.has(key)) throw new Error(`Direction scene supports ${[...SUPPORTED].join(' and ')} only; requested ${key}`);
  const root = `/art-direction/${key}/`;
  const [originalPixels, environmentPixels, maskPixels, motionResults, metadataResult] = await Promise.all([
    loadPixels(`${root}original.png`, width, height),
    loadPixels(`${root}environment.png`, width, height),
    loadPixels(`${root}mask.png`, width, height),
    Promise.all(MOTION_MASKS.map(async (motion) => {
      try { return await loadPixels(`${root}${motion.file}`, width, height); }
      catch (error) {
        // Motion segmentation is optional during asset preparation; never invent a broad mask.
        if (error instanceof Error && /HTTP 404/.test(error.message)) return null;
        throw error;
      }
    })),
    fetch(`${root}metadata.json`).then(async (response) => {
      if (response.status === 404) return undefined;
      if (!response.ok) throw new Error(`Unable to load direction metadata ${root}metadata.json: HTTP ${response.status}`);
      return await response.json() as DirectionMetadata;
    }),
  ]);
  const metadata = metadataResult;
  const count = width * height;
  const mask = new Uint8Array(count);
  const bankY = new Int16Array(width);
  bankY.fill(height);
  const plane = Math.round(REFLECTION_PLANE_640 * height / 360);

  const original = makeCanvas(width, height);
  const originalContext = original.getContext('2d');
  if (!originalContext) throw new Error('Canvas 2D is unavailable');
  originalContext.putImageData(originalPixels, 0, 0);

  const ground = makeCanvas(width, height);
  const groundContext = ground.getContext('2d', { willReadFrequently: true });
  if (!groundContext) throw new Error('Canvas 2D is unavailable');
  const groundPixels = groundContext.createImageData(width, height);
  const motionAt = new Int8Array(count);
  motionAt.fill(-1);
  for (let m = 0; m < motionResults.length; m++) {
    const layer = motionResults[m];
    if (!layer) continue;
    for (let y = 0, p = 0; y < height; y++) for (let x = 0; x < width; x++, p += 4) {
      const white = isWhiteMaskPixel(layer.data, p);
      if (!white) continue;
      // The generated masks already apply audited source-space ROIs and color gates:
      // canopy crown, lower buttress roots above the planter, and pond-side lotus plants.
      // They remain mask-only, so all three are displaced by at most one native pixel.
      motionAt[y * width + x] = m;
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x, p = i * 4;
      const water = isWhiteMaskPixel(maskPixels.data, p);
      const alpha = environmentPixels.data[p + 3];
      if (alpha !== 0 && alpha !== 255) throw new Error(`Environment alpha must be binary at (${x},${y})`);
      if (water !== (alpha === 0)) throw new Error(`Environment/mask disagree at (${x},${y}); refusing to alter the approved shoreline`);
      if (originalPixels.data[p + 3] !== 255) throw new Error(`Canonical original must be opaque at (${x},${y})`);
      if (water) {
        mask[i] = 1;
        if (bankY[x] === height) bankY[x] = y;
      }
      const source = water ? originalPixels.data : environmentPixels.data;
      for (let c = 0; c < 3; c++) groundPixels.data[p + c] = source[p + c];
      groundPixels.data[p + 3] = 255;
    }
  }

  // Paint a compact undercoat beneath cutout motion regions. At zero wind the dynamic plate
  // exactly restores the canonical pixels; at nonzero wind this prevents a duplicated ghost.
  for (let i = 0; i < count; i++) {
    if (motionAt[i] < 0) continue;
    const x = i % width, y = Math.floor(i / width), p = i * 4;
    let r = 0, g = 0, b = 0, n = 0;
    for (let radius = 1; radius <= 4 && n === 0; radius++) {
      for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= width || yy >= height || motionAt[yy * width + xx] >= 0) continue;
        const q = (yy * width + xx) * 4;
        r += originalPixels.data[q]; g += originalPixels.data[q + 1]; b += originalPixels.data[q + 2]; n++;
      }
    }
    if (n) {
      groundPixels.data[p] = Math.round(r / n);
      groundPixels.data[p + 1] = Math.round(g / n);
      groundPixels.data[p + 2] = Math.round(b / n);
    }
  }
  groundContext.putImageData(groundPixels, 0, 0);

  const foreground = makeCanvas(width, height);
  const foregroundContext = foreground.getContext('2d');
  const objects = makeCanvas(width, height);
  const objectsContext = objects.getContext('2d');
  if (!foregroundContext || !objectsContext) throw new Error('Canvas 2D is unavailable');
  const foregroundFrame = foregroundContext.createImageData(width, height);
  const objectFrame = objectsContext.createImageData(width, height);
  const layerForPixel = (i: number): number => motionAt[i];
  let disposed = false;
  let lastObjectFrame = '';
  const renderObjects = (time: number, wind: number): HTMLCanvasElement => {
    if (disposed) throw new Error('Direction scene has been disposed');
    const t = Number.isFinite(time) ? time : 0;
    const force = Math.max(0, Math.min(1.5, Number.isFinite(wind) ? wind : 0));
    const frameKey = `${Math.floor(t * 10 + 1e-7)}:${force.toFixed(3)}`;
    if (frameKey === lastObjectFrame) return objects;
    lastObjectFrame = frameKey;
    foregroundFrame.data.fill(0);
    objectFrame.data.fill(0);
    // Stable source-coordinate sampling, local to audited canopy/root/lotus masks.
    // Each mask owns one gentle phase; buildings, banks, and the trunk remain fixed.
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const m = layerForPixel(i);
        if (m < 0) continue;
        const config = MOTION_MASKS[m];
        if (!motionResults[m]) continue;
        // Apply a gentle perceptual wind curve before native integer rasterization. The
        // default 0.6 wind must cross the half-pixel rounding threshold for each mask;
        // this remains capped below 1.5 native pixels at maximum wind.
        const amplitude = config.amplitude * Math.sqrt(force / 1.5) * 1.25;
        const wave = Math.sin(t * config.rate + config.phase + x * 0.013) * amplitude;
        const sourceX = Math.round(x - (m === 2 ? 0 : wave));
        const sourceY = Math.round(y - (m === 2 ? wave : Math.sin(t * config.rate + config.phase + x * 0.013) * amplitude * 0.35));
        if (sourceX < 0 || sourceY < 0 || sourceX >= width || sourceY >= height) continue;
        const sourceI = sourceY * width + sourceX;
        if (motionAt[sourceI] !== m) continue;
        const p = sourceI * 4, dst = i * 4;
        const src = originalPixels.data;
        foregroundFrame.data[dst] = src[p]; foregroundFrame.data[dst + 1] = src[p + 1];
        foregroundFrame.data[dst + 2] = src[p + 2]; foregroundFrame.data[dst + 3] = 255;
        // Reflections use all stable reflectable environment plus these exact live motion pixels.
      }
    }
    // `foreground` is reserved for true front occluders and remains transparent in this
    // master-derived pass. The returned object plate is also the visible environment layer.
    // Keep foregroundFrame intact here: it is the live cutout source copied below.

    // Keep fixed scenery in place; replace only segmented wind pixels with their live sample.
    // Water stays transparent so the water canvas remains between the underplate and objects.
    objectFrame.data.set(originalPixels.data);
    for (let i = 0, p = 0; i < count; i++, p += 4) {
      if (mask[i] || motionAt[i] >= 0) objectFrame.data[p + 3] = 0;
    }
    for (let i = 0; i < count; i++) {
      const p = i * 4;
      if (foregroundFrame.data[p + 3]) {
        objectFrame.data[p] = foregroundFrame.data[p];
        objectFrame.data[p + 1] = foregroundFrame.data[p + 1];
        objectFrame.data[p + 2] = foregroundFrame.data[p + 2];
        objectFrame.data[p + 3] = 255;
      }
    }
    objectsContext.putImageData(objectFrame, 0, 0);
    return objects;
  };

  const camera: StudyCamera = { width, height, scale: height / 360, offsetX: 0 };
  return {
    ground, foreground, mask, bankY, renderObjects, camera, original, metadata,
    dispose() {
      disposed = true;
      for (const canvas of [original, ground, foreground, objects]) { canvas.width = 0; canvas.height = 0; }
    },
  };
}
