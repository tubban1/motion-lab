#!/usr/bin/env python3
"""HK Wind V5: recast only EN/Cantonese with emotional pacing, preserve CN master hashes."""
from __future__ import annotations
import argparse, asyncio, hashlib, importlib.util, json, shutil
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
FILM=ROOT/"projects/hongkong-wind-lyrics-20261031"
PUBLIC=ROOT/"public/hongkong-wind-lyrics-20261031"
OLD_AUDIO=PUBLIC/"voice-rhythm"
NEW_AUDIO=PUBLIC/"voice-rhythm-v5"
MASTER=FILM/"script.json"
DIRECTION=FILM/"rhythm-direction.json"
SCORE=FILM/"rhythm-score-v5.json"
TIMELINE=FILM/"rhythm-timeline-v5.json"
STORY=FILM/"story-rhythm-v5.json"
CASTING=FILM/"voice-casting-v5.json"
VOICES={"narrator":"zh-CN-YunyangNeural","english":"en-US-ChristopherNeural","cantonese":"zh-HK-HiuMaanNeural"}
# Each original lyric/quote is preserved byte-for-byte; these are delivery cues.
CUES={
"03":("英文第一句：初见时的脆弱",[( "There was something in the air.",-18,640,"气息悬着、暗藏心动")]),
"05":("英文第二句：遗憾和无可奈何",[( "But my life won't let me stay.",-23,890,"不能留下：尾字自然收低")]),
"07":("粤语：分手说出口后的不舍",[( "明明還說分開。",-18,770,"不声嘶力竭，带哽咽般克制")]),
"10":("粤语：回想季候风与眼前的人",[( "那次季候風。",-14,760,"像翻到旧照片，有温度"),("你似季候風。",-21,950,"对你两字回望，后半句轻放")]),
"12":("粤语：余痛",[( "不死的心痛。",-24,1100,"轻而沉，最后不加虚假的吸气")]),
"14":("英文：无奈地面对变化",[( "Weathering changes.",-19,760,"缓慢接受命运的改变")]),
"16":("英文：等待与希望",[( "I'm waiting in Hong Kong.",-18,1190,"等待：不绝望，也不高昂")]),
}
def digest(p:Path)->str:
    return hashlib.sha256(p.read_bytes()).hexdigest()
def load_engine():
    spec=importlib.util.spec_from_file_location("hk_rhythm_engine",ROOT/"scripts/prosody/rhythm_engine.py")
    e=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(e)
    e.FILM=FILM;e.SCRIPT=MASTER;e.VOICE_DIR=NEW_AUDIO;e.SCORE_PATH=SCORE;e.TIMELINE_PATH=TIMELINE
    script=json.loads(MASTER.read_text(encoding="utf8"))
    assert script["voice"]["narrator"]==VOICES["narrator"],"Narrator identity has changed. Refusing."
    assert [s["id"] for s in script["segments"] if s["role"]!="narrator"]==["03","05","07","10","12","14","16"]
    e.VOICE=dict(VOICES)
    base=json.loads(DIRECTION.read_text(encoding="utf8"))
    e.PERFORMANCE=base["blocks"].copy()
    e.SCENE_HOLDS={**e.SCENE_HOLDS,**base["reactionHolds"]}
    for ident,(arc,chunks) in CUES.items():
        e.PERFORMANCE[ident]={"arc":arc,"chunks":[{"text":t,"ratePercent":rate,"pauseAfterMs":ms,
          "direction":note,"emphasis":[]} for t,rate,ms,note in chunks]}
    score=e.make_score(script)
    assert len(score["blocks"])==19
    assert sum(len(b["phrases"]) for b in score["blocks"])==61
    for b in score["blocks"]:
        orig=next(s for s in script["segments"] if s["id"]==b["id"])
        e.safe_join(b["phrases"],orig["text"],b["id"])
    return e,script,score

