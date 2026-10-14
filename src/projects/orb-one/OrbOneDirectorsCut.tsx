import React from 'react';
import {AbsoluteFill,Audio,Img,OffthreadVideo,Sequence,interpolate,staticFile,useCurrentFrame} from 'remotion';
type Shot={from:number;to:number;kind:'film'|'photo'|'black';asset?:string;eyebrow?:string;title?:string;detail?:string;align?:'right'|'center';offset?:number};
const shots:Shot[]=[
{from:0,to:105,kind:'film',asset:'stock/4953.mp4',offset:12,title:'有些东西，随手一放。',detail:'再普通不过的一天。'},
{from:105,to:210,kind:'film',asset:'stock/4954.mp4',offset:54,title:'刚才，明明还在眼前。',detail:'然后，怎么都找不到。'},
{from:210,to:315,kind:'film',asset:'stock/3110.mp4',offset:26,title:'眼镜，到底去哪儿了？',detail:'那个熟悉的、无可奈何的瞬间。'},
{from:315,to:390,kind:'black',title:'如果，家能替你寻找。',align:'center'},
{from:390,to:540,kind:'photo',asset:'frames/hero.png',eyebrow:'INTRODUCING',title:'ORB ONE',detail:'让 AI 走进现实世界。',align:'right'},
{from:540,to:615,kind:'photo',asset:'frames/macro.png',eyebrow:'PRECISION OPTICS',title:'一双稳定的眼睛。',detail:'精密镜头 · 姿态感知 · 视觉稳定'},
{from:615,to:705,kind:'film',asset:'stock/3090.mp4',offset:52,title:'从你的房间开始。',detail:'每一个角落，都值得探索。'},
{from:705,to:795,kind:'photo',asset:'frames/rolling.png',eyebrow:'MOTION',title:'滚动，自由而安静。',detail:'真实空间中的自主移动。'},
{from:795,to:885,kind:'photo',asset:'frames/under.png',eyebrow:'EXPLORATION',title:'看见你看不到的地方。',detail:'沙发下面。床底深处。桌椅之间。'},
{from:885,to:975,kind:'photo',asset:'frames/jump.png',eyebrow:'CONTROLLED JUMP',title:'换一个高度。',detail:'通过可控弹跳，打开新的视角。'},
{from:975,to:1065,kind:'photo',asset:'frames/scan.png',eyebrow:'SPATIAL INTELLIGENCE',title:'看见物体，也理解空间。',detail:'空间地图 · 目标识别 · 主动搜索'},
{from:1065,to:1170,kind:'photo',asset:'frames/found.png',eyebrow:'TARGET LOCATED',title:'找到了。',detail:'眼镜就在沙发旁。'},
{from:1170,to:1290,kind:'photo',asset:'frames/end.png',eyebrow:'THE FUTURE OF PHYSICAL AI',title:'ORB ONE',detail:'让寻找，成为一件简单的事。',align:'right'}
];
const root='orb-one-directors-cut/';
const cl=(v:number)=>Math.max(0,Math.min(1,v));
const ShotFrame:React.FC<{s:Shot}>=({s})=>{
 const f=useCurrentFrame(),n=s.to-s.from,t=cl(f/n),fade=cl(f/13)*cl((n-f)/13);
 const img=s.asset?staticFile(root+s.asset):'';
 const photo=s.kind==='photo',end=s.from===1170;
 const black=s.kind==='black',center=s.align==='center',right=s.align==='right';
 const zoom=(photo?1.04:1.07)+t*(photo?.07:.035);
 const dx=photo?14-21*t:12-17*t;
 const dy=s.from===885?21-53*t:10-18*t;
 const mediaStyle:React.CSSProperties={width:'100%',height:'100%',objectFit:'cover',transform:'translate('+dx+'px,'+dy+'px) scale('+zoom+')',filter:'saturate(.75) contrast(1.09) brightness(.85)'};
 const visible=cl(f/18)*cl((n-f)/15);
 return <AbsoluteFill style={{background:'#020304',overflow:'hidden'}}>
  {s.kind==='film'&&<OffthreadVideo src={img} startFrom={s.offset||0} muted style={mediaStyle}/>}
  {photo&&<Img src={img} style={mediaStyle}/>}
  {black&&<AbsoluteFill style={{background:'radial-gradient(ellipse at center,#20282c,#020405 70%)'}}/>}
  <AbsoluteFill style={{background:'linear-gradient(0deg,rgba(1,2,3,.80),transparent 44%,transparent 72%,rgba(0,0,0,.19))',pointerEvents:'none'}}/>
  <AbsoluteFill style={{background:'radial-gradient(ellipse at center,transparent 18%,rgba(0,0,0,.24) 100%)',pointerEvents:'none'}}/>
  {(s.from===975||s.from===1065)&&<div style={{position:'absolute',left:s.from===1065?'51%':'45%',top:'46%',width:260,height:164,transform:'translate(-50%,-50%) scale('+(1.08-.1*t)+')',border:'2px solid rgba(220,245,229,.52)',borderRadius:11,boxShadow:'0 0 32px rgba(171,238,201,.13)',opacity:fade}}>
     <div style={{position:'absolute',bottom:-39,fontSize:15,letterSpacing:4,color:'#DCEDE5'}}>{s.from===1065?'GLASSES / MATCH 96%':'SPATIAL MAPPING'}</div>
   </div>}
  {s.from>=390&&<div style={{position:'absolute',left:115,top:106,fontSize:17,letterSpacing:5,color:'#DBE0E2',opacity:visible}}>ORB / ONE</div>}
  <div style={{position:'absolute',inset:center?0:undefined,left:center?0:115,right:center?0:115,bottom:center?0:end?190:162,display:'flex',flexDirection:'column',alignItems:center?'center':right?'flex-end':'flex-start',justifyContent:'center',textAlign:center?'center':right?'right':'left',opacity:visible,textShadow:'0 4px 32px rgba(0,0,0,.6)',transform:'translateY('+((1-visible)*19)+'px)'}}>
    {s.eyebrow&&<div style={{fontSize:17,letterSpacing:6,color:'#D0DADB',fontWeight:550,marginBottom:15}}>{s.eyebrow}</div>}
    <div style={{fontSize:s.title==='ORB ONE'?110:center?71:58,fontWeight:s.title==='ORB ONE'?500:360,letterSpacing:s.title==='ORB ONE'?13:1.4,color:'#F9FAFA',lineHeight:1.25,maxWidth:1400}}>{s.title}</div>
    {s.detail&&<div style={{fontSize:25,color:'#E1E4E3',letterSpacing:2,marginTop:18,fontWeight:350}}>{s.detail}</div>}
  </div>
  <div style={{position:'absolute',left:0,right:0,top:0,height:71,background:'#020304'}}/>
  <div style={{position:'absolute',left:0,right:0,bottom:0,height:71,background:'#020304'}}/>
  {end&&<div style={{position:'absolute',right:115,bottom:102,fontSize:13,letterSpacing:2.4,color:'#939D9E'}}>PRODUCT DESIGN CONCEPT · NOT MANUFACTURED</div>}
 </AbsoluteFill>;
};
export const OrbOneDirectorsCut:React.FC=()=>{
 const f=useCurrentFrame();
 return <AbsoluteFill style={{background:'#020304',fontFamily:'Helvetica Neue, PingFang SC, Arial, sans-serif'}}>
  <Audio src={staticFile(root+'audio/vastness-mixkit.mp3')} volume={interpolate(f,[0,315,390,610,1290],[.12,.15,.27,.31,.27],{extrapolateLeft:'clamp',extrapolateRight:'clamp'})}/>
  <Audio src={staticFile(root+'audio/foley-96bpm.wav')} volume={.89}/>
  {shots.map(s=><Sequence key={s.from} from={s.from} durationInFrames={s.to-s.from}><ShotFrame s={s}/></Sequence>)}
 </AbsoluteFill>;
};
