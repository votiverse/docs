/**
 * Video helpers — a small toolkit for turning the case-study Playwright walkthroughs
 * into polished, self-explanatory demo recordings.
 *
 * Playwright records the whole session natively (context `recordVideo`). On top of that
 * this module adds the things a silent demo needs to read well in a slide deck:
 *
 *   - an injected, animated mouse cursor (headless Chromium has none) + click ripples
 *   - `smartClick` / `pointAt` that glide the cursor to a target before acting
 *   - smooth scrolling instead of instant jumps
 *   - lower-third caption banners that name each feature
 *   - full-screen branded title / section cards for the intro, dividers, and outro
 *   - persistent hiding of the dev-only clock widget
 *
 * All overlays are injected via `addInitScript` (re-runs on every navigation) or
 * `page.evaluate`, and are `pointer-events:none` so they never block the real UI.
 */

import type { Browser, BrowserContext, Page, Locator } from "playwright";
import { writeFileSync } from "fs";
import { join } from "path";

/** Votiverse brand palette (accent resolved from the app: teal-400 #2dd4bf). */
export const BRAND = {
  accent: "#2dd4bf",
  accentDeep: "#14b8a6",
  ink: "#0b1220",
  inkSoft: "#0f172a",
  text: "#f8fafc",
  muted: "#94a3b8",
  font: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`,
};

/** 16:9 recording size — near a real laptop width so the app's layout looks "designed". */
export const VIDEO_SIZE = { width: 1440, height: 810 };

type ClickOpts = { steps?: number; preMs?: number; postMs?: number; optional?: boolean };
type ScrollOpts = { holdMs?: number };

/**
 * Create a browser context that records video, with the cursor + dev-clock-hide
 * init scripts already installed. Every page opened in this context is recorded.
 */
export async function createRecordingContext(
  browser: Browser,
  outDir: string,
  size = VIDEO_SIZE,
): Promise<BrowserContext> {
  const ctx = await browser.newContext({
    viewport: size,
    recordVideo: { dir: outDir, size },
  });
  await ctx.addInitScript(CURSOR_INIT_JS);
  await ctx.addInitScript(HIDE_DEVCLOCK_JS);
  return ctx;
}

/** Simple wait wrapper — reads better than raw waitForTimeout in the storyboard. */
export function dwell(page: Page, ms: number): Promise<void> {
  return page.waitForTimeout(ms);
}

// ── Beat timing (for building an aligned narration script) ─────────────────────
// Set VIDEO_TIMING=1 to log the elapsed video time as each captioned beat / card
// appears. Call startTiming() right before recording begins.

let _t0 = 0;
export function startTiming(): void {
  _t0 = Date.now();
  _cues = [];
  _openCue = null;
  _sections = [];
}
function logTiming(label: string): void {
  if (_t0 && process.env["VIDEO_TIMING"]) {
    const s = ((Date.now() - _t0) / 1000).toFixed(1);
    // eslint-disable-next-line no-console
    console.log(`  ⏱ ${s.padStart(6)}s  ${label}`);
  }
}

// ── Narration capture → auto-generated .srt + timed transcript ──────────────────
//
// The storyboard is the single source of truth for narration: every spoken line
// (via subtitle() or narrate()) is recorded with the exact video time it appears,
// so writeCaptions() can emit a frame-exact .srt and a timed script with no hand-
// syncing. A cue runs until the next line or an explicit clear (subtitle("")), which
// mirrors how the baked on-screen subtitle behaves.

type Cue = { text: string; startMs: number; endMs: number };
type Section = { title: string; kicker: string; startMs: number };

let _cues: Cue[] = [];
let _openCue: { text: string; startMs: number } | null = null;
let _sections: Section[] = [];

// A narration line shows for at most CAPTION_MAX_MS (so it never lingers across a
// scene change) and at least CAPTION_MIN_MS (so it stays readable). Used by BOTH the
// on-screen auto-hide in subtitle() and the generated .srt, so the two stay in sync.
const CAPTION_MAX_MS = 6000;
const CAPTION_MIN_MS = 1400;

function elapsedMs(): number {
  return _t0 ? Date.now() - _t0 : 0;
}

/** Record a narration line at the current video time, closing the previous one. */
function recordCue(text: string): void {
  const t = elapsedMs();
  if (_openCue) {
    _cues.push({ text: _openCue.text, startMs: _openCue.startMs, endMs: t });
    _openCue = null;
  }
  const trimmed = text.trim();
  if (trimmed) _openCue = { text: trimmed, startMs: t };
}

function recordSection(title: string, kicker: string): void {
  _sections.push({ title, kicker, startMs: elapsedMs() });
}

/**
 * Record a spoken narration line that has NO on-screen subtitle — e.g. the voiceover
 * over a full-screen title card. Contributes only to the generated .srt / transcript.
 */
export function narrate(text: string): void {
  recordCue(text);
  logTiming(`[VO] ${text}`);
}

function stampSrt(ms: number): string {
  const c = Math.max(0, Math.round(ms));
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${p(Math.floor(c / 3_600_000))}:${p(Math.floor((c % 3_600_000) / 60_000))}:${p(
    Math.floor((c % 60_000) / 1000),
  )},${p(c % 1000, 3)}`;
}

