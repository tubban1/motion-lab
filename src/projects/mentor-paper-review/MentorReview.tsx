import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame} from 'remotion';
import timing from './timing.json';
const INK='#08121e',IVORY='#f4efe6',MUTED='#aabac6',TEAL='#79dfc9',GOLD='#efc388',RED='#ec9c98',BLUE='#98baff';
const FONT='"PingFang SC","Hiragino Sans GB",Arial,sans-serif';
const MONO='"SFMono-Regular",Menlo,monospace';
const enter=(f:number,d=0)=>interpolate(f,[d,d+22],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
const drift=(f:number,d=0)=>interpolate(f,[d,d+22],[38,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
const stamp=(s:string,color:string=GOLD):React.CSSProperties=>({padding:'16px 26px',border:'1px solid '+color+'77',borderRadius:14,background:'#142d3e99',color,fontFamily:MONO,fontSize:25,letterSpacing:2});
const block=(color=TEAL):React.CSSProperties=>({border:'1px solid '+color+'6A',background:'#142739DC',borderRadius:20,padding:40,boxShadow:'0 25px 60px #00000033'});
const label=(text:string,color=MUTED)=><span style={{fontSize:23,fontFamily:MONO,letterSpacing:2,color}}>{text}</span>;
const Big=({children,color=IVORY,size=98}:{children:React.ReactNode,color?:string,size?:number})=><div style={{fontSize:size,fontFamily:FONT,fontWeight:730,lineHeight:1.25,letterSpacing:-3,color}}>{children}</div>;

const Atmosphere:React.FC=()=>{
 const f=useCurrentFrame();
 return <AbsoluteFill style={{background:'radial-gradient(circle at '+(67+Math.sin(f/89)*6)+'% 25%,#183c50 0%,#102237 28%,'+INK+' 72%)'}}>
  <div style={{position:'absolute',inset:0,opacity:.24,backgroundImage:'linear-gradient(#60829334 1px,transparent 1px),linear-gradient(90deg,#60829334 1px,transparent 1px)',backgroundSize:'120px 120px'}}/>
  {Array.from({length:110},(_,i)=>{
   const x=40+(i*1679)%1840,y=60+((i*781+f*(.24+i%4))%960);
   return <div key={i} style={{position:'absolute',left:x,top:y,width:2+i%4,height:2+i%4,borderRadius:'50%',background:i%4===0?GOLD:TEAL,opacity:.16+(i%7)*.07}}/>;
  })}
  <div style={{position:'absolute',top:100,right:80,width:720,height:720,borderRadius:'50%',background:'radial-gradient(circle,#83DCC51A,transparent 68%)',filter:'blur(45px)'}}/>
 </AbsoluteFill>;
};

const ParticleCluster:React.FC<{frame:number}>=({frame})=><svg width={760} height={640} style={{position:'absolute',right:110,top:225}}>
 <circle cx="390" cy="310" r="236" fill="none" stroke={TEAL} opacity=".2" strokeDasharray="4 14" strokeWidth="2"/>
 <circle cx="390" cy="310" r="159" fill="none" stroke={GOLD} opacity=".21" strokeWidth="2"/>
 {Array.from({length:86},(_,i)=>{
  const a=i*2.399+frame*.002*((i%2)?1:-1),r=48+((i*37)%230);
  return <circle key={i} cx={390+Math.cos(a)*r} cy={310+Math.sin(a)*r*.72} r={i%9===0?7:3} fill={i%5===0?GOLD:TEAL} opacity={.24+(i%5)*.13}/>;
 })}
 </svg>;

const Visual:React.FC<{index:number}>=({index})=>{
 const f=useCurrentFrame();
 if(index===0)return <>
  <ParticleCluster frame={f}/>
  <div style={{position:'absolute',left:140,top:530,fontSize:43,fontFamily:FONT,color:MUTED,lineHeight:1.9,opacity:enter(f,30)}}>研究问题有价值。<br/>方法框架有潜力。<br/>证据链还没有闭合。</div>
  <div style={{position:'absolute',right:200,bottom:170,transform:'rotate(-10deg) scale('+spring({frame:f-54,fps:24,config:{stiffness:120,damping:11}})+')',border:'5px solid '+RED,color:RED,fontSize:57,fontFamily:MONO,letterSpacing:7,padding:'18px 31px'}}>NOT READY</div>
 </>;
 if(index===1)return <div style={{position:'absolute',left:140,top:520,display:'flex',alignItems:'center',gap:28}}>
   {[['CURRENT + HISTORY','s(t) · s(t−τ)',BLUE],['LEARNED UNCERTAINTY','Q → covariance',GOLD],['COLLECTIVE ORDER','micro → macro',TEAL]].map((item,i)=>
    <React.Fragment key={i}><div style={{...block(item[2]),width:460,height:245,opacity:enter(f,30+i*22),transform:'translateY('+drift(f,30+i*22)+'px)'}}>
     <div style={{height:4,width:65,background:item[2],marginBottom:38}}/>{label(item[0],item[2])}<div style={{fontSize:34,color:IVORY,fontFamily:MONO,marginTop:23}}>{item[1]}</div>
     </div>{i<2&&<div style={{fontFamily:MONO,fontSize:43,color:GOLD,opacity:enter(f,43+i*24)}}>→</div>}</React.Fragment>)}
 </div>;
 if(index===2)return <>
  <div style={{position:'absolute',left:138,top:505,display:'flex',gap:42}}>
   {[['τ = 20','更早形成组织',TEAL],['τ = 100','晚期谱序更强',GOLD]].map((v,i)=><div key={i} style={{...block(v[2]),width:600,height:260,opacity:enter(f,35+i*26)}}>
    <div style={{fontSize:74,color:v[2],fontFamily:MONO}}>{v[0]}</div><div style={{fontSize:34,color:IVORY,fontFamily:FONT,marginTop:17}}>{v[1]}</div></div>)}
  </div>
  <svg style={{position:'absolute',right:146,bottom:135}} width="352" height="250" viewBox="0 0 352 250">
   <path d="M25 15V218H345" stroke={MUTED} opacity=".5" fill="none" strokeWidth="2"/>
   <path d="M30 153 C70 55 110 189 154 88 S225 203 275 64 S327 170 345 62" stroke={GOLD} fill="none" strokeWidth="5" strokeDasharray="1000" strokeDashoffset={1000*(1-Math.min(1,Math.max(0,(f-50)/65)))}/>
   <text x="22" y="243" fill={MUTED} fontSize="16">趋势示意 / 非原始数据</text>
  </svg></>;
 if(index===3)return <div style={{position:'absolute',left:140,top:514,display:'flex',gap:40}}>
   <div style={{...block(RED),width:710,height:290,opacity:enter(f,30)}}>{label('FIGURE 4 · CURRENT',RED)}
   <Big size={58}>时间标准差</Big><div style={{fontSize:27,color:RED,fontFamily:MONO}}>≠ independent-run confidence interval</div></div>
   <div style={{...block(TEAL),width:710,height:290,opacity:enter(f,60)}}>{label('WHAT IS REQUIRED',TEAL)}
   <div style={{fontSize:107,color:TEAL,fontFamily:MONO,fontWeight:800}}>20+</div><div style={{fontSize:36,color:IVORY,fontFamily:FONT}}>独立随机种子 / 每个记忆条件</div></div>
  </div>;
 if(index===4)return <>
   <div style={{position:'absolute',left:145,top:470,width:1510,...block(),padding:0,overflow:'hidden',opacity:enter(f,25)}}>
    <div style={{display:'flex',padding:'22px 34px',background:'#1A3748',color:MUTED,fontFamily:MONO,fontSize:22}}>
      <span style={{flex:2}}>公平对照 / ABLATION</span><span style={{flex:1}}>RL</span><span style={{flex:1}}>HISTORY</span></div>
    {['基础随机动力学','当前状态 RL（无记忆）','RL + lagged-state Q','RL + historical baseline','完整 Memory RL'].map((v,i)=><div key={i} style={{display:'flex',alignItems:'center',padding:'21px 36px',borderBottom:'1px solid #6A82942C',fontSize:30,fontFamily:FONT,color:i===4?TEAL:IVORY,opacity:enter(f,33+i*15)}}>
      <span style={{flex:2}}>{v}</span><span style={{flex:1}}>{i===0?'—':'✓'}</span><span style={{flex:1}}>{i<2?'—':'✓'}</span></div>)}
   </div></>;
 if(index===5)return <div style={{position:'absolute',left:141,top:525,display:'flex',gap:37}}>
   {[['01','相关时间','I(Sₜ ; Sₜ₋τ)'],['02','策略热图','P(a | s, history)'],['03','二维参数','memory × noise']].map((v,i)=><div key={i} style={{...block(i===1?GOLD:TEAL),width:495,height:267,opacity:enter(f,33+i*23),transform:'translateY('+drift(f,33+i*23)+'px)'}}>
    <div style={{fontSize:61,color:i===1?GOLD:TEAL,fontFamily:MONO}}>{v[0]}</div><div style={{fontFamily:FONT,fontSize:42,color:IVORY,marginTop:17}}>{v[1]}</div><div style={{fontFamily:MONO,fontSize:24,color:MUTED,marginTop:12}}>{v[2]}</div></div>)}
  </div>;
 if(index===6)return <div style={{position:'absolute',left:138,top:455,width:1620}}>
   {[['01','独立重复','SEEDS / CI'],['02','无记忆 RL','FAIR BASELINE'],['03','逐项消融','ABLATION'],['04','参数与复现','REPRODUCIBILITY']].map((v,i)=><div key={i} style={{height:108,borderBottom:'1px solid #63809666',display:'flex',gap:65,alignItems:'center',opacity:enter(f,25+i*17),transform:'translateX('+drift(f,25+i*17)+'px)'}}>
     <span style={{fontSize:43,color:GOLD,fontFamily:MONO,width:90}}>{v[0]}</span><span style={{fontSize:47,color:IVORY,fontFamily:FONT,width:550}}>{v[1]}</span><span style={{fontSize:26,color:MUTED,fontFamily:MONO}}>{v[2]}</span><span style={{marginLeft:'auto',fontSize:42,color:TEAL}}>＋</span></div>)}
  </div>;
 return <div style={{position:'absolute',left:138,top:515,display:'flex',gap:28}}>
  {['可重复','可区分','可解释'].map((v,i)=><div key={i} style={{...block(i===2?GOLD:TEAL),width:495,height:250,display:'flex',alignItems:'center',justifyContent:'center',opacity:enter(f,30+i*24),transform:'translateY('+drift(f,30+i*24)+'px)'}}>
   <span style={{fontSize:73,color:i===2?GOLD:IVORY,fontFamily:FONT,fontWeight:750}}>{v}</span></div>)}
 </div>;
};
const sceneTitles=[
 ['这篇论文','先不要急着投。'],
 ['不是控制方向','而是学习随机性。'],
 ['记忆长度','并非越长越好。'],
 ['一条随机曲线','不等于稳健结论。'],
 ['历史组件的贡献','究竟来自哪里？'],
 ['发现 WHAT 之后','回答 WHY。'],
 ['投稿之前','把证据链补齐。'],
 ['先补实验，再改论文','最后投稿。']
];
const subtitles=[
 '稿件具有明确研究价值，但尚未达到有把握投稿的证据标准。',
 '历史状态 → 强化学习 → 随机位置转移的协方差 → 宏观自组织',
 '非单调现象有意思，但现在不能宣布存在普适最优记忆。',
 '先检验随机种子差异，再谈非单调结果是否成立。',
 '固定奖励、动作与环境，让对照真正回答记忆贡献。',
 '时间尺度匹配只是待检验假设，不是文章已证明的机制。',
 '三维图像仅作展示；代码、参数和独立统计不能缺。',
 '让审稿人相信你的结果，不只是被漂亮图像吸引。'
];
const Scene:React.FC<{i:number,duration:number,label:string}>=({i,duration,label})=>{
 const f=useCurrentFrame();
 const fadeOut=interpolate(f,[duration-18,duration],[1,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
 const opacity=Math.min(enter(f,0),fadeOut);
 return <AbsoluteFill style={{opacity}}>
  <div style={{position:'absolute',left:132,top:62,display:'flex',alignItems:'center',gap:21}}>
   <div style={{width:48,height:48,border:'2px solid '+GOLD,borderRadius:'50%',display:'grid',placeItems:'center',color:GOLD,fontFamily:MONO,fontSize:23}}>M</div>
   {lbl('MOTION LAB / MENTOR REVIEW')}
  </div>
  <div style={{position:'absolute',right:133,top:69,fontSize:26,color:GOLD,fontFamily:FONT,letterSpacing:3}}>{label}</div>
  <div style={{position:'absolute',left:134,top:202,width:1590,opacity:enter(f,2),transform:'translateY('+drift(f,2)+'px)'}}>
   <Big size={102}>{sceneTitles[i][0]}</Big>
   <Big size={102} color={i===0||i===3?GOLD:TEAL}>{sceneTitles[i][1]}</Big>
  </div>
  <Visual index={i}/>
  <div style={{position:'absolute',left:144,bottom:131,color:GOLD,fontFamily:FONT,fontSize:29,opacity:enter(f,90)}}>{subtitles[i]}</div>
  <div style={{position:'absolute',left:135,right:135,bottom:74,display:'flex',alignItems:'center',gap:20}}>
   {lbl('EDITORIAL / 2026',MUTED)}<div style={{height:1,background:'#4C65735E',flex:1}}/>{lbl('0'+(i+1)+' / 08',MUTED)}
  </div>
  <div style={{position:'absolute',left:135,right:135,bottom:43,height:3,background:'#24384C'}}>
   <div style={{height:'100%',background:GOLD,width:Math.max(0,Math.min(100,(f/duration)*100))+'%'}}/>
  </div>
 </AbsoluteFill>;
};
const lbl=(text:string,color=MUTED)=><span style={{fontSize:23,fontFamily:MONO,letterSpacing:2,color}}>{text}</span>;
export const MentorReview:React.FC=()=><AbsoluteFill style={{background:INK,color:IVORY,fontFamily:FONT}}>
 <Atmosphere/>
 <Audio src={staticFile('audio/mentor-paper-review/music.wav')} volume={0.8}/>
 {timing.segments.map((s,i)=><Sequence key={s.key} from={s.start} durationInFrames={s.frames}>
   <Scene i={i} duration={s.frames} label={s.label}/>
   <Audio src={staticFile(s.audio)} volume={1}/>
 </Sequence>)}
 <div style={{position:'absolute',right:55,bottom:10,fontSize:15,color:'#66808B66',fontFamily:MONO}}>REMOTION / MOTION LAB © 2026</div>
</AbsoluteFill>;
