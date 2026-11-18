/** Independent ownership contract for the swaying foliage layer. Owner IDs come from
 * art-authored protection polygons, never from the inverse of the moving mask. */
export const FOLIAGE_OWNER = {
  free: 0,
  roofAndHouse: 1,
  banyanStructure: 2,
  planterAndShore: 3,
  fixedLotus: 4,
} as const;

export interface FoliageOwnershipResult {
  accepted: boolean;
  reason: 'owned-source' | 'protected-source' | 'protected-destination' | 'out-of-bounds';
}

/** Reject source ownership AND swept destination collisions independently. */
export function validateFoliageWrite(
  sourceIndex: number,
  destinationIndex: number,
  width: number,
  height: number,
  sourceSelected: ArrayLike<number>,
  protectedOwners: ArrayLike<number>,
): FoliageOwnershipResult {
  const size = width * height;
  if (sourceIndex < 0 || sourceIndex >= size || destinationIndex < 0 || destinationIndex >= size)
    return { accepted: false, reason: 'out-of-bounds' };
  if (sourceSelected[sourceIndex] !== 255 || protectedOwners[sourceIndex] !== FOLIAGE_OWNER.free)
    return { accepted: false, reason: 'protected-source' };
  if (protectedOwners[destinationIndex] !== FOLIAGE_OWNER.free)
    return { accepted: false, reason: 'protected-destination' };
  return { accepted: true, reason: 'owned-source' };
}

/** Pure protected-pixel difference counter for the final dry composition. */
export function countProtectedPixelChanges(
  baseline: Uint8ClampedArray,
  posed: Uint8ClampedArray,
  ownerIds: ArrayLike<number>,
): { changed: number; first: number } {
  if (baseline.length !== posed.length || baseline.length !== ownerIds.length * 4)
    throw new Error('Foliage protection buffers have incompatible dimensions');
  let changed = 0, first = -1;
  for (let i = 0; i < ownerIds.length; i++) {
    if (ownerIds[i] === FOLIAGE_OWNER.free) continue;
    const p = i * 4;
    if (baseline[p] === posed[p] && baseline[p + 1] === posed[p + 1] && baseline[p + 2] === posed[p + 2] && baseline[p + 3] === posed[p + 3]) continue;
    if (first < 0) first = i;
    changed++;
  }
  return { changed, first };
}
