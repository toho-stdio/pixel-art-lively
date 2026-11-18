import test from 'node:test';
import assert from 'node:assert/strict';
import { countProtectedPixelChanges, FOLIAGE_OWNER, validateFoliageWrite } from '../src/direction/foliage-isolation';

test('foliage ownership rejects unowned source pixels and every protected owner', () => {
  const selected = new Uint8Array([255, 255, 255, 255, 255, 0]);
  const owners = new Uint8Array([0, FOLIAGE_OWNER.roofAndHouse, FOLIAGE_OWNER.banyanStructure,
    FOLIAGE_OWNER.planterAndShore, FOLIAGE_OWNER.fixedLotus, 0]);
  assert.equal(validateFoliageWrite(0, 5, 3, 2, selected, owners).accepted, true);
  assert.equal(validateFoliageWrite(5, 0, 3, 2, selected, owners).reason, 'protected-source');
  for (let owner = 1; owner <= 4; owner++) {
    assert.equal(validateFoliageWrite(owner, 0, 3, 2, selected, owners).reason, 'protected-source', `owner ${owner} may not be a foliage source`);
    assert.equal(validateFoliageWrite(0, owner, 3, 2, selected, owners).reason, 'protected-destination', `owner ${owner} may not be overwritten/occluded`);
  }
  assert.equal(validateFoliageWrite(0, 6, 3, 2, selected, owners).reason, 'out-of-bounds');
});

test('independent protected-pixel comparison catches an adversarial final-composite leak', () => {
  const owners = new Uint8Array([FOLIAGE_OWNER.free, FOLIAGE_OWNER.roofAndHouse, FOLIAGE_OWNER.banyanStructure]);
  const baseline = new Uint8ClampedArray([1, 2, 3, 255, 4, 5, 6, 255, 7, 8, 9, 255]);
  const safe = baseline.slice();
  safe[0] = 22;
  assert.deepEqual(countProtectedPixelChanges(baseline, safe, owners), { changed: 0, first: -1 });
  const injected = safe.slice(); injected[4] = 99;
  assert.deepEqual(countProtectedPixelChanges(baseline, injected, owners), { changed: 1, first: 1 });
});
