# Vibe Monitor 1.0 — visual-first A/B sample (2026-11-04)

Same facts and the same Edge TTS voice lines as v2 film 0:06–0:18 (vo-02 + vo-03), rebuilt visual-first as one continuous shot.

**Concept:** a code city builds itself floor by floor (功能一层层叠上去) → dependency arcs multiply and turn red (依赖越缠越紧) → the core module pulses red, time freezes in a bullet-time orbit (直到没人敢改) → an impact sends a scan wave out of the core, red turns teal → the buildings fly into formation while the camera cranes to top-down: the city *is* the Vibe Monitor V → title lands (Vibe Monitor 1.0 / AI 编程时代的本地架构顾问).

| Piece | File |
|---|---|
| Shared timeline + layout (picture and sound use the same clock) | `src/projects/vibe-monitor-1-0-data-20261103/sample/cityLayout.ts` |
| three.js renderer: 12–16 sub-frame motion blur, HDR bloom, ACES, grain/vignette/CA | `src/projects/vibe-monitor-1-0-data-20261103/sample/cityEngine.ts` |
| Composition `VibeMonitorVisualSample` (360f, 30fps, 1080p) | `src/projects/vibe-monitor-1-0-data-20261103/sample/VibeMonitorVisualSample.tsx` |
| Sound design + mix (all synthesized; VO EQ/compression/peak limiting, ducking, Freeverb, limiter) | `projects/vibe-monitor-1-0-data-20261103/sample/sound-design.mjs` → `public/.../audio/sample-mix.wav` |

Rebuild:

```bash
node projects/vibe-monitor-1-0-data-20261103/sample/sound-design.mjs
npx remotion render src/index.ts VibeMonitorVisualSample renders/vibe-monitor-1-0-visual-sample-v2-1080p.mp4 --codec h264 --crf 17 --gl=angle --concurrency 3
```

`--gl=angle` (GPU) is required in practice; software GL would be very slow with 12–16 samples per frame.

**Assets / rights:** no third-party footage, music or SFX. All visuals are generated geometry; all music/SFX are synthesized in `sound-design.mjs`. VO = existing Edge TTS clips (commercial terms still need review, same as v2). Fonts: Bahnschrift (Windows system font) and Noto Sans SC (SIL OFL), rendered from the local system install.

**Claims:** the city is a visual metaphor (not user code or real telemetry). The only on-screen claims are the product name/version and the official tagline.

## QC (2026-11-04, v2)

- `renders/vibe-monitor-1-0-visual-sample-v2-1080p.mp4`: H.264 1920×1080 30fps + AAC 48 kHz stereo, 12.01 s, all frames decode. v1 kept for reference.
- Picture: storyboard stills, contact sheet and consecutive-frame strips (drop, impact, flight, title) all reviewed. Fixed during review: NaN black frame from a reversed `smoothstep` (f190), stepped motion blur (6 → 12/16 samples), over-bloom, the ping rings crossing the title, and the impact white-out (reduced; the impact is still a deliberate ~0.2 s bright beat).
- Audio: peak −1.4 dBFS, RMS −20.5 dBFS, 0 clipped samples; VO ~9 dB above the bed; the master limiter is idle (VO has its own −3 dBFS peak limiter). In the MP4, the impact onset is at 6.005 s (frame 180) and the heartbeats at 3.505/4.005/4.505 s (frames 105/120/135); the freeze is −40.9 dBFS silence.
- **Not verified:** nobody has listened to the mix (the sound was checked numerically only). Edge TTS commercial terms are unchecked. Loudness differs: the sample is ~9 dB louder than the v2 film, so match volume before an A/B judgement.
