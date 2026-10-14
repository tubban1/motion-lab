import React from 'react';
import {AbsoluteFill,Audio,Sequence,staticFile,useCurrentFrame,interpolate,Easing} from 'remotion';
const K={navy:'#040911',panel:'#102638',text:'#F4F8FE',teal:'#4AE8C3',sky:'#B0D9FF',muted:'#91A8B9',red:'#F26886',gold:'#F4C282',grid:'#2A5365'};
const F='"PingFang SC","Hiragino Sans GB",Arial,sans-serif',M='"SFMono-Regular",Menlo,monospace';
const B=[0,144,312,480,648,840,1008,1176,1344,1536];
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const ease=Easing.bezier(.15,.77,.16,1);
const fade=(f:number,s=0,n=22)=>interpolate(f,[s,s+n],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:ease});
const label=(s:string,color=K.muted)=><div style={{color,fontFamily:M,fontSize:21,letterSpacing:3,fontWeight:650}}>{s}</div>;
const Head:React.FC<{a:string;b:string;top?:number;size?:number;accent?:string}>=({a,b,top=260,size=91,accent=K.teal})=>{
const f=useCurrentFrame();return <div style={{position:'absolute',left:126,top,width:1550,fontFamily:F,fontSize:size,fontWeight:850,lineHeight:1.32,letterSpacing:-3}}>
<div style={{opacity:fade(f,10),transform:'translateY('+(28*(1-fade(f,10)))+'px)'}}>{a}</div>
<div style={{color:accent,opacity:fade(f,25),transform:'translateY('+(35*(1-fade(f,25)))+'px)'}}>{b}</div>
</div>};
const Back:React.FC<{f:number;red?:boolean}>=({f,red})=><AbsoluteFill style={{background:'radial-gradient(ellipse at '+(65+7*Math.sin(f/110))+'% 36%,'+(red?'#3D1E2D':'#154154')+' 0%,#0A1727 46%,'+K.navy+' 92%)',overflow:'hidden'}}>
<div style={{position:'absolute',inset:-600,transform:'perspective(1200px) rotateX(64deg) rotateZ(-19deg) translateY('+((f*.35)%110)+'px)',opacity:.15,backgroundImage:'linear-gradient('+K.grid+' 1px,transparent 1px),linear-gradient(90deg,'+K.grid+' 1px,transparent 1px)',backgroundSize:'110px 110px'}}/>
{Array.from({length:38},(_,i)=><div key={i} style={{position:'absolute',left:((i*347)%1850),top:(80+(i*761+f*(.5+i%3*.22))%950),width:2+i%3,height:2+i%3,borderRadius:'50%',background:i%7===0?K.gold:K.teal,opacity:.13+(i%5)*.08}}/>)}
<AbsoluteFill style={{background:'radial-gradient(ellipse at center,transparent 30%,#020409A8 100%)'}}/></AbsoluteFill>;
const Scene:React.FC<{i:number;red?:boolean;name:string;children:React.ReactNode}>=({i,red=false,name,children})=>{
const f=useCurrentFrame(),duration=B[i+1]-B[i],opacity=clamp(f/11)*clamp((duration-f)/12);
return <AbsoluteFill style={{opacity,fontFamily:F,color:K.text,overflow:'hidden'}}><Back f={f+B[i]} red={red}/>{children}
<div style={{position:'absolute',left:108,top:68,fontFamily:M,fontSize:26,color:K.teal,fontWeight:850,letterSpacing:3}}>VIBE / MONITOR</div>
<div style={{position:'absolute',right:110,top:71,fontFamily:M,fontSize:19,color:K.muted,letterSpacing:2}}>{name}</div>
<div style={{position:'absolute',left:108,right:108,bottom:63,height:1,background:K.grid}}/>
<div style={{position:'absolute',bottom:64,left:108,width:1699*(f+B[i])/1536,height:2,background:K.teal,boxShadow:'0 0 24px '+K.teal}}/>
<div style={{position:'absolute',bottom:26,left:109,color:'#748A9C',fontFamily:M,fontSize:16,letterSpacing:2}}>VISUAL CONCEPT · NO USER SOURCE CODE</div>
<div style={{position:'absolute',bottom:26,right:109,color:K.muted,fontFamily:M,fontSize:18}}>{i+1} / 9</div>
</AbsoluteFill>};
const Code:React.FC<{f:number}>=({f})=><div style={{position:'absolute',right:110,top:155,width:840,height:765,overflow:'hidden',transform:'perspective(1300px) rotateY(-15deg) rotateX(5deg) translateX('+(30-f*.17)+'px)',
background:'#0B1A2DF1',border:'1px solid #5A9DBC66',borderRadius:25,boxShadow:'0 45px 130px #000B'}}>
<div style={{height:62,padding:'18px 28px',fontFamily:M,fontSize:22,color:K.muted,background:'#173249'}}>● ● ●　 / product / build</div>
{Array.from({length:17},(_,i)=><div key={i} style={{marginLeft:40,marginTop:5,height:34,fontFamily:M,fontSize:20,color:i%4===0?K.teal:K.sky,opacity:.16+i*.046}}>
{String(i+1).padStart(2,'0')}　{['await deployFeature();','const router = createRouter();','state.connect(runtime);','import {service} from "./api";','compose(modules);','return build(next);'][(i+Math.floor(f/8))%6]}</div>)}
</div>;
const Nodes:React.FC<{f:number;organized?:boolean}>=({f,organized=false})=>{
const t=organized?fade(f,20,88):0;
const pos=(i:number)=>{const x=165+(i%5)*130,y=158+Math.floor(i/5)*132;
return {x:x+Math.sin(i*5.7)*112*(1-t)+Math.sin(f/31+i)*11,
y:y+Math.cos(i*4.3)*70*(1-t)+Math.cos(f/43+i)*8}};
return <svg width={850} height={755} viewBox="0 0 850 755" style={{overflow:'visible'}}>
{Array.from({length:33},(_,i)=>{const a=pos(i%20),b=pos((i*7+3)%20),c=organized?K.teal:i%3===0?K.red:K.sky;
return <path key={i} d={'M'+a.x+' '+a.y+' Q'+((a.x+b.x)/2+Math.sin(i)*80)+' '+((a.y+b.y)/2-40)+' '+b.x+' '+b.y}
stroke={c} strokeWidth={i%3===0?2.7:1.5} opacity={organized?.28:i%3===0?.67:.21} fill="none"/>})}
{Array.from({length:20},(_,i)=>{const p=pos(i),hot=(organized&&i===8)||(!organized&&i%7===0),color=hot?K.gold:K.teal;
return <g key={i}><circle cx={p.x} cy={p.y} r={hot?27:19} fill={color} opacity=".10"/><circle cx={p.x} cy={p.y} r={hot?12:8} fill="#112F39" stroke={color} strokeWidth="2.4"/><circle cx={p.x} cy={p.y} r="2.5" fill="#F1FAFF"/></g>})}
</svg>};
const VMark:React.FC<{f:number;size?:number}>=({f,size=440})=><svg width={size} height={size} viewBox="0 0 500 500">
<g transform={'rotate('+(f*.33)+' 250 250)'}>{[218,184,145].map((r,i)=><circle key={i} cx="250" cy="250" r={r} fill="none" stroke={i===1?K.gold:K.teal} strokeWidth="2" strokeDasharray={i===1?'10 16':'3 15'} opacity=".44"/>)}</g>
<path d="M126 153L248 363L369 153" stroke="#ECF9FA" strokeWidth="49" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
<path d="M143 157L246 336" stroke={K.teal} strokeWidth="11" strokeLinecap="round"/>
</svg>;
const One:React.FC=()=>{const f=useCurrentFrame();return <Scene i={0} name="01 / VELOCITY">
<Code f={f}/><div style={{position:'absolute',left:132,top:223}}>{label('THE AGE OF VIBE CODING',K.teal)}</div>
<Head a="代码写得" b="越来越快。" size={111} top={296}/>
<div style={{position:'absolute',left:133,bottom:208,fontFamily:M,fontSize:34,color:K.sky,opacity:fade(f,53)}}>FEATURES / {Math.round(f*2.8)+14}</div></Scene>};
const Two:React.FC=()=>{const f=useCurrentFrame();return <Scene i={1} name="02 / TECH DEBT" red>
<div style={{position:'absolute',right:20,top:153,transform:'perspective(1300px) rotateY(-11deg)'}}><Nodes f={f}/></div>
<div style={{position:'absolute',left:120,top:212}}>{label('HIDDEN COUPLING / RISING',K.red)}</div>
<Head a="功能一层层叠加。" b="依赖也越缠越乱。" size={78} top={289} accent={K.red}/>
<div style={{position:'absolute',left:130,bottom:202,width:570,padding:29,background:'#3A1724CA',border:'1px solid '+K.red+'88',borderRadius:14,opacity:fade(f,36)}}>
{label('WARN / BLAST RADIUS',K.red)}<div style={{fontSize:28,marginTop:19}}>每一次修改，都牵动更多模块。</div></div></Scene>};
const Three:React.FC=()=>{const f=useCurrentFrame();return <Scene i={2} name="03 / THE HESITATION" red>
<div style={{position:'absolute',left:120,top:212,width:1190,height:665,background:'#081320EF',border:'1px solid #49617B',borderRadius:22,transform:'perspective(1300px) rotateY(6deg)'}}>
<div style={{background:'#182C3A',padding:20,fontFamily:M,fontSize:21,color:K.muted}}>src / core / runtime.ts</div>
{['136  export function update() {','137    const next = merge(state);','138    validateChanges(next);',
'139 -  return legacy.sync(next);','140 +  return modern.sync(next);','141    notifyDependents();','142  }'].map((v,i)=>
<div key={i} style={{marginTop:24,marginLeft:38,fontSize:28,fontFamily:M,color:i===4?K.red:i===3?K.teal:K.sky,opacity:fade(f,10+i*7),background:i===4?'#61304577':'none'}}>{v}</div>)}
<div style={{position:'absolute',left:35,bottom:35,fontFamily:M,fontSize:21,color:K.red,opacity:.6+.4*Math.sin(f/4)}}>▋ SHOULD I REALLY CHANGE THIS?</div>
</div>
<div style={{position:'absolute',right:90,top:334,width:555,borderRadius:20,padding:37,background:'#381A2ACF',border:'1px solid '+K.red+'99',opacity:fade(f,40)}}>
{label('FEAR OF REGRESSION',K.red)}<div style={{fontSize:60,fontWeight:850,marginTop:27,lineHeight:1.35}}>越做越大。<br/>越不敢改。</div></div></Scene>};
const Four:React.FC=()=>{const f=useCurrentFrame();return <Scene i={3} name="04 / REVEAL">
<div style={{position:'absolute',left:130,top:252,filter:'drop-shadow(0 0 48px #4AE8C255)',transform:'scale('+(0.75+.25*fade(f,0,75))+')'}}><VMark f={f}/></div>
<div style={{position:'absolute',left:685,top:265}}>{label('INTRODUCING / YOUR ARCHITECTURE GUARD',K.teal)}</div>
<div style={{position:'absolute',left:666,top:335,fontFamily:M,fontWeight:900,fontSize:115,letterSpacing:-7,opacity:fade(f,12)}}>VIBE</div>
<div style={{position:'absolute',left:666,top:477,fontFamily:M,fontWeight:900,fontSize:115,letterSpacing:-7,color:K.teal,opacity:fade(f,24)}}>MONITOR<span style={{color:K.text}}>.</span></div>
<div style={{position:'absolute',left:685,top:680,fontSize:43,color:K.sky,opacity:fade(f,52)}}>架构的第二双眼睛。</div></Scene>};
const Five:React.FC=()=>{const f=useCurrentFrame();return <Scene i={4} name="05 / ARCHITECTURE INTELLIGENCE">
<div style={{position:'absolute',left:50,top:170,transform:'perspective(1200px) rotateY(8deg)'}}><Nodes f={f} organized/></div>
<div style={{position:'absolute',right:115,top:207}}>{label('LOCAL EVOLUTION / STRUCTURE SIGNALS',K.teal)}</div>
<div style={{position:'absolute',right:112,top:287,fontSize:67,fontWeight:820,lineHeight:1.33}}>风险变得可见。<br/><span style={{color:K.teal}}>行动更有依据。</span></div>
{[['STRUCTURE','复杂度和结构演化'],['COUPLING','依赖与修改影响'],['DECISION','何时重构，下一步做什么']].map((v,i)=>
<div key={i} style={{position:'absolute',right:128,top:552+i*96,width:680,padding:24,background:'#142D3DBB',borderLeft:'4px solid '+(i===2?K.gold:K.teal),borderRadius:10,display:'flex',gap:27,opacity:fade(f,20+i*21),transform:'translateX('+(60*(1-fade(f,20+i*21)))+'px)'}}>
<span style={{fontFamily:M,fontSize:23,color:i===2?K.gold:K.teal,width:174}}>{v[0]}</span><span style={{fontSize:26}}>{v[1]}</span></div>)}
</Scene>};
const Six:React.FC=()=>{const f=useCurrentFrame();return <Scene i={5} name="06 / PRIVACY">
<Head a="源码留在本地。" b="安全边界，看得见。" top={160} size={78}/>
<div style={{position:'absolute',left:110,top:500,width:720,height:300,border:'2px solid '+K.teal+'99',borderRadius:19,background:'#122A38B7',padding:32}}>
{label('LOCAL / SOURCE CODE',K.teal)}
{Array.from({length:6},(_,i)=><div key={i} style={{width:480-(i%3)*90,height:12,marginTop:23,borderRadius:5,background:i%3===0?K.teal:K.sky,opacity:.24+.1*(i%3)}}/>)}
<div style={{position:'absolute',bottom:17,right:27,fontFamily:M,fontSize:20,color:K.teal}}>READ ONLY</div></div>
<svg style={{position:'absolute',left:835,top:583}} width="235" height="90"><path d="M2 46H215" stroke={K.teal} strokeWidth="3" strokeDasharray="10 15"/><path d="M195 28L215 46L195 64" fill="none" stroke={K.teal} strokeWidth="3"/>
{Array.from({length:4},(_,i)=><circle key={i} cx={(f*3+i*55)%200} cy="46" r="5" fill={K.teal}/>)}</svg>
<div style={{position:'absolute',left:1070,top:503,width:718,height:300,border:'1px solid '+K.sky+'88',background:'#17293EC0',borderRadius:22,padding:34,opacity:fade(f,24)}}>
{label('PSEUDONYMIZED TELEMETRY',K.sky)}
<div style={{fontFamily:M,fontSize:30,marginTop:35}}>stage / count / trend</div>
<div style={{fontFamily:M,fontSize:24,color:K.teal,marginTop:30}}>NO SOURCE · NO PROMPTS · NO KEYS</div></div>
<div style={{position:'absolute',bottom:119,left:122,fontSize:22,color:K.muted}}>Private Beta 按公开政策采集去标识化遥测；不上传源码和提示词。</div></Scene>};
const Seven:React.FC=()=>{const f=useCurrentFrame();return <Scene i={6} name="07 / MINIMAL OVERHEAD">
<Head a="让 Token 留给创造。" b="让规则在本地运行。" top={177} size={85}/>
<div style={{position:'absolute',left:118,right:118,top:567,display:'flex',gap:25,alignItems:'center'}}>
{[['LOCAL','代码结构'],['RULES','轻量分析'],['FINDINGS','风险信号'],['AGENT','决策建议']].map((v,i)=><React.Fragment key={i}>
<div style={{flex:1,padding:27,height:167,background:'#153344BB',border:'1px solid '+K.teal+'88',borderRadius:18,opacity:fade(f,20+i*15)}}>
{label(v[0],K.teal)}<div style={{fontSize:37,fontWeight:730,marginTop:22}}>{v[1]}</div></div>
{i<3&&<div style={{fontSize:50,color:K.teal}}>→</div>}</React.Fragment>)}</div>
<div style={{position:'absolute',bottom:125,left:126,fontSize:24,color:K.muted}}>规则扫描通常无需额外 LLM 推理请求；Agent 工具交互仍有少量上下文开销。</div></Scene>};
const Eight:React.FC=()=>{const f=useCurrentFrame();const command='npx -y --registry=https://registry.npmjs.org @vibe-monitor/setup@beta install';
return <Scene i={7} name="08 / ONE LINE INSTALL"><Head a="只需一行安装。" b="免费 Beta 邀请码。" top={170} size={84}/>
<div style={{position:'absolute',left:120,right:120,top:471,height:180,background:'#091824ED',border:'1px solid '+K.teal+'AA',borderRadius:18,overflow:'hidden'}}>
<div style={{height:55,background:'#16354A',padding:15,color:K.muted,fontFamily:M,fontSize:20}}>TERMINAL / VIBE SETUP</div>
<div style={{fontFamily:M,fontSize:27,color:K.sky,padding:32,whiteSpace:'nowrap'}}><span style={{color:K.teal}}>$ </span>{command.slice(0,Math.round(command.length*fade(f,18,96)))}<span style={{color:K.teal}}>▌</span></div></div>
<div style={{position:'absolute',left:126,top:700,display:'flex',gap:13}}>{['CODEX','CLAUDE CODE','CURSOR','ANTIGRAVITY','TRAE'].map((s,i)=>
<div key={i} style={{borderRadius:12,border:'1px solid '+K.teal+'88',background:'#142D40CB',padding:'22px 25px',color:i===4?K.gold:K.sky,fontFamily:M,fontSize:23,opacity:fade(f,47+i*8)}}>{s}</div>)}</div>
<div style={{position:'absolute',left:130,bottom:118,fontSize:25,color:K.muted}}>Windows / macOS / Linux　·　邀请码免费申请</div></Scene>};
const Nine:React.FC=()=>{const f=useCurrentFrame();return <Scene i={8} name="09 / NEXT CHAPTER">
<svg width="1920" height="1080" style={{position:'absolute',inset:0,opacity:.30}}>{Array.from({length:52},(_,i)=>{const a=i*2.399+f*.0026,r=220+(i*33)%640,x=930+Math.cos(a)*r,y=510+Math.sin(a)*r*.67;return <g key={i}><path d={'M930 510L'+x+' '+y} stroke={i%6===0?K.gold:K.teal} opacity=".45"/><circle cx={x} cy={y} r="3.4" fill={K.teal}/></g>})}</svg>
<div style={{position:'absolute',left:130,top:270,transform:'scale(.72)',transformOrigin:'top left'}}><VMark f={f}/></div>
<div style={{position:'absolute',left:540,top:300,fontFamily:M,fontSize:125,fontWeight:930,letterSpacing:-7,opacity:fade(f,15)}}>VIBE <span style={{color:K.teal}}>MONITOR.</span></div>
<div style={{position:'absolute',left:551,top:500,fontSize:58,fontWeight:780,opacity:fade(f,31)}}>让 AI 专心创造。</div>
<div style={{position:'absolute',left:551,top:584,fontSize:58,fontWeight:780,color:K.teal,opacity:fade(f,44)}}>让架构持续进化。</div>
<div style={{position:'absolute',left:550,top:742,display:'flex',gap:16,opacity:fade(f,64)}}>{['免费内测邀请码','Beta 后计划全面开源','未来常驻 Agent','后台架构分析 · 生态扩展'].map(v=><div key={v} style={{padding:'16px 19px',border:'1px solid '+K.teal+'99',borderRadius:10,background:'#102B37BC',fontSize:21}}>{v}</div>)}</div>
</Scene>};
const parts=[One,Two,Three,Four,Five,Six,Seven,Eight,Nine];
const aRoot='vibe-monitor-directors-launch/audio/';
export const VibeMonitorDirectorCut:React.FC=()=> <AbsoluteFill style={{background:K.navy}}>
<Audio src={staticFile(aRoot+'score.wav')} volume={.33}/>
<Audio src={staticFile(aRoot+'foley.wav')} volume={.65}/>
{parts.map((Component,i)=><Sequence key={i} from={B[i]} durationInFrames={B[i+1]-B[i]}><Component/></Sequence>)}
{parts.map((_,i)=><Sequence key={'vo'+i} from={B[i]+2} durationInFrames={B[i+1]-B[i]-2}>
<Audio src={staticFile(aRoot+'voice-'+String(i+1).padStart(2,'0')+'.wav')} volume={.97}/></Sequence>)}
</AbsoluteFill>;
