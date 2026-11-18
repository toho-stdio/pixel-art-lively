// Opt-in diagnostic renderer. Run with agent-browser eval --stdin on /direction.html?compare=1.
(async () => {
  const api = window.__LIVE_ART__;
  if (!api) throw new Error('Open /direction.html?compare=1 before this diagnostic');
  const grid = api.resolution;
  const scene = api.layers.scene;
  const W = scene.camera.width, H = scene.camera.height, n = W * H;
  const time = 6.633, wind = 1.5;
  const posed = scene.foliageDebug(time, wind);
  const baseline = scene.foliageDebug(time, 0);
  const original = scene.original.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data;
  const final = posed.finalDry.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data;
  const calm = baseline.finalDry.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data;
  const colors = [[0,0,0,0],[244,72,72,170],[84,194,255,180],[244,193,76,180],[192,111,240,180]];
  const panel = (title, pixels, mask, palette, changes=false) => {
    const c=document.createElement('canvas'); c.width=W; c.height=H;
    const ctx=c.getContext('2d',{willReadFrequently:true});
    const base=ctx.createImageData(W,H);
    for(let p=0;p<n;p++){
      const i=p*4;
      if(changes){
        const d=foliageFootprint[p]&& (final[i]!==calm[i]||final[i+1]!==calm[i+1]||final[i+2]!==calm[i+2]||final[i+3]!==calm[i+3]);
        if(d){base.data[i]=255;base.data[i+1]=30;base.data[i+2]=170;base.data[i+3]=255;}
      } else if(mask && mask[p]) {
        const col=palette(mask[p],p), alpha=col[3]/255; base.data[i]=Math.round(pixels[i]*(1-alpha)+col[0]*alpha);base.data[i+1]=Math.round(pixels[i+1]*(1-alpha)+col[1]*alpha);base.data[i+2]=Math.round(pixels[i+2]*(1-alpha)+col[2]*alpha);base.data[i+3]=255;
      } else {
        const src=pixels; base.data[i]=src[i];base.data[i+1]=src[i+1];base.data[i+2]=src[i+2];base.data[i+3]=src[i+3];
      }
    }
    ctx.putImageData(base,0,0); return {title,canvas:c};
  };
  const source=panel('Rendered eligible source (cyan); protected owner collision (red)', original, posed.source, (_v,p)=>posed.owners[p]?[255,55,55,230]:[84,194,255,210]);
  const dest=panel('Accepted posed destination (green); forbidden destination (red)', final, posed.destination, (_v,p)=>posed.owners[p]?[255,55,55,230]:[55,235,112,210]);
  const owners=panel('Independent fixed owner silhouettes', original, posed.owners, id=>colors[id]||[255,0,0,255]);
  const foliageFootprint=new Uint8Array(n);
  for(let p=0;p<n;p++) foliageFootprint[p]=posed.source[p]||posed.destination[p]||posed.underpaint[p]||baseline.source[p]||baseline.destination[p]||baseline.underpaint[p]?255:0;
  const delta=panel('Final dry foliage-footprint delta vs zero-wind at same t (magenta)', final, null, null, true);
  const under=panel('Generated underpaint footprint (amber)', original, posed.underpaint, ()=>[255,178,48,220]);
  const panels=[source,dest,owners,delta,under];
  const scale=1, gap=12, labelH=26, cols=3, rows=2, pw=W*scale, ph=H*scale;
  const board=document.createElement('canvas'); board.id='foliage-isolation-debug-output'; board.width=cols*(pw+gap)+gap; board.height=rows*(ph+labelH+gap)+gap;
  board.style.cssText=`position:fixed;z-index:2147483647;left:8px;top:8px;width:min(98vw,${board.width}px);height:auto;background:#181818;image-rendering:pixelated;border:2px solid #eee`;
  const b=board.getContext('2d');b.fillStyle='#181818';b.fillRect(0,0,board.width,board.height);b.font='bold 14px monospace';
  const maxPanelH=ph;
  for(let k=0;k<panels.length;k++){
    const col=k%cols,row=Math.floor(k/cols),x=gap+col*(pw+gap),y=gap+row*(maxPanelH+labelH+gap);
    b.fillStyle='#fff';b.fillText(panels[k].title,x,y+15);b.imageSmoothingEnabled=false;b.drawImage(panels[k].canvas,x,y+labelH,pw,Math.min(ph,maxPanelH));
  }
  document.getElementById(board.id)?.remove();document.body.append(board);
  return {grid,time,wind,outputCanvas:board.id,owners:{0:'free',1:'roof/house',2:'banyan structure',3:'planter/shore',4:'fixed lotus'},palette:{source:'cyan',destination:'green',protected:'red',ownerIDs:'red/blue/yellow/purple',underpaint:'amber',finalDryDelta:'magenta'},panels:panels.map(p=>p.title)};
})()
