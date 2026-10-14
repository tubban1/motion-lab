const fs=require('fs'),path=require('path'),cp=require('child_process');
const {bundle}=require('@remotion/bundler');
const {getCompositions,renderStill}=require('@remotion/renderer');
const root=path.resolve(__dirname,'..'),framesDir=path.join(root,'renders','frames');
const timing=require('../src/projects/mentor-paper-review/timing.json');
const chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
fs.mkdirSync(framesDir,{recursive:true});
const ff=(args)=>cp.execFileSync('/usr/local/bin/ffmpeg',['-hide_banner','-loglevel','error','-y',...args],{stdio:'inherit'});
(async()=>{
const serveUrl=await bundle({entryPoint:path.join(root,'src/index.ts'),onProgress:(p)=>{if(p===100)console.log('Bundle done');}});
const comps=await getCompositions(serveUrl,{browserExecutable:chrome,logLevel:'error'});
const composition=comps.find(x=>x.id==='MentorPaperReview');
if(!composition)throw Error('Composition not found');
const clips=[];
for(let i=0;i<timing.segments.length;i++){
 const s=timing.segments[i],png=path.join(framesDir,'scene-'+i+'.png');
 const localFrame=Math.min(s.frames-25,Math.max(120,Math.floor(s.frames*.48)));
 await renderStill({composition,serveUrl,output:png,frame:s.start+localFrame,browserExecutable:chrome,scale:.75,logLevel:'error'});
 console.log('STILL',i,png,flush=true);
 const clip=path.join(framesDir,'scene-'+i+'.mp4');
 const seconds=s.frames/24,off=Math.max(0,seconds-.6);
 const vf="zoompan=z='min(zoom+0.00008,1.06)':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':d=1:s=1280x720:fps=24,format=yuv420p,fade=t=in:st=0:d=0.35,fade=t=out:st="+off+":d=0.6";
 ff(['-loop','1','-framerate','24','-i',png,'-vf',vf,'-frames:v',String(s.frames),'-c:v','libx264','-preset','ultrafast','-crf','19','-pix_fmt','yuv420p',clip]);
 const padded=path.join(framesDir,'narration-'+i+'.wav');
 ff(['-i',path.join(root,'public',s.audio),'-af','apad','-t',String(seconds),'-ac','1','-ar','48000','-c:a','pcm_s16le',padded]);
 clips.push(clip);console.log('CLIP',i,'frames',s.frames);
}
const list=path.join(framesDir,'concat-videos.txt');
fs.writeFileSync(list,clips.map(f=>"file '"+f+"'").join('\n'));
const rawVideo=path.join(framesDir,'silent-film.mp4');
ff(['-f','concat','-safe','0','-i',list,'-c','copy',rawVideo]);
const audioList=path.join(framesDir,'concat-voices.txt');
fs.writeFileSync(audioList,timing.segments.map((_,i)=>"file '"+path.join(framesDir,'narration-'+i+'.wav')+"'").join('\n'));
const narration=path.join(framesDir,'narration-all.wav');
ff(['-f','concat','-safe','0','-i',audioList,'-ar','48000','-c:a','pcm_s16le',narration]);
const output=path.join(root,'renders','mentor-paper-review-2026-10.mp4');
ff(['-i',rawVideo,'-i',narration,'-i',path.join(root,'public/audio/mentor-paper-review/music.wav'),'-filter_complex',
'[1:a]volume=1.5[v];[2:a]volume=0.5[m];[v][m]amix=inputs=2:duration=first:dropout_transition=0[a]',
'-map','0:v:0','-map','[a]','-c:v','copy','-c:a','aac','-b:a','192k','-shortest',output]);
console.log('DONE',output);
})().catch(e=>{console.error(e.stack||e);process.exit(1);});
