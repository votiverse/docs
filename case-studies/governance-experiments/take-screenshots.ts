/**
 * Screenshot capture script for the Governance Experiments case study.
 *
 * This case study walks researchers through the four governance quadrants
 * (candidacy × transferable) using existing seed assemblies:
 *
 *   Direct Democracy (Greenfield)    — candidacy=false, transferable=false
 *   Liquid Open (OSC)                — candidacy=false, transferable=true
 *   Representative (Board)           — candidacy=true,  transferable=false
 *   Liquid Delegation (Maple Heights)— candidacy=true,  transferable=true
 *
 * Requires: running servers (VCP :3000, backend :4000, web :5173)
 * Requires: data seeded (pnpm reset in both VCP and backend)
 *
 * Usage: npm run screenshots:governance-experiments
 *   or:  npx tsx case-studies/governance-experiments/take-screenshots.ts
 */

import { chromium, type Page } from "playwright";
import { join } from "path";
import { loadManifest } from "../../lib/seed-manifest.js";

const BASE = "http://localhost:5173";
const API = "http://localhost:4000";
const IMG_DIR = join(import.meta.dirname ?? ".", "images");

const manifest = loadManifest();

// Assembly IDs for the four quadrants
const GREENFIELD_ID = manifest.assembly("greenfield");
const OSC_ID = manifest.assembly("osc");
const BOARD_ID = manifest.assembly("board");
const MAPLE_ID = manifest.assembly("maple");
const MUNICIPAL_ID = manifest.assembly("municipal");

async function login(page: Page, email: string): Promise<void> {
  await page.goto(BASE);
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE);
  await page.waitForSelector('input[type="email"], input');
  const emailInput = page.locator("input").first();
  await emailInput.fill(email);
  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.fill("password");
  await page.locator('button:has-text("Sign in")').click();
  await page.waitForTimeout(2000);
}

