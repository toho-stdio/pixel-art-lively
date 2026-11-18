(async () => {
  const api = window.__LIVE_ART__;
  if (!api) throw new Error('Open /direction.html before running this check');
  const results = [];
  const assert = (name, pass, detail = '') => results.push({ name, passed: Boolean(pass), ...(detail ? { detail } : {}) });
  const read = canvas => new Uint8ClampedArray(canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data);
  const same = (a, b) => a.length === b.length && a.every((value, i) => value === b[i]);
  for (const key of ['640x360', '960x540']) {
    await api.setResolution(key);
    const { scene, water } = api.layers;
    const objects = scene.renderObjects(3.25, 0.6);
    const base = { ...api.settings, paused: false, wind: 0.6, rain: 0 };
    for (const palette of ['jade', 'golden', 'moon']) {
      water.render(3.25, { ...base, palette }, objects);
      const data = read(water.canvas), colors = new Set(); let maskValid = true;
      for (let i = 0; i < scene.mask.length; i++) {
        const p = i * 4;
        if (scene.mask[i]) { colors.add(`${data[p]},${data[p + 1]},${data[p + 2]}`); if (data[p + 3] !== 255) maskValid = false; }
        else if (data[p + 3] !== 0) maskValid = false;
      }
      assert(`${key}/${palette}: exactly ten indexed colors`, colors.size === 10, `${colors.size} colors`);
      assert(`${key}/${palette}: opaque water and transparent land`, maskValid);
    }
    const stable = { ...base, distortion: 0, paused: false };
    water.render(3.25, stable, objects); const first = read(water.canvas);
    water.render(3.25, stable, objects); const repeated = read(water.canvas);
    assert(`${key}: fixed simulation time is byte-stable`, same(first, repeated));
    const displaced = { ...stable, distortion: 4 };
    water.render(3.25, displaced, objects);
    assert(`${key}: distortion changes reflected water`, !same(first, read(water.canvas)));
    for (const effect of ['depth', 'sky', 'reflections', 'shoreline', 'backBank', 'particles']) {
      water.render(3.25, { ...base, [effect]: true }, objects); const on = read(water.canvas);
      water.render(3.25, { ...base, [effect]: false }, objects); const off = read(water.canvas);
      assert(`${key}: ${effect} remains independently meaningful`, !same(on, off));
    }
    const waterPoint = scene.mask.findIndex(value => value === 1);
    const landPoint = scene.mask.findIndex(value => value === 0);
    const wx = waterPoint % scene.camera.width, wy = Math.floor(waterPoint / scene.camera.width);
    const lx = landPoint % scene.camera.width, ly = Math.floor(landPoint / scene.camera.width);
    assert(`${key}: water accepts and land rejects ripple`, water.addRipple(wx, wy, 3.25) && !water.addRipple(lx, ly, 3.25));
    for (let i = 0; i < 40; i++) water.addRipple(wx, wy, 3.25);
    assert(`${key}: ripple storage stays capped`, water.rippleCount === 32, `${water.rippleCount}`);
  }
  await api.setResolution('640x360');
  return { count: results.length, passed: results.filter(r => r.passed).length, failed: results.filter(r => !r.passed).length, results };
})()
