#!/usr/bin/env python3
"""Qwen3-TTS offline Windows acceptance (CPU, no CUDA). Never claims pass without WAVs."""
import argparse, hashlib, json, os, sys, time, traceback, wave
from pathlib import Path
R=Path(__file__).resolve().parents[2]
MODEL="Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice"
ROOT=Path(os.environ.get("MOTIONLAB_MODEL_HOME",Path.home()/"AppData/Local/MotionLab"))
HF_HOME=ROOT/"hf-cache"
os.environ["HF_HOME"]=str(HF_HOME)
os.environ["HF_HUB_DISABLE_TELEMETRY"]="1"
SAMPLES=R/"projects/voice-library/acceptance/qwen3-0.6b"
REPORT=SAMPLES/"acceptance.json"
SPEAKERS=[
 {"id":"zh-male","speaker":"Uncle_Fu","language":"Chinese","text":"风停了。可是，有些话还没有说完。","intent":"low-mellow-reflective"},
 {"id":"zh-female","speaker":"Serena","language":"Chinese","text":"她没有回头，只有那盏灯，还亮着。","intent":"warm-gentle-reflective"},
 {"id":"en-male","speaker":"Ryan","language":"English","text":"I thought he would stay. But the room was quiet.","intent":"English-rhythmic"},
 {"id":"zh-dialect","speaker":"Dylan","language":"Chinese","text":"你听，这条街又热闹起来了。","intent":"Beijing-youthful"},
]
def stamp(rec):
 REPORT.parent.mkdir(parents=True,exist_ok=True)
 REPORT.write_text(json.dumps(rec,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
def main():
 p=argparse.ArgumentParser()
 p.add_argument("--download-only",action="store_true")
 p.add_argument("--sample",choices=["all"]+[s["id"] for s in SPEAKERS],default="zh-male")
 p.add_argument("--cpu-threads",type=int,default=4)
 p.add_argument("--max-new-tokens",type=int,default=256)
 a=p.parse_args()
 rec={"model":MODEL,"device":"cpu","modelHome":str(HF_HOME),"startedAt":time.strftime("%Y-%m-%dT%H:%M:%S"),
      "status":"STARTED","sampleSelection":a.sample,"samples":[]}
 previous={}
 if REPORT.exists():
  try:
   old=json.loads(REPORT.read_text(encoding="utf8"))
   if old.get("model")==MODEL:
    previous={s["id"]:s for s in old.get("samples",[]) if s.get("sha256")}
  except (OSError,ValueError,KeyError):pass
 stamp(rec)
 try:
  print("MODEL_HOME",HF_HOME,flush=True)
  print("IMPORT_HUB",flush=True)
  from huggingface_hub import snapshot_download
  print("DOWNLOAD_START",MODEL,flush=True)
  t0=time.perf_counter()
  folder=snapshot_download(MODEL,local_files_only=not a.download_only)
  rec["downloadSeconds"]=round(time.perf_counter()-t0,2)
  rec["snapshotPath"]=str(folder)
  print("DOWNLOAD_COMPLETE",folder,round(rec["downloadSeconds"],1),flush=True)
  if a.download_only:
   rec["status"]="DOWNLOADED_NOT_INFERRED"
   stamp(rec);return
  import torch, numpy as np, soundfile as sf
  from qwen_tts import Qwen3TTSModel
  torch.set_num_threads(a.cpu_threads)
  torch.set_num_interop_threads(1)
  print("MODEL_LOAD_BEGIN","torch",torch.__version__,flush=True)
  t1=time.perf_counter()
  model=Qwen3TTSModel.from_pretrained(folder,device_map="cpu",dtype=torch.float32,attn_implementation="sdpa")
  rec["loadSeconds"]=round(time.perf_counter()-t1,2)
  print("MODEL_LOADED",rec["loadSeconds"],flush=True)
  selections=SPEAKERS if a.sample=="all" else [x for x in SPEAKERS if x["id"]==a.sample]
  for s in selections:
   old_sample=previous.get(s["id"])
   old_path=SAMPLES/(s["id"]+".wav")
   if old_sample and old_sample.get("text")==s["text"] and old_sample.get("speaker")==s["speaker"] and old_path.is_file() and hashlib.sha256(old_path.read_bytes()).hexdigest()==old_sample["sha256"]:
    rec["samples"].append(old_sample)
    stamp(rec)
    print("SYNTH_REUSE",s["id"],flush=True)
    continue
   print("SYNTH_START",s["id"],s["speaker"],flush=True)
   t2=time.perf_counter()
   wavs,sr=model.generate_custom_voice(text=s["text"],language=s["language"],speaker=s["speaker"],
                                        max_new_tokens=a.max_new_tokens)
   sec=time.perf_counter()-t2
   arr=np.asarray(wavs[0],dtype=np.float32).reshape(-1)
   if arr.size<sr//4:raise ValueError("Generated audio too short")
   if not np.isfinite(arr).all():raise ValueError("Nonfinite samples")
   duration=arr.size/sr
   peak=float(np.max(np.abs(arr)))
   clipped=float(np.mean(np.abs(arr)>=.999))
   out=SAMPLES/(s["id"]+".wav")
   sf.write(out,arr,sr,subtype="PCM_16")
   sha=hashlib.sha256(out.read_bytes()).hexdigest()
   sample={**s,"path":str(out),"durationSeconds":round(duration,3),"generationSeconds":round(sec,3),
           "rtf":round(sec/duration,3),"sampleRate":sr,"peak":round(peak,4),"clippingFraction":round(clipped,7),
           "sha256":sha,"bytes":out.stat().st_size}
   rec["samples"].append(sample)
   stamp(rec)
   print("SYNTH_PASS",s["id"],"duration",round(duration,2),"rtf",round(sec/duration,2),flush=True)
  rec["status"]="TECHNICAL_PASS_LISTENING_PENDING"
  stamp(rec)
 except BaseException as e:
  rec["status"]="FAILED"
  rec["error"]=f"{type(e).__name__}: {e}"
  rec["traceback"]=traceback.format_exc()[-2600:]
  stamp(rec)
  print("ACCEPTANCE_FAILED",rec["error"],flush=True)
  sys.exit(1)
if __name__=="__main__":main()
