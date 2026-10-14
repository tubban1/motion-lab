#!/usr/bin/env python3
"""Create a reusable director's brief, shotlist and asset manifest. Never overwrite."""
import argparse, json, re
from pathlib import Path
from route_project import blank_route

ROOT=Path(__file__).resolve().parents[4]
ROLES=[
 ("hook","生活里的情绪入口","live_action"),
 ("conflict","观众面对什么问题","live_action"),
 ("suspense","留白并创造悬念","ui_motion"),
 ("reveal","产品惊喜揭晓","full_3d_motion"),
 ("proof","真实环境下展示能力","full_3d_motion"),
 ("finale","情绪兑现与品牌收尾","full_3d_motion")
]
STORY_ROLES=[
 ("establish","建立人物、时代与原著世界","live_action"),
 ("desire","人物愿望及诱因","live_action"),
 ("turn","出现反常事件或冲突转折","live_action"),
 ("wonder","奇观/人物选择与代价","live_action"),
 ("climax","高潮动作及因果证据","live_action"),
 ("resolution","原著结局和主题余韵","live_action")
]
EDUCATION_ROLES=[
 ("hook","提出可观察的学习问题","ui_motion"),
 ("concept","解释关键概念与变量","ui_motion"),
 ("model","建立关系、几何或数据模型","ui_motion"),
 ("demonstrate","展示因果、计算或实验过程","ui_motion"),
 ("compare","对比正确与错误理解","ui_motion"),
 ("recap","总结可验证的知识要点","ui_motion")
]
GENRE_ROLES={"product":ROLES,"story":STORY_ROLES,"education":EDUCATION_ROLES}
CUTS=[0,.12,.26,.38,.55,.84,1]

def create(slug,title,duration=48,fps=24,bpm=96,root=ROOT,genre="product"):
    if not re.fullmatch(r"[a-z][a-z0-9]*(?:-[a-z0-9]+)*",slug):
        raise ValueError("slug 须是小写英文字母/数字/连字符")
    if not title.strip() or duration<15 or fps<12 or not 40<=bpm<=220:
        raise ValueError("标题不能为空；duration>=15、fps>=12、40<=bpm<=220")
    if genre not in GENRE_ROLES:
        raise ValueError("genre 须为 product / story / education")
    project=root/"projects"/slug
    media=root/"public"/slug
    if project.exists() or media.exists():
        raise FileExistsError(f"项目已存在，拒绝覆盖：{slug}")
    total=round(fps*duration)
    frames_per_beat=fps*60/bpm
    boundary=[0]
    for portion in CUTS[1:-1]:
        cut=round(round(total*portion/frames_per_beat)*frames_per_beat)
        boundary.append(max(boundary[-1]+1,min(total-1,cut)))
    boundary.append(total)
    if len(set(boundary))!=len(boundary):raise ValueError("时长不足以分配镜头")
    project.mkdir(parents=True)
    for folder in ("footage","3d","audio"):
        (media/folder).mkdir(parents=True,exist_ok=True)
    shots=[]
    for i,(role,purpose,kind) in enumerate(GENRE_ROLES[genre]):
        shots.append({"id":f"shot-{i+1:02d}","role":role,
         "start_frame":boundary[i],"end_frame":boundary[i+1],
         "source_kind":kind,"status":"planned","intent":purpose,
         "camera":"待设计：景别/焦距/机位/运动","blocking":"待设计：演员或产品动作",
         "lighting":"待设计：光源、接触阴影与透视","audio":"待设计：音轨与切点",
         "visual_evidence":"待设计：画面怎样证明功能或故事",
         "claim_status":"concept","motion_required":kind=="full_3d_motion","asset_ids":[]})
    plan={"version":1,"slug":slug,"title":title,"genre":genre,"fps":fps,"duration_seconds":duration,
          "total_frames":total,"bpm_reference":bpm,"bpm_verified_for_music":False,"shots":shots}
    (project/"shotlist.json").write_text(json.dumps(plan,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
    manifest={"version":1,"project":slug,"assets":[],
              "guidance":"每个外部文件登记 id、relative_path、source_url、author、license_url、permission、retrieved_at"}
    (project/"assets-manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
    (project/"production-route.json").write_text(
        json.dumps(blank_route(),ensure_ascii=False,indent=2)+"\n",encoding="utf8")
    (project/"brief.md").write_text(
        f"# {title}\n\n项目：{slug} | {duration}s | {fps}fps | 参考 {bpm} BPM（不是音乐实测 BPM）。\n\n"
        "## 受众/故事或知识目标\n- 观众：待定\n- 核心叙事冲突或学习问题：待定\n- 原著/产品证据/知识依据：待定\n"
        "- 视觉路线：production-route.json 待确认\n- 人物摄影/精确CG/图形证明镜头：待定\n\n"
        "## 制片\n- 画幅/平台/语言：待定\n- 摄影/灯光/材质风格：待定\n"
        "- 素材来源和许可：待定\n- 音轨、配音、节拍：待定\n",encoding="utf8")
    (project/"qc-notes.md").write_text(
        "# QC\n\n- [ ] 脚本/授权/真实产品状态\n- [ ] 关键帧视觉审核\n"
        "- [ ] 实际连续运动与接触/遮挡\n- [ ] 混音和镜头切点\n"
        "- [ ] 类型检查/整片渲染/媒体探测\n- [ ] 导演最终看片\n",encoding="utf8")
    return project

if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--slug",required=True);p.add_argument("--title",required=True)
    p.add_argument("--duration",type=float,default=48);p.add_argument("--fps",type=int,default=24)
    p.add_argument("--bpm",type=float,default=96)
    p.add_argument("--genre",choices=tuple(GENRE_ROLES),default="product",help="Product, narrative story or educational explainer storyboard")
    a=p.parse_args()
    project=create(a.slug,a.title,a.duration,a.fps,a.bpm,genre=a.genre)
    print("已创建导演项目模板：",project)
    print("下一步：完善分镜与许可，制作真正的镜头。模板不是成片。")
