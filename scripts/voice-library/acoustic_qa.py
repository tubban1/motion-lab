#!/usr/bin/env python3
"""Objective acoustic sanity checks; not a replacement for listening or ASR."""
import argparse, json, math, wave
from pathlib import Path
import numpy as np

ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/"projects/voice-library/acceptance/qwen3-0.6b"
def check_wav(path):
    with wave.open(str(path),"rb") as w:
        if w.getsampwidth()!=2 or w.getnchannels()!=1: raise ValueError("Expected mono 16-bit PCM")
        sr=w.getframerate()
        signal=np.frombuffer(w.readframes(w.getnframes()),dtype="<i2").astype(np.float32)/32768.0
    window=max(1,round(sr*0.02))
    complete=len(signal)//window
    if complete==0:raise ValueError("WAV too short")
    frames=signal[:complete*window].reshape(complete,window)
    rms=np.sqrt(np.mean(np.square(frames),axis=1))
    peak=float(np.max(np.abs(signal)))
    threshold=max(0.0032,0.1*float(np.percentile(rms,90)))
    active=rms>=threshold
    positions=np.flatnonzero(active)
    lead=float(positions[0]*window/sr) if len(positions) else len(signal)/sr
    tail=float((complete-1-positions[-1])*window/sr) if len(positions) else len(signal)/sr
    gaps=[];start=None
    for i,valid in enumerate(active):
        if not valid and start is None: start=i
        if valid and start is not None:
            seconds=(i-start)*window/sr
            if seconds>=.35 and start>0:gaps.append(round(seconds,3))
            start=None
    flags=[]
    if lead>.7:flags.append("long_leading_silence")
    if tail>1.3:flags.append("long_trailing_silence")
    if float(np.mean(active))<.28:flags.append("low_active_speech_fraction")
    if peak>=.999:flags.append("clipping")
    return {"file":path.name,"durationSeconds":round(len(signal)/sr,3),"sampleRate":sr,
        "peakDbFS":round(20*math.log10(max(peak,1e-12)),2),
        "overallRmsDbFS":round(20*math.log10(max(float(np.sqrt(np.mean(signal**2))),1e-12)),2),
        "activeFraction":round(float(np.mean(active)),3),"leadingSilenceSeconds":round(lead,3),
        "trailingSilenceSeconds":round(tail,3),"internalPausesSeconds":gaps,
        "flags":flags}
def main():
    report=json.loads((BASE/"acceptance.json").read_text(encoding="utf8"))
    result={"disclaimer":"Signal diagnostics only; subjective voice quality and transcription accuracy not validated",
      "model":report["model"],"samples":[]}
    for s in report["samples"]:
        path=BASE/(s["id"]+".wav")
        d=check_wav(path);d["sampleId"]=s["id"];result["samples"].append(d)
    router=ROOT/"public/voice-qa/audio/router-qwen-smoke.wav"
    if router.is_file():
        d=check_wav(router);d["sampleId"]="router-qwen-smoke";result["samples"].append(d)
    output=BASE/"acoustic-qa.json"
    output.write_text(json.dumps(result,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
    for s in result["samples"]:
        print(s["sampleId"],"active",s["activeFraction"],"lead",s["leadingSilenceSeconds"],
              "tail",s["trailingSilenceSeconds"],"pauses",s["internalPausesSeconds"],
              "flags",s["flags"],flush=True)
    print("SAVED",output,flush=True)
if __name__=="__main__":main()
