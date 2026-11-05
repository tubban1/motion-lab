#!/usr/bin/env python3
"""Motion Lab rhythm quality gate, structural only; never claims human artistic approval."""
from pathlib import Path
import json
import statistics
import sys
from mutagen.mp3 import MP3

ROOT=Path(__file__).resolve().parents[2]
PROJECT=ROOT/"projects/hongkong-wind-lyrics-20261031"
INPUT=ROOT/"public"
score=json.loads((PROJECT/"rhythm-score.json").read_text("utf8"))
timeline=json.loads((PROJECT/"rhythm-timeline.json").read_text("utf8"))
story=json.loads((PROJECT/"story-rhythm.json").read_text("utf8"))
script=json.loads((PROJECT/"script.json").read_text("utf8"))
old=json.loads((PROJECT/"timeline.json").read_text("utf8"))
issues=[]
phr=[p for b in timeline["blocks"] for p in b["phrases"]]
rates=[p["ratePercent"] for p in phr]
voice=sum(p["voiceFrames"] for p in phr)
silent=sum(p["pauseFrames"] for p in phr)+sum(b["reactionHoldFrames"] for b in timeline["blocks"])
reused={b["id"]:"".join(p["text"] for p in b["phrases"]) for b in timeline["blocks"]}
for b in script["segments"]:
 if reused.get(b["id"])!=b["text"]:issues.append({"code":"SCRIPT_MISMATCH","id":b["id"]})
cursor=timeline["introFrames"]
for b in timeline["blocks"]:
 if b["startFrame"]!=cursor:issues.append({"code":"GAP_OR_OVERLAP","id":b["id"]})
 for p in b["phrases"]:
  if p["startFrame"]<cursor:issues.append({"code":"AUDIO_OVERLAP","id":p["id"]})
  file=INPUT/p["audio"]
  if not file.exists():issues.append({"code":"MISSING_AUDIO","id":p["id"]});continue
  try:
   seconds=float(MP3(str(file)).info.length)
   if abs(round(seconds*timeline["fps"])-p["voiceFrames"])>1:
    issues.append({"code":"STALE_AUDIO_DURATION","id":p["id"]})
  except Exception:issues.append({"code":"AUDIO_DECODE_ERROR","id":p["id"]})
  cursor=p["startFrame"]+p["voiceFrames"]+p["pauseFrames"]
 cursor+=b["reactionHoldFrames"]
 if cursor!=b["endFrame"]:issues.append({"code":"INVALID_REACTION_HOLD","id":b["id"]})
if cursor!=timeline["totalFrames"] or story["totalFrames"]!=cursor:
 issues.append({"code":"TIMELINE_TAIL"})
if len(story["scenes"])!=6:issues.append({"code":"WRONG_DRAMATIC_SCENES"})
if not any(r>0 for r in rates) or not any(r<=-15 for r in rates):
 issues.append({"code":"NO_MEANINGFUL_TEMPO_CONTRAST"})
if len(set(rates))<6:issues.append({"code":"MONOTONE_RATE"})
if not .08 <= silent/timeline["totalFrames"] <= .25:
 issues.append({"code":"UNBALANCED_SILENCE"})
gaps=[p["pauseFrames"] for p in phr]
if max(gaps)/timeline["fps"]>2.4:issues.append({"code":"LONG_UNMOTIVATED_PAUSE"})
result={
 "status":"TECHNICAL_PASS" if not issues else "FAIL",
 "directorStatus":"LISTENING_AND_STORY_REVIEW_PENDING",
 "source":"Windows Motion Lab - real recorded Edge TTS timing",
 "fps":timeline["fps"],"blocks":len(timeline["blocks"]),"phrases":len(phr),
 "voiceSeconds":round(voice/timeline["fps"],2),
 "silentSeconds":round(silent/timeline["fps"],2),
 "silenceFraction":round(silent/timeline["totalFrames"],3),
 "reactionHoldSeconds":round(sum(b["reactionHoldFrames"] for b in timeline["blocks"])/timeline["fps"],2),
 "ratePercentRange":[min(rates),max(rates)],
 "distinctTempoSettings":len(set(rates)),
 "storyScenes":len(story["scenes"]),
 "originalSeconds":round(old["totalFrames"]/old["fps"],2),
 "rhythmSeconds":round(timeline["totalFrames"]/timeline["fps"],2),
 "additionalSeconds":round((timeline["totalFrames"]-old["totalFrames"])/timeline["fps"],2),
 "issues":issues,
 "approvalRule":"Do not publish solely on automatic checks. Listen to beginning, emotional reversal, Cantonese/English, ending; watch actor continuity. Real breath/acting quality is subjective.",
 "notes":"Silent frame holds are intentional; fake breathing sound effects and background music are not inserted."
}
out=PROJECT/"rhythm-qa.json"
out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
print(json.dumps(result,ensure_ascii=False,indent=2))
sys.exit(0 if not issues else 1)
