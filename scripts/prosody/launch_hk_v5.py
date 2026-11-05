#!/usr/bin/env python3
"""Start HK V5 longer jobs without coupling them to the short OWL command timeout."""
import argparse, json, os, subprocess, sys, time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
FILM=ROOT/"projects/hongkong-wind-lyrics-20261031"
LOG=FILM/"hk-v5-job"
def main():
 p=argparse.ArgumentParser();p.add_argument("stage",choices=["synthesize","render","render-hd","still"])
 a=p.parse_args()
 if a.stage=="synthesize":
  cmd=[sys.executable,"-u",str(ROOT/"scripts/prosody/hk_emotion_v5.py"),"synthesize"]
 elif a.stage in ("render","render-hd"):
  is_hd=a.stage=="render-hd"
  output=("HK-seasonal-wind-emotion-v5-720x1280.mp4" if is_hd else "HK-seasonal-wind-emotion-v5-540x960.mp4")
  cmd=["node",str(ROOT/"node_modules/@remotion/cli/remotion-cli.js"),"render","src/index.ts","HKContinuousStoryEmotionV5",
       "renders/hongkong-wind-lyrics-20261031/emotion-v5/"+output,
       "--codec","h264","--crf","19" if is_hd else "22","--concurrency","2"]
  if not is_hd:cmd.extend(["--scale","0.75"])
 else:
  cmd=["node",str(ROOT/"node_modules/@remotion/cli/remotion-cli.js"),"still","src/index.ts","HKContinuousStoryEmotionV5",
       "renders/hongkong-wind-lyrics-20261031/emotion-v5/HK-emotion-v5-still.png",
       "--frame","1555","--scale","0.75"]
 (ROOT/"renders/hongkong-wind-lyrics-20261031/emotion-v5").mkdir(parents=True,exist_ok=True)
 stem=FILM/("v5-"+a.stage)
 out=open(str(stem)+".stdout.log","ab");err=open(str(stem)+".stderr.log","ab")
 creationflags=getattr(subprocess,"DETACHED_PROCESS",0)|getattr(subprocess,"CREATE_NEW_PROCESS_GROUP",0)
 proc=subprocess.Popen(cmd,cwd=ROOT,stdin=subprocess.DEVNULL,stdout=out,stderr=err,
   close_fds=True,creationflags=creationflags)
 out.close();err.close()
 receipt={"stage":a.stage,"pid":proc.pid,"command":cmd,"startedAt":time.strftime("%Y-%m-%dT%H:%M:%S"),
           "stdout":str(stem)+".stdout.log","stderr":str(stem)+".stderr.log"}
 (FILM/("v5-"+a.stage+"-pid.json")).write_text(json.dumps(receipt,indent=2)+"\n",encoding="utf8")
 print(json.dumps(receipt),flush=True)
if __name__=="__main__":main()