function stampClock(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Flush the recorded narration to `<base>.srt` (frame-exact subtitle cues) and
 * `<base>.script.md` (a timed transcript with section headers). Times come straight
 * from the render — nothing is hand-synced. Call once at the end of a run.
 */
export function writeCaptions(
  outDir: string,
  base = "votiverse-demo",
): { srt: string; script: string; cues: number } {
  if (_openCue) {
    _cues.push({ text: _openCue.text, startMs: _openCue.startMs, endMs: elapsedMs() });
    _openCue = null;
  }
  // Cap each cue so a line never lingers (matches subtitle()'s on-screen auto-hide),
  // keep a readable minimum, and never overlap the next line — a gap appears wherever
  // the next line is more than CAPTION_MAX_MS away.
  const cues = _cues.map((c, i) => {
    const nextStart = _cues[i + 1]?.startMs ?? Infinity;
    let end = Math.min(c.startMs + CAPTION_MAX_MS, nextStart);
    if (end - c.startMs < CAPTION_MIN_MS) end = Math.min(c.startMs + CAPTION_MIN_MS, nextStart);
    return { ...c, endMs: end };
  });

  const srt = cues
    .map((c, i) => `${i + 1}\n${stampSrt(c.startMs)} --> ${stampSrt(c.endMs)}\n${c.text}\n`)
    .join("\n");

  const sections = [..._sections].sort((a, b) => a.startMs - b.startMs);
  const header = (s: Section) => `## ${stampClock(s.startMs)} · ${s.kicker ? s.kicker + " — " : ""}${s.title}`;
  const lines: string[] = [
    "# Votiverse demo — narration transcript",
    "",
    "_Generated from the storyboard render; timestamps are frame-exact. Do not hand-edit —",
    "change the narration in `demo-video/make-demo.ts` and re-run `npm run demo`._",
    "",
  ];
  let si = 0;
  for (const c of cues) {
    while (si < sections.length && sections[si]!.startMs <= c.startMs) lines.push("", header(sections[si++]!), "");
    lines.push(`**${stampClock(c.startMs)}** — ${c.text}`);
  }
  while (si < sections.length) lines.push("", header(sections[si++]!), "");

  const srtPath = join(outDir, `${base}.srt`);
  const scriptPath = join(outDir, `${base}.script.md`);
  writeFileSync(srtPath, srt, "utf8");
  writeFileSync(scriptPath, lines.join("\n") + "\n", "utf8");
  // eslint-disable-next-line no-console
  console.log(`\n📝 Captions → ${srtPath} (${cues.length} cues)\n📝 Script   → ${scriptPath}`);
  return { srt: srtPath, script: scriptPath, cues: cues.length };
}

// ── Login ────────────────────────────────────────────────────────────────────

/**
 * Log in as a seeded user. Clears session first so we can switch personas.
 * Types the credentials character-by-character for a natural on-camera feel.
 */
export async function login(ctx: BrowserContext, page: Page, base: string, email: string): Promise<void> {
  await ctx.clearCookies();
  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("input#email", { timeout: 15000 });
  await fillSlowly(page, "input#email", email);
  await fillSlowly(page, "input#password", "password1234");
  await dwell(page, 350);
  await smartClick(page, 'button:has-text("Sign in")', { postMs: 1500 });
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await dwell(page, 900);
}

/** Type into an input one character at a time. */
export async function fillSlowly(page: Page, selector: string, text: string, perCharMs = 32): Promise<void> {
  const el = page.locator(selector).first();
  await el.click();
  await el.fill("");
  await el.pressSequentially(text, { delay: perCharMs });
}

// ── Group resolution (reseed-proof) ────────────────────────────────────────────
//
// The /group/:groupId routes use backend group IDs, which differ from the VCP
// assembly IDs in the seed manifest and change on every reseed. So we resolve them
// at runtime from the sidebar links the app itself renders.

/** Read {id, name} for every group in the current user's sidebar. */
export async function resolveGroups(page: Page): Promise<{ id: string; name: string }[]> {
  return page.evaluate(() => {
    const out: { id: string; name: string }[] = [];
    const seen: Record<string, boolean> = {};
    for (const a of Array.from(document.querySelectorAll('a[href^="/group/"]'))) {
      const href = (a as HTMLAnchorElement).getAttribute("href") || "";
      const mm = href.match(/^\/group\/([0-9a-f-]+)$/);
      if (mm && !seen[mm[1]]) {
        seen[mm[1]] = true;
        out.push({ id: mm[1], name: (a.textContent || "").replace(/\s+/g, " ").trim() });
      }
    }
    return out;
  });
}

/** Resolve the backend group id for the group whose name matches `nameRe`. */
export async function groupId(page: Page, nameRe: RegExp): Promise<string> {
  const groups = await resolveGroups(page);
  const hit = groups.find((g) => nameRe.test(g.name));
  if (!hit) {
    throw new Error(
      `No sidebar group matching ${nameRe}. Saw: ${groups.map((g) => g.name).join(", ") || "(none)"}`,
    );
  }
  return hit.id;
}

// ── Cursor-aware interaction ───────────────────────────────────────────────────

function resolve(page: Page, target: string | Locator): Locator {
  return (typeof target === "string" ? page.locator(target) : target).first();
}

/** Glide the cursor to an element and hold, drawing the eye without clicking. */
export async function pointAt(page: Page, target: string | Locator, opts: ClickOpts = {}): Promise<void> {
  const { steps = 22, postMs = 500, optional = false } = opts;
  const el = resolve(page, target);
  try {
    await el.scrollIntoViewIfNeeded({ timeout: 4000 });
    await dwell(page, 150);
    const box = await el.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps });
      await dwell(page, postMs);
    }
  } catch (err) {
    if (!optional) throw err;
  }
}

