import React from 'react';
import {AbsoluteFill,Img,Audio,Sequence,staticFile,useCurrentFrame,interpolate} from 'remotion';
import t from '../../../projects/hongkong-wind-lyrics-20261031/timeline.json';
type Beat={id:string;scene:string;role:string;text:string;overlay:string;audio:string;startFrame:number;voiceFrames:number;gapFrames:number;durationFrames:number};
const beats=t.segments as Beat[];
export const HK_WIND_FRAMES=t.totalFrames;
const root='hongkong-wind-lyrics-20261031/';
const fnt='"Microsoft YaHei","PingFang SC","Noto Sans CJK SC",sans-serif';
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const ease=(n:number)=>{let x=clamp(n);return x*x*(3-2*x)};
const pmap:Record<string,string>={opening:'hongkong1990.jpg',air:'hongkong1993a.jpg',stay:'hongkong1990.jpg',separate:'hongkong1993b.jpg',night:'aber1980.jpg',wind:'faye.jpg',empty:'street1993.jpg',weather:'hktram.jpg',waiting:'kaitak1980.jpg',city:'construction1990.jpg',ending:'hongkong1990.jpg'};
const Photo:React.FC<{scene:string;fr:number}>=({scene,fr})=>{
 let scale=1.25+.045*Math.sin(fr/110),tx=35*Math.sin(fr/95),ty=35*Math.cos(fr/127);
 return <AbsoluteFill style={{overflow:'hidden',background:'#101624'}}>
 <Img src={staticFile(root+(pmap[scene]||'hongkong1990.jpg'))} style={{height:'100%',width:'100%',objectFit:'cover',transform:'translate('+tx+'px,'+ty+'px) scale('+scale+')',filter:'saturate(.76) sepia(.25) contrast(1.13)'}}/>
 <AbsoluteFill style={{background:'linear-gradient(180deg,#0b16278a,transparent 30%,#07111be8 98%)'}}/>
 <AbsoluteFill style={{background:'radial-gradient(ellipse at 50% 47%,transparent 32%,#060a14a6 100%)'}}/>
 </AbsoluteFill>;
};
const City:React.FC<{fr:number;night?:boolean}>=({fr,night})=><svg width="720" height="1280" viewBox="0 0 720 1280" style={{position:'absolute',inset:0,opacity:night?.86:.62}}>
 <defs><linearGradient id="street-sky"><stop offset="0" stopColor="#203446" stopOpacity=".1"/><stop offset="1" stopColor="#0e1921" stopOpacity=".85"/></linearGradient></defs>
 <rect x="0" y="100" width="720" height="1180" fill="url(#street-sky)"/>
 {Array.from({length:10},(_,i)=>{let x=i*79-65+Math.sin(fr/91+i)*6,y=310+(i*53)%320;return <g key={i}><rect x={x} y={y} width={74+(i%3)*19} height={1280-y} fill={i%2===0?'#111b25':'#171b24'} opacity=".94"/>{Array.from({length:10},(_,j)=><rect key={j} x={x+12+(j%3)*21} y={y+28+Math.floor(j/3)*44} width="7" height="20" fill={i%2?'#f9aa75':'#80c5cc'} opacity={.2+Math.sin(fr/60+i+j)*.08}/>)}</g>})}
 <path d="M0 1110L300 1040L720 1090V1280H0Z" fill="#101a24" opacity=".95"/>
 <path d="M0 1160 Q375 1090 720 1140" stroke="#d3b090" strokeWidth="4" opacity=".45" fill="none"/>
 </svg>;
