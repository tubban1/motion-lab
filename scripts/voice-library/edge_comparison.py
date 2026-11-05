#!/usr/bin/env python3
"""Generate same-text Edge TTS samples for reproducible Qwen/Edge narration QA."""
import argparse, asyncio, hashlib, json, time
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/"projects/voice-library/acceptance/qwen3-0.6b"
EDGE_VOICES={"zh-male":"zh-CN-YunyangNeural","zh-female":"zh-CN-XiaoxiaoNeural",
             "en-male":"en-US-ChristopherNeural","zh-dialect":"zh-CN-YunxiNeural"}
async def generate(sample):
    import edge_tts
    from mutagen.mp3 import MP3
    output=BASE/("edge-"+sample["id"]+".mp3")
    speaker=EDGE_VOICES[sample["id"]]
    rate="-10%";pitch="-8Hz" if sample["language"]=="Chinese" else "-3Hz"
    begin=time.perf_counter()
    await asyncio.wait_for(edge_tts.Communicate(sample["text"],speaker,rate=rate,pitch=pitch).save(str(output)),timeout=55)
    secs=MP3(str(output)).info.length
    if secs<0.3:raise ValueError("Empty Edge output")
    wall=time.perf_counter()-begin
    return {"id":sample["id"],"text":sample["text"],"provider":"edge-tts",
        "voice":speaker,"rate":rate,"pitch":pitch,"audioDurationSeconds":round(secs,3),
        "generationSeconds":round(wall,3),"rtf":round(wall/secs,3),
        "bytes":output.stat().st_size,"sha256":hashlib.sha256(output.read_bytes()).hexdigest(),
        "path":str(output)}
async def main():
    p=argparse.ArgumentParser()
    p.add_argument("--sample",choices=["all"]+list(EDGE_VOICES),default="zh-male")
    a=p.parse_args()
    original=json.loads((BASE/"acceptance.json").read_text(encoding="utf8"))
    records={}
    reportpath=BASE/"edge-comparison.json"
    if reportpath.is_file():
        try:records={s["id"]:s for s in json.loads(reportpath.read_text(encoding="utf8")).get("samples",[])}
        except (OSError,KeyError,ValueError):pass
    for sample in original["samples"]:
        if a.sample not in ("all",sample["id"]):continue
        cached=records.get(sample["id"])
        f=BASE/("edge-"+sample["id"]+".mp3")
        if cached and f.is_file() and cached.get("text")==sample["text"] and hashlib.sha256(f.read_bytes()).hexdigest()==cached.get("sha256"):
            print("EDGE_CACHED",sample["id"],flush=True);continue
        result=await generate(sample)
        records[sample["id"]]=result
        reportpath.write_text(json.dumps({"comparability":"Same script, different model and speaker; latency includes Edge network",
                 "samples":list(records.values())},ensure_ascii=False,indent=2)+"\n",encoding="utf8")
        print("EDGE_PASS",sample["id"],result["audioDurationSeconds"],"RTF",result["rtf"],flush=True)
if __name__=="__main__":asyncio.run(main())
