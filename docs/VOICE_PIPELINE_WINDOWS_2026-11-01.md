# Motion Lab — Windows TTS acceptance and dual-engine workflow

Date: 2026-11-01
Status: **Qwen 0.6B basic technical acceptance PASS; acoustic/semantic acceptance NOT YET PASS.** Production narrator remains Edge TTS.

## Working engines
- **Edge TTS**: existing Python 3.14 edge-tts 7.3.1, production default. Requires network. Supports Mandarin/English and dedicated Hong Kong Cantonese `zh-HK` voices. A failed network call must not silently be marked successful.
- **Qwen3-TTS 12Hz 0.6B CustomVoice**: independent Python 3.12 venv `%LOCALAPPDATA%\\MotionLab\\qwen3-tts-venv`, CPU-only PyTorch 2.15.0. Weights in `%LOCALAPPDATA%\\MotionLab\\hf-cache`, all 13 files downloaded. Official Qwen feature matrix does not certify 0.6B instruction-style emotion control; 1.7B CustomVoice supports it. Do not pretend 0.6B respects pitch, exact speed, or emotional prompt.
- **Unified CLI**: `scripts/voice-library/voice_router.py` with explicit `--engine edge|qwen`, source text, voice, project and cache. No automatic Qwen selection or silent Edge fallback. The existing `scripts/prosody/rhythm_engine.py` continues to own phrase-level pacing and film timing with Edge as its default.

## Real Qwen samples (Windows CPU)
| ID | Voice | Audio (s) | Generation (s) | RTF |
| --- | --- | ---: | ---: | ---: |
| zh-male | Uncle_Fu | 9.92 | 70.438 | 7.101 |
| zh-female | Serena | 3.20 | 24.779 | 7.743 |
| en-male | Ryan | 7.44 | 49.766 | 6.689 |
| zh-dialect | Dylan | 3.28 | 21.930 | 6.686 |

All four are real 24kHz PCM16 WAVs with SHA256 fingerprints, finite samples, nonzero duration and zero clipping. Model loads in roughly 10–14 seconds from an existing offline cache. These numbers **do not** attest to accurate transcription, natural expression or commercial acceptance.

The unified Qwen route also generated a separate Ryan WAV for `Hello.`: **9.76s audio, 68.28s generation, RTF 6.996**. This suspiciously long result is a **semantic/listening blocker** until human audition or ASR establishes no repetition/hallucination. Audio amplitude shows ~65% active windows, not merely a long silent tail.

## Edge same-text comparison
- zh-male / YunyangNeural: 4.224s audio, 8.909s request, RTF 2.109
- zh-female / XiaoxiaoNeural: 4.128s audio, 4.607s request, RTF 1.116
- en-male / ChristopherNeural: 4.848s audio, around 19.69s request, RTF 4.061; command timed out during/after completion, so investigate network and task cleanup before treating it as reliable production timing
- zh-dialect / YunxiNeural: 3.720s audio, 1.459s request, RTF 0.392

Edge latency includes network variability; compare on identical text, not only on a single RTF run.

## Motion Lab commands (run at repository root in Windows)
```powershell
npm run voice:catalog
npm run voice:render -- --engine edge --voice zh-CN-YunyangNeural --text "我们继续。" --project voice-qa
npm run voice:render -- --engine qwen --voice Serena --language Chinese --text "她没有回头。" --project voice-qa
npm run voice:qa
npm run rhythm:test
```
Files are written to `public/<project>/audio/`, with a SHA-256 receipt alongside each clip. The user must explicitly select Qwen. If `zh-HK` Cantonese is required, choose an approved Edge `zh-HK-...Neural` speaker; Qwen 0.6B Cantonese has NOT been accepted. Use `--clip` to assign a stable filename. Once trusted, the resulting public web path can be placed in a Remotion composition. The current production timeline has **not** been switched or rewritten.

## Quality and promotion gates
1. Human listening for Mandarin, English and Cantonese: naturalness, intelligibility, emotion match and cross-clip consistency, each >=4/5.
2. Check transcript fidelity with human review or an independent ASR model; the unusually long one-word Qwen clip is a hard blocker.
3. Compare 30s and 90s narration sequences for breath-like phrasing, emphasis, silence distribution, tempo transitions, missing/repeated words and scene alignment. No fake breathing or synthetic inhalation effects.
4. Record per-device CPU/GPU and memory; Qwen CPU RTF is 6.7–7.7 today, far slower than interactive playback. Do not download 1.7B until a suitable acceleration strategy or a compelling use case justifies it.
5. Cache by text/voice/engine and SHA; maintain retry/timeout for online Edge. Never silently swap engines.
6. Verify dataset/media rights before commercial use. `Parler-TTS / LibriTTS-R Speaker Descriptions` is CC BY 4.0. Mozilla Common Voice is CC0. EmoV-DB/ESD are restricted; WenetSpeech4TTS labels mention CC BY 4.0 but actual terms explicitly restrict audio use to noncommercial research. No bulk dataset download was made.

## Evidence locations
- `projects/voice-library/annotated-voices.json` — 27 voice presets and 8 dataset references.
- `projects/voice-library/acceptance/qwen3-0.6b/acceptance.json` — official local sample measurements.
- `projects/voice-library/acceptance/qwen3-0.6b/acoustic-qa.json` — windowed loudness / silence checks, NOT human hearing.
- `projects/voice-library/acceptance/qwen3-0.6b/edge-comparison.json` — same-text Edge results.
- `scripts/voice-library/qwen3_acceptance.py`, `acoustic_qa.py`, `edge_comparison.py` — reproducible QA.
- `scripts/voice-library/voice_router.py`, `qwen_render_single.py` — dual-engine CLI.

Official model features: https://qwen.ai/blog?id=qwen3tts-0115
Do not remove the working offline model cache or switch the production engine just because these acceptance files exist.

## Final technical smoke / repository state
- `npm run voice:render -- --engine qwen --voice Ryan --language English --text 'Hello.' --project voice-qa --clip router-qwen-smoke` returned `cached: true` with an explicit `SHORT_TEXT_EXCESS_DURATION_REVIEW_REQUIRED` warning; it did not re-run the model.
- `voice_router.py` created real Edge and Qwen outputs with readable sidecar receipts. The English Edge comparison MP3 exists even though the cleanup/terminal command was timed out.
- Tests: 6/6 voice-router and 10/10 original prosody tests passed; all new Python scripts passed `py_compile`.
- Changes remain local/uncommitted on `main`, which already had unrelated uncommitted changes. No broad commit/push and no production timeline rewrite were performed.

## Human listening page (offline)
Open `C:\\Users\\i95i\\mcp-workspace\\motion-lab\\public\\voice-qa\\audition.html` in Windows Chrome/Edge. This static page pairs 4 real Qwen WAVs and 4 same-text Edge MP3s, plus a separate anomalous `Hello.` clip. It provides 1–5 ratings for naturalness, pronunciation, emotion match and continuity, local form persistence, and manual JSON export. Ten real audio files are present under `public/voice-qa/audio/` and ignored by Git; the HTML page itself is tracked when intentionally committed. Opening the page is only a human review step, not evidence that listening has occurred.
