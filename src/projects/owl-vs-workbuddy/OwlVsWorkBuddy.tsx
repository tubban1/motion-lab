import React from "react";
import {AbsoluteFill,Audio,Sequence,interpolate,Easing,staticFile,useCurrentFrame} from "remotion";

const P={ink:"#060A12",white:"#F3F7FF",muted:"#A4B7C7",dim:"#587084",teal:"#5AF4CF",amber:"#F4B978",blue:"#91BBFA",grid:"#284357"};
const FONT='"PingFang SC","Hiragino Sans GB",sans-serif', MONO='"SFMono-Regular",Menlo,monospace';
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const ease=Easing.bezier(.19,.81,.18,1);
const show=(f:number,start:number,len=19)=>interpolate(f,[start,start+len],[0,1],{extrapolateLeft:"clamp",extrapolateRight:"clamp",easing:ease});
const up=(f:number,d:number,n=75)=>"translateY("+(n*(1-show(f,d)))+"px)";
const label=(text:string,color=P.muted)=><div style={{fontFamily:MONO,fontSize:23,letterSpacing:4,color}}>{text}</div>;
const Brand:React.FC<{title:string;duration:number;children:React.ReactNode}>=({title,duration,children})=>{
 const f=useCurrentFrame();const fade=Math.min(show(f,0,9),1-show(f,duration-13,13));
 return <AbsoluteFill style={{opacity:fade,overflow:"hidden"}}>
 <div style={{position:"absolute",inset:0,transform:"scale("+(1+.018*f/duration)+")"}}>{children}</div>
 <div style={{position:"absolute",top:62,left:105,fontFamily:MONO,color:P.teal,letterSpacing:4,fontWeight:850,fontSize:25}}>MOTION LAB</div>
 <div style={{position:"absolute",top:67,left:335,fontFamily:MONO,color:P.muted,letterSpacing:3,fontSize:18}}>FIELD EXPERIMENT / 2026.10.10</div>
 <div style={{position:"absolute",top:67,right:105,fontFamily:MONO,color:P.amber,letterSpacing:2,fontSize:20}}>{title}</div>
 <div style={{position:"absolute",bottom:80,left:104,right:104,height:1,background:P.grid}}/>
 <div style={{position:"absolute",bottom:79,left:105,width:(100*clamp(f/duration))+"%",height:2,background:P.teal,boxShadow:"0 0 25px "+P.teal}}/>
 <div style={{position:"absolute",bottom:43,left:105,color:P.dim,fontFamily:MONO,fontSize:17,letterSpacing:3}}>ONE MACHINE / TWO AGENTS</div>
 <div style={{position:"absolute",bottom:43,right:105,color:P.muted,fontFamily:MONO,fontSize:17}}>SCENE / {Math.round(f/duration*100)}%</div>
 </AbsoluteFill>;
};
const Base:React.FC=()=>{
 const f=useCurrentFrame();
 return <AbsoluteFill style={{background:"radial-gradient(circle at "+(50+8*Math.sin(f/150))+"% 43%,#183344 0%,#091321 45%,#050910 90%)"}}>
 <div style={{position:"absolute",left:-350,top:-520,width:2600,height:2000,transform:"perspective(1050px) rotateX(67deg) rotateZ(-17deg) translateY("+((f*.3)%100)+"px)",backgroundImage:"linear-gradient("+P.grid+"55 1px,transparent 1px),linear-gradient(90deg,"+P.grid+"55 1px,transparent 1px)",backgroundSize:"105px 105px",opacity:.35}}/>
 {Array.from({length:78},(_,i)=><div key={i} style={{position:"absolute",left:(i*251+17)%1910,top:(i*691+f*(.35+i%3*.12))%1080,width:i%4+2,height:i%4+2,borderRadius:"50%",background:i%6===0?P.amber:P.teal,opacity:.12+(i%6)*.07}}/>)}
 <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 50% 50%,transparent 30%,#04071099 91%)"}}/>
 </AbsoluteFill>;
};
const Hero:React.FC<{f:number;top?:number;eyebrow:string;line1:string;line2?:string;accent?:string;size?:number}>=({f,top=240,eyebrow,line1,line2,accent=P.teal,size=100})=>
 <div style={{position:"absolute",left:133,top}}>
 <div style={{opacity:show(f,3),transform:up(f,3,24)}}>{label(eyebrow,accent)}</div>
 <div style={{fontFamily:FONT,fontSize:size,fontWeight:850,letterSpacing:-4,lineHeight:1.2,marginTop:24,color:P.white,opacity:show(f,13),transform:up(f,13)}}>{line1}</div>
 {line2&&<div style={{fontFamily:FONT,fontSize:size,fontWeight:850,letterSpacing:-4,lineHeight:1.2,color:accent,opacity:show(f,23),transform:up(f,23)}}>{line2}</div>}
 </div>;
