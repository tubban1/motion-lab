# QC
- [x] 脚本/授权/真实产品状态（见 brief.md、assets-manifest.json）
- [x] 关键帧视觉审核（8 张 still + 12 张成片抽帧）
- [x] 混音电平（峰值 −4.6 dBFS，无削波）——人耳试听未做
- [x] 类型检查/整片渲染/媒体探测/全帧解码
- [ ] Neon 实时数据刷新（refresh-neon-data.mjs <.env>）
- [ ] 导演最终看片 + 试听
- 备注：Remotion 自带 ffmpeg 没有 acompressor，配音用 --no-filter 生成（仍是 Edge TTS，跳过了母带滤波）。

## 2026-11-04 · 视觉先行全片（VibeMonitorVisualFilm）

- 用同样 8 段配音和同一份快照数据重做的 62 秒全片，源码在 `src/.../film/`，文档在 `projects/.../film/`（README、shotlist、导演审核）。
- 成片：`renders/vibe-monitor-1-0-visual-film-v3-1080p.mp4`。v1、v2 保留；旧数据片和 A/B 样片未改动。
- [x] tsc；validate_plan --mode final PASS；全帧解码；声画同步实测（冲击、心跳、"跟上"、按键误差都在 10 ms 内）
- [x] 逐段画面：开发静帧、转场静帧、连续帧条带都看过（`renders/qc/vm-film/`）
- [ ] 人耳试听混音（只做了数值检查和频谱图）
- [ ] Edge TTS 商用条款；Neon 实时刷新
