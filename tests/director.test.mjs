import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateDirectorPlan,assertDirectorPlan,shotAtFrame} from '../src/director/contract.ts';
const path=new URL('../projects/hongkong-wind-lyrics-20261031/director-plan.json',import.meta.url);
const load=()=>JSON.parse(readFileSync(path,'utf8'));
const issues=(p)=>validateDirectorPlan(p);
const has=(p,c)=>issues(p).some(i=>i.code===c);
const revise=(p,patch)=>{const x=load();patch(x);return x};
test('director plan uses 32 authored shots and 19 independent audio tracks',()=>{
 const p=load();assert.equal(p.shots.length,32);assert.equal(p.audio.length,19);
 assert.equal(p.totalFrames,4657);assert.deepEqual(issues(p).filter(i=>i.severity==='error'),[]);
 assert.doesNotThrow(()=>assertDirectorPlan(p));
});
test('all 4657 frames resolve to exactly one editorial shot',()=>{
 const p=load();for(let f=0;f<p.totalFrames;f++){const s=shotAtFrame(p,f);assert.ok(s);assert.ok(s.startFrame<=f&&f<s.endFrame)}
 assert.equal(shotAtFrame(p,-1),undefined);assert.equal(shotAtFrame(p,p.totalFrames),undefined);
});
test('each authored cut has a purpose and continuity metadata',()=>{
 const p=load();for(const s of p.shots){assert.ok(s.purpose.length>3);assert.ok(s.transitionIn.reason.length>3);assert.ok(s.continuity.location);assert.ok(s.size);assert.ok(s.camera.move)}
});
test('real edit makes J cuts while new audio already leads the picture',()=>{
 const p=load();const shots=p.shots.filter(s=>s.audioBridgeIn?.kind==='j-cut');
 assert.equal(shots.length,4);
 for(const s of shots)assert.ok(p.audio.some(a=>a.shotId===s.id&&a.startFrame<s.startFrame&&a.startFrame+a.durationFrames>s.startFrame));
});
test('real edit makes L cuts while old audio crosses the picture boundary',()=>{
 const p=load();const shots=p.shots.filter(s=>s.audioBridgeIn?.kind==='l-cut');
 assert.equal(shots.length,4);
 for(const s of shots)assert.ok(p.audio.some(a=>a.shotId!==s.id&&a.startFrame<s.startFrame&&a.startFrame+a.durationFrames>s.startFrame));
});
test('rejects timeline hole and overlap',()=>{
 const gap=revise(load(),p=>{p.shots[4].startFrame+=3});assert.ok(has(gap,'TIMELINE_GAP'));
 const overlap=revise(load(),p=>{p.shots[4].startFrame-=3});assert.ok(has(overlap,'TIMELINE_OVERLAP'));
});
test('rejects illegal transition overlap and first-shot dissolve',()=>{
 const first=revise(load(),p=>{p.shots[0].transitionIn={kind:'dissolve',frames:12,reason:'test'}});assert.ok(has(first,'FIRST_TRANSITION'));
 const overflow=revise(load(),p=>{p.shots[2].transitionIn={kind:'dissolve',frames:90,reason:'test'}});assert.ok(has(overflow,'TRANSITION_OVERFLOW'));
});
test('cut must have zero duration; dissolve must have >=2',()=>{
 const cut=revise(load(),p=>{p.shots[2].transitionIn={kind:'cut',frames:2,reason:'test'}});assert.ok(has(cut,'CUT_DURATION'));
 const fade=revise(load(),p=>{p.shots[2].transitionIn={kind:'dissolve',frames:1,reason:'test'}});assert.ok(has(fade,'TRANSITION_DURATION'));
});
test('camera ranges, focus and focal length validated',()=>{
 const p=revise(load(),p=>{p.shots[3].camera={move:'push',amount:9,focus:{x:1.7,y:.4},focalLengthMm:999}});
 assert.ok(has(p,'CAMERA_RANGE'));assert.ok(has(p,'CAMERA_FOCUS'));assert.ok(has(p,'FOCAL_LENGTH'));
});
test('axis crossing, changed prop, light jump and reversed direction are surfaced as warnings',()=>{
 const p=revise(load(),p=>{
  const a=p.shots[2],b=p.shots[3];a.sceneId=b.sceneId='street';a.subjectId=b.subjectId='actor';
  a.continuity={location:'same',axisSide:'A',screenDirection:'left',lightKey:'sun',propState:'holding'};
  b.continuity={location:'same',axisSide:'B',screenDirection:'right',lightKey:'night',propState:'lost'};
 });
 for(const code of ['AXIS_CROSS','DIRECTION_REVERSED','LIGHT_JUMP','PROP_STATE_JUMP'])assert.ok(has(p,code),code);
});
test('disallows an audio path traversal and missing asset timing',()=>{
 const p=revise(load(),p=>{p.audio[0].src='../secrets.wav';p.audio[0].startFrame=-10});
 assert.ok(has(p,'AUDIO_SRC'));assert.ok(has(p,'AUDIO_TIME'));
});
test('silent change to audio timing flags unproven J bridge',()=>{
 const p=revise(load(),p=>{
  const s=p.shots.find(s=>s.audioBridgeIn?.kind==='j-cut');
  p.audio.find(a=>a.shotId===s.id).startFrame=s.startFrame+1;
 });
 assert.ok(has(p,'AUDIO_BRIDGE_UNPROVEN'));
});
test('shot semantics are mandatory and no blank tail allowed',()=>{
 const p=revise(load(),p=>{p.shots[2].purpose='';p.totalFrames+=4});
 assert.ok(has(p,'SHOT_SEMANTICS'));assert.ok(has(p,'TAIL_GAP'));
});
