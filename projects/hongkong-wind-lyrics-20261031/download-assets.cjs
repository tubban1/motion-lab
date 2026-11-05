const fs=require('fs'),path=require('path'),https=require('https');
const dir=__dirname,manifest=JSON.parse(fs.readFileSync(path.join(dir,'assets-source.json'),'utf8')),target=path.resolve(dir,'../../public/hongkong-wind-lyrics-20261031');
fs.mkdirSync(target,{recursive:true});
async function download(url,destination){
  return new Promise((resolve,reject)=>{let redirects=0;
  function go(u){let req=https.get(u,{headers:{'User-Agent':'HongKongWindLyricsFilm/1.0 (educational editorial; commons attribution)','Accept':'image/avif,image/webp,image/jpeg,image/*;q=0.8'}},res=>{
     if(res.statusCode>=300&&res.statusCode<400&&res.headers.location&&redirects++<5){res.resume();return go(new URL(res.headers.location,u).toString())}
     if(res.statusCode!==200){res.resume();return reject(Error('HTTP_'+res.statusCode))}
     const tmp=destination+'.tmp',out=fs.createWriteStream(tmp);
     res.pipe(out);out.on('finish',()=>{out.close();const st=fs.statSync(tmp);if(st.size<3000){fs.rmSync(tmp);return reject(Error('Too small'))}fs.renameSync(tmp,destination);resolve(st.size)});
     out.on('error',reject);
   });req.setTimeout(25000,()=>req.destroy(Error('timeout')));req.on('error',reject);}
  go(url)});
}
(async()=>{let ok=0;const files=[];
for(const x of manifest){
 if(!x.thumb||!x.local)continue;
 const out=path.join(target,x.local);let url=x.thumb.split('?')[0].replace('thumb.wikimedia.org','upload.wikimedia.org');
 try{const bytes=fs.existsSync(out)?fs.statSync(out).size:await download(url,out);console.log('OK',x.local,bytes,x.license);ok++;files.push({name:x.local,bytes,license:x.license,attribution:x.artist,source:x.source});}
 catch(e){console.log('FAIL',x.local,e.message,url.slice(0,110))}
}
fs.writeFileSync(path.join(dir,'download-report.json'),JSON.stringify(files,null,2));
console.log('COMPLETE',ok,'/',manifest.length);
if(ok<8)process.exitCode=2;
})();