def prepare():
    e,script,score=load_engine()
    NEW_AUDIO.mkdir(parents=True,exist_ok=True)
    narrator_count=0
    manifest=[]
    for b in score["blocks"]:
        if b["role"]!="narrator":continue
        for p in b["phrases"]:
            ident=p["id"]
            old=OLD_AUDIO/(ident+".mp3"); stamp=OLD_AUDIO/(ident+".json")
            if not old.is_file() or not stamp.is_file():raise FileNotFoundError("Original master missing: "+ident)
            previous=json.loads(stamp.read_text(encoding="utf8"))
            wanted=e.fingerprint(p,VOICES["narrator"],"-8Hz")
            if wanted!=previous.get("fingerprint"):raise AssertionError("Original master changed or stale: "+ident)
            target=NEW_AUDIO/(ident+".mp3");target_stamp=NEW_AUDIO/(ident+".json")
            if target.exists() and digest(target)!=digest(old):raise AssertionError("Preserved narrator mismatch: "+ident)
            if not target.exists():shutil.copy2(old,target)
            if not target_stamp.exists():shutil.copy2(stamp,target_stamp)
            if digest(old)!=digest(target):raise AssertionError("Master audio hash mismatch: "+ident)
            narrator_count+=1;manifest.append({"id":ident,"sha256":digest(old)})
    e.save_score(score)
    CASTING.write_text(json.dumps({"version":5,"approach":"Unchanged Chinese narrator + two recast roles; Edge TTS prosody only, not Azure expressive SSML",
        "voices":VOICES,"narratorUnchanged":True,"narratorClips":narrator_count,
        "narratorSha256":manifest,"emotionCues":{key:{"arc":v[0],"phrases":[{"text":t,"ratePercent":rate,"pauseAfterMs":ms,"direction":note} for t,rate,ms,note in v[1]]} for key,v in CUES.items()},
        "lyricsPolicy":"Existing original short quotation text unchanged; no added lyrics"},indent=2,ensure_ascii=False)+"\n",encoding="utf8")
    print("PREPARED_V5",len(score["blocks"]),"blocks",narrator_count,"preserved Chinese clips",flush=True)
def finalize():
    e,script,score=load_engine()
    timeline=e.compile_timeline(score)
    TIMELINE.write_text(json.dumps(timeline,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
    source_story=json.loads((FILM/"story-continuity.json").read_text(encoding="utf8"))
    ids={"s2":"03","s3":"07","s4":"10","s5":"14","s6":"18"}
    starts=[0]+[next(b["startFrame"] for b in timeline["blocks"] if b["id"]==ids[name]) for name in ids]
    assert len(starts)==len(source_story["scenes"]) and all(starts[i]<starts[i+1] for i in range(len(starts)-1))
    for i,s in enumerate(source_story["scenes"]):
        s["startFrame"]=starts[i];s["endFrame"]=starts[i+1] if i+1<len(starts) else timeline["totalFrames"]
    source_story["totalFrames"]=timeline["totalFrames"]
    source_story["audioDriven"]=True
    source_story["retiming"]={"source":"rhythm-timeline-v5.json","anchors":ids,
       "rule":"Observed clip durations plus performance pauses; scene changes on beat entries"}
    STORY.write_text(json.dumps(source_story,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
    src=ROOT/"src/projects/hongkong-wind-lyrics-20261031/HKContinuousStoryRhythmV4.tsx"
    dest=src.with_name("HKContinuousStoryEmotionV5.tsx")
    code=src.read_text(encoding="utf8").replace("story-rhythm.json","story-rhythm-v5.json").replace("rhythm-timeline.json","rhythm-timeline-v5.json").replace("RHYTHM_V4_FRAMES","EMOTION_V5_FRAMES").replace("HKContinuousStoryRhythmV4","HKContinuousStoryEmotionV5")
    if "story-rhythm-v5.json" not in code or "rhythm-timeline-v5.json" not in code:raise AssertionError("Render source not migrated")
    dest.write_text(code,encoding="utf8")
    rootfile=ROOT/"src/root.tsx"
    old=rootfile.read_text(encoding="utf8")
    importline="import {HKContinuousStoryEmotionV5,EMOTION_V5_FRAMES} from './projects/hongkong-wind-lyrics-20261031/HKContinuousStoryEmotionV5';"
    composition=' <Composition id="HKContinuousStoryEmotionV5" component={HKContinuousStoryEmotionV5} durationInFrames={EMOTION_V5_FRAMES} fps={24} width={720} height={1280} />'
    if importline not in old:old=importline+"\n"+old
    if composition not in old:old=old.replace('export const Root:React.FC=()=> <>','export const Root:React.FC=()=> <>\n'+composition)
    rootfile.write_text(old,encoding="utf8")
    narrator_n=sum(len(b["phrases"]) for b in timeline["blocks"] if b["role"]=="narrator")
    changed=[p["id"] for b in timeline["blocks"] if b["role"]!="narrator" for p in b["phrases"]]
    print("V5_FINAL",timeline["totalFrames"],timeline["durationSeconds"],"seconds","narrator clips",narrator_n,"recast",changed,flush=True)
    assert narrator_n==53 and len(changed)==8
def main():
    p=argparse.ArgumentParser()
    p.add_argument("action",choices=["prepare","synthesize","finalize","status"])
    a=p.parse_args()
    if a.action=="prepare":prepare()
    elif a.action=="synthesize":
        e,script,score=load_engine()
        if not SCORE.exists():raise RuntimeError("First run prepare")
        asyncio.run(e.synthesize(score,set(CUES)))
        print("VOICE_V5",json.dumps(e.synthesis_status(score)),flush=True)
    elif a.action=="finalize":finalize()
    else:
        e,script,score=load_engine()
        print(json.dumps(e.synthesis_status(score),ensure_ascii=False),flush=True)
if __name__=="__main__":main()
