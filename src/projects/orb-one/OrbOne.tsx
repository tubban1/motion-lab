import React from 'react';
import {AbsoluteFill,interpolate,useCurrentFrame,Easing,Audio,staticFile} from 'remotion';
import {OrbScene} from './OrbScene';
const cyan='#bceeff';
const scenes=[
{start:0,end:144,k:'01 / THE MOMENT',h:'明明，就放在这里。',sub:'每天，我们都会随手放下某件东西。',mode:'intro'},
{start:144,end:264,k:'02 / THE SEARCH',h:'然后，怎么也找不到。',sub:'眼镜。钥匙。耳机。那些消失在日常里的小东西。',mode:'lost'},
{start:264,end:384,k:'03 / INTRODUCING',h:'让寻找，变得简单。',sub:'ORB ONE  ·  智能视觉探索球',mode:'reveal'},
{start:384,end:504,k:'04 / MOTION',h:'自由滚动。主动探索。',sub:'穿过桌椅之间，深入那些看不到的角落。',mode:'roll'},
{start:504,end:624,k:'05 / VISION',h:'世界在转。视野依然稳定。',sub:'陀螺仪感知 · 稳定视觉核心',mode:'vision'},
{start:624,end:744,k:'06 / JUMP',h:'换个高度，再看一次。',sub:'可控弹跳，捕捉更高的视角。',mode:'jump'},
{start:744,end:864,k:'07 / INTELLIGENCE',h:'看见空间。理解物体。',sub:'空间建图 · 目标识别 · 智能搜索',mode:'scan'},
{start:864,end:984,k:'08 / FOUND',h:'找到了。',sub:'眼镜 · 沙发旁 · 目标已定位',mode:'found'},
{start:984,end:1152,k:'09 / ONE MORE THING',h:'ORB ONE',sub:'让 AI 走出屏幕，走进生活。',mode:'end'}
] as const;
const ease=(x:number)=>Easing.bezier(.22,1,.36,1)(Math.max(0,Math.min(1,x)));
export const OrbOne:React.FC=()=>{
 const f=useCurrentFrame(); const s=scenes.find(x=>f>=x.start&&f<x.end)??scenes[8]; const n=f-s.start;const length=s.end-s.start;
 const appear=ease(n/26); const vanish=ease((length-n)/22);const alpha=appear*vanish;
 const ball=['reveal','roll','vision','jump','scan','found','end'].includes(s.mode);
 const jump=s.mode==='jump'?Math.pow(Math.sin(Math.PI*Math.max(0,Math.min(1,(n-8)/100))),2)*205:0;
 const dx=s.mode==='roll'?interpolate(n,[0,120],[-470,410]):0;
 const rotate=s.mode==='roll'?n*4:s.mode==='vision'?n*2:10+f*.15;
 const size=s.mode==='end'?480:550;
 const bg=s.mode==='intro'||s.mode==='lost'?'radial-gradient(ellipse at 50% 47%,#25252a 0%,#0b0d12 60%,#050608 100%)':'radial-gradient(ellipse at 51% 48%,#182c39 0%,#08121d 46%,#03070b 90%)';
 return <AbsoluteFill style={{background:bg,fontFamily:'Arial, PingFang SC, Microsoft YaHei, sans-serif',color:'#f5f7fa',overflow:'hidden'}}>
 <Audio src={staticFile('audio/orb-one/score.wav')} volume={0.85}/>
 <div style={{position:'absolute',inset:0,opacity:.35,background:'radial-gradient(ellipse at 52% 33%,#ffffff12,transparent 55%)'}}/>
 {s.mode==='intro'&&<div style={{position:'absolute',left:'50%',top:'28%',transform:'translateX(-50%)',width:820,height:310,opacity:alpha}}>
 <div style={{height:18,background:'linear-gradient(90deg,#17191e,#5b5551,#18191c)',borderRadius:12,boxShadow:'0 25px 60px #0009'}}/>
 <div style={{position:'absolute',left:280,top:-60,width:220,height:50,border:'8px solid #c7d0d6',borderRadius:'48% 48% 45% 45%',transform:'rotate(-13deg)',boxShadow:'250px 30px 0 -5px #08090c,250px 30px 0 3px #c7d0d6'}}/>
 <div style={{position:'absolute',left:480,top:-25,width:70,height:5,background:'#c7d0d6',transform:'rotate(12deg)'}}/>
 </div>}
 {s.mode==='lost'&&<div style={{position:'absolute',left:'50%',top:'30%',transform:'translateX(-50%)',width:920,height:220,opacity:alpha}}>
 <div style={{fontSize:180,color:'#ffffff10',letterSpacing:100,textAlign:'center'}}>？ ？ ？</div>
 <div style={{width:'100%',height:2,background:'linear-gradient(90deg,transparent,#fff3,transparent)'}}/>
 </div>}
 {ball&&<OrbScene mode={s.mode==='roll'||s.mode==='scan'||s.mode==='found'?'home':s.mode}/>}
 {false&&ball&&<div style={{position:'absolute',left:'50%',top:'43%',width:size,height:size,transform:`translate(-50%,-50%) translateX(${dx}px) translateY(${-jump}px) scale(${.8+.2*appear})`,opacity:alpha}}>
 <div style={{position:'absolute',inset:0,borderRadius:'50%',background:'radial-gradient(circle at 31% 23%,#f3fcff 0%,#c5dbe3 7%,#688b9a 22%,#1c3a4a 43%,#081522 68%,#02050a 93%)',boxShadow:'inset -55px -40px 80px #000c,inset 17px 22px 40px #ffffff44,0 60px 90px #000b,0 0 110px #5bcfff16',border:'2px solid #a9d7e655'}}/>
 <div style={{position:'absolute',inset:24,borderRadius:'50%',border:'3px solid #a9eaff65',transform:`rotate(${rotate}deg) rotateY(68deg)`,boxShadow:'0 0 24px #a9efff44'}}/>
 <div style={{position:'absolute',inset:55,borderRadius:'50%',border:'2px solid #ffffff36',transform:`rotate(${-rotate*.6}deg) rotateX(76deg)`}}/>
 <div style={{position:'absolute',left:'34%',top:'34%',width:'32%',height:'32%',borderRadius:'50%',background:'radial-gradient(circle at 36% 28%,#d7fbff,#4b98ad 20%,#092235 48%,#02050a 77%)',border:'11px solid #203947',boxShadow:'0 0 0 12px #d7faff23,0 0 45px #a5f3ff66,inset 0 0 40px #000',display:'flex',alignItems:'center',justifyContent:'center'}}>
 <div style={{width:'40%',height:'40%',borderRadius:'50%',background:'radial-gradient(circle at 35% 30%,#baffff,#237e9b 15%,#041522 50%,#000 85%)',border:'4px solid #a8d9e6'}}/>
 </div>
 </div>}
 {s.mode==='vision'&&<div style={{position:'absolute',left:'67%',top:'38%',opacity:alpha,color:cyan,fontSize:21,letterSpacing:4}}>GYRO STABILIZATION<div style={{marginTop:16,width:240,height:1,background:cyan}}/><div style={{marginTop:15,fontSize:14,color:'#8aabb8'}}>CAMERA AXIS LOCKED</div></div>}
 {s.mode==='scan'&&<div style={{position:'absolute',right:110,top:260,opacity:alpha,color:cyan,fontSize:18,letterSpacing:4}}>SPATIAL MAPPING<div style={{marginTop:20,width:280,height:2,background:'#ffffff30'}}><div style={{width:`${n/120*100}%`,height:2,background:cyan}}/></div><div style={{marginTop:25,fontSize:14}}>OBJECT DETECTION / ACTIVE</div></div>}
 {s.mode==='found'&&<div style={{position:'absolute',left:'50%',top:'43%',width:640,height:580,transform:'translate(-50%,-50%)',border:'2px solid #c3efff88',borderRadius:30,opacity:alpha,boxShadow:'0 0 65px #a1eeff20'}}/>}
 <div style={{position:'absolute',top:67,left:100,fontSize:17,letterSpacing:6,color:'#b6c8d2'}}>ORB / ONE</div>
 <div style={{position:'absolute',top:67,right:100,fontSize:13,letterSpacing:4,color:'#718a99'}}>CONCEPT FILM / 2026</div>
 <div style={{position:'absolute',left:100,bottom:125,right:100,opacity:alpha,transform:`translateY(${(1-appear)*24}px)`}}>
 <div style={{fontSize:15,color:cyan,letterSpacing:5,marginBottom:18}}>{s.k}</div>
 <div style={{fontSize:s.mode==='end'?112:66,fontWeight:700,letterSpacing:s.mode==='end'?14:2,lineHeight:1.2,textShadow:'0 4px 30px #0009'}}>{s.h}</div>
 <div style={{fontSize:27,color:'#c4d1d9',marginTop:20,letterSpacing:2}}>{s.sub}</div>
 </div>
 <div style={{position:'absolute',left:100,right:100,bottom:45,height:2,background:'#ffffff20'}}><div style={{height:2,width:`${f/1152*100}%`,background:cyan}}/></div>
 <div style={{position:'absolute',right:100,bottom:60,color:'#6e8592',fontSize:12,letterSpacing:3}}>PRODUCT DESIGN CONCEPT · NOT YET MANUFACTURED</div>
 </AbsoluteFill>;
};
