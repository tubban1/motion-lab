---
name: cinematic-video-director
description: "Motion Lab 的视频制作路线决策与导演后期 Skill。先区分程序化动画/产品CG、Seedance等生成视频或授权实拍优先、混合制作，再使用现有Edge TTS管线和Remotion/Blender做镜头、字幕、音画及验收；禁止简化CG冒充摄影级真人。"
---

# Cinematic Video Director

**目标**：选对原始影像生产方式，再交付可编辑、可复现、音画匹配的导演级后期成片。Motion Lab 强于程序化动画、精确产品3D、音画和剪辑，但并非摄影级真人影像生成器。不得以静帧推拉冒充连续3D，也不能以粗糙CG冒充写实演员。

## Gate 0 — 视频制作路线（开工前强制）

先阅读 [适用范围和制作选型](references/video-production-routing.md)，再按场景/镜头选择：
- `motion_lab_native`：UI/架构/数据、科普图形、精确产品机械CG、风格化动画由 Motion Lab 直接生成；
- `footage_first`：真人古装电影、真实生活环境、人物心理戏、复杂写实动作，先取得授权实拍或经用户批准的 Seedance 等生成式视频镜头；Motion Lab 负责剧本、分镜、精剪、字幕、声音、合成、QC；
- `hybrid`：已有授权实拍/生成镜头与程序化产品CG或动态图形混合。

**《聊斋》摄影级真人故事不能用简化 Blender CG 人偶冒充正式成片。** 在没有外部视频素材和调用许可时，仅能做 `PREVIS_ONLY` 的可编辑分镜/预演，不可标记导演验收通过。生成模型是否可用、收费与许可要另行验证，选择路线不构成付费API调用授权。

```bash
# 先运行下方 init_project.py 创建项目目录，再做路线判定
python3 .agents/skills/cinematic-video-director/scripts/route_project.py projects/my-film \
 --content-kind human_drama --visual-target photoreal_live_action \
 --human-performance central --existing-footage none --save
python3 .agents/skills/cinematic-video-director/scripts/route_project.py projects/my-film --check
```

`production-route.json` 记录 `rationale`、`audio_engine`、`external_generation_authorized`；正式分镜验收将验证路线。旧项目复验时先补文件，不覆盖既有成片。

## 启动与规范

在 Motion Lab 根目录（`package.json`、`src/root.tsx`、`projects/` 所在目录）运行：

```bash
python3 .agents/skills/cinematic-video-director/scripts/preflight.py
python3 .agents/skills/cinematic-video-director/scripts/init_project.py --slug my-film --title "产品发布" --duration 48 --fps 24 --bpm 96 --genre product
# 人物故事改用 --genre story；教育科普使用 --genre education
python3 .agents/skills/cinematic-video-director/scripts/validate_plan.py projects/my-film/shotlist.json --mode draft
```

预检显示不可用的程序时明确说明；Blender 只在需要独立 3D 镜头时成为必需依赖，不允许假定 Mac 安装路径，不能因命令缺失而偷偷跳过镜头。

## 完整流程（严格执行）

