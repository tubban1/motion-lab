from pathlib import Path
import hashlib,json,shutil
base=Path(r"C:\Users\i95i\mcp-workspace\motion-lab")
project=base/"projects/hongkong-wind-lyrics-20261031"
render=base/"renders/hongkong-wind-lyrics-20261031"
dest=Path.home()/"Downloads"
dest.mkdir(exist_ok=True,parents=True)
imgs=json.loads((project/"assets-source.json").read_text(encoding="utf8"))
used={'hongkong1990.jpg','hongkong1993a.jpg','hongkong1993b.jpg','aber1980.jpg','faye.jpg','street1993.jpg','hktram.jpg','construction1990.jpg','kaitak1980.jpg'}
lines=[
"《Hong Kong × 季候风》歌词解读视频 — 素材来源及使用说明",
"",
"影片中使用的照片来自 Wikimedia Commons，主要以现代动画和视差运动作为背景。",
"原照片可能拥有不同版权，请阅读相应来源页面，以满足摄影作者署名和 CC BY-SA 改编义务。",
"部分人物肖像年代与1993年不同，不应作为当年原始影像的事实证据。",
"",
"片中英文、粤语和中文均为合成声音朗读/讲述，不是 The Weeknd 或王菲演唱录音。",
"未使用未获授权的歌曲母带、演唱会录音或原版MV。",
"",
"已经进入成片的图片（摄影作者与许可按原始来源页面标注）："
]
for x in imgs:
 if x.get('local') not in used:continue
 lines.extend(["",x.get("title",""),"作者："+str(x.get("artist","见源网页")),
"许可："+str(x.get("license","未标注")),
"原始来源："+str(x.get("source","")),
"本片改动：颜色调整、比例裁切、镜头推移与图层动画"])
lines.extend(["",
"作品背景报道（不代表歌词文本全部已得到歌手确认）：",
"https://www.bandwagon.asia/articles/the-weeknd-samples-faye-wong-classic-debuts-new-song-hong-kong-at-kai-tak-stadium",
"https://www.thefader.com/2026/10/27/the-weeknd-hong-kong-faye-wong-sample",
"",
"引用英文歌词来自现场听写版本，存在转录差异；如正式发行，应以发行版核对。"])
(project/"credits.txt").write_text("\n".join(lines),encoding="utf-8")
preview=render/"hongkong-wind-lyrics-windows-v1.mp4"
if not preview.is_file():raise RuntimeError("No preview")
target=dest/"HongKong-季候风-歌词解析-Windows-预览版-540x960.mp4"
shutil.copy2(preview,target)
print("PREVIEW_DELIVERED",target, "size",target.stat().st_size,"sha256",hashlib.sha256(target.read_bytes()).hexdigest(),flush=True)
shutil.copy2(project/"credits.txt",dest/"HongKong-季候风-影像素材与授权说明.txt")
print("CREDITS_READY",len(used),flush=True)
