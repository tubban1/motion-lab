#!/usr/bin/env python3
"""Motion Lab: semantic prosody -> real recorded audio -> exact Remotion frames.

The script is a production tool, not an LLM acting as a voice:
1. A director-approved score fixes what is said and where it must breathe.
2. Edge TTS generates each phrase with its own intended tempo.
3. Actual audio duration (not character count) owns the picture timeline.
4. Missing audio never silently produces a "successful" timeline.
No fake inhale effects or music are added.
"""
from __future__ import annotations
import argparse
import asyncio
import hashlib
import json
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
FILM = ROOT / "projects" / "hongkong-wind-lyrics-20261031"
SCRIPT = FILM / "script.json"
VOICE_DIR = ROOT / "public" / "hongkong-wind-lyrics-20261031" / "voice-rhythm"
SCORE_PATH = FILM / "rhythm-score.json"
TIMELINE_PATH = FILM / "rhythm-timeline.json"
FPS = 24
INTRO_FRAMES = 36
VOICE = {
    "narrator": "zh-CN-YunyangNeural",
    "english": "en-US-GuyNeural",
    "cantonese": "zh-HK-HiuGaaiNeural",
}
# Direction here is deliberate. Pauses are AFTER the phrase, on actual silent frames.
# ratePercent changes how the engine pronounces the phrase, not post-production speed.
# The end of the whole segment gets an additional reaction hold, in storyboard time.
PERFORMANCE: dict[str, dict[str, Any]] = {
 "01":{"arc":"悬念：时间坐标—异物闯入","chunks":[
  ("2026年10月24日，香港启德。",-5,390,"沉稳地交代地点"),
  ("一个从1993年吹来的声音，",-9,470,"回望，微微停住"),
  ("突然闯进了The Weeknd的新歌《Hong Kong》。",+2,780,"突然加速后收住")]},
 "02":{"arc":"问题—揭示，不是连续解释","chunks":[
  ("你以为他只是在致敬王菲。",+3,320,"抛出问题"),
  ("可把两首歌的词放在一起，",-2,330,"带着听众靠近"),
  ("才发现，最动人的不是旋律，",-10,520,"轻声递进"),
  ("而是两个年代，仿佛在接续同一次告别。",-12,1050,"留给画面时间")]},
 "06":{"arc":"否定—反转—现实代价","chunks":[
  ("听清楚：",+5,220,"提醒但不吼"),
  ("不是不想留下。",-17,630,"重读不想，之后真正停住"),
  ("是再热烈的爱，也不一定能战胜现实。",-8,470,"沉住"),
  ("一个人愿意交出全部，",-1,330,"略快，制造预期"),
  ("却交不出最普通的陪伴。",-19,1150,"重量落在陪伴")]},
 "08":{"arc":"两个视角的对称","chunks":[
  ("王菲却站在爱情的另一边。",-6,390,"站位转变"),
  ("她明明已经决定离开，",-8,350,"克制"),
  ("拥抱时，又一次失去勇气。",-15,570,"向内收"),
  ("一个人被生活困住，",+1,280,"陈述事实"),
  ("一个人被自己的心困住。",-13,850,"对称句落下")]},
 "09":{"arc":"夜与清晨，留给镜头动作","chunks":[
  ("英文主歌还有更狠的一笔。",+1,260,"前奏"),
  ("昨夜他们贴得那么近，",-8,570,"亲密"),
  ("到了天亮，",-14,540,"让画面完成天光变化"),
  ("却像素未谋面的陌生人。",-17,660,"残酷的反差"),
  ("感情才刚刚发生，就没有了明天。",-12,1050,"音落后仍留空镜")]},
 "11":{"arc":"风从进入到离开","chunks":[
  ("王菲没有追问对方为什么走。",-6,400,"少解释"),
  ("她把那个人写成了风。",-11,560,"词意落在风"),
  ("来时改变了整个世界，",+3,250,"略快扬起"),
  ("走的时候，却不肯带走留下的痛。",-17,1050,"余痛")]},
 "13":{"arc":"清晨和夜晚的对照","chunks":[
  ("于是两首歌有了令人心碎的时间差。",-4,390,"发现"),
  ("他唱的是离别发生的清晨。",-8,610,"停住，让清晨成立"),
  ("她唱的是离别以后，",-8,370,"转向另一人"),
  ("一遍遍醒来的夜晚。",-17,1050,"孤独延长")]},
 "15":{"arc":"解释段落加速，最后减速","chunks":[
  ("英文里，他试着习惯人生的变迁。",+4,260,"平实"),
  ("粤语里，她明知季候会更替，",+1,240,"连续"),
  ("却还是挡不住下一次心动。",-7,430,"转折"),
  ("他们都懂得时间会改变一切，",-9,430,"慢下来"),
  ("却都没学会怎样不再想念。",-16,920,"余韵")]},
 "17":{"arc":"不可能—等待—留地址","chunks":[
  ("他先说，人生不允许自己留下。",-9,420,"陈述不能"),
  ("到最后，却仍然愿意等待。",-15,650,"扭转"),
  ("或许那个人不会回头，",-11,440,"留悬念"),
  ("但他还是为她留着一个地址。",-18,1200,"不做廉价煽情")]},
 "19":{"arc":"结尾三次递进，情绪收束","chunks":[
  ("她像是在说：风走了，我的痛还在。",-14,610,"第一层：余痛"),
  ("他像是在回答：如果风回来，我还在这里。",-12,770,"第二层：应答"),
  ("三十三年，两个声音，一座城。",-17,1000,"第三层：城市全景"),
  ("原来有些歌不是重新响起，",-6,350,"突然开始加速"),
  ("而是多年以后，终于有人替它说完了心事。",-21,1800,"最后一句极慢，之后无声留白")]},
}
# Punctuation in automated scenes is only a *fallback*. The director can always
# author a named cue for key lines. Never split by character count to fill 19 cards.
END_PAUSE = {"。":510,"！":570,"？":570,"!":520,"?":520,".":480,":":250,"，":260,"；":350,";":350,"：":290,":":290}
RE = re.compile(r"[^。！？!?；;：:，,\.]+[。！？!?；;：:，,\.]?")
SLOW_BEATS = {"03","05","07","10","12","14","16"}
SCENE_HOLDS = {
 "01":420,"02":450,"03":640,"04":320,"05":610,"06":610,
 "07":640,"08":370,"09":780,"10":650,"11":390,"12":800,"13":640,
 "14":450,"15":530,"16":930,"17":930,"18":450,"19":1400,
}
def safe_join(chunks: list[dict], original: str, ident: str)->None:
    actual="".join(c["text"] for c in chunks)
    if re.sub(r"\s+","",actual)!=re.sub(r"\s+","",original):
        raise ValueError(f"Audible words do not match source script for {ident}: {actual!r} != {original!r}")

