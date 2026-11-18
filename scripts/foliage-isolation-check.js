(async () => {
  const api=window.__LIVE_ART__;
  if(!api) throw new Error('Open /direction.html?compare=1 before this check');
  const {countProtectedPixelChanges}=await import('/src/direction/foliage-isolation.ts');
  const initial={resolution:api.resolution,time:api.time,settings:{...api.settings},split:api.comparison?.split,ambient:api.ambientEnabled,seed:api.ambientSeed};
  const results=[];
  const assert=(name,pass,detail='')=>results.push({name,passed:!!pass,...(detail?{detail}:{})});
  const bytes=c=>new Uint8ClampedArray(c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,c.width,c.height).data);
  const same=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
  const wait=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const sha=async url=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',await(await fetch(url)).arrayBuffer()))].map(b=>b.toString(16).padStart(2,'0')).join('');
  const rgba=async url=>{const bmp=await createImageBitmap(await(await fetch(url)).blob());const c=document.createElement('canvas');c.width=bmp.width;c.height=bmp.height;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(bmp,0,0);bmp.close();return {width:c.width,height:c.height,data:x.getImageData(0,0,c.width,c.height).data};};
  const expected={
    '640x360':['526e42617d04d976501e75d4033ff492de378bbc12dc7f9948be8814e0a9f1f9','0353ee11459578565638920668682d43aec41da6910bc550550efb3adc1b3f15','5e666ed4391b9b51a28997ea6f97bcffdc3c69dca503f947607ec7fefde07d18'],
    '960x540':['497bbdba816f315edbdf8e0e55ce2309b21efcc3e5e8e045a7ec004c622f345b','75a0aad17349e16bb3b4372de36e4bda166228e6afafeae3e5a657a5478a0619','bf831f16480442acd7cce02c85a90276ed60aee1beebffd61f69c68a0eb4446a'],
  };
  try {
    assert('comparison review route active; clean chrome disabled',api.comparison?.enabled&&!api.comparison.clean&&!document.body.classList.contains('clean-mode'));
    for(const key of ['640x360','960x540']){
      await api.setResolution(key);await wait();
      const s=api.layers.scene,dims=s.camera,W=dims.width,H=dims.height,n=W*H;
      assert(`${key}: opt-in debug API exists`,typeof s.foliageDebug==='function');
      const hashes=await Promise.all(['original.png','environment.png','mask.png'].map(f=>sha(`/art-direction/${key}/${f}`)));
      assert(`${key}: approved original/environment/water-mask hashes remain 3047513`,hashes.every((x,i)=>x===expected[key][i]),hashes.join('/'));
      const ownerImage=await rgba(`/art-direction/${key}/foliage-protected-owners.png`);
      assert(`${key}: owner asset is native-sized`,ownerImage.width===W&&ownerImage.height===H);
      const ownerAsset=new Uint8Array(n);let ownerBinary=true;
      for(let p=0;p<n;p++){const i=p*4,id=ownerImage.data[i];if(ownerImage.data[i+1]!==id||ownerImage.data[i+2]!==id||ownerImage.data[i+3]!==255||id>4)ownerBinary=false;ownerAsset[p]=id;}
      const baseDebug=s.foliageDebug(0,0),base=bytes(baseDebug.finalDry),original=bytes(s.original);
      const ids=new Uint32Array(5);let invalidOwner=0,baseDryDiff=0;
      for(let p=0;p<n;p++){if(baseDebug.owners[p]<5)ids[baseDebug.owners[p]]++;else invalidOwner++;const i=p*4;if(base[i]!==original[i]||base[i+1]!==original[i+1]||base[i+2]!==original[i+2]||base[i+3]!==original[i+3])baseDryDiff++;}
      assert(`${key}: runtime owner IDs exactly match opaque grayscale authored mask`,ownerBinary&&same(ownerAsset,baseDebug.owners)&&invalidOwner===0);
      assert(`${key}: every authored protection owner 1..4 has real coverage`,[1,2,3,4].every(id=>ids[id]>0),Array.from(ids).join('/'));
      assert(`${key}: zero-wind final dry composition exactly matches approved original`,baseDryDiff===0,`${baseDryDiff} changed bytes`);
      const protectedIndex=baseDebug.owners.findIndex(id=>id!==0),injected=base.slice();
      if(protectedIndex>=0)injected[protectedIndex*4]^=255;
      const injectedResult=protectedIndex>=0?countProtectedPixelChanges(base,injected,baseDebug.owners):{changed:0,first:-1};
      assert(`${key}: final-pixel fault injection is caught by protected-composite detector`,protectedIndex>=0&&injectedResult.changed===1&&injectedResult.first===protectedIndex,JSON.stringify(injectedResult));
      const canopy=await rgba(`/art-direction/${key}/canopy-motion-mask.png`),strands=await rgba(`/art-direction/${key}/aerial-root-strands-motion-mask.png`),underplate=await rgba(`/art-direction/${key}/canopy-underplate.png`),strandUnderplate=await rgba(`/art-direction/${key}/aerial-strands-underplate.png`);
      const sourceUnion=new Uint8Array(n),underpaintExpected=new Uint8Array(n);
      for(let p=0;p<n;p++){sourceUnion[p]=canopy.data[p*4]===255||strands.data[p*4]===255?255:0;underpaintExpected[p]=underplate.data[p*4+3]===255||strandUnderplate.data[p*4+3]===255?255:0;}
      let sourceMismatch=0,underpaintMismatch=0,sourceProtected=0,underpaintProtected=0;
      const motionTimes=[];
      for(const wind of [0.6,1.5])for(const time of Array.from({length:41},(_,i)=>i/2)){
        const d=s.foliageDebug(time,wind),dry=bytes(d.finalDry);let protectedChanges=0,changedFree=0,destinationCount=0,sourceCount=0,destProtected=0,srcProtected=0,underpaintCount=0,firstSourceOverlap=-1,firstDestinationOverlap=-1,firstUnderpaintOverlap=-1,firstFinalDelta=-1;
        for(let p=0;p<n;p++){
          if(d.source[p]!==sourceUnion[p])sourceMismatch++;
          if(d.underpaint[p]!==underpaintExpected[p])underpaintMismatch++;
          if(d.source[p]){sourceCount++;if(d.owners[p]){srcProtected++;sourceProtected++;if(firstSourceOverlap<0)firstSourceOverlap=p;}}
          if(d.destination[p]){destinationCount++;if(d.owners[p]){destProtected++;sourceProtected++;if(firstDestinationOverlap<0)firstDestinationOverlap=p;}}
          if(d.underpaint[p]){underpaintCount++;if(d.owners[p]){underpaintProtected++;if(firstUnderpaintOverlap<0)firstUnderpaintOverlap=p;}}
          const i=p*4,changed=base[i]!==dry[i]||base[i+1]!==dry[i+1]||base[i+2]!==dry[i+2]||base[i+3]!==dry[i+3];
          if(changed){if(d.owners[p]){protectedChanges++;if(firstFinalDelta<0)firstFinalDelta=p;}else changedFree++;}
        }
        const coord=p=>p<0?null:{index:p,x:p%W,y:Math.floor(p/W)};
        motionTimes.push({wind,time,sourceCount,destinationCount,underpaintCount,protectedChanges,changedFree,destProtected,srcProtected,...(firstSourceOverlap>=0||firstDestinationOverlap>=0||firstUnderpaintOverlap>=0||firstFinalDelta>=0?{firstFailure:{source:coord(firstSourceOverlap),destination:coord(firstDestinationOverlap),underpaint:coord(firstUnderpaintOverlap),finalDry:coord(firstFinalDelta)}}:{})});
      }
      assert(`${key}: source debug mask exactly equals authored canopy + aerial-strand candidates`,sourceMismatch===0,`${sourceMismatch} mismatched source pixels`);
      assert(`${key}: underpaint debug mask exactly equals native underplate alpha`,underpaintMismatch===0,`${underpaintMismatch} mismatched underpaint pixels`);
      assert(`${key}: no foliage source, destination or underpaint writes into protected owners`,sourceProtected===0&&underpaintProtected===0,motionTimes.map(x=>`${x.time}/${x.wind}:src${x.srcProtected},dst${x.destProtected}`).join('; '));
      assert(`${key}: protected owner pixels stay identical in final dry composition through t=0..20 at default and max wind`,motionTimes.every(x=>x.protectedChanges===0),motionTimes.map(x=>`${x.time}/${x.wind}:${x.protectedChanges}`).join('/'));
      assert(`${key}: safely isolated foliage still moves at both winds`,motionTimes.filter(x=>x.time===2.5).every(x=>x.changedFree>0&&x.destinationCount>0),motionTimes.filter(x=>x.time===2.5).map(x=>`${x.wind}:free ${x.changedFree},dest ${x.destinationCount}`).join('/'));
      assert(`${key}: source/destination coverage remains substantial (no silent amplitude collapse)`,motionTimes.every(x=>x.sourceCount>0&&x.destinationCount>=x.sourceCount*0.9),motionTimes.map(x=>`${x.time}/${x.wind}:${x.sourceCount}->${x.destinationCount}`).join('/'));
    }
  } finally {
    await api.setResolution(initial.resolution);await wait();api.setAmbientSeed(initial.seed);api.setAmbientEnabled(initial.ambient);
    for(const k of ['wind','distortion','speed','rain']){const e=document.querySelector(`#${k}`);if(e){e.value=String(initial.settings[k]);e.dispatchEvent(new Event('input',{bubbles:true}));}}
    for(const k of ['depth','sky','reflections','shoreline','backBank','particles']){const e=document.querySelector(`#effect-${k}`);if(e){e.checked=initial.settings[k];e.dispatchEvent(new Event('change',{bubbles:true}));}}
    const palette=document.querySelector('#palette');if(palette){palette.value=initial.settings.palette;palette.dispatchEvent(new Event('change',{bubbles:true}));}
    if(Number.isFinite(initial.split))api.setSplit(initial.split);
    api.freeze(initial.time);if(api.settings.paused!==initial.settings.paused)document.querySelector('#pause')?.click();await wait();
  }
  return {count:results.length,passed:results.filter(x=>x.passed).length,failed:results.filter(x=>!x.passed).length,results,restored:{resolution:api.resolution,wind:api.settings.wind,paused:api.settings.paused,split:api.comparison?.split,ambient:api.ambientEnabled,seed:api.ambientSeed}};
})()