const Taxi:React.FC<{fr:number}>=({fr})=>{
 let x=(fr*.76)%1130-290,y=925+Math.sin(fr/4)*2;
 return <svg viewBox="0 0 290 160" width="290" height="160" style={{position:'absolute',left:x,top:y,filter:'drop-shadow(4px 11px 8px #050711bb)'}}>
 <path d="M20 96L50 85 81 38 209 38 244 86 276 99 285 129H8Z" fill="#a93443" stroke="#d88c7b" strokeWidth="5"/>
 <path d="M88 54L64 88H144V51Z M154 51V88H233L207 53Z" fill="#bad5d2" stroke="#6a5752" strokeWidth="4"/>
 <rect x="107" y="22" width="70" height="17" rx="4" fill="#f0dfb8"/>
 {[66,225].map(x=><g key={x}><circle cx={x} cy="131" r="24" fill="#121821"/><circle cx={x} cy="131" r="11" fill="#c1b7aa"/></g>)}
 </svg>;
};
const Walkers:React.FC<{fr:number;apart?:boolean}>=({fr,apart})=><svg viewBox="0 0 720 1280" width="720" height="1280" style={{position:'absolute',inset:0,filter:'drop-shadow(8px 14px 18px #070a15ad)'}}>
 {[0,1].map(i=>{const x=(i?450:120)+(i?1:-1)*(apart?fr*.085:Math.sin(fr/70)*8),y=Math.sin(fr/12+i)*3;
 return <g key={i} transform={'translate('+x+' '+(600+y)+')'}>
 <ellipse cx="78" cy="95" rx="43" ry="54" fill="#a38a7b"/>
 <path d="M36 81Q45 22 104 51l19 48Q75 73 36 104Z" fill="#1c222c"/>
 <path d="M45 137Q85 107 127 140L171 341 12 343Z" fill={i?'#262128':'#16222a'}/>
 <path d="M45 318L25 498 M134 314L158 499" stroke={i?'#262128':'#16222a'} strokeWidth="38"/>
 </g>})}
 </svg>;
const Wind:React.FC<{fr:number}>=({fr})=><AbsoluteFill style={{pointerEvents:'none'}}>
 {Array.from({length:27},(_,i)=>{const left=((i*117+fr*(1+i%3*.38))%960)-80,top=(i*139+Math.sin(fr/22+i)*60)%1430-60;return <div key={i} style={{position:'absolute',left,top,width:12+(i%4)*12,height:7+(i%3)*8,transform:'rotate('+(i*27+fr*.43)+'deg)',background:i%2?'#e3c8a5':'#7daeb3',opacity:.17+(i%4)*.09,filter:'blur(.65px)'}}/>})}
 </AbsoluteFill>;
const Rain:React.FC<{fr:number}>=({fr})=><svg viewBox="0 0 720 1280" width="720" height="1280" style={{position:'absolute',inset:0,opacity:.7}}>
 {Array.from({length:34},(_,i)=>{let x=(i*97)%820-40,y=(i*169+fr*(7+i%3))%1410-40;return <path key={i} d={'M'+x+' '+y+'l-14 56'} stroke={i%3?'#d0e4e3':'#f5dac0'} strokeWidth="1.4" opacity=".44"/>})}
 </svg>;
const Harbor:React.FC<{fr:number}>=({fr})=><svg viewBox="0 0 720 1280" width="720" height="1280" style={{position:'absolute',inset:0}}>
 <path d="M0 830Q310 798 720 833V1280H0Z" fill="#132634" opacity=".87"/>
 {Array.from({length:10},(_,i)=>{let y=860+i*34,x=20+Math.sin(fr/34+i)*28;return <path key={i} d={'M'+x+' '+y+'q140 '+(8*Math.sin(fr/25+i))+' 280 0t350 0'} stroke={i%2?'#8eb6b9':'#cc9175'} strokeWidth="3" opacity=".2" fill="none"/>})}
 <path d="M0 1080L720 1010V1280H0Z" fill="#141a21" opacity=".95"/><path d="M0 1102L720 1030" stroke="#846e63" strokeWidth="9"/>
 </svg>;
const Album:React.FC<{fr:number}>=({fr})=><AbsoluteFill style={{pointerEvents:'none'}}>
 {[0,1].map((i)=>{let rot=(i?-7:8)+Math.sin(fr/66+i)*2,x=(i?260:65)+Math.sin(fr/59+i)*20,y=i?390:260;
 return <div key={i} style={{position:'absolute',left:x,top:y,width:400,height:565,border:'12px solid #dec2a180',boxShadow:'10px 22px 29px #0007',transform:'rotate('+rot+'deg)'}}/>})}
 </AbsoluteFill>;
