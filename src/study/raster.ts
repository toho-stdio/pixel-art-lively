/** Integer-native software painter for the study. Geometry is authored in the original
 * 640×400 world and mapped directly to this target grid; no filtered bitmap scaling. */
export class NativePainter {
  readonly pixels: Uint8ClampedArray;
  readonly scale: number;
  private readonly offsetX: number;
  constructor(readonly width: number, readonly height: number, readonly transparent = false) {
    this.scale = height / 400;
    this.offsetX = (width - 640 * this.scale) / 2;
    this.pixels = new Uint8ClampedArray(width * height * 4);
  }
  clear() { this.pixels.fill(0); }
  private point(x:number,y:number):[number,number] { return [Math.round(x*this.scale+this.offsetX),Math.round(y*this.scale)]; }
  private color(color:string):[number,number,number,number] {
    const n=parseInt(color.slice(1),16); return [(n>>16)&255,(n>>8)&255,n&255,255];
  }
  pixel(x:number,y:number,color:string) {
    if(x<0||y<0||x>=this.width||y>=this.height)return;
    const i=(y*this.width+x)*4,[r,g,b,a]=this.color(color);
    this.pixels[i]=r;this.pixels[i+1]=g;this.pixels[i+2]=b;this.pixels[i+3]=a;
  }
  rect(x:number,y:number,w:number,h:number,c:string) {
    const [x0,y0]=this.point(x,y),[x1,y1]=this.point(x+w,y+h);
    for(let yy=Math.max(0,Math.min(y0,y1));yy<Math.min(this.height,Math.max(y0,y1));yy++)
      for(let xx=Math.max(0,Math.min(x0,x1));xx<Math.min(this.width,Math.max(x0,x1));xx++) this.pixel(xx,yy,c);
  }
  line(points:number[][],c:string,weight=1) {
    const p=points.map(([x,y])=>this.point(x,y)),thick=Math.max(1,Math.round(weight*this.scale));
    for(let k=0;k<p.length-1;k++){
      let [x0,y0]=p[k], [x1,y1]=p[k+1]; const dx=Math.abs(x1-x0), sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1;let err=dx+dy;
      for(;;){for(let oy=0;oy<thick;oy++)for(let ox=0;ox<thick;ox++)this.pixel(x0+ox-Math.floor(thick/2),y0+oy-Math.floor(thick/2),c);if(x0===x1&&y0===y1)break;const e=2*err;if(e>=dy){err+=dy;x0+=sx;}if(e<=dx){err+=dx;y0+=sy;}}
    }
  }
  poly(points:number[][],c:string) {
    const pts=points.map(([x,y])=>this.point(x,y)); if(pts.length<3)return;
    const minY=Math.max(0,Math.min(...pts.map(p=>p[1]))),maxY=Math.min(this.height-1,Math.max(...pts.map(p=>p[1])));
    for(let y=minY;y<=maxY;y++){
      const xs:number[]=[];
      for(let i=0,j=pts.length-1;i<pts.length;j=i++){
        const [x1,y1]=pts[i],[x2,y2]=pts[j];if((y1<=y&&y2>y)||(y2<=y&&y1>y))xs.push(Math.floor(x1+(y-y1)*(x2-x1)/(y2-y1)));
      }
      xs.sort((a,b)=>a-b);for(let i=0;i+1<xs.length;i+=2)for(let x=Math.max(0,xs[i]);x<=Math.min(this.width-1,xs[i+1]);x++)this.pixel(x,y,c);
    }
  }
  ellipse(cx:number,cy:number,rx:number,ry:number,c:string) {
    const [x,y]=this.point(cx,cy),a=Math.max(1,Math.round(rx*this.scale)),b=Math.max(1,Math.round(ry*this.scale));
    for(let yy=-b;yy<=b;yy++){const half=Math.floor(a*Math.sqrt(Math.max(0,1-(yy*yy)/(b*b))));for(let xx=-half;xx<=half;xx++)this.pixel(x+xx,y+yy,c);}
  }
  toCanvas(canvas:HTMLCanvasElement) {
    const ctx=canvas.getContext('2d')!, image=ctx.createImageData(this.width,this.height);image.data.set(this.pixels);ctx.putImageData(image,0,0);
  }
}
