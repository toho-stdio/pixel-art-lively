#!/usr/bin/env node
// Verify the checked-in generated art-direction outputs against the approved source files.
// This is read-only: run prepare-direction-assets.mjs separately to regenerate outputs.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const grids = [
  { key: '640x360', width: 640, height: 360, bankY: 198, xStart: 200 },
  { key: '960x540', width: 960, height: 540, bankY: 297, xStart: 300 },
];
const files = ['canopy-motion-mask.png', 'roots-motion-mask.png', 'lotus-motion-mask.png'];
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
function assert(ok, message) { if (!ok) throw new Error(message); }
async function rgba(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, info };
}

for (const grid of grids) {
  const dir = path.join(root, 'public/art-direction', grid.key);
  const metadata = JSON.parse(await readFile(path.join(dir, 'metadata.json'), 'utf8'));
  assert(metadata.grid === grid.key, `${grid.key}: metadata grid mismatch`);
  assert(metadata.dimensions?.width === grid.width && metadata.dimensions?.height === grid.height, `${grid.key}: metadata dimensions mismatch`);
  const masterBytes = await readFile(path.join(root, metadata.source.file));
  const guideBytes = await readFile(path.join(root, metadata.segmentationGuide.file));
  assert(hash(masterBytes) === metadata.source.sha256, `${grid.key}: approved master source hash mismatch`);
  assert(hash(guideBytes) === metadata.segmentationGuide.sha256, `${grid.key}: terrain guide source hash mismatch`);
  assert(metadata.sourceHashes?.masterSha256 === metadata.source.sha256, `${grid.key}: duplicate master provenance hash mismatch`);
  assert(metadata.sourceHashes?.terrainGuideSha256 === metadata.segmentationGuide.sha256, `${grid.key}: duplicate terrain provenance hash mismatch`);
  const [original, environment, mask] = await Promise.all(['original.png', 'environment.png', 'mask.png'].map((name) => rgba(path.join(dir, name))));
  const count = grid.width * grid.height;
  for (const [name, image] of [['original', original], ['environment', environment], ['mask', mask]]) {
    assert(image.info.width === grid.width && image.info.height === grid.height, `${grid.key}/${name}: not native size`);
    assert(image.data.length === count * 4, `${grid.key}/${name}: unexpected pixel buffer length`);
  }
  const colors = new Set();
  let waterCount = 0;
  for (let p = 0; p < count; p++) {
    const i = p * 4, water = mask.data[i] === 255;
    assert(mask.data[i] === mask.data[i + 1] && mask.data[i] === mask.data[i + 2] && mask.data[i + 3] === 255 && (mask.data[i] === 0 || water), `${grid.key}: mask is not opaque binary grayscale at ${p}`);
    assert(original.data[i + 3] === 255, `${grid.key}: original is not opaque at ${p}`);
    assert(environment.data[i + 3] === (water ? 0 : 255), `${grid.key}: environment alpha/mask mismatch at ${p}`);
    if (water) waterCount++;
    else colors.add((environment.data[i] << 16) | (environment.data[i + 1] << 8) | environment.data[i + 2]);
  }
  assert(colors.size > 0 && colors.size <= 64, `${grid.key}: environment contains ${colors.size} opaque colors`);
  assert(metadata.palette?.actualEnvironmentalColors === colors.size && metadata.palette?.target === 64, `${grid.key}: palette metadata mismatch`);
  assert(metadata.water?.outputPixels === waterCount, `${grid.key}: water count metadata mismatch`);
  assert(Math.abs(metadata.water?.outputCoverage - waterCount / count) < 1e-12, `${grid.key}: water coverage metadata mismatch`);
  assert(Math.abs(waterCount / count - 0.2464) < 0.005, `${grid.key}: unexpected water coverage ${(waterCount / count * 100).toFixed(3)}%`);
  for (const name of files) {
    const image = await sharp(path.join(dir, name)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert(image.info.width === grid.width && image.info.height === grid.height, `${grid.key}/${name}: not native size`);
    let selected = 0;
    for (let p = 0; p < count; p++) {
      const i = p * 4, v = image.data[i];
      assert((v === 0 || v === 255) && image.data[i + 1] === v && image.data[i + 2] === v && image.data[i + 3] === 255, `${grid.key}/${name}: not opaque binary grayscale at ${p}`);
      if (v !== 255) continue;
      selected++;
      const sx = (p % grid.width) * 640 / grid.width;
      const sy = Math.floor(p / grid.width) * 360 / grid.height;
      if (name === 'canopy-motion-mask.png') assert(sx < 175 && sy < 150, `${grid.key}/${name}: escaped conservative crown ROI at (${sx},${sy})`);
      if (name === 'roots-motion-mask.png') assert(sx >= 78 && sx < 188 && sy >= 82 && sy < 167, `${grid.key}/${name}: escaped buttress ROI at (${sx},${sy})`);
      if (name === 'lotus-motion-mask.png') assert(sx >= 62 && sx < 615 && sy >= 238 && sy < 303, `${grid.key}/${name}: escaped pond-side ROI at (${sx},${sy})`);
    }
    assert(selected > 200 && selected < count * 0.15, `${grid.key}/${name}: unexpected mask coverage ${selected}/${count}`);
  }
  assert(metadata.reflectionPlanes?.length === 1, `${grid.key}: expected one fixed rear reflection plane`);
  const plane = metadata.reflectionPlanes[0];
  assert(plane.id === 'rear-pond-bank' && plane.y === grid.bankY && plane.xStart === grid.xStart && plane.xEnd === grid.width - 1, `${grid.key}: rear reflection plane mismatch`);
  assert(metadata.motion?.maskSemantics?.includes('not independent cutouts'), `${grid.key}: missing motion-mask limitation`);
  assert(metadata.motion?.lotus?.includes('no sprite/cutout/underpaint'), `${grid.key}: lotus cutout limitation missing`);
  console.log(`${grid.key}: PASS (${waterCount}/${count} water; ${colors.size} land colors; native opaque original; exact inverse environment alpha; 3 binary masks; master ${metadata.source.sha256}; reflection y=${plane.y}, x=${plane.xStart}..${plane.xEnd})`);
}
console.log('Direction asset integrity: PASS');
