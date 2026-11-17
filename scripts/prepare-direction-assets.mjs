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
// Conservative 640x360 source-coordinate ROIs. Roots stop above the planter wall; lotus
// regions stay on the pond-side foliage above the foreground barrier. These are masks only.
const rootSafePolygon = [[88, 100], [111, 92], [132, 113], [150, 82], [167, 105], [181, 125], [188, 151], [168, 163], [148, 137], [131, 167], [105, 161], [78, 138]];
const lotusSafeRegions = [
  [[70, 238], [185, 242], [185, 278], [150, 292], [110, 287], [80, 271], [70, 257]],
  [[465, 235], [615, 237], [615, 267], [600, 284], [575, 302], [550, 300], [520, 290], [490, 275], [465, 250]],
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
  const masks = {
    'canopy-motion-mask.png': Buffer.alloc(pixels),
    'roots-motion-mask.png': Buffer.alloc(pixels),
    'lotus-motion-mask.png': Buffer.alloc(pixels),
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
    if (sx < 175 && sy < 150 && h >= 34 && h <= 152 && g > 32) masks['canopy-motion-mask.png'][p] = 255;
    // Keep only warm bark pixels inside the tree's buttress/root silhouette. The lower
    // polygon edge intentionally ends above the brick planter to reject masonry/ground.
    if (insidePolygon(sx, sy, rootSafePolygon) && h >= 7 && h <= 38 && r > 35 && g > 18 && r > b * 1.04)
      masks['roots-motion-mask.png'][p] = 255;
    // Restrict foliage/flower colors to the pond-side lotus groups. These ROIs stop before
    // the near barrier/paving; water is excluded so only visibly colored plant pixels remain.
    const lotusZone = !water && lotusSafeRegions.some((polygon) => insidePolygon(sx, sy, polygon));
    // Bright yellow-green leaf faces and pink petals only; the higher luminance/saturation
    // floor rejects dull moss/stone colors that share the same broad hue family.
    const lotusLeaf = g > r * 1.02 && g > b * 1.08 && g > 92 && g - b > 24;
    const lotusBloom = r > g * 1.12 && r > b * 1.12 && r > 95 && b > 82;
    if (lotusZone && (lotusLeaf || lotusBloom)) masks['lotus-motion-mask.png'][p] = 255;
  }
  if (palette.size > 64) throw new Error(`${grid.key}: got ${palette.size} environmental colors`);
  const toRgba = (data) => sharp(data, { raw: { width: grid.width, height: grid.height, channels: 4 } }).png({ compressionLevel: 9 });
  await Promise.all([
    toRgba(original).toFile(path.join(baseDir, 'original.png')),
    toRgba(env).toFile(path.join(baseDir, 'environment.png')),
    toRgba(maskRgba).toFile(path.join(baseDir, 'mask.png')),
    ...Object.entries(masks).map(([name, data]) => sharp(data, { raw: { width: grid.width, height: grid.height, channels: 1 } }).png({ compressionLevel: 9 }).toFile(path.join(baseDir, name))),
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
      maskSemantics: 'opaque grayscale; white=eligible source pixels, black=other; masks are conservative spatial/color segmentation, not independent cutouts',
      files: Object.keys(masks),
      canopy: 'green pixels clipped to the dense left banyan crown/trunk area (source x<175,y<150); still a mask-only source, not a detached crown sprite',
      roots: 'warm pixels inside a compact lower buttress-root polygon ending above the planter wall; excludes outer masonry/ground but is still a mask-only source',
      lotus: 'bright leaf/petal pixels inside two pond-side ROIs above the foreground barrier; mask only, no sprite/cutout/underpaint generated. Deform subtly in-place only or keep anchored to avoid gaps/ghosts.',

      reflectionAnchors: { rearBankY: Math.round(grid.height * 198 / 360), pondLeftShore: 'follow white/black mask boundary', pondRightShore: 'follow white/black mask boundary', lotusForeground: 'lower-side pond-edge groups, mask only' }
    },
    reflectionPlanes: [{ id: 'rear-pond-bank', y: Math.round(grid.height * 198 / 360), xStart: Math.round(grid.width * 200 / 640), xEnd: grid.width - 1 }],
    motionMaskCoverage: Object.fromEntries(Object.entries(counts).map(([name, n]) => [name, n / pixels])),
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
  for (const name of Object.keys({ 'canopy-motion-mask.png': 1, 'roots-motion-mask.png': 1, 'lotus-motion-mask.png': 1 })) {
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