def auto_chunks(text: str, role: str, beat_id: str) -> list[dict]:
    parts=RE.findall(text)
    if "".join(parts)!=text:raise ValueError(f"Unrecognized punctuation at beat {beat_id}")
    result=[]
    for i,part in enumerate(parts):
        punct=part[-1] if part[-1] in END_PAUSE else "。"
        p=END_PAUSE.get(punct,450)
        if i==len(parts)-1:p=max(120,int(p*.5))
        rate= -7 if role=="narrator" else -9 if role=="cantonese" else -11
        if beat_id in SLOW_BEATS:rate-=4
        result.append({"text":part,"ratePercent":rate,"pauseAfterMs":p,"direction":"自然停顿/尊重原句","emphasis":[]})
    return result

def make_score(script: dict)->dict:
    blocks=[]
    ids=set()
    for src in script["segments"]:
        beat_id=src["id"]
        assert beat_id not in ids
        ids.add(beat_id)
        direction=PERFORMANCE.get(beat_id)
        if direction:
            chunks=[{"text":item["text"],"ratePercent":item["ratePercent"],"pauseAfterMs":item["pauseAfterMs"],"direction":item.get("direction","导演指令"),"emphasis":item.get("emphasis",[])} if isinstance(item,dict) else {"text":item[0],"ratePercent":item[1],"pauseAfterMs":item[2],"direction":item[3],"emphasis":[]} for item in direction["chunks"]]
        else:chunks=auto_chunks(src["text"],src["role"],beat_id)
        safe_join(chunks,src["text"],beat_id)
        for c in chunks:
            if not -35<=c["ratePercent"]<=20:raise ValueError("Unsafe tempo")
            if not 0<=c["pauseAfterMs"]<=2200:raise ValueError("Unsafe pause")
        blocks.append({"id":beat_id,"role":src["role"],"scene":src["scene"],
            "overlay":src["overlay"],"text":src["text"],"arc":direction["arc"] if direction else "自然过渡",
            "reactionHoldMs":SCENE_HOLDS.get(beat_id,src.get("reactionHoldMs",450)),"phrases":[{"id":f"{beat_id}-{i+1:02}",**c} for i,c in enumerate(chunks)]})
    return {"version":1,"fps":FPS,"introFrames":INTRO_FRAMES,"source":SCRIPT.name,
        "method":"semantic phrase direction + verified audio durations + deliberate reaction holds",
        "notes":"pauses are recorded as silent timeline gaps, not synthetic inhalation noises",
        "blocks":blocks}

