const fs=require('fs'),path=require('path');
const sr=48000,n=sr*64,bytes=Buffer.alloc(44+n*4),pi=2*Math.PI;
bytes.write('RIFF',0);bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(2,22);bytes.writeUInt32LE(sr,24);bytes.writeUInt32LE(sr*4,28);bytes.writeUInt16LE(4,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(n*4,40);
const at=[6,13,20,27,35,42,49,56,61];
for(let i=0;i<n;i++){
 const t=i/sr;let s=0;
 for(let q=0;q<at.length;q++){
 const dt=t-at[q];
 if(dt<0||dt>.5)continue;
 const p=q%3;
 if(p===0)s+=.17*Math.sin(pi*2*(67+35*Math.exp(-dt*30))*dt)*Math.exp(-dt*13);
 if(p===1)s+=.09*Math.sin(pi*2*1200*dt)*Math.exp(-dt*34);
 if(p===2)s+=.08*Math.sin(pi*2*(230+220*dt)*dt)*Math.exp(-dt*9);
 }
 const m=Math.round(Math.max(-.8,Math.min(.8,s))*32767);
 bytes.writeInt16LE(m,44+i*4);bytes.writeInt16LE(m,46+i*4);
}
const out=path.join(__dirname,'../public/vibe-monitor-directors-launch/audio/foley.wav');fs.writeFileSync(out,bytes);console.log('FOLEY_READY');
