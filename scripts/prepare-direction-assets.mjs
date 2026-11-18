#!/usr/bin/env node
// Prepare runtime-ready, native-grid trial assets from the approved canonical master.
// Originals are never rewritten. Water is segmented from the master and checked against
// the independently generated terrain key as a geometry guide (not used as final art).
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(root, '.artifacts/direction/generated');
const masterPath = path.join(sourceDir, '01-master.png');
const terrainPath = path.join(sourceDir, '02-terrain-mask.png');
const outRoot = path.join(root, 'public/art-direction');
const inspectionDir = path.join(root, '.artifacts/direction/inspection');
const sizes = [{ key: '640x360', width: 640, height: 360 }, { key: '960x540', width: 960, height: 540 }];
// Motion-only regeneration leaves canonical original/environment/water-mask files untouched.
const motionOnly = process.argv.includes('--motion-only');
// Conservative 640x360 source-coordinate ROIs. Motion masks are eligibility maps only,
// never edited artwork or claims of independent sprites/cutouts.
// Every clearly visible tree-crown zone is represented. Polygon clipping is done in
// native scene coordinates first; a bounded foliage-material predicate then keeps masonry,
// roof tiles, lotus pads, and moss outside these tree-only ROIs stationary.
const canopyWindClusters = [
  { id: 'banyan-left-crown', polygon: [[0, 0], [90, 0], [178, 0], [216, 12], [258, 7], [297, 28], [316, 62], [301, 91], [267, 111], [230, 106], [203, 126], [158, 109], [114, 128], [65, 134], [20, 126], [0, 105]] },
  { id: 'banyan-overhead-crown', polygon: [[155, 0], [250, 0], [343, 0], [421, 0], [507, 0], [557, 18], [544, 54], [506, 76], [467, 65], [425, 92], [384, 78], [343, 100], [304, 82], [285, 54], [244, 39], [203, 52], [176, 34]] },
  { id: 'middle-background-trees', polygon: [[203, 85], [240, 73], [276, 88], [305, 79], [337, 92], [360, 112], [380, 142], [355, 170], [316, 163], [290, 151], [262, 164], [234, 148], [212, 126]] },
  { id: 'right-bank-background-tree', polygon: [[615, 0], [639, 0], [639, 137], [618, 151], [599, 126], [575, 110], [562, 77], [544, 47]] },
];
// Hand-bounded native source geometry for the clear pond-side lotus pair only. Components
// are restricted to this one plant cluster; occluded right-bank blooms are deliberately excluded.
const lotusHeadRegions = [
  [[124, 267], [158, 267], [158, 284], [124, 284]],
  [[158, 268], [172, 268], [172, 283], [158, 283]],
];
const lotusLeafRegions = [
  [[94, 268], [121, 268], [126, 275], [121, 281], [97, 280], [92, 275]],
  [[115, 277], [138, 278], [144, 283], [140, 289], [119, 290], [113, 285]],
  [[145, 281], [177, 281], [182, 286], [178, 292], [146, 292], [141, 287]],
];
const lotusStemRegions = [
  { id: 'main', polygon: [[139, 281], [143, 281], [143, 292], [139, 292]] },
  { id: 'bud', polygon: [[162, 278], [166, 278], [166, 291], [162, 291]] },
];
// Independent art-authored no-motion silhouettes in 640x360 source coordinates.
// These owner profiles are not derived from/inverse to a candidate movement mask.
const protectedOwners = [
  { id: 1, owner: 'roofAndHouse', polygon: [[330, 132], [341, 121], [337, 110], [350, 101], [348, 91], [366, 82], [374, 63], [397, 56], [407, 67], [426, 56], [440, 68], [459, 56], [476, 66], [495, 53], [512, 63], [533, 54], [550, 66], [578, 73], [598, 91], [614, 117], [619, 145], [610, 159], [608, 226], [331, 226], [331, 151]] },
  { id: 2, owner: 'banyanStructure', polygon: [[69, 81], [114, 66], [148, 74], [169, 95], [209, 98], [232, 82], [270, 84], [299, 99], [316, 112], [299, 137], [275, 137], [249, 159], [226, 181], [205, 221], [169, 244], [118, 250], [78, 226]] },
  { id: 3, owner: 'planterAndShore', polygon: [[0, 215], [80, 215], [80, 300], [0, 300]] },
  { id: 3, owner: 'planterAndShore', polygon: [[190, 215], [330, 215], [330, 300], [190, 300]] },
  { id: 3, owner: 'planterAndShore', polygon: [[0, 300], [640, 300], [640, 360], [0, 360]] },
  { id: 4, owner: 'fixedLotus', polygon: [[440, 267], [474, 267], [488, 281], [486, 296], [474, 299], [448, 299], [438, 286]] },
  { id: 4, owner: 'fixedLotus', polygon: [[559, 264], [591, 264], [603, 279], [603, 296], [590, 299], [566, 299], [556, 284]] },
];
const insidePolygon = (x, y, polygon) => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const readImage = async (file) => {
  const bytes = await readFile(file);
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { bytes, data, info, hash: createHash('sha256').update(bytes).digest('hex') };
};
const master = await readImage(masterPath);
const terrain = await readImage(terrainPath);
const { width: sw, height: sh } = master.info;
if (sw !== 1672 || sh !== 941 || terrain.info.width !== sw || terrain.info.height !== sh) {
  throw new Error(`Expected aligned 1672x941 approved master + terrain guide; got ${sw}x${sh} and ${terrain.info.width}x${terrain.info.height}`);
}
if (master.data.some((v, i) => i % 4 === 3 && v !== 255)) throw new Error('Canonical master must be opaque.');
// A single bottom row is removed solely to make the source's 1672x941 ratio exactly 16:9.
// No stretching: both trial grids then use nearest-neighbour resampling.
const cropHeight = 940;
const masterCrop = await sharp(master.bytes).extract({ left: 0, top: 0, width: sw, height: cropHeight }).ensureAlpha().raw().toBuffer();
const guideCrop = await sharp(terrain.bytes).extract({ left: 0, top: 0, width: sw, height: cropHeight }).ensureAlpha().raw().toBuffer();
const sourcePixels = sw * cropHeight;
const terrainGuide = new Uint8Array(sourcePixels);
for (let p = 0; p < sourcePixels; p++) {
  const i = p * 4, r = guideCrop[i], g = guideCrop[i + 1], b = guideCrop[i + 2];
  terrainGuide[p] = r >= 180 && g < 110 && b >= 170 ? 1 : 0;
}
// Candidate water color predicate: teal chroma shared by flat water and its cast shadows.
// Restricting it to the terrain-key basin prevents unrelated teal/dark scene colors joining.
function masterTeal(i) {
  const r = masterCrop[i], g = masterCrop[i + 1], b = masterCrop[i + 2];
  return g > r + 11 && b > r + 12 && Math.abs(g - b) < 43 && g < 175;
}
const waterSource = new Uint8Array(sourcePixels);
let guideCount = 0, tealInsideGuide = 0;
for (let p = 0, i = 0; p < sourcePixels; p++, i += 4) {
  if (terrainGuide[p]) {
    guideCount++;
    if (masterTeal(i)) { waterSource[p] = 255; tealInsideGuide++; }
  }
}
const coverage = tealInsideGuide / sourcePixels;
if (coverage < 0.20 || coverage > 0.48) throw new Error(`Master/terrain water segmentation implausible: ${(coverage * 100).toFixed(2)}%`);
const masterSha = master.hash, guideSha = terrain.hash;
await mkdir(outRoot, { recursive: true });
await mkdir(inspectionDir, { recursive: true });

