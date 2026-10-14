#!/usr/bin/env python3
"""
Motion Lab — TTS & Voiceover Engine (Edge TTS & Local Workflows)

支持：
1. 场景音色快速索引与别名（深沉、影视解说、知性女声、童音、方言、中英双语等）
2. 本地快速试听与原生播放（afplay）
3. 项目配音生成（写入 public/<slug>/audio/，Remotion 标准 48kHz WAV / MP3）
4. 字幕生成（SRT / VTT）与 Remotion 帧数计算（24/30/60 fps）
5. 音频微调与母带级滤波（高通滤波、动态压限）
"""

import argparse
import asyncio
import os
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
SAMPLE_DIR = ROOT_DIR / "public/tts-samples"
SAMPLE_OSS_BASE = "https://staticok.oss-cn-hangzhou.aliyuncs.com/audio/samples"

# 核心场景预设音色库
VOICE_PRESETS = {
    # --- 1. 深沉男声 / 科技发布 / 纪录片 ---
    "deep": {
        "voice": "zh-CN-YunyangNeural",
        "gender": "男声",
        "name_cn": "云扬",
        "category": "深沉 / 科技发布 / 纪录片",
        "desc": "沉稳、专业、权威新闻腔，大厂发布会/硬核科技演示首选",
        "recommended_rate": "+0%",
        "sample": "zh-CN-YunyangNeural.mp3",
    },
    "tech": {
        "voice": "zh-CN-YunyangNeural",
        "gender": "男声",
        "name_cn": "云扬",
        "category": "科技发布",
        "desc": "沉稳有力、科技感强",
        "recommended_rate": "+0%",
        "sample": "zh-CN-YunyangNeural.mp3",
    },
    "en-deep": {
        "voice": "en-US-ChristopherNeural",
        "gender": "男声",
        "name_cn": "Christopher",
        "category": "英文 / 电影级深沉",
        "desc": "低沉醇厚、好莱坞预告片/权威纪录片旁白",
        "recommended_rate": "-5%",
        "sample": "en-US-ChristopherNeural.mp3",
    },

    # --- 2. 影视解说 / 故事叙述 / 爆款短视频 ---
    "story": {
        "voice": "zh-CN-YunxiNeural",
        "gender": "男声",
        "name_cn": "云希",
        "category": "影视解说 / 故事",
        "desc": "全网爆款解说音！阳光自然、节奏感极强、听感极度顺畅",
        "recommended_rate": "+0%",
        "sample": "zh-CN-YunxiNeural.mp3",
    },
    "jieshuo": {
        "voice": "zh-CN-YunxiNeural",
        "gender": "男声",
        "name_cn": "云希",
        "category": "影视解说",
        "desc": "短视频电影解说、剧情梳理",
        "recommended_rate": "+0%",
        "sample": "zh-CN-YunxiNeural.mp3",
    },
    "passion": {
        "voice": "zh-CN-YunjianNeural",
        "gender": "男声",
        "name_cn": "云健",
        "category": "激情 / 体育解说",
        "desc": "充满能量、高燃解说、动作片/运动场景",
        "recommended_rate": "+5%",
        "sample": "zh-CN-YunjianNeural.mp3",
    },

    # --- 3. 温暖知性 / 品牌叙事 / 舒缓女声 ---
    "warm": {
        "voice": "zh-CN-XiaoxiaoNeural",
        "gender": "女声",
        "name_cn": "晓晓",
        "category": "知性温暖 / 品牌叙事",
        "desc": "知性温柔、娓娓道来，品牌宣传片、生活日常与文艺散文首选",
        "recommended_rate": "-2%",
        "sample": "zh-CN-XiaoxiaoNeural.mp3",
    },
    "gentle": {
        "voice": "zh-CN-XiaoxiaoNeural",
        "gender": "女声",
        "name_cn": "晓晓",
        "category": "温和女声",
        "desc": "亲切温和",
        "recommended_rate": "-2%",
        "sample": "zh-CN-XiaoxiaoNeural.mp3",
    },
    "en-gentle": {
        "voice": "en-US-JennyNeural",
        "gender": "女声",
        "name_cn": "Jenny",
        "category": "英文 / 自然亲切",
        "desc": "地道美式自然女声，舒适亲切，品牌广告与教程通用",
        "recommended_rate": "+0%",
        "sample": "en-US-JennyNeural.mp3",
    },

    # --- 4. 童音 / 萌系卡通 ---
    "child-boy": {
        "voice": "zh-CN-YunxiaNeural",
        "gender": "男童",
        "name_cn": "云夏",
        "category": "童音 / 萌系男童",
        "desc": "清澈稚嫩、天真活泼，儿童向视频/趣味动画",
        "recommended_rate": "+0%",
        "sample": "zh-CN-YunxiaNeural.mp3",
    },
    "child-girl": {
        "voice": "zh-CN-XiaoyiNeural",
        "gender": "女童",
        "name_cn": "晓艺",
        "category": "童音 / 活泼女童",
        "desc": "软萌活泼、灵动可爱，卡通角色与少儿读物",
        "recommended_rate": "+0%",
        "sample": "zh-CN-XiaoyiNeural.mp3",
    },
    "en-child": {
        "voice": "en-US-AnaNeural",
        "gender": "女童",
        "name_cn": "Ana",
        "category": "英文 / 萌系童音",
        "desc": "超级可爱的欧美卡通童音，动画必备",
        "recommended_rate": "+0%",
        "sample": "en-US-AnaNeural.mp3",
    },

    # --- 5. 方言特色 (Dialects) ---
    "dongbei": {
        "voice": "zh-CN-liaoning-XiaobeiNeural",
        "gender": "女声",
        "name_cn": "辽宁小北",
        "category": "方言 / 东北话",
        "desc": "浓郁东北腔，幽默风趣、接地气、自带喜剧包袱",
        "recommended_rate": "+0%",
        "sample": "zh-CN-liaoning-XiaobeiNeural.mp3",
    },
    "shaanxi": {
        "voice": "zh-CN-shaanxi-XiaoniNeural",
        "gender": "女声",
        "name_cn": "陕西小妮",
        "category": "方言 / 陕西话",
        "desc": "纯朴明亮、地道西北风味，风土人情与特色短剧",
        "recommended_rate": "+0%",
        "sample": "zh-CN-shaanxi-XiaoniNeural.mp3",
    },
    "yue-male": {
        "voice": "zh-HK-WanLungNeural",
        "gender": "男声",
        "name_cn": "香港云龙",
        "category": "方言 / 粤语男声",
        "desc": "地道港式粤语男声，沉稳大气，港风短片与粤语区推广",
        "recommended_rate": "+0%",
        "sample": "zh-HK-WanLungNeural.mp3",
    },
    "yue-female": {
        "voice": "zh-HK-HiuMaanNeural",
        "gender": "女声",
        "name_cn": "香港晓曼",
        "category": "方言 / 粤语女声",
        "desc": "自然流畅粤语女声，亲切友好",
        "recommended_rate": "+0%",
        "sample": "zh-HK-HiuMaanNeural.mp3",
    },
    "taiwan-male": {
        "voice": "zh-TW-YunJheNeural",
        "gender": "男声",
        "name_cn": "台湾云哲",
        "category": "方言 / 台湾国语男声",
        "desc": "温柔软萌台腔，邻家大男孩风格，治愈系 Vlog",
        "recommended_rate": "+0%",
        "sample": "zh-TW-YunJheNeural.mp3",
    },
    "taiwan-female": {
        "voice": "zh-TW-HsiaoChenNeural",
        "gender": "女声",
        "name_cn": "台湾晓臻",
        "category": "方言 / 台湾国语女声",
        "desc": "甜美轻柔台妹腔，清新自然，美妆/开箱/日常",
        "recommended_rate": "+0%",
        "sample": "zh-TW-HsiaoChenNeural.mp3",
    },

    # --- 6. 中英双语混读 / Copilot 系列 ---
    "bilingual-male": {
        "voice": "en-US-AndrewMultilingualNeural",
        "gender": "男声",
        "name_cn": "Andrew (多语言)",
        "category": "多语言 / 中英混读男声",
        "desc": "微软最新多语言神经网络，中文+英文夹杂发音丝滑不卡顿",
        "recommended_rate": "+0%",
        "sample": "en-US-AndrewMultilingualNeural.mp3",
    },
    "bilingual-female": {
        "voice": "en-US-AvaMultilingualNeural",
        "gender": "女声",
        "name_cn": "Ava (多语言)",
        "category": "多语言 / 中英混读女声",
        "desc": "现代感强、亲和度高，跨国科技产品介绍首选",
        "recommended_rate": "+0%",
        "sample": "en-US-AvaMultilingualNeural.mp3",
    },
}

