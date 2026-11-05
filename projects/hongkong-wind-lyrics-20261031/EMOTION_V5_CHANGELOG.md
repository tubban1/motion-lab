# HK 季候风 — Windows Emotion V5 (2026-11-02)

## 用户要求与实施

- 主要中文旁白保持不变：`zh-CN-YunyangNeural`，全部 53 个片段与 Rhythm V4 逐字节 SHA-256 一致，无需重新合成。
- 英文 4 段改为 `en-US-ChristopherNeural`，使用情绪化语速与停顿：初见/无奈/接受变化/等待。最初尝试的 Davis 在当前 Edge 通道返回 No audio was received，因此没有用于成片。
- 粤语 4 段改为 `zh-HK-HiuMaanNeural`，更克制的叙述和句末留白；特别在「那次季候風。你似季候風。」的两句之间加入空镜呼吸。
- 英文/粤语增加原文 + 中文释义的双层字幕，原中文旁白字幕不变。
- 原始 `script.json` 逐字不变，不添加未授权歌曲段落、不复制歌手真实声纹、不添加背景音乐。
- 创建独立 `voice-rhythm-v5/`、`rhythm-score-v5.json`、`rhythm-timeline-v5.json`、`story-rhythm-v5.json`、`HKContinuousStoryEmotionV5.tsx`，旧 V4 保留。
- 影片仍是连续人物叙事，通过真实语音录音长度确定剧情场景锚点和画面节奏。

## 验收

- 配音：61/61 音频齐全；53 段中文旧录音 SHA-256 不变；8 段重新合成。
- 影片：5564 帧、24fps、231.833s（约 3 分 52 秒），比 V4 的 5437 帧多 127 帧（5.29s）。
- `py scripts/prosody/qa_hk_emotion_v5.py` 结果：PASS；无时间轴断层、无母版音色变化、无文本漂移。
- `npx tsc --noEmit`：PASS；原有 prosody 单测 10/10 PASS。
- 首张 Remotion 静帧已成功生成并检查；成片视频流、声音流与主观听感需以渲染完成后的独立校验为准。
- **重要限制**：当前 Edge TTS 入口通过分句、速度、音色和留白优化表演，无法保证原生 Azure SSML `sad` 情绪风格控制。技术验收不等于人工听感验收。

## Windows 工作路径

- 视频输出：`renders/hongkong-wind-lyrics-20261031/emotion-v5/HK-seasonal-wind-emotion-v5-540x960.mp4`
- 静帧：`renders/hongkong-wind-lyrics-20261031/emotion-v5/HK-emotion-v5-still.png`
- 原始与修改比对：`projects/hongkong-wind-lyrics-20261031/voice-casting-v5.json`
- 编译源码：`src/projects/hongkong-wind-lyrics-20261031/HKContinuousStoryEmotionV5.tsx`
- 生成/重试：`py scripts/prosody/hk_emotion_v5.py prepare` 后 `py scripts/prosody/hk_emotion_v5.py synthesize` 再 `py scripts/prosody/hk_emotion_v5.py finalize`（注意 finalize 会重新生成 TSX，之后再次确认双层字幕）。
- 简报：`projects/hongkong-wind-lyrics-20261031/qa-emotion-v5.json`

无自动发布、无覆盖旧版 MP4、无全仓库提交或推送。

## 最终输出核验（2026-11-02）
- 预览 540×960：H.264 24fps / AAC 48kHz stereo / 231.851s / 29,838,539 bytes / SHA256 `4EA7ED2374029F32090B4A00F4F25C95ED330DF4CBCCA99FB4F8ABC3FA7C63F7`。
- 高清 720×1280：H.264 24fps / AAC 48kHz stereo / 231.851s / 57,413,416 bytes / SHA256 `F6DF54FE10D2A5435CE5CACA181BF954FB417FA22D07FC916FD817A728FBFDEE`。
- 真实渲染抽帧：英文及粤语双层字幕可见；局部跨场景淡入会有短暂双重曝光效果，属后续主观画面审查重点。
- 客观结构检查 PASS；人耳自然度/情绪表演主观验收仍未执行。