for (const grid of sizes) {
  const baseDir = path.join(outRoot, grid.key);
  await mkdir(baseDir, { recursive: true });
  const resize = { width: grid.width, height: grid.height, fit: 'fill', kernel: sharp.kernel.nearest };
  const resizedMaster = await sharp(masterCrop, { raw: { width: sw, height: cropHeight, channels: 4 } })
    .resize(resize).raw().toBuffer({ resolveWithObject: true });
  const maskRaw = await sharp(Buffer.from(waterSource), { raw: { width: sw, height: cropHeight, channels: 1 } })
    .resize(resize).raw().toBuffer({ resolveWithObject: true });
  // Reduce environmental RGB once at native destination resolution; disable diffusion. Preserve
  // transparent-water alpha as a separate binary channel after palette conversion.
  const rgb = Buffer.alloc(grid.width * grid.height * 3);
  for (let p = 0; p < grid.width * grid.height; p++) {
    const s = p * 4, d = p * 3;
    rgb[d] = resizedMaster.data[s]; rgb[d + 1] = resizedMaster.data[s + 1]; rgb[d + 2] = resizedMaster.data[s + 2];
  }
  const quantized = medianCut(rgb, 64);
  const pixels = grid.width * grid.height;
  const env = Buffer.alloc(pixels * 4), original = Buffer.alloc(pixels * 4);
  const maskRgba = Buffer.alloc(pixels * 4);
  const protectionOwners = Buffer.alloc(pixels);
  const masks = {
    'canopy-motion-mask.png': Buffer.alloc(pixels),
    'roots-motion-mask.png': Buffer.alloc(pixels), // heavy trunk and buttress roots are intentionally anchored
    'aerial-root-strands-motion-mask.png': Buffer.alloc(pixels),
    'lotus-motion-mask.png': Buffer.alloc(pixels), // retained flower/head component name
    'lotus-stems-motion-mask.png': Buffer.alloc(pixels),
    'lotus-leaves-motion-mask.png': Buffer.alloc(pixels),
  };
  const palette = new Set();
  let waterCount = 0;
  for (let p = 0; p < pixels; p++) {
    const i = p * 4, q = p * 3, water = maskRaw.data[p * maskRaw.info.channels] > 0;
    const r = resizedMaster.data[i], g = resizedMaster.data[i + 1], b = resizedMaster.data[i + 2];
    original[i] = r; original[i + 1] = g; original[i + 2] = b; original[i + 3] = 255;
    const qr = quantized[q], qg = quantized[q + 1], qb = quantized[q + 2];
    env[i] = qr; env[i + 1] = qg; env[i + 2] = qb; env[i + 3] = water ? 0 : 255;
    const m = water ? 255 : 0;
    maskRgba[i] = maskRgba[i + 1] = maskRgba[i + 2] = m; maskRgba[i + 3] = 255;
    if (water) waterCount++; else palette.add((qr << 16) | (qg << 8) | qb);
    // Nearest-resampled masks are authored in canonical-master coordinates. Conservative
    // hue/region bounds keep moving masks local and avoid building/ground selection.
    const nx = p % grid.width, ny = Math.floor(p / grid.width);
    const sx = nx * 640 / grid.width, sy = ny * 360 / grid.height;
    const h = rgbHue(r, g, b);
    const protectedOwner = protectedOwners.find((owner) => insidePolygon(sx, sy, owner.polygon));
    protectionOwners[p] = protectedOwner?.id ?? 0;
    if (!protectedOwner && canopyWindClusters.some((region) => insidePolygon(sx, sy, region.polygon))
      && h >= 26 && h <= 158 && g > 24 && g > r * 0.72 && g > b * 0.58)
      masks['canopy-motion-mask.png'][p] = 255;
    // Heavy trunk/buttress pixels are not eligible for motion: that whole mass stays fixed.
    // Select only four narrow, visually verified hanging strands under the horizontal bough.
    const strandBands = [[275, 277, 64, 116], [312, 314, 62, 120], [319, 321, 64, 120], [337, 339, 69, 113]];
    if (!protectedOwner && strandBands.some(([x0, x1, y0, y1]) => sx >= x0 && sx <= x1 && sy >= y0 && sy <= y1)
      && Math.max(r, g, b) < 110 && (r > g * 1.08 || (Math.abs(r - g) < 32 && Math.abs(g - b) < 32)) && sy > 68)
      masks['aerial-root-strands-motion-mask.png'][p] = 255;
    // Three individually identified parts of one clear left lotus pair. Heads use the tight
    // pink semantic mask; stems use narrow hand-bounded strips and part-specific colors; leaves
    // use three bounded lily-pad polygons. Priority is flower > stem > leaf, keeping masks disjoint.
    const lotusHead = lotusHeadRegions.some((polygon) => insidePolygon(sx, sy, polygon));
    // Include both the luminous petal fill and its darker rose-colored outline pixels; moving
    // only the bright centers leaves a stationary dark edge/ghost behind the articulated bloom.
    const petalColor = (r > 95 && b > 62 && r > g * 0.90 && b > g * 0.84)
      || (r > g * 1.12 && r > b * 1.02 && r < 190);
    if (!water && lotusHead && petalColor) masks['lotus-motion-mask.png'][p] = 255;
    const stemIndex = lotusStemRegions.findIndex((stem) => insidePolygon(sx, sy, stem.polygon));
    const stemColor = stemIndex === 0
      ? ((r > g && g > b + 20 && r - g < 45 && r > 100) || (r < 80 && g < 100 && b < 100))
      : ((g > r + 8 && g > b + 8 && g > 80 && r < 190) || (r < 65 && g < 105 && b < 100));
    if (!water && !masks['lotus-motion-mask.png'][p] && stemIndex >= 0 && stemColor)
      masks['lotus-stems-motion-mask.png'][p] = 255;
    const lotusLeaf = lotusLeafRegions.some((polygon) => insidePolygon(sx, sy, polygon));
    const greenLeaf = h >= 34 && h <= 115 && g > r * 0.82 && g > b * 0.72 && g > 45;
    if (!water && !masks['lotus-motion-mask.png'][p] && !masks['lotus-stems-motion-mask.png'][p] && lotusLeaf && greenLeaf)
      masks['lotus-leaves-motion-mask.png'][p] = 255;
  }
  if (palette.size > 64) throw new Error(`${grid.key}: got ${palette.size} environmental colors`);
  // Derived native-grid hidden underpaint for both moving foliage cutouts. Local ring
  // samples exclude every moving source, water, and independently protected owner.
  const movingUnion = Buffer.alloc(pixels);
  for (const layer of Object.values(masks)) for (let p = 0; p < pixels; p++) if (layer[p] === 255) movingUnion[p] = 255;
  const makeUnderplate = (selectedMask) => {
    const output = Buffer.alloc(pixels * 4);
    for (let p = 0; p < pixels; p++) {
      if (selectedMask[p] !== 255) continue;
      const x = p % grid.width, y = Math.floor(p / grid.width);
      let rr = 0, gg = 0, bb = 0, n = 0;
      for (let radius = 1; radius <= 4 && n === 0; radius++) {
        for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= grid.width || yy >= grid.height) continue;
          const q = yy * grid.width + xx;
          if (movingUnion[q] || maskRgba[q * 4] === 255 || protectionOwners[q] !== 0) continue;
          const s = q * 4; rr += resizedMaster.data[s]; gg += resizedMaster.data[s + 1]; bb += resizedMaster.data[s + 2]; n++;
        }
      }
      const d = p * 4, source = p * 4;
      output[d] = n ? Math.round(rr / n) : resizedMaster.data[source];
      output[d + 1] = n ? Math.round(gg / n) : resizedMaster.data[source + 1];
      output[d + 2] = n ? Math.round(bb / n) : resizedMaster.data[source + 2];
      output[d + 3] = 255;
    }
    return output;
  };
  const canopyUnderplate = makeUnderplate(masks['canopy-motion-mask.png']);
  const strandUnderplate = makeUnderplate(masks['aerial-root-strands-motion-mask.png']);
  const toRgba = (data) => sharp(data, { raw: { width: grid.width, height: grid.height, channels: 4 } }).png({ compressionLevel: 9 });
  await Promise.all([
    ...(motionOnly ? [] : [
      toRgba(original).toFile(path.join(baseDir, 'original.png')),
      toRgba(env).toFile(path.join(baseDir, 'environment.png')),
      toRgba(maskRgba).toFile(path.join(baseDir, 'mask.png')),
    ]),
    ...Object.entries(masks).map(([name, data]) => sharp(data, { raw: { width: grid.width, height: grid.height, channels: 1 } }).png({ compressionLevel: 9 }).toFile(path.join(baseDir, name))),
    sharp(protectionOwners, { raw: { width: grid.width, height: grid.height, channels: 1 } }).png({ compressionLevel: 9 }).toFile(path.join(baseDir, 'foliage-protected-owners.png')),
    toRgba(canopyUnderplate).toFile(path.join(baseDir, 'canopy-underplate.png')),
    toRgba(strandUnderplate).toFile(path.join(baseDir, 'aerial-strands-underplate.png')),
  ]);
  const counts = Object.fromEntries(Object.entries(masks).map(([name, data]) => [name, data.reduce((n, v) => n + (v === 255), 0)]));
  const meta = {
    schemaVersion: 1, grid: grid.key, dimensions: { width: grid.width, height: grid.height },
    source: { file: '.artifacts/direction/generated/01-master.png', sha256: masterSha, dimensions: { width: sw, height: sh } },
    segmentationGuide: { file: '.artifacts/direction/generated/02-terrain-mask.png', sha256: guideSha, role: 'magenta-key geometry guide; final water additionally requires master teal/shadow chroma' },
    normalization: { method: 'crop one bottom source row to 1672x940 exact 16:9, then direct nearest-neighbor resample; no squashing, no upscaling from old baseline', crop: { left: 0, top: 0, width: sw, height: cropHeight }, resize: 'nearest' },
    palette: { target: 64, actualEnvironmentalColors: palette.size, quantizer: 'deterministic weighted median-cut with nearest-color assignment', dithering: 'none', appliedTo: 'environment RGB; original.png retains source color appearance after nearest resampling' },
    alpha: { original: '255 everywhere', environment: '0 exactly on mask water pixels; 255 on land', masks: 'opaque binary grayscale (0 or 255)' },
    water: { segmentation: 'terrain magenta key AND master teal/shadow chroma (G>R+11, B>R+12, abs(G-B)<43, G<175)', sourceCoverage: tealInsideGuide / sourcePixels, outputCoverage: waterCount / pixels, sourceGuidePixels: guideCount, outputPixels: waterCount },
    motion: {
      coordinateSpace: 'nearest-resampled source-master pixel coordinates, scaled directly to this grid',
      maskSemantics: 'opaque grayscale; white=eligible source pixels, black=other; moving strands are narrowly selected from the source plate with fixed upper attachments; heavy roots are separately asserted anchored',
      files: Object.keys(masks),
      canopy: 'eligible foliage pixels selected in four semantic zones: banyan outer crown, overhead connected crown, middle-distance trees, and exposed far-right crown; independent owner silhouettes reject roof/house, banyan structural bough/trunk, planter/shore, and other fixed lotus destinations; overlapping flattened foliage remains fixed',
      ownership: { file: 'foliage-protected-owners.png', encoding: 'opaque grayscale owner IDs: 0 free, 1 roof/house, 2 banyan structural trunk/bough, 3 planter/shore, 4 other fixed lotus clusters', authoring: 'independent hand-bounded 640x360 source-coordinate polygons uniformly projected to both native grids; not derived from movement eligibility', sourceAndDestination: 'both moving source and posed destination must have owner ID 0; destination writes into protected IDs are rejected' },
      canopyUnderplate: 'canopy-underplate.png is a native-grid, transparent-outside/opaque-inside 4-pixel-ring reconstruction derived only from adjacent nonmoving, owner-free canonical samples; used only behind accepted canopy cutouts',
      strandUnderplate: 'aerial-strands-underplate.png has the same native-grid binary-alpha provenance for the four accepted hanging-strand cutouts; all moving candidates, water, and protected owners are excluded from its local source rings',
      windResponse: 'tree foliage uses a 0.68 rad/s travelling regional phase and up to 3.74 native pixels at wind 1.5 (2.05px peak at default wind 0.6); lotus uses a 0.86 rad/s articulation cycle with 5.50px flower, 5.06px stem and 4.84px leaf peak at wind 1.5 (3.10/2.85/2.72px at default 0.6). Integer raster, shared regional field with small phase lags, wind clamped 0..1.5; zero wind exactly stationary.',
      roots: 'heavy trunk and buttress roots remain stationary; roots-motion-mask.png is empty by design',
      aerialRootStrands: 'four narrow, individually bounded dark hanging strands selected from canonical plate; upper attachment rows are pinned during wind deformation',
      lotus: 'pink flower and bud components of one clear left lotus rig; attached to individually selected stem components with small constrained distal lag.',
      lotusStems: 'two narrow geometry-and-color selected stem strips for the clear main flower and bud, pinned at lower visible shoreline/leaf attachment rows (native source y≈292 and y≈291); motion never reaches shore pixels.',
      lotusLeaves: 'three bounded green leaf/pad components in the same clear left lotus group; coherent low-amplitude sway with shared wind and slight phase lag. Occluded/right-bank plants excluded.',

      reflectionAnchors: { rearBankY: Math.round(grid.height * 198 / 360), pondLeftShore: 'follow white/black mask boundary', pondRightShore: 'follow white/black mask boundary', lotusForeground: 'lower-side pond-edge groups, mask only' }
    },
    reflectionPlanes: [{ id: 'rear-pond-bank', y: Math.round(grid.height * 198 / 360), xStart: Math.round(grid.width * 200 / 640), xEnd: grid.width - 1 }],
    motionMaskCoverage: { ...Object.fromEntries(Object.entries(counts).map(([name, n]) => [name, n / pixels])), 'canopy-underplate.png': canopyUnderplate.reduce((n, v, i) => n + (i % 4 === 3 && v === 255), 0) / pixels, 'aerial-strands-underplate.png': strandUnderplate.reduce((n, v, i) => n + (i % 4 === 3 && v === 255), 0) / pixels },
    sourceHashes: { masterSha256: masterSha, terrainGuideSha256: guideSha }
  };
  await writeFile(path.join(baseDir, 'metadata.json'), JSON.stringify(meta, null, 2) + '\n');
}
// Integrity gate over the exact emitted assets, not just in-memory buffers.
for (const grid of sizes) {
  const dir = path.join(outRoot, grid.key), n = grid.width * grid.height;
  const [orig, env, mask] = await Promise.all([
    sharp(path.join(dir, 'original.png')).ensureAlpha().raw().toBuffer(),
    sharp(path.join(dir, 'environment.png')).ensureAlpha().raw().toBuffer(),
    sharp(path.join(dir, 'mask.png')).ensureAlpha().raw().toBuffer(),
  ]);
  if (orig.length !== n * 4 || env.length !== n * 4 || mask.length !== n * 4) throw new Error(`${grid.key}: incorrect emitted dimensions`);
  const palette = new Set(); let waterCount = 0;
  for (let p = 0; p < n; p++) {
    const i = p * 4, water = mask[i] === 255;
    if (mask[i] !== mask[i + 1] || mask[i] !== mask[i + 2] || mask[i + 3] !== 255 || (mask[i] !== 0 && mask[i] !== 255)) throw new Error(`${grid.key}: nonbinary/invalid mask at ${p}`);
    if (orig[i + 3] !== 255 || env[i + 3] !== (water ? 0 : 255)) throw new Error(`${grid.key}: alpha contract failure at ${p}`);
    if (water) waterCount++;
    else palette.add((env[i] << 16) | (env[i + 1] << 8) | env[i + 2]);
  }
  if (palette.size > 64) throw new Error(`${grid.key}: emitted environment has ${palette.size} colors`);
  for (const name of Object.keys({ 'canopy-motion-mask.png': 1, 'roots-motion-mask.png': 1, 'aerial-root-strands-motion-mask.png': 1, 'lotus-motion-mask.png': 1 })) {
    const data = await sharp(path.join(dir, name)).greyscale().raw().toBuffer();
    if (data.length !== n || data.some(v => v !== 0 && v !== 255)) throw new Error(`${grid.key}: ${name} is not native-sized binary mask`);
  }
  console.log(`${grid.key}: verified ${waterCount}/${n} water pixels; ${palette.size} environment colors; opaque original; binary masks/alpha.`);
}
// Inspection contact sheet: canonical grids at left; master-derived water boundary in magenta at right.
const contactItems = [];
for (let row = 0; row < sizes.length; row++) {
  const dir = path.join(outRoot, sizes[row].key), top = row * 540;
  const orig = await sharp(path.join(dir, 'original.png')).resize(480, 270, { kernel: sharp.kernel.nearest }).png().toBuffer();
  const maskImage = await sharp(path.join(dir, 'mask.png')).resize(480, 270, { kernel: sharp.kernel.nearest }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const overlayPixels = Buffer.alloc(480 * 270 * 4);
  for (let p = 0; p < 480 * 270; p++) {
    const i = p * 4;
    overlayPixels[i] = 255; overlayPixels[i + 1] = 0; overlayPixels[i + 2] = 255;
    overlayPixels[i + 3] = maskImage.data[p] > 127 ? 112 : 0;
  }
  const overlay = await sharp(overlayPixels, { raw: { width: 480, height: 270, channels: 4 } }).png().toBuffer();
  contactItems.push({ input: orig, left: 0, top });
  contactItems.push({ input: orig, left: 500, top });
  contactItems.push({ input: overlay, left: 500, top });
}
const sheet = sharp({ create: { width: 980, height: 1080, channels: 3, background: '#222222' } }).composite(contactItems).png();
await sheet.toFile(path.join(inspectionDir, 'direction-segmentation-contact-sheet.png'));
console.log(JSON.stringify({ grids: sizes.map(s => s.key), masterSha256: masterSha, guideSha256: guideSha, sourceWaterCoverage: coverage, contactSheet: '.artifacts/direction/inspection/direction-segmentation-contact-sheet.png' }, null, 2));

function medianCut(rgb, limit) {
  const histogram = new Map();
  for (let i = 0; i < rgb.length; i += 3) {
    const key = (rgb[i] << 16) | (rgb[i + 1] << 8) | rgb[i + 2];
    const entry = histogram.get(key);
    if (entry) entry.count++;
    else histogram.set(key, { r: rgb[i], g: rgb[i + 1], b: rgb[i + 2], count: 1 });
  }
  const range = (box, channel) => {
    let lo = 255, hi = 0;
    for (const c of box) { lo = Math.min(lo, c[channel]); hi = Math.max(hi, c[channel]); }
    return hi - lo;
  };
  const boxes = [[...histogram.values()]];
  while (boxes.length < limit) {
    let best = -1, score = -1, channel = 'r';
    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].length < 2) continue;
      for (const c of ['r', 'g', 'b']) {
        const s = range(boxes[i], c) * Math.log2(1 + boxes[i].reduce((n, e) => n + e.count, 0));
        if (s > score) { best = i; score = s; channel = c; }
      }
    }
    if (best < 0) break;
    const box = boxes.splice(best, 1)[0].sort((a, b) => a[channel] - b[channel]);
    const half = box.reduce((n, e) => n + e.count, 0) / 2;
    let weight = 0, split = 1;
    for (; split < box.length; split++) { weight += box[split - 1].count; if (weight >= half) break; }
    boxes.push(box.slice(0, split), box.slice(split));
  }
  const palette = boxes.map(box => {
    let r = 0, g = 0, b = 0, n = 0;
    for (const c of box) { r += c.r * c.count; g += c.g * c.count; b += c.b * c.count; n += c.count; }
    return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
  });
  const output = Buffer.alloc(rgb.length);
  for (let i = 0; i < rgb.length; i += 3) {
    const r = rgb[i], g = rgb[i + 1], b = rgb[i + 2];
    let winner = palette[0], best = Infinity;
    for (const c of palette) {
      const dr = r - c[0], dg = g - c[1], db = b - c[2];
      const d = dr * dr * 3 + dg * dg * 4 + db * db * 2;
      if (d < best) { best = d; winner = c; }
    }
    output[i] = winner[0]; output[i + 1] = winner[1]; output[i + 2] = winner[2];
  }
  return output;
}
function rgbHue(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d === 0) return 0;
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}
