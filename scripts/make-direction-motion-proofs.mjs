#!/usr/bin/env node
// Make native-grid source-overlays for each prepared motion mask (no image transformation
// other than exact 2x nearest-neighbour presentation enlargement for review).
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '.artifacts/direction/inspection');
const grids = [
  { key: '640x360', width: 640, height: 360 },
  { key: '960x540', width: 960, height: 540 },
];
const panels = [
  { file: null, label: 'Canonical master' },
  { file: 'canopy-motion-mask.png', label: 'Canopy candidate' },
  { file: 'roots-motion-mask.png', label: 'Roots candidate' },
  { file: 'lotus-motion-mask.png', label: 'Lotus candidate' },
];
await mkdir(outDir, { recursive: true });
for (const grid of grids) {
  const base = path.join(root, 'public/art-direction', grid.key);
  const original = await sharp(path.join(base, 'original.png')).ensureAlpha().raw().toBuffer();
  const rendered = [];
  for (const panel of panels) {
    let rgba = Buffer.from(original);
    if (panel.file) {
      const mask = await sharp(path.join(base, panel.file)).greyscale().raw().toBuffer();
      const tint = Buffer.alloc(grid.width * grid.height * 4);
      for (let p = 0; p < mask.length; p++) {
        const i = p * 4;
        tint[i] = 255; tint[i + 1] = 0; tint[i + 2] = 255;
        tint[i + 3] = Math.round(mask[p] * 0.62);
      }
      rgba = await sharp(rgba, { raw: { width: grid.width, height: grid.height, channels: 4 } })
        .composite([{ input: tint, raw: { width: grid.width, height: grid.height, channels: 4 }, blend: 'over' }])
        .raw().toBuffer();
    }
    const label = Buffer.from(`<svg width="${grid.width}" height="24"><rect width="${grid.width}" height="24" fill="#111"/><text x="8" y="17" fill="white" font-family="sans-serif" font-size="14">${panel.label}</text></svg>`);
    const native = await sharp(rgba, { raw: { width: grid.width, height: grid.height, channels: 4 } })
      .composite([{ input: label, left: 0, top: 0 }]).resize(grid.width * 2, grid.height * 2, { kernel: sharp.kernel.nearest }).png().toBuffer();
    rendered.push(native);
  }
  const cols = 2, rows = 2, panelW = grid.width * 2, panelH = grid.height * 2;
  const sheet = sharp({ create: { width: panelW * cols, height: panelH * rows, channels: 3, background: '#222222' } })
    .composite(rendered.map((input, index) => ({ input, left: (index % cols) * panelW, top: Math.floor(index / cols) * panelH })))
    .png();
  const output = path.join(outDir, `motion-mask-proof-${grid.key}.png`);
  await sheet.toFile(output);
  console.log(`${grid.key}: wrote ${path.relative(root, output)} (${panelW * cols}x${panelH * rows}; 2x nearest presentation, native source masks)`);
}
