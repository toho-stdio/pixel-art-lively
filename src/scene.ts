import { HEIGHT, WIDTH, type VillageScene } from './types';

const W = WIDTH, H = HEIGHT;
type Ctx = CanvasRenderingContext2D;

const canvas = (): HTMLCanvasElement => {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  return c;
};
function poly(g: Ctx, pts: number[][], color: string) {
  g.fillStyle = color; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i=1;i<pts.length;i++) g.lineTo(pts[i][0],pts[i][1]);
  g.closePath(); g.fill();
}
function box(g: Ctx,x:number,y:number,w:number,h:number,c:string) {
  g.fillStyle=c; g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
}
function line(g:Ctx, pts:number[][], c:string, width=1) {
  g.strokeStyle=c; g.lineWidth=width; g.lineCap='square'; g.lineJoin='miter';
  g.beginPath(); g.moveTo(pts[0][0],pts[0][1]);
  for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0],pts[i][1]); g.stroke();
}
function ellipse(g:Ctx,x:number,y:number,rx:number,ry:number,c:string) {
  g.fillStyle=c; g.beginPath(); g.ellipse(Math.round(x),Math.round(y),rx,ry,0,0,Math.PI*2); g.fill();
}
function seeded(seed:number) { return () => { seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; }; }
function profileAt(points:number[][],x:number,smooth=true):number {
  for(let i=0;i<points.length-1;i++){
    const [x0,y0]=points[i], [x1,y1]=points[i+1];
    if(x<=x1){ const t=Math.max(0,Math.min(1,(x-x0)/(x1-x0))); const s=smooth?t*t*(3-2*t):t; return y0+(y1-y0)*s; }
  }
  return points[points.length-1][1];
}

