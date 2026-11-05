import React from 'react';
import {AbsoluteFill,Audio,Sequence,staticFile,useCurrentFrame} from 'remotion';
import storyJson from '../../../projects/hongkong-wind-lyrics-20261031/story-continuity.json';
import timing from '../../../projects/hongkong-wind-lyrics-20261031/timeline.json';
type StoryScene=(typeof storyJson.scenes)[number];
type Beat=(typeof timing.segments)[number];
export const CONTINUOUS_STORY_FRAMES=timing.totalFrames;
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const ease=(v:number)=>{const t=clamp(v);return t*t*(3-2*t)};
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const step=(p:number,start:number,end:number)=>ease((p-start)/(end-start));
const font='"Microsoft YaHei","PingFang SC","Noto Sans CJK SC",sans-serif';
const sceneAt=(f:number)=>storyJson.scenes.findIndex(s=>f>=s.startFrame&&f<s.endFrame);
const PaperDefs:React.FC=()=> <defs>
  <linearGradient id="night" x1="0" y1="0" x2=".5" y2="1"><stop stopColor="#17283b"/><stop offset=".7" stopColor="#1d2434"/><stop offset="1" stopColor="#0e151e"/></linearGradient>
  <linearGradient id="street" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#23354b"/><stop offset=".57" stopColor="#434852"/><stop offset="1" stopColor="#141b27"/></linearGradient>
  <linearGradient id="warm" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#d2a47b"/><stop offset="1" stopColor="#65505a"/></linearGradient>
  <linearGradient id="scarf" x1="0" x2="1"><stop stopColor="#b55153"/><stop offset=".5" stopColor="#db7f73"/><stop offset="1" stopColor="#803e52"/></linearGradient>
  <linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#244258"/><stop offset="1" stopColor="#111d2d"/></linearGradient>
  <radialGradient id="lamp"><stop stopColor="#ffe2ab" stopOpacity=".64"/><stop offset="1" stopColor="#d59b58" stopOpacity="0"/></radialGradient>
  <filter id="soft"><feGaussianBlur stdDeviation="4"/></filter>
  <clipPath id="photoWindow"><rect x="86" y="72" width="254" height="174" rx="3"/></clipPath>
  <clipPath id="homeWindow"><rect x="355" y="174" width="306" height="421" rx="4"/></clipPath>
 </defs>;
const CitySky:React.FC<{frame:number;lights?:number}>=({frame,lights=1})=>
 <g><rect width="720" height="990" fill="url(#night)"/>
  <circle cx="585" cy="252" r="190" fill="url(#lamp)" opacity=".23"/>
  {Array.from({length:15},(_,i)=>{
   const x=i*60-35,top=245+(i*71)%270,w=66+i%4*12;
   return <g key={i}>
    <path d={'M'+x+' '+top+'h'+w+'v'+(950-top)+'h-'+w+'z'} fill={i%3?'#172132':'#202937'} stroke="#768b9340" strokeWidth="1.5"/>
    {Array.from({length:16},(_,j)=><rect key={j} x={x+8+(j%4)*14} y={top+23+Math.floor(j/4)*41}
     width="6" height="12" fill={j%4===0?'#d6a46c':'#8bb9b0'} opacity={(j*13+i)%5===0?.05:.2+lights*.25*Math.max(.1,Math.sin(frame/105+j+i)*.23+.7)}/>)}
   </g>
  })}
 </g>;
const SceneFrame:React.FC<{frame:number;year:number;title:string}>=({frame,year,title})=>
 <g opacity=".7"><rect x="34" y="35" width="160" height="39" rx="3" fill="#121a2699"/>
 <text x="47" y="61" fontSize="17" letterSpacing="2" fill="#eed8bc" fontFamily={font}>{year} · {title}</text></g>;