def fingerprint(phrase:dict,voice:str,pitch:str)->str:
    data=json.dumps({"text":phrase["text"],"rate":phrase["ratePercent"],"voice":voice,"pitch":pitch},
                    ensure_ascii=False,sort_keys=True).encode("utf-8")
    return hashlib.sha256(data).hexdigest()[:14]

def save_score(score:dict)->None:
    SCORE_PATH.write_text(json.dumps(score,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("SCORE",SCORE_PATH,len(score["blocks"]),"beats",sum(len(b["phrases"]) for b in score["blocks"]),"phrases",flush=True)

def synthesis_status(score:dict)->dict:
    total=0;available=0;missing=[]
    for b in score["blocks"]:
        for p in b["phrases"]:
            total+=1
            filename=f"{p['id']}.mp3"
            if (VOICE_DIR/filename).is_file() and (VOICE_DIR/filename).stat().st_size>1000:available+=1
            else:missing.append(p["id"])
    return {"total":total,"ready":available,"missing":missing}

async def synthesize(score:dict,selected:set[str]|None,retry:int=2)->None:
    try:import edge_tts
    except ImportError as e:raise RuntimeError("Install: py -m pip install edge-tts mutagen") from e
    VOICE_DIR.mkdir(parents=True,exist_ok=True)
    sem=asyncio.Semaphore(2)
    items=[(b,p) for b in score["blocks"] for p in b["phrases"]
           if not selected or b["id"] in selected or p["id"] in selected]
    async def one(block:dict,phrase:dict):
        async with sem:
            out=VOICE_DIR/(phrase["id"]+".mp3")
            v=VOICE[block["role"]];pitch="-8Hz" if block["role"]=="narrator" else "-3Hz"
            stamp=VOICE_DIR/(phrase["id"]+".json")
            key=fingerprint(phrase,v,pitch)
            if out.is_file() and stamp.is_file():
                try:
                    if json.loads(stamp.read_text(encoding="utf8"))["fingerprint"]==key and out.stat().st_size>1000:
                        print("VOICE_CACHED",phrase["id"],flush=True);return
                except Exception:pass
            for attempt in range(retry+1):
                temp=VOICE_DIR/(phrase["id"]+f".{os.getpid()}.temp.mp3")
                try:
                    communicate=edge_tts.Communicate(phrase["text"],v,
                        rate=f'{phrase["ratePercent"]:+d}%',pitch=pitch)
                    await communicate.save(str(temp))
                    if temp.stat().st_size<1000:raise ValueError("TTS audio too small")
                    os.replace(temp,out)
                    stamp.write_text(json.dumps({"fingerprint":key,"voice":v,"engine":"edge",
                        "text":phrase["text"],"ratePercent":phrase["ratePercent"]},ensure_ascii=False),encoding="utf8")
                    print("VOICE_OK",phrase["id"],len(phrase["text"]),flush=True);return
                except Exception as e:
                    temp.unlink(missing_ok=True)
                    if attempt==retry:raise RuntimeError(f"TTS_FAILED {phrase['id']}: {e}") from e
                    await asyncio.sleep(2*(attempt+1))
    results=await asyncio.gather(*(one(b,p) for b,p in items),return_exceptions=True)
    errors=[str(x) for x in results if isinstance(x,BaseException)]
    if errors:raise RuntimeError("; ".join(errors[:6]))

def compile_timeline(score:dict,allow_partial:bool=False)->dict:
    try:from mutagen.mp3 import MP3
    except ImportError as e:raise RuntimeError("Install mutagen: py -m pip install mutagen") from e
    cursor=score["introFrames"]
    blocks=[]
    for b in score["blocks"]:
        at=cursor;phrases=[]
        for p in b["phrases"]:
            audio=VOICE_DIR/(p["id"]+".mp3")
            if not audio.is_file() or audio.stat().st_size<=1000:
                raise FileNotFoundError(f"Missing voice audio: {audio}")
            # A new tempo or text direction invalidates the previous recording.
            stamp=VOICE_DIR/(p["id"]+".json")
            pitch="-8Hz" if b["role"]=="narrator" else "-3Hz"
            expected=fingerprint(p,VOICE[b["role"]],pitch)
            if not stamp.is_file() or json.loads(stamp.read_text(encoding="utf8")).get("fingerprint")!=expected:
                raise RuntimeError(f"Stale voice recording {p['id']}; run --synthesize first.")
            try:seconds=float(MP3(str(audio)).info.length)
            except Exception as e:raise RuntimeError(f"Unreadable audio file: {audio}") from e
            if seconds<.12 or seconds>30:raise ValueError(f"Implausible phrase length {p['id']}: {seconds}")
            frames=max(1,round(seconds*FPS))
            pause=max(0,round(p["pauseAfterMs"]*FPS/1000))
            phrases.append({**p,"audio":f"{VOICE_DIR.relative_to(ROOT/'public').as_posix()}/{p['id']}.mp3",
                            "startFrame":cursor,"voiceFrames":frames,"pauseFrames":pause,
                            "audioSeconds":round(seconds,4)})
            cursor+=frames+pause
        hold=round(b["reactionHoldMs"]*FPS/1000)
        cursor+=hold
        blocks.append({"id":b["id"],"role":b["role"],"scene":b["scene"],"text":b["text"],
            "overlay":b["overlay"],"arc":b["arc"],
            "startFrame":at,"endFrame":cursor,"durationFrames":cursor-at,
            "reactionHoldFrames":hold,"phrases":phrases})
    timeline={"version":1,"fps":FPS,"introFrames":score["introFrames"],"totalFrames":cursor,
        "durationSeconds":round(cursor/FPS,3),"blocks":blocks}
    # Independent invariant: audible parts cannot be overlapped or swallowed by cuts.
    last=score["introFrames"]
    for b in blocks:
        assert b["startFrame"]==last
        for p in b["phrases"]:
            assert p["startFrame"]>=last and p["voiceFrames"]>0
            last=p["startFrame"]+p["voiceFrames"]+p["pauseFrames"]
        assert last+b["reactionHoldFrames"]==b["endFrame"]
        last=b["endFrame"]
    assert last==cursor
    return timeline

def main()->None:
    global FILM, SCRIPT, VOICE_DIR, SCORE_PATH, TIMELINE_PATH, PERFORMANCE, SCENE_HOLDS, SLOW_BEATS, VOICE, FPS, INTRO_FRAMES
    parser=argparse.ArgumentParser()
    parser.add_argument("--score-only",action="store_true")
    parser.add_argument("--synthesize",action="store_true")
    parser.add_argument("--compile",action="store_true")
    parser.add_argument("--ids",nargs="*",default=None,help="Synthesize only these beat or phrase IDs")
    parser.add_argument('--script',type=Path,default=SCRIPT,help='Project script.json (within projects/)')
    parser.add_argument('--direction',type=Path,help='Optional director-authored performance JSON')
    args=parser.parse_args()
    SCRIPT=args.script.resolve()
    if not SCRIPT.is_relative_to(ROOT/'projects') or SCRIPT.name!='script.json':
        raise ValueError('Script must be projects/<project>/script.json')
    FILM=SCRIPT.parent
    VOICE_DIR=ROOT/'public'/FILM.name/'voice-rhythm'
    SCORE_PATH=FILM/'rhythm-score.json'
    TIMELINE_PATH=FILM/'rhythm-timeline.json'
    script=json.loads(SCRIPT.read_text(encoding='utf-8'))
    FPS=int(script.get('fps',24))
    if FPS not in (24,25,30,60):raise ValueError('Supported FPS: 24/25/30/60')
    INTRO_FRAMES=int(script.get('introFrames',36 if FILM.name=='hongkong-wind-lyrics-20261031' else 0))
    if not 0<=INTRO_FRAMES<600:raise ValueError('Invalid introFrames')
    if FILM.name!='hongkong-wind-lyrics-20261031':
        PERFORMANCE={};SCENE_HOLDS={};SLOW_BEATS=set()
    direction_path=args.direction or (FILM/'rhythm-direction.json')
    if direction_path.exists():
        direction=json.loads(direction_path.read_text(encoding='utf8'))
        PERFORMANCE=direction.get('blocks',{})
        SCENE_HOLDS={**SCENE_HOLDS,**direction.get('reactionHolds',{})}
    VOICE={**VOICE,**script.get('voice',{})}
    for block in script['segments']:
        if block['role'] not in VOICE:raise ValueError('Missing TTS voice for role '+str(block['role']))
    score=make_score(script)
    save_score(score)
    if args.synthesize:asyncio.run(synthesize(score,set(args.ids) if args.ids else None))
    if args.compile:
        timeline=compile_timeline(score)
        TIMELINE_PATH.write_text(json.dumps(timeline,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
        print("RHYTHM_TIMELINE_COMPLETE",timeline["totalFrames"],timeline["durationSeconds"],"secs",flush=True)
    print("AUDIO",json.dumps(synthesis_status(score),ensure_ascii=False),flush=True)

if __name__=="__main__":main()