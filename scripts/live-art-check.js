(async () => {
  const api = window.__LIVE_ART__;
  const results = [];
  const assert = (name, pass, detail = '') => results.push({ name, passed: Boolean(pass), ...(detail ? { detail } : {}) });
  const bytes = canvas => new Uint8ClampedArray(canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data);
  const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  const setGrid = async key => { await api.setResolution(key); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); };
  const inspectWater = (key, palette) => {
    const { scene, water } = api.layers;
    const settings = { ...api.settings, palette, paused: false, rain: 0 };
    const objects = scene.renderObjects(3.25, settings.wind);
    water.render(3.25, settings, objects);
    const data = bytes(water.canvas), colors = new Set(); let validMask = true, opaque = 0, transparent = 0;
    for (let i = 0; i < scene.mask.length; i++) {
      const a = data[i * 4 + 3];
      if (scene.mask[i]) { opaque++; if (a !== 255) validMask = false; colors.add(`${data[i*4]},${data[i*4+1]},${data[i*4+2]}`); }
      else { transparent++; if (a !== 0) validMask = false; }
    }
    return { key, colors: colors.size, validMask, opaque, transparent, bytes: data, scene, water, settings, objects };
  };
  assert('live debug API ready', !!api);
  for (const key of ['640x360', '960x540']) {
    await setGrid(key);
    const { scene, water } = api.layers;
    const meta = scene.metadata || {};
    const provenance = meta.source?.masterSha256 === 'da36518a45bea8cfb4ad4f33bd69ffce546c3a012e639047648af3c22e68028a' || meta.sourceHashes?.master === 'da36518a45bea8cfb4ad4f33bd69ffce546c3a012e639047648af3c22e68028a' || JSON.stringify(meta).includes('da36518a45bea8cfb4ad4f33bd69ffce546c3a012e639047648af3c22e68028a');
    assert(`${key} native dimensions`, scene.original.width === Number(key.split('x')[0]) && scene.original.height === Number(key.split('x')[1]));
    assert(`${key} source provenance recorded`, provenance, JSON.stringify(meta.source ?? meta.sourceHashes ?? {}));
    const waterResults = ['jade','golden','moon'].map(p => inspectWater(key, p));
    for (const q of waterResults) {
      assert(`${key} ${q.settings.palette} exactly ten used water colors`, q.colors === 10, `${q.colors} unique RGB colors`);
      assert(`${key} ${q.settings.palette} alpha exactly matches binary water mask`, q.validMask, `${q.opaque} water / ${q.transparent} land pixels`);
    }
    const settings = { ...api.settings, paused: false, rain: 0, wind: 0 };
    const zeroA = bytes(scene.renderObjects(0, 0)); const zeroB = bytes(scene.renderObjects(1, 0));
    assert(`${key} zero-wind environment stable across time`, same(zeroA, zeroB));
    const still = bytes(scene.renderObjects(0, 1.5)); const wind = bytes(scene.renderObjects(1, 1.5));
    assert(`${key} wind changes actual object/environment pixels`, !same(still, wind));
    const motionMasks = await Promise.all(['canopy','roots','lotus'].map(async name => {
      const bitmap = await createImageBitmap(await (await fetch(`/art-direction/${key}/${name}-motion-mask.png`)).blob());
      const c = document.createElement('canvas'); c.width = scene.camera.width; c.height = scene.camera.height;
      const cx = c.getContext('2d', { willReadFrequently: true }); cx.drawImage(bitmap,0,0); bitmap.close();
      const d = cx.getImageData(0,0,c.width,c.height).data; return Uint8Array.from({length:scene.camera.width*scene.camera.height},(_,i)=>d[i*4]===255?1:0);
    }));
    const changed = new Uint8Array(scene.camera.width*scene.camera.height);
    for(let i=0;i<changed.length;i++) { const p=i*4; if(still[p]!==wind[p]||still[p+1]!==wind[p+1]||still[p+2]!==wind[p+2]||still[p+3]!==wind[p+3]) changed[i]=1; }
    const perMask = motionMasks.map(mask=>{let n=0;for(let i=0;i<changed.length;i++)if(changed[i]&&mask[i])n++;return n;});
    let outsideMaskDiff=0; for(let i=0;i<changed.length;i++)if(changed[i]&&!motionMasks.some(m=>m[i]))outsideMaskDiff++;
    assert(`${key} maximum wind changes each eligible canopy/root/lotus mask`, perMask.every(n=>n>0), `${perMask.join('/')} changed pixels`);
    assert(`${key} buildings/ground/background stay fixed outside eligibility masks`, outsideMaskDiff===0, `${outsideMaskDiff} changed pixels outside masks`);
    const defaultReference = bytes(scene.renderObjects(0, 0.6));
    const defaultChanged = new Uint8Array(scene.camera.width*scene.camera.height);
    const defaultByMask = [false,false,false], firstMotionTime = [null,null,null], motionPixelTimeCounts = [0,0,0]; let defaultOutsideChanges=0, firstCommonMotionTime=null;
    for(let step=1;step<=200;step++) {
      const time=step/10, frame = bytes(scene.renderObjects(time, 0.6)), perFrameMaskChanges=[0,0,0];
      for(let i=0;i<defaultChanged.length;i++) {
        const p=i*4; if(defaultReference[p]===frame[p]&&defaultReference[p+1]===frame[p+1]&&defaultReference[p+2]===frame[p+2]&&defaultReference[p+3]===frame[p+3]) continue;
        defaultChanged[i]=1;
        let eligible=false;
        for(let m=0;m<motionMasks.length;m++) if(motionMasks[m][i]) { defaultByMask[m]=true; eligible=true; motionPixelTimeCounts[m]++; perFrameMaskChanges[m]++; if(firstMotionTime[m]===null) firstMotionTime[m]=time; }
        if(!eligible) defaultOutsideChanges++;
      }
      if(firstCommonMotionTime===null&&perFrameMaskChanges.every(n=>n>0)) firstCommonMotionTime=time;
    }
    assert(`${key} default wind 0.6 animates canopy/root/lotus during t=0..20s`, defaultByMask.every(Boolean), `pixel-time changes ${motionPixelTimeCounts.join('/')}; first per-mask changes t=${firstMotionTime.join('/')}; first common frame t=${firstCommonMotionTime}`);
    assert(`${key} default-wind changes stay within eligibility masks over t=0..20s`, defaultOutsideChanges===0, `${defaultOutsideChanges} changed pixels outside masks`);
    const f = { ...api.settings, paused: false, wind: 0, distortion: 0, rain: 0 };
    const objs = scene.renderObjects(3.25, 0); water.render(3.25, f, objs); const fixedA=bytes(water.canvas); water.render(3.25, f, objs); const fixedB=bytes(water.canvas);
    assert(`${key} fixed-time water identity`, same(fixedA,fixedB));
    water.render(4.25, f, objs); const later=bytes(water.canvas);
    assert(`${key} water visibly temporal at zero distortion`, !same(fixedA,later));
    const d0={...f, distortion:0}, d4={...f, distortion:4}; water.render(3.25,d0,objs); const distortion0=bytes(water.canvas); water.render(3.25,d4,objs); const distortion4=bytes(water.canvas);
    assert(`${key} distortion response`, !same(distortion0,distortion4));
    for (const effect of ['depth','sky','reflections','shoreline','backBank','particles']) {
      water.render(3.25,{...f,[effect]:true},objs); const on=bytes(water.canvas);
      water.render(3.25,{...f,[effect]:false},objs); const off=bytes(water.canvas);
      assert(`${key} independent ${effect} toggle`, !same(on,off));
    }
    const point = (() => { for(let i=0;i<scene.mask.length;i++) if(scene.mask[i]) return [i%scene.camera.width,Math.floor(i/scene.camera.width)]; return [-1,-1]; })();
    assert(`${key} water click accepts ripple`, water.addRipple(...point, 1));
    assert(`${key} land click rejects ripple`, !water.addRipple(0, 0, 1));
    assert(`${key} out-of-bounds click rejects ripple`, !water.addRipple(-1, -1, 1));
    for(let i=0;i<50;i++) water.addRipple(...point, 1);
    assert(`${key} ripple storage bounded at 32`, water.rippleCount <= 32, `${water.rippleCount}`);
  }
  // UI checks are exercised against the actual page controls.
  assert('six effect controls present', document.querySelectorAll('.effect-row input[type=checkbox]').length === 6);
  assert('three palette options present', document.querySelectorAll('#palette option').length === 3);
  assert('rain and speed controls present', !!document.querySelector('#rain') && !!document.querySelector('#speed'));
  assert('export route advertises 1080p', document.querySelector('#export')?.textContent.includes('1080p'));
  return { count: results.length, results, passed: results.filter(x=>x.passed).length, failed: results.filter(x=>!x.passed).length };
})()