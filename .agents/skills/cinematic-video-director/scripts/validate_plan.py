#!/usr/bin/env python3
"""Validate shot continuity and evidence claims before a final render."""
import argparse,json,sys
from pathlib import Path
from route_project import check as check_production_route

KINDS={"live_action","generated_video","full_3d_motion","3d_still","ui_motion","intertitle"}
FINAL_STATUSES={"approved","produced"}
PLACEHOLDERS=("待设计","待定","TODO","TBD")

def validate(path,mode="draft"):
    p=Path(path)
    obj=json.loads(p.read_text(encoding="utf8"))
    errors=[]
    fps=obj.get("fps"); total=obj.get("total_frames")
    if not isinstance(fps,int) or fps<=0:errors.append("fps 必须是正整数")
    if not isinstance(total,int) or total<=0:errors.append("total_frames 必须是正整数")
    shots=obj.get("shots")
    if not isinstance(shots,list) or not shots:
        return ["缺少 shots"]
    if mode=="final":
        route_path=p.parent/"production-route.json"
        if not route_path.is_file():
            errors.append("缺少 production-route.json：正式制作必须先判定素材生成路线")
        else:
            try:
                data=json.loads(route_path.read_text(encoding="utf8"))
                errors.extend("production-route: "+msg for msg in check_production_route(data))
            except (OSError, ValueError, TypeError, json.JSONDecodeError) as e:
                errors.append(f"production-route.json 无法解析: {e}")
    cursor=0
    ids=set()
    manifestpath=p.parent/"assets-manifest.json"
    if manifestpath.is_file():
        rawassets=json.loads(manifestpath.read_text(encoding="utf8")).get("assets",[])
        assets={a.get("id"):a for a in rawassets if isinstance(a,dict)}
    else:
        assets={}
        if mode=="final":errors.append("缺失 assets-manifest.json")
    for i,s in enumerate(shots):
        mark=f"镜头{i+1} ({s.get('id','无ID')})"
        key=s.get("id")
        if not isinstance(key,str) or key in ids:errors.append(f"{mark}: ID 空或重复")
        ids.add(key)
        a,b=s.get("start_frame"),s.get("end_frame")
        if not isinstance(a,int) or not isinstance(b,int):
            errors.append(f"{mark}: 帧边界必须是整数")
            continue
        if a!=cursor:errors.append(f"{mark}: 与上一镜有重叠或空洞；期望起点 {cursor}，实际 {a}")
        if b<=a:errors.append(f"{mark}: end_frame 必须大于 start_frame")
        cursor=b
        kind=s.get("source_kind")
        if kind not in KINDS:errors.append(f"{mark}: source_kind 只能是 {sorted(KINDS)}")
        if s.get("motion_required") and kind!="full_3d_motion":
            errors.append(f"{mark}: 需要连续3D运动但 source_kind={kind}，不能用静帧推拉替代")
        if s.get("claim_status") not in ("concept","simulated","real","not_applicable"):
            errors.append(f"{mark}: claim_status 需要明确区分真实/模拟/概念")
        if mode=="final":
            if s.get("status") not in FINAL_STATUSES:
                errors.append(f"{mark}: status 必须为 produced 或 approved")
            for k in ("intent","camera","blocking","lighting","audio","visual_evidence"):
                value=s.get(k)
                if not isinstance(value,str) or not value.strip() or any(t in value for t in PLACEHOLDERS):
                    errors.append(f"{mark}: {k} 仍是占位符")
            related=s.get("asset_ids",[])
            if not isinstance(related,list):errors.append(f"{mark}: asset_ids 必须是列表");related=[]
            if kind in ("live_action","generated_video","3d_still") and not related:
                errors.append(f"{mark}: {kind} 缺少素材 asset_ids")
            for asset_id in related:
                item=assets.get(asset_id)
                if not item:errors.append(f"{mark}: 找不到 asset '{asset_id}'");continue
                for field in ("relative_path","source_url","author","license_url","permission"):
                    if not item.get(field):
                        errors.append(f"{mark}: asset '{asset_id}' 缺少 {field}（原创文件可用 original/local 说明）")
                rel=item.get("relative_path")
                if rel:
                    assetpath=Path(rel)
                    if assetpath.is_absolute() or ".." in assetpath.parts:
                        errors.append(f"{mark}: 相对素材路径不安全：{rel}")
    if isinstance(total,int) and cursor!=total:
        errors.append(f"片尾帧 {cursor} 不等于 total_frames {total}")
    if mode=="final" and not obj.get("bpm_verified_for_music") and not obj.get("independent_beat_grid"):
        errors.append("必须核对配乐 BPM/相位，或明确 independent_beat_grid 并说明独立自制鼓点")
    return errors

if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("shotlist",type=Path);p.add_argument("--mode",choices=["draft","final"],default="draft")
    args=p.parse_args()
    try:problems=validate(args.shotlist,args.mode)
    except (OSError,ValueError,json.JSONDecodeError) as e:
        print("ERROR: 无法解析分镜:",str(e));sys.exit(2)
    if problems:
        for issue in problems:print("FAIL:",issue)
        sys.exit(1)
    print(f"PASS: {args.shotlist}（{args.mode} 连续分镜与声明检查）")
