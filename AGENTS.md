# Motion Lab — Agent Instructions

本仓库制作 Remotion 宣传片、3D 产品视频、导演级电影剪辑、实拍/CG 合成及音乐鼓点同步时，**必须先阅读**：

`.agents/skills/cinematic-video-director/SKILL.md`

进一步参考 Skill 的 `references/video-production-routing.md`、`references/production-standard.md`、`references/orb-one-case.md`。摄影级真人故事必须先选实拍/授权生成镜头来源，不准用简化CG冒充；默认配音必须调用现成的 `scripts/voiceover.py`（Edge TTS），除非明确批准离线回退并记录原因。各代理（Codex、Antigravity、OWL LAB 接入的代理）均按该 Skill 流程和质量 Gate 工作。

本仓库约定：`projects/<slug>/` 保存 brief、分镜、资产授权、QC；`src/projects/<slug>/` 保存 Remotion 组件；`public/<slug>/` 保存图像/音频/视频；`renders/` 保存生成品。

不能未经本次用户要求删除/覆盖旧项目、推送公开仓库、使用付费媒体 API 或声称概念产品已存在。持续的 3D 动画不能用 PNG 轻推拉冒充；编码检测不能代替导演级真实画面验收。
