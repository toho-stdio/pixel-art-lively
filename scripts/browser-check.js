(async () => {
  const app = window.__AO_LANG__;
  if (!app) throw new Error('Ao Làng runtime unavailable');
  const canvas = document.querySelector('#pond');
  const ctx = canvas.getContext('2d');
  const results = [];
  const frames = async (n = 3) => { for (let i = 0; i < n; i++) await new Promise(requestAnimationFrame); };
  const assert = (name, value) => { results.push({ name, passed: Boolean(value) }); if (!value) throw new Error(name); };
  const hash = () => {
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let h = 2166136261;
    for (let i = 0; i < data.length; i += 4) h = Math.imul(h ^ (data[i] + data[i + 1] * 256 + data[i + 2] * 65536), 16777619);
    return h >>> 0;
  };
  const setRange = (id, value) => { const el = document.querySelector('#' + id); el.value = String(value); el.dispatchEvent(new Event('input', { bubbles: true })); };
  document.querySelector('#reset').click();
  if (app.settings.paused) document.querySelector('#pause').click();
  canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await frames(15);
  document.querySelector('#pause').click();
  await frames();
  const time = app.time;
  const base = hash();
  await frames(5);
  assert('Pause freezes time and pixels', time === app.time && hash() === base);
  for (const palette of ['golden', 'moon', 'jade']) {
    document.querySelector('[data-palette="' + palette + '"]').click(); await frames();
    assert('Palette ' + palette + ' applied', app.settings.palette === palette);
    if (palette !== 'jade') assert('Palette ' + palette + ' changes pixels', hash() !== base);
  }
  for (const key of ['depth', 'sky', 'reflections', 'shoreline', 'backBank', 'particles']) {
    const before = hash(); const input = document.querySelector('#effect-' + key);
    input.click(); await frames();
    assert(key + ' toggle bound', app.settings[key] === false);
    assert(key + ' toggle changes output', hash() !== before);
    input.click(); await frames();
  }
  setRange('distortion', 4); setRange('speed', 1.75); setRange('wind', 1.2); setRange('rain', .8); await frames();
  assert('Range settings bound', app.settings.distortion === 4 && app.settings.speed === 1.75 && app.settings.wind === 1.2 && app.settings.rain === .8);
  assert('Center point is water', app.isWater(320, 270));
  const rippleCount = app.rippleCount;
  canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await frames();
  assert('Keyboard Enter creates ripple', app.rippleCount > rippleCount);
  document.querySelector('#about-open').click(); await frames();
  assert('About dialog opens', document.querySelector('#about-dialog').open);
  document.querySelector('#about-close').click();
  assert('About dialog closes', !document.querySelector('#about-dialog').open);
  document.querySelector('#reset').click(); await frames();
  assert('Reset restores defaults', app.settings.palette === 'jade' && app.settings.rain === 0 && app.settings.distortion === 2 && app.settings.speed === 1);
  assert('No horizontal page overflow', document.documentElement.scrollWidth <= innerWidth);
  return { results, count: results.length, frameCostMs: app.frameCost, viewport: [innerWidth, innerHeight] };
})()
