#!/usr/bin/env node
/**
 * Read-only review of editable montage. This is a structural diagnostic,
 * NOT a replacement for watching/listening to the final film.
 */
import {readFileSync,writeFileSync,existsSync,mkdirSync,statSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {validateDirectorPlan} from '../../src/director/contract.ts';
const args=process.argv.slice(2),file=args[0];
if(!file){console.error('Usage: node --experimental-strip-types scripts/director/audit-edit.mjs path/to/plan.json [--report path/to/report.json]');process.exit(2)}
const project=JSON.parse(readFileSync(resolve(file),'utf8'));
const issues=validateDirectorPlan(project),fps=project.fps||24;
const review=[...issues];
const info={frameDuration:project.totalFrames,seconds:project.totalFrames/fps,shots:project.shots.length,
 audio:project.audio.length,averageShotSeconds:0,cutTypes:{},cameraMoves:{},framing:{},
 audioBridges:{},uniqueScenes:0,sourceFilesVerified:0,sourceFilesMissing:[]};
const scenes=new Set(),durations=[];
const count=(obj,k)=>obj[k]=(obj[k]||0)+1;
for(const shot of project.shots){
 const sec=(shot.endFrame-shot.startFrame)/fps;
 durations.push(sec);scenes.add(shot.sceneId);
 count(info.cutTypes,shot.transitionIn?.kind||'cut');
 count(info.cameraMoves,shot.camera?.move||'missing');
 count(info.framing,shot.size||'missing');
 count(info.audioBridges,shot.audioBridgeIn?.kind||'none');
 if(sec>9&&shot.camera?.move==='locked')review.push({severity:'warning',code:'LONG_STATIC_SHOT',shotId:shot.id,detail:'Locked static shot runs '+sec.toFixed(1)+' seconds; inspect audience interest.'});
 if(sec>13)review.push({severity:'warning',code:'LONG_SHOT_REVIEW',shotId:shot.id,detail:'Shot lasts '+sec.toFixed(1)+' seconds; check storytelling intention.'});
 if(shot.assetId){
   const abs=resolve('public',shot.assetId);
   if(existsSync(abs)&&statSync(abs).isFile())info.sourceFilesVerified++;
   else{info.sourceFilesMissing.push(shot.assetId);review.push({severity:'error',code:'ASSET_MISSING',shotId:shot.id,detail:'Missing public asset: '+shot.assetId})}
 }
}
info.averageShotSeconds=Number((durations.reduce((a,b)=>a+b,0)/project.shots.length).toFixed(2));
info.uniqueScenes=scenes.size;
for(const track of project.audio){
 const p=resolve('public',track.src);
 if(!existsSync(p))review.push({severity:'error',code:'AUDIO_FILE_MISSING',shotId:track.shotId,detail:track.src});
}
const perScene={};
for(const shot of project.shots)perScene[shot.sceneId]=(perScene[shot.sceneId]||0)+(shot.endFrame-shot.startFrame);
for(const [scene,frames] of Object.entries(perScene))if(frames/project.totalFrames>.42)
 review.push({severity:'warning',code:'SCENE_DOMINANCE',detail:scene+' occupies '+(frames*100/project.totalFrames).toFixed(1)+'% of frames'});
const errors=review.filter(x=>x.severity==='error'),warnings=review.filter(x=>x.severity==='warning');
const result={status:errors.length?'FAIL':warnings.length?'REVIEW_REQUIRED':'STRUCTURAL_PASS',
 disclaimer:'Technical/structural evidence only. Director approval requires viewing all transitions and hearing final mix.',
 plan:resolve(file),info,errors,warnings};
const i=args.indexOf('--report');
if(i>=0){const out=resolve(args[i+1]);mkdirSync(dirname(out),{recursive:true});writeFileSync(out,JSON.stringify(result,null,2)+'\n')}
console.log(JSON.stringify(result,null,2));if(errors.length)process.exitCode=1;
