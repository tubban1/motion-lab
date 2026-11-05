# Vibe Monitor 1.0 — visual-first full film (62 s, 2026-11-04)

This film rebuilds the v2 data film (`VibeMonitorDataFilm`, which is kept unchanged) with the visual-first method from the A/B sample. It uses the same eight Edge TTS lines and the same Neon snapshot numbers. One 3D world runs from the first keystroke to the end card, and picture, typography and sound all share one clock.

## Story in one world

| Beat | Frames | VO | Picture |
|---|---|---|---|
| B1 Velocity | 0–180 | vo-01 | Black; one caret blinks, then a file writes itself line by line. Next, a front of code spreads exponentially across 2,000+ files and outruns the camera's pull-back. |
| B2 Tangle | 180–360 | vo-02 | The sample's shot unchanged: floors stack on their code files, dependency arcs turn red, the core pulses, bullet-time freeze. |
| B3 Reveal | 360–520 | vo-03 | Impact; a scan wave lights the code; the city flies into the V; title. |
| B4 Session MCP | 520–820 | vo-04 | The V goes dormant. Three session beams (Codex, Claude Code, Cursor) land, link to the hub, and the V ignites. The sessions end, the light drains back into the hub and it switches off. Then ~1.5 s of dark, almost silent stillness ("不常驻后台"). |
| B5 13 monitors | 820–1125 | vo-05 | One scan plane relights the V floor by floor, and 13 monitor rings unfold. Evidence motes collect on the rooftops; S1/S2 stay quiet. Two rings turn gold with their family names, and one building gets a gold beacon. |
| B6 Real telemetry | 1125–1370 | vo-06 | A crane out to 197 towns, one per observed project instance; the on-screen counter equals the number of lit towns. Telemetry sparks rise. Numbers: 197 · 7.7 万 · 685 · 3,476 · 24/18. |
| B7 Local first | 1370–1636 | vo-07 (+ vo-08 "Apache 2.0 开源") | Back down to the V inside the machine boundary (dome). Source tokens rise and stop at the dome; tiny metric dots pass through. A structural scan runs, labelled "大模型调用 · 无". The dome then dissolves from the top ("open"). |
| B8 Install | 1636–1860 | vo-08 | A hard cut to a ground-level macro, rhyming with the opening: the install command types itself on the ground. A crane up follows, where this time the code front and the V light up together on "跟上". End lockup. |

## Files

| Piece | File |
|---|---|
| Timeline, layout, camera, projection (shared by picture + sound) | `src/projects/vibe-monitor-1-0-data-20261103/film/filmLayout.ts` |
| three.js renderer (code carpet on the GPU, city, beams, rings, towns, dome, install line; 12–24 sub-frame motion/lens blur; bloom; ACES; film finish) | `src/projects/vibe-monitor-1-0-data-20261103/film/filmEngine.ts` |
| Composition `VibeMonitorVisualFilm` (1860 f, 30 fps, 1080p): subtitles, labels pinned to 3D points, data table, lockups | `src/projects/vibe-monitor-1-0-data-20261103/film/VibeMonitorVisualFilm.tsx` |
| Score, SFX and mix, all synthesized, plus VO processing | `projects/vibe-monitor-1-0-data-20261103/film/film-sound.mjs` → `public/.../audio/film-mix.wav` |
| Shot plan / route / assets | `shotlist.json` (validate_plan `--mode final` PASS), `production-route.json`, `assets-manifest.json` in this folder |

Rebuild:

```bash
node projects/vibe-monitor-1-0-data-20261103/film/film-sound.mjs
npx remotion render src/index.ts VibeMonitorVisualFilm renders/vibe-monitor-1-0-visual-film-v1-1080p.mp4 --codec h264 --crf 20 --gl=angle --concurrency 3
```

`--gl=angle` (GPU) is required in practice. A batch still renderer that bundles once (`@remotion/renderer` `renderStill` in a loop) takes about 1–2 s per frame; it was used for the look-dev reviews.

## Data and claims

- The numbers come from `src/projects/vibe-monitor-1-0-data-20261103/data.json`. That file is the production Neon read-only check snapshot of 2026-10-21 (`live: false`). The corner note on screen says so, and that the dot layout is illustrative. Running `refresh-neon-data.mjs` with the user's `.env` path, then re-rendering, updates every number. The town count follows `data.projects`, so 197 towns are drawn.
- The code city, the dependency arcs and the evidence motes are visual metaphors. They are not user code or telemetry positions.
- The on-screen product facts are the session-scoped stdio MCP, the 13 families with their names, S1/S2 staying quiet with at most 2 families per notice, no source upload, no LLM in structural scans, Apache-2.0, and the install command. All of them come from the open-source README. The install line is the short form, the same one the v2 film used. The README's form adds `--registry=https://registry.npmjs.org`.
- No third-party footage, images, music or SFX. The VO uses Edge TTS (zh-CN-YunyangNeural), whose commercial terms still need review. Fonts are Noto Sans SC (OFL), Bahnschrift and Consolas (Windows system fonts), and they are only rasterized into the video.

## QC (2026-11-04)

- **Final:** `renders/vibe-monitor-1-0-visual-film-v3-1080p.mp4`. v1/v2 are kept.
- **Technical checks:**
  - `tsc` passes, and `validate_plan --mode final` passes.
  - All 1860 frames decode.
  - Sync was measured on the rendered audio and every event is within 10 ms of picture:
    - impact at 12.005 s;
    - heartbeats at 9.505, 10.005 and 10.505 s;
    - the "跟上" landing at 57.210 s;
    - the first install keystroke at 54.695 s.
  - The "不常驻后台" stillness measures −62.8 dB.
- **Picture review:** look-dev stills, transition stills and consecutive-frame strips from the MP4 are in `renders/qc/vm-film/`. Fixed during review, v1 → v3:
  - macro framing and a teal ground sheen in the opening;
  - cross-fading subtitles;
  - the V reading as a check mark (now near-frontal);
  - the scan disk was too big and bright;
  - the data table layout and its legibility;
  - town debris during the dive (they now sink);
  - the final crane brushing the V's buildings (it now rises first);
  - type left on the black last frame;
  - over-hot logo glints.
- **Mix:** peak −1.6 dBFS, RMS −21.1 dBFS, 0 clipped samples. VO sits 12–30 dB above the bed in every line. `renders/qc/vm-film/mix-spectrogram.png` shows the structure.
- **Not verified:** nobody has listened to the mix; the Edge TTS commercial terms are unchecked; the data is the 10-21 snapshot, not a live query. The verdict is `UNVERIFIED — NOT DIRECTOR_APPROVED` until a person watches and listens (see `director-audit.md`).
