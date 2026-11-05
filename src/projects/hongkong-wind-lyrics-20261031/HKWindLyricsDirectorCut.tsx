import React from 'react';
import {AbsoluteFill} from 'remotion';
import {DirectorTimeline} from '../../director/DirectorTimeline';
import {assertDirectorPlan,validateDirectorPlan,type DirectorPlan,type DirectorShot} from '../../director/contract';
import raw from '../../../projects/hongkong-wind-lyrics-20261031/director-plan.json';
import timeline from '../../../projects/hongkong-wind-lyrics-20261031/timeline.json';
import {Visual,Photo} from './HKWindLyrics';
const plan=raw as unknown as DirectorPlan;
assertDirectorPlan(plan);
export const HK_DIRECTOR_FRAMES=plan.totalFrames;
export const HK_DIRECTOR_AUDIT=validateDirectorPlan(plan);
type Beat=(typeof timeline.segments)[number];
const beats=timeline.segments;
const getBeat=(id?:string)=>beats.find(b=>b.id===id)??beats[0];
const font='"Microsoft YaHei","PingFang SC","Noto Sans CJK SC",sans-serif';
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
function textChunks(text:string){
 const a:string[]=[];let current='';
 for(const c of text){
  current+=c;
  if(current.length>=18&&/[，。！？；?!]/.test(c)){a.push(current);current=''}
 }
 if(current)a.push(current);
 return a;
}
const StyledVisual:React.FC<{shot:DirectorShot;globalFrame:number}>=({shot,globalFrame})=>{
 const b=getBeat(shot.beatId);
 return shot.visualVariant==='photo-only'?
 <AbsoluteFill><Photo scene={b.scene} fr={globalFrame}/><AbsoluteFill style={{background:'linear-gradient(180deg,#070c16aa,#090d1695 55%,#030710d8)'}}/></AbsoluteFill>:
 <Visual b={b} fr={globalFrame}/>;
};
const Overlay:React.FC<{frame:number}>=({frame})=>{
 if(frame<36)return <AbsoluteFill style={{pointerEvents:'none',justifyContent:'center',alignItems:'center'}}>
  <div style={{fontFamily:font,color:'#f6e1c2',textAlign:'center',textShadow:'0 5px 24px #000',letterSpacing:3}}>
   <div style={{fontSize:29,letterSpacing:9}}>1993 — 2026</div>
   <div style={{fontSize:79,fontWeight:760,marginTop:25}}>香港的风</div>
   <div style={{fontSize:26,marginTop:28}}>两个人 · 两种语言 · 三十三年</div>
  </div>
 </AbsoluteFill>;
 const b:Beat=beats.find(x=>frame>=x.startFrame&&frame<x.startFrame+x.durationFrames)??beats[beats.length-1];
 const local=frame-b.startFrame,lyrical=b.role!=='narrator';
 const lines=textChunks(b.text),idx=Math.min(lines.length-1,Math.floor(clamp(local/b.voiceFrames)*lines.length));
 const audible=local<b.voiceFrames+5;
 const alpha=clamp(local/12)*clamp((b.voiceFrames+6-local)/13);
 const label=b.role==='english'?'THE WEEKND · HONG KONG':b.role==='cantonese'?'王菲 · 季候風 (1993)':'香港 · 跨时代歌词解读';
 return <AbsoluteFill style={{pointerEvents:'none',fontFamily:font,color:'#fcefe0',textShadow:'0 3px 13px #000e'}}>
  <div style={{position:'absolute',top:52,left:43,right:43,fontSize:21,letterSpacing:2,display:'flex',justifyContent:'space-between',color:'#f0d1b3'}}>
   <span>{label}</span><span>{b.id} / 19</span>
  </div>
  {lyrical&&<div style={{position:'absolute',top:305,left:52,right:52,fontSize:b.role==='english'?43:50,fontWeight:700,lineHeight:1.5,opacity:alpha}}>{b.text}</div>}
  <div style={{position:'absolute',bottom:285,left:43,right:43,paddingTop:17,borderTop:'1px solid #d7ab8766',color:'#e4c4a4',fontSize:24,letterSpacing:2}}>{b.overlay}</div>
  {audible&&<div style={{position:'absolute',bottom:123,left:43,right:43,minHeight:135,display:'flex',alignItems:'center',justifyContent:'center',opacity:alpha}}>
   <div style={{textAlign:'center',fontWeight:650,fontSize:lyrical?37:40,lineHeight:1.48}}>{lyrical?b.overlay:lines[idx]}</div>
  </div>}
  <div style={{position:'absolute',bottom:40,left:43,right:43,borderTop:'1px solid #e2c6a44f',paddingTop:15,
   display:'flex',justifyContent:'space-between',letterSpacing:2,fontSize:16,color:'#d4b3a3'}}>
   <span>HONG KONG × 季候風</span><span>DIRECTOR CUT · V2</span>
  </div>
 </AbsoluteFill>;
};
export const HKWindLyricsDirectorCut:React.FC=()=>(
 <DirectorTimeline plan={plan}
  renderShot={(shot,globalFrame)=><StyledVisual shot={shot} globalFrame={globalFrame}/>}
  overlay={frame=><Overlay frame={frame}/>}
 />
);