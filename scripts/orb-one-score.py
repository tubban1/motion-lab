import math,wave,random,os,array
random.seed(4); rate=24000; duration=48
beats=[i*.625 for i in range(77)]; scenes=[0,6,11,16,21,26,31,36,41]
out=[]
for i in range(rate*duration):
 t=i/rate
 chord=(math.sin(2*math.pi*110*t)+.45*math.sin(2*math.pi*164.81*t)+.34*math.sin(2*math.pi*220*t))/1.8
 kick=sum(.23*math.exp(-(t-b)*23)*math.sin(2*math.pi*(62-25*(t-b))*(t-b)) for b in beats if 0<=t-b<.22)
 impact=sum(.19*math.exp(-(t-s)*9)*math.sin(2*math.pi*(52-15*(t-s))*(t-s)) for s in scenes if 0<=t-s<.65)
 hiss=sum(.032*math.exp(-(t-b-.3125)*75)*random.uniform(-1,1) for b in beats if 0<=t-b-.3125<.06)
 fade=max(0,min(1,t/2,(duration-t)/2))
 v=(.055*chord+kick*(.25 if t<11 else 1)+impact+hiss)*fade
 out.append(int(max(-1,min(1,v))*32767))
os.makedirs('public/audio/orb-one',exist_ok=True)
with wave.open('public/audio/orb-one/score.wav','wb') as wav:
 wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(rate);wav.writeframes(array.array('h',out).tobytes())
print('audio ready')
