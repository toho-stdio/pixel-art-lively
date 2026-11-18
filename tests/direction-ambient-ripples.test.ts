import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ambientRippleSince, AMBIENT_RIPPLE_INTERVAL_SECONDS } from '../src/direction/ambient-ripples';

describe('deterministic ambient ripple schedule', () => {
  const width = 48, height = 32;
  const mask = new Uint8Array(width * height);
  for (let y = 9; y < 28; y++) for (let x = 3; x < 44; x++) mask[y * width + x] = 1;

  it('uses seeded simulation time, valid water locations, and occasional bounded births', () => {
    const first = ambientRippleSince(1.2, 1.3, 1234, mask, width, height);
    assert.ok(first);
    assert.ok(mask[first.y * width + first.x]);
    assert.ok(first.born <= 1.3 && 1.3 - first.born <= 1.35);
    assert.ok(first.strength >= 1.38 && first.strength < 1.58);
    assert.equal(ambientRippleSince(1.3, 1.3, 1234, mask, width, height)?.x, first.x);
    const otherSeed = ambientRippleSince(3.7, 3.8, 5678, mask, width, height);
    assert.ok(otherSeed);
    assert.notDeepEqual([otherSeed.x, otherSeed.y], [first.x, first.y]);
    assert.ok(AMBIENT_RIPPLE_INTERVAL_SECONDS >= 4 && AMBIENT_RIPPLE_INTERVAL_SECONDS <= 6);
  });

  it('does not spawn on repeated or backward times, and skips stale catch-up', () => {
    assert.ok(ambientRippleSince(1.3, 1.3, 1234, mask, width, height));
    assert.equal(ambientRippleSince(9, 7, 9, mask, width, height)?.id, ambientRippleSince(0, 7, 9, mask, width, height)?.id);
    assert.equal(ambientRippleSince(0, 100, 9, mask, width, height), null);
    const caught = ambientRippleSince(0, 12, 9, mask, width, height);
    assert.ok(caught && 12 - caught.born <= 1.35);
  });

  it('rejects invalid masks and empty water', () => {
    assert.equal(ambientRippleSince(0, 6, 1, new Uint8Array(2), 10, 10), null);
    assert.equal(ambientRippleSince(0, 6, 1, new Uint8Array(100), 10, 10), null);
    assert.equal(ambientRippleSince(0, Number.NaN, 1, mask, width, height), null);
  });
});