async function screenshot(page: Page, name: string, waitMs = 1000): Promise<void> {
  await page.waitForTimeout(waitMs);
  // Hide dev clock widget for clean screenshots
  await page
    .evaluate(() => {
      const els = document.querySelectorAll('[class*="fixed bottom"]');
      els.forEach((el) => ((el as HTMLElement).style.display = "none"));
    })
    .catch(() => {});
  const path = join(IMG_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  console.log(`  📸 ${name}.png`);
}

async function main() {
  console.log("🎬 Governance Experiments — Screenshot Capture\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // ── Act 1: The Researcher's Dashboard ────────────────────────────────
  // Marcus Chen is in OSC (Liquid Open), Municipal (Civic), and Maple Heights (Liquid Delegation)
  console.log("Act 1: The researcher's dashboard — multiple governance models\n");

  await login(page, "marcus-chen@example.com");
  await screenshot(page, "01-researcher-dashboard");

  // Navigate to My Groups to see the different governance labels
  await page.locator('a:has-text("My Groups")').first().click();
  await page.waitForTimeout(1500);
  await screenshot(page, "02-my-groups-multiple-presets");

  // ── Act 2: Direct Democracy — Greenfield Community Council ──────────
  // Elena is in Greenfield (Direct Democracy) + Maple Heights (Liquid Delegation)
  console.log("\nAct 2: Direct Democracy — everyone votes directly\n");

  await login(page, "elena-vasquez@example.com");
  await page.locator('a:has-text("My Groups")').first().click();
  await page.waitForTimeout(1500);
  await screenshot(page, "03-elena-groups-direct-vs-liquid");

  // Go into Greenfield
  await page.locator("text=Greenfield Community Council").click();
  await page.waitForTimeout(1500);
  await screenshot(page, "04-greenfield-votes-direct-democracy");

  // Check the navbar — should have Votes only (no Delegates, no Topics, no Candidates)
  // Click on the Group link to see the settings
  await page.locator('a:has-text("Greenfield Community Council")').first().click();
  await page.waitForTimeout(1500);
  await screenshot(page, "05-greenfield-group-settings");

  // Scroll down to see config
  await page.evaluate(() => window.scrollBy(0, 300));
  await screenshot(page, "06-greenfield-config-no-delegation");

  // ── Act 3: Liquid Open — OSC Governance Board ──────────────────────
  // Marcus is in OSC (Liquid Open) — informal delegation, no candidates, public ballot
  console.log("\nAct 3: Liquid Open — informal delegation without candidates\n");

  await login(page, "marcus-chen@example.com");
  await page.goto(`${BASE}/assembly/${OSC_ID}/events`);
  await page.waitForTimeout(1500);
  await screenshot(page, "07-osc-votes-liquid-open");

  // Check delegates page — should exist (delegation enabled via transferable=true)
  await page.locator('a:has-text("Delegates")').first().click();
  await page.waitForTimeout(1500);
  await screenshot(page, "08-osc-delegates-no-candidates");

  // Go to group settings to show config
  await page.goto(`${BASE}/assembly/${OSC_ID}`);
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollBy(0, 300));
  await screenshot(page, "09-osc-config-liquid-open");

  // ── Act 4: Representative — Board of Directors ─────────────────────
  // James Okafor is in Board (Representative) — candidates only, no chains
  console.log("\nAct 4: Representative — appointed proxy, no chains\n");

  await login(page, "james-okafor@example.com");
  await page.goto(`${BASE}/assembly/${BOARD_ID}/events`);
  await page.waitForTimeout(1500);
  await screenshot(page, "10-board-votes-representative");

  // Check delegates — should show candidates
  await page.locator('a:has-text("Delegates")').first().click();
  await page.waitForTimeout(1500);
  await screenshot(page, "11-board-delegates-candidates-only");

  // Check candidates page
  await page.locator('a:has-text("Candidates")').first().click();
  await page.waitForTimeout(1500);
  await screenshot(page, "12-board-candidates-representative");

  // Group config
  await page.goto(`${BASE}/assembly/${BOARD_ID}`);
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollBy(0, 300));
  await screenshot(page, "13-board-config-representative");

  // ── Act 5: Liquid Delegation — Maple Heights ───────────────────────
  // Elena is in Maple Heights (Liquid Delegation) — candidates + chains + community notes
  console.log("\nAct 5: Liquid Delegation — the recommended default\n");

  await login(page, "elena-vasquez@example.com");
  await page.goto(`${BASE}/assembly/${MAPLE_ID}/events`);
  await page.waitForTimeout(1500);
  await screenshot(page, "14-maple-votes-liquid-delegation");

  // Show full navbar: Votes, Surveys, Delegates, Topics, Notes, Candidates
  // Navigate to delegates to show the difference from Board
  await page.locator('a:has-text("Delegates")').first().click();
  await page.waitForTimeout(1500);
  await screenshot(page, "15-maple-delegates-with-candidates");

  // Topics page — topic-scoped delegation
  await page.locator('a:has-text("Topics")').first().click();
  await page.waitForTimeout(1500);
  await screenshot(page, "16-maple-topics-scoped-delegation");

  // Community notes
  await page.locator('a:has-text("Notes")').first().click();
  await page.waitForTimeout(1500);
  await screenshot(page, "17-maple-notes-community-verification");

  // Group config
  await page.goto(`${BASE}/assembly/${MAPLE_ID}`);
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollBy(0, 300));
  await screenshot(page, "18-maple-config-liquid-delegation");

  // ── Act 6: Creating a New Experiment ───────────────────────────────
  // Show group creation with the new streamlined form
  console.log("\nAct 6: Creating a new governance experiment\n");

  await page.goto(`${BASE}/assemblies`);
  await page.waitForTimeout(1000);
  await page.locator('button:has-text("New Group")').click();
  await page.waitForTimeout(500);
  await screenshot(page, "19-new-group-form-with-timeline");

  // Open customize modal
  await page.locator('text=Customize rules').click();
  await page.waitForTimeout(500);
  await screenshot(page, "20-customize-rules-modal");

  // Scroll to see all options
  await page.evaluate(() => {
    const modal = document.querySelector('[class*="overflow-y"]');
    if (modal) modal.scrollTop = modal.scrollHeight;
  });
  await page.waitForTimeout(300);
  await screenshot(page, "21-customize-features-section");

  // ── Cleanup ────────────────────────────────────────────────────────
  console.log("\n✅ Done! Screenshots saved to images/\n");
  await browser.close();
}

main().catch(console.error);
