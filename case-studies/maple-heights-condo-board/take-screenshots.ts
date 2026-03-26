/**
 * Screenshot capture script for the Maple Heights Condo Board case study.
 *
 * Uses Playwright to navigate through the scenario and capture polished screenshots.
 * Requires: npx playwright (available globally)
 * Requires: running servers (VCP :3000, backend :4000, web :5173)
 * Requires: data seeded (pnpm reset in both VCP and backend)
 *
 * Usage: npm run screenshots:maple-heights
 *   or:  npx tsx case-studies/maple-heights-condo-board/take-screenshots.ts
 */

import { chromium, type Page, type BrowserContext } from "playwright";
import { join } from "path";
import { loadManifest } from "../../lib/seed-manifest.js";

const BASE = process.env.WEB_URL || "http://localhost:5174";
const API = "http://localhost:4000";
const IMG_DIR = join(import.meta.dirname ?? ".", "images");

const manifest = loadManifest();
const ASM_ID = manifest.assembly("maple");
const LOBBY_EVENT_ID = manifest.event("maple-lobby");
const LOBBY_ISSUE_ID = manifest.issue("maple-lobby", 0);
const ROOF_EVENT_ID = manifest.event("maple-roof");

let ctx: BrowserContext;

async function login(page: Page, email: string): Promise<string> {
  // Clear cookies (auth is cookie-based on web) and localStorage
  await ctx.clearCookies();
  await page.goto(`${BASE}/login`);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector('input#email', { timeout: 15000 });
  await page.locator('input#email').fill(email);
  await page.locator('input#password').fill("password1234");
  await page.locator('button:has-text("Sign in")').click();
  await page.waitForTimeout(2000);
  return email;
}

