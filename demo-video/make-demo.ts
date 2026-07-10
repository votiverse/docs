/**
 * Votiverse — combined product demo reel.
 *
 * Drives the live web client end-to-end with Playwright and records the whole
 * session to video (webm). Reuses the seed data + seed manifest (for event IDs) and
 * the shared `lib/video-helpers.ts` toolkit for the animated cursor, captions, cards.
 *
 * Two parts:
 *   Part 1 — the core loop (Maple Heights): sign in, groups, members & invites,
 *            a proposal + community notes, voting, and results.
 *   Part 2 — the signature feature (liquid delegation), from the Municipal and
 *            Riverside groups: topic-scoped trust, delegators, weighted votes,
 *            per-topic delegates, and topic-tagged issues.
 *
 * Group IDs are resolved by name from the app sidebar at runtime. Event IDs come
 * from the seed manifest.
 *
 * Env flags:
 *   VIDEO_TIMING=1  — log the exact video time of each caption/card.
 *   SUBTITLES=1     — bake bottom narration subtitles in (and suppress the
 *                     lower-third caption labels, which the narration replaces).
 *
 * Requires: VCP :3000, backend :4000, web client running; data seeded.
 * Usage:    WEB_URL=http://localhost:5173 \
 *           SEED_MANIFEST_PATH=/abs/path/to/platform/vcp/seed-manifest.json \
 *           [SUBTITLES=1] npx tsx demo-video/make-demo.ts
 *
 * Output:   demo-video/output/<random>.webm  (path printed at the end)
 */

import { chromium } from "playwright";
import { join } from "path";
import { mkdirSync } from "fs";
import { loadManifest } from "../lib/seed-manifest.js";
import {
  createRecordingContext,
  startTiming,
  login,
  go,
  groupId,
  showCaption,
  hideCaption,
  subtitle,
  narrate,
  writeCaptions,
  smartClick,
  pointAt,
  smoothScroll,
  titleCard,
  dwell,
} from "../lib/video-helpers.js";

const BASE = process.env.WEB_URL || "http://localhost:5173";
const API = "http://localhost:4000";
const VCP = "http://localhost:3000";
const OUT_DIR = join(import.meta.dirname ?? ".", "output");

const m = loadManifest();
const EV = {
  mapleLobby: m.event("maple-lobby"),
  mapleRoof: m.event("maple-roof"),
  muniEmergency: m.event("municipal-emergency"),
  riverSpring: m.event("riverside-spring"),
};

const DAY = 86_400_000;

