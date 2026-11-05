# Outside the Window — B1→B2 sample (20.5 s, English)

This sample covers the first two beats of [the script](../script.en.md): inside the window, then the door opens onto the sea. It tests three things before the full film is built:

- Do the windows, the sea and the three light dots look good?
- Does "stepping out of the chat window" read at a glance?
- Does the synthesized piano hold up?

## What happens

| Time | Shot | Picture | Sound | Narration (Edge TTS, en-US-AndrewNeural −12 %) |
|---|---|---|---|---|
| 0:00–7.0 | A · macro | Through frosted glass, three teal dots bounce (typing) while lines of light write themselves above them. At 6.2 s they stop and press against the glass one by one; where they touch, the frost clears. | Muffled piano: half a melody in D that stops on an unresolved E as the dots stop. Soft muffled ticks, three fingertip taps on glass. | "Today, every AI lives in its own window." / "It can answer almost anything." |
| 7.0–11.0 | A · pull-back | One continuous move out of the macro: the window turns out to be a chat bubble among thousands of frosted windows hanging in the dark (bubbles, terminals, round voice windows, tiles), each with its own dots. | Thousands of muffled fragments and a low hum swell. The sound cuts hard with the picture. | "It just can't reach outside." |
| 11.0–14.0 | B · inside | Inside the window, behind the dots. A seam of light draws the door, and the door swings out. Through it: a calm night sea, a low moon, a glitter path leading to the door, a few lights far away. The dots lean out, then hop. | A rising glassy shimmer; the door unseals; the filter and the reverb open; the sea comes in. The phrase starts again, now open. | "What if there were an open world outside?" |
| 14.0–20.5 | C · low wide | Low across the water. The dots land, and three ripples spread. Further off, a terminal window and a round window open their doors one after another, and violet and amber dots step out onto the sea. | Three tonal drops (D, F#, B). The hanging E is answered by the terminal (A) and then the round window (C#), so the three AIs on the water spell an A-major chord that hasn't resolved yet. | "Any AI could walk in —" / "whoever made it, whatever it runs on." |

## Files

| Piece | File |
|---|---|
| Timeline, layout, camera, dots, VO placement, subtitles. The picture and the sound share it. | `src/projects/outside-the-window-20261104/sample/sampleLayout.ts` |
| three.js engine | `src/projects/outside-the-window-20261104/sample/sampleEngine.ts` |
| Composition `OutsideWindowSample` (615 f, 30 fps, 1080p) | `src/projects/outside-the-window-20261104/sample/OutsideWindowSample.tsx` |
| Score, SFX, VO processing and mix, all synthesized | `projects/outside-the-window-20261104/sample/sample-sound.mjs` → `public/outside-the-window-20261104/audio/sample-mix.wav` |
| VO takes (four voices, B1 and B2 lines) | `public/outside-the-window-20261104/audio/vo-b{1,2}-{andrew12,andrew,ava,christopher,jenny}.wav` |

What the engine renders:

- Edge-lit frosted glass, with the dots' light scattering on the pane and clear spots where they touch it.
- About 5,000 instanced windows.
- A planar-reflection sea with swell, landing ripples, a moon glitter path and light pools.
- 16–24 accumulated sub-frames per frame (motion blur + lens blur), then bloom, ACES and a film finish.

Rebuild:

```bash
node projects/outside-the-window-20261104/sample/sample-sound.mjs
npx remotion render src/index.ts OutsideWindowSample renders/outside-the-window-sample-v1-1080p.mp4 --codec h264 --crf 18 --gl=angle --concurrency 3
```

To switch the voice, change `file` in `VO` (sampleLayout.ts) to another take. Then re-measure the sentence gaps (`src`, `speech`, `dur`), re-run the sound script and re-render.

## QC (2026-11-04)

- **Final:** `renders/outside-the-window-sample-v2-1080p.mp4`. v1 is kept. The only change in v2: darker hero-window walls, so they read as glass rather than a plastic bezel, and dimmer dots in the doorway shot, so they no longer burn out the moon path.
- **Stream:** H.264 1920×1080, 30 fps, 615 frames, 20.5 s; AAC 48 kHz stereo; 31.9 MB. `tsc --noEmit` passes.
- **Frame scan** of v1 and v2: all 615 frames decode, with no black or flash frames. Mean luma runs from 0 (fade in) to 46–62 in the macro, ~6 in the dark wide, 59 through the open door, 40–44 in the low wide, and back to 0.
- **After v2:** five shader `smoothstep` calls with reversed edges (a NaN risk on ANGLE) were rewritten as `1.0 - smoothstep(lo, hi, x)`. The math is identical, so v2's frames are unaffected; the change only protects future renders.
- **Sync,** measured on the audio extracted from the v1 MP4 (v2's audio is the same mix):
  - glass taps at 6.696 / 6.860 s (expected 6.693 / 6.860);
  - the murmur's hard cut at 11.000 s, on the picture cut;
  - landing drops at 14.255 / 14.450 / 14.695 s (expected 14.267 / 14.467 / 14.667, so within one frame).
  - Not measurable by onset: the door thump, which is masked by the sea's low end, and the two answering chimes, which are masked by the narration. Both are placed from the same timeline.
- **Mix:**
  - Peak −1.6 dBFS, RMS −19.3 dBFS, 0 clipped samples.
  - Narration sits at −16 to −17.6 dB RMS in every line, with the piano 14–27 dB below it.
  - The pull-back, which has no narration, runs at −28.6 dB.
  - Spectrogram: `renders/qc/otw-sample/mix-spectrogram.png`.
- **Picture review:** look-dev rounds are in `renders/qc/otw-sample/dev1…dev6`; consecutive-frame strips from the MP4 are in `renders/qc/otw-sample/strips/`. Fixed during review:
  - teal haze washing out the macro;
  - dots blowing out to white;
  - far windows reading as grey plastic boxes (now thin, dark, edge-lit glass that also glows through its back);
  - the macro framed so low that the answers sat at the top edge;
  - the pull-back target diving behind the window;
  - a too-dark door reveal (now a low moon with a glitter path that leads to the door);
  - the far windows' doors reading as white buttons;
  - foreground clutter in the wide;
  - dots under the subtitles at the start of the pull-back.
- **Not verified:** nobody has watched it with sound yet, so the piano's timbre, the narration voice and the overall feel are UNVERIFIED. The Edge TTS terms are also unverified. Verdict: **UNVERIFIED — NOT DIRECTOR_APPROVED** until a person has watched it with sound.

## Sources and rights

- **Picture:** everything is procedural three.js; no third-party footage, images or models.
- **Sound:** everything is synthesized in `sample-sound.mjs`; no third-party music or sound effects.
- **Narration:** Edge TTS through `scripts/voiceover.py`, `--no-filter` (the bundled ffmpeg lacks the mastering filters). The commercial terms of Edge TTS still need review.
- **Subtitle font:** Segoe UI, a Windows system font, rasterized into the video only.
- **On screen:** no brand, logo, URL or product term appears, and nothing claims a product exists.
