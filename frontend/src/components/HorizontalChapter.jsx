import SpringText from './ui/spring-text';
import {useCallback,useRef,useState} from 'react';
import {useGSAP} from '@gsap/react';
import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {ArrowLeft,ArrowRight} from 'lucide-react';
import {useReducedMotion} from '../hooks/useReducedMotion';
import {scrollToPosition} from '../utils/scroll';
import {createChapterDepth} from '../utils/siteMotion';
gsap.registerPlugin(ScrollTrigger);
export default function HorizontalChapter({id,kicker,title,description,children,count,variant='',showProgress=true}){
 const root=useRef(),stage=useRef(),viewport=useRef(),track=useRef(),trigger=useRef(),bar=useRef();
 const colorField=useRef(),depth=useRef(null),activeRef=useRef(0);
 const [active,setActive]=useState(0);const reduce=useReducedMotion();
 const updateColor=useCallback(progress=>{
  if(!colorField.current)return;
  const p=Math.max(0,Math.min(1,progress))*2;
  Array.from(colorField.current.children).forEach((layer,index)=>{
   layer.style.opacity=String(Math.max(0,1-Math.abs(p-index)));
  });
 },[]);
 const updateProgress=useCallback(progress=>{
  const p=Math.max(0,Math.min(1,progress));
  if(bar.current)bar.current.style.transform='scaleX('+p+')';
  updateColor(p);
  if(depth.current)depth.current.seek(p*depth.current.duration,true);
  const next=Math.min(count-1,Math.round(p*(count-1)));
  if(next!==activeRef.current){activeRef.current=next;setActive(next);}
 },[count,updateColor]);
 useGSAP(()=>{if(reduce)return;const mm=gsap.matchMedia();mm.add('(min-width: 1000px) and (min-height: 650px) and (prefers-reduced-motion: no-preference)',()=>{
  const artwork=track.current.querySelectorAll('.precision-art');
  const scene=artwork.length?createChapterDepth(artwork):null;
  depth.current=scene;
  const distance=()=>Math.max(0,track.current.scrollWidth-viewport.current.clientWidth);
  const tween=gsap.to(track.current,{x:()=>-distance(),ease:'none',scrollTrigger:{id,trigger:root.current,start:'top top',end:()=>'+='+Math.max(distance(),400),pin:stage.current,scrub:true,invalidateOnRefresh:true,onUpdate:self=>updateProgress(self.progress)}});
  trigger.current=tween.scrollTrigger;
  updateProgress(trigger.current.progress);
  let stopped=false;document.fonts.ready.then(()=>{if(!stopped)ScrollTrigger.refresh();});
  return()=>{stopped=true;trigger.current=null;scene?.revert();depth.current=null;};
 });
 mm.add('(max-width: 999px), (max-height: 649px)',()=>{
  const el=viewport.current;
  updateProgress(el.scrollLeft/Math.max(1,el.scrollWidth-el.clientWidth));
 });
 return()=>mm.revert();},{scope:root,dependencies:[count,reduce,updateProgress],revertOnUpdate:true});
 const moveTo=index=>{const n=Math.max(0,Math.min(count-1,index)),t=trigger.current;if(t){scrollToPosition(t.start+(t.end-t.start)*n/(count-1),reduce);}else{const item=track.current.children[n];viewport.current.scrollTo({left:item.offsetLeft-track.current.offsetLeft,behavior:reduce?'instant':'smooth'});}activeRef.current=n;setActive(n);};
 return <section id={id} ref={root} className={'horizontal-chapter '+variant} aria-labelledby={id+'-title'}>
  <div ref={stage} className="chapter-stage">
   {variant==='precision-chapter'&&<div className="precision-color-field" ref={colorField} aria-hidden="true"><span/><span/><span/></div>}
   <div className="chapter-heading section-shell"><div><span className="section-kicker">{kicker}</span><SpringText tag="h2" id={id+'-title'}>{title}</SpringText></div><p>{description}</p></div>
   <div className="chapter-viewport" ref={viewport} onScroll={()=>{if(trigger.current)return;const el=viewport.current;updateProgress(el.scrollLeft/Math.max(1,el.scrollWidth-el.clientWidth));}}>
    <div className="chapter-track" ref={track} onFocusCapture={e=>{const panel=e.target.closest('[data-panel]');if(panel&&trigger.current){const i=Number(panel.dataset.panel);if(i!==active)moveTo(i);}}}>{children}</div>
   </div>
   <div className="chapter-navigation section-shell"><span>Explore at your pace <ArrowRight size={14}/></span>{showProgress&&<div className="chapter-meter" aria-hidden="true"><span ref={bar}/></div>}<div className="chapter-controls"><span aria-live="polite">{String(active+1).padStart(2,'0')} / {String(count).padStart(2,'0')}</span><button className="icon-button" disabled={active===0} aria-label={'Previous '+kicker.toLowerCase()+' item'} onClick={()=>moveTo(active-1)}><ArrowLeft size={18}/></button><button className="icon-button" disabled={active===count-1} aria-label={'Next '+kicker.toLowerCase()+' item'} onClick={()=>moveTo(active+1)}><ArrowRight size={18}/></button></div></div>
  </div>
 </section>;
}
