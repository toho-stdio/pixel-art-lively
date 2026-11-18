(async () => {
  const api = window.__LIVE_ART__;
  if (!api) throw new Error('Open /direction.html?compare=1 before this check');
  const results = [];
  const assert = (name, pass, detail = '') => results.push({ name, passed: !!pass, ...(detail ? { detail } : {}) });
  const bytes = c => new Uint8ClampedArray(c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data);
  const same = (a,b) => a.length === b.length && a.every((v,i)=>v===b[i]);
  const frameReady = async () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const initial = { resolution: api.resolution, split: api.comparison.split, time: api.time, settings: { ...api.settings }, paused: api.settings.paused, ambient: api.ambientEnabled, seed: api.ambientSeed };
  const regions = [
    [0,0,316,134,'banyan left/outer crown'], [155,0,557,105,'overhead banyan crown'],
    [203,73,380,170,'middle-distance crowns'], [544,0,640,151,'right-bank/background foliage'],
  ];
  const load = async (name,W,H) => {
    const image = await createImageBitmap(await (await fetch(`/art-direction/${W===640?'640x360':'960x540'}/${name}`)).blob());
    const c=document.createElement('canvas'); c.width=W;c.height=H;c.getContext('2d').drawImage(image,0,0); image.close();
    const d=c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,W,H).data;
    return Uint8Array.from({length:W*H},(_,i)=>d[i*4]===255?1:0);
  };
  try {
    assert('default wind remains 0.6', initial.settings.wind===0.6, `wind=${initial.settings.wind}`);
    assert('ambient ripples default enabled in live review', initial.ambient && document.querySelector('#ambient-ripples')?.checked===true);
    for (const key of ['640x360','960x540']) {
      await api.setResolution(key); await frameReady();
      const {scene,water}=api.layers, W=scene.camera.width,H=scene.camera.height,n=W*H;
      const canopy=await load('canopy-motion-mask.png',W,H);
      const t0=bytes(scene.renderObjects(0,0.6)), t2=bytes(scene.renderObjects(2.4,0.6));
      const perRegion=[];
      for(const [x0,y0,x1,y1,label] of regions){
        let eligible=0,changedMaterial=0,changedArea=0;
        const ax0=Math.floor(x0*W/640),ax1=Math.ceil(x1*W/640),ay0=Math.floor(y0*H/360),ay1=Math.ceil(y1*H/360);
        for(let y=ay0;y<ay1;y++)for(let x=ax0;x<ax1;x++){
          const p=y*W+x,i=p*4;
          if(canopy[p]){eligible++;if(t0[i]!==t2[i]||t0[i+1]!==t2[i+1]||t0[i+2]!==t2[i+2]||t0[i+3]!==t2[i+3])changedMaterial++;}
          if(t0[i]!==t2[i]||t0[i+1]!==t2[i+1]||t0[i+2]!==t2[i+2]||t0[i+3]!==t2[i+3])changedArea++;
        }
        const min=key==='640x360'?Math.floor(eligible*0.035):Math.floor(eligible*0.035);
        perRegion.push({label,eligible,changedMaterial,changedArea,min});
        assert(`${key}: ${label} foliage pixels visibly change across a short default-wind interval`,eligible>0&&changedMaterial>=min,`${changedMaterial}/${eligible} selected material pixels changed; threshold ${min}`);
      }
      assert(`${key}: four distinct visible canopy zones each contain moving material (not only union-mask coverage)`,perRegion.length===4&&perRegion.every(x=>x.changedMaterial>=x.min),JSON.stringify(perRegion));
      const lotus=await load('lotus-motion-mask.png',W,H), stems=await load('lotus-stems-motion-mask.png',W,H), leaves=await load('lotus-leaves-motion-mask.png',W,H);
      let lotusCount=0,stemCount=0,leafCount=0;
      for(let p=0;p<n;p++){const i=p*4,changed=t0[i]!==t2[i]||t0[i+1]!==t2[i+1]||t0[i+2]!==t2[i+2]||t0[i+3]!==t2[i+3];if(changed&&lotus[p])lotusCount++;if(changed&&stems[p])stemCount++;if(changed&&leaves[p])leafCount++;}
      assert(`${key}: flower, stem, and leaves all change at ordinary wind 0.6`,lotusCount>250&&stemCount>15&&leafCount>300,`${lotusCount}/${stemCount}/${leafCount}`);
      const z0=bytes(scene.renderObjects(0,0)),z2=bytes(scene.renderObjects(20,0));
      assert(`${key}: zero-wind object rendering remains byte-identical`,same(z0,z2));
      const fixed=bytes(scene.renderObjects(0,0.6));
      const moved=bytes(scene.renderObjects(2.4,0.6));
      const fixedRois=[[55,145,150,220,'trunk/buttress'],[400,110,540,145,'roof sample outside moving foliage zones'],[0,300,640,350,'shore']];
      let fixedChanges=0;
      for(const [x0,y0,x1,y1] of fixedRois)for(let y=Math.floor(y0*H/360);y<Math.ceil(y1*H/360);y++)for(let x=Math.floor(x0*W/640);x<Math.ceil(x1*W/640);x++){const i=(y*W+x)*4;if(fixed[i]!==moved[i]||fixed[i+1]!==moved[i+1]||fixed[i+2]!==moved[i+2]||fixed[i+3]!==moved[i+3])fixedChanges++;}
      assert(`${key}: structural trunk, roof, and shoreline remain fixed`,fixedChanges===0,`${fixedChanges} changed pixels`);
      api.freeze(19.5); await frameReady();
      const before=api.rippleCount; api.render(); api.render();
      assert(`${key}: repeated identical paused renders do not birth additional ambient ripples`,api.rippleCount===before,`${before} -> ${api.rippleCount}`);
      const sceneMask=scene.mask;
      water.render(19.5,{...api.settings,paused:false,rain:0},scene.renderReflectionObjects(19.5,api.settings.wind));
      assert(`${key}: ambient ripple count remains bounded`,api.rippleCount<=32,`active=${api.rippleCount}`);
      assert(`${key}: water mask remains same-sized with valid dimensions`,sceneMask.length===n&&water.canvas.width===W&&water.canvas.height===H);
    }
    assert('Before/After compare route keeps wipe endpoints accessible',!!document.querySelector('#comparison-slider')&&api.comparison.enabled);
    assert('default/clean comparison composition preserves 16:9',api.width/api.height===16/9,`${api.width}x${api.height}`);
  } finally {
    await api.setResolution(initial.resolution); await frameReady();
    api.setAmbientSeed(initial.seed); api.setAmbientEnabled(initial.ambient);
    const setInput=(id,value,event='input')=>{const el=document.querySelector(`#${id}`);if(el){el.value=String(value);el.dispatchEvent(new Event(event,{bubbles:true}));}};
    for(const k of ['wind','distortion','speed','rain'])setInput(k,initial.settings[k]);
    setInput('palette',initial.settings.palette,'change');
    for(const k of ['depth','sky','reflections','shoreline','backBank','particles']){const el=document.querySelector(`#effect-${k}`);if(el){el.checked=initial.settings[k];el.dispatchEvent(new Event('change',{bubbles:true}));}}
    api.setSplit(initial.split);
    api.freeze(initial.time);
    if(initial.paused!==api.settings.paused)document.querySelector('#pause')?.click();
    await frameReady();
  }
  return {count:results.length,passed:results.filter(x=>x.passed).length,failed:results.filter(x=>!x.passed).length,results,restored:{resolution:api.resolution,split:api.comparison.split,ambient:api.ambientEnabled,seed:api.ambientSeed,paused:api.settings.paused,wind:api.settings.wind}};
})()