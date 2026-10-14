#!/usr/bin/env python3
"""Extract director-review frames labeled with precise timecodes using ffmpeg+ImageMagick."""
import argparse,subprocess,tempfile,pathlib
p=argparse.ArgumentParser();p.add_argument('video');p.add_argument('out');p.add_argument('--times',required=True);p.add_argument('--cols',type=int,default=4);p.add_argument('--width',type=int,default=530);a=p.parse_args()
times=[float(t) for t in a.times.split(',')];out=pathlib.Path(a.out);out.parent.mkdir(parents=True,exist_ok=True)
with tempfile.TemporaryDirectory() as d:
 cmd=['magick','montage','-background','#101215','-fill','white','-font','Arial','-pointsize','19']
 for i,t in enumerate(times):
  f=f'{d}/{i:03}.jpg'
  subprocess.run(['ffmpeg','-loglevel','error','-y','-ss',str(t),'-i',a.video,'-frames:v','1','-vf',f'scale={a.width}:-2',f],check=True)
  cmd.extend(['-label',f'{int(t//60):02d}:{t%60:05.2f}  /  frame {round(t*24)}',f])
 cmd.extend(['-tile',f'{a.cols}x','-geometry',f'{a.width}x+3+3',str(out)])
 subprocess.run(cmd,check=True);print('REVIEW_STRIP',out,'frames',len(times))
