import type { StudyCamera, StudyScene } from '../study/types';
import { directionMotionSource, type DirectionMotionMaterial } from './motion';
import { lotusReflectionSourceY } from './lotus-rig';
import { validateFoliageWrite } from './foliage-isolation';

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
  /** Optional water-only source canvas carrying current lotus poses into the rear-plane sampler. */
  renderReflectionObjects?(time: number, wind: number): HTMLCanvasElement;
  /** Expensive, opt-in audit surface; never evaluated by the standard render loop. */
  foliageDebug?(time: number, wind: number): { source: Uint8Array; destination: Uint8Array; owners: Uint8Array; underpaint: Uint8Array; finalDry: HTMLCanvasElement };
  dispose(): void;
}

const SUPPORTED = new Set(['640x360', '960x540']);
const REFLECTION_PLANE_640 = 198;
const MOTION_MASKS = [
  { id: 'canopy', file: 'canopy-motion-mask.png' },
  // Legacy roots mask is retained as an integrity sentinel and must remain empty: trunk and
  // buttress roots are structural anchors, not wind-driven color masks.
  { id: 'roots-anchored', file: 'roots-motion-mask.png' },
  { id: 'lotus-flowers', file: 'lotus-motion-mask.png' },
  { id: 'aerial-strands', file: 'aerial-root-strands-motion-mask.png' },
  { id: 'lotus-stems', file: 'lotus-stems-motion-mask.png' },
  { id: 'lotus-leaves', file: 'lotus-leaves-motion-mask.png' },
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
  const [originalPixels, environmentPixels, maskPixels, motionResults, canopyUnderplateResult, strandUnderplateResult, ownerResult, metadataResult] = await Promise.all([
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
    loadPixels(`${root}canopy-underplate.png`, width, height),
    loadPixels(`${root}aerial-strands-underplate.png`, width, height),
    loadPixels(`${root}foliage-protected-owners.png`, width, height),
    fetch(`${root}metadata.json`).then(async (response) => {
      if (response.status === 404) return undefined;
      if (!response.ok) throw new Error(`Unable to load direction metadata ${root}metadata.json: HTTP ${response.status}`);
      return await response.json() as DirectionMetadata;
    }),
  ]);
  const metadata = metadataResult;
  const count = width * height;
  const ownerIds = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    const p = i * 4, id = ownerResult.data[p];
    if (ownerResult.data[p + 3] !== 255 || ownerResult.data[p + 1] !== id || ownerResult.data[p + 2] !== id || id > 4)
      throw new Error(`Invalid authored foliage owner mask at (${i % width},${Math.floor(i / width)})`);
    ownerIds[i] = id;
  }
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
      // Generated masks distinguish flexible material from structural anchors. Heavy roots
      // are an empty sentinel mask; only the selected crown, pond-side lotus zone, and true
      // hanging strands are eligible for this localized wind pass.
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
    if (motionAt[i] !== 0 || ownerIds[i] !== 0) continue;
    const p = i * 4;
    const underpaint = motionAt[i] === 0 ? canopyUnderplateResult.data : strandUnderplateResult.data;
    if (underpaint[p + 3] !== 255) throw new Error(`Missing generated underpaint for moving source pixel (${i % width},${Math.floor(i / width)})`);
    groundPixels.data[p] = underpaint[p];
    groundPixels.data[p + 1] = underpaint[p + 1];
    groundPixels.data[p + 2] = underpaint[p + 2];
  }
  groundContext.putImageData(groundPixels, 0, 0);

  const foreground = makeCanvas(width, height);
  const foregroundContext = foreground.getContext('2d');
  const objects = makeCanvas(width, height);
  const objectsContext = objects.getContext('2d');
  if (!foregroundContext || !objectsContext) throw new Error('Canvas 2D is unavailable');
  const foregroundFrame = foregroundContext.createImageData(width, height);
  const objectFrame = objectsContext.createImageData(width, height);
  const lotusDestinationAt = new Int8Array(count);
  lotusDestinationAt.fill(-1);
  const reflectionObjects = makeCanvas(width, height);
  const reflectionContext = reflectionObjects.getContext('2d', { willReadFrequently: true });
  if (!reflectionContext) throw new Error('Canvas 2D is unavailable');
  const layerForPixel = (i: number): number => motionAt[i];
  const foliageEligible = new Uint8Array(count);
  for (let i = 0; i < count; i++) if (motionAt[i] === 0 || motionAt[i] === 3) foliageEligible[i] = 255;
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
    lotusDestinationAt.fill(-1);
    // Keep canopy/strand inverse sampling inside their audited eligibility masks. Lotus parts
    // are forward-rasterized from immutable source pixels so the connected, per-row integer
    // deformation does not erode petal/stem/leaf silhouettes. Neither path accumulates drift.
    for (let i = 0; i < count; i++) {
      const m = layerForPixel(i);
      if (m < 0 || m === 2 || m === 4 || m === 5 || !motionResults[m]) continue;
      const material: DirectionMotionMaterial | null = m === 0 ? 'canopy' : m === 3 ? 'aerial-strands' : null;
      if (!material) continue;
      const x = i % width, y = Math.floor(i / width);
      const source = directionMotionSource(material, x, y, width, height, t, force);
      if (source.x < 0 || source.y < 0 || source.x >= width || source.y >= height) continue;
      const sourceI = source.y * width + source.x;
      if (motionAt[sourceI] !== m) continue;
      if (!validateFoliageWrite(sourceI, i, width, height, foliageEligible, ownerIds).accepted) continue;
      const p = sourceI * 4, dst = i * 4;
      foregroundFrame.data[dst] = originalPixels.data[p]; foregroundFrame.data[dst + 1] = originalPixels.data[p + 1];
      foregroundFrame.data[dst + 2] = originalPixels.data[p + 2]; foregroundFrame.data[dst + 3] = 255;
    }
    for (let sourceI = 0; sourceI < count; sourceI++) {
      const m = layerForPixel(sourceI);
      if (m !== 2 && m !== 4 && m !== 5) continue;
      const material: DirectionMotionMaterial = m === 2 ? 'lotus' : m === 4 ? 'lotus-stems' : 'lotus-leaves';
      const x = sourceI % width, y = Math.floor(sourceI / width);
      const destination = directionMotionSource(material, x, y, width, height, t, force);
      if (destination.x < 0 || destination.x >= width || destination.y < 0 || destination.y >= height) continue;
      const p = sourceI * 4, dst = (destination.y * width + destination.x) * 4;
      foregroundFrame.data[dst] = originalPixels.data[p];
      foregroundFrame.data[dst + 1] = originalPixels.data[p + 1];
      foregroundFrame.data[dst + 2] = originalPixels.data[p + 2];
      foregroundFrame.data[dst + 3] = 255;
      lotusDestinationAt[destination.y * width + destination.x] = m;
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

  let lastReflectionFrame = '';
  const renderReflectionObjects = (time: number, wind: number): HTMLCanvasElement => {
    const liveObjects = renderObjects(time, wind);
    const t = Number.isFinite(time) ? time : 0;
    const force = Math.max(0, Math.min(1.5, Number.isFinite(wind) ? wind : 0));
    const frameKey = `${Math.floor(t * 10 + 1e-7)}:${force.toFixed(3)}`;
    if (frameKey === lastReflectionFrame) return reflectionObjects;
    lastReflectionFrame = frameKey;
    reflectionContext.clearRect(0, 0, width, height);
    reflectionContext.drawImage(liveObjects, 0, 0);
    const reflectionFrame = reflectionContext.getImageData(0, 0, width, height);
    for (let i = 0; i < count; i++) {
      if (lotusDestinationAt[i] < 0) continue;
      const x = i % width, y = Math.floor(i / width);
      const mainPlant = x < width * 0.24;
      const stemAnchorY = Math.round(height * (mainPlant ? 292 : 291) / 360);
      const sourceY = lotusReflectionSourceY(y, stemAnchorY, plane, height);
      if (sourceY < 0 || sourceY >= height) continue;
      const sourcePixel = i * 4, targetPixel = (sourceY * width + x) * 4;
      reflectionFrame.data[targetPixel] = objectFrame.data[sourcePixel];
      reflectionFrame.data[targetPixel + 1] = objectFrame.data[sourcePixel + 1];
      reflectionFrame.data[targetPixel + 2] = objectFrame.data[sourcePixel + 2];
      reflectionFrame.data[targetPixel + 3] = objectFrame.data[sourcePixel + 3];
    }
    reflectionContext.putImageData(reflectionFrame, 0, 0);
    return reflectionObjects;
  };

  const foliageDebug = (time: number, wind: number) => {
    const live = renderObjects(time, wind);
    const source = new Uint8Array(count), destination = new Uint8Array(count), underpaint = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
      if (motionAt[i] === 0 || motionAt[i] === 3) source[i] = 255;
      if ((motionAt[i] === 0 && canopyUnderplateResult.data[i * 4 + 3] === 255) || (motionAt[i] === 3 && strandUnderplateResult.data[i * 4 + 3] === 255)) underpaint[i] = 255;
    }
    // Derive the actual inverse-sampled pose destination (debug-only O(width*height)).
    for (let dst = 0; dst < count; dst++) {
      const x = dst % width, y = Math.floor(dst / width);
      for (const [material, layer] of [['canopy', 0], ['aerial-strands', 3]] as const) {
        const sample = directionMotionSource(material, x, y, width, height, time, wind);
        if (sample.x < 0 || sample.y < 0 || sample.x >= width || sample.y >= height) continue;
        const src = sample.y * width + sample.x;
        if (motionAt[src] === layer && validateFoliageWrite(src, dst, width, height, foliageEligible, ownerIds).accepted)
          destination[dst] = 255;
      }
    }
    const finalDry = makeCanvas(width, height);
    const c = finalDry.getContext('2d');
    if (!c) throw new Error('Canvas 2D is unavailable');
    c.drawImage(ground, 0, 0); c.drawImage(live, 0, 0); c.drawImage(foreground, 0, 0);
    return { source, destination, owners: ownerIds.slice(), underpaint, finalDry };
  };
  const camera: StudyCamera = { width, height, scale: height / 360, offsetX: 0 };
  return {
    ground, foreground, mask, bankY, renderObjects, renderReflectionObjects, foliageDebug, camera, original, metadata,
    dispose() {
      disposed = true;
      for (const canvas of [original, ground, foreground, objects, reflectionObjects]) { canvas.width = 0; canvas.height = 0; }
    },
  };
}
