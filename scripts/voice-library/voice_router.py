#!/usr/bin/env python3
"""Motion Lab dual TTS entrypoint: Edge default, local Qwen opt-in (no silent fallback)."""
import argparse, asyncio, hashlib, json, os, re, subprocess, sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
LIB=ROOT/"projects/voice-library/annotated-voices.json"
ENGINES=("edge","qwen")
QWEN_VOICES={"Vivian","Serena","Uncle_Fu","Dylan","Eric","Ryan","Aiden","Ono_Anna","Sohee"}
EDGE_DEFAULT="zh-CN-YunyangNeural"
QWEN_DEFAULT="Uncle_Fu"
def hashfile(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()
def quality_warnings(engine,text,duration):
    flags=[]
    if engine=="qwen" and len(re.sub(r"[^A-Za-z0-9\u4e00-\u9fff]","",text))<=8 and duration>6:
        flags.append("SHORT_TEXT_EXCESS_DURATION_REVIEW_REQUIRED")
    return flags
def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--list",action="store_true",help="List annotated voice metadata; does not download")
    ap.add_argument("--engine",choices=ENGINES,default="edge")
    ap.add_argument("--voice")
    ap.add_argument("--language",default="Chinese")
    ap.add_argument("--text")
    ap.add_argument("--project",default="voice-qa")
    ap.add_argument("--clip")
    ap.add_argument("--rate",default="-10%",help="Edge only")
    ap.add_argument("--pitch",default="-8Hz",help="Edge only")
    args=ap.parse_args()
    if args.list:
        meta=json.loads(LIB.read_text(encoding="utf8"))
        print(json.dumps({"voices":meta.get("voices",[]),"datasets":meta.get("datasets",[])},ensure_ascii=False,indent=2));return
    if not args.text or not args.text.strip() or len(args.text)>180:
        ap.error("--text must be 1-180 characters; split long narration into phrases")
    if not re.fullmatch("[A-Za-z0-9][A-Za-z0-9_-]{0,79}",args.project):
        ap.error("--project must be a safe folder slug")
    if args.clip and not re.fullmatch("[A-Za-z0-9][A-Za-z0-9_-]{0,79}",args.clip):
        ap.error("--clip must be a safe filename slug")
    if args.engine=="qwen" and (args.language.lower() in {"cantonese","zh-hk","yue"}):
        ap.error("Qwen 0.6B Cantonese is not accepted: select a zh-HK Edge voice instead")
    voice=args.voice or (QWEN_DEFAULT if args.engine=="qwen" else EDGE_DEFAULT)
    if args.engine=="qwen" and voice not in QWEN_VOICES:
        ap.error("Unknown Qwen preset voice")
    if args.engine=="edge" and not re.fullmatch("[A-Za-z]{2,3}-[A-Za-z]{2,8}(?:-[A-Za-z0-9]+)*Neural",voice):
        ap.error("Edge voice must be a named Neural voice ID")
    if args.engine=="qwen" and (args.rate!="-10%" or args.pitch!="-8Hz"):
        ap.error("Qwen 0.6B has no verified per-phrase rate/pitch control; use director pauses")
    stable={"engine":args.engine,"voice":voice,"language":args.language if args.engine=="qwen" else None,
            "text":args.text,"rate":args.rate if args.engine=="edge" else None,
            "pitch":args.pitch if args.engine=="edge" else None}
    fingerprint=hashlib.sha256(json.dumps(stable,sort_keys=True,ensure_ascii=False).encode("utf8")).hexdigest()
    clip=args.clip or ("tts-"+fingerprint[:14])
    folder=ROOT/"public"/args.project/"audio"
    folder.mkdir(parents=True,exist_ok=True)
    ext=".wav" if args.engine=="qwen" else ".mp3"
    output=folder/(clip+ext)
    stamp=output.with_suffix(ext+".json")
    if output.is_file() and stamp.is_file():
        try:
            old=json.loads(stamp.read_text(encoding="utf8"))
            if old.get("fingerprint")==fingerprint and hashfile(output)==old.get("sha256"):
                old["qualityWarnings"]=quality_warnings(args.engine,args.text,float(old["durationSeconds"]))
                print(json.dumps({**old,"cached":True},ensure_ascii=False));return
        except (OSError,ValueError):pass
    tmp=output.with_suffix(".partial"+ext)
    if tmp.exists():tmp.unlink()
    try:
        if args.engine=="edge":
            import edge_tts
            async def speak():
                await asyncio.wait_for(edge_tts.Communicate(args.text,voice,rate=args.rate,pitch=args.pitch).save(str(tmp)),timeout=60)
            asyncio.run(speak())
            from mutagen.mp3 import MP3
            duration=float(MP3(str(tmp)).info.length)
            result={"provider":"edge","durationSeconds":round(duration,3)}
        else:
            py=Path(os.environ.get("LOCALAPPDATA",str(Path.home()/"AppData/Local")))/"MotionLab/qwen3-tts-venv/Scripts/python.exe"
            if not py.is_file():raise FileNotFoundError("Qwen Python 3.12 venv missing")
            render=Path(__file__).with_name("qwen_render_single.py")
            cmd=[str(py),"-u",str(render),"--text",args.text,"--speaker",voice,
                 "--language",args.language,"--out",str(tmp)]
            child=subprocess.run(cmd,cwd=str(ROOT),capture_output=True,text=True,timeout=900)
            if child.returncode:raise RuntimeError("Qwen inference failed: "+child.stderr[-1500:])
            last=child.stdout.strip().splitlines()[-1]
            result=json.loads(last)
            duration=result["durationSeconds"]
        if not tmp.is_file() or tmp.stat().st_size<1000 or duration<.25:raise ValueError("Invalid synthesized audio")
        os.replace(tmp,output)
        receipt={**stable,**result,"fingerprint":fingerprint,
           "sha256":hashfile(output),"bytes":output.stat().st_size,
           "path":str(output),"webPath":"/"+args.project+"/audio/"+output.name,
           "validated":"files-and-duration-only; human listening pending",
           "qualityWarnings":quality_warnings(args.engine,args.text,float(duration)),
           "productionReady":False if args.engine=="qwen" else None,"cached":False}
        stamp.write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
        print(json.dumps(receipt,ensure_ascii=False),flush=True)
    finally:
        if tmp.exists():tmp.unlink()
if __name__=="__main__":main()