async function advanceClock(ms: number): Promise<void> {
  const body = JSON.stringify({ ms });
  const headers = { "Content-Type": "application/json" };
  await Promise.all([
    fetch(`${VCP}/dev/clock/advance`, { method: "POST", headers, body }).catch(() => {}),
    fetch(`${API}/dev/clock/advance`, { method: "POST", headers, body }).catch(() => {}),
  ]);
}
async function resetClock(): Promise<void> {
  await Promise.all([
    fetch(`${VCP}/dev/clock/reset`, { method: "POST" }).catch(() => {}),
    fetch(`${API}/dev/clock/reset`, { method: "POST" }).catch(() => {}),
  ]);
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log(
    process.env["SMOKE"] ? "🔎 Votiverse demo — smoke check (headless, no recording)\n" : "🎬 Votiverse demo reel — recording\n",
  );

  const browser = await chromium.launch({ headless: true });
  const ctx = await createRecordingContext(browser, OUT_DIR);
  const page = await ctx.newPage();
  const video = page.video();
  startTiming();

  try {
    // ── INTRO ────────────────────────────────────────────────────────────────
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
    await dwell(page, 800);
    narrate("Communities everywhere have to make decisions together.");
    await titleCard(page, {
      kicker: "Participatory governance",
      title: "Votiverse",
      subtitle: "A configurable engine for democratic decision-making.",
      holdMs: 3200,
    });
    narrate("Votiverse is an open platform that makes that simple — and transparent.");

    // ══════════════════════════════════════════════════════════════════════════
    // PART 1 — The core loop (Maple Heights Condo Board)
    // ══════════════════════════════════════════════════════════════════════════
    console.log("Part 1: Core loop — Maple Heights");

    await login(ctx, page, BASE, "elena-vasquez@example.com");
    const MAPLE = await groupId(page, /maple/i);
    await showCaption(page, "Sign in", "One account across every group you're part of.");
    await subtitle(page, "You sign in once — one account for every group you're in.");
    await dwell(page, 1500);
    await hideCaption(page);

    await go(page, BASE, "Your dashboard", "Every group and open decision, in one place.");
    await subtitle(page, "Your dashboard shows every group, and every decision waiting on you.");
    await dwell(page, 2400);

    await go(page, `${BASE}/groups`, "Your groups", "From a condo board to a citywide budget council.");
    await subtitle(page, "A group can be anything — a condo board, a nonprofit, a budget council.");
    await dwell(page, 2400);

    await go(page, `${BASE}/group/${MAPLE}`, "Maple Heights Condo Board", "24 units making transparent decisions together.");
    await subtitle(page, "Maple Heights — a 24-unit condo board, deciding in the open.");
    await dwell(page, 2600);

    // Members + admission control
    await go(page, `${BASE}/group/${MAPLE}/members`, "Members & admission", "Who's in the group — and how new people join.");
    await subtitle(page, "Every group controls who gets in —");
    await dwell(page, 1600);
    await pointAt(page, 'button:has-text("Invite link")', { optional: true });
    await smartClick(page, 'button:has-text("Invite link")', { optional: true });
    await showCaption(page, "Invite by link", "Admission is controlled — invite links, handles, or approval.");
    await subtitle(page, "invite by link or handle, or require approval to join and vote.");
    await dwell(page, 2400);

    // Proposals — the author's costed case
    await login(ctx, page, BASE, "marcus-chen@example.com");
    await go(page, `${BASE}/group/${MAPLE}/proposals`, "Proposals", "A concrete, costed case for each choice.");
    await subtitle(page, "Before any vote, members put forward proposals —");
    await dwell(page, 2000);
    await smartClick(page, 'a:has-text("Lobby Renovation")', { optional: true });
    await showCaption(page, "Read the full argument", "Rationale and costs — not just a headline.");
    await subtitle(page, "a costed case for each option, with the full reasoning.");
    await dwell(page, 1800);
    await smoothScroll(page, 340);
    await dwell(page, 1800);

    // Community notes
    await go(page, `${BASE}/group/${MAPLE}/notes`, "Community notes", "Members add context and corrections, in the open.");
    await subtitle(page, "Anyone can add community notes — context, right beside the proposal.");
    await dwell(page, 2600);
    await hideCaption(page);

    // Voting
    await advanceClock(9 * DAY);
    await go(page, `${BASE}/group/${MAPLE}/events/${EV.mapleLobby}`, "Voting is open", "When the window opens, members weigh in.");
    await subtitle(page, "When voting opens, members weigh in —");
    await dwell(page, 1600);
    await smoothScroll(page, 300);
    await dwell(page, 1000);
    await smartClick(page, 'button:has-text("For")', { optional: true });
    await showCaption(page, "Cast your vote", "For, against, or abstain — private, and counted transparently.");
    await subtitle(page, "for, against, or abstain. Private, but the count is transparent.");
    await dwell(page, 2400);

    // Results
    await advanceClock(8 * DAY);
    await go(page, `${BASE}/group/${MAPLE}/events/${EV.mapleRoof}`, "Results, revealed", "Outcomes publish only when voting closes — nothing hidden.");
    await subtitle(page, "Results stay sealed until voting closes —");
    await dwell(page, 1800);
    await smoothScroll(page, 320);
    await showCaption(page, "Transparent tallies", "Every result is auditable back to the votes that produced it.");
    await subtitle(page, "then every outcome is published, traceable to the votes behind it.");
    await dwell(page, 2600);
    await hideCaption(page);
    await resetClock();

    // ══════════════════════════════════════════════════════════════════════════
    // PART 2 — The signature feature: liquid delegation
    // ══════════════════════════════════════════════════════════════════════════
    console.log("Part 2: Liquid delegation");

    await subtitle(page, "");
    narrate("And here's what makes Votiverse different — liquid delegation.");
    await titleCard(page, {
      kicker: "Signature feature",
      title: "Liquid delegation",
      subtitle: "Delegate your vote by topic — or vote directly. Your call, on every issue.",
      holdMs: 3400,
    });

    // Topic-scoped trust
    await login(ctx, page, BASE, "nkechi-adeyemi@example.com");
    const MUNI_A = await groupId(page, /municipal/i);
    await go(page, `${BASE}/group/${MUNI_A}/delegations`, "Trust an expert — on your terms", "Delegate the topics you choose; keep the rest for yourself.");
    await subtitle(page, "Delegate the topics you choose — and vote the rest yourself.");
    await dwell(page, 2800);

    // Delegators — see who trusts you
    await login(ctx, page, BASE, "carmen-delgado@example.com");
    await go(page, `${BASE}/profile/delegators`, "See who's entrusted you", "Delegates can always see the weight they carry.");
    await subtitle(page, "If people trust you on a topic, you see the weight you carry.");
    await dwell(page, 2600);

    // Chains + weighted voting
    await login(ctx, page, BASE, "marcus-chen@example.com");
    const MUNI_B = await groupId(page, /municipal/i);
    await go(page, `${BASE}/group/${MUNI_B}/delegations`, "Delegation can chain", "Trust can pass down a chain — and it's always visible.");
    await subtitle(page, "Trust can pass along a chain — always visible, never hidden.");
    await dwell(page, 2600);
    await go(page, `${BASE}/group/${MUNI_B}/events/${EV.muniEmergency}`, "One vote can carry many", "A single vote reflects everyone who delegated it.");
    await subtitle(page, "So a single vote carries everyone who delegated it.");
    await dwell(page, 1600);
    await smoothScroll(page, 320);
    await dwell(page, 2000);

    // Per-topic delegates
    await login(ctx, page, BASE, "priya-nair@example.com");
    const RIVER = await groupId(page, /river/i);
    await go(page, `${BASE}/group/${RIVER}/delegations`, "Different delegates, different topics", "Budget to one trusted voice, facilities to another.");
    await subtitle(page, "Budget to one trusted neighbor, facilities to another.");
    await dwell(page, 2800);

    // Topic-tagged issues
    await go(page, `${BASE}/group/${RIVER}/events/${EV.riverSpring}`, "Every issue, tagged by topic", "Classification is what makes topic-scoped delegation work.");
    await subtitle(page, "Every issue is tagged by topic — delegates vote only where trusted.");
    await dwell(page, 1600);
    await smoothScroll(page, 360);
    await dwell(page, 2400);
    await hideCaption(page);
    await subtitle(page, "");

    // ── OUTRO ──────────────────────────────────────────────────────────────────
    narrate("Votiverse — open source, and free for every community. votiverse.org");
    await titleCard(page, {
      kicker: "Open source · free for every community",
      title: "Votiverse",
      subtitle: "votiverse.org",
      holdMs: 3600,
      keep: true,
    });
    await dwell(page, 300);

    console.log("\n✅ Walkthrough complete.");
  } catch (err) {
    console.error("\n❌ Walkthrough failed:", err);
    throw err;
  } finally {
    await resetClock();
    // Skip caption emit on smoke — timings are collapsed, so they'd be meaningless.
    if (!process.env["SMOKE"]) writeCaptions(OUT_DIR);
    await ctx.close(); // finalizes the video
    await browser.close();
  }

  if (!process.env["SMOKE"]) {
    const path = video ? await video.path() : null;
    if (path) console.log(`\n🎥 Video written: ${path}`);
    else console.log(`\n🎥 Video written to: ${OUT_DIR}/`);
  } else {
    console.log("\n✅ Smoke check complete — no drift.");
  }
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
