import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCamera, RESOLUTIONS } from '../src/study/types.ts';
test('all study resolutions preserve identical uniform camera framing', () => {
  for (const mode of RESOLUTIONS) {
    const camera = createCamera(mode.width, mode.height);
    assert.equal(mode.width / mode.height, 16 / 9);
    assert.equal(camera.scale, mode.height / 400);
    assert.ok(Math.abs((0 - camera.offsetX) / camera.scale + 35.5555555556) < 1e-8);
    assert.ok(Math.abs((mode.width - camera.offsetX) / camera.scale - 675.5555555556) < 1e-8);
    assert.equal(mode.width * mode.scale1080, 1920);
    assert.equal(mode.height * mode.scale1080, 1080);
  }
});
