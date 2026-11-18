import test from 'node:test';
import assert from 'node:assert/strict';
import { comparisonBoundary } from '../src/direction/comparison';

test('comparison wipe maps endpoints and midpoint to the same native grid', () => {
  assert.equal(comparisonBoundary(640, 0), 0);
  assert.equal(comparisonBoundary(640, 50), 320);
  assert.equal(comparisonBoundary(960, 50), 480);
  assert.equal(comparisonBoundary(640, 100), 640);
  assert.equal(comparisonBoundary(640, -20), 0);
  assert.equal(comparisonBoundary(640, 120), 640);
  assert.equal(comparisonBoundary(640, Number.NaN), 320);
});
