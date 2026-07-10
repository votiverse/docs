/**
 * Declarative storyboard runner.
 *
 * A storyboard is an array of Beats — plain data describing what happens on screen.
 * `runStoryboard()` interprets them by calling the video-helpers toolkit, so authoring a
 * new video is writing a data file (see `storyboards/`), not imperative Playwright code.
 *
 * URL tokens keep storyboards reseed-proof (group IDs change on every reseed):
 *   "/"                                → the app root (dashboard)
 *   "/groups", "/profile/delegators"   → literal app paths
 *   "group:maple"                      → /group/<id>            (id resolved by NAME)
 *   "group:maple/members"              → /group/<id>/members
 *   "group:maple/events/maple-lobby"   → /group/<id>/events/<eventId from the seed manifest>
 *
 * Per-beat execution order (each field is optional; omit what you don't need):
 *   login → clock → navigate → point → click → scroll → caption → subtitle → voiceover
 *         → card → action → dwell → hideCaption
 */

import type { BrowserContext, Page } from "playwright";
import {
  login,
  go,
  groupId,
  showCaption,
  hideCaption,
  subtitle,
  narrate,
  pointAt,
  smartClick,
  smoothScroll,
  titleCard,
  dwell,
} from "../lib/video-helpers.js";

const VCP = "http://localhost:3000";
const API = "http://localhost:4000";
const DAY = 86_400_000;

/** The seed-manifest reader surface the runner needs (loadManifest() satisfies it). */
type ManifestLike = { event(key: string): string };

export interface CardSpec {
  kicker?: string;
  title: string;
  subtitle?: string;
  holdMs?: number;
  keep?: boolean;
}

export interface Beat {
  /** Log in as this seeded email first (switches persona). */
  as?: string;
  /** Advance the dev clock by N days before the beat. */
  advanceDays?: number;
  /** Reset the dev clock before the beat. */
  resetClock?: boolean;
  /** Navigate to a URL token (see module header). Its caption rides along with the nav. */
  goto?: string;
  /** Lower-third caption: [title, subtitle]. Shown via go() when `goto` is set, else standalone. */
  caption?: [string, string?];
  /** Glide the cursor to a selector (no click). */
  point?: string;
  /** Click a selector. */
  click?: string;
  /** Treat point/click as optional — a missing target is skipped, not fatal. */
  optional?: boolean;
  /** Smooth-scroll by dy pixels (positive = down). */
  scroll?: number;
  /** On-screen narration subtitle; "" clears it. */
  say?: string;
  /** Voiceover line with NO on-screen subtitle (spoken over a title card). */
  vo?: string;
  /** Full-screen branded card (intro / divider / outro). `vo` is spoken over it. */
  card?: CardSpec;
  /** Escape hatch for anything the fields don't cover. */
  action?: (page: Page) => Promise<void>;
  /** Pause (ms) at the end of the beat. */
  dwell?: number;
  /** Remove the lower-third caption at the end of the beat. */
  hideCaption?: boolean;
}

async function advanceClock(ms: number): Promise<void> {
  const body = JSON.stringify({ ms });
  const headers = { "Content-Type": "application/json" };
  await Promise.all([
    fetch(`${VCP}/dev/clock/advance`, { method: "POST", headers, body }).catch(() => {}),
    fetch(`${API}/dev/clock/advance`, { method: "POST", headers, body }).catch(() => {}),
  ]);
}

export async function resetClock(): Promise<void> {
  await Promise.all([
    fetch(`${VCP}/dev/clock/reset`, { method: "POST" }).catch(() => {}),
    fetch(`${API}/dev/clock/reset`, { method: "POST" }).catch(() => {}),
  ]);
}

/** Resolve a URL token against the current page (group IDs) and the seed manifest (event IDs). */
async function resolveUrl(page: Page, token: string, base: string, m: ManifestLike): Promise<string> {
  if (token.startsWith("/")) return base + (token === "/" ? "" : token);
  const slash = token.indexOf("/");
  const head = slash === -1 ? token : token.slice(0, slash);
  const rest = slash === -1 ? "" : token.slice(slash + 1);
  const gm = head.match(/^group:(.+)$/);
  if (gm) {
    const id = await groupId(page, new RegExp(gm[1]!, "i"));
    const parts = rest ? rest.split("/") : [];
    let path = `/group/${id}`;
    if (parts[0] === "events" && parts[1]) path += `/events/${m.event(parts[1])}`;
    else if (parts[0]) path += `/${parts[0]}`;
    return base + path;
  }
  return base + "/" + token;
}

/** Run a storyboard end-to-end against an already-open page. */
export async function runStoryboard(
  ctx: BrowserContext,
  page: Page,
  base: string,
  m: ManifestLike,
  beats: Beat[],
): Promise<void> {
  for (const beat of beats) {
    if (beat.as) await login(ctx, page, base, beat.as);
    if (beat.resetClock) await resetClock();
    if (beat.advanceDays) await advanceClock(beat.advanceDays * DAY);

    if (beat.goto) {
      const url = await resolveUrl(page, beat.goto, base, m);
      await go(page, url, beat.caption?.[0], beat.caption?.[1] ?? "");
    }

    if (beat.point) await pointAt(page, beat.point, { optional: beat.optional });
    if (beat.click) await smartClick(page, beat.click, { optional: beat.optional });
    if (beat.scroll) await smoothScroll(page, beat.scroll);

    // Caption for non-navigation beats appears *after* the interaction it describes.
    if (!beat.goto && beat.caption) await showCaption(page, beat.caption[0], beat.caption[1] ?? "");

    // subtitle before voiceover: an empty say ("") closes the previous cue so a following
    // vo() opens a fresh one (otherwise the vo cue would be closed immediately).
    if (beat.say !== undefined) await subtitle(page, beat.say);
    if (beat.vo) narrate(beat.vo);
    if (beat.card) await titleCard(page, beat.card);

    if (beat.action) await beat.action(page);
    if (beat.dwell) await dwell(page, beat.dwell);
    if (beat.hideCaption) await hideCaption(page);
  }
}