const Halo:React.FC<{f:number;x:number;y:number;r:number;color:string}>=({f,x,y,r,color})=>
 <svg style={{position:"absolute",inset:0}} width={1920} height={1080} viewBox="0 0 1920 1080">
 <g transform={"translate("+x+" "+y+") rotate("+(f*.32)+")"}>
 {[1,.83,.59].map((m,i)=><circle key={i} r={r*m} fill="none" stroke={i===1?P.amber:color} strokeOpacity={.21+i*.03} strokeWidth={i===1?2:1.5} strokeDasharray={i===1?"10 19":"3 18"}/>)}
 <ellipse rx={r*1.14} ry={r*.31} transform="rotate(-28)" fill="none" stroke={color} strokeOpacity={.44} strokeWidth={2.5}/>
 <ellipse rx={r*.34} ry={r*.98} transform="rotate(31)" fill="none" stroke={P.blue} strokeOpacity={.15}/>
 {Array.from({length:30},(_,i)=>{const a=(i*Math.PI/15+f*.008);return <circle key={i} cx={Math.cos(a)*r*.82} cy={Math.sin(a)*r*.58} r={i%7===0?5:2.4} fill={i%5===0?P.amber:color} opacity={.5}/>;})}
 </g></svg>;
const Intro:React.FC=()=>{const f=useCurrentFrame();return <Brand duration={144} title="01 / THE QUESTION">
 <Halo f={f} x={1350} y={560} r={410} color={P.teal}/>
 <div style={{position:"absolute",left:1164,top:335,width:395,height:395,borderRadius:"50%",background:"radial-gradient(circle at 35% 32%,#1E766D,#0D2B38 48%,#07101B 78%)",border:"2px solid "+P.teal+"44",boxShadow:"0 0 125px #49E9C42B",transform:"scale("+(0.72+.28*show(f,0,75))+")"}}/>
 <Hero f={f} top={280} eyebrow="REAL-WORLD AGENT TEST" line1="同一台电脑。" line2="两种 AI 执行方式。" size={106}/>
 <div style={{position:"absolute",left:138,top:715,fontFamily:FONT,fontSize:34,color:P.muted,opacity:show(f,51)}}>谁能更快、更可靠地完成真实任务？</div>
 </Brand>};
const DataFlow:React.FC<{f:number;offset:number;color:string;reverse?:boolean}>=({f,offset,color,reverse})=>
 <svg style={{position:"absolute",left:offset,top:380,opacity:.75}} width={900} height={500}>
 {Array.from({length:30},(_,i)=>{const y=80+i%10*33;const u=clamp((f-7-(i*13)%70)/72);return <g key={i}><path d={"M 20 "+y+" C 210 "+(y-90)+" 470 "+(y+75)+" 870 "+y} fill="none" stroke={color} strokeOpacity={.045+i%4*.025} strokeWidth={1.4}/><circle cx={20+850*(reverse?1-u:u)} cy={y+22*Math.sin(i+u*4)} r={i%5===0?4:2} fill={color} opacity={u<1?.7:0}/></g>})}
 </svg>;
