#!/usr/bin/env node
import {spawn} from 'node:child_process';
import {mkdirSync,openSync,closeSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
const base=process.cwd(),out='renders/hongkong-wind-lyrics-20261031/story-v3/HK-Story-Continuity-v3-previs-540x960.mp4';
const dir=resolve(dirname(out));mkdirSync(dir,{recursive:true});
const stdout=openSync(resolve(dir,'v3-render.stdout.log'),'a');
const stderr=openSync(resolve(dir,'v3-render.stderr.log'),'a');
const args=['node_modules/@remotion/cli/remotion-cli.js','render','src/index.ts','HKContinuousStoryV3',out,'--codec','h264','--crf','19','--scale','0.75','--concurrency','2'];
const p=spawn(process.execPath,args,{cwd:base,detached:true,windowsHide:true,stdio:['ignore',stdout,stderr],env:{...process.env}});
writeFileSync(resolve(dir,'render-session.json'),JSON.stringify({pid:p.pid,startedAt:new Date().toISOString(),out,args},null,2));
p.on('error',e=>{console.error('CHILD_SPAWN_FAILED',e)});
p.unref();closeSync(stdout);closeSync(stderr);
console.log('RENDER_DETACHED_PID',p.pid);
