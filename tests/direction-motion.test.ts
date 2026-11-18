import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { directionMotionSource } from '../src/direction/motion';

describe('direction material motion', () => {
  it('has stationary zero-wind geometry at every sampled simulation time', () => {
    for (const material of ['canopy', 'lotus', 'lotus-stems', 'lotus-leaves', 'aerial-strands'] as const)
      for (const time of [0, 0.5, 1.6, 3.25, 20]) {
        const sample = directionMotionSource(material, 314, 104, 640, 360, time, 0);
        assert.equal(sample.x, 314); assert.equal(sample.y, 104);
      }
  });
  it('pins hanging strands at their upper attachment and increases distal response', () => {
    const anchor = directionMotionSource('aerial-strands', 314, 65, 640, 360, 1.6, 0.6);
    const distal = directionMotionSource('aerial-strands', 314, 113, 640, 360, 1.0, 0.6);
    assert.equal(anchor.x, 314); assert.equal(anchor.y, 65); assert.equal(anchor.distalWeight, 0);
    assert.ok(distal.distalWeight > 0.8);
    assert.notEqual(distal.x, 314);
    assert.equal(distal.y, 113, 'strand articulation may not slide its upper endpoint vertically');
  });
  it('flexes the selected stem from a fixed waterline attachment and carries the flower with constrained lag', () => {
    const anchor = directionMotionSource('lotus-stems', 141, 292, 640, 360, 1, 0.6);
    const stemDistal = directionMotionSource('lotus-stems', 141, 281, 640, 360, 1.5, 0.6);
    const attachedFlower = directionMotionSource('lotus', 140, 271, 640, 360, 1, 0.6);
    assert.equal(anchor.x, 141); assert.equal(anchor.y, 292); assert.equal(anchor.distalWeight, 0);
    assert.ok(stemDistal.distalWeight > 0.4); assert.notEqual(stemDistal.x, 141);
    assert.ok(attachedFlower.distalWeight > 0.9); assert.notEqual(attachedFlower.x, 140);
    assert.equal(attachedFlower.y, 271, 'flower remains a coherent pixel piece, not independently bobbing pixels');
  });
  it('sways selected leaf pieces with less amplitude than the attached flower/stem', () => {
    const leaf = directionMotionSource('lotus-leaves', 110, 274, 640, 360, 1.5, 0.6);
    const stem = directionMotionSource('lotus-stems', 141, 281, 640, 360, 1.5, 0.6);
    assert.ok(leaf.distalWeight > 0.7);
    assert.notEqual(leaf.x, 110);
    assert.ok(Math.abs(leaf.x - 110) <= Math.abs(stem.x - 141));
  });
  it('moves the complete foliage field and lotus visibly at default wind, with periodic reversal', () => {
    for (const [material, x, y] of [['canopy', 180, 40], ['lotus', 140, 271], ['lotus-leaves', 110, 274]] as const) {
      const period = material === 'canopy' ? (2 * Math.PI) / 0.68 : (2 * Math.PI) / 0.86;
      const poses = [0, period * 0.25, period * 0.5, period * 0.75, period].map(time => directionMotionSource(material, x, y, 640, 360, time, 0.6));
      assert.ok(Math.max(...poses.map(p => p.x)) - Math.min(...poses.map(p => p.x)) >= (material === 'canopy' ? 3 : 4), `${material} should sweep multiple native pixels at default wind`);
      const oppositePoses = material === 'canopy' ? [poses[1], poses[3]] : [poses[0], poses[2]];
      assert.notDeepEqual([oppositePoses[0].x, oppositePoses[0].y], [oppositePoses[1].x, oppositePoses[1].y], `${material} should reverse direction within its cycle`);
      assert.ok(Math.abs(poses[0].x - poses[4].x) <= 1, `${material} should approximately return within one cycle`);
    }
  });
  it('bounds integer movement to the maximum wind range while allowing the requested strong sway', () => {
    for (const material of ['canopy', 'lotus', 'lotus-stems', 'lotus-leaves', 'aerial-strands'] as const) {
      const atRest = directionMotionSource(material, 320, 290, 640, 360, 8.2, 0);
      const atMax = directionMotionSource(material, 320, 290, 640, 360, 8.2, 1.5);
      assert.ok(Math.abs(atMax.x - 320) <= (material === 'canopy' ? 5 : 5));
      assert.ok(Math.abs(atMax.y - 290) <= 2);
      assert.equal(atRest.x, 320); assert.equal(atRest.y, 290);
    }
  });
});
