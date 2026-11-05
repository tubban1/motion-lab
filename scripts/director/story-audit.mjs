/**
 * Story-first audiovisual alignment gate (independent from Remotion).
 * Never infer what is pictured from filename, license, or adjacent narration.
 */
export const allowedMotifs=new Set(['cassette','scarf','window','letter','street','door','rain','city','light','harbour','suitcase','hands','memory']);
export const evidenceKinds=new Set(['observed-photo','illustration','synthetic-shot','historical-insert']);
export function auditStory(story,catalog){
 const errors=[],warnings=[];
 const issue=(severity,code,detail,ref)=>({severity,code,detail,ref});
 const add=(sev,code,msg,ref)=>{(sev==='error'?errors:warnings).push(issue(sev,code,msg,ref))};
 if(!story||story.version!==1||!Number.isInteger(story.totalFrames)||story.totalFrames<1||
  !Array.isArray(story.scenes)||story.scenes.length<2){add('error','BAD_STORY','Invalid scene structure');return {status:'FAIL',errors,warnings}}
 const byId=new Map((catalog||[]).map(a=>[a.id,a]));
 const ids=new Set(),props=new Map(),worlds=new Set();let cursor=0,last=null;
 for(const s of story.scenes){
  if(!s.id||ids.has(s.id))add('error','SCENE_ID','Missing or duplicate scene',s.id);
  ids.add(s.id);
  if(s.startFrame!==cursor||!Number.isInteger(s.endFrame)||s.endFrame<=s.startFrame)add('error','SCENE_TIME','Scene gap, overlap or invalid range',s.id);
  cursor=s.endFrame;
  if(!s.location||!s.action||!s.change||!s.emotionalResult)add('error','NO_DRAMA','Scene needs place/action/change/emotional consequence',s.id);
  if(!Array.isArray(s.motifs)||!s.motifs.length)add('error','NO_MOTIF','Story must carry tangible recurring motifs',s.id);
  for(const x of s.motifs||[]){
   if(!allowedMotifs.has(x))add('error','UNKNOWN_MOTIF',x,s.id);
   props.set(x,(props.get(x)||0)+1);
  }
  if(!s.visualEvidence||!['illustrated','archival', 'mixed'].includes(s.visualEvidence.mode))add('error','VISUAL_MODE','Visual mode must be declared',s.id);
  if(!s.worldId)add('error','WORLD_ID','No persistent stage identity',s.id);
  worlds.add(s.worldId);
  if(last&&s.entranceFrom!==last.id)add('error','DISCONNECTED_SCENE','Every scene must declare handoff from previous scene',s.id);
  if(last&&(!(s.handoffObject)||(last.exitObject!==s.handoffObject)))add('error','BROKEN_HANDOFF','A tangible prop / moving subject must connect scenes',s.id);
  if((s.endFrame-s.startFrame)/story.fps<7)add('warning','SHORT_SCENE','Very short dramatic scene',s.id);
  for(const a of s.archives||[]){
   const item=byId.get(a.assetId);
   if(!item){add('error','MISSING_ASSET_EVIDENCE','No evidence entry for '+a.assetId,s.id);continue}
   if(item.status==='quarantined'){add('error','QUARANTINED_ASSET','Disallowed archive: '+a.assetId,s.id);continue}
   if(!Array.isArray(item.observedSubjects)||!item.observedSubjects.includes(a.subject))
    add('error','PHOTO_SUBJECT_MISMATCH',a.assetId+' does not show '+a.subject,s.id);
   if(!a.purpose||!a.context) add('error','UNJUSTIFIED_PHOTO','Must describe actual reason to show photo',s.id);
   if(a.claimedYear&&item.captureYear!==a.claimedYear)
    add('error','PHOTO_DATE_MISMATCH',a.assetId+' photo is not from '+a.claimedYear,s.id);
   if(!a.relation||!['evidence','atmosphere','editorial-context'].includes(a.relation))add('error','ARCHIVE_ROLE','Archive needs a constrained editorial role',s.id);
  }
  last=s;
 }
 if(cursor!==story.totalFrames)add('error','STORY_TAIL','Story must cover complete movie duration');
 for(const [name,count] of props)if(count>story.scenes.length)add('error','PROP_DUPLICATE','Invalid motif count',name);
 const recurring=[...props].filter(([_,n])=>n>=3);
 if(!recurring.length)add('warning','NO_RECURRING_PROP','No tangible object continues through 3+ scenes');
 if(worlds.size===story.scenes.length)add('warning','ALL_WORLDS_UNIQUE','No recurring set: storyboard may feel like separate cards');
 if(!story.characters||!story.characters.every(c=>c.id&&c.costume&&c.silhouette))
  add('error','CHARACTER_BIBLE','Named characters need persistent appearance and costume');
 const links=story.scenes.length-1;
 const matched=story.scenes.flatMap(s=>s.archives||[]).length;
 return {status:errors.length?'FAIL':warnings.length?'REVIEW_REQUIRED':'STRUCTURAL_PASS',
 sceneCount:story.scenes.length,worldCount:worlds.size,linkedScenes:links,
 recurringMotifs:recurring.map(([x,n])=>({name:x,appearances:n})),
 matchedArchivalUses:matched,errors,warnings,
 limitation:'Metadata/author-checked semantic proof; actual onscreen correctness still requires frame-by-frame visual review.'};
}
