# ORB ONE Director V2 — 实际画面导演审核

审核源：`renders/orb-one-physical-directors-cut-director-v2-2026-10.mp4`
技术 QC：PASS，53.76s、1920x1080、24fps、H.264/AAC；导演视觉 QC：FAIL / REVISIONS_REQUIRED。

## 直接观看画面的发现

- **P0 22.50–25.63s / gyro**：产品稳定机构绝大部分位于画面顶部边缘以外，仅露出少量金属轮廓，无法传达稳定机构。证据：`renders/qc/orb-one-physical-directors-cut-director-v2-2026-10/gyro-roll-strip.jpg`。
- **P0 29.38–33.13s / rolling**：连贯抽帧中几乎只有沙发和地板，看不到移动的主体，镜头叙事目的未完成。同上证据。
- **P0 36.88–40.63s / bounce**：旧源动作关键帧中球体移动到顶部并被裁切，落点前后空间构图不足；证据 `source-frames.jpg`。
- **P1 美术**：地板 procedural wave 纹理重复频率过高，木地板出现条纹/摩尔纹；较大程度削弱真实室内质感。
- **P1 故事连续性**：Blender 室内与 stock B-roll 非同镜头实景合成；不能宣传为实物在真实环境的纪录画面。

## 已定位的根因与修复

- Blender `render_motion.py::group_product` 在非零 pivot 下重设 `child.matrix_world` 造成物体 world-space 位置重复偏移。改为 `child.parent=pivot;child.matrix_parent_inverse=pivot.matrix_world.inverted()`。
- 重新设计 rolling / bounce 摄影机机位和镜头焦距，保证运动起点、最高点和落点均在画面。
- 调低地板 procedural wave 对比度与频率，减少规则条纹。
- 新增 `validate_motion_visibility.py`（全动画逐帧 bounding box 镜头视野检测）；gyro 60/60、rolling 72/72、bounce 72/72 全部 camera visibility PASS。
- Blender 960x540 关键帧实图（gyro、rolling、bounce 各首中尾 3 帧）已人工查看，主体已重回画面。证据 `renders/qc/orb-one-physical-directors-cut-director-v2-2026-10/preview-v3/contact-sheet.jpg`；请注意滚动镜头在更改到 30mm 后仍需最终 1080p 画面复核。

## 其他 Gate

- 声音实听：UNVERIFIED（无法直接在当前对话中听远端视频）。源码是一条主配乐与一条稀疏动作拟音；声音动态和落地对齐需最终媒体测量及人工试听。
- 视觉其他镜头：联系表抽检已完成；演技/情绪/复杂声画蒙太奇需完整播放复核。
- 视频综合评分：**不评分**，因为 P0 未在已发布 V2 影片里修复，且声音实听仍未验证。

**V2 结论：导演级 FAIL，不可标记 DIRECTOR_APPROVED。后续 V3 为修复版，必须单独复验。**
