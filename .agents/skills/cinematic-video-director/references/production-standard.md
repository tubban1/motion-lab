# 电影级导演视频：制作标准与验收

## 剧本结构取决于视频类型

- **产品广告**：困境 → 悬念 → 产品揭晓 → 可观察的能力 → 情绪兑现 → 品牌。
- **真人剧情/文学改编**：人物与世界 → 欲望或矛盾 → 事件转折 → 选择/奇观 → 后果 → 原著结局；先取得合适的真实/生成镜头，不能用技术Demo替代人物表演。
- **教学科普**：问题 → 概念 → 模型 → 可验证演示 → 对比 → 总结。

每个镜头都需要 `intent`、`camera`、`blocking`、`lighting`、`audio`、`visual_evidence` 和真实的素材来源。没有叙事目的的 UI 金属边框、粒子和发光元素不能替代导演构图。

拍摄参考：生活环境 24–35mm；人面部/手部 35–50mm；产品发布 65–100mm；镜头/材质微距 85–120mm；贴地跟拍 24–35mm。具体镜头取决于空间与主体，切忌机械套用。

## 真实感标准

- **比例**：产品尺寸与人、桌椅、眼镜、地板统一到同一物理尺度。
- **材质**：真实金属 PBR、微表面纹理、边缘倒角、玻璃菲涅耳/镀膜反射；高光有摄影棚光源来源，不要全身纯白泛光。
- **场景**：有可辨认的真实家具布局，光源方向一致，足够的接触阴影、环境遮挡和透视；画面过曝、物体悬浮、突然更换材质都不合格。
- **运动**：滚动要求位置变化、角速度、真实视差/接触；弹跳要求起跳、最高点、降落、落地反馈；镜头稳定要求外壳/机芯相对运动的证据。静止 PNG 只是 `3d_still`，即使推拉也不是 `full_3d_motion`。
- **实拍+CG**：必须匹配机位、遮挡、运动模糊、颗粒、焦平面、色温、反射与地面阴影。不能将 stock 家居素材冒充球已在该场景中真实工作。
- **视觉连续性**：每镜产品造型、摄像头方向和色彩一致。字体完整无中文乱码。

## 声音

`framesPerBeat = fps × 60 / measuredBPM`，仅在实际实测 BPM、音乐拍相已确认时才能说真正卡拍。24fps/96BPM 对应 15 帧/拍，但不代表某段外部 BGM 实测就是 96BPM。音乐、对白、空间底噪、撞击、动作拟音分轨；落地音必须精确放在物理接触帧。混音不要削波，不宜一直高频密集鼓点。

## 原始镜头先选型

先执行 [视频制作范围与工具路由](video-production-routing.md) 的 Gate 0。依赖演员表演、古装实景、摄影级人物镜头时优先授权实拍或用户批准的生成视频方案；Motion Lab 负责镜头规划、剪辑、合成、精确图形和音画。生成镜头在分镜中标记 `source_kind=generated_video` 并记录资产来源、模型及许可。只要用户要求真实演员，就不可把简化CG人偶的技术QC视为视觉完成。

## 工具选型

实拍负责真实人物生活；Blender/Cycles 或 Eevee+高质量合成负责可信产品、几何运动和精细材质；Remotion 负责时间轴、叠层与音轨；ffmpeg/ffprobe 负责媒体技术证据。Mac M1 上渲染过慢时先做低清预览并设性能降级阈值，不可静默替换真实动画需求。

## 7 个交付 Gate

| Gate | 人工或自动证据 |
|---|---|
| Story | 观众理解问题、情绪转折、产品动机 |
| Photography | 构图、照明、景深、节奏、场面调度 |
| Motion | 连续 3D 动作/视差/接触，非静帧推拉假替代 |
| Physical realism | 尺寸、遮挡、阴影、材质、光照统一 |
| Sound | 音画逐动作同步、主音乐测拍、配音/环境声正常 |
| Legal / claims | 每项外部资产的来源与许可；概念功能不冒充真实 |
| Technical | tsc、关键帧、Remotion 渲染、ffprobe、音轨、完整解码与抽样联系表 |

**特别强调**：技术 Gate PASS，不代表 3D 真实感 PASS；人工看完具体镜头并修复后才能声称达到目标。

## 通用目录

```text
projects/<slug>/brief.md
projects/<slug>/shotlist.json
projects/<slug>/assets-manifest.json
projects/<slug>/qc-notes.md
src/projects/<slug>/DirectorCut.tsx
public/<slug>/footage/ 3d/ audio/
renders/<slug>-director-cut.mp4
renders/qc/<slug>-director-cut/contact-sheet.jpg
renders/qc/<slug>-director-cut/qc-report.json
```
