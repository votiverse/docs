#!/usr/bin/env bash
# make.sh — one command to render the Votiverse demo reel.
#
# Pre-checks the running stack + seed manifest, then produces (into ./output/):
#   • votiverse-demo.mp4             clean master with lower-third caption cards
#   • votiverse-demo-subtitled.mp4   narration burned in as bottom subtitles
#   • votiverse-demo.srt             frame-exact subtitle cues   (generated)
#   • votiverse-demo.script.md       timed narration transcript  (generated)
#
# The .srt / .script.md are generated FROM the storyboard render — to change the
# narration, edit make-demo.ts and re-run this, never hand-edit the caption files.
#
# Usage (any working directory):
#   demo-video/make.sh              preflight + both variants + captions
#   demo-video/make.sh --clean      only the clean master
#   demo-video/make.sh --subtitled  only the subtitled variant
#   demo-video/make.sh --check      preflight only (verify the stack; render nothing)
#   demo-video/make.sh --smoke      fast drift check — run the storyboard headless, no
#                                   recording; fails if a route/selector no longer resolves
#
# Env overrides: WEB_URL, API_URL, VCP_URL, SEED_MANIFEST_PATH
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCS="$(cd "$DIR/.." && pwd)"
OUT="$DIR/output"
mkdir -p "$OUT"

WEB_URL="${WEB_URL:-http://localhost:5173}"
API_URL="${API_URL:-http://localhost:4000}"
VCP_URL="${VCP_URL:-http://localhost:3000}"

WANT_CLEAN=1; WANT_SUB=1; CHECK_ONLY=0; SMOKE_ONLY=0
case "${1:-}" in
  --clean)     WANT_SUB=0 ;;
  --subtitled) WANT_CLEAN=0 ;;
  --check)     CHECK_ONLY=1 ;;
  --smoke)     SMOKE_ONLY=1 ;;
  "")          ;;
  *) echo "Unknown option: $1  (use --clean | --subtitled | --check | --smoke)" >&2; exit 2 ;;
esac

fail() { echo "✗ $*" >&2; exit 1; }

# ── Preflight ──────────────────────────────────────────────────────────────────
echo "▸ Preflight"
command -v ffmpeg >/dev/null || fail "ffmpeg not found (brew install ffmpeg)"
command -v npx    >/dev/null || fail "node/npx not found"

up() { curl -sf -o /dev/null "$1" 2>/dev/null; }
up "$VCP_URL/health" || fail "VCP not healthy at $VCP_URL — start it: (cd <stack>/platform/vcp && pnpm dev)"
up "$API_URL/health" || fail "Backend not healthy at $API_URL — start it: (cd <stack>/platform/backend && pnpm dev)"
up "$WEB_URL"        || fail "Web client not serving at $WEB_URL — start it: (cd <stack>/platform/web && pnpm dev)"

# Seed manifest — its IDs must match the RUNNING stack's most recent reseed.
MANIFEST=""
if [[ -n "${SEED_MANIFEST_PATH:-}" ]]; then
  [[ -f "$SEED_MANIFEST_PATH" ]] || fail "SEED_MANIFEST_PATH set but not found: $SEED_MANIFEST_PATH"
  MANIFEST="$SEED_MANIFEST_PATH"
else
  # docs-site auto-discovery misses the sibling live stack, so probe known locations.
  for c in \
    "$DIR/../../../votiverse/platform/vcp/seed-manifest.json" \
    "$DIR/../../engine/platform/vcp/seed-manifest.json"; do
    if [[ -f "$c" ]]; then MANIFEST="$(cd "$(dirname "$c")" && pwd)/seed-manifest.json"; break; fi
  done
  [[ -n "$MANIFEST" ]] || fail "No seed-manifest.json found — reseed the stack (cd platform/vcp && pnpm reset) or set SEED_MANIFEST_PATH."
fi

echo "  ✓ VCP $VCP_URL   ✓ backend $API_URL   ✓ web $WEB_URL"
echo "  ✓ manifest $MANIFEST"

if [[ "$CHECK_ONLY" == 1 ]]; then echo "✓ Preflight OK — the stack is ready to record."; exit 0; fi

export WEB_URL SEED_MANIFEST_PATH="$MANIFEST"

# ── Smoke: run the storyboard headless as a fast drift check (no recording) ─────
if [[ "$SMOKE_ONLY" == 1 ]]; then
  echo "▸ Smoke: running the storyboard headless (no recording)…"
  ( cd "$DOCS" && SMOKE=1 npx tsx demo-video/make-demo.ts ) \
    || fail "smoke check FAILED — a beat errored (route/selector drift, login, or missing target). See above."
  echo "✓ Smoke passed — every beat navigated and every required target resolved."
  exit 0
fi

# ── Render + convert ───────────────────────────────────────────────────────────
newest_webm() { ls -t "$OUT"/*.webm 2>/dev/null | head -1 || true; }

convert() { # <src.webm> <dst.mp4>
  # fps=30 normalizes Playwright's variable frame rate; scale to 1080p; yuv420p +
  # faststart maximize compatibility with Keynote / PowerPoint / Slides / QuickTime.
  ffmpeg -y -loglevel error -i "$1" \
    -vf "fps=30,scale=1920:1080:flags=lanczos,format=yuv420p" \
    -c:v libx264 -preset slow -crf 20 -movflags +faststart -an "$2"
  echo "  ✓ $(basename "$2")  ($(du -h "$2" | cut -f1))"
}

render() { # <label> <SUBTITLES value: "" or "1"> <dst.mp4>
  echo "▸ Render: $1"
  local before after
  before="$(newest_webm)"
  ( cd "$DOCS" && SUBTITLES="$2" npx tsx demo-video/make-demo.ts ) || fail "render failed: $1"
  after="$(newest_webm)"
  [[ -n "$after" && "$after" != "$before" ]] || fail "no new .webm produced for: $1"
  convert "$after" "$3"
}

if [[ "$WANT_CLEAN" == 1 ]]; then render "clean master (caption cards)" ""  "$OUT/votiverse-demo.mp4"; fi
if [[ "$WANT_SUB"   == 1 ]]; then render "subtitled (baked narration)" "1" "$OUT/votiverse-demo-subtitled.mp4"; fi

echo ""
echo "✓ Done — in $OUT :"
if [[ "$WANT_CLEAN" == 1 ]]; then echo "  • votiverse-demo.mp4            clean master (caption cards)"; fi
if [[ "$WANT_SUB"   == 1 ]]; then echo "  • votiverse-demo-subtitled.mp4  narration burned in"; fi
echo "  • votiverse-demo.srt            frame-exact subtitle cues (generated)"
echo "  • votiverse-demo.script.md      timed narration transcript (generated)"
