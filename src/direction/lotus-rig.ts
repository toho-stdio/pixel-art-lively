export type LotusRigPart = 'flower' | 'stem' | 'leaf';
export interface LotusRigPose { x: number; y: number; distalWeight: number }

const WIND_FIELD = 0.86;
const PHASE = 4.4;
const REFLECTION_SQUASH = 0.52; // Keep in sync with the existing direction-water sampler.

/**
 * Shared native-grid deformation for the audited pond-side lotus pair. The lower stem/leaf
 * junction is a fixed anchor; stems, heads and selected pads share a strong bounded field
 * with small part-specific phase lag. See docs/VISIBLE_MOTION.md for audited displacement.
 */
export function lotusRigSource(
  part: LotusRigPart,
  x: number,
  y: number,
  width: number,
  height: number,
  time: number,
  wind: number,
): LotusRigPose {
  const force = Math.max(0, Math.min(1.5, Number.isFinite(wind) ? wind : 0));
  const t = Number.isFinite(time) ? time : 0;
  const mainPlant = x < width * 0.24;
  const anchorY = Math.round(height * (mainPlant ? 292 : 291) / 360);
  const distalWeight = Math.max(0, Math.min(1, (anchorY - y) / Math.max(1, Math.round(height * 0.062))));
  const phaseLag = part === 'flower' ? 0.06 : part === 'leaf' ? 0.22 : 0;
  // At the app's default wind=0.6 this yields a clearly visible 3-ish native-pixel
  // distal sweep, not merely subpixel shimmer. Keep the range bounded at the 1.5 UI cap.
  const amplitude = part === 'leaf' ? 4.4 : part === 'flower' ? 5.0 : 4.6;
  const wave = Math.sin(WIND_FIELD * t + PHASE + phaseLag) * amplitude * Math.sqrt(force / 1.5) * 1.1;
  return { x: Math.round(x - wave * distalWeight), y, distalWeight };
}

/**
 * Map a live lotus pixel into the existing rear-plane reflection source canvas. This is the
 * inverse of water.ts's `sy = plane - (waterY-plane)/0.52`, anchored at the left cluster's
 * visible lower junction and a local water-side target. The separate canvas is water-only;
 * visible scene drawing continues to use the unmodified live object canvas.
 */
export function lotusReflectionSourceY(
  sourceY: number,
  stemAnchorY: number,
  planeY: number,
  height: number,
): number {
  const localWaterAnchorY = Math.round(height * 274 / 360);
  const sourceAnchorY = planeY - (localWaterAnchorY - planeY) / REFLECTION_SQUASH;
  return Math.round(sourceAnchorY + (sourceY - stemAnchorY) / REFLECTION_SQUASH);
}