1. **Brief / 目标与边界**：确定观众、故事/产品目标、人物表演是否核心、风格化还是摄影级真实、画幅/时长/语言、镜头素材来源与许可、预算、配音偏好，先完成 Gate 0。不能擅自调用付费生成 API、外传保密剧本或发布素材。
2. **导演剧本**：产品片讲冲突与产品证据，人物片讲原著情节因果、行动与情感，教学片讲概念理解与证明；不要把所有内容硬套产品发布结构。每镜记录原始画面来源、意图、人物/主体走位、灯光、焦距、摄影机运动、时长和声音提示。
3. **分镜**：生成 `projects/<slug>/shotlist.json`。确保帧级时间轴覆盖完整，无空白/重叠；所有高难动作优先技术验证，记录连续运动还是概念视觉。
4. **素材与授权**：B-roll、音乐、模型、HDRI、音效、字体必须记录在 `assets-manifest.json`（原始来源、作者、许可 URL、用途、时间与备注），不要把默认能下载等同于可商用。已取得素材/用户自行创建素材要明确区分。
5. **Look development**：Motion Lab 原生CG检查产品/物体比例、PBR材质、真实遮挡、接触阴影和摄影机投影；`footage_first` 则先核验获得的真人/生成镜头（人物表情、服饰、动作、光源、跨镜一致性），而非从简单CG人偶造起；`hybrid` 需匹配光线、噪点、遮挡、镜头。关键镜头先低清预览再投入最终渲染。
6. **真实动作**：滚动、跳跃、机械联动必须展示前后位置、视差、真实几何方向变化、加减速/接触/落地、物理一致性。静态 PNG 的 Ken Burns 推拉标为 `3d_still`，**不能**作为 `full_3d_motion` 通过验收。需要真实运动时渲染逐帧 3D/实拍合成。
7. **配音/音效与剪辑**：默认复用现有 `scripts/voiceover.py` 的 Edge TTS，不得另造 `say` 临时配音脚本；先试听选音色、生成、用真实时长对齐镜头和字幕。断网或保密文本要求离线时，用户认可后使用 `--engine say` /人工录音，并把原因写入 `production-route.json`。单一主音乐轨，分离拟音/旁白/环境声；实测BPM及相位，逐动作核对声画，禁止双重持续鼓点。
8. **Remotion 组装**：`src/projects/<slug>/` 实现唯一 Composition，登记 `src/root.tsx` 不覆盖旧工程；按镜头参数组织 Sequence、实拍视频/多帧 3D、音轨和中文排版；不能用同一类推拉覆盖全部镜头。
9. **分层 QC**：运行 `npx tsc --noEmit`，抽帧检查，渲染低清全片，人工逐镜看片/听混音，修正后渲染 1080p+；运行 `qc_media.py` 检查视频/音频码流、片长、帧率并生成 contact sheet。硬件/产品还没实现时，明确标注概念演示。
10. **交付**：输出最终 MP4、海报、contact sheet、`qc-report.json`、分镜、素材授权与源代码；**只在实际渲染成功、文件存在且验收通过后**称为已完成。视觉未达标，即便 ffprobe 和 TypeScript 通过，也不能宣称导演级成片合格。

## 配音 Gate：优先复用 Edge TTS

`scripts/voiceover.py` 已提供 Edge TTS（默认）、多场景声音预设、试听、48 kHz WAV、SRT 和真实音频时长。**禁止临时绕过已有脚本用 macOS `say` 做默认旁白**。

```bash
python3 -c "import edge_tts; print('Edge TTS ready')"
python3 scripts/voiceover.py --list
python3 scripts/voiceover.py --project my-film --name voice-01 \
  --voice deep --rate=-7% --pitch=-3Hz --text "古风电影旁白示例"
```

音色按场景试听，实际时长驱动镜头、字幕和静默停顿；不得把未听审的合成音频标记为电影级配音。Edge TTS 经网络发送文本，敏感剧本先取得外发许可或采用离线配音；网络故障先排障，**不可静默回退**。获准改用 `--engine say` 或人工录制时，在 `production-route.json` 写明 `audio_engine` 和 `audio_fallback_reason`。商用许可需复核，详见 `docs/voiceover-guide.md`。

## 验收硬门槛

- **技术 Gate**：preflight、分镜校验、TypeScript、关键帧、Remotion 渲染、ffprobe、视频/音轨真实存在、导出无异常。
- **视觉 Gate**：真实场景/材质/产品比例、连续动作、接触阴影、镜头语言、叙事因果、产品一致性、中文清晰、音画对应和概念边界。视觉必须实际看，不允许只凭脚本推断。
- **制作 Gate**：`production-route.json` 路线正确且来源/许可可追踪；不把简化CG称为摄影级人物，不假装静帧是完整3D，不把生成镜头称为产品实测或纪录实拍，不覆盖旧输出。

- **渲染前主体可见性门槛**：真实 3D 产品动画在正式渲染前，必须逐帧计算产品 bounding box 在相机投影中的范围，确认关键主体不会出画、被裁切或因父级变换偏移；针对复杂遮挡还必须渲染片段首/中/尾至少 3 张预览实看。ORB ONE 专用示例：`projects/orb-one-2026-10/directors-cut/validate_motion_visibility.py`。检测失效必须终止高清渲染，**不得仅凭 H.264/AAC QC PASS 发布**。

