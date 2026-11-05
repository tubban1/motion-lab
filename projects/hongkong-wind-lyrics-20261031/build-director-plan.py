#!/usr/bin/env python3
"""Create a reproducible shot-first director edit using the already-recorded V1 audio."""
import json
from pathlib import Path
P=Path(__file__).resolve().parent
t=json.loads((P/'timeline.json').read_text(encoding='utf8'))
beats=t['segments']
J={'03','07','10','16'}
L={'05','09','14','18'}
visual_starts=[]
for i,b in enumerate(beats):
 if b['id'] in J:at=b['startFrame']+10
 elif b['id'] in L:
  old=beats[i-1]
  at=old['startFrame']+old['voiceFrames']-10
 else:at=b['startFrame']
 visual_starts.append(at)
assert all(visual_starts[i]>visual_starts[i-1] for i in range(1,len(visual_starts)))
frames=t['totalFrames']
sources={
 'opening':'city','air':'two-lovers','stay':'one-leaves','separate':'two-lovers',
 'night':'two-lovers','wind':'seasonal-wind','empty':'loneliness','weather':'seasonal-wind',
 'waiting':'loneliness','city':'city','ending':'memories'
}
locations={
 'opening':'street','air':'street','stay':'street','separate':'street',
 'night':'street','wind':'harbour','empty':'harbour','weather':'harbour',
 'waiting':'harbour','city':'street','ending':'harbour'
}
images={'opening':'hongkong1990.jpg','air':'hongkong1993a.jpg','stay':'hongkong1990.jpg','separate':'hongkong1993b.jpg','night':'aber1980.jpg','wind':'faye.jpg','empty':'street1993.jpg','weather':'hktram.jpg','waiting':'kaitak1980.jpg','city':'construction1990.jpg','ending':'hongkong1990.jpg'}
moves=['push','truck-right','locked','pan-left','pull','truck-left','tilt-up','pan-right']
sizes=['wide','medium','close-up','insert','medium','wide','close-up','medium']
shoot=[]
def add(b,start,end,part,lastBeat=False):
 if end<=start:return
 index=len(shoot)
 source=b['scene']; subject=sources[source]
 if part==0 and b['role']!='narrator': size='close-up'
 else:size=sizes[index%len(sizes)]
 move=moves[index%len(moves)]
 if part==1:move='pull' if index%3 else 'pan-left'
 # A picture remains a 2D still even when camera moves: do not claim true 3D.
 change_beat=(part==0)
 if index==0:kind='cut';n=0
 elif not change_beat:kind='match-cut' if index%7==0 else 'cut';n=0
 elif b['id'] in {'10','18'}:kind='dissolve';n=15
 elif b['id'] in {'09'}:kind='dip-to-black';n=12
 elif b['id'] in {'12'}:kind='wipe-left';n=12
 elif b['id'] in {'03','07','16'}:kind='cut';n=0
 else:kind='match-cut' if index%9==0 else 'cut';n=0
 bridge='j-cut' if change_beat and b['id'] in J else 'l-cut' if change_beat and b['id'] in L else 'none'
 visual='photo-only' if part==1 or (b['role']=='narrator' and index%3==0) else 'layered'
 shoot.append({
 'id':'s'+str(index+1).zfill(3),'beatId':b['id'],'sceneId':source,
 'subjectId':subject,'purpose':('读出原文，让歌词说话' if b['role']!='narrator' else
 ('从人物情绪转向环境记忆' if part else '建立叙事关系')),
 'startFrame':start,'endFrame':end,'size':size,
 'camera':{'move':move,'amount':.38 if b['role']!='narrator' else .62,
           'focalLengthMm':35 if size in ['wide','medium'] else 55,
           'focus':{'x':.5 if index%2 else .42,'y':.5}},
 'visualVariant':visual,'assetId':'hongkong-wind-lyrics-20261031/'+images[source],
 'transitionIn':{'kind':kind,'frames':n,'reason': '以歌词前置听觉构造J-cut' if bridge=='j-cut'
 else '让上一句声音延续进入新画面' if bridge=='l-cut'
 else '保留记忆与城市的情绪衔接' if kind in ['dissolve','dip-to-black'] else
 '让主体位置或动作形成剪辑逻辑' if kind=='match-cut' else '明确推进景别与信息'},
 'audioBridgeIn':{'kind':bridge,'reason': '声音不被画面硬切截断' if bridge!='none' else '本镜头无需跨界声音'},
 'continuity':{'location':locations[source],'axisSide':'A','screenDirection':'right',
               'lightKey':'night-warm','propState':'consistent'}
 })
intro={'id':'s001','beatId':beats[0]['id'],'sceneId':'opening','subjectId':'city','purpose':'片头建立1993—2026',
'startFrame':0,'endFrame':36,'size':'extreme-wide',
'camera':{'move':'push','amount':.3,'focalLengthMm':35,'focus':{'x':.5,'y':.5}},
'visualVariant':'layered','assetId':'hongkong-wind-lyrics-20261031/'+images['opening'],'transitionIn':{'kind':'cut','frames':0,'reason':'开场建立时间坐标'},
'audioBridgeIn':{'kind':'none','reason':'片头留白'},
'continuity':{'location':'street','axisSide':'A','screenDirection':'right','lightKey':'night-warm','propState':'consistent'}}
shoot.append(intro)
for i,b in enumerate(beats):
 start=visual_starts[i]
 end=visual_starts[i+1] if i+1<len(beats) else frames
 if i==0:start=36
 span=end-start
 # Narration shots get a meaningful change of scale around the midpoint,
 # not random high-frequency transitions.
 n=2 if b['role']=='narrator' and span>=170 else 1
 if n==2:
  middle=start+int(span*.54)
  add(b,start,middle,0)
  add(b,middle,end,1)
 else:add(b,start,end,0)
for i,s in enumerate(shoot):
 assert s['id']=='s'+str(i+1).zfill(3)
 assert s['startFrame']==(shoot[i-1]['endFrame'] if i else 0)
assert shoot[-1]['endFrame']==frames
audio=[]
for b in beats:
 target=next(s for s in shoot if s['beatId']==b['id'] and s['id']!='s001')
 audio.append({'id':'voice-'+b['id'],'src':b['audio'],'startFrame':b['startFrame'],
               'durationFrames':b['voiceFrames'],'gain':1,'shotId':target['id']})
plan={'version':1,'title':'Hong Kong × 季候风 | Director Edit v2','fps':24,'width':720,'height':1280,
      'totalFrames':frames,'shots':shoot,'audio':audio}
(P/'director-plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
from collections import Counter
print('DIRECTOR_PLAN_CREATED',len(shoot),'shots',len(audio),'audio',frames,'frames')
print('TRANSITIONS',dict(Counter(s['transitionIn']['kind'] for s in shoot)))
print('BRIDGES',dict(Counter(s['audioBridgeIn']['kind'] for s in shoot)))