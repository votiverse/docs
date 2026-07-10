#!/usr/bin/env bash
# Convert the recorded Playwright webm into a presentation-ready 1080p MP4 (H.264),
# and extract a few sample frames for a quick visual sanity check.
#
# Usage: ./convert.sh [path/to/input.webm]
#   With no argument, uses the newest .webm in ./output/.
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
OUT="$DIR/output"
SRC="${1:-$(ls -t "$OUT"/*.webm 2>/dev/null | head -1)}"
MP4="$OUT/votiverse-demo.mp4"
FRAMES="$OUT/frames"

if [[ -z "${SRC:-}" || ! -f "$SRC" ]]; then
  echo "No input webm found in $OUT" >&2
  exit 1
fi

echo "Source: $SRC"
# fps=30 normalizes Playwright's variable frame rate; scale up to 1080p with lanczos;
# yuv420p + faststart maximize compatibility with Keynote / PowerPoint / Slides / QuickTime.
ffmpeg -y -loglevel error -i "$SRC" \
  -vf "fps=30,scale=1920:1080:flags=lanczos,format=yuv420p" \
  -c:v libx264 -preset slow -crf 20 -movflags +faststart -an "$MP4"
echo "Wrote: $MP4"

# Sample frames for verification
mkdir -p "$FRAMES"
rm -f "$FRAMES"/*.png
DUR="$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$MP4")"
echo "Duration (s): $DUR  Size: $(du -h "$MP4" | cut -f1)"
i=1
for t in 3 20 45 70 95 120; do
  # only grab frames that fall within the clip
  awk "BEGIN{exit !($t < $DUR)}" && \
    ffmpeg -y -loglevel error -ss "$t" -i "$MP4" -frames:v 1 "$FRAMES/frame-$(printf '%02d' $i)-t${t}s.png" && \
    echo "  frame @ ${t}s" || true
  i=$((i+1))
done
echo "Frames in: $FRAMES"
