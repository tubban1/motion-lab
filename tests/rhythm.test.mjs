import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildVisualClock,visualProgress,phaseAt} from '../src/director/rhythm.ts';
const json=n=>JSON.parse(readFileSync(new URL('../projects/hongkong-wind-lyrics-20261031/'+n,import.meta.url),'utf8'));
test('61 phrase files are scheduled in 19 blocks, with 6 retimed story scenes',()=>{
 const t=json('rhythm-timeline.json'),s=json('story-rhythm.json');
 assert.equal(t.blocks.length,19);assert.equal(t.blocks.reduce((x,b)=>x+b.phrases.length,0),61);
 assert.equal(s.scenes.length,6);assert.equal(t.totalFrames,s.totalFrames);
 for(let k=0;k<6;k++){assert.equal(s.scenes[k].startFrame,k?s.scenes[k-1].endFrame:0);assert.ok(s.scenes[k].endFrame>s.scenes[k].startFrame)}
 assert.equal(s.scenes.at(-1).endFrame,t.totalFrames);
});
test('all generated voice clips end before next phrase and actor reaction',()=>{
 const t=json('rhythm-timeline.json'),events=t.blocks.flatMap(b=>b.phrases);
 for(let i=0;i<events.length-1;i++)assert.ok(events[i].startFrame+events[i].voiceFrames+events[i].pauseFrames<=events[i+1].startFrame);
 for(const p of events)assert.ok(p.voiceFrames>0&&p.pauseFrames>=0);
});
test('visual clock covers whole movie without any frame gaps',()=>{
 const t=json('rhythm-timeline.json'),clock=buildVisualClock(t.blocks,t.totalFrames);
 assert.equal(clock[0].from,0);assert.equal(clock.at(-1).to,t.totalFrames);
 for(let i=1;i<clock.length;i++)assert.equal(clock[i].from,clock[i-1].to);
 assert.ok(clock.some(x=>x.kind==='speech'));assert.ok(clock.some(x=>x.kind==='breath'));
 assert.ok(clock.some(x=>x.kind==='reaction'));
});
test('breath phase moves camera slower than speaking, without freeze',()=>{
 const t=json('rhythm-timeline.json'),clock=buildVisualClock(t.blocks,t.totalFrames);
 const p=t.blocks[5].phrases[1],a=p.startFrame,b=a+p.voiceFrames;
 assert.equal(phaseAt(a+2,clock),'speech');
 assert.equal(phaseAt(b+2,clock),'breath');
 const scene=json('story-rhythm.json').scenes.find(s=>a>=s.startFrame&&a<s.endFrame);
 const incVoice=visualProgress(scene.startFrame,scene.endFrame,a+5,clock)-visualProgress(scene.startFrame,scene.endFrame,a,clock);
 const incBreath=visualProgress(scene.startFrame,scene.endFrame,b+5,clock)-visualProgress(scene.startFrame,scene.endFrame,b,clock);
 assert.ok(incVoice>incBreath*2,'voice='+incVoice+' breath='+incBreath);
 assert.ok(incBreath>0);
});
test('visual progress is deterministic monotonic, and scene boundaries exact',()=>{
 const t=json('rhythm-timeline.json'),s=json('story-rhythm.json');const c=buildVisualClock(t.blocks,t.totalFrames);
 for(const scene of s.scenes){
  let prev=-1;
  for(let f=scene.startFrame;f<=scene.endFrame;f+=13){
   const p=visualProgress(scene.startFrame,scene.endFrame,f,c);
   assert.ok(p>=prev&&p>=0&&p<=1);prev=p;
  }
  assert.equal(visualProgress(scene.startFrame,scene.endFrame,scene.startFrame,c),0);
  assert.equal(visualProgress(scene.startFrame,scene.endFrame,scene.endFrame,c),1);
 }
});
test('last phrase has real final reaction hold, not a new subtitle card',()=>{
 const b=json('rhythm-timeline.json').blocks.at(-1),last=b.phrases.at(-1);
 assert.ok(b.endFrame-last.startFrame-last.voiceFrames-last.pauseFrames>=20);
});
test('invalid time range is rejected',()=>{
 assert.throws(()=>visualProgress(20,12,16,[]));
 assert.throws(()=>buildVisualClock([{startFrame:0,endFrame:30,phrases:[{startFrame:2,voiceFrames:10,pauseFrames:5},{startFrame:8,voiceFrames:8,pauseFrames:2}]}],30));
});
