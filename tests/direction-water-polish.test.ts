import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { attenuateReflectionTone, isArchitecturalContact, isLotusContact, sampleReflectionCluster } from '../src/direction/water-polish';

describe('direction water polish helpers', () => {
  it('rejects isolated live-object flecks but preserves a connected reflected mass', () => {
    const pixels = new Uint8ClampedArray(9 * 9 * 4);
    const set = (x: number, y: number) => { const p = (y * 9 + x) * 4; pixels[p] = 30; pixels[p + 1] = 80; pixels[p + 2] = 70; pixels[p + 3] = 255; };
    set(4, 4);
    assert.equal(sampleReflectionCluster(pixels, 9, 9, 4, 4, 10), null);
    for (let y = 3; y <= 5; y++) for (let x = 3; x <= 5; x++) set(x, y);
    const cluster = sampleReflectionCluster(pixels, 9, 9, 4, 4, 10);
    assert.equal(cluster?.coverage, 9);
    assert.equal(cluster?.luminance, 64);
  });

  it('attenuates contrast toward the middle-water tone with distance', () => {
    assert.equal(attenuateReflectionTone(0, 20), 0);
    assert.ok(attenuateReflectionTone(0, 100) > 0);
    assert.equal(attenuateReflectionTone(0, 240), 3);
    assert.equal(attenuateReflectionTone(7, 240), 3);
  });

  it('keeps architectural contacts restricted to rear step/planter spans', () => {
    assert.equal(isArchitecturalContact(100, 201, 200, 640, 1), true);
    assert.equal(isArchitecturalContact(450, 201, 200, 640, 1), true);
    assert.equal(isArchitecturalContact(350, 201, 200, 640, 1), false);
    assert.equal(isArchitecturalContact(100, 207, 200, 640, 1), false);
  });

  it('places lotus contacts in small local patches rather than a perimeter', () => {
    assert.equal(isLotusContact(122, 274, 640, 360, 1), true);
    assert.equal(isLotusContact(320, 274, 640, 360, 1), false);
    assert.equal(isLotusContact(122, 310, 640, 360, 1), false);
  });
});