/** Glide the cursor to an element, then click it (fires a visible ripple). */
export async function smartClick(page: Page, target: string | Locator, opts: ClickOpts = {}): Promise<void> {
  const { steps = 24, preMs = 260, postMs = 900, optional = false } = opts;
  const el = resolve(page, target);
  try {
    await el.scrollIntoViewIfNeeded({ timeout: 4000 });
    await dwell(page, 150);
    const box = await el.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps });
      await dwell(page, preMs);
    }
    await el.click({ delay: 80, timeout: 6000 });
    await dwell(page, postMs);
  } catch (err) {
    if (!optional) throw err;
    // eslint-disable-next-line no-console
    console.log(`   ⏭  optional click skipped (${err instanceof Error ? err.message.split("\n")[0] : err})`);
  }
}

/** Smooth-scroll the page by a delta (positive = down). */
export async function smoothScroll(page: Page, dy: number, opts: ScrollOpts = {}): Promise<void> {
  const { holdMs = 750 } = opts;
  await page.evaluate((d) => window.scrollBy({ top: d, left: 0, behavior: "smooth" }), dy);
  await dwell(page, holdMs);
}

/** Smooth-scroll back to the top of the page. */
export async function scrollTop(page: Page, opts: ScrollOpts = {}): Promise<void> {
  const { holdMs = 500 } = opts;
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await dwell(page, holdMs);
}

