// Preserve original browser downloads; prepare binary-alpha inspection assets only.
// This does NOT register layers, reduce the palette, or establish the final game grid.
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = '.artifacts/direction/generated';
const output = join(root, 'clean');
await mkdir(output, { recursive: true });
const names = ['01-master.png', '02-terrain-mask.png', '03-banyan.png', '04-dinh.png', '05-lotus.png'];
const records = [];
for (const name of names) {
  const bytes = await readFile(join(root, name));
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixels = info.width * info.height;
  let clear = 0, partial = 0, keyed = 0;
  const mask = name.startsWith('02-') ? Buffer.alloc(pixels) : null;
  for (let i = 0; i < pixels; i++) {
    const p = i * 4;
    const alpha = data[p + 3];
    if (alpha === 0) clear++;
    else if (alpha < 255) partial++;
    // Key the reserved saturated-magenta pond BEFORE any palette conversion.
    const water = mask && data[p] >= 180 && data[p + 1] < 110 && data[p + 2] >= 170;
    if (mask) { mask[i] = water ? 255 : 0; if (water) keyed++; }
    data[p + 3] = water || alpha < 128 ? 0 : 255;
    if (data[p + 3] === 0) data[p] = data[p + 1] = data[p + 2] = 0;
  }
  // Master is only a style reference; preserve it verbatim rather than pretending it is a cutout.
  if (!name.startsWith('01-')) {
    await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(join(output, name));
  }
  if (mask) await sharp(mask, { raw: { width: info.width, height: info.height, channels: 1 } }).png().toFile(join(output, '02-water-mask.png'));
  records.push({ name, width: info.width, height: info.height, sha256: createHash('sha256').update(bytes).digest('hex'), originalTransparentPixels: clear, originalPartialAlphaPixels: partial, keyedWaterPixels: keyed, keyedWaterFraction: keyed / pixels });
}
await writeFile(join(root, 'manifest.json'), JSON.stringify({
  stage: 'Original image generation complete; registration/native raster integration NOT complete',
  originalDirectory: root,
  cleanDirectory: output,
  cleanup: 'Alpha >=128 becomes255, otherwise0; reserved magenta key uses R>=180,G<110,B>=170. No resize, palette quantization or registration.',
  records,
}, null, 2) + '\n');
// Verify all derived cutouts are truly binary alpha and the mask has only0/255.
for (const name of names.slice(1)) {
  const { data } = await sharp(join(output, name)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 3; i < data.length; i += 4) if (data[i] !== 0 && data[i] !== 255) throw new Error(`Partial alpha: ${name}`);
}
const mask = await sharp(join(output, '02-water-mask.png')).greyscale().raw().toBuffer();
if (mask.some(value => value !== 0 && value !== 255)) throw new Error('Non-binary water mask');
console.log(JSON.stringify({ originals: records.length, binaryCutouts: 4, binaryMask: true, records }, null, 2));
