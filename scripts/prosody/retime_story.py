#!/usr/bin/env python3
"""Remap dramatic scene boundaries to observed audio, preserving the continuous story."""
import json
from pathlib import Path
BASE=Path(__file__).resolve().parents[2]/"projects/hongkong-wind-lyrics-20261031"
old=json.loads((BASE/"timeline.json").read_text("utf8"))
new=json.loads((BASE/"rhythm-timeline.json").read_text("utf8"))
story=json.loads((BASE/"story-continuity.json").read_text("utf8"))
assert old["fps"]==new["fps"]==story["fps"]==24
old_by_id={b["id"]:b for b in old["segments"]}
new_by_id={b["id"]:b for b in new["blocks"]}
assert set(old_by_id)==set(new_by_id)
# Dramatic scene changes happen at the entrance of their first utterance.
anchors=[("s1",None),("s2","03"),("s3","07"),("s4","10"),("s5","14"),("s6","18")]
old_starts=[0]+[old_by_id[x]["startFrame"] for _,x in anchors[1:]]
new_starts=[0]+[new_by_id[x]["startFrame"] for _,x in anchors[1:]]
assert [s["startFrame"] for s in story["scenes"]]==old_starts,"Story source changed; review anchors, do not silently drift"
assert all(new_starts[i]<new_starts[i+1] for i in range(len(new_starts)-1))
for i,s in enumerate(story["scenes"]):
 s["startFrame"]=new_starts[i]
 s["endFrame"]=new_starts[i+1] if i+1<len(story["scenes"]) else new["totalFrames"]
 assert s["endFrame"]>s["startFrame"]
story["totalFrames"]=new["totalFrames"]
story["audioDriven"]=True
story["retiming"]={"source":"rhythm-timeline.json","anchors":{sid:id for sid,id in anchors if id},
 "rule":"Use actual phrase lengths and performance pauses, with scenes anchored to narrative beat entry."}
(BASE/"story-rhythm.json").write_text(json.dumps(story,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
print("RHYTHM_STORY",story["totalFrames"],"frames",[(s["id"],s["startFrame"],s["endFrame"]) for s in story["scenes"]])
