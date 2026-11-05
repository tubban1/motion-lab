#!/usr/bin/env node
/**
 * Mandatory story-to-visual evidence gate before rendering narrative projects.
 * Usage: node scripts/director/check-story.mjs story-continuity.json asset-evidence.json --report output.json
 */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {auditStory} from './story-audit.mjs';
const args=process.argv.slice(2);
if(args.length<2||args[0].startsWith('-')){console.error('Usage: node scripts/director/check-story.mjs <story.json> <evidence.json> [--report output.json]');process.exit(2)}
try{
 const s=JSON.parse(readFileSync(resolve(args[0]),'utf8'));
 const e=JSON.parse(readFileSync(resolve(args[1]),'utf8'));
 const result={...auditStory(s,e.assets),plan:resolve(args[0]),evidence:resolve(args[1]),
 requirement:'Structural PASS is necessary, never sufficient: review original images, at least 3 frames per scene, action continuity and narrator pronunciation.'};
 const i=args.indexOf('--report');
 if(i>=0){
  if(!args[i+1])throw Error('Missing report path');
  const output=resolve(args[i+1]);mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(result,null,2)+'\n');
 }
 console.log(JSON.stringify(result,null,2));
 if(result.errors.length)process.exitCode=1;
}catch(err){console.error(err);process.exitCode=2}
