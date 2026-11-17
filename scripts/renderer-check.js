(async () => {
  const { createScene } = await import('/src/scene.ts');
  const { createWaterRenderer } = await import('/src/water.ts');
  const { defaultSettings, WIDTH, HEIGHT } = await import('/src/types.ts');
  const scene = createScene();
  const water = createWaterRenderer(scene);
  const settings = { ...defaultSettings };
  const results = [];
  function assert(name, pass) { results.push({ name, passed: Boolean(pass) }); if (!pass) throw new Error(name); }
  function pixels(canvas) { return canvas.getContext('2d').getImageData(0, 0, WIDTH, HEIGHT).data; }
  function equal(a, b) { return a.length === b.length && a.every((v, i) => v === b[i]); }
  assert('Visible foreground land is excluded from water mask', scene.mask[390 * WIDTH + 80] === 0);
  const still = pixels(scene.renderObjects(0, 0));
  assert('Zero wind leaves objects fixed', equal(still, pixels(scene.renderObjects(1, 0))));
  const windy0 = pixels(scene.renderObjects(0, 1));
  assert('Wind animates within one second (not milliseconds)', !equal(windy0, pixels(scene.renderObjects(1, 1))));
  assert('Water accepts ripple', water.addRipple(320, 270, .7));
  assert('Land rejects ripple', !water.addRipple(80, 390, 1));
  assert('Out of range rejects ripple', !water.addRipple(-1, 270, 1) && !water.addRipple(640, 270, 1));
  assert('NaN coordinates reject ripple', !water.addRipple(NaN, NaN, 1));
  const objects = scene.renderObjects(1, .6);
  const render = (s = settings) => { water.render(1, s, objects); return pixels(water.canvas); };
  const base = render();
  assert('Fixed simulation time produces identical pixels', equal(base, render()));
  for (const key of ['depth', 'sky', 'reflections', 'shoreline', 'backBank', 'particles']) {
    assert(key + ' effect changes pixels independently', !equal(base, render({ ...settings, [key]: false })));
  }
  assert('Distortion slider affects reflection pixels', !equal(render({ ...settings, distortion: 0 }), render({ ...settings, distortion: 6 })));
  const paletteCounts = {};
  for (const palette of ['jade', 'golden', 'moon']) {
    const data = render({ ...settings, palette });
    const colors = new Set(); let clipped = true; let binaryAlpha = true;
    for (let p = 0; p < WIDTH * HEIGHT; p++) {
      const q = p * 4;
      if (data[q + 3]) colors.add((data[q] << 16) | (data[q + 1] << 8) | data[q + 2]);
      if (!scene.mask[p] && data[q + 3] !== 0) clipped = false;
      if (data[q + 3] !== (scene.mask[p] ? 255 : 0)) binaryAlpha = false;
    }
    paletteCounts[palette] = colors.size;
    assert(palette + ' stays within ten colors', colors.size > 1 && colors.size <= 10);
    assert(palette + ' is opaque inside and transparent outside mask', clipped && binaryAlpha);
  }
  for (let i = 0; i < 100; i++) water.addRipple(320, 270, 1);
  assert('Ripple storage is bounded at 32', water.rippleCount <= 32);
  for (let i = 0; i < 150; i++) water.render(1 + i / 30, { ...settings, rain: 1 }, objects);
  const rainData = pixels(water.canvas);
  assert('Heavy rain remains clipped to mask', scene.mask.every((v, i) => v || rainData[i * 4 + 3] === 0));
  return { count: results.length, results, paletteCounts };
})()
