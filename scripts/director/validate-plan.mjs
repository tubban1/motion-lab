#!/usr/bin/env node
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {validateDirectorPlan} from '../../src/director/contract.ts';
const args=process.argv.slice(2);
if(!args.length||args[0].startsWith('--')){console.error('Usage: node --experimental-strip-types scripts/director/validate-plan.mjs <plan.json> [--report path.json] [--strict-warnings]');process.exit(2)}
const file=resolve(process.cwd(),args[0]);
let p;
try{p=JSON.parse(readFileSync(file,'utf8'))}catch(e){console.error('Cannot read plan:',e.message);process.exit(2)}
const issues=validateDirectorPlan(p);
const errors=issues.filter(i=>i.severity==='error'),warnings=issues.filter(i=>i.severity==='warning');
const obj={status:errors.length||args.includes('--strict-warnings')&&warnings.length?'FAIL':warnings.length?'PASS_WITH_WARNINGS':'PASS',
 plan:file,shotCount:p.shots?.length||0,audioCount:p.audio?.length||0,frames:p.totalFrames,errors,warnings};
const n=args.indexOf('--report');
if(n>=0){const out=resolve(process.cwd(),args[n+1]);mkdirSync(dirname(out),{recursive:true});writeFileSync(out,JSON.stringify(obj,null,2)+'\n')}
console.log(JSON.stringify(obj,null,2));
if(errors.length||args.includes('--strict-warnings')&&warnings.length)process.exitCode=1;
