/** Shared native-grid wipe geometry for display, export, and deterministic tests. */
export function comparisonBoundary(width: number, percent: number): number {
  if (!Number.isInteger(width) || width < 1) throw new RangeError('width must be a positive integer');
  const normalized = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 50;
  return Math.round(width * normalized / 100);
}