/** A hand-built pixel-art setting: blocky silhouettes, deliberate tile/leaf motifs and no filtered strokes. */
export function createScene(): VillageScene {
  const ground=canvas(), foreground=canvas(), objects=canvas();
  const g=ground.getContext('2d')!, f=foreground.getContext('2d')!, o=objects.getContext('2d')!;
  // Hand-shaped asymmetric shoreline. The step cove and two broad bays avoid a periodic trough.
  const topEdge=[[29,190],[49,193],[78,197],[108,193],[145,190],[178,193],[207,198],[238,202],
    [269,198],[301,203],[330,200],[354,195],[373,190],[388,185],[402,186],[418,191],[441,195],
    [468,199],[496,202],[524,201],[550,198],[575,193],[598,190],[620,193]];
  // The irregular lower bank follows the foreground grass silhouettes; the center remains open to the bottom.
  const bottomEdge=[[29,335],[38,337],[79,348],[111,355],[153,360],[184,365],[213,376],[246,400],
    [422,400],[442,379],[468,368],[496,361],[533,357],[568,349],[606,344],[620,338]];
  const bankY=new Int16Array(W), mask=new Uint8Array(W*H), waterBottom=new Int16Array(W);
  for(let x=0;x<W;x++){
    if(x<29 || x>620) { waterBottom[x]=H; continue; }
    const top=Math.round(profileAt(topEdge,x));
    waterBottom[x]=Math.round(profileAt(bottomEdge,x,false));
    for(let yy=top;yy<waterBottom[x];yy++) mask[yy*W+x]=1;
  }
  // Derive the required reflection shoreline from the final authoritative water mask.
  for(let x=0;x<W;x++){
    let first=H;
    for(let y=0;y<H;y++) if(mask[y*W+x]) { first=y; break; }
    bankY[x]=first;
  }
  // Late-afternoon sky and distant, layered tree line.
  box(g,0,0,W,H,'#d4d7b4');
  poly(g,[[0,0],[640,0],[640,122],[602,119],[567,125],[532,116],[503,124],[465,117],[430,126],[390,116],[350,128],[312,117],[280,126],[245,115],[210,122],[174,111],[140,121],[105,110],[71,120],[38,112],[0,120]],'#b9c6a0');
  // soft squared cloud bands
  box(g,290,35,70,4,'#e4d9ad'); box(g,310,30,33,4,'#e4d9ad');
  // Distant low village: small plaster walls and unmistakably pitched terracotta roofs.
  const rand=seeded(23);
  for(let i=0;i<9;i++){
    const x=5+i*34, base=120+Math.floor(rand()*5), w=23+Math.floor(rand()*10), h=10+Math.floor(rand()*6);
    box(g,x+3,base-h,w-6,h,['#9a9879','#ada17b','#8c9272'][i%3]);
    poly(g,[[x,base-h+2],[x+w*.48,base-h-7],[x+w,base-h+2],[x+w-2,base-h+5],[x+w*.48,base-h-3],[x+2,base-h+6]],['#986047','#a46745','#b2764b'][i%3]);
    for(let t=0;t<3;t++) box(g,x+7+t*7,base-h+3,2,4,'#554b37');
    box(g,x+4,base-2,w-8,2,'#5e6548');
  }
  // Bamboo and banana silhouettes peeking over the village roofs.
  for(let x=22;x<76;x+=8){
    line(g,[[x,125],[x+(x%3)-1,79+(x%4)*4]],'#4e6845',2);
    for(let y=85+(x%4)*2;y<119;y+=11) { box(g,x-3,y,6,1,'#8b945b'); box(g,x-2,y+1,4,1,'#71834c'); }
  }
  for(let x=462;x<529;x+=9){
    const lean=(x%5)-2, top=86+(x%4)*5;
    line(g,[[x,132],[x+lean,top]],'#405b3d',2);
    for(let y=top+6;y<127;y+=10){ box(g,x+lean-3,y,7,2,'#71834b'); box(g,x+lean-1,y-1,4,2,'#879454'); }
  }
  for(const [x,y] of [[286,105],[303,111],[326,102]]){
    poly(g,[[x,y+17],[x-7,y+5],[x-16,y],[x-5,y+2],[x+1,y+10],[x+3,y-2],[x+5,y+10],[x+14,y+1],[x+8,y+15]],'#73834a');
    box(g,x,y+12,3,15,'#566340');
  }
  // Terrain shape above irregular pond rim; preserve water as opaque deep jade under the renderer.
  poly(g,[[0,115],[90,122],[158,128],[218,120],[278,127],[336,123],[391,130],[448,123],[504,130],[562,123],[640,127],[640,bankY[639]],[0,bankY[0]]],'#53694f');
  // Low, layered garden growth breaks up the far bank: bamboo, shrubs, and a glimpse of old wall.
  poly(g,[[0,151],[18,140],[34,146],[49,132],[68,143],[88,139],[104,151],[124,153],[124,166],[0,171]],'#405b42');
  poly(g,[[236,153],[248,143],[261,148],[274,136],[291,146],[304,141],[318,151],[332,139],[351,145],[368,138],[383,149],[386,170],[236,170]],'#465f43');
  for(const [x,y] of [[9,146],[28,139],[48,144],[68,137],[91,147],[245,149],[268,142],[291,150],[319,145],[345,149],[366,145]]){
    box(g,x,y,8,4,'#607746'); box(g,x+2,y-2,7,4,'#71844a');
    box(g,x+3,y,2,2,'#94a05a'); box(g,x-2,y+3,4,2,'#354f3d');
  }
  // Stone retaining wall fragments and mossy capstones, partly swallowed by the bank.
  for(let x=235;x<385;x+=14){
    box(g,x,161,12,5,(x%3)?'#716b50':'#898064');
    box(g,x+2,162,3,2,'#a29571'); box(g,x+6,164,1,2,'#4d5b42');
  }
  for(let x=4;x<385;x+=7){
    const y=154+Math.floor((x*7)%11);
    if((x%4)!==0) { box(g,x,y,2,3,x%3?'#7e8b4e':'#a09255'); box(g,x+2,y+1,2,2,'#596f43'); }
  }
  // layered earthen bank face follows silhouette, brick courses and moss seams
  for(let x=0;x<W;x+=1){
    const y=bankY[x];
    box(g,x,y,1,5,'#827451');
    box(g,x,y+5,1,8,'#625b42');
    box(g,x,y+13,1,8,'#494d3a');
  }
  // Small worn brick courses follow the scalloped shoreline instead of forming straight stripes.
  for(let row=0;row<3;row++){
    for(let x=(row%2)*8;x<620;x+=16){
      const y0=bankY[Math.min(639,x)], y1=bankY[Math.min(639,x+12)];
      const top0=y0+1+row*6, top1=y1+1+row*6;
      poly(g,[[x,top0],[x+12,top1],[x+12,top1+4],[x,top0+4]],row%2?'#8e5941':'#a3694b');
      line(g,[[x+2,top0+1],[x+10,top1+1]],'#ba805a',1);
      if((x*7+row)%4===0) box(g,x+4,Math.min(top0,top1)-1,5,2,'#5d7049');
      if((x+row*11)%7===0) box(g,x+9,Math.max(top0,top1)+3,2,1,'#c08a59');
    }
  }
  // Moss ledge glinting along the water boundary
  for(let x=0;x<W;x+=4) {
    const y=bankY[x]-2;
    box(g,x,y,2,1, x%3?'#899164':'#b39b61');
  }
  // Rear-right communal temple, rendered in objects for reflection; ground shows its paved courtyard.
  // courtyard stones
  poly(g,[[370,126],[640,121],[640,bankY[639]],[382,bankY[382]]],'#76694e');
  for(let y=139;y<170;y+=7) for(let x=391+(y%2)*5;x<640;x+=17) {
    box(g,x,y,12,2,'#978367'); box(g,x+2,y+3,5,1,'#5f6048');
  }
  // An old flagstone path runs from the village court into a landing at the step inlet.
  poly(g,[[267,139],[313,141],[365,153],[391,165],[382,172],[348,159],[307,151],[264,148]],'#877d61');
  for(let i=0;i<8;i++){
    const x=273+i*13, y=142+Math.floor(i*2.7);
    poly(g,[[x,y],[x+10,y+1],[x+13,y+4],[x+2,y+4]],i%2?'#a79a76':'#b1a27d');
    box(g,x+3,y+1,3,1,'#d0bc8c');
  }
  // steps cut into bank, six worn treads, at temple-side inlet
  poly(g,[[356,150],[407,151],[418,bankY[418]],[349,bankY[349]]],'#77715a');
  for(let i=0;i<6;i++){
    const yy=151+i*6, inset=i*3;
    poly(g,[[358-inset,yy],[405+inset,yy],[405+inset,yy+4],[358-inset,yy+4]],i%2?'#91866a':'#a39776');
    line(g,[[358-inset,yy],[405+inset,yy]],'#c1aa7a');
    box(g,367-inset,yy+3,8,1,'#53624a');
  }
  // Opaque ground fallback mirrors the irregular pool: curved banks pinch in toward both corners.
  const outline:number[][]=[];
  for(let x=29;x<=620;x+=14) outline.push([x,bankY[x]]);
  outline.push([620,bankY[620]]);
  for(let x=620;x>=29;x-=14) outline.push([x,waterBottom[x]]);
  outline.push([29,waterBottom[29]]);
  poly(g,outline,'#344e49');

  // Temporary painter draws objects into a reusable transparent canvas every frame.
  const drawObjects=(time:number,wind:number)=>{
    o.clearRect(0,0,W,H);
    const sway=Math.round(Math.sin(time*1.3)*Math.max(0,wind)*1.4);
    drawTemple(o);
    drawBanyan(o,sway);
  };
  function drawTemple(c:Ctx) {
    // shadow, rear wall, timber frame
    poly(c,[[404,127],[607,125],[626,143],[396,147]],'#332f28');
    box(c,421,109,183,35,'#604b36');
    box(c,427,115,171,26,'#795a3d');
    // dark bays and carved planks
    for(let x=432;x<596;x+=23){
      box(c,x,118,15,24,'#292f2b'); box(c,x+2,120,2,20,'#886442');
      box(c,x+10,121,1,18,'#a57b4d');
    }
    box(c,429,114,170,4,'#b37e47'); box(c,429,141,171,3,'#352f27');
    // six pillars with foot blocks and warm lit edges
    for(let x=424;x<=601;x+=35){
      box(c,x,111,6,34,'#543827'); box(c,x+1,113,2,29,'#b47b49');
      box(c,x-2,141,10,4,'#c1945b');
    }
    // roof body, curved eaves and distinctive red tile silhouette
    poly(c,[[391,111],[412,95],[450,82],[548,82],[589,94],[620,111],[613,116],[579,106],[548,101],[451,101],[423,108],[398,118]],'#49352c');
    poly(c,[[397,108],[418,93],[451,81],[548,81],[585,92],[615,108],[610,111],[578,100],[547,96],[451,96],[424,102],[401,114]],'#a64f35');
    poly(c,[[397,108],[418,93],[451,81],[548,81],[585,92],[615,108],[611,111],[580,98],[548,92],[451,92],[424,99],[401,113]],'#bd6741');
    // rows of individually inked roof tiles
    for(let row=0;row<5;row++){
      const y=85+row*4;
      const left=[441,430,419,410,403][row], right=[561,575,590,601,612][row];
      for(let x=left+(row%2)*4;x+6<right;x+=8){
        box(c,x,y,6,2,(x+row)%3?'#a85337':'#d08350');
        box(c,x+2,y+1,2,1,'#e19a5d');
        if((x+row)%5===0) box(c,x+5,y+2,1,1,'#713d31');
      }
      line(c,[[left,y+3],[right,y+3]],'#814534',1);
    }
    // carved fascia and layered stone porch: foundation blocks, worn capstones, shadow joints
    box(c,414,142,205,5,'#463c30'); box(c,409,146,215,4,'#9b8865');
    for(let x=414;x<619;x+=18){
      box(c,x,150,15,5,(x%3)?'#8a8066':'#a09373');
      box(c,x+2,151,1,3,'#5c5a49'); box(c,x+5,150,9,1,'#c0ad83');
    }
    box(c,408,155,223,3,'#5e5746');
    line(c,[[392,110],[409,96],[449,82],[550,82],[588,94],[619,109]],'#342b28',2);
    // upward curling dragon-tail ornaments
    poly(c,[[392,109],[384,104],[388,102],[389,106],[397,108]],'#d09a56');
    poly(c,[[619,109],[628,103],[624,102],[623,107],[615,109]],'#d09a56');
    box(c,405,108,211,2,'#392e27');
    // lanterns and carved lintel detail
    for(const x of [460,550]) { box(c,x,108,2,5,'#dfb85f'); box(c,x-2,113,6,5,'#a84232'); box(c,x,114,2,3,'#f0c66a'); }
    box(c,482,116,24,2,'#ce9b59'); box(c,490,120,8,17,'#302a25');
    box(c,477,119,2,18,'#bd8a52'); box(c,507,119,2,18,'#bd8a52');
    // roof ridge finials
    for(const x of [451,480,520,548]) { box(c,x,79,2,3,'#dfb36b'); box(c,x-1,77,4,2,'#70513a'); }
  }
  function drawBanyan(c:Ctx,sway:number) {
    // Forty-six branch-scale leaf lobes overlap into a single irregular banyan crown.
    // Each has a stepped dark lower-right edge, a solid body and one broken upper-left light plate.
    const lobeRows:[number,number[]][]=[
      [30,[72,101,130,159]],[44,[45,73,101,130,160,190]],[58,[19,47,76,105,135,165,194,220]],
      [73,[8,35,63,91,120,149,178,207,230]],[89,[13,41,69,98,127,156,185,213]],
      [105,[31,60,89,119,149,179,205]],[118,[57,86,116,146,176]]
    ];
    // One shadowed silhouette stitches leaf masses together; branch gaps remain deep green, not sky holes.
    poly(c,[[0,69],[8,54],[23,49],[29,36],[47,31],[61,24],[78,29],[93,20],[112,25],[128,20],
      [145,27],[163,23],[179,33],[198,31],[211,42],[229,49],[235,63],[246,73],[237,86],[241,99],
      [222,105],[214,118],[194,116],[180,128],[162,121],[145,133],[128,124],[109,132],[92,122],
      [76,129],[59,118],[39,123],[27,111],[11,109],[7,95],[0,86]],'#30493a');
    const lobeColor=['#3b5a3d','#405f3e','#456540','#496941','#4c6b40'];
    const lobe=(cx:number,cy:number,rx:number,ry:number,color:string,dx=0,dy=0)=>poly(c,[
      [cx-rx+5+dx,cy+1+dy],[cx-rx+dx,cy-2+dy],[cx-rx+3+dx,cy-6+dy],
      [cx-rx+2+dx,cy-ry+3+dy],[cx-rx*.52+dx,cy-ry+dy],[cx-rx*.23+dx,cy-ry+3+dy],
      [cx+rx*.17+dx,cy-ry-1+dy],[cx+rx*.48+dx,cy-ry+2+dy],[cx+rx-2+dx,cy-ry+4+dy],
      [cx+rx+dx,cy-1+dy],[cx+rx-4+dx,cy+3+dy],[cx+rx-7+dx,cy+ry-1+dy],
      [cx+1+dx,cy+ry+dy],[cx-rx*.5+dx,cy+ry-2+dy],[cx-rx+3+dx,cy+ry-4+dy]],color);
    let n=0;
    for(const [rowY,centers] of lobeRows){
      for(let j=0;j<centers.length;j++){
        const jitter=((n*13)%7)-3;
        const cx=centers[j]+jitter+(rowY%2?5:-4)+sway;
        const cy=rowY+((n*5)%5)-2;
        const rx=13+(n*7%3)*2, ry=10+(n*5%3);
        lobe(cx,cy,rx,ry,'#2d4838',2,4); // lower-right connected shadow
        lobe(cx,cy,rx,ry,lobeColor[n%lobeColor.length]);
        // Sparse, broad upper-left light plates join neighboring lobes; no rings or yellow dots.
        if(n%3===0 && cx<166 && cy<91){
          const hx=cx-rx*.48, hy=cy-ry*.43;
          poly(c,[[hx-6,hy+2],[hx-5,hy-2],[hx-1,hy-5],[hx+6,hy-4],[hx+11,hy-1],
            [hx+9,hy+2],[hx+3,hy+3],[hx,hy+1]],n<20?'#829052':'#71864c');
        }
        // Recesses are narrow gaps beneath overlapping branches, not outlines around each leaf mass.
        if(n%7===2) poly(c,[[cx+rx-4,cy+1],[cx+rx-1,cy-3],[cx+rx+2,cy+2],[cx+rx-2,cy+7]],'#293f35');
        n++;
      }
    }
    // Three connected sunlit plates cross crown tops, broken by dark leaf pockets.
    poly(c,[[34,40],[42,35],[54,36],[61,41],[71,39],[78,45],[68,48],[56,45],[47,48],[38,45]],'#899255');
    poly(c,[[91,32],[100,28],[110,31],[119,29],[128,35],[121,39],[109,36],[100,39],[94,36]],'#8d9555');
    poly(c,[[139,38],[149,33],[158,36],[169,35],[177,41],[170,45],[158,42],[148,45],[141,42]],'#7e8d50');
    // Branches twist outward from the fused crown into the trunk (shadowed underside, warm bark ridge).
    line(c,[[128,159],[118,139],[102,125],[84,119],[65,108],[52,91]],'#514736',7);
    line(c,[[132,147],[146,129],[161,114],[182,104],[205,92],[224,78]],'#574a36',6);
    line(c,[[121,147],[109,131],[102,112],[100,94]],'#61513a',5);
    line(c,[[139,145],[145,126],[143,108],[151,88]],'#4a4333',4);
    line(c,[[116,137],[97,127],[80,122]],'#a18555',2);
    line(c,[[151,127],[173,114],[195,106],[212,96]],'#a08352',2);
    // colossal braided trunk with separate fused stems and shadow channels
    poly(c,[[95,186],[112,153],[117,118],[126,96],[138,96],[148,122],[146,157],[158,183],[169,205],[81,207]],'#554b38');
    poly(c,[[106,187],[121,151],[124,116],[132,101],[139,109],[135,151],[146,183],[151,199]],'#786548');
    line(c,[[126,174],[129,135],[134,113],[131,102]],'#b08c58',3);
    line(c,[[141,171],[138,142],[143,123]],'#493e31',3);
    // braided secondary trunks and deep vertical bark furrows
    poly(c,[[111,188],[101,164],[105,139],[110,115],[116,107],[119,121],[115,149],[121,174],[128,195]],'#66563b');
    poly(c,[[143,183],[151,160],[147,136],[151,113],[158,106],[161,124],[157,149],[165,177],[174,198]],'#4d4935');
    poly(c,[[127,179],[136,154],[132,132],[137,112],[142,106],[144,124],[141,153],[151,184],[154,201]],'#806748');
    line(c,[[108,175],[113,148],[115,124]],'#a18453',2);
    line(c,[[132,182],[139,162],[137,139],[141,119]],'#c19a5c',2);
    line(c,[[153,178],[151,153],[156,130]],'#84714c',2);
    line(c,[[119,184],[125,161],[123,143]],'#403e31',2);
    // flared buttress roots spreading toward the bank
    poly(c,[[116,164],[108,187],[55,201],[27,214],[35,220],[90,209],[123,193]],'#64543b');
    poly(c,[[130,166],[146,187],[206,197],[238,214],[230,219],[169,208],[129,194]],'#705d3d');
    poly(c,[[126,171],[117,197],[113,216],[119,219],[132,194],[137,174]],'#4b4432');
    line(c,[[114,183],[95,198],[59,210]],'#a28957',2);
    line(c,[[143,184],[166,197],[207,207]],'#9c8050',2);
    // braided roots cross over one another and disappear into the mossy bank
    poly(c,[[120,177],[113,192],[91,203],[61,209],[40,220],[32,219],[52,207],[89,196],[107,185]],'#756044');
    poly(c,[[140,178],[151,193],[180,200],[211,207],[239,220],[229,222],[199,214],[164,207],[145,196]],'#5a5039');
    poly(c,[[130,183],[126,199],[137,212],[135,218],[120,210],[119,195]],'#806849');
    poly(c,[[109,187],[102,199],[111,210],[107,215],[94,204],[99,192]],'#4a4634');
    line(c,[[117,188],[100,200],[72,207],[48,216]],'#b0955d',2);
    line(c,[[147,189],[167,201],[197,207],[224,217]],'#ad8c54',2);
    line(c,[[128,190],[125,202],[130,210]],'#c0a06a',1);
    // hanging aerial roots in tapered pixel segments
    for(const [x,y,end] of [[74,83,177],[87,88,189],[101,91,164],[157,81,178],[172,88,165],[188,91,155],[203,97,143]] as number[][]){
      const lean=(x<130?-2:2);
      line(c,[[x+sway,y],[x+lean+sway,y+25],[x+lean*2+sway,end]],'#776347',2);
      box(c,x+lean*2+sway,end,2,5,'#a28553');
      line(c,[[x-1+sway,y+6],[x+lean+sway,y+27]],'#ad8f5c',1);
    }
    // little carved marks, moss and old roots in shadow
    for(let i=0;i<14;i++){
      const x=89+(i*11)%75, y=185+(i%4)*5;
      box(c,x,y,2,1,i%2?'#9a8051':'#364435');
    }
  }
  drawObjects(0,0);
  // Foreground transparent fringe: asymmetric reeds, water grasses, stones and lotus leaves/flowers.
  // bank fringe follows lower edge but never obscures the central pond.
  poly(f,[[0,330],[38,337],[79,348],[111,355],[153,360],[184,365],[213,376],[246,400],[0,400]],'#394e3a');
  poly(f,[[422,400],[442,379],[468,368],[496,361],[533,357],[568,349],[606,344],[640,334],[640,400]],'#344c38');
  const r=seeded(410);
  // layered grass tufts
  for(const [cx,base,n] of [[24,365,7],[78,375,5],[177,385,6],[453,382,6],[541,373,7],[613,364,8]] as number[][]){
    for(let i=0;i<n;i++){
      const x=cx+Math.floor((i-n/2)*3), h=8+Math.floor(r()*17);
      poly(f,[[x,base],[x+2,base],[x+Math.floor(r()*7)-2,base-h],[x,base-h+4]],i%3?'#70824a':'#a28e52');
      box(f,x+1,base-h+3,2,2,'#a9a05b');
    }
  }
  // scattered lily pads: pixelated ellipses with visible notched radial cuts
  function pad(x:number,y:number,rx:number,ry:number,col:string){
    ellipse(f,x,y,rx,ry,'#314d3e'); ellipse(f,x-1,y-1,rx-1,Math.max(2,ry-1),col);
    poly(f,[[x,y],[x+rx,y-2],[x+rx-2,y+2]],'#253f37');
    line(f,[[x,y],[x-2,y-ry+2]],'#9aaa63',1);
    box(f,x-rx+3,y-2,4,1,'#bdab67');
  }
  // Few legible colonies of big, overlapping pads leave the center of the pond open.
  pad(62,350,23,10,'#72894b'); pad(91,365,19,8,'#819454');
  pad(145,376,24,10,'#829252'); pad(174,365,20,9,'#657e49');
  pad(282,378,22,9,'#829252'); pad(307,369,25,10,'#72894b');
  pad(390,379,19,8,'#657e49'); pad(474,371,24,10,'#829252');
  pad(552,358,24,10,'#71894d'); pad(585,373,20,8,'#849456');
  // upright lotus stems, buds, seed head and open pink lotus
  line(f,[[114,374],[115,340],[116,314]],'#547443',2);
  poly(f,[[110,319],[116,306],[122,319],[118,325],[113,324]],'#bb6755');
  box(f,115,309,2,8,'#e09a65'); box(f,113,315,2,4,'#d18459');
  line(f,[[516,367],[518,333],[519,301]],'#5f7742',2);
  ellipse(f,519,297,4,6,'#bd7054'); poly(f,[[515,298],[519,288],[523,298],[520,303]],'#d78959');
  // open blossom near right third, readable stepped petals
  line(f,[[321,391],[322,355],[323,326]],'#5f7a43',2);
  poly(f,[[308,329],[312,319],[316,327],[321,316],[325,327],[331,319],[336,330],[332,336],[312,336]],'#d77d91');
  poly(f,[[313,330],[318,323],[321,330],[325,321],[328,331],[333,326],[334,333],[329,338],[315,337]],'#f0b3a0');
  box(f,321,328,7,3,'#e6bd64'); box(f,323,326,3,2,'#f3d57e');
  // Two additional open flowers at different heights give the pond a small lotus colony.
  line(f,[[289,386],[290,361],[291,340]],'#5b7643',2);
  poly(f,[[277,343],[281,334],[285,341],[290,331],[294,341],[300,335],[304,345],[298,350],[281,350]],'#cb7288');
  poly(f,[[282,344],[286,338],[290,344],[293,337],[297,345],[300,346],[296,351],[283,350]],'#efb59f');
  box(f,289,342,7,3,'#e5bf68'); box(f,291,340,3,2,'#f3d57e');
  line(f,[[350,385],[351,356],[353,339]],'#5b7643',2);
  poly(f,[[341,342],[345,334],[349,341],[353,329],[357,341],[363,334],[367,343],[363,349],[345,350]],'#d2768b');
  poly(f,[[346,343],[350,337],[353,343],[357,335],[361,344],[364,345],[359,350],[347,349]],'#f2b9a2');
  box(f,351,341,7,3,'#e5bf68'); box(f,353,339,3,2,'#f3d57e');
  // seed pod on its own stem
  line(f,[[202,385],[203,360],[204,346]],'#657b44',2);
  ellipse(f,204,345,5,4,'#8f8b4d'); box(f,201,343,2,2,'#b6a760'); box(f,205,343,2,2,'#b6a760');
  // stones and tiny shoreline narrative: fallen leaf, blue pottery shard, dragonfly
  for(const [x,y] of [[20,365],[60,376],[137,386],[472,382],[583,369],[626,361]]){
    poly(f,[[x-5,y],[x-2,y-4],[x+4,y-3],[x+7,y],[x+4,y+3],[x-4,y+3]],'#827a5b');
    box(f,x-2,y-2,4,1,'#aaa07b');
  }
  poly(f,[[66,383],[72,379],[78,381],[74,384]],'#bc704b'); box(f,71,380,2,2,'#de9860');
  // Dragonfly pixels above still water
  box(f,273,244,2,7,'#554c38'); box(f,270,245,3,1,'#b4c19a'); box(f,275,242,4,1,'#d0d0a0');
  box(f,270,242,3,1,'#adc2a1');

  return { ground, foreground, mask, bankY, renderObjects(time:number,wind:number) {
    drawObjects(time,wind); return objects;
  }};
}
