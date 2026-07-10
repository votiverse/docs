/**
 * Votiverse demo reel — the storyboard, as data.
 *
 * Part 1: the core loop (Maple Heights) — sign in, groups, members & invites, a proposal
 *         + community notes, voting, and results.
 * Part 2: the signature feature (liquid delegation) across Municipal and Riverside.
 *
 * URL tokens (`group:<name>`, `.../events/<manifestKey>`) resolve at runtime — see
 * `../storyboard.ts`. Narration lives here once: `say` = on-screen subtitle, `vo` =
 * voiceover over a title card. Captions (.srt + transcript) auto-generate from these.
 */
import type { Beat } from "../storyboard.js";

export const beats: Beat[] = [
  // ── Intro (opens on the login page loaded by the pre-roll) ──────────────────
  {
    vo: "Communities everywhere have to make decisions together.",
    card: {
      kicker: "Participatory governance",
      title: "Votiverse",
      subtitle: "A configurable engine for democratic decision-making.",
      holdMs: 3200,
    },
  },
  { vo: "Votiverse is an open platform that makes that simple — and transparent." },

  // ── Part 1 — the core loop (Maple Heights Condo Board) ──────────────────────
  {
    as: "elena-vasquez@example.com",
    caption: ["Sign in", "One account across every group you're part of."],
    say: "You sign in once — one account for every group you're in.",
    dwell: 1500,
    hideCaption: true,
  },
  {
    goto: "/",
    caption: ["Your dashboard", "Every group and open decision, in one place."],
    say: "Your dashboard shows every group, and every decision waiting on you.",
    dwell: 2400,
  },
  {
    goto: "/groups",
    caption: ["Your groups", "From a condo board to a citywide budget council."],
    say: "A group can be anything — a condo board, a nonprofit, a budget council.",
    dwell: 2400,
  },
  {
    goto: "group:maple",
    caption: ["Maple Heights Condo Board", "24 units making transparent decisions together."],
    say: "Maple Heights — a 24-unit condo board, deciding in the open.",
    dwell: 2600,
  },
  {
    goto: "group:maple/members",
    caption: ["Members & admission", "Who's in the group — and how new people join."],
    say: "Every group controls who gets in —",
    dwell: 1600,
  },
  {
    point: 'button:has-text("Invite link")',
    click: 'button:has-text("Invite link")',
    optional: true,
    caption: ["Invite by link", "Admission is controlled — invite links, handles, or approval."],
    say: "invite by link or handle, or require approval to join and vote.",
    dwell: 2400,
  },
  {
    as: "marcus-chen@example.com",
    goto: "group:maple/proposals",
    caption: ["Proposals", "A concrete, costed case for each choice."],
    say: "Before any vote, members put forward proposals —",
    dwell: 2000,
  },
  {
    click: 'a:has-text("Lobby Renovation")',
    optional: true,
    caption: ["Read the full argument", "Rationale and costs — not just a headline."],
    say: "a costed case for each option, with the full reasoning.",
    dwell: 1800,
  },
  { scroll: 340, dwell: 1800 },
  {
    goto: "group:maple/notes",
    caption: ["Community notes", "Members add context and corrections, in the open."],
    say: "Anyone can add community notes — context, right beside the proposal.",
    dwell: 2600,
    hideCaption: true,
  },
  {
    advanceDays: 9,
    goto: "group:maple/events/maple-lobby",
    caption: ["Voting is open", "When the window opens, members weigh in."],
    say: "When voting opens, members weigh in —",
    dwell: 1600,
  },
  { scroll: 300, dwell: 1000 },
  {
    click: 'button:has-text("For")',
    optional: true,
    caption: ["Cast your vote", "For, against, or abstain — private, and counted transparently."],
    say: "for, against, or abstain. Private, but the count is transparent.",
    dwell: 2400,
  },
  {
    advanceDays: 8,
    goto: "group:maple/events/maple-roof",
    caption: ["Results, revealed", "Outcomes publish only when voting closes — nothing hidden."],
    say: "Results stay sealed until voting closes —",
    dwell: 1800,
  },
  {
    scroll: 320,
    caption: ["Transparent tallies", "Every result is auditable back to the votes that produced it."],
    say: "then every outcome is published, traceable to the votes behind it.",
    dwell: 2600,
    hideCaption: true,
  },

  // ── Part 2 — the signature feature: liquid delegation ───────────────────────
  {
    resetClock: true,
    say: "",
    vo: "And here's what makes Votiverse different — liquid delegation.",
    card: {
      kicker: "Signature feature",
      title: "Liquid delegation",
      subtitle: "Delegate your vote by topic — or vote directly. Your call, on every issue.",
      holdMs: 3400,
    },
  },
  {
    as: "nkechi-adeyemi@example.com",
    goto: "group:municipal/delegations",
    caption: ["Trust an expert — on your terms", "Delegate the topics you choose; keep the rest for yourself."],
    say: "Delegate the topics you choose — and vote the rest yourself.",
    dwell: 2800,
  },
  {
    as: "carmen-delgado@example.com",
    goto: "/profile/delegators",
    caption: ["See who's entrusted you", "Delegates can always see the weight they carry."],
    say: "If people trust you on a topic, you see the weight you carry.",
    dwell: 2600,
  },
  {
    as: "marcus-chen@example.com",
    goto: "group:municipal/delegations",
    caption: ["Delegation can chain", "Trust can pass down a chain — and it's always visible."],
    say: "Trust can pass along a chain — always visible, never hidden.",
    dwell: 2600,
  },
  {
    goto: "group:municipal/events/municipal-emergency",
    caption: ["One vote can carry many", "A single vote reflects everyone who delegated it."],
    say: "So a single vote carries everyone who delegated it.",
    dwell: 1600,
  },
  { scroll: 320, dwell: 2000 },
  {
    as: "priya-nair@example.com",
    goto: "group:river/delegations",
    caption: ["Different delegates, different topics", "Budget to one trusted voice, facilities to another."],
    say: "Budget to one trusted neighbor, facilities to another.",
    dwell: 2800,
  },
  {
    goto: "group:river/events/riverside-spring",
    caption: ["Every issue, tagged by topic", "Classification is what makes topic-scoped delegation work."],
    say: "Every issue is tagged by topic — delegates vote only where trusted.",
    dwell: 1600,
  },
  { scroll: 360, dwell: 2400, hideCaption: true },

  // ── Outro ──────────────────────────────────────────────────────────────────
  {
    say: "",
    vo: "Votiverse — open source, and free for every community. votiverse.org",
    card: {
      kicker: "Open source · free for every community",
      title: "Votiverse",
      subtitle: "votiverse.org",
      holdMs: 3600,
      keep: true,
    },
    dwell: 300,
  },
];