const AgentBox:React.FC<{f:number;x:number;color:string;name:string;desc:string;delay:number}>=({f,x,color,name,desc,delay})=>
 <div style={{position:"absolute",left:x,top:306,width:710,height:437,background:"linear-gradient(140deg,#183549E8,#0B1925EC)",border:"1px solid "+color+"6A",boxShadow:"0 30px 90px #0008,0 0 90px "+color+"13",borderRadius:24,opacity:show(f,delay),transform:"perspective(1400px) rotateY("+(x<900?-6:6)+"deg) "+up(f,delay,55)}}>
 <div style={{position:"absolute",top:36,left:43,width:13,height:13,borderRadius:"50%",background:color,boxShadow:"0 0 22px "+color}}/>
 <div style={{position:"absolute",top:31,left:74}}>{label("AGENT SYSTEM",color)}</div>
 <div style={{position:"absolute",left:49,top:124,fontFamily:MONO,fontSize:67,fontWeight:900,color:P.white}}>{name}</div>
 <div style={{position:"absolute",left:49,top:238,fontSize:29,color:P.muted,fontFamily:FONT}}>{desc}</div>
 <div style={{position:"absolute",left:49,right:49,bottom:67,height:4,background:P.grid}}>
 <div style={{height:4,background:color,width:(100*show(f,delay+20,83))+"%",boxShadow:"0 0 17px "+color}}/></div>
 </div>;
const Agents:React.FC=()=>{const f=useCurrentFrame();return <Brand duration={144} title="02 / DUAL SYSTEMS">
 <Hero f={f} top={125} eyebrow="TWO AUTONOMOUS AGENTS" line1="同一场测试。" size={86} accent={P.white}/>
 <DataFlow f={f} offset={70} color={P.teal}/><DataFlow f={f} offset={950} color={P.amber} reverse/>
 <AgentBox f={f} x={150} color={P.teal} name="OWL LAB" desc="ChatGPT → MCP → Runtime" delay={12}/>
 <AgentBox f={f} x={1050} color={P.amber} name="WorkBuddy" desc="集成式 Agent 工作流" delay={26}/>
 <div style={{position:"absolute",left:925,top:495,fontFamily:MONO,fontSize:43,color:P.white,fontWeight:950,opacity:show(f,50)}}>VS</div>
 <div style={{position:"absolute",left:150,top:826,fontFamily:FONT,fontSize:28,color:P.muted,opacity:show(f,63)}}>同一台 Mac · 同类只读空间分析 · 没有删除文件</div>
 </Brand>};
const MeasureRow:React.FC<{f:number;label:string;value:string;percent:number;i:number}>=({f,label,value,percent,i})=>{
 const d=38+i*21;
 return <div style={{height:107,width:720,marginBottom:21,opacity:show(f,d),transform:up(f,d,35)}}>
 <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",fontFamily:MONO,color:P.white,fontSize:25}}><span>{label}</span><b style={{fontSize:33,color:i===0?P.teal:P.amber}}>{value}</b></div>
 <div style={{height:10,marginTop:17,background:"#243F5388",borderRadius:5,overflow:"hidden"}}><div style={{height:10,width:(percent*show(f,d+4,38))+"%",background:i===0?P.teal:P.amber,boxShadow:"0 0 15px "+P.teal}}/></div>
 </div>;
};
const Disk:React.FC=()=>{const f=useCurrentFrame();return <Brand duration={192} title="03 / SPACE EXPLORATION">
 <Hero f={f} top={140} eyebrow="MAC / DISK SCAN" line1="扫描同一块磁盘。" size={87}/>
 <div style={{position:"absolute",left:140,top:410}}>
 <MeasureRow f={f} i={0} label="~/Library" value="114 GB" percent={100}/>
 <MeasureRow f={f} i={1} label="~/Documents" value="63 GB" percent={55}/>
 <MeasureRow f={f} i={2} label="~/.gemini" value="33 GB" percent={29}/>
 <div style={{fontFamily:FONT,fontSize:26,color:P.muted,opacity:show(f,112)}}>两份报告，都找到了主要空间占用。</div></div>
 <Halo f={f} x={1380} y={565} r={348} color={P.teal}/>
 <div style={{position:"absolute",left:1076,top:444,width:604,textAlign:"center"}}>
 {label("APFS / CAPACITY")}
 <div style={{fontFamily:MONO,fontSize:120,fontWeight:900,color:P.white,marginTop:12}}>{Math.round(460*show(f,12,87))}<span style={{fontSize:40,color:P.muted}}> GiB</span></div>
 <div style={{fontFamily:FONT,fontSize:31,color:P.amber}}>可用约 13 GiB</div></div>
 <div style={{position:"absolute",left:(17*f%2350)-300,top:170,width:6,height:700,background:"linear-gradient(transparent,"+P.teal+"A0,transparent)",transform:"rotate(21deg)",opacity:.3}}/>
 </Brand>};
