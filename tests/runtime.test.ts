import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advanceTime, toScenePoint } from '../src/runtime.ts';
test('pause freezes simulation and speed scales time', () => {
  assert.equal(advanceTime(4, .02, 2, true), 4);
  assert.equal(advanceTime(4, .02, 2, false), 4.04);
});
test('resume does not advance by suspended tab duration', () => {
  assert.equal(advanceTime(4, 90, 1, false), 4.05);
  assert.equal(advanceTime(4, -1, 1, false), 4);
  assert.equal(advanceTime(4, NaN, 1, false), 4);
});
test('pointer coordinates map CSS scaled canvas including mobile', () => {
  assert.deepEqual(toScenePoint(170, 120, {left: 10, top: 20, width: 320, height: 200}, 640, 400), {x: 320, y: 200});
});