// ── Navigation + captions ──────────────────────────────────────────────────────

/**
 * Navigate, let the SPA settle, and (optionally) show a caption. This is the workhorse
 * of the storyboard — most beats are `await go(page, url, "Title", "subtitle")`.
 */
export async function go(
  page: Page,
  url: string,
  caption?: string,
  sub = "",
  settleMs = 1400,
): Promise<void> {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await dwell(page, settleMs);
  if (caption) await showCaption(page, caption, sub);
}

/** Show / replace the lower-third caption banner on the current page. */
export async function showCaption(page: Page, title: string, subtitle = ""): Promise<void> {
  // In subtitle mode the bottom narration replaces these lower-third labels.
  if (process.env["SUBTITLES"]) return;
  await page.evaluate(
    ({ title, subtitle, B }) => {
      const ID = "__pw_caption__";
      let el = document.getElementById(ID);
      if (!el) {
        el = document.createElement("div");
        el.id = ID;
        (document.body || document.documentElement).appendChild(el);
      }
      el.style.cssText = [
        "position:fixed",
        "left:28px",
        "bottom:28px",
        "max-width:560px",
        "padding:16px 22px",
        "z-index:2147483642",
        "pointer-events:none",
        `background:linear-gradient(180deg, ${B.inkSoft}f2, ${B.ink}f2)`,
        `border-left:4px solid ${B.accent}`,
        "border-radius:14px",
        "box-shadow:0 16px 44px rgba(0,0,0,.42)",
        "backdrop-filter:blur(8px)",
        `color:${B.text}`,
        `font-family:${B.font}`,
        "opacity:0",
        "transform:translateY(8px)",
        "transition:opacity .34s ease, transform .34s ease",
      ].join(";");
      el.innerHTML =
        `<div style="font-weight:700;font-size:21px;line-height:1.25;letter-spacing:-.01em">${title}</div>` +
        (subtitle
          ? `<div style="margin-top:6px;font-size:14.5px;line-height:1.45;color:${B.muted}">${subtitle}</div>`
          : "");
      requestAnimationFrame(() => {
        el!.style.opacity = "1";
        el!.style.transform = "translateY(0)";
      });
    },
    { title, subtitle, B: BRAND },
  );
  logTiming(`${title}${subtitle ? " — " + subtitle : ""}`);
  await dwell(page, 220);
}

/** Fade out and remove the caption banner. */
export async function hideCaption(page: Page): Promise<void> {
  await page
    .evaluate(() => {
      const el = document.getElementById("__pw_caption__");
      if (el) {
        el.style.opacity = "0";
        el.style.transform = "translateY(8px)";
        setTimeout(() => el.remove(), 360);
      }
    })
    .catch(() => {});
  await dwell(page, 380);
}

/**
 * Show / replace a top-center narration subtitle. Gated on the SUBTITLES env var so
 * the clean master render skips it; render with SUBTITLES=1 to bake subtitles in.
 * Positioned top-center so it never collides with the bottom-left caption cards.
 * Pass "" to clear.
 */
