#!/usr/bin/env python3
"""Offline, opt-in Qwen3 0.6B renderer. Called only by Motion Lab voice_router."""
import argparse, json, os, time
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
HOME=Path(os.environ.get("MOTIONLAB_MODEL_HOME",Path.home()/"AppData/Local/MotionLab"))
os.environ["HF_HOME"]=str(HOME/"hf-cache")
os.environ["HF_HUB_DISABLE_TELEMETRY"]="1"
MODEL="Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice"
SPEAKERS={"Vivian","Serena","Uncle_Fu","Dylan","Eric","Ryan","Aiden","Ono_Anna","Sohee"}
LANGUAGES={"Auto","Chinese","English","Japanese","Korean","German","French","Russian","Portuguese","Spanish","Italian"}

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--text",required=True)
    ap.add_argument("--speaker",choices=sorted(SPEAKERS),required=True)
    ap.add_argument("--language",choices=sorted(LANGUAGES),default="Auto")
    ap.add_argument("--out",type=Path,required=True)
    ap.add_argument("--threads",type=int,default=4)
    args=ap.parse_args()
    if not 1 <= args.threads <= 16:ap.error("threads out of range 1-16")
    if not args.text.strip() or len(args.text)>180:ap.error("One Qwen clip must be 1-180 characters; segment before synthesizing")
    if args.out.suffix.lower()!=".wav":ap.error("Qwen output must be WAV")
    from huggingface_hub import snapshot_download
    import torch,numpy as np,soundfile as sf
    from qwen_tts import Qwen3TTSModel
    folder=snapshot_download(MODEL,local_files_only=True)
    torch.set_num_threads(args.threads)
    torch.set_num_interop_threads(1)
    load_start=time.perf_counter()
    model=Qwen3TTSModel.from_pretrained(folder,device_map="cpu",dtype=torch.float32,attn_implementation="sdpa")
    loaded=time.perf_counter()-load_start
    start=time.perf_counter()
    waves,sr=model.generate_custom_voice(text=args.text,language=args.language,speaker=args.speaker,max_new_tokens=256)
    generated=time.perf_counter()-start
    data=np.asarray(waves[0],dtype=np.float32).reshape(-1)
    if data.size < sr*.25 or not np.isfinite(data).all():raise RuntimeError("Invalid Qwen generated audio")
    args.out.parent.mkdir(parents=True,exist_ok=True)
    temp=args.out.with_suffix(".part.wav")
    sf.write(str(temp),data,sr,subtype="PCM_16")
    temp.replace(args.out)
    dur=data.size/sr
    print(json.dumps({"provider":"qwen-0.6b-cpu","speaker":args.speaker,"language":args.language,
       "durationSeconds":round(dur,3),"generationSeconds":round(generated,3),
       "loadSeconds":round(loaded,3),"rtf":round(generated/dur,3),
       "sampleRate":sr,"peak":round(float(np.max(np.abs(data))),4),
       "clippingFraction":round(float(np.mean(np.abs(data)>=.999)),7),
       "path":str(args.out)},ensure_ascii=False),flush=True)
if __name__=="__main__":main()