const Visual:React.FC<{b:Beat;fr:number}>=({b,fr})=>{
 const s=b.scene,water=['waiting','empty','ending','weather','wind'].includes(s);
 return <AbsoluteFill>
 <Photo scene={s} fr={fr}/>
 {['opening','stay','city','night','separate'].includes(s)&&<City fr={fr} night/>}
 {['opening','stay','city'].includes(s)&&<Taxi fr={fr}/>}
 {['air','separate'].includes(s)&&<Walkers fr={fr} apart={s==='separate'}/>}
 {water&&<Harbor fr={fr}/>}
 {['night','weather'].includes(s)&&<Rain fr={fr}/>}
 {['wind','weather','city','ending'].includes(s)&&<Wind fr={fr}/>}
 {['waiting','empty','ending'].includes(s)&&<Walkers fr={fr} apart/>}
 {['city','ending'].includes(s)&&<Album fr={fr}/>}
 <AbsoluteFill style={{background:'linear-gradient(180deg,#0d17235e 0%,transparent 43%,#090c14d6 100%)'}}/>
 </AbsoluteFill>;
};
const split=(v:string)=>{let a:string[]=[],x='';for(const c of v){x+=c;if(x.length>=17&&/[，。！？；?!]/.test(c)){a.push(x);x=''}}if(x)a.push(x);return a};
export const HKWindLyricsFilm:React.FC=()=>{
 const fr=useCurrentFrame();const index=beats.findIndex(b=>fr>=b.startFrame&&fr<b.startFrame+b.durationFrames);const ix=Math.max(0,index),b=beats[ix],previous=ix?beats[ix-1]:b;
 const local=index<0?0:fr-b.startFrame,fade=ease(local/19);const lyrical=b.role!=='narrator';
 const chunks=split(b.text);const ci=Math.min(chunks.length-1,Math.floor(clamp(local/b.voiceFrames)*chunks.length));
 const opacity=interpolate(local,[0,9,b.voiceFrames-6,b.voiceFrames+7],[0,1,1,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
 const label=b.role==='english'?'THE WEEKND · HONG KONG':b.role==='cantonese'?'王菲 · 季候風 (1993)':'香港的风 · 歌词里的两个人';
 return <AbsoluteFill style={{fontFamily:fnt,background:'#0a121b',overflow:'hidden'}}>
 <Visual b={previous} fr={fr}/>
 <AbsoluteFill style={{opacity:fade}}><Visual b={b} fr={fr}/></AbsoluteFill>
 {fr<36&&<div style={{position:'absolute',left:55,top:410,color:'#fae6c9',textShadow:'1px 3px 17px #000',opacity:clamp(fr/18)}}>
 <div style={{fontSize:31,letterSpacing:9}}>1993 — 2026</div><div style={{fontSize:78,fontWeight:700,marginTop:28}}>香港的风</div><div style={{fontSize:27,marginTop:31}}>跨越三十三年的两首歌</div></div>}
 {fr>=36&&<>
 <div style={{position:'absolute',left:43,right:43,top:50,fontSize:20,color:'#e9c9b2',letterSpacing:2,display:'flex',justifyContent:'space-between',textShadow:'0 3px 10px #000c'}}><span>{label}</span><span>{ix+1} / {beats.length}</span></div>
 {lyrical&&<div style={{position:'absolute',left:47,right:47,top:273,fontSize:b.role==='english'?48:50,fontWeight:650,lineHeight:1.5,color:'#fff0d7',textShadow:'0 3px 16px #03030be8',transform:'translateY('+(20*(1-ease(local/20)))+'px)',opacity:clamp(local/18)}}>{b.text}</div>}
 <div style={{position:'absolute',left:50,right:50,bottom:288,borderTop:'1px solid #d7b09275',paddingTop:17,fontSize:23,color:'#d9beab',letterSpacing:2,textShadow:'0 2px 12px #000e'}}>{b.overlay}</div>
 {local<b.voiceFrames+7&&<div style={{position:'absolute',left:45,right:45,bottom:130,minHeight:132,display:'flex',alignItems:'center',justifyContent:'center',opacity}}>
 <span style={{fontSize:lyrical?36:39,lineHeight:1.48,color:'#fff5e8',fontWeight:600,textAlign:'center',letterSpacing:1,textShadow:'0 3px 12px #020207f0'}}>{lyrical?b.overlay:chunks[ci]}</span></div>}
 <div style={{position:'absolute',left:45,right:45,bottom:40,display:'flex',justifyContent:'space-between',color:'#d9b7a38a',fontSize:16,letterSpacing:2,borderTop:'1px solid #bfa38c5c',paddingTop:13}}>
 <span>HONG KONG × 季候風</span><span>原创声演 · 歌词解读</span></div>
 </>}
 {beats.map(s=><Sequence key={s.id} from={s.startFrame} durationInFrames={s.durationFrames}><Audio src={staticFile(s.audio)} volume={1}/></Sequence>)}
 </AbsoluteFill>;
};
export {Visual,Photo};
