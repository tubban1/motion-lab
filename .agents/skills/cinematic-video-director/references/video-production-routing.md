# Motion Lab 制作路线（Video Production Routing）

Motion Lab 是**可复现、可编辑的程序化动画与导演后期工作室**，不等于摄影级真人影像生成器。每个项目在做大量CG建模或高清渲染之前，须确定原始影像来源。推荐 Seedance 等生成式视频模型仅表示可作为候选工具；不表示已接入、已授权、已支付或能够保证镜头一致性。

## 三种路线

| route | 合适的主体 | 首选来源 | Motion Lab 职责 |
| --- | --- | --- | --- |
| `motion_lab_native` | UI/架构可视化、文字/数据动效、科学教育图形、可控机械产品3D、风格化动画 | Remotion、Blender、Three.js、GSAP、自有模型 | 从场景制作到精准时间轴、音画、导出、QC |
| `footage_first` | 逼真古装/奇幻/历史真人故事、情绪戏、角色近景、生活人物、复杂真人动作 | 授权实拍，或用户批准后用 Seedance 等视频模型生成镜头 | 剧本、分镜、提示词镜头说明、后期、字幕、配音、色彩统一、QC |
| `hybrid` | 实景人物 + 精确产品CG、真人镜头 + 数据/UI/特效，已有授权素材的广告 | 真实/生成镜头与程序化素材组合 | 摄影机匹配、合成、遮挡、字幕、音画和版本管理 |

### 开工前四项判定

记录 `content_kind`、`visual_target`、`human_performance`、`existing_footage`，由 `scripts/route_project.py` 计算 `route`，存入 `projects/<slug>/production-route.json`。`--check` 能阻止未决定或与真实需求冲突的路线。选型理由写入 `rationale`；`external_generation_authorized` 默认为 false。

```bash
python3 .agents/skills/cinematic-video-director/scripts/route_project.py projects/my-film \
  --content-kind human_drama --visual-target photoreal_live_action \
  --human-performance central --existing-footage none --save
python3 .agents/skills/cinematic-video-director/scripts/route_project.py projects/my-film --check
```

**不能用低精度CG人物代替摄影级真人，并把技术QC PASS算作审美PASS。** 若无授权素材/外部生成权限，可以制作 `PREVIS_ONLY` 分镜预演，但不能宣称达到摄影级质量。用户明确要高度风格化人偶/卡通时可采用 Motion Lab 原生。

### 使用举例

- 《聊斋志异·劳山道士》：`human_drama + photoreal_live_action + central -> footage_first`。先拍摄或用用户认可的 Seedance 类模型制作人物表演、夜宴、舞姬、撞墙镜头；Motion Lab 统筹约60秒的改编、镜头连续、字幕、音轨和最终剪辑。
- Vibe Monitor：UI、架构图、信息动效及宣传文案，`motion_lab_native`。
- ORB ONE：真实产品几何、可验证滚动/弹跳/机构动作，`motion_lab_native`；若加入真实家庭人物镜头则转 `hybrid`，CG不等于产品已实测。
- 真实人物背景与精确结构演示同框：有授权底片时 `hybrid`。

### 生成视频与实拍素材的使用边界

生成式视频可能更接近摄影质感，但**不天然保证**角色面容/服装跨镜一致、物理因果、口型、精确几何、历史服饰、可重复输出和版权许可。为每镜保留原始文件、模型版本、生成参数或实拍来源、授权与镜头关键帧；穿墙/机械/科学因果等高风险镜头需要额外视觉或CG验证。不能把“看起来真实的广告镜头”说成产品真实操作或客观纪录片事实。保密剧本和客户素材外传前先征得授权，付费调用单独获得授权。

影片即使得到 H.264/AAC、片长和帧率技术QC PASS，导演级镜头真实感/表演/连续性/音效/授权尚未验证时仍只能标注 `UNVERIFIED` 或 `REVISIONS_REQUIRED`。用户要求摄影级成片但仅得到 CGI 预演时必须标注 `PREVIS_ONLY`，不能称为满意的最终交付。