const PhotoPrint:React.FC<{x:number;y:number;rot?:number;scale?:number;opacity?:number}>=({x,y,rot=-7,scale=1,opacity=1})=>
 <g transform={'translate('+x+' '+y+') rotate('+rot+') scale('+scale+')'} opacity={opacity}>
  <rect x="-6" y="-6" width="284" height="228" rx="2" fill="#e9d4b3" stroke="#af9881" strokeWidth="3"/>
  <image href={staticFile('hongkong-wind-lyrics-20261031/hongkong1990.jpg')} x="7" y="6" width="256" height="177" preserveAspectRatio="xMidYMid slice" />
  <text x="13" y="210" fontFamily="Georgia,serif" fontSize="20" fill="#625853">Hong Kong · 1990</text>
 </g>;
const Cassette:React.FC<{frame:number;x?:number;y?:number;scale?:number;running?:boolean;press?:number}>=({frame,x=0,y=0,scale=1,running=true,press=0})=>{
 const rotation=running?frame*2.9:0;
 return <g transform={'translate('+x+' '+y+') scale('+scale+')'}>
  <rect x="-9" y="8" width="379" height="252" rx="19" fill="#02050aa9"/>
  <rect width="365" height="245" rx="18" fill="#373c46" stroke="#c1a88d" strokeWidth="5"/>
  <rect x="18" y="22" width="330" height="100" rx="5" fill="#dcc69e" stroke="#c0a078" strokeWidth="2"/>
  <rect x="29" y="37" width="306" height="43" rx="4" fill="#e0d3b8"/>
  <text x="39" y="63" fontFamily="Georgia,serif" fontSize="23" fill="#4f3439" letterSpacing="1.5">季候風 · 1993</text>
  <rect x="29" y="88" width="306" height="22" fill="#a65455"/>
  <rect x="36" y="100" width="282" height="8" fill="#e6af94" opacity=".65"/>
  <rect x="45" y="135" width="275" height="92" rx="9" fill="#1a1e29" stroke="#8d8a87" strokeWidth="2"/>
  {[116,250].map((cx,i)=><g key={i} transform={'translate('+cx+' 181) rotate('+rotation*(i?-.8:1)+')'}>
    <circle r="41" fill="#161923" stroke="#aeb7b2" strokeWidth="4"/>
    <circle r="31" fill="#666b71"/>
    {Array.from({length:6},(_,j)=><rect key={j} x="-4" y="-28" width="8" height="16" fill="#181923" transform={'rotate('+(j*60)+')'}/>)}
    <circle r="13" fill="#e7cb9e"/><circle r="6" fill="#26262d"/>
  </g>)}
  <rect x="147" y="164" width="74" height="31" rx="4" fill="#ad957f" opacity=".68"/>
  <circle cx="147" cy="218" r="4" fill="#d7b38b"/><circle cx="220" cy="218" r="4" fill="#d7b38b"/>
  <g transform={'translate(275 229)'}>
   <rect x="-8" y="-2" width="25" height="18" rx="3" fill="#b78d69"/>
   <rect x="-8" y={-2+press*7} width="25" height="10" rx="2" fill="#cfc1a4"/>
  </g>
 </g>;
};
const Hand:React.FC<{frame:number;x:number;y:number;touch?:boolean}>=({frame,x,y,touch})=>{
 const t=touch?step(frame,96,186):step(frame,140,240);
 return <g transform={'translate('+(x-70*t)+' '+(y-28*t)+') rotate('+(10*t)+')'}>
  <path d="M0 62Q74 32 138 43l30 18q14 10 9 21l-9 10q-13 6-24-5l-32-8L88 99L48 136H-20Z" fill="#8a7774" stroke="#bda49a" strokeWidth="4"/>
  <path d="M94 68l84-27q13-3 17 9l-8 14-75 36" fill="#a38a7d" stroke="#bfa69a" strokeWidth="4"/>
 </g>;
};
const Scarf:React.FC<{x:number;y:number;frame:number;intensity?:number;opacity?:number}>=({x,y,frame,intensity=1,opacity=1})=>{
 const v=Math.sin(frame/17)*intensity,tail=22*v;
 return <g transform={'translate('+x+' '+y+')'} opacity={opacity}>
  <path d={'M-12 -3Q13 -24 37 -3L51 24Q61 77 '+(82+tail)+' '+(132+tail)+'L'+(61+tail)+' '+(145+tail)+'Q30 81 19 33L-17 36Z'}
   fill="url(#scarf)" stroke="#ef9e8a" strokeWidth="2"/>
  <path d={'M33 12Q64 '+(18+tail)+' '+(99+tail)+' 7'} fill="none" stroke="#eaae9e" strokeWidth="8" strokeLinecap="round"/>
 </g>;
};
const Person:React.FC<{id:'man'|'woman'|'older';x:number;y:number;frame:number;walk?:number;scarf?:boolean;bag?:boolean;scale?:number;turned?:boolean}>=
 ({id,x,y,frame,walk=0,scarf=false,bag=false,scale=1,turned=false})=>{
 const man=id==='man',older=id==='older',cycle=Math.sin(frame/6.4)*Math.min(1,walk);
 const skin=older?'#b29c8c':man?'#ac9489':'#d1a591';
 const coat=older?'#2d3a47':man?'#243443':'#785653';
 return <g transform={'translate('+x+' '+(y+Math.abs(cycle)*3)+') scale('+scale+')'}>
  <ellipse cx="0" cy="16" rx="60" ry="12" fill="#0008"/>
  <g stroke={coat} strokeWidth="18" strokeLinecap="round">
   <path d={'M-17 -30L'+(-22+cycle*19)+' 3L'+(-31+cycle*31)+' 14'}/>
   <path d={'M19 -30L'+(20-cycle*19)+' 4L'+(29-cycle*31)+' 14'}/>
  </g>
  <path d="M-40 -183Q-36 -227 -5 -236L38 -219L44 -139L36 -43Q0 -22 -36 -42Z" fill={coat} stroke="#a5a7ab66" strokeWidth="3"/>
  <path d="M-8 -224L0 -85" stroke="#abb7ae55" strokeWidth="2"/>
  <path d={'M-31 -203L'+(-55-cycle*13)+' -130'} stroke={coat} strokeWidth="22" strokeLinecap="round"/>
  <path d={'M29 -197L'+(47+cycle*13)+' -134'} stroke={coat} strokeWidth="22" strokeLinecap="round"/>
  <ellipse cx="-2" cy="-263" rx="33" ry="42" fill={skin}/>
  <path d={man||older?'M-34 -257Q-31 -324 11 -304Q37 -291 29 -270L0 -291Z':'M-38 -276Q-38 -327 6 -317Q40 -308 39 -273L27 -222Q13 -220 9 -264Z'} fill={man?'#1e232b':older?'#44484c':'#2b222a'}/>
  <path d="M9 -255l9 2" stroke="#463838" strokeWidth="2"/>
  {scarf&&<Scarf x={-14} y={-198} frame={frame} intensity={.38}/>}
  {bag&&<g><path d="M37 -128L74 -84" stroke="#c0a99c" strokeWidth="3"/><rect x="50" y="-96" width="74" height="92" rx="5" fill="#4c484a" stroke="#c5aa92" strokeWidth="4"/><rect x="70" y="-118" width="32" height="21" rx="5" fill="none" stroke="#c5aa92" strokeWidth="4"/></g>}
  {turned&&<path d="M-33 -277Q-12 -307 21 -288" stroke="#dac7ab" strokeWidth="5" opacity=".5"/>}
 </g>;
};
const StreetSet:React.FC<{frame:number;phase:'meet'|'leave';p:number}>=({frame,phase,p})=>{
 const leave=phase==='leave',nightMix=leave?step(p,.42,.9):.05;
 const approach=step(p,.04,.63),part=step(p,.27,.83),bus=step(p,.4,.79);
 const manx=leave?365-part*530:105+approach*225;
 const womanx=leave?405:602-approach*208;
 const lampFlicker=.77+.17*Math.sin(frame/33);
 return <g>
  <CitySky frame={frame} lights={1-nightMix*.3}/>
  {/* Location-accurate 1990 Hong Kong street photograph, maintained as one continuous background.
      Fictional characters are editorial illustration, not people shown in the photo. */}
  <g transform={'translate('+(-16+Math.sin(frame/155)*8)+' 0)'}>
    <image href={staticFile('hongkong-wind-lyrics-20261031/hongkong1990.jpg')} x="-95" y="52" width="925" height="700" preserveAspectRatio="xMidYMid slice" opacity=".75"/>
  </g>
  <rect x="0" y="0" width="720" height="880" fill="#172237" opacity={.54+nightMix*.07}/>
  <rect x="0" y="0" width="720" height="1280" fill="#e5b686" opacity={leave?nightMix*.09:.06}/>
  <path d="M0 900L720 815V1280H0Z" fill="#353744"/>
  <path d="M0 1020L720 920M0 1210L720 1080" stroke="#cbb69e35" strokeWidth="7"/>
  <path d="M96 0v930" stroke="#10151b" strokeWidth="11"/>
  <ellipse cx="98" cy="427" rx="210" ry="230" fill="url(#lamp)" opacity={lampFlicker}/>
  <ellipse cx="97" cy="415" rx="24" ry="40" fill="#f9d59a" opacity=".9"/>
  <path d="M98 415H220Q238 415 240 438" fill="none" stroke="#1b1d24" strokeWidth="11"/>
  <g transform="translate(510 366) rotate(-8)"><rect width="169" height="51" rx="2" fill="#59616e" stroke="#c1b69b" strokeWidth="4"/><text x="13" y="33" fontSize="23" fontFamily={font} fill="#f5d8b1" letterSpacing="3">街角</text></g>
  <g opacity={leave?.9:1}>
   <Person id="man" x={manx} y={943} frame={frame} walk={leave?part:approach} bag={leave} scale={.9}/>
   <Person id="woman" x={womanx} y={955} frame={frame} walk={leave?0:approach} scarf={true} scale={.89}/>
  </g>
  {!leave&&<path d={'M'+(womanx-20)+' 764Q340 '+(650-approach*80)+' '+(manx+14)+' 756'} fill="none" stroke="#be6863" opacity={approach*.52} strokeWidth="7"/>}
  {leave&&<g opacity={bus} transform={'translate('+(830-bus*1170)+' 803)'}>
   <rect width="510" height="181" rx="22" fill="#475769" stroke="#b4917e" strokeWidth="5"/>
   {Array.from({length:5},(_,i)=><rect key={i} x={22+i*97} y="22" width="77" height="90" rx="3" fill="#c5cec2" opacity=".65"/>)}
   <rect x="360" y="115" width="65" height="17" rx="7" fill="#d29881"/>
   <circle cx="95" cy="185" r="28" fill="#0c111a"/><circle cx="416" cy="185" r="28" fill="#0c111a"/>
  </g>}
  <rect x="0" y="1100" width="720" height="180" fill="#0c1823b8"/>
  {leave&&<rect x="0" y="0" width="720" height="850" fill="#edd4b5" opacity={nightMix*.15}/>}
 </g>;
};
const HouseSet:React.FC<{frame:number;phase:'listen'|'return'|'empty';p:number}>=({frame,phase,p})=>{
 const last=phase==='return',empty=phase==='empty';
 const wind=empty?step(p,.22,.8):last?.22:.05;
 const shake=Math.sin(frame/14)*wind*8;
 const playerOn=!last||p<.86;
 const fadeIn=phase==='listen'?step(p,.04,.31):1;
 const photoShow=empty?0:last?.7:1-step(p,.47,.75)*.2;
 return <g>
 <rect width="720" height="1280" fill={empty?'#2b3040':'#1d2736'}/>
 <path d="M0 0H720V970H0Z" fill={empty?'#394154':'#28344a'}/>
 <path d="M0 170H720" stroke="#a2a09b40" strokeWidth="7"/>
 <rect x="343" y="165" width="327" height="444" fill="#171f2b" stroke="#b9a28c" strokeWidth="21"/>
 <g clipPath="url(#homeWindow)"><CitySky frame={frame}/><path d="M354 536Q490 489 678 543" stroke="#e9c89a44" strokeWidth="8" fill="none"/></g>
 <path d="M505 168V604M344 388H668" stroke="#a58e80" strokeWidth="11"/>
 <rect x="340" y="160" width="17" height="452" fill="#8c7680"/><rect x="655" y="160" width="16" height="452" fill="#a78c75"/>
 <path d={'M345 169Q'+(320-shake)+' 355 347 605'} stroke="#be8d83" strokeWidth="21" fill="none" opacity=".5"/>
 <rect x="30" y="490" width="220" height="296" rx="12" fill="#2a2a36" stroke="#9f887e" strokeWidth="12"/>
 <path d="M48 785V960M227 786V965" stroke="#463b44" strokeWidth="18"/>
 <path d="M0 995L720 945V1280H0Z" fill="#342a2b"/>
 <path d="M0 1083L720 1030" stroke="#b18e733d" strokeWidth="7"/>
 <g transform="translate(26 781)"><path d="M0 0H682L720 48H0Z" fill="#766254" stroke="#c5a488" strokeWidth="10"/><path d="M25 35V382M680 34V340" stroke="#483e41" strokeWidth="26"/></g>
 <rect x="50" y="758" width="136" height="97" rx="6" fill="#4b4343" stroke="#ad9a86" strokeWidth="5"/>
 <path d="M57 788H176M57 815H176" stroke="#d0bb9966" strokeWidth="6"/>
 {!empty&&<PhotoPrint x={435} y={713} scale={.59} rot={last?5:-4} opacity={photoShow}/>}
 {(last||empty)&&<g transform={'translate('+(empty?525:110)+' '+(empty?633:875)+') rotate('+(shake*.4)+')'}>
  <Scarf x={0} y={0} frame={frame} intensity={.9}/>
  </g>}
 {empty&&<g transform={'translate('+(105+shake)+' '+(690-wind*85)+') rotate('+(8+shake)+')'}>
  <rect x="0" y="0" width="174" height="226" fill="#e0caad" stroke="#a88c74" strokeWidth="5"/>
  <path d="M22 61H147M22 89H147M22 117H122M22 145H143" stroke="#695b56aa" strokeWidth="3"/>
 </g>}
 {!empty&&<g>
  <Cassette frame={frame} x={185} y={840} scale={.95} running={playerOn} press={last?step(p,.83,.94):step(p,.23,.42)}/>
  {phase==='listen'&&<Hand frame={frame} x={530} y={900} touch/>}
  {last&&<g opacity={step(p,.2,.56)}><rect x="62" y="927" width="91" height="127" transform="rotate(-7 62 927)" fill="#e3d1b8" stroke="#a48b72" strokeWidth="4"/></g>}
 </g>}
 {phase==='listen'&&<circle cx="395" cy="959" r={65*fadeIn} stroke="#d7ad85" strokeWidth={2+fadeIn*2} fill="none" opacity={.23*(1-fadeIn)}/>}
 {last&&<rect x="0" y="0" width="720" height="1280" fill="#07101b" opacity={step(p,.84,1)*.27}/>}
 </g>;
};
const HarbourSet:React.FC<{frame:number;p:number}>=({frame,p})=>{
 const wind=Math.sin(frame/16)*.5,raise=step(p,.57,.88);
 return <g>
 <CitySky frame={frame}/>
 <path d="M0 665L720 600V1280H0Z" fill="url(#water)"/>
 {Array.from({length:24},(_,i)=>{
  const y=630+i*19,x=-50+Math.sin(frame/(32+i*2)+i)*62;
  return <path key={i} d={'M'+x+' '+y+'q112 '+(Math.sin(frame/39+i)*3)+' 230 0t240 0t220 0'} stroke={i%3===0?'#dcbf8c':'#96aeba'} opacity={.12+i%4*.04} strokeWidth="3" fill="none"/>;
 })}
 <path d="M0 944L720 860V1280H0Z" fill="#242633"/>
 <path d="M0 1000L720 911" stroke="#e1c6a45c" strokeWidth="11"/>
 <path d="M38 985V722M680 915V695" stroke="#b7a597" strokeWidth="8"/>
 <path d="M34 770L691 721" stroke="#a8937c" strokeWidth="7"/>
 <Person id="older" x={353} y={1037} frame={frame} scale={1.3} scarf={true} turned/>
 <g opacity={1-raise} transform={'translate('+(395+wind*13)+' 818) rotate('+wind*5+')'}>
  <rect x="0" y="0" width="98" height="140" rx="3" fill="#d7c3a7" stroke="#a9957f" strokeWidth="4"/>
  <path d="M12 35H84M12 54H80M12 72H82" stroke="#6e655c" strokeWidth="2"/>
 </g>
 <g opacity={raise} transform={'translate('+(410+wind*11)+' '+(808-raise*75)+') rotate(-8)'}>
  <Cassette frame={frame} scale={.27} running={true}/>
 </g>
 </g>;
};
const cameraStops:Record<string,[number,number,number,number][]> = {
 's1':[[0,1.04,0,0],[.27,1.1,0,-21],[.62,1.2,-40,-78],[1,1.36,-26,-175]],
 's2':[[0,1.18,8,16],[.25,1.08,-13,5],[.53,1.3,-20,-65],[1,1.16,13,-10]],
 's3':[[0,1.21,0,-25],[.24,1.31,-11,-63],[.51,1.05,28,-16],[.73,1.22,-35,-43],[1,1.15,11,-25]],
 's4':[[0,1.1,-8,12],[.3,1.21,21,-38],[.63,1.18,-15,-31],[1,1.35,12,-155]],
 's5':[[0,1.06,0,0],[.29,1.17,-25,-38],[.57,1.22,15,-60],[1,1.39,-45,-146]],
 's6':[[0,1.16,0,-36],[.29,1.21,-13,-90],[.59,1.39,-50,-153],[1,1.58,-60,-218]]
};
const Camera:React.FC<{id:string;p:number;children:React.ReactNode}>=({id,p,children})=>{
 const points=cameraStops[id],n=points.findIndex(x=>x[0]>=p);
 const a=n<=0?points[0]:points[n-1],b=n===-1?points[points.length-1]:points[n];
 const t=a[0]===b[0]?0:ease((p-a[0])/(b[0]-a[0]));
 const zoom=mix(a[1],b[1],t),x=mix(a[2],b[2],t),y=mix(a[3],b[3],t);
 return <g transform={'translate('+(360+x)+' '+(640+y)+') scale('+zoom+') translate(-360 -640)'}>{children}</g>;
};
const World:React.FC<{s:StoryScene;frame:number;p:number}>=({s,frame,p})=>{
 const stage=s.id==='s1'||s.id==='s6'?<HouseSet frame={frame} p={p} phase={s.id==='s1'?'listen':'return'}/>:
 s.id==='s2'?<StreetSet frame={frame} phase="meet" p={p}/>:
 s.id==='s3'?<StreetSet frame={frame} phase="leave" p={p}/>:
 s.id==='s4'?<HouseSet frame={frame} phase="empty" p={p}/>:
 <HarbourSet frame={frame} p={p}/>;
 return <Camera id={s.id} p={p}>{stage}</Camera>;
};
export const FilmFrame:React.FC<{s:StoryScene;frame:number;p:number;opacity?:number}>=({s,frame,p,opacity=1})=>
 <AbsoluteFill style={{opacity,overflow:'hidden'}}>
  <svg viewBox="0 0 720 1280" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
   <PaperDefs/>
   <World s={s} frame={frame} p={p}/>
  </svg>
 </AbsoluteFill>;