## 强制导演级审核 Gate（每次正式交付必须执行）

在技术 QC PASS 后，**必须运行导演审核**，参考 [导演级审核模板](references/director-audit-gate.md)。每个镜头按故事/摄影/美术/物理/剪辑/声音/品牌/合规评分 1–5，并附时间码与证据；严重问题一票否决。所有高风险镜头必须有实际画面复核，声音必须听最终混音。仅查看代码、抽帧或 QC 日志只能判为 `UNVERIFIED`，不得冒充人工视听 PASS。生成 `projects/<slug>/director-audit.md`，保留 P0/P1/P2、修复和复验记录；存在 P0、未经验证的关键镜头或未核实的版权声明，不得标记 `DIRECTOR_APPROVED`。

## 常用命令

```bash
python3 .agents/skills/cinematic-video-director/scripts/validate_plan.py projects/my-film/shotlist.json --mode final
npx remotion still src/index.ts MyFilm renders/my-film-poster.png --frame 120
npx remotion render src/index.ts MyFilm renders/my-film-director-cut.mp4 --codec h264 --crf 19 --concurrency 1
python3 .agents/skills/cinematic-video-director/scripts/qc_media.py renders/my-film-director-cut.mp4 --fps 24 --width 1920 --height 1080 --duration 48
```

这里 `MyFilm` 是完成 Component 并注册后的名称，`my-film` 是用户项目 slug。长时间构建/渲染交给 OWL LAB 的持久进程，并周期性检查输出；不要占用聊天等待、不声称后台工作除非已启动实际任务。

## 实战补充：物理镜头、单主音乐与动作拟音（ORB ONE 2026-10）

- **运动不是图片移动**：先在 Blender 输出逐帧序列，再编码为连续 motion clip；滚动须满足角位移约等于位移/半径，弹跳明确起跳帧、最高点、接地帧与二次反弹，稳定机构必须显示外环与内核相对运动。记录源动画帧率、输出帧率、Remotion playbackRate 与具体镜头起始帧。
- **单一音乐主线**：禁止把未实测 BPM/相位的 96 BPM 鼓点与第三方音乐整段叠放。持续音乐原则上仅一条；额外音轨只承载稀疏动作拟音/环境声/旁白。音轨数量不等于音乐数量，但必须检查每一轨实际内容。
- **动作拟音帧级对齐**：事件时间 `shotStartFrame/fps + (eventSourceFrame-1)/(sourceFps*playbackRate)`；对齐滚动开始/停止、机构转动、弹跳起跳/落地、扫描和目标确认。短音效使用包络、留白和受控峰值，不能再形成第二条节奏轨。核对真实运动接触帧，而非仅按脚本猜测。
- **混音验证**：测输出整体峰值与平均电平、检查削波、听完整成片及重要切点前后至少 1 秒。技术 `ffprobe` PASS 不证明音乐审美或拟音同步 PASS。
- **渲染容错**：若 Remotion 报 `Navigation failed because browser has disconnected`，先检查浏览器/内存与运行环境；可使用经验证的本机 Chrome `--browser-executable`，`--concurrency 1` 重试 Remotion 合成，不重复渲染已成功的 Blender 镜头。保留旧版输出，使用新文件名。
- **导演级审核分级**：技术证据、逐镜画面观看、全片声音试听、授权/概念声明分别标记 PASS / FAIL / UNVERIFIED；未经亲自看片或试听的项目不得写 PASS。问题记录镜头时间码、现象、影响、优先级、修复方法和复验结果。

## 深入参考

- [视频适用范围、实拍/生成视频/混合选型](references/video-production-routing.md)
- [制作标准与导演级 QC](references/production-standard.md)
- [ORB ONE 实战复盘](references/orb-one-case.md)
- [预检](scripts/preflight.py) · [建项目](scripts/init_project.py) · [分镜验证](scripts/validate_plan.py) · [视频 QC](scripts/qc_media.py)
