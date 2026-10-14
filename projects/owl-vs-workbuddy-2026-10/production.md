# OWL LAB × WorkBuddy — 制作与验收

项目：Motion Lab / `OwlVsWorkBuddy`，中文、无配音、原创电子鼓点、52 秒。

## 输出
- `renders/owl-vs-workbuddy-2026-10.mp4`：最终影片
- `renders/owl-vs-workbuddy-poster.png`：海报
- `renders/owl-vs-workbuddy-contact-sheet.jpg`：7 幕镜头质检
- `src/projects/owl-vs-workbuddy/OwlVsWorkBuddy.tsx`：可编辑 Remotion 源码
- `projects/owl-vs-workbuddy-2026-10/director-notes.md`：分镜脚本
- `scripts/generate-owl-vs-workbuddy-score.cjs`：原创音轨发生器
- `public/audio/owl-vs-workbuddy-2026-10/score.wav`：原创配乐

## 复现
```bash
cd ~/Documents/Me/Project/cursor/motion-lab
npm run studio
node scripts/generate-owl-vs-workbuddy-score.cjs
npm run poster:owl-vs-workbuddy
npm run render:owl-vs-workbuddy
```

## 2026-10-10 验收
- TypeScript PASS；海报渲染 PASS；全帧 Remotion render exit 0。
- MP4 H.264，1920×1080，24fps，1248 帧，52.011 秒，18,185,432 字节。
- AAC 双声道 48kHz；40–42 秒媒体抽样解码 PASS。
- 七幕画面通过联系表检查，中文字幕、数值与构图正常。
- 无旁白；音轨完全由本地脚本合成。

## 数据限制
OWL 20:47 与 WorkBuddy 26:47 是两次不同流程的端到端任务记录，不能宣称同负载的底层引擎加速了 22%。OWL 33 Tool Steps 和 WorkBuddy 36 Tool Calls 口径不同。Chrome 克隆目录的 50 GB 为逻辑占用，实际释放量未知。两个 Agent 都只读扫描、未清理文件。
