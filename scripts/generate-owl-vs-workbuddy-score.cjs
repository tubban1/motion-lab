// Original 52-second score, 120 BPM, fully synthesized / no voice.
const fs=require("node:fs"),path=require("node:path");
const SR=48000, SEC=52.5, N=Math.floor(SR*SEC);
const WAV=Buffer.alloc(44+N*4);WAV.write("RIFF",0);WAV.writeUInt32LE(36+N*4,4);
WAV.write("WAVEfmt ",8);WAV.writeUInt32LE(16,16);WAV.writeUInt16LE(1,20);WAV.writeUInt16LE(2,22);
WAV.writeUInt32LE(SR,24);WAV.writeUInt32LE(SR*4,28);WAV.writeUInt16LE(4,32);WAV.writeUInt16LE(16,34);
WAV.write("data",36);WAV.writeUInt32LE(N*4,40);
const out=path.resolve(__dirname,"../public/audio/owl-vs-workbuddy-2026-10/score.wav");
fs.mkdirSync(path.dirname(out),{recursive:true});
let seed=20261010;const rnd=()=>{seed=(1664525*seed+1013904223)>>>0;return (seed/4294967296)*2-1};
const T=2*Math.PI;
const rise=(a,b,t)=>{const x=Math.max(0,Math.min(1,(t-a)/(b-a)));return x*x*(3-2*x)};
const cuts=[0,6,12,20,32,40,48],roots=[55,65.41,49,55],notes=[110,164.81,220,246.94,329.63,440,329.63,164.81];
const delL=new Float32Array(13001),delR=new Float32Array(19001);
let peak=0;
for(let i=0;i<N;i++){
 const t=i/SR, bt=t/.5,ph=bt%1,e=(t/.25)%1,beat=Math.floor(bt)%4,noise=rnd();
 const k=ph*.5;
 const kick=(beat===0||beat===2?1:.14)*Math.exp(-29*k)*Math.sin(T*(56*k+32*Math.min(k,.1)))*.39;
 const snare=(beat===1||beat===3)?Math.exp(-34*k)*(noise*.16+Math.sin(T*175*t)*.052):0;
 const hat=noise*Math.exp(-88*(e*.25))*(Math.floor(t/.25)%4===0?.073:.039);
 const root=roots[Math.floor(t/4)%4];
 const bass=(Math.sin(T*root*t)+.24*Math.sin(T*root*2*t))*.063;
 const pad=[root,root*1.498,root*2].reduce((z,f,j)=>z+Math.sin(T*f*t)*(.014+Math.sin(t*.4+j)*.005)+Math.sin(T*f*2.003*t)*.004,0);
 const arp=.046*Math.exp(-16*e*.25)*Math.sin(T*notes[Math.floor(t/.25)%8]*t);
 let impact=0,riser=0;
 for(const sec of cuts){const d=t-sec;
  if(d>=0&&d<1.4)impact+=Math.exp(-10*d)*noise*.07+Math.exp(-5*d)*Math.sin(T*(45-11*d)*t)*.11;
  if(d<0&&d>-1.1){const q=1+d/1.1;riser+=noise*.018*q*q+Math.sin(T*(240+190*q*q)*t)*.012*q;}
 }
 const fade=rise(0,2.2,t)*(1-rise(48.7,52.5,t));
 const damp=1-rise(48,51.2,t);
 const s=(bass+pad+arp+(kick+snare+hat)*damp+impact+riser)*fade;
 const pan=Math.sin(t*.17)*.13;
 const a=s*(.85-pan)+delL[i%delL.length]*.21;
 const b=s*(.85+pan)+delR[i%delR.length]*.21;
 delL[i%delL.length]=s*(.85-pan);delR[i%delR.length]=s*(.85+pan);
 const L=Math.tanh(a*2.3)*.65,R=Math.tanh(b*2.3)*.65;
 peak=Math.max(peak,Math.abs(L),Math.abs(R));
 WAV.writeInt16LE(Math.round(L*32767),44+i*4);
 WAV.writeInt16LE(Math.round(R*32767),46+i*4);
}
fs.writeFileSync(out,WAV);
console.log(JSON.stringify({output:out,seconds:SEC,tempo:120,channels:2,peak,voice:false,bytes:WAV.length}));
