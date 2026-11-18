/** Neighborhood sampling keeps reflected foliage/roof pixels in connected clusters rather than
 * mirroring single-pixel source noise. This operates on source alpha, never water alpha. */
export interface ReflectionCluster {
  luminance: number;
  coverage: number;
}

export function sampleReflectionCluster(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  distanceFromMirror: number,
): ReflectionCluster | null {
  let coverage = 0;
  let luminance = 0;
  for (let dy = -1; dy <= 1; dy++) {
    const sy = y + dy;
    if (sy < 0 || sy >= height) continue;
    for (let dx = -1; dx <= 1; dx++) {
      const sx = x + dx;
      if (sx < 0 || sx >= width) continue;
      const p = (sy * width + sx) * 4;
      if (rgba[p + 3] <= 72) continue;
      coverage++;
      luminance += (rgba[p] * 3 + rgba[p + 1] * 6 + rgba[p + 2]) / 10;
    }
  }
  // The further reflection is from its mirror plane, the more isolated source flecks are
  // rejected. This suppresses texture noise without smoothing or modifying the source art.
  const minCoverage = distanceFromMirror > 72 ? 5 : 3;
  if (coverage < minCoverage) return null;
  return { luminance: luminance / coverage, coverage };
}

/** Recede reflected values toward the middle-water tone as they travel down-pond. */
export function attenuateReflectionTone(tone: number, distanceInWorld: number): number {
  const amount = Math.max(0, Math.min(1, (distanceInWorld - 42) / 155));
  return Math.round(tone + (3 - tone) * amount);
}

/** Restrained contact is deliberately discontinuous and limited to the rear step/planter
 * shore segments. The separately placed lotus contacts are small, not an edge outline. */
export function isArchitecturalContact(x: number, y: number, bankY: number, width: number, scale: number): boolean {
  const nx = x / width;
  const localDepth = (y - bankY) / scale;
  return localDepth >= 0 && localDepth <= 3 && ((nx > 0.035 && nx < 0.33) || (nx > 0.55 && nx < 0.88));
}

export function isLotusContact(x: number, y: number, width: number, height: number, scale: number): boolean {
  const anchors = [0.19, 0.83];
  const cy = height * 0.76;
  return anchors.some((anchor) => Math.abs(x / width - anchor) <= 2.5 * scale / width)
    && Math.abs(y - cy) <= 2 * scale;
}
