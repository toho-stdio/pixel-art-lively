(async () => {
  const api = window.__LIVE_ART__;
  if (!api) throw new Error('Open /direction.html?compare=1 before this check');
  const { lotusRigSource, lotusReflectionSourceY } = await import('/src/direction/lotus-rig.ts');
  const out = [];
  const assert = (name, pass, detail = '') => out.push({ name, passed: !!pass, ...(detail ? { detail } : {}) });
  const bytes = canvas => new Uint8ClampedArray(canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, canvas.width, canvas.height).data);
  const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  const diffCount = (a, b) => { let n = 0; for (let i=0;i<a.length;i++) if(a[i]!==b[i]) n++; return n; };
  const ready = async () => { await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); };
  const sha256 = async response => [...new Uint8Array(await crypto.subtle.digest('SHA-256', await response.arrayBuffer()))].map(byte => byte.toString(16).padStart(2, '0')).join('');
  const baselineArtwork = {
    '640x360': ['526e42617d04d976501e75d4033ff492de378bbc12dc7f9948be8814e0a9f1f9', '0353ee11459578565638920668682d43aec41da6910bc550550efb3adc1b3f15', '5e666ed4391b9b51a28997ea6f97bcffdc3c69dca503f947607ec7fefde07d18'],
    '960x540': ['497bbdba816f315edbdf8e0e55ce2309b21efcc3e5e8e045a7ec004c622f345b', '75a0aad17349e16bb3b4372de36e4bda166228e6afafeae3e5a657a5478a0619', 'bf831f16480442acd7cce02c85a90276ed60aee1beebffd61f69c68a0eb4446a'],
  };
  const loadMask = async (key, filename, scene) => {
    const response = await fetch(`/art-direction/${key}/${filename}`);
    assert(`${key}: ${filename} served`, response.ok);
    if (!response.ok) return new Uint8Array(scene.camera.width * scene.camera.height);
    const image = await createImageBitmap(await response.blob());
    const native = document.createElement('canvas'); native.width = image.width; native.height = image.height;
    const nativeCtx = native.getContext('2d', { willReadFrequently: true }); nativeCtx.drawImage(image, 0, 0); image.close();
    const nativeRgba = nativeCtx.getImageData(0, 0, native.width, native.height).data;
    const nativeDimensionsMatch = native.width === scene.camera.width && native.height === scene.camera.height;
    const binaryOpaqueGray = nativeRgba.every((value, i) => i % 4 === 3 ? value === 255 : (value === 0 || value === 255) && value === nativeRgba[i - (i % 4)]);
    assert(`${key}: ${filename} retains exact native dimensions`, nativeDimensionsMatch, `${native.width}x${native.height} vs ${scene.camera.width}x${scene.camera.height}`);
    assert(`${key}: ${filename} is opaque binary grayscale`, binaryOpaqueGray);
    const c = document.createElement('canvas'); c.width = scene.camera.width; c.height = scene.camera.height;
    const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.drawImage(native, 0, 0, c.width, c.height);
    const rgba = ctx.getImageData(0, 0, c.width, c.height).data;
    return Uint8Array.from({ length: c.width*c.height }, (_, i) => rgba[i*4] === 255 ? 1 : 0);
  };
  const canvas = api.layers.canvas;
  const initial = { resolution: api.resolution, split: api.comparison.split, time: api.time, settings: api.settings };
  assert('record comparison route active', api.comparison.enabled && !api.comparison.clean, JSON.stringify(api.comparison));
  assert('Before/After labels and accessible wipe slider exist', !!document.querySelector('.comparison-before') && !!document.querySelector('.comparison-after') && !!document.querySelector('#comparison-slider'));
  assert('labels accurately describe approved static Before and lively After', document.querySelector('.comparison-before')?.textContent.trim() === 'Before' && document.querySelector('.comparison-after')?.textContent.trim() === 'After' && /Before.*After.*live/i.test(document.querySelector('#mode-description')?.textContent ?? ''));
  assert('PNG export is described as art output, separate from browser wipe UI', !!document.querySelector('#export-note') && !document.querySelector('#direction-canvas').contains(document.querySelector('.comparison-ui')));
  assert('comparison disables mode switch (prevents semantic substitution)', document.querySelector('#mode-static').disabled && document.querySelector('#mode-live').disabled);
  assert('no fake record/encode/start-video button is presented', ![...document.querySelectorAll('button')].some(x => /^(record|encode|start recording|start video)$/i.test(`${x.textContent} ${x.getAttribute('aria-label')||''}`.trim())));
  const originalOnce = bytes(api.layers.scene.original);
  const splitX = Math.round(canvas.width * api.comparison.split / 100);
  const beforeFrame = bytes(canvas);
  api.freeze(3.25); await ready();
  const time3 = bytes(canvas);
  api.freeze(11.75); await ready();
  const time11 = bytes(canvas);
  let beforeStillDiff = 0, afterMotionDiff = 0;
  for (let y=0;y<canvas.height;y++) for(let x=0;x<canvas.width;x++) {
    const p=(y*canvas.width+x)*4;
    for(let c=0;c<4;c++) { if(x<splitX && beforeFrame[p+c]!==time11[p+c]) beforeStillDiff++; if(x>splitX && time3[p+c]!==time11[p+c]) afterMotionDiff++; }
  }
  assert('approved Before region remains static across simulation time', beforeStillDiff === 0, `${beforeStillDiff} changed bytes left of split`);
  assert('current lively After scene changes over time', afterMotionDiff > 0, `${afterMotionDiff} changed bytes right of split`);
  assert('approved original source canvas is immutable', same(originalOnce, bytes(api.layers.scene.original)));

  for (const grid of ['640x360', '960x540']) {
    await api.setResolution(grid); await ready();
    const { scene, water, canvas: view } = api.layers;
    const W = scene.camera.width, H = scene.camera.height, n = W*H;
    const artworkHashes = await Promise.all(['original.png', 'environment.png', 'mask.png'].map(async name => {
      const response = await fetch(`/art-direction/${grid}/${name}`);
      return response.ok ? sha256(response) : `missing:${name}`;
    }));
    assert(`${grid}: approved original/environment/water-mask SHA-256 match frozen 3047513`, artworkHashes.every((hash, i) => hash === baselineArtwork[grid][i]), artworkHashes.join('/'));
    assert(`${grid}: exact native comparison dimensions`, view.width === W && view.height === H && W/H === 16/9);
    const fixedOriginal = bytes(scene.original), fixedGround = bytes(scene.ground), fixedForeground = bytes(scene.foreground);
    const defaultLive = bytes(scene.renderObjects(0, 0.6));
    const zeroA = bytes(scene.renderObjects(0, 0)); const zeroB = bytes(scene.renderObjects(20, 0));
    assert(`${grid}: zero wind yields exact original object canvas at t=0..20`, same(zeroA, zeroB));
    assert(`${grid}: default wind produces posed objects`, !same(defaultLive, zeroA));
    const originalAfter = bytes(scene.original);
    assert(`${grid}: baseline original canvas survives resolution switching unchanged`, same(fixedOriginal, originalAfter));
    const [head, stem, leaf, canopy, strand, roots] = await Promise.all([
      loadMask(grid, 'lotus-motion-mask.png', scene), loadMask(grid, 'lotus-stems-motion-mask.png', scene),
      loadMask(grid, 'lotus-leaves-motion-mask.png', scene), loadMask(grid, 'canopy-motion-mask.png', scene),
      loadMask(grid, 'aerial-root-strands-motion-mask.png', scene), loadMask(grid, 'roots-motion-mask.png', scene),
    ]);
    const counts = [head, stem, leaf].map(m => m.reduce((a,b)=>a+b,0));
    assert(`${grid}: nonempty separate flower/bud, stem, and leaf/pad masks`, counts.every(v=>v>0), counts.join('/'));
    assert(`${grid}: selected part masks do not overlap`, !head.some((v,i)=>v&&(stem[i]||leaf[i])) && !stem.some((v,i)=>v&&leaf[i]));
    assert(`${grid}: canopy and selected aerial-strand masks are nonempty`, canopy.some(Boolean) && strand.some(Boolean));
    assert(`${grid}: heavy buttress-root eligibility is empty`, roots.every(v=>v===0));
    const articulated = [head, stem, leaf];
    const sweepMasks=[canopy,head,stem,leaf,strand];
    // Scene motion is inverse-sampled for canopy/strands and forward-rasterized for lotus.
    // These bounds are derived from the rounded maximum field displacement in motion.ts and
    // lotus-rig.ts, and cover both source and destination pixels at the requested wind.
    const makeSweeps=wind=>{
      const scale=Math.sqrt(Math.max(0,Math.min(1.5,wind))/1.5)*1.1;
      const amplitudes=[3.4,5.0,4.6,4.4,1.4].map(a=>a*scale);
      const envelopes=sweepMasks.map((mask,m)=>{
        const env=new Uint8Array(n),rx=Math.floor(amplitudes[m]+0.5),ry=m===0?Math.floor(amplitudes[m]*0.24+0.5):0;
        for(let p=0;p<n;p++)if(mask[p]){const x=p%W,y=Math.floor(p/W);for(let dy=-ry;dy<=ry;dy++)for(let dx=-rx;dx<=rx;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&xx<W&&yy>=0&&yy<H)env[yy*W+xx]=1;}}
        return env;
      });
      const union=new Uint8Array(n);for(const env of envelopes)for(let p=0;p<n;p++)if(env[p])union[p]=1;
      return {envelopes,union};
    };
    const defaultSweeps=makeSweeps(0.6), maxSweeps=makeSweeps(1.5), motionEnvelope=maxSweeps.union;
    const source = bytes(scene.renderObjects(0, 0.6));
    let selectedDifferences = [0,0,0], pinnedStemPixels = 0, pinnedStemChanges = 0;
    const pinnedRows = new Set([Math.round(291 * H / 360), Math.round(292 * H / 360)]);
    for (let p = 0; p < n; p++) if (stem[p] && pinnedRows.has(Math.floor(p / W))) pinnedStemPixels++;
    for (let t=0.1;t<=20.0001;t+=0.1) {
      const frame = bytes(scene.renderObjects(t, 0.6));
      for (let p=0;p<n;p++) {
        const i=p*4;
        if(source[i]===frame[i]&&source[i+1]===frame[i+1]&&source[i+2]===frame[i+2]&&source[i+3]===frame[i+3]) continue;
        for(let part=0;part<articulated.length;part++) if(defaultSweeps.envelopes[part+1][p]) selectedDifferences[part]++;
        if (stem[p] && pinnedRows.has(Math.floor(p / W))) pinnedStemChanges++;
      }
    }
    const partMotionMinimums = W === 640 ? [10000, 500, 5000] : [25000, 1000, 10000];
    assert(`${grid}: head, stem, and leaves each exceed a minimum real movement signal over 20s`, selectedDifferences.every((x, i) => x >= partMotionMinimums[i]), `${selectedDifferences.join('/')} (minimum ${partMotionMinimums.join('/')})`);
    assert(`${grid}: lower stem anchors remain pixel-identical through the full default-wind scan`, pinnedStemPixels > 0 && pinnedStemChanges === 0, `${pinnedStemChanges} changed among ${pinnedStemPixels} anchored stem pixels`);
    let defaultOutside=0; const defaultRef=bytes(scene.renderObjects(0,0.6));
    for(let step=1;step<=200;step++) {
      const frame=bytes(scene.renderObjects(step/10,0.6));
      for(let p=0;p<n;p++) { const i=p*4; if((defaultRef[i]!==frame[i]||defaultRef[i+1]!==frame[i+1]||defaultRef[i+2]!==frame[i+2]||defaultRef[i+3]!==frame[i+3])&&!motionEnvelope[p]) defaultOutside++; }
    }
    assert(`${grid}: default-wind 20s changes fit source plus destination sweeps`,defaultOutside===0,`${defaultOutside} changed pixels outside authored horizontal envelopes`);
    const structuralRegions=[[55,145,150,220,'banyan trunk/buttress'],[400,110,540,145,'communal-house masonry'],[390,150,410,205,'left stone-step edge'],[535,150,550,205,'right stone-step edge'],[0,300,640,350,'front stone shore']];
    const structuralSamples=structuralRegions.map(([x0,y0,x1,y1,label])=>{
      const candidates=[];
      for(let y=Math.floor(y0*H/360);y<Math.ceil(y1*H/360);y++)for(let x=Math.floor(x0*W/640);x<Math.ceil(x1*W/640);x++){const p=y*W+x;if(!motionEnvelope[p]&&source[p*4+3]===255)candidates.push(p);}
      return {label,samples:candidates.filter((_,i)=>i%Math.max(1,Math.floor(candidates.length/24))===0).slice(0,24)};
    });
    assert(`${grid}: semantic structural samples exist outside flexible/sweep regions`,structuralSamples.every(r=>r.samples.length>=8),structuralSamples.map(r=>`${r.label}:${r.samples.length}`).join('/'));
    const lowerStepRegion=[395,205,545,230], groundStepBytes=fixedGround, foregroundStepBytes=fixedForeground, stepSamples=[];
    for(let y=Math.floor(lowerStepRegion[1]*H/360);y<Math.ceil(lowerStepRegion[3]*H/360);y++)for(let x=Math.floor(lowerStepRegion[0]*W/640);x<Math.ceil(lowerStepRegion[2]*W/640);x++){const p=y*W+x;if(groundStepBytes[p*4+3]===255)stepSamples.push(p);}
    assert(`${grid}: lower stone-step region is covered by immutable static ground/foreground layers`,stepSamples.length>=8&&stepSamples.every(p=>groundStepBytes[p*4+3]===255)&&same(fixedGround,bytes(scene.ground))&&same(fixedForeground,bytes(scene.foreground)),`${stepSamples.length} opaque static-ground samples; both static layers byte-identical`);
    for(const [wind,label,reference] of [[0.6,'default',source],[1.5,'maximum',bytes(scene.renderObjects(0,1.5))]]){
      let fixedChanges=0;
      for(let step=1;step<=200;step++){const frame=bytes(scene.renderObjects(step/10,wind));for(const region of structuralSamples)for(const p of region.samples){const i=p*4;if(reference[i]!==frame[i]||reference[i+1]!==frame[i+1]||reference[i+2]!==frame[i+2]||reference[i+3]!==frame[i+3])fixedChanges++;}}
      assert(`${grid}: ${label} wind keeps sampled structural material stationary`,fixedChanges===0,`${fixedChanges} changed sample-times`);
    }
    assert(`${grid}: source originals and static ground/shore buffers stay immutable`, same(fixedOriginal,bytes(scene.original)) && same(fixedGround,bytes(scene.ground)) && same(fixedForeground,bytes(scene.foreground)));
    let maxOutside=0; const maxRef=bytes(scene.renderObjects(0,1.5));
    for(let step=1;step<=200;step++) {
      const frame=bytes(scene.renderObjects(step/10,1.5));
      for(let p=0;p<n;p++) { const i=p*4; if((maxRef[i]!==frame[i]||maxRef[i+1]!==frame[i+1]||maxRef[i+2]!==frame[i+2]||maxRef[i+3]!==frame[i+3])&&!motionEnvelope[p]) maxOutside++; }
    }
    assert(`${grid}: maximum-wind 20s changes fit exact per-material sweep envelopes`,maxOutside===0,`${maxOutside} changed pixels outside authored horizontal envelopes`);
    // Recreate exact live renderer output independently and verify the wipe picks the correct source on either side.
    const t = 3.25, settings = { ...api.settings, wind:0.6, paused:false, rain:0 };
    const liveObjects = scene.renderObjects(t, settings.wind);
    const reflectionObjects = scene.renderReflectionObjects(t, settings.wind);
    water.render(t, settings, reflectionObjects);
    const expectedLive = document.createElement('canvas'); expectedLive.width=W; expectedLive.height=H;
    const ec=expectedLive.getContext('2d',{alpha:false}); ec.imageSmoothingEnabled=false;
    ec.drawImage(scene.ground,0,0); ec.drawImage(water.canvas,0,0); ec.drawImage(liveObjects,0,0); ec.drawImage(scene.foreground,0,0);
    const expectedLiveBytes=bytes(expectedLive), originalBytes=bytes(scene.original);
    for(const split of [0,25,50,75,100]) {
      api.setSplit(split); api.freeze(t); await ready();
      const got=bytes(view), edge=Math.round(W*split/100); let wrong=0, compared=0;
      for(let y=0;y<H;y++) for(let x=0;x<W;x++) {
        if(Math.abs(x-edge)<=1) continue; // ignore divider anti-alias/chrome only
        const p=(y*W+x)*4, expected=x<edge?originalBytes:expectedLiveBytes;
        for(let c=0;c<4;c++) if(got[p+c]!==expected[p+c]) { wrong++; break; }
        compared++;
      }
      assert(`${grid}: split ${split} is registered original-left/live-right (no scale/crop/flip)`, wrong===0, `${wrong} mismatched pixels of ${compared}`);
      assert(`${grid}: split ${split} persists as an honest shareable URL parameter`, new URL(location.href).searchParams.get('split') === String(split));
    }
    const liveSourceBytes = bytes(liveObjects), reflectionSourceBytes = bytes(reflectionObjects);
    let xMin = W, xMax = -1;
    for (const part of articulated) for (let p = 0; p < n; p++) if (part[p]) { const x = p % W; xMin = Math.min(xMin, x); xMax = Math.max(xMax, x); }
    const proxyY0 = Math.floor(H * 0.005), proxyY1 = Math.ceil(H * 0.15);
    let proxyChanged = 0, proxyOutside = 0;
    for (let p = 0; p < n; p++) {
      const i = p * 4;
      if (liveSourceBytes[i] === reflectionSourceBytes[i] && liveSourceBytes[i+1] === reflectionSourceBytes[i+1] && liveSourceBytes[i+2] === reflectionSourceBytes[i+2] && liveSourceBytes[i+3] === reflectionSourceBytes[i+3]) continue;
      proxyChanged++;
      const x = p % W, y = Math.floor(p / W);
      if (x < xMin - 2 || x > xMax + 2 || y < proxyY0 || y >= proxyY1) proxyOutside++;
    }
    assert(`${grid}: live reflection proxy changes only the lotus-x projected rear-plane source patch`, proxyChanged > 0 && proxyOutside === 0, `${proxyChanged} changed source pixels; ${proxyOutside} outside x=${xMin}..${xMax}, y=${proxyY0}..${proxyY1-1}`);
    const liveImage = liveObjects.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data;
    const reflectionImage = reflectionObjects.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data;
    const projectedParts = articulated.map((partMask, partIndex) => {
      const material = ['lotus', 'lotus-stems', 'lotus-leaves'][partIndex];
      let expected = 0, mismatches = 0;
      for (let p = 0; p < n; p++) if (partMask[p]) {
        const x = p % W, y = Math.floor(p / W), pose = lotusRigSource(material === 'lotus' ? 'flower' : material === 'lotus-stems' ? 'stem' : 'leaf', x, y, W, H, t, settings.wind);
        const dx = pose.x, dy = y, anchorY = Math.round(H * (dx < W * 0.24 ? 292 : 291) / 360);
        const sy = lotusReflectionSourceY(dy, anchorY, Math.round(198 * H / 360), H);
        if (dx < 0 || dx >= W || sy < 0 || sy >= H) continue;
        expected++;
        const reflected = (sy * W + dx) * 4, visible = (dy * W + dx) * 4;
        if (reflectionImage[reflected] !== liveImage[visible] || reflectionImage[reflected + 1] !== liveImage[visible + 1] || reflectionImage[reflected + 2] !== liveImage[visible + 2] || reflectionImage[reflected + 3] !== liveImage[visible + 3]) mismatches++;
      }
      return { expected, mismatches };
    });
    assert(`${grid}: projected flower, stem, and leaf samples exactly match their current posed visible pixels`, projectedParts.every(x => x.expected > 0 && x.mismatches === 0), JSON.stringify(projectedParts));
    const posedWater = bytes(water.canvas);
    water.render(t, settings, liveObjects); const unposedWater = bytes(water.canvas);
    let changedWaterPixels = 0, changedOutsideMask = 0, changedOutsideLotusX = 0;
    for (let p = 0; p < n; p++) {
      const i = p * 4;
      if (posedWater[i] === unposedWater[i] && posedWater[i+1] === unposedWater[i+1] && posedWater[i+2] === unposedWater[i+2] && posedWater[i+3] === unposedWater[i+3]) continue;
      changedWaterPixels++;
      const x = p % W;
      if (!scene.mask[p]) changedOutsideMask++;
      if (x < xMin - 12 || x > xMax + 12) changedOutsideLotusX++;
    }
    assert(`${grid}: changing only the posed lotus source changes masked water within its registered x neighborhood`, changedWaterPixels > 0 && changedOutsideMask === 0 && changedOutsideLotusX === 0, `${changedWaterPixels} water pixels; ${changedOutsideMask} off-mask; ${changedOutsideLotusX} outside x=${xMin-12}..${xMax+12}`);
    api.setSplit(50);
  }
  await api.setResolution(initial.resolution);
  for (const key of ['wind', 'distortion', 'speed', 'rain']) {
    const input = document.querySelector(`#${key}`); input.value = String(initial.settings[key]); input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  const palette = document.querySelector('#palette'); palette.value = initial.settings.palette; palette.dispatchEvent(new Event('change', { bubbles: true }));
  for (const effect of ['depth', 'sky', 'reflections', 'shoreline', 'backBank', 'particles']) {
    const input = document.querySelector(`#effect-${effect}`); input.checked = initial.settings[effect]; input.dispatchEvent(new Event('change', { bubbles: true }));
  }
  api.setSplit(initial.split);
  api.freeze(initial.time);
  if (!initial.settings.paused) document.querySelector('#pause').click();
  return { count:out.length, passed:out.filter(x=>x.passed).length, failed:out.filter(x=>!x.passed).length, results:out };
})()