const Lane:React.FC<{f:number;top:number;label:string;time:string;color:string;target:number;delay:number}>=({f,top,label,time,color,target,delay})=>
 <div style={{position:"absolute",left:155,right:155,top}}>
 <div style={{display:"flex",justifyContent:"space-between",fontFamily:MONO,alignItems:"baseline"}}><span style={{fontSize:53,fontWeight:850,color}}>{label}</span><span style={{fontSize:82,fontWeight:900,color:P.white,letterSpacing:-5}}>{time}</span></div>
 <div style={{position:"relative",marginTop:31,height:33,background:"#243A5177",border:"1px solid #577C8E55",borderRadius:20}}>
 <div style={{height:"100%",borderRadius:20,width:(target*show(f,delay,130)*100)+"%",background:"linear-gradient(90deg,"+color+"55,"+color+")",boxShadow:"0 0 38px "+color+"66"}}/>
 <div style={{position:"absolute",left:(target*show(f,delay,130)*100)+"%",top:-12,width:10,height:58,transform:"translateX(-50%)",opacity:show(f,delay),background:P.white,boxShadow:"0 0 28px "+color}}/>
 </div>
 <div style={{marginTop:19,fontSize:22,fontFamily:FONT,color:P.muted}}>{label==="OWL LAB"?"持久 Runtime 进程 · 两段扫描":"集成 Agent · 16 次 Shell 调用"}</div>
 </div>;
const Race:React.FC=()=>{const f=useCurrentFrame();return <Brand duration={288} title="04 / THE RACE">
 <Hero f={f} top={133} eyebrow="END-TO-END / OBSERVED" line1="谁先完成这次任务？" size={88}/>
 <Lane f={f} top={350} label="OWL LAB" time="20:47" color={P.teal} target={1247/1607} delay={24}/>
 <Lane f={f} top={674} label="WorkBuddy" time="26:47" color={P.amber} target={1} delay={52}/>
 <div style={{position:"absolute",left:155,bottom:150,fontSize:25,fontFamily:FONT,color:P.muted,opacity:show(f,170)}}>真实工作流耗时 · 检查顺序及完成步骤并不完全一致</div>
 </Brand>};
