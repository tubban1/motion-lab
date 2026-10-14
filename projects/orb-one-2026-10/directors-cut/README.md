# ORB ONE — Director's Cut

## Delivery
- renders/orb-one-directors-cut-2026-10.mp4 — 1920×1080, 24fps, 53.76 sec, H.264 + AAC.
- renders/orb-one-directors-cut-poster.png — final poster image.
- renders/orb-directors-final-qc.jpg — sampled video QC contact sheet.

## Source & structure
- src/projects/orb-one/OrbOneDirectorsCut.tsx — Remotion editable timeline.
- projects/orb-one-2026-10/directors-cut/render_product.py — Blender product / room / camera / materials / light setups.
- projects/orb-one-2026-10/directors-cut/build_sound.py — original 96 BPM impact, rolling and jump sound design.
- public/orb-one-directors-cut/frames — eight Blender 3D photographic keyframes.
- public/orb-one-directors-cut/stock — Mixkit licensed real-life B-roll clips 4953, 4954, 3110, 3090, 3113.
- public/orb-one-directors-cut/hdri — Poly Haven CC0 studio and interior HDRI.
- public/orb-one-directors-cut/audio/vastness-mixkit.mp3 — Vastness, Andrew Ev (Mixkit Free Stock Music License: https://mixkit.co/license/#musicFree).
- public/orb-one-directors-cut/audio/foley-96bpm.wav — original synchronized 96 BPM percussion and SFX.

## Creative / limitations
13 scenes, scene cut points on 15-frame (96 BPM) beat subdivisions. Narrative: lifestyle loss, frustration, reveal, photo-realistic product shot, roll, camera, bounce, spatial mapping, found, final brand shot.
This is a design-concept film, not real product footage. The robot's 3D views are Blender-rendered stills with editorial virtual camera push, not full 3D physical simulation. Real-life footage is generic B-roll. No Chinese voiceover in this edit.
M1 Cycles GPU attempt was too slow; approved stable Blender Eevee setup with carefully managed shading and contact shadow.
TypeScript passed, rendered 1290/1290 frames, ffprobe confirmed video and audio tracks.
