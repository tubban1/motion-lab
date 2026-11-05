import asyncio,json,os,sys,random
from pathlib import Path
import edge_tts
from mutagen.mp3 import MP3
ROOT=Path(__file__).resolve().parents[2]
P=ROOT/"projects/hongkong-wind-lyrics-20261031"
OUT=ROOT/"public/hongkong-wind-lyrics-20261031/voice"
OUT.mkdir(parents=True,exist_ok=True)
data=json.loads((P/"script.json").read_text(encoding="utf-8"))
voices=data["voice"]
RATE={"narrator":"-12%","english":"-15%","cantonese":"-12%"}
PITCH={"narrator":"-11Hz","english":"-7Hz","cantonese":"-2Hz"}
sem=asyncio.Semaphore(3)
async def make(s):
    async with sem:
        dest=OUT/(s["id"]+".mp3")
        if not dest.exists() or dest.stat().st_size<3000:
            last=None
            for i in range(3):
                try:
                    temp=OUT/(s["id"]+"."+str(os.getpid())+".tmp.mp3")
                    comm=edge_tts.Communicate(s["text"],voices[s["role"]],rate=RATE[s["role"]],pitch=PITCH[s["role"]])
                    await comm.save(str(temp))
                    if temp.stat().st_size<3000:raise ValueError("MP3 too small")
                    temp.replace(dest)
                    break
                except Exception as e:
                    last=e;print("ERROR",s["id"],str(e)[:130],flush=True)
                    await asyncio.sleep(2+i*4)
            if not dest.exists():raise RuntimeError(f"VOICE_FAIL {s['id']}: {last}")
        d=MP3(str(dest)).info.length
        assert .4<d<40,(s["id"],d)
        print("VOICE_OK",s["id"],s["role"],round(d,2),flush=True)
        return {**s,"audio":"hongkong-wind-lyrics-20261031/voice/"+s["id"]+".mp3","seconds":round(d,3)}
async def main():
    tasks=[make(s) for s in data["segments"]]
    rows=await asyncio.gather(*tasks)
    cursor=36
    for s in rows:
        s["startFrame"]=cursor
        s["voiceFrames"]=round(s["seconds"]*24)+5
        s["gapFrames"]=round(s["gapSeconds"]*24)
        s["durationFrames"]=s["voiceFrames"]+s["gapFrames"]
        cursor+=s["durationFrames"]
    full={"fps":24,"totalFrames":cursor,"duration":round(cursor/24,2),"segments":rows}
    (P/"timeline.json").write_text(json.dumps(full,ensure_ascii=False,indent=2),encoding="utf-8")
    print("TIMELINE_COMPLETE",len(rows),"frames",cursor,"duration",round(cursor/24,2),flush=True)
if __name__=="__main__":asyncio.run(main())
