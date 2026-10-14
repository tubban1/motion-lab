#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../../.."
BLENDER="/Applications/Blender.app/Contents/MacOS/Blender"
BASE="public/orb-one-directors-cut/motion"
for shot in gyro rolling bounce; do
  echo "=== Director camera visibility preflight: $shot ==="
  "$BLENDER" -b -t 4 --python projects/orb-one-2026-10/directors-cut/validate_motion_visibility.py -- "$shot"
  echo "=== Blender continuous motion: $shot ==="
  "$BLENDER" -b -t 4 --python projects/orb-one-2026-10/directors-cut/render_motion.py -- "$shot" final
  test -f "$BASE/$shot/frame_0001.png"
  echo "=== Encoding: $shot ==="
  ffmpeg -hide_banner -loglevel error -y -framerate 24 -start_number 1 -i "$BASE/$shot/frame_%04d.png" -c:v libx264 -pix_fmt yuv420p -crf 17 -movflags +faststart "$BASE/$shot.mp4"
  ffprobe -v error -select_streams v:0 -show_entries stream=width,height,nb_frames -of default=nw=1 "$BASE/$shot.mp4"
done
echo "=== Typecheck ==="
npx tsc --noEmit
echo "=== Remotion full physical director cut ==="
npx remotion render src/index.ts OrbOnePhysicalCut renders/orb-one-physical-directors-cut-director-v3-2026-10.mp4 --codec h264 --crf 19 --concurrency 1 --browser-executable "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
echo "=== QC ==="
python3 .agents/skills/cinematic-video-director/scripts/qc_media.py renders/orb-one-physical-directors-cut-director-v3-2026-10.mp4 --fps 24 --width 1920 --height 1080 --duration 53.75
echo "=== Director review strips ==="
VIDEO="renders/orb-one-physical-directors-cut-director-v3-2026-10.mp4"
OUT="renders/qc/orb-one-physical-directors-cut-director-v3-2026-10"
python3 .agents/skills/cinematic-video-director/scripts/build_review_strips.py "$VIDEO" "$OUT/gyro-roll-strip.jpg" --times '22.55,22.90,23.35,23.85,24.40,25.20,29.42,29.8,30.25,30.75,31.2,31.7,32.2,32.8' --cols 4 --width 530
python3 .agents/skills/cinematic-video-director/scripts/build_review_strips.py "$VIDEO" "$OUT/bounce-strip.jpg" --times '36.89,37.2,37.45,37.9,38.4,38.85,39.2,39.6,39.83,39.95,40.2,40.55' --cols 4 --width 530
ffmpeg -hide_banner -loglevel info -i "$VIDEO" -af volumedetect -vn -f null - 2>&1 | grep -E 'mean_volume|max_volume' || true
echo "PHYSICAL_CUT_COMPLETE"
