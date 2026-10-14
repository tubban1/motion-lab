# Motion Lab 视频配音与语音合成指南 (TTS & Voiceover)

本指南介绍如何在 **Motion Lab** 项目中使用内置的配音系统，包括场景音色挑选、快速试听、一键生成、Remotion 帧数对齐与字幕生成。

**导演 Skill 默认使用现有 `scripts/voiceover.py` 的 Edge TTS，不新写 macOS `say` 临时脚本。** Edge TTS 联网发送配音文本，含保密信息时须有外发许可；断网等情况只能在用户批准后回退离线 TTS 并在 `production-route.json` 记录 `audio_engine=offline` 及原因。电影叙事需试听挑选音色、保留停顿，并根据生成音频的真实时长调整镜头；商用许可仍应核实。

---

## 一、 场景音色与快捷别名对照表

为了避免在制作视频时频繁记忆复杂的模型 ID（如 `zh-CN-liaoning-XiaobeiNeural`），系统内置了按**场景风格**命名的快捷别名。

所有预置音色样本已离线缓存至：[`public/tts-samples/`](file:///Users/wahaha/Documents/Me/Project/cursor/motion-lab/public/tts-samples/)

| 场景分类 | 快捷别名 | 角色名称 | 对应 Edge TTS 模型 | 风格特点与适用视频类型 |
| :--- | :--- | :--- | :--- | :--- |
| **深沉 / 科技 / 纪录片** | `deep` / `tech` | 云扬 | `zh-CN-YunyangNeural` | 沉稳有力、专业新闻腔。**大厂发布会、硬核科技演示、工业片首选**。 |
| **好莱坞电影 / 英文预告** | `en-deep` | Christopher | `en-US-ChristopherNeural` | 浑厚磁性、权威感。**科幻预告片、高端英文纪录片**。 |
| **短视频爆款 / 影视解说** | `story` / `jieshuo` | 云希 | `zh-CN-YunxiNeural` | 全网影视解说最火男声！阳光自然、节奏感强，叙事不卡顿。 |
| **激情解说 / 高燃动作** | `passion` | 云健 | `zh-CN-YunjianNeural` | 能量充沛、情绪饱满。**体育赛事、战斗解说、快节奏混剪**。 |
| **知性温和 / 品牌故事** | `warm` / `gentle` | 晓晓 | `zh-CN-XiaoxiaoNeural` | 知性温柔、娓娓道来。**品牌宣传、人文故事、情感散文、Vlog**。 |
| **欧美自然 / 商业广告** | `en-gentle` | Jenny | `en-US-JennyNeural` | 美式自然亲切女声。**海外商业推广、使用教程、清新品牌片**。 |
| **萌系童音 / 可爱男童** | `child-boy` / `boy` | 云夏 | `zh-CN-YunxiaNeural` | 清澈稚嫩、天真无邪。**儿童科普、萌宠日常、少儿动画**。 |
| **活泼童音 / 卡通女童** | `child-girl` / `girl` | 晓艺 | `zh-CN-XiaoyiNeural` | 灵动软萌、活泼跳跃。**童话故事、卡通角色、趣味解说**。 |
| **欧美卡通 / 萌系英文** | `en-child` | Ana | `en-US-AnaNeural` | 超可爱的欧美少儿卡通女声。 |
| **幽默搞笑 / 东北方言** | `dongbei` | 辽宁小北 | `zh-CN-liaoning-XiaobeiNeural` | 浓郁东北腔，幽默风趣接地气。**喜剧包袱、反差感段子、情景短剧**。 |
| **淳朴西北 / 陕西方言** | `shaanxi` | 陕西小妮 | `zh-CN-shaanxi-XiaoniNeural` | 纯朴明亮、陕味十足。**地方民俗、风土人情、特色美食**。 |
| **港风大湾区 / 粤语男声** | `yue-male` / `yue` | 香港云龙 | `zh-HK-WanLungNeural` | 纯正港式男声，大气稳重。**港风电影调色、大湾区品牌出海**。 |
| **自然大湾区 / 粤语女声** | `yue-female` | 香港晓曼 | `zh-HK-HiuMaanNeural` | 粤语知性女声，友好亲切。 |
| **治愈系软萌 / 台湾国语** | `taiwan-male` | 台湾云哲 | `zh-TW-YunJheNeural` | 软萌男声台腔，邻家男孩感。**治愈系日常、个人播客**。 |
| **甜美清新 / 台湾国语** | `taiwan-female` / `taiwan` | 台湾晓臻 | `zh-TW-HsiaoChenNeural` | 甜美台妹腔。**生活分享、好物开箱、美妆探店**。 |
| **中英混读 / Copilot 系列** | `bilingual-male` / `bilingual` | Andrew | `en-US-AndrewMultilingualNeural` | 微软多语言模型，中文句中夹杂 English 单词丝滑不突兀。 |
| **中英混读 / Copilot 系列** | `bilingual-female` | Ava | `en-US-AvaMultilingualNeural` | 多语言女声，现代感与国际化科技感。 |

---

## 二、 常用命令与操作

### 1. 查看音色列表
```bash
npm run tts:list
# 或
python3 scripts/voiceover.py --list
```

### 2. 在 Mac 终端直接试听某个声音（无需开播放器）
```bash
python3 scripts/voiceover.py --play deep          # 试听深沉发布会男声
python3 scripts/voiceover.py --play story         # 试听爆款影视解说
python3 scripts/voiceover.py --play dongbei       # 试听东北话
python3 scripts/voiceover.py --play child-girl    # 试听卡通女童
python3 scripts/voiceover.py --play yue           # 试听粤语
```
> *注：Mac 下会自动调用系统原生的 `afplay` 进行试听播报。所有离线音频也可以在 Finder 或播放器中直接打开 `public/tts-samples/` 目录试听。*

### 3. 一键生成配音（支持项目归档）
指定 `--project <slug>` 会自动将音频写入 `public/<slug>/audio/<name>.wav`，并转码为符合 Remotion 要求的 **48000Hz 16-bit 广播级双声道 WAV**，同时生成同名 `.srt` 字幕：

```bash
# 示例 1：为某个项目生成科技感深沉男声配音
python3 scripts/voiceover.py \
  --project my-video \
  --name voice-01 \
  --voice deep \
  --text "架构的演化，就像一棵树的生长。何时该修剪，何时该重构，一目了然。"

# 示例 2：生成幽默东北话旁白，微调语速
python3 scripts/voiceover.py \
  --project funny-clip \
  --name voice-intro \
  --voice dongbei \
  --rate "+5%" \
  --text "老铁们，今天给大伙整一个绝活，千万别眨眼！"
```

生成完成后，终端会自动打印精确时长与 **Remotion 帧数建议**：
```text
✅ 配音生成成功！
  时长: 4.82 秒
  Remotion 对应帧数:
    - @24fps : 116 帧 (durationInFrames=116)
    - @30fps : 145 帧 (durationInFrames=145)
    - @60fps : 289 帧 (durationInFrames=289)
  字幕: public/my-video/audio/voice-01.srt
```

---

## 三、 在 Remotion 中引入配音与声画对齐

在 `src/projects/<slug>/` 的组件中，按照打印出的 `durationInFrames` 组织 `<Sequence>` 与 `<Audio>`：

```tsx
import { Audio, staticFile, Sequence } from "remotion";

export const MyFilm = () => {
  return (
    <>
      {/* 画面部分 */}
      <Sequence from={0} durationInFrames={116}>
        <TitleScene />
      </Sequence>

      {/* 配音音轨：精确对应 116 帧 */}
      <Sequence from={0} durationInFrames={116}>
        <Audio
          src={staticFile("my-video/audio/voice-01.wav")}
          volume={1.0}
        />
      </Sequence>

      {/* 背景音乐：人声出现时微调音量（Ducking） */}
      <Audio
        src={staticFile("my-video/audio/bgm.wav")}
        volume={(f) => (f < 116 ? 0.25 : 0.6)}
      />
    </>
  );
};
```

---

## 四、 常见问题与网络方案

1. **Edge TTS 遭遇网络限制或 403**：
   - 微软 Bing Speech 接口若在特定 IP 或数据中心受到频率限制，可通过 `--proxy` 参数配置本地代理：
     ```bash
     python3 scripts/voiceover.py --voice story --text "..." --proxy http://127.0.0.1:7890
     ```
2. **纯本地离线断网应急（macOS Say 引擎）**：
   - 当完全没有外网或代理不可用时，可开启 `--engine say`：
     ```bash
     python3 scripts/voiceover.py --engine say --text "纯离线应急配音" --out public/test.wav
     ```
3. **更高阶的本地开源模型（进阶需求）**：
   - 如需 5 秒零样本**声音克隆**或极致的情感微调，可参考本地部署的 **CosyVoice 2** 或 **GPT-SoVITS**，将生成的音频导出放入 `public/<slug>/audio/` 即可。