ALIAS_MAP = {
    "yue": "yue-male",
    "cantonese": "yue-male",
    "taiwan": "taiwan-female",
    "child": "child-boy",
    "bilingual": "bilingual-male",
    "copilot": "bilingual-male",
}


def resolve_voice_info(query: str):
    q = query.strip()
    if q in ALIAS_MAP:
        q = ALIAS_MAP[q]
    if q in VOICE_PRESETS:
        info = VOICE_PRESETS[q].copy()
        info["key"] = q
        return info
    # Search by full voice name
    for k, v in VOICE_PRESETS.items():
        if v["voice"].lower() == q.lower():
            info = v.copy()
            info["key"] = k
            return info
    # Return as raw voice
    return {
        "key": "custom",
        "voice": q,
        "gender": "未知",
        "name_cn": q,
        "category": "自定义音色",
        "desc": "用户指定的原生音色 ID",
        "recommended_rate": "+0%",
        "sample": f"{q}.mp3",
    }


def list_voices():
    print("\n" + "=" * 90)
    print("🎬 Motion Lab 视频配音场景音色库 (Edge TTS Presets)")
    print("=" * 90)
    print(f"{'快捷别名':<16} | {'音色角色':<12} | {'性别':<5} | {'场景类型':<22} | {'特点描述'}")
    print("-" * 90)
    for k, v in VOICE_PRESETS.items():
        print(f"{k:<16} | {v['name_cn']:<12} | {v['gender']:<5} | {v['category']:<22} | {v['desc']}")
    print("-" * 90)
    print("💡 使用方式示例：")
    print("  python3 scripts/voiceover.py --voice deep --text '科技改变世界' --project my-film")
    print("  python3 scripts/voiceover.py --play story               # 试听影视解说音")
    print("  python3 scripts/voiceover.py --play dongbei             # 试听东北话")
    print("  python3 scripts/voiceover.py --fetch-samples            # 本地缓存全部试听音频")
    print("=" * 90 + "\n")


