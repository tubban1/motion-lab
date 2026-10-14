const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'public/audio/mentor-paper-review');
const notes=path.join(root,'projects/mentor-paper-review-2026-10'),fps=24;
fs.mkdirSync(dir,{recursive:true});fs.mkdirSync(notes,{recursive:true});
const scenes=[
['opening','导师来信','这篇论文，先不要急着投','我认真读完了这篇关于有限记忆强化学习与多智能体自组织的论文。先说结论：选题有价值，模型也完整，但我不建议你现在直接投稿。问题不是写得不够漂亮，而是证据还不够硬。'],
['novelty','01 / 核心价值','真正值得保留的创新','论文最好的地方，不是简单引入强化学习，而是让智能体根据当前和历史状态，自主调节位置转移的随机不确定性，而不是直接指定运动方向。这里的微观不确定性，连接了宏观的集体组织。这是文章应该坚持的核心。'],
['finding','02 / 关键发现','记忆长度，并非越长越好','最值得讨论的是记忆长度的非单调效应。在目前的模拟中，二十步记忆更早形成组织，一百步记忆的晚期谱序更强。形成得快，和最终更有序，不是同一件事。但请注意，这些目前只是所考察条件下的结果。'],
['statistics','03 / 第一处硬伤','一条曲线，不等于稳健结论','第一件必须补的，是统计。论文第四图的误差棒反映的是同一次模拟后期的时间波动，不是不同随机实验之间的差异。每个记忆长度至少重复二十个独立随机种子，再报告置信区间、形成时间分布，并检查阈值改变以后结论是否仍成立。'],
['ablation','04 / 第二处硬伤','哪个记忆组件在起作用？','第二件必须补的，是公平对照。当前模型同时引入历史状态 Q 通道和历史表现基线，却缺少真正的无记忆强化学习基线。请保持奖励和动作空间一致，加入当前状态强化学习，再把这两个记忆组件逐项消融。这样才说得清记忆究竟贡献了什么。'],
['mechanism','05 / 更深一层','从现象走向机制解释','第三件，我更希望你回答为什么。非单调曲线本身是现象，还不是机制。去观察历史与当前状态的相关性，比较不同记忆长度下的策略选择热图，再检查记忆长度与噪声强度的关系。只有数据真的支持，我们才能讨论时间尺度匹配，而不能预先宣布它成立。'],
['roadmap','06 / 投稿前清单','把证据链补齐','最后，补一张完整参数表，公开随机种子和复现代码；把无记忆对照、消融实验和稳健性结果放到正文。三维聚集图可以保留，但暂时只能算展示，不能替代统计检验。文献对比也要更准确地区分你的贡献与已有研究。'],
['closing','导师的结论','让审稿人信服','我的建议是：先补实验，再改论文，最后投稿。不要急着发表一个漂亮的现象。真正好的论文，会让人相信三件事：结果可重复，贡献可区分，机制可解释。做到这三点，这个题目就值得认真投出去。']
];
const exec=(bin,args)=>cp.execFileSync(bin,args,{stdio:['ignore','ignore','pipe']});
let start=0;
const meta=scenes.map(([key,label,title,voice],i)=>{
const a=path.join(dir,'voice-'+i+'.aiff'),wav=path.join(dir,'voice-'+i+'.wav');
exec('say',['-v','Tingting','-r','195','-o',a,voice]);
exec('ffmpeg',['-v','error','-y','-i',a,'-ar','48000','-ac','1',wav]);fs.unlinkSync(a);
const duration=Number(cp.execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',wav]).toString().trim());
const frames=Math.ceil((duration+1.05)*fps);const obj={key,label,title,voice,duration,start,frames,audio:'audio/mentor-paper-review/voice-'+i+'.wav'};start+=frames;console.log(i,key,duration.toFixed(2));return obj;
});
fs.writeFileSync(path.join(root,'src/projects/mentor-paper-review/timing.json'),JSON.stringify({fps,totalFrames:start+30,segments:meta},null,2));
fs.writeFileSync(path.join(notes,'script.md'),'# 导师视频回复：论文投稿前评审\n\n'+meta.map(x=>'## '+x.label+' | '+x.title+'\n\n'+x.voice).join('\n\n')+'\n\n**注意**：镜头中涉及相关时间尺度匹配的表述是建议进一步检验的假设，不是论文已经证明的机制。\n');
const secs=start/fps+2,sr=24000,samples=Math.ceil(secs*sr),buf=Buffer.alloc(44+samples*2);
buf.write('RIFF',0);buf.writeUInt32LE(36+samples*2,4);buf.write('WAVEfmt ',8);
buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(1,22);
buf.writeUInt32LE(sr,24);buf.writeUInt32LE(sr*2,28);buf.writeUInt16LE(2,32);buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(samples*2,40);
let seed=42;const rnd=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296};
for(let i=0;i<samples;i++){const t=i/sr,bt=t*1.42,ph=bt%4,k=bt%1;
const pulse=(ph<.13||ph>1.96&&ph<2.13)?Math.exp(-25*k)*Math.sin(2*Math.PI*(80-23*k)*t)*.13:0;
const tick=((bt+.5)%2)<.11?(rnd()-.5)*Math.exp(-35*((bt+.5)%2))*.07:0;
const pad=.024*Math.sin(2*Math.PI*55*t)+.011*Math.sin(2*Math.PI*82.41*t)+.008*Math.sin(2*Math.PI*164.8*t);
const fade=Math.min(1,t/3,Math.max(0,(secs-t)/4)),v=Math.max(-1,Math.min(1,(pad+pulse+tick)*fade));
buf.writeInt16LE(Math.round(v*32760),44+i*2);
}
fs.writeFileSync(path.join(dir,'music.wav'),buf);
console.log('TOTAL',secs.toFixed(2),'seconds,',start+30,'frames');
