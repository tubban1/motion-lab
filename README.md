# Motion Lab — LLM + Remotion 视频工作室

统一存放由 LLM、Remotion 制作的论文点评、品牌影片、科普、产品演示与活动宣传。

## 工作区结构

- `src/projects/`：每条视频的可编辑 Remotion React 组件
- `projects/`：脚本、分镜、制作笔记、参数和可追溯素材
- `public/audio/`：自制配音、原创音乐
- `renders/`：最终输出视频（不纳入 Git）
- `scripts/`：批量音频和素材处理脚本
- `templates/`：可复用的视觉模板

## 适用范围

Motion Lab 擅长程序化UI/架构/数据图形、科普教育、3D产品机械动作、精确字幕/音频和成片QC。**古装、真人剧情及生活摄影质感**优先使用授权实拍或用户批准的 Seedance 等生成式视频镜头，再交给 Motion Lab 做分镜、剪辑、字幕、配音、声画和合成。也支持实拍/生成镜头与CG的混合制作。制作前按 [路线规范](.agents/skills/cinematic-video-director/references/video-production-routing.md) 填写 `production-route.json`。

## 运行

```bash
npm install
node scripts/generate-audio.cjs
npm run studio
npm run render:fast    # 加速成片：Remotion 关键帧 + FFmpeg 轻推拉剪辑
npm run render         # 全帧 Remotion（此电脑预计需要较长时间）
```

## 第一个项目

`MentorPaperReview`，中文导师对一篇有限记忆 RL / 多智能体自组织论文的投稿前审查。分镜和配音见 `projects/mentor-paper-review-2026-10/script.md`。

本项目的关系曲线和矩阵为解释用动态图形，不声称是实验复算结果。所有音乐由本地脚本原创合成。

## 电影级导演 Skill（可复用）

本仓库的 `cinematic-video-director` Skill 位于：

`.agents/skills/cinematic-video-director/SKILL.md`

Codex / Antigravity / 通过 OWL LAB 接入的 Agent 应读取根目录 `AGENTS.md`，在要求真实生活场景、Remotion、Blender 3D、导演镜头、配乐节奏、视频验收时使用该 Skill。不是项目专属的 ORB ONE 代码复用。

```bash
python3 .agents/skills/cinematic-video-director/scripts/preflight.py
python3 .agents/skills/cinematic-video-director/scripts/init_project.py --slug new-product-film --title "新品发布" --duration 48 --genre product
# 剧情片用 --genre story；科普讲解用 --genre education
python3 .agents/skills/cinematic-video-director/scripts/validate_plan.py projects/new-product-film/shotlist.json --mode draft
python3 .agents/skills/cinematic-video-director/scripts/test_skill.py
python3 .agents/skills/cinematic-video-director/scripts/qc_media.py renders/<成片>.mp4 --fps 24 --width 1920 --height 1080 --duration <秒>
```

制作标准详见 `.agents/skills/cinematic-video-director/references/`。重要：真实动态/合成质量由镜头实际验收，不允许把单帧 PNG 推拉描述成连续 3D，技术检查通过不代表电影摄影审美通过。
