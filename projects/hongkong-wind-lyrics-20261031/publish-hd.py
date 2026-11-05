from pathlib import Path
import json,shutil,hashlib
root=Path(__file__).resolve().parents[2]
proj=root/"projects/hongkong-wind-lyrics-20261031"
qa=json.loads((proj/"qa-hd.json").read_text(encoding="utf8"))
assert qa["status"]=="PASS" and qa["decoded_frames"]==4657 and not qa["black_frame_candidates"] and not qa["single_frame_corruption_candidates"]
src=root/"renders/hongkong-wind-lyrics-20261031/hongkong-wind-lyrics-windows-HD-720x1280.mp4"
dst=Path.home()/"Downloads/HongKong-季候风-歌词解析-高清720x1280.mp4"
shutil.copy2(src,dst)
def digest(p):
 h=hashlib.sha256()
 with p.open("rb") as f:
  for block in iter(lambda:f.read(1024*1024),b""):h.update(block)
 return h.hexdigest()
assert src.stat().st_size==dst.stat().st_size and digest(src)==digest(dst)
shutil.copy2(proj/"captions.srt",Path.home()/"Downloads/HongKong-季候风-歌词解析-字幕.srt")
shutil.copy2(proj/"credits.txt",Path.home()/"Downloads/HongKong-季候风-影像素材与授权说明.txt")
shutil.copy2(proj/"qa-hd.json",Path.home()/"Downloads/HongKong-季候风-HD-验收报告.json")
print("HD_RELEASE_DONE",str(dst),flush=True)
print("bytes",dst.stat().st_size,"sha256",digest(dst),flush=True)
