import SpringText from './spring-text';
import {useEffect,useRef} from 'react';
import {ArrowUpRight,ArrowUp} from 'lucide-react';
import {useReducedMotion} from '../../hooks/useReducedMotion';
import {scrollToPosition} from '../../utils/scroll';
function hwfRadius(c,gap){return Math.sqrt(Math.min(1,Math.max(0,c)))*gap*0.47;}
function hwfStep(x,y,vx,vy,hx,hy,px,py,r){const dx=x-px,dy=y-py,d=Math.hypot(dx,dy)+0.001;if(r>0&&d<r){const f=(1-d/r)*2.6;vx+=dx/d*f;vy+=dy/d*f;}vx=(vx+(hx-x)*0.05)*0.84;vy=(vy+(hy-y)*0.05)*0.84;return [x+vx,y+vy,vx,vy];}
function hwfWarmth(x,y,hx,hy,span){return span>0?Math.min(1,Math.hypot(x-hx,y-hy)/span):0;}
function hwfFitSize(measured,width){return measured>0?width/measured*100:0;}
function hwfColor(hex){const value=hex.trim().replace('#','');return [0,2,4].map(start=>parseInt(value.slice(start,start+2),16));}
const COPYRIGHT_YEAR = new Date().getFullYear();
export default function HalftoneWordmarkFooter({wordmark='medisense',label='MediSense',meta='A little clarity goes a long way.',columns=[],dotGap=5,radius=80,crop=0.12,interactive=true}){
 const root=useRef(),canvas=useRef(),reduce=useReducedMotion();
 useEffect(()=>{
  const el=root.current,c=canvas.current,ctx=c.getContext('2d');if(!ctx)return;
  let dots=[],w=0,h=0,dpr=1,raf=0,visible=true,disposed=false,last=0,ring=null,px=-1e5,py=-1e5;
  let ink=[90,66,49],warm=[188,103,52];
  const fine=window.matchMedia('(pointer:fine)').matches;
  const draw=now=>{
   raf=0;if(disposed||!visible)return;const dt=last?Math.min((now-last)/16.667,2):1;last=now;let moving=false;
   ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
   const age=ring?now-ring.t:1e5;
   for(const d of dots){if(!reduce){if(age<850){const dx=d.hx-ring.x,dy=d.hy-ring.y,dist=Math.hypot(dx,dy)+0.001,band=1-Math.min(1,Math.abs(dist-age*0.7)/26);d.vx+=dx/dist*band*2*(1-age/850);d.vy+=dy/dist*band*2*(1-age/850);}
     const s=hwfStep(d.x,d.y,d.vx,d.vy,d.hx,d.hy,px,py,interactive&&fine?radius:0);d.x+=(s[0]-d.x)*dt;d.y+=(s[1]-d.y)*dt;d.vx=s[2];d.vy=s[3];
     if(Math.abs(d.vx)+Math.abs(d.vy)>0.02||Math.hypot(d.x-d.hx,d.y-d.hy)>0.06)moving=true;else{d.x=d.hx;d.y=d.hy;d.vx=d.vy=0;}}
    const a=hwfWarmth(d.x,d.y,d.hx,d.hy,25);ctx.fillStyle='rgb('+ink.map((v,i)=>Math.round(v+(warm[i]-v)*a)).join(',')+')';ctx.beginPath();ctx.arc(d.x,d.y,d.r,0,Math.PI*2);ctx.fill();
   }
   if(moving||age<850)raf=requestAnimationFrame(draw);
  };
  const wake=()=>{if(!raf&&!disposed&&visible){last=0;raf=requestAnimationFrame(draw);}};
  const updatePalette=()=>{const style=getComputedStyle(el);ink=hwfColor(style.getPropertyValue('--footer-wordmark'));warm=hwfColor(style.getPropertyValue('--footer-warm'));wake();};
  const layout=()=>{
   if(disposed)return;w=el.clientWidth;h=el.clientHeight;dpr=Math.min(window.devicePixelRatio||1,1.5);c.width=w*dpr;c.height=h*dpr;
   const mask=document.createElement('canvas');mask.width=w;mask.height=h;const m=mask.getContext('2d',{willReadFrequently:true});if(!m)return;
   const face=getComputedStyle(el).getPropertyValue('--font-serif').trim()||'Georgia';m.font='400 100px '+face;const size=hwfFitSize(m.measureText(wordmark).width,w*1.01);m.font='400 '+size+'px '+face;const b=m.measureText(wordmark);m.textBaseline='alphabetic';m.fillText(wordmark,(w-b.width)/2,h+(b.actualBoundingBoxAscent||size*0.7)*crop);
   const data=m.getImageData(0,0,w,h).data,gap=w<600?4:Math.max(4,dotGap);dots=[];
   for(let y=Math.max(0,Math.floor(h-size));y<h;y+=gap)for(let x=0;x<w;x+=gap){let sum=0;for(let iy=0;iy<3;iy++)for(let ix=0;ix<3;ix++){const sx=Math.min(w-1,Math.floor(x+(ix+0.5)*gap/3)),sy=Math.min(h-1,Math.floor(y+(iy+0.5)*gap/3));sum+=data[(sy*w+sx)*4+3];}const cov=sum/(9*255);if(cov>0.06)dots.push({x:x+gap/2,y:y+gap/2,hx:x+gap/2,hy:y+gap/2,vx:0,vy:0,r:hwfRadius(cov,gap)});}
   wake();
  };
  const pointer=e=>{const r=el.getBoundingClientRect();px=e.clientX-r.left;py=e.clientY-r.top;wake();};
  const leave=()=>{px=py=-1e5;wake();};
  const click=e=>{if(reduce||!interactive||e.target.closest('a,button'))return;const r=el.getBoundingClientRect();ring={x:e.clientX-r.left,y:e.clientY-r.top,t:performance.now()};wake();};
  const resize=new ResizeObserver(layout);resize.observe(el);
  // Theme changes also repaint the canvas; CSS alone cannot recolor its dots.
  const themeObserver=new MutationObserver(updatePalette);themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)wake();else{cancelAnimationFrame(raf);raf=0;}},{rootMargin:'100px'});observer.observe(el);
  el.addEventListener('pointermove',pointer,{passive:true});el.addEventListener('pointerleave',leave);el.addEventListener('click',click);document.fonts.ready.then(layout);updatePalette();layout();
  return()=>{disposed=true;cancelAnimationFrame(raf);resize.disconnect();observer.disconnect();themeObserver.disconnect();el.removeEventListener('pointermove',pointer);el.removeEventListener('pointerleave',leave);el.removeEventListener('click',click);};
 },[wordmark,dotGap,radius,crop,interactive,reduce]);
 return <footer className="hwf-root" ref={root}><canvas ref={canvas} aria-hidden="true"/><div className="hwf-top section-shell"><div className="hwf-brand"><a href="#hero" className="wordmark">{label}</a><p>{meta}</p><small>For understanding, not a diagnosis.<br/>Always consult a qualified clinician.</small></div>{columns.map(col=><nav key={col.title} aria-label={col.title}><SpringText tag="h3">{col.title}</SpringText>{col.links.map(link=><a href={link.href} key={link.label}>{link.label}<ArrowUpRight size={13}/></a>)}</nav>)}<button className="hwf-up" onClick={()=>scrollToPosition(0,reduce)}>Back to top <ArrowUp size={16}/></button></div><div className="hwf-meta section-shell"><span>© {COPYRIGHT_YEAR} MediSense</span><span>Understanding is a good place to start.</span></div></footer>;
}