export async function subtitle(page: Page, text: string): Promise<void> {
  recordCue(text); // always record timing, even on the clean render, so the .srt is generated
  if (!process.env["SUBTITLES"]) return;
  await page.evaluate(
    ({ text, B, maxMs }) => {
      const ID = "__pw_subtitle__";
      const w = window as unknown as { __pw_sub_timer__?: number };
      if (w.__pw_sub_timer__) {
        window.clearTimeout(w.__pw_sub_timer__);
        w.__pw_sub_timer__ = undefined;
      }
      let el = document.getElementById(ID);
      if (!text) {
        if (el) el.style.opacity = "0";
        return;
      }
      if (!el) {
        el = document.createElement("div");
        el.id = ID;
        (document.body || document.documentElement).appendChild(el);
      }
      el.style.cssText = [
        "position:fixed",
        "bottom:46px",
        "left:50%",
        "transform:translateX(-50%)",
        "max-width:82%",
        "padding:11px 24px",
        "z-index:2147483643",
        "pointer-events:none",
        "background:rgba(11,18,32,0.82)",
        `color:${B.text}`,
        `font-family:${B.font}`,
        "font-size:23px",
        "font-weight:500",
        "line-height:1.35",
        "text-align:center",
        "border-radius:11px",
        "box-shadow:0 8px 30px rgba(0,0,0,.42)",
        "opacity:0",
        "transition:opacity .3s ease",
      ].join(";");
      el.textContent = text;
      requestAnimationFrame(() => {
        el!.style.opacity = "1";
      });
      // Auto-hide so a line never lingers past its cue; a later subtitle() cancels this.
      w.__pw_sub_timer__ = window.setTimeout(() => {
        const e = document.getElementById(ID);
        if (e) e.style.opacity = "0";
      }, maxMs);
    },
    { text, B: BRAND, maxMs: CAPTION_MAX_MS },
  );
}

/**
 * Full-screen branded card — for the intro, section dividers, and outro.
 * Fades in over the current page, holds, then fades out (unless `hold` is set).
 */
export async function titleCard(
  page: Page,
  opts: { kicker?: string; title: string; subtitle?: string; holdMs?: number; keep?: boolean },
): Promise<void> {
  const { kicker = "", title, subtitle = "", holdMs = 2800, keep = false } = opts;
  recordSection(title, kicker);
  await page.evaluate(
    ({ kicker, title, subtitle, B }) => {
      // hide the cursor while a full-screen card is up
      const cur = document.getElementById("__pw_cursor__");
      if (cur) cur.style.display = "none";
      const ID = "__pw_titlecard__";
      let el = document.getElementById(ID);
      if (!el) {
        el = document.createElement("div");
        el.id = ID;
        (document.body || document.documentElement).appendChild(el);
      }
      el.style.cssText = [
        "position:fixed",
        "inset:0",
        "z-index:2147483644",
        "display:flex",
        "flex-direction:column",
        "align-items:center",
        "justify-content:center",
        "text-align:center",
        "padding:0 8vw",
        `background:radial-gradient(120% 80% at 50% 18%, ${B.inkSoft} 0%, ${B.ink} 62%)`,
        `color:${B.text}`,
        `font-family:${B.font}`,
        "opacity:0",
        "transition:opacity .5s ease",
      ].join(";");
      el.innerHTML =
        (kicker
          ? `<div style="text-transform:uppercase;letter-spacing:.3em;font-weight:700;font-size:13.5px;color:${B.accent};margin-bottom:22px">${kicker}</div>`
          : "") +
        `<div style="font-weight:800;font-size:clamp(34px,5.4vw,62px);line-height:1.06;letter-spacing:-.02em;max-width:18ch">${title}</div>` +
        (subtitle
          ? `<div style="margin-top:22px;font-size:clamp(16px,2.1vw,23px);line-height:1.5;color:${B.muted};max-width:38ch">${subtitle}</div>`
          : "") +
        `<div style="margin-top:34px;width:56px;height:4px;border-radius:99px;background:${B.accent}"></div>`;
      requestAnimationFrame(() => {
        el!.style.opacity = "1";
      });
    },
    { kicker, title, subtitle, B: BRAND },
  );
  logTiming(`[CARD] ${title}${subtitle ? " — " + subtitle : ""}`);
  await dwell(page, holdMs);
  if (keep) return;
  await page.evaluate(() => {
    const el = document.getElementById("__pw_titlecard__");
    if (el) el.style.opacity = "0";
    const cur = document.getElementById("__pw_cursor__");
    if (cur) cur.style.display = "";
  });
  await dwell(page, 560);
  await page.evaluate(() => document.getElementById("__pw_titlecard__")?.remove());
}

