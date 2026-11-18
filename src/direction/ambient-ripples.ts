export interface AmbientRippleEvent { id: number; x: number; y: number; born: number; strength: number; }

const INTERVAL_SECONDS = 4.8;
const MAX_VISIBLE_AGE = 1.35;

function mix32(value: number): number {
  let x = value | 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  return (x ^ (x >>> 16)) >>> 0;
}

/** Returns at most the newest scheduled ripple still visible at `time`.
 * Its identity is time-derived, so repeated renders are deduplicated by the caller; seeking
 * needs no historical replay and work remains bounded regardless of elapsed simulation time.
 */
export function ambientRippleSince(
  previousTime: number,
  time: number,
  seed: number,
  mask: Uint8Array,
  width: number,
  height: number,
): AmbientRippleEvent | null {
  if (!(Number.isFinite(previousTime) && Number.isFinite(time)) || time < 0 || width < 1 || height < 1
    || mask.length < width * height) return null;
  const seedBits = mix32(seed);
  const phase = (seedBits / 0x1_0000_0000) * INTERVAL_SECONDS;
  const approximateTick = Math.floor((time - phase) / INTERVAL_SECONDS);
  const eventTime = (tick: number) => {
    if (tick === 0) return phase;
    const jitterHash = mix32(seedBits ^ Math.imul(tick + 31, 0x27d4eb2d)) / 0x1_0000_0000;
    return phase + tick * INTERVAL_SECONDS + (jitterHash * 0.9 - 0.45);
  };
  let newestTick = -1, born = -Infinity;
  // Per-event timing variation is bounded; inspecting only neighboring tick IDs
  // avoids iterating over elapsed uptime after a long pause or seek.
  for (let tick = Math.max(0, approximateTick - 1); tick <= approximateTick + 1; tick++) {
    const candidate = eventTime(tick);
    if (candidate <= time && candidate > born) { newestTick = tick; born = candidate; }
  }
  if (newestTick < 0 || time - born > MAX_VISIBLE_AGE) return null;

  const id = newestTick;
  // Hash each bounded candidate independently: modular strides can cycle through
  // a dry subset on composite-sized grids and miss the pond entirely.
  const size = width * height;
  const eventBits = mix32(seedBits ^ Math.imul(newestTick, 0x9e3779b1));
  for (let attempt = 0; attempt < Math.min(size, 4096); attempt++) {
    const index = mix32(eventBits ^ Math.imul(attempt + 1, 0x85ebca6b)) % size;
    if (mask[index]) {
      const position = mix32(seedBits ^ Math.imul(newestTick + 17, 0x85ebca6b));
      return {
        id,
        x: index % width,
        y: Math.floor(index / width),
        born,
        strength: 1.38 + (position % 20) / 100,
      };
    }
  }
  return null;
}

export const AMBIENT_RIPPLE_INTERVAL_SECONDS = INTERVAL_SECONDS;
