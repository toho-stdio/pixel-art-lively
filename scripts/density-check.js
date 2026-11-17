(async () => {
  const { createStudyScene } = await import('/src/study/scene.ts');
  const { createStudyWaterRenderer } = await import('/src/study/water.ts');
  const { RESOLUTIONS } = await import('/src/study/types.ts');
  const { defaultSettings } = await import('/src/types.ts');
  const results = [], metadata = [];
  const assert = (name, passed) => { results.push({ name, passed: Boolean(passed) }); if (!passed) throw new Error(name); };
  const equal = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  const pixels = c => c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const binaryAlpha = data => { for (let i = 3; i < data.length; i += 4) if (data[i] !== 0 && data[i] !== 255) return false; return true; };
  for (const r of RESOLUTIONS) {
    const scene = createStudyScene(r.width, r.height);
    const water = createStudyWaterRenderer(scene);
    const c = scene.camera;
    const project = (x, y) => ({ x: Math.round(x * c.scale + c.offsetX), y: Math.round(y * c.scale) });
    const settings = { ...defaultSettings, paused: true };
    const point = project(320, 270), land = project(80, 390);
    const label = r.key + ': ';
    assert(label + 'all native layer dimensions agree', [scene.ground, scene.foreground, water.canvas, scene.renderObjects(3.25, .6)].every(layer => layer.width === r.width && layer.height === r.height));
    assert(label + 'single uniform camera', c.scale === r.height / 400 && Math.abs(c.offsetX / c.scale - 35.5555555556) < 1e-8);
    assert(label + 'mask agrees with visible foreground land', !scene.mask[land.y * r.width + land.x]);
    assert(label + 'center water accepts ripple', water.addRipple(point.x, point.y, 2.9));
    assert(label + 'land/out-of-range reject ripple', !water.addRipple(land.x, land.y, 3.25) && !water.addRipple(-1, point.y, 3.25));
    for (const [name, layer] of [['ground', scene.ground], ['foreground', scene.foreground], ['objects', scene.renderObjects(3.25, .6)]]) assert(label + name + ' has only binary alpha', binaryAlpha(pixels(layer)));
    const still = pixels(scene.renderObjects(0, 0));
    assert(label + 'zero wind is stable', equal(still, pixels(scene.renderObjects(1, 0))));
    const wind = pixels(scene.renderObjects(0, 2));
    assert(label + 'wind changes native object pixels', !equal(wind, pixels(scene.renderObjects(1, 2))));
    const objects = scene.renderObjects(3.25, .6);
    const render = options => { water.render(3.25, options || settings, objects); return pixels(water.canvas); };
    const base = render();
    assert(label + 'held time is byte-identical', equal(base, render()));
    for (const key of ['depth', 'sky', 'reflections', 'shoreline', 'backBank', 'particles']) assert(label + key + ' independently changes output', !equal(base, render({ ...settings, [key]: false })));
    assert(label + 'distortion zero vs three differs', !equal(render({ ...settings, distortion: 0 }), render({ ...settings, distortion: 3 })));
    const colorCounts = {};
    for (const palette of ['jade', 'golden', 'moon']) {
      const data = render({ ...settings, palette }); const colors = new Set(); let exactMask = true;
      for (let p = 0; p < scene.mask.length; p++) {
        const q = p * 4;
        if (data[q + 3] !== (scene.mask[p] ? 255 : 0)) exactMask = false;
        if (data[q + 3]) colors.add(data[q] * 65536 + data[q + 1] * 256 + data[q + 2]);
      }
      colorCounts[palette] = colors.size;
      assert(label + palette + ' remains within discrete ten-color palette', colors.size > 1 && colors.size <= 10 && exactMask);
    }
    const frozen = render();
    water.render(3.251, settings, objects);
    assert(label + 'sub-step water temporal stability', equal(frozen, pixels(water.canvas)));
    for (let i = 0; i < 100; i++) water.addRipple(point.x, point.y, 3.25);
    assert(label + 'ripple storage is bounded', water.rippleCount <= 32);
    for (let i = 0; i < 45; i++) water.render(3.3 + i / 30, { ...settings, rain: 1 }, objects);
    const rain = pixels(water.canvas);
    assert(label + 'rain stays clipped', scene.mask.every((v, i) => v || rain[i * 4 + 3] === 0));
    const measurementWater = createStudyWaterRenderer(scene);
    measurementWater.render(3.25, settings, objects);
    const start = performance.now();
    for (let i = 0; i < 8; i++) measurementWater.render(3.25, settings, objects);
    metadata.push({ resolution: r.key, output: [r.width * r.scale1080, r.height * r.scale1080], meanWaterRenderMs: (performance.now() - start) / 8, colorCounts });
  }
  return { count: results.length, passed: results.every(r => r.passed), metadata, results };
})()
