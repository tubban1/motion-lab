import React from 'react';
import {AbsoluteFill,Audio,OffthreadVideo,Sequence,staticFile,useCurrentFrame,interpolate} from 'remotion';
const path='liaozhai-laoshan-daoshi/';
const cuts=[0,7,14,24,31,39,45,53,60];
const captions=[
['负笈求仙','王生自小慕道，听闻劳山有仙人，便负笈入山。'],
['手足生茧','他拜师之后，却每日砍柴。一个多月，手足生茧，早已厌倦。'],
['剪纸为月','一夜，道士剪纸如镜，贴在墙上。顷刻之间，满室月华。'],
['霓裳幻舞','宾客向月中掷筷，竟现出仙姬，翩翩起舞。'],
['贪取捷径','王生只求学会穿墙。道士笑他不能吃苦，仍传授口诀。'],
['墙虚若无物','俯首，疾行！王生冲入墙壁，竟真穿了过去。'],
['得意忘形','回到家，他向妻子夸耀，硬墙再不能阻挡自己。'],
['一头碰壁','谁知一头撞上石壁，额上肿如巨卵。世间王生，并不少。'],
];
const serif='"Songti SC","STSong","Noto Serif CJK SC",serif';
const Title:React.FC<{final?:boolean}>=({final})=>{
 const frame=useCurrentFrame();const a=interpolate(frame,[0,18,final?90:60,final?130:85],[0,1,1,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
 return <AbsoluteFill style={{opacity:a,pointerEvents:'none',fontFamily:serif,color:'#FFE7B2'}}>
   <div style={{position:'absolute',top:final?290:260,left:145,fontSize:112,fontWeight:800,letterSpacing:16,textShadow:'0 4px 34px black'}}>劳山道士</div>
   <div style={{position:'absolute',top:final?428:401,left:150,fontSize:25,letterSpacing:8}}>蒲松龄《聊斋志异》原著改编</div>
   {final&&<div style={{position:'absolute',top:515,left:145,fontSize:44,letterSpacing:4}}>世之为王生者，正复不少。</div>}
 </AbsoluteFill>
};
const ShotText:React.FC<{index:number;length:number}>=({index,length})=>{
 const f=useCurrentFrame(); const a=interpolate(f,[0,14,Math.max(17,length-12),length],[0,1,1,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
 return <AbsoluteFill style={{opacity:a,pointerEvents:'none',fontFamily:serif,color:'#F6E8CE'}}>
  <div style={{position:'absolute',top:120,left:146,fontSize:42,letterSpacing:12,textShadow:'0 3px 15px black',color:'#EED6A0'}}>{captions[index][0]}</div>
  <div style={{position:'absolute',left:175,right:175,bottom:140,textAlign:'center',fontSize:45,fontWeight:700,letterSpacing:3,lineHeight:1.5,textShadow:'0 2px 10px black,0 5px 26px black'}}>{captions[index][1]}</div>
 </AbsoluteFill>;
};
export const LiaozhaiLaoshan:React.FC=()=>{
 const f=useCurrentFrame();
 return <AbsoluteFill style={{background:'#030609',overflow:'hidden'}}>
 <OffthreadVideo src={staticFile(path+'3d/footage.mp4')} muted style={{width:'100%',height:'100%',objectFit:'cover'}}/>
 <AbsoluteFill style={{background:'radial-gradient(ellipse 81% 70% at 48% 40%,transparent 28%,#04091498 100%)',pointerEvents:'none'}}/>
 <AbsoluteFill style={{background:'linear-gradient(180deg,#010408B3,transparent 21%,transparent 75%,#010406B8)',pointerEvents:'none'}}/>
 <div style={{position:'absolute',top:0,height:83,left:0,right:0,background:'#030404'}}/>
 <div style={{position:'absolute',bottom:0,height:83,left:0,right:0,background:'#030404'}}/>
 <div style={{position:'absolute',top:38,left:147,fontSize:21,letterSpacing:6,color:'#E4C397',fontFamily:serif}}>聊 斋 志 异　 /　 蒲 松 龄</div>
 <div style={{position:'absolute',top:42,right:144,fontSize:18,letterSpacing:4,color:'#A49B8B'}}>LAO SHAN · A SHORT FILM</div>
 <div style={{position:'absolute',bottom:52,left:145,right:145,height:1,background:'#946D43',opacity:.7}}/>
 <div style={{position:'absolute',bottom:27,right:147,fontSize:17,letterSpacing:3,color:'#9C8C74'}}>{String(Math.floor(f/24)).padStart(2,'0')} / 60</div>
 <Audio src={staticFile(path+'audio/score.wav')} volume={0.4}/>
 {captions.map((_,i)=> <React.Fragment key={i}>
   <Sequence from={cuts[i]*24} durationInFrames={(cuts[i+1]-cuts[i])*24}><ShotText index={i} length={(cuts[i+1]-cuts[i])*24}/></Sequence>
   <Sequence from={cuts[i]*24} durationInFrames={(cuts[i+1]-cuts[i])*24}><Audio src={staticFile(path+'audio/voice_'+String(i+1).padStart(2,'0')+'.wav')} volume={1}/></Sequence>
 </React.Fragment>)}
 <Sequence from={0} durationInFrames={100}><Title/></Sequence>
 <Sequence from={53*24} durationInFrames={7*24}><Title final/></Sequence>
 </AbsoluteFill>;
};
