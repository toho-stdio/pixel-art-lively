import { lotusRigSource, type LotusRigPart } from './lotus-rig';

export type DirectionMotionMaterial = 'canopy' | 'lotus' | 'lotus-stems' | 'lotus-leaves' | 'aerial-strands';

/** Integer source sample for one material layer. The strand displacement is pinned at its upper attachment. */
export function directionMotionSource(
  material: DirectionMotionMaterial,
  x: number,
  y: number,
  width: number,
  height: number,
  time: number,
  wind: number,
): { x: number; y: number; distalWeight: number } {
  const force = Math.max(0, Math.min(1.5, Number.isFinite(wind) ? wind : 0));
  const t = Number.isFinite(time) ? time : 0;
  if (material === 'lotus' || material === 'lotus-stems' || material === 'lotus-leaves') {
    const part: LotusRigPart = material === 'lotus' ? 'flower' : material === 'lotus-stems' ? 'stem' : 'leaf';
    return lotusRigSource(part, x, y, width, height, t, force);
  }
  // Broad, visible leaf-mass response; spatial bands introduce a modest phase lag across
  // the banyan and background crowns instead of shaking the whole scene as one sheet.
  const canopyLag = x < 175 ? 0 : x < 310 ? 0.24 : x < 455 ? 0.48 : 0.72;
  const phase = material === 'canopy' ? 0.68 * (t - canopyLag) + 0.2 : 0.31 * t + 2.1;
  const amplitude = (material === 'canopy' ? 3.4 : 1.4) * Math.sqrt(force / 1.5) * 1.1;
  const wave = Math.sin(phase) * amplitude;
  const distalWeight = material === 'aerial-strands'
    ? Math.max(0, Math.min(1, (y - Math.round(height * 0.18)) / Math.max(1, Math.round(height * 0.16))))
    : 1;
  if (material === 'aerial-strands') return { x: Math.round(x - wave * distalWeight), y, distalWeight };
  return { x: Math.round(x - wave), y: Math.round(y - wave * 0.24), distalWeight };
}
