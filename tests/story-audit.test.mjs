import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditStory} from '../scripts/director/story-audit.mjs';
const p=(x)=>JSON.parse(readFileSync(new URL('../projects/hongkong-wind-lyrics-20261031/'+x,import.meta.url),'utf8'));
const story=()=>p('story-continuity.json');
const catalog=()=>p('asset-evidence.json').assets;
const has=(r,c)=>r.errors.some(x=>x.code===c);
test('new movie is six continuous dramatic scenes, NOT nineteen paragraph cards',()=>{
 const s=story(),r=auditStory(s,catalog());
 assert.equal(s.scenes.length,6);assert.equal(r.linkedScenes,5);assert.equal(r.worldCount,4);
 assert.deepEqual(r.errors,[]);
 assert.ok(r.recurringMotifs.some(x=>x.name==='cassette'&&x.appearances>=3));
});
test('each world scene changes through purposeful physical action',()=>{
 const s=story();for(const x of s.scenes){assert.ok(x.action.length>12);assert.ok(x.change.length>9);assert.ok(x.emotionalResult.length>4);}
 assert.equal(s.editingRules.noSegmentCounters,true);assert.equal(s.editingRules.noParagraphCards,true);
});
test('breaks when the vintage singer 2011 photo falsely claims 1993',()=>{
 const s=story();s.scenes[1].archives=[{assetId:'faye.jpg',subject:'Faye Wong performing',claimedYear:1993,relation:'evidence',purpose:'证明1993',context:'演出'}];
 assert.ok(has(auditStory(s,catalog()),'PHOTO_DATE_MISMATCH'));
});
test('breaks when ferry boat is assigned the meaning of two lovers hugging',()=>{
 const s=story();s.scenes[2].archives=[{assetId:'aber1980.jpg',subject:'couple hugging',relation:'atmosphere',purpose:'写拥抱',context:'码头'}];
 assert.ok(has(auditStory(s,catalog()),'PHOTO_SUBJECT_MISMATCH'));
});
test('rejects a modern photo pretending to be period-accurate',()=>{
 const s=story();s.scenes[1].archives=[{assetId:'street1993.jpg',subject:'modern Hotdog shop',claimedYear:1993,relation:'evidence',purpose:'1993',context:'街'}];
 assert.ok(has(auditStory(s,catalog()),'QUARANTINED_ASSET'));
});
test('rejects a story gap, discontinuous prop, and locationless title pages',()=>{
 let s=story();s.scenes[2].startFrame+=3;assert.ok(has(auditStory(s,catalog()),'SCENE_TIME'));
 s=story();s.scenes[3].handoffObject='mystery';assert.ok(has(auditStory(s,catalog()),'BROKEN_HANDOFF'));
 s=story();s.scenes[1].action='';assert.ok(has(auditStory(s,catalog()),'NO_DRAMA'));
});
test('directly matching an archive is allowed only for verified observed content',()=>{
 const s=story(),r=auditStory(s,catalog());assert.equal(r.matchedArchivalUses,4);assert.equal(r.status,'STRUCTURAL_PASS');
});