function split(text:string):string[]{
 const chunks:string[]=[];let buf='';
 for(const c of text){buf+=c;if(buf.length>=18&&/[，。！？；?!]/.test(c)){chunks.push(buf);buf=''}}
 if(buf)chunks.push(buf);return chunks;
}
const TextOverlay:React.FC<{frame:number}>=({frame})=>{
 const b=timing.segments.find(x=>frame>=x.startFrame&&frame<x.startFrame+x.durationFrames);
 if(!b)return null;
 const local=frame-b.startFrame,lyric=b.role!=='narrator';
 const lines=split(b.text),index=Math.min(lines.length-1,Math.floor(clamp(local/b.voiceFrames)*lines.length));
 const a=clamp(local/11)*clamp((b.voiceFrames+8-local)/13);
 if(a<=0)return null;
 return <AbsoluteFill style={{pointerEvents:'none',fontFamily:font}}>
  {lyric&&<div style={{position:'absolute',left:56,right:56,top:'27%',color:'#ffead0',
   fontWeight:700,fontSize:b.role==='english'?40:44,lineHeight:1.4,textShadow:'0 3px 14px #000d',opacity:a}}>
   {b.text}</div>}
  <div style={{position:'absolute',bottom:91,left:46,right:46,opacity:a,display:'flex',justifyContent:'center'}}>
   <div style={{maxWidth:650,padding:'13px 20px',background:'linear-gradient(90deg,#0c152500,#101b27bb 16%,#101b27bb 84%,#0c152500)',
    color:'#fff4e6',fontSize:lyric?31:34,lineHeight:1.43,letterSpacing:1,textAlign:'center',fontWeight:600,textShadow:'0 2px 10px #000'}}>
    {lyric?b.overlay:lines[index]}
   </div>
  </div>
 </AbsoluteFill>;
};
const EndOverlay:React.FC<{frame:number}>=({frame})=>{
 const a=clamp((frame-4533)/52);
 return <AbsoluteFill style={{pointerEvents:'none',opacity:a,justifyContent:'flex-end',paddingBottom:260,alignItems:'center'}}>
  <div style={{fontFamily:font,fontWeight:650,fontSize:35,letterSpacing:6,color:'#f4d4ac',textShadow:'0 4px 16px #000',textAlign:'center'}}>风走了，声音还在</div>
 </AbsoluteFill>;
};
export const HKContinuousStoryV3:React.FC=()=>{
 const frame=useCurrentFrame(),index=sceneAt(frame),i=Math.max(0,index),s=storyJson.scenes[i];
 const p=clamp((frame-s.startFrame)/(s.endFrame-s.startFrame));
 const previous=i>0?storyJson.scenes[i-1]:null;
 const transition=previous&&frame-s.startFrame<28?ease((frame-s.startFrame)/28):1;
 return <AbsoluteFill style={{background:'#090f19',overflow:'hidden'}}>
  {previous&&transition<1&&<FilmFrame s={previous} frame={Math.max(0,s.startFrame-1)} p={1}/>}
  <FilmFrame s={s} frame={frame} p={p} opacity={transition}/>
  <AbsoluteFill style={{background:'linear-gradient(180deg,#0e162629 0%,transparent 27%,transparent 63%,#080e18c9 100%)',pointerEvents:'none'}}/>
  <TextOverlay frame={frame}/>
  <EndOverlay frame={frame}/>
  {timing.segments.map(b=><Sequence key={b.id} from={b.startFrame} durationInFrames={b.durationFrames}>
   <Audio src={staticFile(b.audio)} volume={1}/>
  </Sequence>)}
 </AbsoluteFill>;
};