def fetch_samples():
    """下载常用场景试听音频到 public/tts-samples/，方便离线快速试听"""
    SAMPLE_DIR.mkdir(parents=True, exist_ok=True)
    print(f"📥 正在同步试听样本到: {SAMPLE_DIR} ...")
    success = 0
    unique_samples = set(v["sample"] for v in VOICE_PRESETS.values())
    for s in sorted(unique_samples):
        target = SAMPLE_DIR / s
        if target.exists() and target.stat().st_size > 0:
            success += 1
            continue
        url = f"{SAMPLE_OSS_BASE}/{s}"
        try:
            print(f"  ↓ 下载 {s} ...", end=" ", flush=True)
            urllib.request.urlretrieve(url, str(target))
            print("✓")
            success += 1
        except Exception as e:
            print(f"✗ 失败: {e}")
    print(f"\n✨ 同步完成！共准备好 {success}/{len(unique_samples)} 个场景试听文件。")


def play_sample(voice_query: str):
    """在 macOS 终端直接通过 afplay 试听该音色"""
    info = resolve_voice_info(voice_query)
    sample_name = info["sample"]
    target = SAMPLE_DIR / sample_name
    if not target.exists() or target.stat().st_size == 0:
        SAMPLE_DIR.mkdir(parents=True, exist_ok=True)
        url = f"{SAMPLE_OSS_BASE}/{sample_name}"
        print(f"📥 正在获取试听音频: {url} ...")
        try:
            urllib.request.urlretrieve(url, str(target))
        except Exception as e:
            print(f"❌ 下载试听音频失败: {e}")
            return

    print(f"\n▶ 正在播放试听 [{info['name_cn']}] ({info['voice']})")
    print(f"  类型: {info['category']}")
    print(f"  描述: {info['desc']}")
    print(f"  文件: {target}\n")

    if sys.platform == "darwin":
        subprocess.run(["afplay", str(target)])
    else:
        print(f"音频已保存在: {target}")