async function screenshot(page: Page, name: string, waitMs = 1000): Promise<void> {
  await page.waitForTimeout(waitMs);
  // Hide dev clock widget for clean screenshots
  await page.evaluate(() => {
    const els = document.querySelectorAll('[class*="fixed bottom"]');
    els.forEach((el) => ((el as HTMLElement).style.display = "none"));
  }).catch(() => {});
  const path = join(IMG_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  console.log(`  📸 ${name}.png`);
}

async function main() {
  console.log("🎬 Maple Heights Condo Board — Screenshot Capture\n");

  const browser = await chromium.launch({ headless: true });
  ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2, // Retina quality
  });
  const page = await ctx.newPage();

  // ── ACT 1: Group Creation ──────────────────────────────────────

  console.log("Act 1: Group Creation");

  // 1. Login page
  await page.goto(`${BASE}/login`);
  await page.waitForTimeout(1000);
  await screenshot(page, "01-login-page");

  // 2. Login as Elena and see dashboard
  await login(page, "elena-vasquez@example.com");
  await screenshot(page, "02-elena-dashboard");

  // 3. My Groups page with Maple Heights
  await page.goto(`${BASE}/assemblies`);
  await page.waitForTimeout(1500);
  await screenshot(page, "03-my-groups");

  // 4. Group dashboard with welcome card
  await page.goto(`${BASE}/assembly/${ASM_ID}`);
  await page.waitForTimeout(2000);
  await screenshot(page, "04-group-dashboard");

  // 5. Members page showing 6 members
  await page.goto(`${BASE}/assembly/${ASM_ID}/members`);
  await page.waitForTimeout(1500);
  await screenshot(page, "05-members-page");

  // 6. Generate invite link — click the button
  await page.locator('button:has-text("Invite link")').click();
  await page.waitForTimeout(1500);
  await screenshot(page, "06-invite-link-generated");

  // ── ACT 2: Invite Preview (as Sofia) ──────────────────────────

  console.log("Act 2: Invite Flow");

  // Get the invite token from the page
  const inviteCode = await page.evaluate(() => {
    const code = document.querySelector("code");
    if (!code) return null;
    const url = code.textContent ?? "";
    return url.split("/invite/")[1] ?? null;
  });

  if (inviteCode) {
    // Login as Sofia
    await login(page, "sofia-reyes@example.com");

    // 7. Invite preview page
    await page.goto(`${BASE}/invite/${inviteCode}`);
    await page.waitForTimeout(2000);
    await screenshot(page, "07-invite-preview");

    // Scroll to see the join button
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await screenshot(page, "08-invite-preview-join-button");
  } else {
    console.log("  ⚠️ No invite link found, skipping invite preview screenshots");
  }

  // ── ACT 3: Notification Bell ──────────────────────────────────

  console.log("Act 3: Notifications");

  // Login as Elena to see admin notifications
  await login(page, "elena-vasquez@example.com");

  // Seed some notifications
  const loginRes = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "elena-vasquez@example.com", password: "password1234" }),
  });
  const { accessToken } = await loginRes.json() as { accessToken: string };
  await fetch(`${API}/dev/notifications/seed`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
  });

  // Go to dashboard — sidebar shows Notifications link
  await page.goto(BASE);
  await page.waitForTimeout(2000);
  await screenshot(page, "09-dashboard-with-sidebar");

  // Navigate to notifications page
  await page.goto(`${BASE}/notifications`);
  await page.waitForTimeout(1500);
  await screenshot(page, "10-notifications-page");

  // ── ACT 4: Proposals & Community Notes ────────────────────────

  console.log("Act 4: Proposals & Notes");

  // Login as Marcus to see his proposal
  await login(page, "marcus-chen@example.com");

  // 12. Proposals page with the submitted proposal
  await page.goto(`${BASE}/assembly/${ASM_ID}/proposals?issueId=${LOBBY_ISSUE_ID}`);
  await page.waitForTimeout(2000);
  await screenshot(page, "12-proposals-list");

  // 13. Expand the proposal to read it
  await page.locator('text=Read proposal').click();
  await page.waitForTimeout(1500);
  await screenshot(page, "13-proposal-rendered");

  // Scroll to see the cost breakdown
  await page.evaluate(() => window.scrollBy(0, 300));
  await page.waitForTimeout(500);
  await screenshot(page, "14-proposal-cost-breakdown");

  // 14. Show community notes (click the Notes button on the proposal, not the nav link)
  await page.locator('button:has-text("Notes")').click();
  await page.waitForTimeout(1000);
  await screenshot(page, "15-community-note");

  // ── ACT 5: Voting ─────────────────────────────────────────────

  console.log("Act 5: Voting");

  // Advance dev clock to voting phase
  await fetch("http://localhost:3000/dev/clock/advance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ms: 777600000 }), // 9 days
  });
  await fetch(`${API}/dev/clock/advance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ms: 777600000 }),
  });

  // 15. Event detail in voting phase
  await page.goto(`${BASE}/assembly/${ASM_ID}/events/${LOBBY_EVENT_ID}`);
  await page.waitForTimeout(2000);
  await screenshot(page, "16-voting-open");

  // Scroll to see vote buttons
  await page.evaluate(() => window.scrollBy(0, 200));
  await page.waitForTimeout(500);
  await screenshot(page, "17-vote-buttons");

  // Cast a vote
  await page.locator('button:has-text("For")').first().click();
  await page.waitForTimeout(2000);
  await screenshot(page, "18-vote-cast");

  // Advance to results
  await fetch("http://localhost:3000/dev/clock/advance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ms: 691200000 }), // 8 more days
  });
  await fetch(`${API}/dev/clock/advance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ms: 691200000 }),
  });

  // Go to the roof repair event (which already has results)
  await page.goto(`${BASE}/assembly/${ASM_ID}/events/${ROOF_EVENT_ID}`);
  await page.waitForTimeout(2000);
  await screenshot(page, "19-results-revealed");

  // Scroll to see result bars
  await page.evaluate(() => window.scrollBy(0, 200));
  await page.waitForTimeout(500);
  await screenshot(page, "20-results-bar-chart");

  // Reset clocks
  await fetch("http://localhost:3000/dev/clock/reset", { method: "POST" });
  await fetch(`${API}/dev/clock/reset`, { method: "POST" });

  // ── Done ──────────────────────────────────────────────────────

  await browser.close();

  console.log("\n✅ All screenshots captured!");
  console.log(`   Saved to: ${IMG_DIR}/`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
