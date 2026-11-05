import React from 'react';
import {AbsoluteFill,Audio,Sequence,staticFile,useCurrentFrame} from 'remotion';
import {assertDirectorPlan,shotAtFrame,type DirectorPlan,type DirectorShot} from './contract';
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export const ease=(t:number)=>{const x=clamp(t);return x*x*(3-2*x)};
const sizes:Record<DirectorShot['size'],number>={
 'extreme-wide':1.00,'wide':1.025,'medium':1.11,'close-up':1.23,'extreme-close-up':1.34,'insert':1.24,'pov':1.06
};
export function cameraStyle(shot:DirectorShot,frame:number):React.CSSProperties{
 const duration=Math.max(1,shot.endFrame-shot.startFrame-1);
 const p=ease((frame-shot.startFrame)/duration);
 const amount=shot.camera.amount??.5;
 const drift=amount*46,zoom=amount*.105;
 let sx=0,sy=0,scale=sizes[shot.size];
 switch(shot.camera.move){
  case 'push':scale+=zoom*p;break;
  case 'pull':scale+=zoom*(1-p);break;
  case 'pan-left':case 'truck-left':sx=-drift*p;break;
  case 'pan-right':case 'truck-right':sx=drift*p;break;
  case 'tilt-up':sy=-drift*p;break;
  case 'tilt-down':sy=drift*p;break;
 }
 const focus=shot.camera.focus??{x:.5,y:.5};
 return {transform:'translate('+sx.toFixed(3)+'px,'+sy.toFixed(3)+'px) scale('+scale.toFixed(5)+')',
 transformOrigin:(focus.x*100)+'% '+(focus.y*100)+'%',willChange:'transform'};
}
export function transitionProgress(shot:DirectorShot,frame:number):number{
 const t=shot.transitionIn;
 if(!t||t.frames===0||t.kind==='cut'||t.kind==='match-cut')return 1;
 return ease((frame-shot.startFrame+1)/t.frames);
}
const ImageLayer:React.FC<{shot:DirectorShot;frame:number;children:React.ReactNode;style?:React.CSSProperties}>=
 ({shot,frame,children,style})=><AbsoluteFill style={{overflow:'hidden',...style}}>
  <AbsoluteFill style={cameraStyle(shot,frame)}>{children}</AbsoluteFill>
 </AbsoluteFill>;
export type ShotRenderer=(shot:DirectorShot,globalFrame:number,localFrame:number)=>React.ReactNode;
export const DirectorTimeline:React.FC<{plan:DirectorPlan;renderShot:ShotRenderer;overlay?:(globalFrame:number)=>React.ReactNode}>=
 ({plan,renderShot,overlay})=>{
 const f=useCurrentFrame();
 // Validation is run both by CLI before render and by TS composition at render time.
 assertDirectorPlan(plan);
 const current=shotAtFrame(plan,f);
 if(!current)return <AbsoluteFill style={{background:'#000'}}/>;
 const idx=plan.shots.findIndex(s=>s.id===current.id);
 const previous=idx>0?plan.shots[idx-1]:null;
 const transition=current.transitionIn??{kind:'cut' as const,frames:0,reason:'default'};
 const p=transitionProgress(current,f);
 const active=previous&&transition.frames>0&&f<current.startFrame+transition.frames&&
 !['cut','match-cut'].includes(transition.kind);
 const leaving=plan.shots[idx+1];
 const dip=leaving?.transitionIn?.kind==='dip-to-black'?(leaving.transitionIn.frames||0):0;
 const half=Math.ceil(dip/2);
 const fadeOut=dip>0&&f>=current.endFrame-half?1-ease((f-(current.endFrame-half)+1)/half):1;
 let inStyle:React.CSSProperties={opacity:1};
 if(active){
  if(transition.kind==='dissolve')inStyle={opacity:p};
  if(transition.kind==='wipe-right')inStyle={clipPath:'inset(0 '+((1-p)*100)+'% 0 0)'};
  if(transition.kind==='wipe-left')inStyle={clipPath:'inset(0 0 0 '+((1-p)*100)+'%)'};
  if(transition.kind==='dip-to-black')inStyle={opacity:ease((f-current.startFrame+1)/Math.max(1,Math.ceil(transition.frames/2)))};
 }
 return <AbsoluteFill style={{background:'#060c13',overflow:'hidden',isolation:'isolate'}}>
  {active&&previous&&transition.kind!=='dip-to-black'&&
   <ImageLayer shot={previous} frame={previous.endFrame-1}>{renderShot(previous,previous.endFrame-1,previous.endFrame-1-previous.startFrame)}</ImageLayer>}
  <ImageLayer shot={current} frame={f} style={{...inStyle,opacity:Number(inStyle.opacity??1)*fadeOut}}>
   {renderShot(current,f,f-current.startFrame)}
  </ImageLayer>
  {overlay?.(f)}
  {plan.audio.map(a=><Sequence key={a.id} from={a.startFrame} durationInFrames={a.durationFrames}>
   <Audio src={staticFile(a.src)} volume={a.gain??1}/>
  </Sequence>)}
 </AbsoluteFill>;
};