async def synthesize_edge(text: str, voice: str, rate: str, pitch: str, raw_mp3_path: Path, vtt_path: Path = None, proxy: str = None):
    """调用 edge-tts 生成音频"""
    try:
        import edge_tts
    except ImportError:
        raise RuntimeError("未检测到 edge_tts 模块，请先运行: python3 -m pip install --user edge-tts")

    # 自动检查代理
    proxy = proxy or os.environ.get("HTTP_PROXY") or os.environ.get("ALL_PROXY") or os.environ.get("http_proxy")
    communicate = edge_tts.Communicate(text=text, voice=voice, rate=rate, pitch=pitch, proxy=proxy)
    submaker = edge_tts.SubMaker() if vtt_path else None

    with open(raw_mp3_path, "wb") as f:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary" and submaker:
                submaker.feed(chunk)

    if submaker and vtt_path:
        with open(vtt_path, "w", encoding="utf-8") as f:
            f.write(submaker.get_srt())


def process_audio_remotion(raw_audio: Path, out_path: Path, apply_filter: bool = True):
    """
    将音频转码为 Remotion/影视工业标准: 48000Hz, 双声道 16-bit PCM WAV 或高质量 MP3，
    并应用人声母带微处理（低频 70Hz 滚降切除喷麦、动态适度压限）。
    """
    cmd = ["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-i", str(raw_audio)]
    if apply_filter:
        # highpass 70Hz: 过滤超低频呼吸与桌动噪音
        # acompressor: 平滑轻重音，避免音量忽大忽小
        cmd.extend(["-af", "highpass=f=70,lowpass=f=12000,acompressor=threshold=0.18:ratio=2.5:attack=10:release=100"])
    
    if out_path.suffix.lower() == ".wav":
        cmd.extend(["-ar", "48000", "-ac", "2", str(out_path)])
    else:
        cmd.extend(["-ar", "48000", "-ac", "2", "-b:a", "192k", str(out_path)])
    
    subprocess.run(cmd, check=True)


def get_audio_duration_seconds(audio_path: Path) -> float:
    cmd = ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(audio_path)]
    p = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return float(p.stdout.strip())


