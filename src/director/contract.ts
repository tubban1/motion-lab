/** Frame-exact shot-first editing contract. Each editorial shot occupies [startFrame,endFrame). */
export type ShotSize='extreme-wide'|'wide'|'medium'|'close-up'|'extreme-close-up'|'insert'|'pov';
export type CameraMove='locked'|'push'|'pull'|'pan-left'|'pan-right'|'tilt-up'|'tilt-down'|'truck-left'|'truck-right';
export type EditKind='cut'|'dissolve'|'dip-to-black'|'wipe-left'|'wipe-right'|'match-cut';
export type AudioBridge='none'|'j-cut'|'l-cut';
export type ScreenDirection='left'|'right'|'static';
export type LookPosition='left'|'right'|'center';
export interface DirectorShot {
 id:string; startFrame:number; endFrame:number;
 sceneId:string; subjectId:string; purpose:string; size:ShotSize;
 camera:{move:CameraMove;amount?:number;focalLengthMm?:number;focus?:{x:number;y:number}};
 continuity?:{location:string;axisSide?:'A'|'B';screenDirection?:ScreenDirection;eyeline?:LookPosition;lightKey?:string;propState?:string};
 transitionIn?:{kind:EditKind;frames:number;reason:string};
 audioBridgeIn?:{kind:AudioBridge;reason:string};
 assetId?:string; visualVariant?:string; beatId?:string;
}
export interface DirectorAudio {
 id:string;src:string;startFrame:number;durationFrames:number;gain?:number;shotId?:string;
}
export interface DirectorPlan {
 version:1;title:string;fps:number;width:number;height:number;totalFrames:number;
 shots:DirectorShot[];audio:DirectorAudio[];
}
export interface DirectorIssue {severity:'error'|'warning';code:string;shotId?:string;detail:string}
const SIZES=new Set<ShotSize>(['extreme-wide','wide','medium','close-up','extreme-close-up','insert','pov']);
const MOVES=new Set<CameraMove>(['locked','push','pull','pan-left','pan-right','tilt-up','tilt-down','truck-left','truck-right']);
const TRANSITIONS=new Set<EditKind>(['cut','dissolve','dip-to-black','wipe-left','wipe-right','match-cut']);
const finite=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n);
const integer=(n:unknown):n is number=>Number.isSafeInteger(n);
const present=(s:unknown):s is string=>typeof s==='string'&&s.trim().length>0;
export function validateDirectorPlan(plan:DirectorPlan):DirectorIssue[] {
 const issues:DirectorIssue[]=[];
 const err=(code:string,detail:string,shotId?:string)=>issues.push({severity:'error',code,detail,shotId});
 const warn=(code:string,detail:string,shotId?:string)=>issues.push({severity:'warning',code,detail,shotId});
 if(!plan||plan.version!==1||![24,25,30,60].includes(plan.fps)||!integer(plan.totalFrames)||plan.totalFrames<1||
 !integer(plan.width)||!integer(plan.height)||plan.width<240||plan.height<240||plan.width%2!==0||plan.height%2!==0){err('PLAN_META','Invalid version, frame rate, duration or output size');return issues}
 if(!Array.isArray(plan.shots)||plan.shots.length===0){err('NO_SHOTS','A director plan must contain shots');return issues}
 const seen=new Set<string>();let cursor=0;let prior:DirectorShot|undefined;
 for(const shot of plan.shots){
  if(!shot||!present(shot.id)||seen.has(shot.id)){err('SHOT_ID','Empty or duplicate shot id',shot?.id);continue}
  seen.add(shot.id);
  if(!integer(shot.startFrame)||!integer(shot.endFrame)||shot.endFrame<=shot.startFrame){err('SHOT_TIME','Invalid half-open frame range',shot.id);continue}
  if(shot.startFrame!==cursor)err(shot.startFrame>cursor?'TIMELINE_GAP':'TIMELINE_OVERLAP','Expected start='+cursor+', found '+shot.startFrame,shot.id);
  cursor=shot.endFrame;
  if(!present(shot.sceneId)||!present(shot.subjectId)||!present(shot.purpose))err('SHOT_SEMANTICS','sceneId, subjectId and purpose required',shot.id);
  if(!SIZES.has(shot.size))err('SHOT_SIZE','Unsupported shot size',shot.id);
  if(!shot.camera||!MOVES.has(shot.camera.move))err('CAMERA_MOVE','Unsupported camera move',shot.id);
  const c=shot.camera;
  if(c&&c.amount!==undefined&&(!finite(c.amount)||Math.abs(c.amount)>1.5))err('CAMERA_RANGE','Camera amount must be within -1.5..1.5',shot.id);
  if(c&&c.focalLengthMm!==undefined&&(!finite(c.focalLengthMm)||c.focalLengthMm<10||c.focalLengthMm>300))err('FOCAL_LENGTH','Invalid focal length',shot.id);
  if(c?.focus&&(!finite(c.focus.x)||!finite(c.focus.y)||c.focus.x<0||c.focus.x>1||c.focus.y<0||c.focus.y>1))err('CAMERA_FOCUS','Focus must be normalized 0..1',shot.id);
  const t=shot.transitionIn??{kind:'cut' as const,frames:0,reason:'default'};
  if(!TRANSITIONS.has(t.kind)||!integer(t.frames)||t.frames<0)err('TRANSITION','Invalid transition',shot.id);
  else if(!prior&&(t.frames>0||t.kind!=='cut'))err('FIRST_TRANSITION','First shot must start with a hard cut',shot.id);
  else if((t.kind==='cut'||t.kind==='match-cut')&&t.frames!==0)err('CUT_DURATION','Cuts must use zero blend frames',shot.id);
  else if(!['cut','match-cut'].includes(t.kind)&&t.frames<2)err('TRANSITION_DURATION','A blend needs at least 2 frames',shot.id);
  else if(prior&&t.frames>Math.floor(Math.min(prior.endFrame-prior.startFrame,shot.endFrame-shot.startFrame)/2))
    err('TRANSITION_OVERFLOW','Transition exceeds half of an adjacent shot',shot.id);
  if(!present(t.reason))err('TRANSITION_INTENT','Every edit needs a reason',shot.id);
  const b=shot.audioBridgeIn;
  if(b&&(!['none','j-cut','l-cut'].includes(b.kind)||!present(b.reason)))err('AUDIO_BRIDGE','Invalid audio bridge',shot.id);
  if(!prior&&b&&b.kind!=='none')err('FIRST_AUDIO_BRIDGE','First shot cannot bridge an edit',shot.id);
  if(prior){
   const pc=prior.continuity,cc=shot.continuity;
   if(pc?.location&&cc?.location&&pc.location===cc.location){
    if(pc.axisSide&&cc.axisSide&&pc.axisSide!==cc.axisSide)warn('AXIS_CROSS','180-degree axis changed in same location; check neutral shot',shot.id);
    if(pc.screenDirection&&cc.screenDirection&&pc.screenDirection!=='static'&&cc.screenDirection!=='static'&&pc.screenDirection!==cc.screenDirection)warn('DIRECTION_REVERSED','Movement reversed in same location',shot.id);
    if(pc.lightKey&&cc.lightKey&&pc.lightKey!==cc.lightKey)warn('LIGHT_JUMP','Lighting changed across cut',shot.id);
    if(pc.propState&&cc.propState&&pc.propState!==cc.propState&&prior.subjectId===shot.subjectId)warn('PROP_STATE_JUMP','Prop state changed without cutaway',shot.id);
   }
   if(prior.sceneId===shot.sceneId&&prior.subjectId===shot.subjectId&&prior.size===shot.size&&prior.camera.move===shot.camera.move)
      warn('REPETITIVE_SHOT','Consecutive shots repeat framing and movement',shot.id);
  }
  prior=shot;
 }
 if(cursor!==plan.totalFrames)err('TAIL_GAP','Last shot ends at '+cursor+', expected '+plan.totalFrames);
 if(!Array.isArray(plan.audio))err('AUDIO_TRACKS','audio must be an array');
 else {
  const ids=new Set<string>();
  for(const a of plan.audio){
   if(!a||!present(a.id)||ids.has(a.id)){err('AUDIO_ID','Invalid or duplicate audio id');continue}
   ids.add(a.id);
   if(!present(a.src)||a.src.startsWith('/')||a.src.includes('..')||a.src.includes('\\'))err('AUDIO_SRC','Audio must be a safe public-relative path',a.id);
   if(!integer(a.startFrame)||!integer(a.durationFrames)||a.startFrame<0||a.durationFrames<1||a.startFrame+a.durationFrames>plan.totalFrames)err('AUDIO_TIME','Audio outside timeline',a.id);
   if(a.gain!==undefined&&(!finite(a.gain)||a.gain<0||a.gain>2))err('AUDIO_GAIN','Audio gain must be 0..2',a.id);
   if(a.shotId&&!seen.has(a.shotId))err('AUDIO_SHOT','Audio references unknown shot',a.id);
  }
  for(const s of plan.shots){
   const b=s.audioBridgeIn;
   if(!b||b.kind==='none')continue;
   const boundary=s.startFrame;
   const relevant=plan.audio.some(a=>integer(a.startFrame)&&integer(a.durationFrames)&&
    (b.kind==='j-cut'?(a.startFrame<boundary&&a.startFrame+a.durationFrames>boundary&&a.shotId===s.id)
      :(a.startFrame<boundary&&a.startFrame+a.durationFrames>boundary&&a.shotId!==s.id)));
   if(!relevant)warn('AUDIO_BRIDGE_UNPROVEN','No audio track demonstrates '+b.kind+' at frame '+boundary,s.id);
  }
 }
 return issues;
}
export function assertDirectorPlan(plan:DirectorPlan):void {
 const errors=validateDirectorPlan(plan).filter(i=>i.severity==='error');
 if(errors.length)throw new Error(errors.map(e=>e.code+': '+e.detail+(e.shotId?' ['+e.shotId+']':'')).join('\n'));
}
export function shotAtFrame(plan:DirectorPlan,frame:number):DirectorShot|undefined {
 if(frame<0||frame>=plan.totalFrames)return undefined;
 let lo=0,hi=plan.shots.length-1;
 while(lo<=hi){const k=(lo+hi)>>1;const s=plan.shots[k];if(frame<s.startFrame)hi=k-1;else if(frame>=s.endFrame)lo=k+1;else return s}
 return undefined;
}
