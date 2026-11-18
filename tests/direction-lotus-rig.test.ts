import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { lotusReflectionSourceY, lotusRigSource } from '../src/direction/lotus-rig';

describe('direction lotus rig and reflection source mapping', () => {
  it('keeps both stem anchors fixed at zero wind and scales the lower attachment on both grids', () => {
    for (const [width, height] of [[640, 360], [960, 540]] as const) {
      const mainAnchorY = Math.round(height * 292 / 360);
      const budAnchorY = Math.round(height * 291 / 360);
      const main = lotusRigSource('stem', Math.round(width * 140 / 640), mainAnchorY, width, height, 17, 0);
      const bud = lotusRigSource('stem', Math.round(width * 164 / 640), budAnchorY, width, height, 17, 0);
      assert.equal(main.x, Math.round(width * 140 / 640));
      assert.equal(main.distalWeight, 0);
      assert.equal(bud.x, Math.round(width * 164 / 640));
      assert.equal(bud.distalWeight, 0);
    }
  });

  it('maps posed lotus pixels into rows the existing rear-plane sampler actually reads', () => {
    for (const height of [360, 540]) {
      const scale = height / 360;
      const plane = Math.round(198 * scale);
      const anchorY = Math.round(292 * scale);
      const sourceRows = [267, 271, 278, 284, 292].map(y => lotusReflectionSourceY(
        Math.round(y * scale), anchorY, plane, height,
      ));
      assert.ok(sourceRows.every(y => y >= 0 && y < plane), `proxy rows must be above reflection plane: ${sourceRows}`);
      const reflectedWaterRows = sourceRows.map(y => Math.round(plane + (plane - y) * 0.52));
      const expected = [267, 271, 278, 284, 292].map(y => Math.round((274 + (292 - y)) * scale));
      assert.ok(reflectedWaterRows.every((y, i) => Math.abs(y - expected[i]) <= 1),
        `proxy inverse must register the current pose to the lower pond: ${reflectedWaterRows} vs ${expected}`);
    }
  });
});
