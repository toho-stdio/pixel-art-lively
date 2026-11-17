import { createCamera, type StudyScene } from './types';
import { NativePainter } from './raster';

const makeCanvas=(w:number,h:number)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const interpolate=(pts:number[][],x:number)=>{for(let i=0;i<pts.length-1;i++){const [x0,y0]=pts[i],[x1,y1]=pts[i+1];if(x<=x1){const t=Math.max(0,Math.min(1,(x-x0)/(x1-x0)));return y0+(y1-y0)*t;}}return pts[pts.length-1][1];};

/** Native-grid re-authoring of the pond scene. Coordinates stay in the source world;
 * every primitive is scan-converted into the requested resolution independently. */
export function createStudyScene(width:number,height:number):StudyScene {
  const camera=createCamera(width,height), ground=makeCanvas(width,height), foreground=makeCanvas(width,height);
  const g=new NativePainter(width,height), f=new NativePainter(width,height,true);
  const top=[[29,190],[49,193],[78,197],[108,193],[145,190],[178,193],[207,198],[238,202],[269,198],[301,203],[330,200],[354,195],[373,190],[388,185],[402,186],[418,191],[441,195],[468,199],[496,202],[524,201],[550,198],[575,193],[598,190],[620,193]];
  const bottom=[[29,335],[38,337],[79,348],[111,355],[153,360],[184,365],[213,376],[246,400],[422,400],[442,379],[468,368],[496,361],[533,357],[568,349],[606,344],[620,338]];
  const mask=new Uint8Array(width*height),bankY=new Int16Array(width);
  for(let x=0;x<width;x++){
    const worldX=(x-(width-640*(height/400))/2)/(height/400);let first=height;
    if(worldX>=29&&worldX<=620){const y0=Math.round(interpolate(top,worldX)),y1=Math.round(interpolate(bottom,worldX));for(let y=Math.max(0,Math.round(y0*height/400));y<Math.min(height,Math.round(y1*height/400));y++){mask[y*width+x]=1;if(first===height)first=y;}}
    bankY[x]=first;
  }
  // Open late-afternoon sky, layered treeline, distant tiled village.
  g.rect(-40,0,720,400,'#d4d7b4');
  g.poly([[0,0],[640,0],[640,122],[602,119],[567,125],[532,116],[503,124],[465,117],[430,126],[390,116],[350,128],[312,117],[280,126],[245,115],[210,122],[174,111],[140,121],[105,110],[71,120],[38,112],[0,120]],'#b9c6a0');
  // Opaque dry-ground underpaint spans the complete camera extension. Later scenery
  // and the authoritative water mask draw over it, so no sky-colored rim gaps remain.
  g.rect(-40,128,720,272,'#53694f');
  g.rect(290,35,70,4,'#e4d9ad');g.rect(310,30,33,4,'#e4d9ad');
  for(let i=0;i<11;i++){const x=-18+i*65,base=120+(i%3),w=28+(i%4)*3,h=10+(i%3)*2;
    g.rect(x+3,base-h,w-6,h,['#9a9879','#ada17b','#8c9272'][i%3]);
    g.poly([[x,base-h+2],[x+w*.48,base-h-7],[x+w,base-h+2],[x+w-2,base-h+5],[x+w*.48,base-h-3],[x+2,base-h+6]],['#986047','#a46745','#b2764b'][i%3]);
    for(let t=0;t<3;t++)g.rect(x+7+t*7,base-h+3,2,4,'#554b37');
  }
  for(let x=12;x<88;x+=9){g.line([[x,129],[x-2,82+(x%5)*4]],'#4e6845',2);for(let y=91;y<124;y+=12)g.rect(x-2,y,5,2,'#829052');}
  for(let x=460;x<548;x+=9){g.line([[x,130],[x+(x%5)-2,87+(x%4)*4]],'#405b3d',2);for(let y=99;y<128;y+=11)g.rect(x,y,6,2,'#71894d');}
  // Bank silhouette and shaded masonry face.
  // Continue the horizon and dry outer bank into the 16:9 camera side extensions.
  // The pond mask remains bounded by its authored shoreline; these are dry terrain only.
  g.poly([[-40,0],[0,0],[0,115],[-40,114]],'#b9c6a0');
  g.poly([[640,0],[680,0],[680,127],[640,127]],'#b9c6a0');
  g.poly([[-40,115],[0,115],[29,190],[29,335],[0,330],[-40,322]],'#53694f');
  g.poly([[620,193],[640,127],[680,127],[680,328],[640,334],[620,338]],'#53694f');
  g.poly([[-40,322],[0,330],[29,335],[29,400],[-40,400]],'#394e3a');
  g.poly([[620,338],[640,334],[680,328],[680,400],[620,400]],'#344c38');
  g.poly([[0,115],[90,122],[158,128],[218,120],[278,127],[336,123],[391,130],[448,123],[504,130],[562,123],[640,127],[640,193],[620,193],[29,190],[0,185]],'#53694f');
  // Close every native pixel of the rear bank up to the authoritative water edge.
  // This underpaint sits below later garden/temple details and prevents sky-colored seams.
  const rearHorizon=[[0,115],[90,122],[158,128],[218,120],[278,127],[336,123],[391,130],[448,123],[504,130],[562,123],[640,127]];
  for(let px=0;px<width;px++){
    const wx=(px-camera.offsetX)/camera.scale;if(wx<0||wx>640)continue;
    const start=Math.max(0,Math.round(interpolate(rearHorizon,wx)*height/400));
    for(let py=start;py<bankY[px];py++)g.pixel(px,py,'#53694f');
  }
  g.poly([[0,151],[18,140],[34,146],[49,132],[68,143],[88,139],[104,151],[124,153],[124,166],[0,171]],'#405b42');
  g.poly([[236,153],[248,143],[261,148],[274,136],[291,146],[304,141],[318,151],[332,139],[351,145],[368,138],[383,149],[386,170],[236,170]],'#465f43');
  // Foliage masses get overlapping directional leaf clumps and native-scale highlights.
  for(const [x,y] of [[9,146],[28,139],[48,144],[68,137],[91,147],[245,149],[268,142],[291,150],[319,145],[345,149],[366,145]]){
    g.rect(x,y,8,4,'#607746');g.rect(x+2,y-2,7,4,'#71844a');g.rect(x+3,y,2,2,'#94a05a');g.rect(x-2,y+3,4,2,'#354f3d');
  }
  for(let x=235;x<385;x+=14){g.rect(x,161,12,5,x%3?'#716b50':'#898064');g.rect(x+2,162,3,2,'#a29571');}
  // Earthen pond rim: irregular red-brown brick courses, staggered joints and moss.
  // Rear bank face is rasterized in target-native columns; bankY is native too.
  for(let px=0;px<width;px++){
    const wx=(px-camera.offsetX)/camera.scale;if(wx<29||wx>620)continue;
    const y0=bankY[px],depth=Math.round(21*camera.scale);
    for(let d=0;d<depth&&y0+d<height;d++)g.pixel(px,y0+d,d<Math.round(4*camera.scale)?'#827451':d<Math.round(12*camera.scale)?'#625b42':'#494d3a');
  }
  for(let row=0;row<4;row++)for(let x=-24+(row%2)*8;x<650;x+=16){const y0=interpolate(top,Math.max(29,Math.min(620,x))),y1=interpolate(top,Math.max(29,Math.min(620,x+12))),yt=y0+1+row*6,yr=y1+1+row*6;
    g.poly([[x,yt],[x+12,yr],[x+12,yr+4],[x,yt+4]],row%2?'#8e5941':'#a3694b');g.line([[x+2,yt+1],[x+10,yr+1]],'#ba805a');if((x*7+row)%4===0)g.rect(x+4,Math.min(yt,yr)-1,5,2,'#65764b');
  }
  for(let x=-20;x<660;x+=4){const y=interpolate(top,Math.max(29,Math.min(620,x)))-2;g.rect(x,y,2,1,x%3?'#899164':'#b39b61');}
  // Courtyard, flagstone path and six descending steps at the temple inlet.
  g.poly([[370,126],[640,121],[640,188],[382,185]],'#76694e');
  for(let y=139;y<181;y+=7)for(let x=391+(y%2)*5;x<650;x+=17){g.rect(x,y,12,2,'#978367');g.rect(x+2,y+3,5,1,'#5f6048');}
  g.poly([[267,139],[313,141],[365,153],[391,165],[382,172],[348,159],[307,151],[264,148]],'#877d61');
  for(let i=0;i<8;i++){const x=273+i*13,y=142+Math.floor(i*2.7);g.poly([[x,y],[x+10,y+1],[x+13,y+4],[x+2,y+4]],i%2?'#a79a76':'#b1a27d');g.rect(x+3,y+1,3,1,'#d0bc8c');}
  g.poly([[356,150],[407,151],[418,202],[349,200]],'#77715a');
  for(let i=0;i<6;i++){const y=151+i*6,inset=i*3;g.poly([[358-inset,y],[405+inset,y],[405+inset,y+4],[358-inset,y+4]],i%2?'#91866a':'#a39776');g.line([[358-inset,y],[405+inset,y]],'#c1aa7a');g.rect(367-inset,y+3,8,1,'#53624a');}
  // Water-colored backing gives the study a complete render even before water effects.
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(mask[y*width+x])g.pixel(x,y,'#344e49');
  g.toCanvas(ground);

  // Fixed background objects and tree, with broad volume preserved by connected crown masses.
  const drawTemple=(p:NativePainter)=>{
    p.poly([[404,127],[607,125],[626,143],[396,147]],'#332f28');p.rect(421,109,183,35,'#604b36');p.rect(427,115,171,26,'#795a3d');
    for(let x=432;x<596;x+=23){p.rect(x,118,15,24,'#292f2b');p.rect(x+2,120,2,20,'#886442');p.rect(x+10,121,1,18,'#a57b4d');}
    p.rect(429,114,170,4,'#b37e47');p.rect(429,141,171,3,'#352f27');
    for(let x=424;x<=601;x+=35){p.rect(x,111,6,34,'#543827');p.rect(x+1,113,2,29,'#b47b49');p.rect(x-2,141,10,4,'#c1945b');}
    p.poly([[391,111],[412,95],[450,82],[548,82],[589,94],[620,111],[613,116],[579,106],[548,101],[451,101],[423,108],[398,118]],'#49352c');
    p.poly([[397,108],[418,93],[451,81],[548,81],[585,92],[615,108],[610,111],[578,100],[547,96],[451,96],[424,102],[401,114]],'#bd6741');
    for(let row=0;row<6;row++){const y=84+row*3.7,left=441-row*8,right=561+row*10;for(let x=left+(row%2)*4;x<right;x+=7){p.rect(x,y,5,2,(x+row)%3?'#a85337':'#d08350');p.rect(x+2,y+1,2,1,'#e19a5d');}p.line([[left,y+3],[right,y+3]],'#814534');}
    p.rect(414,142,205,5,'#463c30');p.rect(409,146,215,4,'#9b8865');for(let x=414;x<619;x+=18){p.rect(x,150,15,5,'#8a8066');p.rect(x+2,151,1,3,'#5c5a49');p.rect(x+5,150,9,1,'#c0ad83');}
    p.line([[392,110],[409,96],[449,82],[550,82],[588,94],[619,109]],'#342b28',2);
    for(const x of [460,550]){p.rect(x,108,2,5,'#dfb85f');p.rect(x-2,113,6,5,'#a84232');p.rect(x,114,2,3,'#f0c66a');}
    for(const x of [451,480,520,548]){p.rect(x,79,2,3,'#dfb36b');p.rect(x-1,77,4,2,'#70513a');}
  };
  const drawTree=(p:NativePainter,sway:number)=>{
    p.poly([[0,69],[8,54],[23,49],[29,36],[47,31],[61,24],[78,29],[93,20],[112,25],[128,20],[145,27],[163,23],[179,33],[198,31],[211,42],[229,49],[235,63],[246,73],[237,86],[241,99],[222,105],[214,118],[194,116],[180,128],[162,121],[145,133],[128,124],[109,132],[92,122],[76,129],[59,118],[39,123],[27,111],[11,109],[7,95],[0,86]],'#30493a');
    // Layered, interlocking branch clumps: spacing reduces with output pixel size, adding authored detail.
    const step=Math.max(3.2,5.4/p.scale), colors=['#3b5a3d','#405f3e','#456540','#496941','#4c6b40'];let n=0;
    for(let y=31;y<127;y+=step*1.55)for(let x=8+(Math.floor(y/step)%2)*step*.5;x<238;x+=step){const u=(x-122)/124,v=(y-75)/61;if(u*u+v*v>1)continue;
      const w=step*(1.35+(n%3)*.11),h=step*(.83+(n%4)*.08),jx=((n*13)%5)-2,jy=((n*7)%5)-2;
      p.poly([[x-w+jx,y+jy],[x-w*.85+jx,y-h*.55+jy],[x-w*.36+jx,y-h+jy],[x+w*.35+jx,y-h*.86+jy],[x+w+jx,y-h*.12+jy],[x+w*.75+jx,y+h*.55+jy],[x+jx,y+h+jy],[x-w*.72+jx,y+h*.48+jy]],colors[n%colors.length]);
      if(n%3===0){p.poly([[x-w*.52+jx,y-h*.46+jy],[x-w*.25+jx,y-h*.79+jy],[x+w*.25+jx,y-h*.73+jy],[x+w*.47+jx,y-h*.35+jy],[x+jx,y-h*.27+jy]],n%2?'#71864c':'#829052');}
      if(n%5===2)p.poly([[x+w*.55+jx,y+jy],[x+w+jx,y-h*.12+jy],[x+w*.72+jx,y+h*.55+jy]],'#293f35');n++;
    }
    p.line([[128,159],[118,139],[102,125],[84,119],[65,108],[52,91]],'#514736',7);p.line([[132,147],[146,129],[161,114],[182,104],[205,92],[224,78]],'#574a36',6);p.line([[121,147],[109,131],[102,112],[100,94]],'#61513a',5);p.line([[139,145],[145,126],[143,108],[151,88]],'#4a4333',4);
    p.poly([[95,186],[112,153],[117,118],[126,96],[138,96],[148,122],[146,157],[158,183],[169,205],[81,207]],'#554b38');p.poly([[106,187],[121,151],[124,116],[132,101],[139,109],[135,151],[146,183],[151,199]],'#786548');
    p.poly([[111,188],[101,164],[105,139],[110,115],[116,107],[119,121],[115,149],[121,174],[128,195]],'#66563b');p.poly([[143,183],[151,160],[147,136],[151,113],[158,106],[161,124],[157,149],[165,177],[174,198]],'#4d4935');
    // Deep grooves plus fine cambium highlights are deliberately elongated, not speckle noise.
    for(let i=0;i<12;i++){const x=111+i*4.1,top=116+(i%3)*5;p.line([[x,top],[x+(i%3)-1,148+(i%4)*3],[x+2,180+(i%3)*4]],i%3===0?'#b08c58':i%3===1?'#403e31':'#91734b',i%4===0?2:1);}
    p.poly([[116,164],[108,187],[55,201],[27,214],[35,220],[90,209],[123,193]],'#64543b');p.poly([[130,166],[146,187],[206,197],[238,214],[230,219],[169,208],[129,194]],'#705d3d');
    p.line([[114,183],[95,198],[59,210]],'#a28957',2);p.line([[143,184],[166,197],[207,207]],'#9c8050',2);
    for(const [x,y,end] of [[74,83,177],[87,88,189],[101,91,164],[157,81,178],[172,88,165],[188,91,155],[203,97,143]] as number[][]){const lean=x<130?-2:2;p.line([[x+sway,y],[x+lean+sway,y+25],[x+lean*2+sway,end]],'#776347',2);p.rect(x+lean*2+sway,end,2,5,'#a28553');}
  };
  const objectCache=new Map<number,HTMLCanvasElement>();
  const renderObjects=(time:number,wind:number)=>{const sway=Math.round(Math.sin(time*1.3)*Math.max(0,wind)*1.4),key=sway;if(objectCache.has(key))return objectCache.get(key)!;const frame=makeCanvas(width,height),painter=new NativePainter(width,height,true);drawTemple(painter);drawTree(painter,sway);painter.toCanvas(frame);objectCache.set(key,frame);return frame;};

  // Transparent near bank; chunky grasses, native-detail lily pads and carefully layered lotus petals.
  f.poly([[-40,322],[0,330],[29,335],[29,400],[-40,400]],'#394e3a');
  f.poly([[620,338],[640,334],[680,328],[680,400],[620,400]],'#344c38');
  f.poly([[0,330],[38,337],[79,348],[111,355],[153,360],[184,365],[213,376],[246,400],[0,400]],'#394e3a');
  f.poly([[422,400],[442,379],[468,368],[496,361],[533,357],[568,349],[606,344],[640,334],[640,400]],'#344c38');
  for(const [cx,base,n] of [[24,365,7],[78,375,5],[177,385,6],[453,382,6],[541,373,7],[613,364,8]])for(let i=0;i<n;i++){const x=cx+(i-n/2)*3,h=8+(i*7%17);f.poly([[x,base],[x+2,base],[x+(i%3)-2,base-h],[x,base-h+4]],i%3?'#70824a':'#a28e52');f.rect(x+1,base-h+3,2,2,'#a9a05b');}
  const pad=(x:number,y:number,rx:number,ry:number,col:string)=>{f.ellipse(x,y,rx,ry,'#314d3e');f.ellipse(x-1,y-1,rx-1,ry-1,col);f.poly([[x,y],[x+rx,y-2],[x+rx-2,y+2]],'#253f37');f.line([[x,y],[x-2,y-ry+2]],'#a7b36b');f.line([[x-rx*.5,y-2],[x-2,y-ry*.65]],'#9aaa63');f.rect(x-rx+3,y-2,4,1,'#bdab67');};
  for(const q of [[62,350,23,10,'#72894b'],[91,365,19,8,'#819454'],[145,376,24,10,'#829252'],[174,365,20,9,'#657e49'],[282,378,22,9,'#829252'],[307,369,25,10,'#72894b'],[390,379,19,8,'#657e49'],[474,371,24,10,'#829252'],[552,358,24,10,'#71894d'],[585,373,20,8,'#849456']] as (string|number)[][])pad(q[0] as number,q[1] as number,q[2] as number,q[3] as number,q[4] as string);
  const flower=(x:number,y:number,s:number,main:string)=>{for(let i=0;i<7;i++){const a=i*Math.PI*2/7-Math.PI/2,px=x+Math.cos(a)*6*s,py=y+Math.sin(a)*4*s;f.poly([[x-2*s,y],[px-2*s,py-2*s],[px,py-5*s],[px+2*s,py-2*s],[x+2*s,y+2*s]],main);f.line([[x, y],[px,py-2*s]],'#f2b59e');}f.ellipse(x,y,3*s,2*s,'#e9bd66');f.rect(x-s,y-s,2*s,1*s,'#f2d57e');};
  f.line([[114,374],[115,340],[116,314]],'#547443',2);f.poly([[110,319],[116,306],[122,319],[118,325],[113,324]],'#bb6755');f.rect(115,309,2,8,'#e09a65');
  f.line([[516,367],[518,333],[519,301]],'#5f7742',2);f.ellipse(519,297,4,6,'#bd7054');f.poly([[515,298],[519,288],[523,298],[520,303]],'#d78959');
  f.line([[321,391],[322,355],[323,326]],'#5f7a43',2);flower(322,328,1,'#d77d91');flower(291,342,.85,'#cb7288');flower(353,342,.9,'#d2768b');
  f.line([[289,386],[290,361],[291,340]],'#5b7643',2);f.line([[350,385],[351,356],[353,339]],'#5b7643',2);
  f.line([[202,385],[203,360],[204,346]],'#657b44',2);f.ellipse(204,345,5,4,'#8f8b4d');
  for(const [x,y] of [[20,365],[60,376],[137,386],[472,382],[583,369],[626,361]]){f.poly([[x-5,y],[x-2,y-4],[x+4,y-3],[x+7,y],[x+4,y+3],[x-4,y+3]],'#827a5b');f.rect(x-2,y-2,4,1,'#aaa07b');}
  f.toCanvas(foreground);
  return {ground,foreground,mask,bankY,renderObjects,camera};
}
