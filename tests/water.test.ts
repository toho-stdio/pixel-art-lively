import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { waterDistance } from '../src/water';

describe('waterDistance', () => {
  it('measures distance from arbitrary mask shapes, including diagonals', () => {
    const mask = new Uint8Array([
      0, 0, 0, 0, 0,
      0, 1, 1, 1, 0,
      0, 1, 1, 1, 0,
      0, 1, 1, 1, 0,
      0, 0, 0, 0, 0,
    ]);
    const distance = waterDistance(mask, 5, 5);
    assert.equal(distance[6], 3);
    assert.equal(distance[12], 6);
    assert.equal(distance[7], 3);
    assert.equal(distance[0], 0);
  });

  it('treats interior dry holes as shoreline and reaches arbitrary edges', () => {
    const mask = new Uint8Array(25).fill(1);
    mask[12] = 0;
    const distance = waterDistance(mask, 5, 5);
    assert.equal(distance[12], 0);
    assert.equal(distance[11], 3);
    assert.equal(distance[6], 4);
    assert.equal(distance[0], 8);
  });

  it('handles a fully water-filled mask without wrapping rows', () => {
    const distance = waterDistance(new Uint8Array(6).fill(1), 3, 2);
    assert.deepEqual([...distance], [255, 255, 255, 255, 255, 255]);
  });
});
