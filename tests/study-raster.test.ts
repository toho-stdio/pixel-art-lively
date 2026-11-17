import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NativePainter } from '../src/study/raster.ts';
import { RESOLUTIONS } from '../src/study/types.ts';

test('native rasterizer paints transformed geometry without intermediate alpha', () => {
  for (const r of RESOLUTIONS) {
    const painter = new NativePainter(r.width, r.height, true);
    painter.poly([[20, 20], [40, 23], [32, 45]], '#668844');
    painter.line([[30, 30], [52, 71]], '#abcdef', 1);
    painter.ellipse(60, 45, 12, 7, '#557733');
    let painted = 0;
    for (let i = 3; i < painter.pixels.length; i += 4) {
      assert.ok(painter.pixels[i] === 0 || painter.pixels[i] === 255);
      if (painter.pixels[i] === 255) painted++;
    }
    assert.ok(painted > 10);
    painter.clear();
    assert.equal(painter.pixels.some(v => v !== 0), false);
  }
});

test('native painter clips edges and preserves minimum one-pixel thin strokes', () => {
  for (const r of RESOLUTIONS) {
    const p = new NativePainter(r.width, r.height, true);
    p.rect(-100, -100, 1000, 1000, '#123456');
    for (let i = 0; i < p.pixels.length; i += 4) {
      assert.equal(p.pixels[i], 0x12); assert.equal(p.pixels[i + 1], 0x34);
      assert.equal(p.pixels[i + 2], 0x56); assert.equal(p.pixels[i + 3], 255);
    }
    p.clear(); p.line([[0, 100], [100, 100]], '#ffffff', .1);
    const rows = new Set<number>();
    for (let i = 3; i < p.pixels.length; i += 4) if (p.pixels[i]) rows.add(Math.floor(i / 4 / r.width));
    assert.equal(rows.size, 1);
  }
});
