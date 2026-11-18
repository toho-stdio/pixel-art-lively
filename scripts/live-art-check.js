(async () => {
  const api = window.__LIVE_ART__;
  const initial = { resolution: api?.resolution, time: api?.time, settings: api?.settings };
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
  assert('review route exposes controls (clean mode is off)', api.comparison?.enabled && !api.comparison.clean && !document.body.classList.contains('clean-mode'));
  for (const key of ['640x360', '960x540']) {
    await setGrid(key);
    const { scene, water } = api.layers;
    const staticGround = bytes(scene.ground), staticForeground = bytes(scene.foreground);
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
    const loadMotionMask = async filename => {
      const response = await fetch(`/art-direction/${key}/${filename}`);
      assert(`${key} ${filename} asset available`, response.ok);
      if (!response.ok) return new Uint8Array(scene.camera.width * scene.camera.height);
      const bitmap = await createImageBitmap(await response.blob());
      const c = document.createElement('canvas'); c.width = scene.camera.width; c.height = scene.camera.height;
      const cx = c.getContext('2d', { willReadFrequently: true }); cx.drawImage(bitmap,0,0); bitmap.close();
      const d = cx.getImageData(0,0,c.width,c.height).data;
      return Uint8Array.from({length:scene.camera.width*scene.camera.height},(_,i)=>d[i*4]===255?1:0);
    };
    const [canopyMask, anchoredRootMask, lotusMask, stemMask, leafMask, strandMask] = await Promise.all([
      loadMotionMask('canopy-motion-mask.png'), loadMotionMask('roots-motion-mask.png'),
      loadMotionMask('lotus-motion-mask.png'), loadMotionMask('lotus-stems-motion-mask.png'),
      loadMotionMask('lotus-leaves-motion-mask.png'), loadMotionMask('aerial-root-strands-motion-mask.png'),
    ]);
    const movingMasks = [canopyMask, lotusMask, stemMask, leafMask, strandMask];
    // Bound source plus destination displacement from the renderer's actual fields. Canopy
    // uses inverse sampling; lotus uses forward rasterization, so both sides need coverage.
    const makeSweeps = wind => {
      const scale=Math.sqrt(Math.max(0,Math.min(1.5,wind))/1.5)*1.1;
      const amplitude=[3.4,5.0,4.6,4.4,1.4].map(a=>a*scale);
      const envelopes=movingMasks.map((mask,m)=>{
        const env=new Uint8Array(mask.length), rx=Math.floor(amplitude[m]+0.5), ry=m===0?Math.floor(amplitude[m]*0.24+0.5):0;
        for(let i=0;i<mask.length;i++) if(mask[i]) { const x=i%scene.camera.width,y=Math.floor(i/scene.camera.width);
          for(let dy=-ry;dy<=ry;dy++) for(let dx=-rx;dx<=rx;dx++) { const xx=x+dx,yy=y+dy; if(xx>=0&&xx<scene.camera.width&&yy>=0&&yy<scene.camera.height) env[yy*scene.camera.width+xx]=1; }
        } return env;
      });
      const union=new Uint8Array(maskLength); for(const env of envelopes) for(let i=0;i<union.length;i++) if(env[i]) union[i]=1;
      return { envelopes, union };
    };
    const maskLength=scene.camera.width*scene.camera.height, defaultSweeps=makeSweeps(0.6), maxSweeps=makeSweeps(1.5);
    const motionEnvelope=maxSweeps.union;
    const changed = new Uint8Array(scene.camera.width*scene.camera.height);
    for(let i=0;i<changed.length;i++) { const p=i*4; if(still[p]!==wind[p]||still[p+1]!==wind[p+1]||still[p+2]!==wind[p+2]||still[p+3]!==wind[p+3]) changed[i]=1; }
    const perMask = movingMasks.map(mask=>{let n=0;for(let i=0;i<changed.length;i++)if(changed[i]&&mask[i])n++;return n;});
    let outsideSweepDiff=0, anchoredRootDiff=0;
    for(let i=0;i<changed.length;i++) {
      if(changed[i]&&!motionEnvelope[i]) outsideSweepDiff++;
      if(changed[i]&&anchoredRootMask[i]) anchoredRootDiff++;
    }
    const maxWindResponse = [0,0,0,0,0];
    let maxWindOutsideSweep=0;
    for(let step=1;step<=200;step++) {
      const frame=bytes(scene.renderObjects(step/10,1.5));
      for(let i=0;i<changed.length;i++) {
        const p=i*4;
        if(still[p]===frame[p]&&still[p+1]===frame[p+1]&&still[p+2]===frame[p+2]&&still[p+3]===frame[p+3]) continue;
        for(let m=0;m<movingMasks.length;m++) if(maxSweeps.envelopes[m][i]) maxWindResponse[m]++;
        if(!motionEnvelope[i]) maxWindOutsideSweep++;
      }
    }
    assert(`${key} canopy, flower, stem, leaf and hanging-strand masks have pixels`, movingMasks.every(mask=>mask.some(Boolean)), movingMasks.map(mask=>mask.reduce((a,b)=>a+b,0)).join('/'));
    assert(`${key} legacy heavy-root mask is empty by design`, !anchoredRootMask.some(Boolean));
    assert(`${key} max wind moves canopy, flower, stem, leaf and strand materials`, maxWindResponse.every(n=>n>0), `source-mask pixel-times ${maxWindResponse.join('/')}`);
    assert(`${key} max-wind changes fit exact source plus bounded destination sweeps`, maxWindOutsideSweep===0, `${maxWindOutsideSweep} changed pixels outside per-material horizontal envelopes`);
    assert(`${key} wind 0→1 sample changes fit bounded source/destination sweeps`, outsideSweepDiff===0, `${outsideSweepDiff} pixels outside per-material horizontal envelopes`);
    assert(`${key} heavy-root mask remains unchanged`, anchoredRootDiff===0 && !anchoredRootMask.some(Boolean), `${anchoredRootDiff} changed pixels; mask area ${anchoredRootMask.reduce((a,b)=>a+b,0)}`);
    const structuralRegions=[[55,145,150,220,'banyan trunk/buttress'],[400,110,540,145,'communal-house masonry'],[390,150,410,205,'left stone-step edge'],[535,150,550,205,'right stone-step edge'],[0,300,640,350,'front stone shore']];
    const structuralSamples=structuralRegions.map(([x0,y0,x1,y1,label])=>{
      const candidates=[];
      for(let y=Math.floor(y0*scene.camera.height/360);y<Math.ceil(y1*scene.camera.height/360);y++) for(let x=Math.floor(x0*scene.camera.width/640);x<Math.ceil(x1*scene.camera.width/640);x++) {
        const i=y*scene.camera.width+x; if(!motionEnvelope[i]&&still[i*4+3]===255) candidates.push(i);
      }
      return {label,samples:candidates.filter((_,i)=>i%Math.max(1,Math.floor(candidates.length/24))===0).slice(0,24)};
    });
    const structuralChanges=(reference,windValue)=>{let changes=0;for(let step=1;step<=200;step++){const frame=bytes(scene.renderObjects(step/10,windValue));for(const region of structuralSamples)for(const i of region.samples){const p=i*4;if(reference[p]!==frame[p]||reference[p+1]!==frame[p+1]||reference[p+2]!==frame[p+2]||reference[p+3]!==frame[p+3])changes++;}}return changes;};
    assert(`${key} semantic structural samples exist outside flexible/sweep regions`,structuralSamples.every(r=>r.samples.length>=8),structuralSamples.map(r=>`${r.label}:${r.samples.length}`).join('/'));
    const stepSamples=[];
    for(let y=Math.floor(205*scene.camera.height/360);y<Math.ceil(230*scene.camera.height/360);y++)for(let x=Math.floor(395*scene.camera.width/640);x<Math.ceil(545*scene.camera.width/640);x++){const i=y*scene.camera.width+x;if(staticGround[i*4+3]===255)stepSamples.push(i);}
    assert(`${key} lower stone-step region is verified in immutable static scene layers`,stepSamples.length>=8&&stepSamples.every(i=>staticGround[i*4+3]===255)&&same(staticGround,bytes(scene.ground))&&same(staticForeground,bytes(scene.foreground)),`${stepSamples.length} opaque static-ground samples; ground and foreground unchanged`);
    const maxFixedSamples=structuralChanges(still,1.5);
    assert(`${key} maximum-wind structural material samples stay byte-identical`,maxFixedSamples===0,`${maxFixedSamples} changed sample-times`);
    const defaultReference = bytes(scene.renderObjects(0, 0.6));
    const defaultByMask = [false,false,false,false,false], firstMotionTime = [null,null,null,null,null], motionPixelTimeCounts = [0,0,0,0,0];
    let defaultOutsideSweepChanges=0, firstCommonMotionTime=null, defaultAnchoredRootDiff=0;
    for(let step=1;step<=200;step++) {
      const time=step/10, frame = bytes(scene.renderObjects(time, 0.6)), perFrameMaskChanges=[0,0,0,0,0];
      for(let i=0;i<defaultReference.length/4;i++) {
        const p=i*4; if(defaultReference[p]===frame[p]&&defaultReference[p+1]===frame[p+1]&&defaultReference[p+2]===frame[p+2]&&defaultReference[p+3]===frame[p+3]) continue;
        let eligible=false;
        for(let m=0;m<movingMasks.length;m++) if(defaultSweeps.envelopes[m][i]) { defaultByMask[m]=true; eligible=true; motionPixelTimeCounts[m]++; perFrameMaskChanges[m]++; if(firstMotionTime[m]===null) firstMotionTime[m]=time; }
        if(anchoredRootMask[i]) defaultAnchoredRootDiff++;
        if(!motionEnvelope[i]) defaultOutsideSweepChanges++;
      }
      if(firstCommonMotionTime===null&&perFrameMaskChanges.every(n=>n>0)) firstCommonMotionTime=time;
    }
    assert(`${key} default wind 0.6 animates all five eligible materials in 20s`, defaultByMask.every(Boolean), `pixel-time changes ${motionPixelTimeCounts.join('/')}; first per-mask changes t=${firstMotionTime.join('/')}; common=${firstCommonMotionTime}`);
    assert(`${key} default-wind changes fit exact source plus bounded destination sweeps`, defaultOutsideSweepChanges===0, `${defaultOutsideSweepChanges} changed pixels outside per-material horizontal envelopes`);
    const defaultFixedSamples=structuralChanges(defaultReference,0.6);
    assert(`${key} default-wind structural material samples stay byte-identical`,defaultAnchoredRootDiff===0&&defaultFixedSamples===0,`${defaultAnchoredRootDiff} heavy-root changes; ${defaultFixedSamples} sample-times changed`);
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
  assert('six native water-effect controls present (ambient ripple is separate)', document.querySelectorAll('.effect-list input[type=checkbox]').length === 6);
  assert('three palette options present', document.querySelectorAll('#palette option').length === 3);
  assert('rain and speed controls present', !!document.querySelector('#rain') && !!document.querySelector('#speed'));
  assert('export route advertises 1080p', document.querySelector('#export')?.textContent.includes('1080p'));
  await api.setResolution(initial.resolution);
  api.freeze(initial.time);
  if (!initial.settings.paused) document.querySelector('#pause').click();
  return { count: results.length, results, passed: results.filter(x=>x.passed).length, failed: results.filter(x=>!x.passed).length };
})()