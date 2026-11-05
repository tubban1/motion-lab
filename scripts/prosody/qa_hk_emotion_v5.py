#!/usr/bin/env python3
"""Verify independent HK V5 narration, casting, timeline and local output artifacts."""
import hashlib,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
FILM=ROOT/"projects/hongkong-wind-lyrics-20261031"
PUBLIC=ROOT/"public/hongkong-wind-lyrics-20261031"
OLD=PUBLIC/"voice-rhythm";NEW=PUBLIC/"voice-rhythm-v5"
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
 script=json.loads((FILM/"script.json").read_text("utf8"))
 casting=json.loads((FILM/"voice-casting-v5.json").read_text("utf8"))
 score=json.loads((FILM/"rhythm-score-v5.json").read_text("utf8"))
 timing=json.loads((FILM/"rhythm-timeline-v5.json").read_text("utf8"))
 story=json.loads((FILM/"story-rhythm-v5.json").read_text("utf8"))
 issues=[];preserved=[];recast=[]
 source={s["id"]:s for s in script["segments"]}
 for b in score["blocks"]:
  if "".join(x["text"] for x in b["phrases"])!=source[b["id"]]["text"]:
   issues.append("Transcript drift: "+b["id"])
 for b in timing["blocks"]:
  if b["text"]!=source[b["id"]]["text"]:issues.append("Block text changed: "+b["id"])
  for p in b["phrases"]:
   path=NEW/(p["id"]+".mp3");meta=NEW/(p["id"]+".json")
   if not path.exists() or path.stat().st_size<1000 or not meta.exists():
    issues.append("Missing audio/metadata "+p["id"]);continue
   dat=json.loads(meta.read_text("utf8"))
   if b["role"]=="narrator":
    old=OLD/path.name
    if not old.exists() or sha(path)!=sha(old):issues.append("Narrator SHA drift "+p["id"])
    if dat["voice"]!=script["voice"]["narrator"]:issues.append("Narrator voice changed "+p["id"])
    preserved.append(p["id"])
   else:
    if dat["voice"]!=casting["voices"][b["role"]]:issues.append("Recast voice mismatch "+p["id"])
    recast.append({"clip":p["id"],"language":b["role"],"voice":dat["voice"],
      "durationSeconds":p["audioSeconds"],"ratePercent":p["ratePercent"]})
   if not p["audio"].endswith("/voice-rhythm-v5/"+p["id"]+".mp3"):
    issues.append("Audio not isolated "+p["id"])
 if len(preserved)!=53 or len(recast)!=8:issues.append("Unexpected voice split "+str((len(preserved),len(recast))))
 if timing["totalFrames"]!=story["totalFrames"]:issues.append("Story/timeline length diverged")
 scenes=story["scenes"]
 if scenes[0]["startFrame"]!=0 or scenes[-1]["endFrame"]!=timing["totalFrames"]:issues.append("Scene ends invalid")
 for s,t in zip(scenes,scenes[1:]):
  if s["endFrame"]!=t["startFrame"]:issues.append("Scene gap")
 prev=timing["introFrames"]
 for b in timing["blocks"]:
  if b["startFrame"]!=prev:issues.append("Block gap "+b["id"])
  prev=b["endFrame"]
 if prev!=timing["totalFrames"]:issues.append("Final frame incorrect")
 out={"status":"PASS" if not issues else "FAIL","narrator":"unchanged 53 original files validated by SHA-256",
      "narratorClipsPreserved":len(preserved),"recastClips":recast,"frameCount":timing["totalFrames"],
      "fps":timing["fps"],"durationSeconds":timing["durationSeconds"],
      "voiceRoles":casting["voices"],"issues":issues,
      "subjectiveListening":"NOT_DONE","finalVideoQC":"PENDING"}
 path=FILM/"qa-emotion-v5.json";path.write_text(json.dumps(out,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
 print(json.dumps(out,ensure_ascii=False,indent=2),flush=True)
 if issues:sys.exit(1)
if __name__=="__main__":main()
