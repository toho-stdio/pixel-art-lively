(async () => {
  const api = window.__LIVE_ART__;
  if (!api) throw new Error('Open /direction.html before running the polish integration check');
  const initial = { resolution: api.resolution, time: api.time, settings: api.settings };
  const results = [];
  const assert = (name, pass, detail = '') => results.push({ name, passed: Boolean(pass), ...(detail ? { detail } : {}) });
  assert('review route exposes selectors/effects (clean mode is off)', api.comparison?.enabled && !api.comparison.clean && !document.body.classList.contains('clean-mode'));
  const bytes = canvas => new Uint8ClampedArray(canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data);
  const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  const imageMask = async (key, name, scene) => {
    const response = await fetch(`/art-direction/${key}/${name}-motion-mask.png`);
    if (!response.ok) throw new Error(`Missing ${name} motion mask for ${key}`);
    const bitmap = await createImageBitmap(await response.blob());
    const c = document.createElement('canvas'); c.width = scene.camera.width; c.height = scene.camera.height;
    const cx = c.getContext('2d', { willReadFrequently: true }); cx.drawImage(bitmap, 0, 0); bitmap.close();
    const rgba = cx.getImageData(0, 0, c.width, c.height).data;
    return Uint8Array.from({ length: c.width * c.height }, (_, i) => rgba[i * 4] === 255 ? 1 : 0);
  };
  for (const key of ['640x360', '960x540']) {
    await api.setResolution(key);
    const { scene, water } = api.layers, count = scene.camera.width * scene.camera.height;
    const staticGround=bytes(scene.ground),staticForeground=bytes(scene.foreground);
    const still = bytes(scene.renderObjects(0, 0)), zeroLater = bytes(scene.renderObjects(4, 0));
    assert(`${key}: zero-wind object identity`, same(still, zeroLater));
    const masks = await Promise.all(['canopy', 'roots', 'lotus', 'lotus-stems', 'lotus-leaves', 'aerial-root-strands'].map(name => imageMask(key, name, scene)));
    const [canopy, roots, lotus, lotusStems, lotusLeaves, strands] = masks;
    const movingMasks=[canopy,lotus,lotusStems,lotusLeaves,strands];
    // The live renderer inverse-samples canopy/strands and forward-rasterizes lotus. Use
    // source+destination bounds from the actual maximum rounded displacement equations.
    const makeSweeps=wind=>{
      const scale=Math.sqrt(Math.max(0,Math.min(1.5,wind))/1.5)*1.1, amplitude=[3.4,5.0,4.6,4.4,1.4].map(a=>a*scale);
      const envelopes=movingMasks.map((mask,m)=>{const env=new Uint8Array(count),rx=Math.floor(amplitude[m]+0.5),ry=m===0?Math.floor(amplitude[m]*0.24+0.5):0;
        for(let i=0;i<count;i++)if(mask[i]){const x=i%scene.camera.width,y=Math.floor(i/scene.camera.width);for(let dy=-ry;dy<=ry;dy++)for(let dx=-rx;dx<=rx;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&xx<scene.camera.width&&yy>=0&&yy<scene.camera.height)env[yy*scene.camera.width+xx]=1;}}
        return env;});
      const union=new Uint8Array(count);for(const env of envelopes)for(let i=0;i<count;i++)if(env[i])union[i]=1;return {envelopes,union};
    };
    const defaultSweeps=makeSweeps(0.6),maxSweeps=makeSweeps(1.5),motionEnvelope=maxSweeps.union;
    const structuralRegions=[[55,145,150,220,'banyan trunk/buttress'],[400,110,540,145,'communal-house masonry'],[390,150,410,205,'left stone-step edge'],[535,150,550,205,'right stone-step edge'],[0,300,640,350,'front stone shore']];
    const structuralSamples=structuralRegions.map(([x0,y0,x1,y1,label])=>{const candidates=[];
      for(let y=Math.floor(y0*scene.camera.height/360);y<Math.ceil(y1*scene.camera.height/360);y++)for(let x=Math.floor(x0*scene.camera.width/640);x<Math.ceil(x1*scene.camera.width/640);x++){const i=y*scene.camera.width+x;if(!motionEnvelope[i]&&still[i*4+3]===255)candidates.push(i);}
      return {label,samples:candidates.filter((_,i)=>i%Math.max(1,Math.floor(candidates.length/24))===0).slice(0,24)};});
    const structuralChanges=(reference,wind)=>{let changes=0;for(let step=1;step<=200;step++){const frame=bytes(scene.renderObjects(step/10,wind));for(const region of structuralSamples)for(const i of region.samples){const p=i*4;if(reference[p]!==frame[p]||reference[p+1]!==frame[p+1]||reference[p+2]!==frame[p+2]||reference[p+3]!==frame[p+3])changes++;}}return changes;};
    assert(`${key}: structural material samples exist outside flexible/sweep regions`,structuralSamples.every(r=>r.samples.length>=8),structuralSamples.map(r=>`${r.label}:${r.samples.length}`).join('/'));
    const stepSamples=[];
    for(let y=Math.floor(205*scene.camera.height/360);y<Math.ceil(230*scene.camera.height/360);y++)for(let x=Math.floor(395*scene.camera.width/640);x<Math.ceil(545*scene.camera.width/640);x++){const i=y*scene.camera.width+x;if(staticGround[i*4+3]===255)stepSamples.push(i);}
    assert(`${key}: lower stone-step region is checked through immutable static scene layers`,stepSamples.length>=8&&stepSamples.every(i=>staticGround[i*4+3]===255)&&same(staticGround,bytes(scene.ground))&&same(staticForeground,bytes(scene.foreground)),`${stepSamples.length} opaque static-ground samples; ground and foreground unchanged`);
    assert(`${key}: heavy-root sentinel has no flexible pixels`, roots.every(v => v === 0));
    assert(`${key}: selected canopy / lotus / hanging-root materials exist`, [canopy, lotus, strands].every(m => m.some(v => v === 1)));
    const lotusStill = bytes(scene.renderObjects(0, 0.6));
    const lotusTilt = bytes(scene.renderObjects(3.25, 0.6));
    let lotusPivotPixels = 0, lotusPivotChanges = 0, lotusDistalPixels = 0, lotusDistalChanges = 0;
    for (let i = 0; i < count; i++) {
      if (!lotusStems[i]) continue;
      const x = i % scene.camera.width, y = Math.floor(i / scene.camera.width);
      const pivotY = Math.round((x < scene.camera.width * 0.24 ? 283 : 282) * scene.camera.height / 360);
      const p = i * 4;
      const changed = lotusStill[p] !== lotusTilt[p] || lotusStill[p + 1] !== lotusTilt[p + 1] || lotusStill[p + 2] !== lotusTilt[p + 2] || lotusStill[p + 3] !== lotusTilt[p + 3];
      if (y === Math.round(291 * scene.camera.height / 360)) { lotusPivotPixels++; if (changed) lotusPivotChanges++; }
      if (y < Math.round(291 * scene.camera.height / 360)) { lotusDistalPixels++; if (changed) lotusDistalChanges++; }
    }
    assert(`${key}: lotus lower stem attachment row is pinned and upper stem rows flex`, lotusPivotPixels > 0 && lotusPivotChanges === 0 && lotusDistalPixels > 0 && lotusDistalChanges > 0, `stem pivot row ${lotusPivotChanges}/${lotusPivotPixels} changed; upper stem ${lotusDistalChanges}/${lotusDistalPixels} changed at t=3.25`);
    const flexible = movingMasks;
    const moving = [false, false, false, false, false];
    const reference = bytes(scene.renderObjects(0, 0.6));
    let heavyRootChanged = 0, outsideEligibleChanged = 0;
    for (let step = 1; step <= 200; step++) {
      const frame = bytes(scene.renderObjects(step / 10, 0.6));
      for (let i = 0; i < count; i++) {
        const p = i * 4;
        if (reference[p] === frame[p] && reference[p + 1] === frame[p + 1] && reference[p + 2] === frame[p + 2] && reference[p + 3] === frame[p + 3]) continue;
        let eligible = false;
        for (let m = 0; m < flexible.length; m++) if (defaultSweeps.envelopes[m][i]) { moving[m] = true; eligible = true; }
        if (roots[i]) heavyRootChanged++;
        if (!motionEnvelope[i]) outsideEligibleChanged++;
      }
    }
    assert(`${key}: slow selected canopy, flower, stem, leaves and true strands animate`, moving.every(Boolean), moving.map(Boolean).join('/'));
    assert(`${key}: default-wind output remains inside per-material source/destination sweeps`, outsideEligibleChanged===0, `${outsideEligibleChanged} changed pixels outside horizontal sweep envelopes`);
    const fixedSampleResult=structuralChanges(reference,0.6);
    assert(`${key}: heavy-root sentinel empty and default-wind structural samples stay fixed`,heavyRootChanged===0&&!roots.some(Boolean)&&fixedSampleResult===0,`${heavyRootChanged} heavy-root changes; ${fixedSampleResult} structural sample-times changed`);
    let maxWindOutside=0; const maxReference=bytes(scene.renderObjects(0,1.5));
    for(let step=1;step<=200;step++) {
      const frame=bytes(scene.renderObjects(step/10,1.5));
      for(let i=0;i<count;i++) { const p=i*4; if(maxReference[p]!==frame[p]||maxReference[p+1]!==frame[p+1]||maxReference[p+2]!==frame[p+2]||maxReference[p+3]!==frame[p+3]) if(!motionEnvelope[i]) maxWindOutside++; }
    }
    assert(`${key}: maximum-wind full 20s sweep remains inside material envelopes`,maxWindOutside===0,`${maxWindOutside} changes outside bounded sweeps`);
    const maxFixedSamples=structuralChanges(maxReference,1.5);
    assert(`${key}: maximum-wind structural material samples stay fixed`,maxFixedSamples===0,`${maxFixedSamples} structural sample-times changed`);

    const movingObjects = scene.renderObjects(3.25, 0.6);
    for (const palette of ['jade', 'golden', 'moon']) {
      const settings = { ...api.settings, palette, paused: false, wind: 0.6, rain: 0 };
      water.render(3.25, settings, movingObjects); const first = bytes(water.canvas);
      water.render(3.25, settings, movingObjects); const repeat = bytes(water.canvas);
      let validMask = true; const used = new Set();
      for (let i = 0; i < scene.mask.length; i++) {
        const p = i * 4, rgb = `${first[p]},${first[p + 1]},${first[p + 2]}`;
        if (scene.mask[i]) { used.add(rgb); if (first[p + 3] !== 255) validMask = false; }
        else if (first[p + 3] !== 0) validMask = false;
      }
      assert(`${key}/${palette}: water exact ten-color palette`, used.size === 10, `${used.size} RGB values used`);
      assert(`${key}/${palette}: binary-mask alpha is exact`, validMask);
      assert(`${key}/${palette}: fixed-time renderer is byte deterministic`, same(first, repeat));
    }
    const stable = { ...api.settings, wind: 0, distortion: 1, rain: 0, paused: false };
    const objects = scene.renderObjects(3.25, 0);
    for (const effect of ['depth', 'sky', 'reflections', 'shoreline', 'backBank', 'particles']) {
      water.render(3.25, { ...stable, [effect]: true }, objects); const on = bytes(water.canvas);
      water.render(3.25, { ...stable, [effect]: false }, objects); const off = bytes(water.canvas);
      assert(`${key}: ${effect} effect is independently observable`, !same(on, off));
    }
    const point = scene.mask.findIndex(v => v === 1), px = point % scene.camera.width, py = Math.floor(point / scene.camera.width);
    const land = scene.mask.findIndex(v => v === 0), lx = land % scene.camera.width, ly = Math.floor(land / scene.camera.width);
    water.addRipple(px, py, 3.25);
    assert(`${key}: trusted-input candidate creates water-only ripple`, water.rippleCount === 1 && !water.addRipple(lx, ly, 3.25));
    for (let i = 0; i < 64; i++) water.addRipple(px, py, 3.25);
    assert(`${key}: ripple pool is bounded`, water.rippleCount <= 32, `${water.rippleCount}`);
  }
  assert('six native water-effect toggles available (ambient ripple is separate)', document.querySelectorAll('.effect-list input[type=checkbox]').length === 6);
  for (const effect of ['depth', 'sky', 'reflections', 'shoreline', 'backBank', 'particles']) {
    const input = document.querySelector(`#effect-${effect}`), before = api.settings[effect];
    input.click(); const changed = api.settings[effect] === !before;
    input.click();
    assert(`UI ${effect} toggle updates its own renderer setting`, changed && api.settings[effect] === before);
  }
  assert('three water-only palettes available', document.querySelectorAll('#palette option').length === 3);
  const palette = document.querySelector('#palette'), previousPalette = api.settings.palette;
  palette.value = previousPalette === 'jade' ? 'golden' : 'jade'; palette.dispatchEvent(new Event('change', { bubbles: true }));
  const paletteUpdates = api.settings.palette === palette.value;
  palette.value = previousPalette; palette.dispatchEvent(new Event('change', { bubbles: true }));
  assert('palette control updates water palette', paletteUpdates && api.settings.palette === previousPalette);
  for (const [id, value] of [['wind', '0.8'], ['speed', '1.25'], ['rain', '0.5']]) {
    const input = document.querySelector(`#${id}`), previous = input.value;
    input.value = value; input.dispatchEvent(new Event('input', { bubbles: true }));
    const updated = api.settings[id] === Number(value);
    input.value = previous; input.dispatchEvent(new Event('input', { bubbles: true }));
    assert(`${id} control updates simulation setting`, updated && api.settings[id] === Number(previous));
  }
  assert('fullscreen and PNG export controls available', !!document.querySelector('#fullscreen') && !!document.querySelector('#export'));
  await api.setResolution(initial.resolution);
  api.freeze(initial.time);
  if (!initial.settings.paused) document.querySelector('#pause').click();
  return { count: results.length, passed: results.filter(r => r.passed).length, failed: results.filter(r => !r.passed).length, results };
})()
