import {buildVisualClock,visualProgress} from '../../director/rhythm';
import React from 'react';
import {AbsoluteFill,Audio,Sequence,staticFile,useCurrentFrame} from 'remotion';
import {FilmFrame} from './HKContinuousStoryV3';
import story from '../../../projects/hongkong-wind-lyrics-20261031/story-rhythm.json';
import rhythm from '../../../projects/hongkong-wind-lyrics-20261031/rhythm-timeline.json';
export const RHYTHM_V4_FRAMES=rhythm.totalFrames;
const visualClock=buildVisualClock(rhythm.blocks,rhythm.totalFrames);
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const ease=(p:number)=>{const t=clamp(p);return t*t*(3-2*t)};
const font='"Microsoft YaHei","PingFang SC","Noto Sans CJK SC",sans-serif';
type Phrase=(typeof rhythm.blocks)[number]['phrases'][number];
type Block=(typeof rhythm.blocks)[number];
const getState=(f:number)=>{
 const b=rhythm.blocks.find(x=>f>=x.startFrame&&f<x.endFrame);
 if(!b)return {block:null as Block|null,phrase:null as Phrase|null,phase:'intro'};
 const p=b.phrases.find(x=>f>=x.startFrame&&f<x.startFrame+x.voiceFrames);
 if(p)return {block:b,phrase:p,phase:'voice'};
 if(b.phrases.some(x=>f>=x.startFrame+x.voiceFrames&&f<x.startFrame+x.voiceFrames+x.pauseFrames))
  return {block:b,phrase:null as Phrase|null,phase:'breath'};
 return {block:b,phrase:null as Phrase|null,phase:'reaction'};
};
const Captions:React.FC<{frame:number}>=({frame})=>{
 const state=getState(frame);
 const p=state.phrase;
 // No artificial text cards during a meaningful breath or an actor reaction.
 if(!p||!state.block)return null;
 const b=state.block;
 const t=frame-p.startFrame;
 const fade=ease(t/7)*ease((p.voiceFrames-t)/9);
 if(fade<=0)return null;
 return <AbsoluteFill style={{pointerEvents:'none',fontFamily:font}}>
  <div style={{position:'absolute',left:44,right:44,bottom:85,display:'flex',justifyContent:'center',opacity:fade}}>
   <div style={{background:'linear-gradient(90deg,transparent,#080f1cbb 14%,#080f1cbb 86%,transparent)',
    padding:'14px 24px',maxWidth:650,fontSize:b.role==='english'?32:37,fontWeight:610,
    color:'#f4e4d3',textShadow:'0 2px 12px #000',textAlign:'center',lineHeight:1.55}}>
    {p.text}
   </div>
  </div>
 </AbsoluteFill>;
};
const Closing:React.FC<{frame:number}>=({frame})=>{
 const start=rhythm.totalFrames-114;
 const fade=ease((frame-start)/48);
 return <AbsoluteFill style={{opacity:fade,justifyContent:'flex-end',alignItems:'center',paddingBottom:225,pointerEvents:'none'}}>
 <div style={{fontFamily:font,fontSize:36,letterSpacing:5,fontWeight:650,color:'#f4d4ac',textShadow:'0 4px 16px #000'}}>
 风走了，声音还在
 </div></AbsoluteFill>;
};
export const HKContinuousStoryRhythmV4:React.FC=()=>{
 const f=useCurrentFrame();
 const i=Math.max(0,story.scenes.findIndex(s=>f>=s.startFrame&&f<s.endFrame));
 const s=story.scenes[i],previous=i>0?story.scenes[i-1]:null;
 const p=visualProgress(s.startFrame,s.endFrame,f,visualClock);
 const mix=previous&&f<s.startFrame+28?ease((f-s.startFrame+1)/28):1;
 return <AbsoluteFill style={{background:'#090f19',overflow:'hidden'}}>
   {previous&&mix<1&&<FilmFrame s={previous} frame={Math.max(0,s.startFrame-1)} p={1}/>}
   <FilmFrame s={s} frame={f} p={p} opacity={mix}/>
   <AbsoluteFill style={{pointerEvents:'none',background:'linear-gradient(180deg,#0e162628 0%,transparent 35%,transparent 60%,#080e18a6 100%)'}}/>
   <Captions frame={f}/>
   <Closing frame={f}/>
   {rhythm.blocks.flatMap(b=>b.phrases.map(p=>
     <Sequence key={p.id} from={p.startFrame} durationInFrames={p.voiceFrames}>
       <Audio src={staticFile(p.audio)} volume={1}/>
     </Sequence>
   ))}
 </AbsoluteFill>;
};