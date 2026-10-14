#!/usr/bin/env python3
"""Decide whether Motion Lab creates imagery or finishes source footage. No API calls."""
import argparse, json
from pathlib import Path

KINDS=("motion_graphics","product_cgi","education","stylized_story","human_drama","mixed")
TARGETS=("graphic","stylized_cgi","product_cgi","photoreal_live_action")
PERFORMANCES=("none","incidental","central")
FOOTAGE=("none","planned","licensed_available")
ROUTES=("motion_lab_native","footage_first","hybrid")

def blank_route():
    return dict(version=1,content_kind="undecided",visual_target="undecided",
                human_performance="undecided",existing_footage="undecided",route="undecided",
                rationale="",external_service=None,external_generation_authorized=False,
                audio_engine="edge",audio_fallback_reason=None)

def recommend_route(content_kind,visual_target,human_performance,existing_footage):
    if (content_kind not in KINDS or visual_target not in TARGETS
        or human_performance not in PERFORMANCES or existing_footage not in FOOTAGE):
        raise ValueError("Invalid production brief values")
    if visual_target=="photoreal_live_action":
        return "hybrid" if existing_footage=="licensed_available" else "footage_first"
    if content_kind=="mixed" and existing_footage=="licensed_available":
        return "hybrid"
    return "motion_lab_native"

REASONS={
 "motion_lab_native":"程序化图形、可验证几何、数据动画或风格化动画为主体；Motion Lab 原生制作。",
 "footage_first":"人物表演/摄影级真实镜头是关键；先获取授权实拍或生成视频，Motion Lab 后期合成。",
 "hybrid":"已有授权实拍/生成镜头；Motion Lab 负责精确字幕、音轨、合成与图形/3D补充。"}

def decide(kind,target,acting,footage):
    route=recommend_route(kind,target,acting,footage)
    return route,REASONS[route]

def check(data):
    errors=[]
    for key,allowed in (("content_kind",KINDS),("visual_target",TARGETS),("human_performance",PERFORMANCES),("existing_footage",FOOTAGE)):
        if data.get(key) not in allowed:errors.append(f"{key} 未配置")
    if data.get("route") not in ROUTES:errors.append("route 未确定")
    if not str(data.get("rationale","")).strip():errors.append("缺少路线原因 rationale")
    if errors:return errors
    expected=recommend_route(data["content_kind"],data["visual_target"],data["human_performance"],data["existing_footage"])
    if data["route"]!=expected:errors.append(f"route={data['route']} 与实际适用路线 {expected} 不符")
    if data.get("audio_engine") not in ("edge","offline","recorded"):errors.append("配音模式需记录为 edge/offline/recorded")
    if data.get("audio_engine")=="offline" and not data.get("audio_fallback_reason"):errors.append("offline 必须记录离线要求或回退原因")
    if not isinstance(data.get("external_generation_authorized"),bool):errors.append("付费/外部生成授权必须为布尔值")
    return errors

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("project",type=Path)
    p.add_argument("--content-kind",choices=KINDS)
    p.add_argument("--visual-target",choices=TARGETS)
    p.add_argument("--human-performance",choices=PERFORMANCES)
    p.add_argument("--existing-footage",choices=FOOTAGE)
    p.add_argument("--save",action="store_true")
    p.add_argument("--check",action="store_true")
    a=p.parse_args()
    path=a.project/"production-route.json"
    if not a.project.is_dir():p.error("project directory does not exist")
    if a.check:
        if not path.is_file():p.error("production-route.json missing")
        data=json.loads(path.read_text(encoding="utf8"))
    else:
        if not all((a.content_kind,a.visual_target,a.human_performance,a.existing_footage)):
            p.error("Provide all four production brief flags")
        data=blank_route()
        data.update(content_kind=a.content_kind,visual_target=a.visual_target,human_performance=a.human_performance,existing_footage=a.existing_footage)
        data["route"],data["rationale"]=decide(a.content_kind,a.visual_target,a.human_performance,a.existing_footage)
        if a.save:
            if path.is_file():
                old=json.loads(path.read_text(encoding="utf8"))
                for key in ("external_generation_authorized","audio_engine","audio_fallback_reason","external_service"):
                    if key in old:data[key]=old[key]
            path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
    errors=check(data)
    print(json.dumps({"route":data.get("route"),"reason":data.get("rationale"),"errors":errors},ensure_ascii=False,indent=2))
    if errors:raise SystemExit(1)

if __name__=="__main__":main()
