import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const root = process.cwd();
const grids = [
  { key: '640x360', width: 640, height: 360, canonical: ['526e42617d04d976501e75d4033ff492de378bbc12dc7f9948be8814e0a9f1f9', '0353ee11459578565638920668682d43aec41da6910bc550550efb3adc1b3f15', '5e666ed4391b9b51a28997ea6f97bcffdc3c69dca503f947607ec7fefde07d18'] },
  { key: '960x540', width: 960, height: 540, canonical: ['497bbdba816f315edbdf8e0e55ce2309b21efcc3e5e8e045a7ec004c622f345b', '75a0aad17349e16bb3b4372de36e4bda166228e6afafeae3e5a657a5478a0619', 'bf831f16480442acd7cce02c85a90276ed60aee1beebffd61f69c68a0eb4446a'] },
];
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

describe('direction material-aware motion assets', () => {
  for (const grid of grids) it(`${grid.key}: keeps source/environment/shoreline stable and moves only eligible material`, async () => {
    const dir = path.join(root, 'public/art-direction', grid.key);
    for (const [i, name] of ['original.png', 'environment.png', 'mask.png'].entries()) {
      const bytes = await readFile(path.join(dir, name));
      assert.equal(sha(bytes), grid.canonical[i], `${grid.key}/${name} changed during motion polish`);
    }
    const decode = async (file: string) => {
      const { data, info } = await sharp(path.join(dir, file)).greyscale().raw().toBuffer({ resolveWithObject: true });
      assert.equal(info.width, grid.width); assert.equal(info.height, grid.height);
      return data;
    };
    const heavyRoots = await decode('roots-motion-mask.png');
    assert.equal(heavyRoots.reduce((n, v) => n + (v > 0 ? 1 : 0), 0), 0, 'buttress/trunk roots must stay anchored');
    const strands = await decode('aerial-root-strands-motion-mask.png');
    let strandCount = 0;
    for (let y = 0; y < grid.height; y++) for (let x = 0; x < grid.width; x++) {
      if (strands[y * grid.width + x] !== 255) continue;
      strandCount++;
      const sx = x * 640 / grid.width, sy = y * 360 / grid.height;
      const bands = [[275,277,64,116], [312,314,62,120], [319,321,64,120], [337,339,69,113]];
      assert.ok(bands.some(([x0,x1,y0,y1]) => sx >= x0 && sx <= x1 && sy >= y0 && sy <= y1));
    }
    assert.ok(strandCount > 8, `expected a few segmented aerial-root pixels, got ${strandCount}`);
    const canopy = await decode('canopy-motion-mask.png');
    const canopyZones = new Set<string>();
    for (let y = 0; y < grid.height; y++) for (let x = 0; x < grid.width; x++) if (canopy[y * grid.width + x]) {
      const sx = x * 640 / grid.width, sy = y * 360 / grid.height;
      assert.ok(sy <= 170, 'foliage must remain within documented tree-crown vertical extent');
      canopyZones.add(sx < 203 && sy < 145 ? 'banyan-left' : sx < 557 && sy < 105 ? 'banyan-overhead' : sx < 555 && sy >= 70 ? 'middle-background' : 'right-bank-background');
    }
    assert.deepEqual([...canopyZones].sort(), ['banyan-left', 'banyan-overhead', 'middle-background', 'right-bank-background'].sort(), 'all four visible tree foliage regions need moving material');
    const underplate = await sharp(path.join(dir, 'canopy-underplate.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(underplate.info.width, grid.width); assert.equal(underplate.info.height, grid.height);
    for (let p = 0; p < canopy.length; p++) assert.equal(underplate.data[p * 4 + 3], canopy[p] ? 255 : 0, 'derived underplate alpha exactly follows the canopy layer mask');
    const lotus = await decode('lotus-motion-mask.png');
    const stems = await decode('lotus-stems-motion-mask.png');
    const leaves = await decode('lotus-leaves-motion-mask.png');
    let stemCount = 0, leafCount = 0;
    for (let p = 0; p < stems.length; p++) {
      const sx = (p % grid.width) * 640 / grid.width, sy = Math.floor(p / grid.width) * 360 / grid.height;
      if (stems[p]) { stemCount++; assert.ok(sy >= 278 && sy <= 292 && ((sx >= 139 && sx <= 143) || (sx >= 162 && sx <= 166)), 'stem pixels must remain in two hand-bounded strips'); }
      if (leaves[p]) { leafCount++; assert.ok(sx >= 92 && sx <= 182 && sy >= 268 && sy <= 292, 'leaf pixels must remain in the selected left-plant geometry'); }
      assert.equal(Number(Boolean(stems[p])) + Number(Boolean(leaves[p])) + Number(Boolean(lotus[p])) <= 1, true, 'rig component masks must be disjoint');
    }
    assert.ok(stemCount >= 8 && stemCount < 100, `expected thin visible stem cutouts, got ${stemCount}`);
    assert.ok(leafCount > 100 && leafCount < 1500, `expected segmented leaf pads, got ${leafCount}`);
    let lotusCount = 0, minY = grid.height, maxY = 0;
    for (let y = 0; y < grid.height; y++) for (let x = 0; x < grid.width; x++) {
      if (!lotus[y * grid.width + x]) continue;
      lotusCount++; minY = Math.min(minY, y * 360 / grid.height); maxY = Math.max(maxY, y * 360 / grid.height);
      const sx = x * 640 / grid.width, sy = y * 360 / grid.height;
      assert.ok(sx >= 124 && sx <= 172 && sy >= 267 && sy <= 284, 'lotus movement must stay inside the two identified head cutouts');
    }
    assert.ok(lotusCount > 100 && lotusCount < 800, `expected complete local flower/bud cutouts including their rose outlines, got ${lotusCount}`);
    assert.ok(minY >= 268 && maxY <= 285, 'nearest-resampled head mask stays tightly bounded at both supported grids');
    const meta = JSON.parse(await readFile(path.join(dir, 'metadata.json'), 'utf8'));
    assert.match(meta.motion.roots, /remain stationary/);
    assert.match(meta.motion.aerialRootStrands, /upper attachment rows are pinned/);
    assert.match(meta.motion.lotusStems, /pinned at lower visible shoreline\/leaf attachment/);
    assert.match(meta.motion.lotusLeaves, /three bounded green leaf\/pad components/);
    assert.match(meta.motion.canopy, /eligible foliage pixels selected in four semantic zones/);
    assert.match(meta.motion.ownership.authoring, /not derived from movement eligibility/);
    assert.match(meta.motion.canopyUnderplate, /canopy-underplate\.png/);
    assert.match(meta.motion.strandUnderplate, /aerial-strands-underplate\.png/);
    const owner = await decode('foliage-protected-owners.png');
    const strandUnderplate = await sharp(path.join(dir, 'aerial-strands-underplate.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(strandUnderplate.info.width, grid.width); assert.equal(strandUnderplate.info.height, grid.height);
    for (let p = 0; p < strands.length; p++) {
      assert.equal(strandUnderplate.data[p * 4 + 3], strands[p] && owner[p] === 0 ? 255 : 0, 'strand underpaint alpha exactly follows independently safe strand source mask');
    }
  });
});
