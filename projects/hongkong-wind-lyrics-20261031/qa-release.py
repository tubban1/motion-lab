#!/usr/bin/env python3
import json,subprocess,sys
from pathlib import Path
BASE=Path(__file__).resolve().parents[2]
P=BASE/"projects/hongkong-wind-lyrics-20261031"
R=BASE/"renders/hongkong-wind-lyrics-20261031"
MOV=R/"hongkong-wind-lyrics-windows-v1.mp4"
FF=BASE/"node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe"
FP=BASE/"node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe"
D=json.loads((P/"timeline.json").read_text(encoding="utf-8"))
if not MOV.exists():raise SystemExit("RENDER_MISSING")
raw=subprocess.check_output([str(FP),"-v","error","-show_entries","stream=codec_name,codec_type,width,height,r_frame_rate,nb_frames:format=duration,size","-of","json",str(MOV)])
meta=json.loads(raw)
video=next(x for x in meta["streams"] if x["codec_type"]=="video")
audio=next(x for x in meta["streams"] if x["codec_type"]=="audio")
assert video["codec_name"]=="h264" and video["width"]==540 and video["height"]==960 and video["r_frame_rate"]=="24/1",video
assert audio["codec_name"]=="aac",audio
expected=D["totalFrames"];print("META",expected,video.get("nb_frames"),meta["format"]["duration"],flush=True)
assert int(video["nb_frames"])==expected,(video["nb_frames"],expected)
# Reject unexpected black frames and corrupted one-frame stripes.
N=84*140
p=subprocess.Popen([str(FF),"-nostdin","-v","error","-i",str(MOV),"-vf","scale=84:140:flags=area,format=gray","-c:v","rawvideo","-f","image2pipe","-"],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
prev=None;before=None;black=[];flash=[];n=0
while True:
    d=p.stdout.read(N)
    if len(d)!=N:break
    # Only consider nearly featureless black frames, not ordinary night photography.
    avg=sum(d)/N
    light=sum(z>30 for z in d)/N
    if avg<17 and light<.006:black.append(n)
    if before is not None:
        in_diff=sum(abs(a-b) for a,b in zip(prev,before))/N
        out_diff=sum(abs(a-b) for a,b in zip(d,prev))/N
        neighbors=sum(abs(a-b) for a,b in zip(d,before))/N
        if in_diff>30 and out_diff>30 and neighbors<9:flash.append({"frame":n-1,"difference":round(in_diff,1),"neighbors":round(neighbors,1)})
    before=prev;prev=d;n+=1
    if n%1000==0:print("FRAME_SCAN",n,flush=True)
stderr=p.stderr.read().decode(errors="replace");rc=p.wait()
assert rc==0,stderr[-600:]
assert n==expected,(n,expected)
report={"render_path":str(MOV),"fps":24,"width":540,"height":960,"expected_frames":expected,"decoded_frames":n,"duration_seconds":float(meta["format"]["duration"]),"video_codec":video["codec_name"],"audio_codec":audio["codec_name"],"bytes":int(meta["format"]["size"]),"black_frame_candidates":black,"single_frame_corruption_candidates":flash,"voice_roles":["narrator","english","cantonese"],"background_music":False,"music_master_recording_included":False,"authoritative_lyrics":"Unreleased live song, use short editorial excerpts only","status":"PASS" if not black and not flash else "REVIEW_REQUIRED"}
(P/"qa.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
print("QC_RESULT",json.dumps(report,ensure_ascii=False),flush=True)
if report["status"]!="PASS":raise SystemExit(3)
def timestamp(fr):
 ms=round(fr*1000/24)
 h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);sec,ms=divmod(ms,1000)
 return f"{h:02d}:{m:02d}:{sec:02d},{ms:03d}"
subs=[]
for i,b in enumerate(D["segments"],1):
 subs.extend([str(i),timestamp(b["startFrame"])+" --> "+timestamp(b["startFrame"]+b["voiceFrames"]),b["text"],""])
(P/"captions.srt").write_text("\n".join(subs),encoding="utf-8")
print("QC_PASS_OUTPUT",MOV,flush=True)
