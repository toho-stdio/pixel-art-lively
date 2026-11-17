(async () => {
  const app = window.__DENSITY_STUDY__;
  if (!app) throw new Error('Density study not ready');
  const results = [];
  const assert = (name, passed) => { results.push({ name, passed: Boolean(passed) }); if (!passed) throw new Error(name); };
  const tick = async () => { await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame); };
  const canvas = document.querySelector('#study-canvas');
  const hash = () => {
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    let h = 2166136261; for (let i = 0; i < data.length; i += 4) h = Math.imul(h ^ (data[i] + data[i + 1] * 256 + data[i + 2] * 65536), 16777619);
    return h >>> 0;
  };
  for (const key of ['320x180', '480x270', '640x360', '960x540']) {
    const select = document.querySelector('#study-resolution'); select.value = key; select.dispatchEvent(new Event('change', { bubbles: true }));
    app.freeze(); await tick(); const before = hash(); await tick();
    const [width, height] = key.split('x').map(Number);
    assert(key + ': selector rebuilds native target', canvas.width === width && canvas.height === height && app.resolution === key);
    assert(key + ': paused composition is stable', app.time === 3.25 && before === hash());
    const rect = canvas.getBoundingClientRect();
    assert(key + ': live preview has integer CSS scale', Number.isInteger(rect.width / width) && Number.isInteger(rect.height / height));
    const count = app.rippleCount;
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await tick();
    assert(key + ': keyboard water ripple works', app.rippleCount > count);
  }
  app.setResolution('640x360'); app.freeze(); await tick();
  const palette = document.querySelector('#study-palette'); const original = hash();
  palette.value = 'moon'; palette.dispatchEvent(new Event('change', { bubbles: true })); await tick();
  assert('Palette is bound and changes output', app.settings.palette === 'moon' && hash() !== original);
  palette.value = 'jade'; palette.dispatchEvent(new Event('change', { bubbles: true }));
  document.querySelector('#study-pause').click(); const time = app.time; await tick();
  assert('Play resumes clock', !app.settings.paused && app.time > time);
  app.freeze(); await tick();
  assert('Original baseline remains linked', Boolean(document.querySelector('a[href="/"]')));
  assert('No horizontal document overflow', document.documentElement.scrollWidth <= innerWidth);
  await app.buildComparison();
  assert('Comparison includes all four targets', app.comparisonMetadata.length === 4 && document.querySelectorAll('#study-gallery img').length === 4);
  assert('Comparison includes five close-up categories', document.querySelectorAll('#study-closeups img').length === 5);
  for (const record of app.comparisonMetadata) {
    const link = document.querySelector('#download-' + record.key);
    const bitmap = await createImageBitmap(await (await fetch(link.href)).blob());
    assert(record.key + ': actual PNG is exactly 1920 by 1080', bitmap.width === 1920 && bitmap.height === 1080);
    const output = document.createElement('canvas'); output.width = bitmap.width; output.height = bitmap.height;
    const ctx = output.getContext('2d'); ctx.drawImage(bitmap, 0, 0); bitmap.close();
    const data = ctx.getImageData(0, 0, output.width, output.height).data;
    const scale = record.scale1080;
    let uniform = true;
    outer: for (let y = 0; y < output.height; y += scale) for (let x = 0; x < output.width; x += scale) {
      const q = (y * output.width + x) * 4;
      for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
        const p = ((y + dy) * output.width + x + dx) * 4;
        if (data[q] !== data[p] || data[q + 1] !== data[p + 1] || data[q + 2] !== data[p + 2] || data[q + 3] !== data[p + 3]) { uniform = false; break outer; }
      }
    }
    assert(record.key + ': every output art-pixel cell is an exact integer block', uniform);
  }
  return { count: results.length, passed: results.every(r => r.passed), results, comparisonMetadata: app.comparisonMetadata };
})()
