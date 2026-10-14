import math,wave,array,random,bisect,pathlib
random.seed(18)
OUT=pathlib.Path(__file__).resolve().parents[3]/"public/orb-one-directors-cut/audio/foley-96bpm.wav"
RATE=22050;D=53.75;BEAT=.625;START=16.25
CUTS=[0,4.375,8.75,13.125,16.25,22.5,25.625,29.375,33.125,36.875,40.625,44.375,48.75]
pcm=array.array("h")
for i in range(int(RATE*D)):
 t=i/RATE;v=0
 if t<START:
  v+=.009*math.sin(2*math.pi*82.41*t)
  p=t%2.5
  if p<1.9:v+=.014*math.exp(-2.5*p)*math.sin(2*math.pi*329.63*p)
 else:
  p=(t-START)%BEAT;b=int((t-START)/BEAT)
  v+=.016*(math.sin(2*math.pi*55*t)+.4*math.sin(2*math.pi*82.4*t))
  if p<.22:v+=.24*math.exp(-25*p)*math.sin(2*math.pi*(64-24*p)*p)
  if b%4==2 and p<.13:v+=.045*math.exp(-23*p)*random.uniform(-1,1)
  q=(t-START)%(BEAT/2)
  if q<.03:v+=.023*math.exp(-70*q)*random.uniform(-1,1)
  if 36.875<t<40.625:
   j=t-36.875
   if .35<j<1.35:v+=.04*math.sin(2*math.pi*(250+380*j)*j)*(1.35-j)
   if 2.2<j<2.8:v+=.075*math.exp(-18*(j-2.2))*math.sin(2*math.pi*84*(j-2.2))
  if 44.375<t<45.9:
   j=t-44.375;v+=.07*math.exp(-3*j)*math.sin(2*math.pi*880*j)
 idx=bisect.bisect_right(CUTS,t)-1
 if idx>=2:
  q=t-CUTS[idx]
  if q<.5:v+=.14*math.exp(-17*q)*math.sin(2*math.pi*(65-15*q)*q)
 v*=max(0,min(1,t/2,(D-t)/1.7))
 pcm.append(int(max(-1,min(1,v))*32767))
OUT.parent.mkdir(parents=True,exist_ok=True)
with wave.open(str(OUT),"wb") as f:
 f.setnchannels(1);f.setsampwidth(2);f.setframerate(RATE);f.writeframes(pcm.tobytes())
print("DIRECTOR_FOLEY_OK",len(pcm),OUT)
