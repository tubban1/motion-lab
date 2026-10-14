"""Deterministic, non-rhythmic ORB ONE action foley at exact shot frames.
One sparse mono stem, not a second musical score. No external dependencies.
"""
import math, random, wave, array
from pathlib import Path
R=24000
D=1290/24
N=int(R*D)
rng=random.Random(26011)
audio=array.array("f",[0.0])*N
def add(start,duration,fn,amp=1):
    a=max(0,int(start*R)); length=int(duration*R)
    for i in range(length):
        j=a+i
        if j>=N:break
        t=i/R
        audio[j]+=amp*fn(t,duration)
def env(t,d,attack=.03,release=.14):
    return min(1,t/max(attack,.001),max(0,(d-t))/max(release,.001))
# Precision gimbal: subdued rising/falling servo tone, no percussion.
start=540/24
add(start+.22,2.28,lambda t,d: env(t,d,.24,.33)*(.34*math.sin(2*math.pi*(188*t+20*t*t))+.12*math.sin(2*math.pi*(385*t-14*t*t))),.14)
# Ground roll: low granular texture, shaped by acceleration and deceleration.
start=705/24
def roll(t,d):
    speed=math.sin(math.pi*t/d)**.7
    grain=.20*math.sin(2*math.pi*(42*t+2.1*t*t))+.15*math.sin(2*math.pi*(115*t+4*t*t))
    grit=(rng.random()*2-1)*.14
    return env(t,d,.35,.35)*speed*(grain+grit)
add(start+.16,3.28,roll,.11)
# Tiny contact sounds at roll onset and exit.
for t in (start+.23,start+3.47):
    add(t,.14,lambda x,d: env(x,d,.003,.10)*math.sin(2*math.pi*(105*x-75*x*x)),.065)
# Bounce physical arc based on Blender 72-frame timeline stretched by playbackRate 0.8.
start=885/24
add(start+(12-1)/(24*.8),.34,lambda t,d: env(t,d,.07,.13)*math.sin(2*math.pi*(210*t+600*t*t)),.095) # takeoff
add(start+(58-1)/(24*.8),.32,lambda t,d: env(t,d,.002,.23)*(math.sin(2*math.pi*(89*t-70*t*t))+.18*(rng.random()*2-1)),.19) # impact
add(start+(64-1)/(24*.8),.16,lambda t,d: env(t,d,.003,.11)*math.sin(2*math.pi*125*t),.055) # settling
# Brief spatial scan and target found confirmations (non-melodic, no repeating beat).
add(975/24+.6,.63,lambda t,d: env(t,d,.07,.19)*math.sin(2*math.pi*(650*t+290*t*t)),.065)
add(1065/24+.55,.44,lambda t,d: env(t,d,.025,.18)*math.sin(2*math.pi*(930*t-250*t*t)),.085)
# Fade, soft clip guard, normalize peak to -15.5 dBFS (music is dominant).
peak=max(abs(v) for v in audio)
gain=(10**(-15.5/20))/max(peak,1e-6)
pcm=array.array("h",(int(max(-1,min(1,v*gain))*32767) for v in audio))
out=Path(__file__).resolve().parents[3]/"public/orb-one-directors-cut/audio/action-foley.wav"
out.parent.mkdir(parents=True,exist_ok=True)
with wave.open(str(out),"wb") as f:
    f.setnchannels(1);f.setsampwidth(2);f.setframerate(R);f.writeframes(pcm.tobytes())
print("ACTION_FOLEY_READY",out,"duration",D,"peak_before",round(peak,4),"gain",round(gain,4))
