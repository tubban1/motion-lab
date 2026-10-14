# MOTION LAB — ONE MACHINE / TWO AGENTS
## OWL LAB × WorkBuddy ｜导演分镜方案

**形式**：1920×1080 / 24fps / 52秒 / 中文字幕版 / 无旁白 / 原创工业电子鼓点
**风格**：电影级极简赛博、曜石黑 + 青绿（OWL）+ 琥珀（WorkBuddy）、数据摄影、镜头推进/环绕、节拍驱动剪辑。

| 时间 | 场景 | 导演调度 / 动作 |
|---|---|---|
| 00–06 | 序章 | 冷开场：镜头掠过悬浮磁盘剖面和数字脉冲，主标题两拍撞入 |
| 06–12 | 两个 Agent | 对称分屏 + 仿透视推进，两组数据流相向奔涌，呈现不同执行通道 |
| 12–20 | 同一台 Mac | 460 GiB 环形磁盘、剩余约 13 GiB、分层目录卡片按节奏依次进入；扫描栅格掠过 |
| 20–32 | 时间竞速 | 双轨道计时器增长、进度条推进；OWL 20:47、WorkBuddy 26:47，摄影机沿进度轨道横移 |
| 32–40 | 数据冲击 | 大幅数字 06:00 / ≈22%，鼓点落下；旁边提示：“本次工作流耗时，不是同负载内核性能结论” |
| 40–48 | 更深结论 | 主要目录一致；OWL 33 Tool Steps、WorkBuddy 36 Tool Calls（口径不同），强调任务持续性与准确性；所有清理操作为零 |
| 48–52 | 品牌尾声 | 镜头抽离数据核心，标题从粒子流收束：真正的效率，是可靠地完成任务。 |

## 实测依据
- OWL LAB Workstream 打开 2026-10-10 13:45:42（瑞士时间），到工作流完成约20分47秒；
- OWL LAB 只读扫描 13:46:23–14:00:13（13分50秒）；候选核验进程 14:01:20–14:05:26；
- WorkBuddy 本地任务日志 13:12:01–13:38:48，26分47秒；
- WorkBuddy 36次工具调用；OWL 完成前 33个 Tool Steps。两项口径不一致；
- 两者结果一致：~/Library 114G、~/Documents 63G、~/.gemini 33G、Chrome 克隆逻辑大小50G/24个；不主张能释放50G；
- 过程全部只读，无删除；完整任务并非完全同负载对照。

## 音乐设计
- 120 BPM；每小节2秒，剪辑落在重拍；
- 自合成 kick/snare/hat、亚低音、合成器和转场低频冲击、立体声 riser；
- 00–12 tension，12–32 propulsion，32–40 impact，40–48 resolution，48–52 outro；
- 无配音、无任何人声，避免版权限制。

## 输出
- 源码：src/projects/owl-vs-workbuddy/OwlVsWorkBuddy.tsx
- 音轨：public/audio/owl-vs-workbuddy-2026-10/score.wav
- 成片：renders/owl-vs-workbuddy-2026-10.mp4
- 海报：renders/owl-vs-workbuddy-poster.png
- 片中数据为记录转述；动画曲线、轨道、粒子均为概念视觉，不是真实监控数据流。
