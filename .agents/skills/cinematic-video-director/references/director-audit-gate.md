# Director Audit Gate / 导演级强制审核

## 流程

1. **技术先行**：完整解码、无异常黑帧、编码/帧率/分辨率/峰值、可复现的资产来源；自动 QC 不可替代审美。
2. **逐镜画面**：实际观看全片，逐镜确认故事目的、景别/机位/光线、空间连续性、材质比例、接触阴影、动作可信度、剪辑节奏、字幕、品牌信息。
3. **声音**：完整试听最终成片；检查单主配乐、重复节奏、转场、拟音音质、声画逐帧同步、动态范围与削波。
4. **双重证据**：每项记录时间码、截图/帧序列或试听观察、分数 1–5、问题级别 P0/P1/P2、修改方案、复验结果。没有实看/实听的项目标记 UNVERIFIED。
5. **发布门槛**：P0=0、关键 P1=0、概念功能说明和素材许可有据可查，视觉/声音核心 Gate 都 PASS 才能写 DIRECTOR_APPROVED。

## CG 摄影机可见性 Gate

- 连续 3D 镜头先校验 parent transform / matrix_parent_inverse，检查物体真实世界坐标、整个 bounding box 的相机视图投影和逐帧边界。
- 首帧/中帧/尾帧必须实际渲染并查看，不得只审阅 Blender 场景文件。
- 必要时做低清完整镜头测试；正式高清渲染前由脚本 Gate 阻止超出安全边框的关键主体。
- 例：2026-10 ORB ONE V2 码流 QC PASS，但 gyro/rolling 主体严重出画，因 Blender parenting 导致世界坐标重复偏移。此问题必须由导演 QC 抓到。

## 评分（1–5）

故事 15%、摄影 15%、美术 15%、动作/物理 15%、剪辑 10%、声音 15%、品牌 10%、版权/概念合规 5%。目标加权分 >=4.3/5；分数不能抵消严重问题。技术 QC 是独立硬门槛。若无法直接获取音画，不计算虚构总分。

## 一票否决示例

- 物理接触明显违背画面，落地声音偏离可感知接触帧
- 镜头间产品造型/比例严重跳变或素材质量显著不一致
- 多条未经校准的持续背景音乐造成节奏冲突
- 概念功能被描述成已经实测的产品能力，或未核实必要商用许可
- 重要镜头无法直接观看/声音无法试听，却标记导演审核通过

## 标准报告字段

`shot_id, timecode_in, timecode_out, intent, visual_evidence, sound_evidence, scores, issues, severity, fix, retest, gate_status`。

整体结论只能为 `DIRECTOR_APPROVED` / `REVISIONS_REQUIRED` / `UNVERIFIED`，不可将 `TECHNICAL_PASS` 等同 `DIRECTOR_APPROVED`。