// ── Injected init scripts (run on every navigation) ────────────────────────────
//
// These are passed to addInitScript as PLAIN STRINGS, not functions. Under tsx,
// esbuild's `keepNames` wraps named nested functions with a `__name(...)` helper
// that isn't defined in the browser context — so a function with nested named
// helpers throws `__name is not defined` once serialized into the page. Strings
// are copied verbatim and sidestep the transform entirely.

/** Draws a fake arrow cursor that follows Playwright's mouse, plus click ripples. */
const CURSOR_INIT_JS = `(function () {
  var ID = "__pw_cursor__";
  var STORE = "__pw_cursor_pos__";
  var ARROW = "<svg xmlns='http://www.w3.org/2000/svg' width='26' height='26' viewBox='0 0 24 24'><path d='M4 2 L4 20 L9 15.4 L12.3 21.6 L15.1 20.3 L11.9 14.3 L18 14 Z' fill='#ffffff' stroke='#0f172a' stroke-width='1.4' stroke-linejoin='round'/></svg>";
  function readPos() {
    try { var p = JSON.parse(sessionStorage.getItem(STORE) || ""); if (p && typeof p.x === "number") return p; } catch (e) {}
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  }
  function ensure() {
    var c = document.getElementById(ID);
    if (c) return c;
    c = document.createElement("div");
    c.id = ID;
    c.innerHTML = ARROW;
    c.style.cssText = "position:fixed;left:0;top:0;width:26px;height:26px;z-index:2147483647;pointer-events:none;will-change:transform;transition:transform 45ms linear;filter:drop-shadow(0 2px 3px rgba(0,0,0,.4))";
    var p = readPos();
    c.style.transform = "translate(" + (p.x - 3) + "px," + (p.y - 2) + "px)";
    (document.body || document.documentElement).appendChild(c);
    return c;
  }
  function place(x, y) {
    ensure().style.transform = "translate(" + (x - 3) + "px," + (y - 2) + "px)";
    try { sessionStorage.setItem(STORE, JSON.stringify({ x: x, y: y })); } catch (e) {}
  }
  window.addEventListener("DOMContentLoaded", function () { var p = readPos(); place(p.x, p.y); });
  document.addEventListener("mousemove", function (e) { place(e.clientX, e.clientY); }, true);
  document.addEventListener("mousedown", function (e) {
    var r = document.createElement("div");
    r.style.cssText = "position:fixed;left:" + e.clientX + "px;top:" + e.clientY + "px;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;z-index:2147483646;pointer-events:none;background:rgba(45,212,191,.55);animation:__pw_ripple 560ms ease-out forwards";
    (document.body || document.documentElement).appendChild(r);
    setTimeout(function () { r.remove(); }, 580);
  }, true);
  var st = document.createElement("style");
  st.textContent = "@keyframes __pw_ripple{from{transform:scale(.4);opacity:.85}to{transform:scale(3.4);opacity:0}}";
  (document.head || document.documentElement).appendChild(st);
})();`;

/** Persistently hide the dev-only floating clock widget (bottom-fixed). */
const HIDE_DEVCLOCK_JS = `(function () {
  var st = document.createElement("style");
  st.textContent = '[class*="fixed bottom"]{display:none !important}';
  function attach() { (document.head || document.documentElement).appendChild(st); }
  if (document.head) attach(); else window.addEventListener("DOMContentLoaded", attach);
})();`;
