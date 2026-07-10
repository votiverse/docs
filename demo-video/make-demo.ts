/**
 * Votiverse — demo reel entry point.
 *
 * Sets up the recording browser and runs a declarative storyboard (see `storyboards/`).
 * The storyboard's beats drive the live app; `lib/video-helpers` writeCaptions() emits the
 * .srt + timed transcript. To author a new video, add a `storyboards/<name>.ts` and pass
 * STORYBOARD=<name> — no changes here.
 *
 * Env flags:
 *   STORYBOARD=<name>  — which storyboards/<name>.ts to run (default "votiverse-demo").
 *   SUBTITLES=1        — bake bottom narration subtitles in (else lower-third caption cards).
 *   SMOKE=1            — headless drift check: collapse dwells, no recording, no captions.
 *   VIDEO_TIMING=1     — log each captioned beat's exact video time.
 *
 * Requires: VCP :3000, backend :4000, web client running; data seeded.
 * Usage:    WEB_URL=http://localhost:5173 \
 *           SEED_MANIFEST_PATH=/abs/path/to/platform/vcp/seed-manifest.json \
 *           [STORYBOARD=votiverse-demo] [SUBTITLES=1] npx tsx demo-video/make-demo.ts
 */

import { chromium } from "playwright";
import { join } from "path";
import { mkdirSync } from "fs";
import { loadManifest } from "../lib/seed-manifest.js";
import { createRecordingContext, startTiming, writeCaptions } from "../lib/video-helpers.js";
import { runStoryboard, resetClock, type Beat } from "./storyboard.js";

const BASE = process.env["WEB_URL"] || "http://localhost:5173";
const OUT_DIR = join(import.meta.dirname ?? ".", "output");
const STORYBOARD = process.env["STORYBOARD"] || "votiverse-demo";
const SMOKE = !!process.env["SMOKE"];

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log(
    SMOKE
      ? `🔎 Votiverse demo — smoke check (headless, no recording): ${STORYBOARD}\n`
      : `🎬 Votiverse demo reel — recording: ${STORYBOARD}\n`,
  );

  const m = loadManifest();
  const { beats } = (await import(`./storyboards/${STORYBOARD}.js`)) as { beats: Beat[] };

  const browser = await chromium.launch({ headless: true });
  const ctx = await createRecordingContext(browser, OUT_DIR);
  const page = await ctx.newPage();
  const video = page.video();
  startTiming();

  // Pre-roll: load the app as a backdrop with a bare domcontentloaded goto — the
  // unauthenticated login page never reaches networkidle, so go()'s wait would stall ~8s.
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" }).catch(() => {});
  await page.waitForTimeout(SMOKE ? 40 : 700);

  try {
    await runStoryboard(ctx, page, BASE, m, beats);
    console.log("\n✅ Walkthrough complete.");
  } catch (err) {
    console.error("\n❌ Walkthrough failed:", err);
    throw err;
  } finally {
    await resetClock();
    if (!SMOKE) writeCaptions(OUT_DIR); // .srt + transcript (skipped on smoke — timings collapsed)
    await ctx.close(); // finalizes the video
    await browser.close();
  }

  if (!SMOKE) {
    const path = video ? await video.path() : null;
    console.log(path ? `\n🎥 Video written: ${path}` : `\n🎥 Video written to: ${OUT_DIR}/`);
  } else {
    console.log("\n✅ Smoke check complete — no drift.");
  }
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