const Delta:React.FC=()=>{const f=useCurrentFrame();const p=show(f,8,40);
 return <Brand duration={192} title="05 / IMPACT">
 <div style={{position:"absolute",left:118,top:230}}>{label("OBSERVED TIME DIFFERENCE",P.amber)}</div>
 <div style={{position:"absolute",left:103,top:325,fontFamily:MONO,fontWeight:950,fontSize:306,letterSpacing:-16,lineHeight:1,color:P.teal,textShadow:"0 0 110px #50EECA4D",opacity:show(f,4,30),transform:"scale("+(1.28-.28*p)+")",transformOrigin:"left center"}}>06:00</div>
 <div style={{position:"absolute",right:143,top:345,width:526,height:376,borderRadius:27,border:"1px solid "+P.amber+"77",background:"#162D39DA",opacity:show(f,40),transform:up(f,40,70)}}>
 <div style={{position:"absolute",top:59,left:50,fontFamily:FONT,fontSize:30,color:P.amber}}>本次工作流耗时减少</div>
 <div style={{position:"absolute",top:122,left:38,fontFamily:MONO,fontWeight:900,fontSize:150,letterSpacing:-7,color:P.white}}>≈22%</div>
 <div style={{position:"absolute",left:49,right:49,bottom:53,height:6,background:P.grid}}><div style={{height:6,width:(p*100)+"%",background:P.amber}}/></div>
 </div>
 <div style={{position:"absolute",left:123,top:838,width:1680,fontSize:28,fontFamily:FONT,color:P.muted,opacity:show(f,90)}}>仅反映本次任务流程，不代表两种底层引擎存在 22% 的固有性能差距。</div>
 {Array.from({length:51},(_,i)=>{const a=i*2.4,r=(115+(i*17)%390)*show(f,18,80);return <div key={i} style={{position:"absolute",left:950+Math.cos(a)*r*1.5,top:550+Math.sin(a)*r,width:3+i%4,height:3+i%4,borderRadius:"50%",background:i%5?P.teal:P.amber,opacity:.6*(1-show(f,70,100))}}/>})}
 </Brand>;
};
const Fact:React.FC<{f:number;i:number;keyText:string;value:string;desc:string;color:string}>=({f,i,keyText,value,desc,color})=>{
 const d=13+i*28;
 return <div style={{position:"absolute",left:146,top:380+i*166,width:1617,height:151,opacity:show(f,d),transform:up(f,d,57),background:"linear-gradient(90deg,#152D3CBD,#0B1A27E5)",borderLeft:"5px solid "+color,borderRadius:"0 20px 20px 0",display:"flex",alignItems:"center",padding:"0 46px",gap:37}}>
 <div style={{fontFamily:MONO,fontSize:23,fontWeight:700,color,width:218}}>{keyText}</div>
 <div style={{fontFamily:MONO,fontSize:54,fontWeight:900,color:P.white,width:385}}>{value}</div>
 <div style={{fontSize:27,color:P.muted,fontFamily:FONT}}>{desc}</div></div>;
};
const Audit:React.FC=()=>{const f=useCurrentFrame();return <Brand duration={192} title="06 / EVIDENCE">
 <Hero f={f} top={125} eyebrow="ACCURACY MATTERS" line1="快，也必须可信。" size={88}/>
 <Fact f={f} i={0} keyText="SHARED FINDINGS" value="114 / 63 / 33" desc="Library、Documents、Gemini (GB)" color={P.teal}/>
 <Fact f={f} i={1} keyText="READ-ONLY" value="0 删除" desc="数据库、聊天历史与源码均未清理" color={P.amber}/>
 <Fact f={f} i={2} keyText="TOOL METRICS" value="33 vs 36" desc="Tool Steps / Tool Calls 口径不同" color={P.blue}/>
 </Brand>};
const Outro:React.FC=()=>{const f=useCurrentFrame();return <Brand duration={96} title="07 / THE PRINCIPLE">
 <Halo f={f} x={960} y={545} r={430} color={P.teal}/>
 <div style={{position:"absolute",inset:0,background:"radial-gradient(circle at 50% 50%,#07192399,transparent 70%)"}}/>
 <div style={{position:"absolute",top:353,width:"100%",textAlign:"center",opacity:show(f,5,25),transform:"scale("+(0.7+.3*show(f,6,53))+")"}}>
 <div style={{fontFamily:FONT,fontSize:103,color:P.white,fontWeight:850,letterSpacing:-4}}>真正的效率，</div>
 <div style={{fontFamily:FONT,fontSize:108,color:P.teal,fontWeight:850,letterSpacing:-4,marginTop:26}}>是可靠地完成任务。</div></div>
 <div style={{position:"absolute",bottom:176,width:"100%",textAlign:"center",opacity:show(f,42),fontFamily:MONO,fontSize:23,color:P.muted,letterSpacing:6}}>OWL LAB  ×  WORKBUDDY   /   MOTION LAB</div>
 </Brand>};
export const OwlVsWorkBuddy:React.FC=()=>{
 return <AbsoluteFill style={{background:P.ink,color:P.white,fontFamily:FONT}}>
  <Base/>
  <Audio src={staticFile("audio/owl-vs-workbuddy-2026-10/score.wav")} volume={.9}/>
  <Sequence from={0} durationInFrames={144}><Intro/></Sequence>
  <Sequence from={144} durationInFrames={144}><Agents/></Sequence>
  <Sequence from={288} durationInFrames={192}><Disk/></Sequence>
  <Sequence from={480} durationInFrames={288}><Race/></Sequence>
  <Sequence from={768} durationInFrames={192}><Delta/></Sequence>
  <Sequence from={960} durationInFrames={192}><Audit/></Sequence>
  <Sequence from={1152} durationInFrames={96}><Outro/></Sequence>
 </AbsoluteFill>;
};
