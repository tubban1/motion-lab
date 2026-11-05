/**
 * Production rhythm clock. Audio owns the real timeline; visuals move continuously,
 * but deliberately slow during a breath / reaction rather than blindly interpolating.
 * Pure functions; no audio files or network required.
 */
export type RhythmPhase='speech'|'breath'|'reaction'|'ambient';
export interface TimedPhrase {startFrame:number;voiceFrames:number;pauseFrames:number}
export interface TimedBlock {startFrame:number;endFrame:number;phrases:TimedPhrase[]}
export interface VisualInterval {from:number;to:number;kind:RhythmPhase;speed:number}
const SPEED:Record<RhythmPhase,number>={speech:1,breath:.30,reaction:.58,ambient:.43};
export function buildVisualClock(blocks:readonly TimedBlock[],totalFrames:number):VisualInterval[]{
 const out:VisualInterval[]=[];
 let cursor=0;
 function add(from:number,to:number,kind:RhythmPhase){
  if(to<=from)return;
  if(from!==cursor)throw new Error('Rhythm timeline has overlap or gap at '+cursor+'/'+from);
  out.push({from,to,kind,speed:SPEED[kind]});cursor=to;
 }
 for(const b of blocks){
  if(b.startFrame<cursor)throw new Error('Overlapping rhythm blocks');
  add(cursor,b.startFrame,'ambient');
  for(const p of b.phrases){
   if(p.startFrame<cursor)throw new Error('Overlapping rhythm phrase');
   add(cursor,p.startFrame,'reaction');
   add(cursor,p.startFrame+p.voiceFrames,'speech');
   add(cursor,p.startFrame+p.voiceFrames+p.pauseFrames,'breath');
  }
  add(cursor,b.endFrame,'reaction');
 }
 if(totalFrames<cursor)throw new Error('Timeline shorter than audio');
 add(cursor,totalFrames,'ambient');
 return out;
}
function area(start:number,end:number,clock:readonly VisualInterval[]):number{
 if(end<=start)return 0;
 let result=0;
 for(const section of clock){
  if(section.to<=start)continue;
  if(section.from>=end)break;
  result+=Math.max(0,Math.min(end,section.to)-Math.max(start,section.from))*section.speed;
 }
 return result;
}
export function visualProgress(start:number,end:number,frame:number,clock:readonly VisualInterval[]):number{
 if(!(Number.isInteger(start)&&Number.isInteger(end)&&end>start))throw new Error('Invalid scene range');
 if(frame<=start)return 0;
 if(frame>=end)return 1;
 const denominator=area(start,end,clock);
 if(denominator<=0)throw new Error('No visual clock activity in scene');
 return Math.min(1,Math.max(0,area(start,frame,clock)/denominator));
}
export function phaseAt(frame:number,clock:readonly VisualInterval[]):RhythmPhase|undefined{
 return clock.find(x=>frame>=x.from&&frame<x.to)?.kind;
}