def main():
    parser = argparse.ArgumentParser(description="Motion Lab 视频配音系统")
    parser.add_argument("--list", action="store_true", help="列出所有内置场景音色及推荐场景")
    parser.add_argument("--fetch-samples", action="store_true", help="本地缓存所有场景音色试听文件")
    parser.add_argument("--play", metavar="VOICE", help="在终端直接试听指定音色，如 --play deep, --play story, --play dongbei")
    parser.add_argument("--text", type=str, help="需要配音的文案内容")
    parser.add_argument("--file", type=str, help="从文本文件读取文案")
    parser.add_argument("--voice", type=str, default="deep", help="音色别名或完整ID，如 deep, story, warm, child-boy, dongbei, yue-male 等")
    parser.add_argument("--project", type=str, help="项目 slug，音频将输出至 public/<slug>/audio/")
    parser.add_argument("--out", type=str, help="自定义输出音频文件路径")
    parser.add_argument("--name", type=str, default="voice-01", help="音频文件基础名称（默认 voice-01）")
    parser.add_argument("--rate", type=str, default="+0%", help="语速调节，如 +0%%, -5%%, +10%%")
    parser.add_argument("--pitch", type=str, default="+0Hz", help="音高调节，如 +0Hz, -2Hz")
    parser.add_argument("--proxy", type=str, help="网络代理地址，如 http://127.0.0.1:7890")
    parser.add_argument("--engine", choices=["edge", "say"], default="edge", help="TTS 引擎：edge 或 say(macOS离线)")
    parser.add_argument("--subtitles", action="store_true", default=True, help="是否生成同名字幕文件(.srt)")
    parser.add_argument("--no-filter", action="store_true", help="关闭 ffmpeg 人声母带滤波")

    args = parser.parse_args()

    if args.list:
        list_voices()
        return

    if args.fetch_samples:
        fetch_samples()
        return

    if args.play:
        play_sample(args.play)
        return

    # 获取输入文本
    text = args.text
    if not text and args.file:
        with open(args.file, "r", encoding="utf-8") as f:
            text = f.read().strip()

    if not text:
        parser.print_help()
        print("\n❌ 请提供需要配音的文案内容，例如：--text '欢迎收看' 或 --list 查看音色")
        return

    info = resolve_voice_info(args.voice)
    voice_id = info["voice"]

    # 确定输出目录和路径
    if args.project:
        out_dir = ROOT_DIR / "public" / args.project / "audio"
    elif args.out:
        out_dir = Path(args.out).parent
    else:
        out_dir = ROOT_DIR / "public/generated-audio"

    out_dir.mkdir(parents=True, exist_ok=True)

    base_name = args.name
    if args.out:
        out_audio = Path(args.out)
    else:
        out_audio = out_dir / f"{base_name}.wav"

    raw_mp3 = out_dir / f".temp-{base_name}.mp3"
    srt_file = out_dir / f"{base_name}.srt" if args.subtitles else None

    print(f"\n🎙 准备生成视频配音...")
    print(f"  文案: \"{text[:40]}{'...' if len(text)>40 else ''}\"")
    print(f"  音色: {info['name_cn']} [{voice_id}] ({info['category']})")
    print(f"  语速: {args.rate} | 音高: {args.pitch}")
    print(f"  输出: {out_audio}")

    # 合成
    try:
        if args.engine == "edge":
            asyncio.run(synthesize_edge(
                text=text,
                voice=voice_id,
                rate=args.rate,
                pitch=args.pitch,
                raw_mp3_path=raw_mp3,
                vtt_path=srt_file,
                proxy=args.proxy
            ))
        else:
            # macOS 本地 say 兜底
            print("  [引擎: macOS say 离线生成]")
            aiff_temp = out_dir / f".temp-{base_name}.aiff"
            say_voice = "Tingting" if "zh" in voice_id else "Samantha"
            subprocess.run(["say", "-v", say_voice, "-o", str(aiff_temp), text], check=True)
            raw_mp3 = aiff_temp

        # Remotion 48kHz 标准转码 + 人声滤波
        process_audio_remotion(raw_mp3, out_audio, apply_filter=not args.no_filter)
        raw_mp3.unlink(missing_ok=True)

        duration = get_audio_duration_seconds(out_audio)
        frames_24 = round(duration * 24)
        frames_30 = round(duration * 30)
        frames_60 = round(duration * 60)

        print("\n✅ 配音生成成功！")
        print(f"  时长: {duration:.2f} 秒")
        print(f"  Remotion 对应帧数:")
        print(f"    - @24fps : {frames_24} 帧 (durationInFrames={frames_24})")
        print(f"    - @30fps : {frames_30} 帧 (durationInFrames={frames_30})")
        print(f"    - @60fps : {frames_60} 帧 (durationInFrames={frames_60})")
        if srt_file and srt_file.exists():
            print(f"  字幕: {srt_file}")
        print()

    except Exception as e:
        print(f"\n❌ 配音生成失败: {e}")
        if "403" in str(e):
            print("\n💡 提示: 微软 Edge TTS 接口对部分未授权网络返回了 403 阻断。")
            print("  解决方案 1: 配置代理重试，例如添加参数 --proxy http://127.0.0.1:7890")
            print("  解决方案 2: 使用 macOS 本地离线引擎应急: 添加 --engine say")
            print("  解决方案 3: 本地部署 CosyVoice 2 / GPT-SoVITS 离线大模型")


if __name__ == "__main__":
    main()
