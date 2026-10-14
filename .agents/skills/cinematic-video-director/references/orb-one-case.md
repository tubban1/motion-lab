# ORB ONE：可复用案例与失败教训

参考文件：

- `projects/orb-one-2026-10/directors-cut/render_product.py`：Blender 产品形状、镜头、金属材质、室内、HDRI。
- `projects/orb-one-2026-10/directors-cut/build_sound.py`：本地鼓点和拟音。
- `src/projects/orb-one/OrbOneDirectorsCut.tsx`：Remotion timeline，B-roll、摄影机推拉、字幕、音轨。
- `projects/orb-one-2026-10/directors-cut/README.md`：原项目制作记录、授权来源。
- `renders/orb-one-directors-cut-2026-10.mp4`：已导出的 53.76 秒成片。

## 已验证有价值的步骤

1. 真实生活中的“眼镜随手一放，找不到” → 情绪铺垫 → 产品揭晓，比开头展示功能更有故事性。
2. 实拍室内与人物、Blender 产品材质及镜头细节、相对克制的文案有助于高级感。
3. 在 Remotion 中统一 Composition、字幕、音效和镜头；`ffprobe` 确认 H.264/AAC，抽帧生成 contact sheet。
4. 用 24fps / 96BPM 自制鼓点设定 15 帧/拍转场网格；需要核对与第三方主音乐的真实拍点是否一致。

## 必须避免重复的失败

- **未达到连续 3D**：上述产品摄影使用 Blender 静态关键帧 + Remotion 推拉，不能称为球体的连续真实物理动作。
- **没有同镜头实拍整合**：部分室内生活镜头是独立 stock B-roll，真实小球没有合成进去；不能冒充真实产品录像。
- **室内视觉不足**：早期球体像漂浮的大球、接触阴影不足、简单几何家具缺乏质感；必须先检查真实的室内落地视角。
- **技术通过 ≠ 导演审美通过**：Remotion 编码与音轨正常，仅能代表技术 Gate。用户可以且确实认为画面还不够高级。
- **音轨限制**：自制鼓点按 96BPM，但 Mixkit 的背景曲目未测量/确认同步，不得宣称整曲已精确卡拍。
- **概念功能**：找眼镜与弹跳属于设计意图，尚非经过实际硬件测试；必须明确揭示。

使用本 Skill 时，把 ORB ONE 当作经验参考与边界提醒；如果用户要“连续真实 3D”，先制作至少 3–5 秒有真实滚动/弹跳/接地的连续运动验证，再进入整片。

## 2026-10-11 Physical Cut / Action Foley 复盘

- `render_motion.py` 输出 gyro 60 帧、rolling 72 帧、bounce 72 帧；Remotion `OrbOnePhysicalCut.tsx` 在帧 540、705、885 分别插入连续运动视频，播放速率 0.8。
- 初版 `foley-96bpm.wav` 自带从 16.25 秒开始的连续节拍，同时叠加 Mixkit 主配乐造成双音乐。改为保留 `vastness-mixkit.mp3` 单主音乐；`build_action_foley.py` 只生成离散动作拟音 `action-foley.wav`，在 Remotion 中较低音量叠加。
- Bounce Blender 帧 12 开始起跳、58 接地；合成帧 885 起，24fps 且 0.8 倍播放，理论对应约 37.45 秒起跳、39.84 秒落地。必须通过观看视频逐帧复核音画。
- 初次合成 Chromium 断开导致 exit 1；改用 `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` 和 `--concurrency 1` 后成功。
- `orb-one-physical-directors-cut-foley-2026-10.mp4`：53.76 秒，1920x1080，24fps，H.264/AAC；自动 QC PASS，音频整体 max -8.2dBFS，mean -22.5dBFS。技术验收不能代替亲自看片试听。
- 视觉风险：运动片段使用 960x540 生成后放大到 1080p，锐度可能与其他镜头不一致；Blender 简化室内与 stock B-roll 不是同镜头实拍合成；稳定机构是技术剖视概念。
