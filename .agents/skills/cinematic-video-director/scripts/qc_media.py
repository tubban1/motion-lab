#!/usr/bin/env python3
"""FFprobe/FFmpeg technical QC and visual contact sheet. Manual director review remains required."""
import argparse,json,subprocess,sys
from datetime import datetime,timezone
from fractions import Fraction
from pathlib import Path

def run(argv,timeout=120):
    return subprocess.run([str(x) for x in argv],text=True,capture_output=True,timeout=timeout)

def inspect_media(video,expected_fps=24,width=1920,height=1080,duration=None,allow_silent=False,quick=False,output=None):
    video=Path(video).expanduser().resolve()
    if not video.is_file():raise FileNotFoundError(video)
    output=Path(output).resolve() if output else video.parent/"qc"/video.stem
    output.mkdir(parents=True,exist_ok=True)
    result=run(["ffprobe","-v","error","-show_streams","-show_format","-of","json",video])
    if result.returncode:raise RuntimeError("ffprobe: "+result.stderr[-2000:])
    info=json.loads(result.stdout)
    streams=info.get("streams",[])
    v=next((s for s in streams if s.get("codec_type")=="video"),None)
    a=next((s for s in streams if s.get("codec_type")=="audio"),None)
    errors=[];warnings=[]
    fps=float(Fraction(v.get("avg_frame_rate","0/1"))) if v else 0
    dimensions=[v.get("width"),v.get("height")] if v else [None,None]
    length=float(info.get("format",{}).get("duration") or 0)
    if not v:errors.append("缺少视频流")
    if v and dimensions!=[width,height]:errors.append(f"分辨率 {dimensions}，预期 {[width,height]}")
    if v and abs(fps-expected_fps)>.01:errors.append(f"帧率 {fps}，预期 {expected_fps}")
    if duration is not None and abs(length-duration)>max(.12,2/expected_fps):
        errors.append(f"片长 {length:.3f}s，预期 {duration:.3f}s")
    if not a and not allow_silent:errors.append("缺少音频流（如确为无声片，可传 --allow-silent）")
    if a and a.get("codec_name")!="aac":warnings.append("音频不是 AAC；检查发布兼容性")
    if v and v.get("codec_name")!="h264":warnings.append("视频不是 H.264；检查发布兼容性")
    if video.stat().st_size<10000:errors.append("文件体积异常小")
    sheet=output/"contact-sheet.jpg"
    interval=max(.5,length/12)
    contact=run(["ffmpeg","-hide_banner","-loglevel","error","-y","-i",video,
                 "-vf",f"fps=1/{interval:.6f},scale=320:180:force_original_aspect_ratio=decrease,"
                       "pad=320:180:(ow-iw)/2:(oh-ih)/2,tile=4x3",
                 "-frames:v","1",sheet],timeout=180)
    if contact.returncode or not sheet.is_file():
        errors.append("联系表生成失败: "+contact.stderr[-500:])
    if quick:warnings.append("快速 QC：未进行完整媒体解码")
    else:
        decoded=run(["ffmpeg","-hide_banner","-v","error","-i",video,"-f","null","-"],timeout=300)
        if decoded.returncode:errors.append("完整解码失败: "+decoded.stderr[-500:])
    report={
      "file":str(video),"timestamp_utc":datetime.now(timezone.utc).isoformat(),
      "technical_status":"PASS" if not errors else "FAIL",
      "duration_seconds":length,"fps":fps,"width":dimensions[0],"height":dimensions[1],
      "video_codec":v.get("codec_name") if v else None,
      "audio_codec":a.get("codec_name") if a else None,
      "size_bytes":video.stat().st_size,
      "contact_sheet":str(sheet) if sheet.is_file() else None,
      "errors":errors,"warnings":warnings,
      "manual_director_review":"REQUIRED",
      "limitation":"码流和关键帧抽样不能代替整片镜头、物理真实性、音画同步与素材许可人工验收。"
    }
    (output/"qc-report.json").write_text(json.dumps(report,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
    return report

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("video")
    p.add_argument("--fps",type=float,default=24);p.add_argument("--width",type=int,default=1920)
    p.add_argument("--height",type=int,default=1080);p.add_argument("--duration",type=float)
    p.add_argument("--allow-silent",action="store_true");p.add_argument("--quick",action="store_true")
    p.add_argument("--output")
    args=p.parse_args()
    try:r=inspect_media(args.video,args.fps,args.width,args.height,args.duration,args.allow_silent,args.quick,args.output)
    except (OSError,ValueError,RuntimeError,subprocess.TimeoutExpired) as e:
        print("QC ERROR:",e);return 2
    print(json.dumps({k:r[k] for k in ("technical_status","duration_seconds","fps","width","height",
       "video_codec","audio_codec","contact_sheet","errors","warnings")},indent=2,ensure_ascii=False))
    print("注意：还必须亲自进行导演级视觉/声音验收。")
    return 0 if r["technical_status"]=="PASS" else 1

if __name__=="__main__":sys.exit(main())
