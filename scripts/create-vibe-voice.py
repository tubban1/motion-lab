import subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[1]
out=root/'public/vibe-monitor-directors-launch/audio'
out.mkdir(parents=True,exist_ok=True)
texts=[
'AI 写代码，快得惊人。',
'可功能一层层堆上去，依赖也越来越乱。',
'直到有一天，你连改一行代码，都开始犹豫。',
'Vibe Monitor。让隐藏的架构风险，变得清晰可见。',
'结构。耦合。演化。何时该重构，下一步怎么做，一目了然。',
'源码留在本地。上传的是按政策收集、可检查的去标识化遥测。',
'轻量本地规则分析，通常不需要额外大模型检测请求。尽可能节省 Token。',
'一行命令安装，接入你的编程 Agent。免费内测邀请码，开放申请。',
'更多 Agent 和系统支持，正在路上。Beta 之后，我们计划全面开源。'
]
for i,txt in enumerate(texts,1):
 a=out/f'.voice-{i:02}.aiff'
 b=out/f'voice-{i:02}.wav'
 subprocess.run(['say','-v','Reed (中文（中国大陆）)','-r','194','-o',str(a),txt],check=True)
 subprocess.run(['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y','-i',str(a),'-ar','48000','-ac','2','-af','highpass=f=70,lowpass=f=10000,acompressor=threshold=0.16:ratio=2.2:attack=8:release=120',str(b)],check=True)
 a.unlink(missing_ok=True)
 p=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(b)],capture_output=True,text=True)
 print('VOICE',i,p.stdout.strip(),flush=True)
