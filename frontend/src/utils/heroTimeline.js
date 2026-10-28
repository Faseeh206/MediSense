// Every state is a pure function of scroll position; there is no accumulated physics.
export const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
export const smooth=v=>{const t=clamp(v);return t*t*(3-2*t);};
export const phase=(p,a,b)=>smooth((p-a)/(b-a));
export const CARD_STAGES=[
 {start:0.36,position:[-3.05,1.35,1],label:'LAB REPORT DECODER',title:'Beyond the numbers.',body:'Understand your markers, ranges, and what to ask next.'},
 {start:0.57,position:[2.8,-1.6,1],label:'MEDICINE, EXPLAINED',title:'Context for your care.',body:'Clear medicine insights for better conversations.'},
 {start:0.78,position:[2.85,1.55,1],label:'SIMPLE CLINICAL GUIDANCE',title:'A clearer next step.',body:'Prepare thoughtful questions for your clinician.'},
];
export const BEAD_COUNT=30;
export const BEAD_COLORS=['#c77724','#f6e9d3','#bd6189'];
export function orbitPoint(index,p){const ring=index%3,a=index*2.399963+(p-0.12)*Math.PI*3.5,t=[-0.24,0.74,-0.92][ring],x=Math.cos(a)*(2.25+ring*0.12),y=Math.sin(a)*(0.8+ring*0.2);return [x*Math.cos(t)-y*Math.sin(t),x*Math.sin(t)+y*Math.cos(t),Math.sin(a)*0.8+0.4];}
export function insidePoint(index){const y=(Math.floor(index/3)-4.5)*0.24,x=(index%3-1)*0.27,r=0.56;return [x*Math.cos(r)-y*Math.sin(r),x*Math.sin(r)+y*Math.cos(r),((index*7)%3-1)*0.23];}
export function beadState(index,progress){
 const p=clamp(progress),release=phase(p,0.15+(index%5)*0.012,0.31+(index%5)*0.008),inner=insidePoint(index),orbit=orbitPoint(index,p);
 let position=inner.map((n,i)=>n+(orbit[i]-n)*release),scale=0.115+(index%4)*0.019;
 if(index<9){const c=CARD_STAGES[Math.floor(index/3)];if(p>=c.start){const t=phase(p,c.start,c.start+0.08),o=orbitPoint(index,c.start),d=c.position,control=[(o[0]+d[0])/2,(o[1]+d[1])/2+0.75,2];position=o.map((n,i)=>(1-t)**2*n+2*(1-t)*t*control[i]+t*t*d[i]);scale*=1-phase(p,c.start+0.075,c.start+0.11);}}
 return {position,scale,visible:scale>0.001};
}
export function cardProgress(p,index){const s=CARD_STAGES[index].start;return phase(p,s+0.08,s+0.14);}
export function sceneState(p){p=clamp(p);return {opening:phase(p,0.07,0.22),release:phase(p,0.16,0.34),center:phase(p,0.13,0.32),dnaRotation:p*Math.PI*1.5};}
