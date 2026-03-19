/**
 * Screenshot capture for the Neighborhood Budget Council case study.
 *
 * Focuses on delegation, topic scoping, chains, override rule,
 * weight computation, and community deliberation.
 *
 * Uses seed data from the Municipal Budget Committee assembly.
 *
 * Usage: npm run screenshots:neighborhood
 *   or:  npx tsx case-studies/neighborhood-budget-council/take-screenshots.ts
 */

import { chromium, type Page } from "playwright";
import { join } from "path";
import { loadManifest } from "../../lib/seed-manifest.js";

const BASE = "http://localhost:5173";
const API = "http://localhost:4000";
const IMG_DIR = join(import.meta.dirname ?? ".", "images");

const manifest = loadManifest();
const MUN_ID = manifest.assembly("municipal");
const EVENTS = {
  budgetCycle: manifest.event("municipal-budget"),
  emergencyInfra: manifest.event("municipal-emergency"),
};

async function login(page: Page, email: string): Promise<void> {
  // Navigate first, then clear storage on the page
  await page.goto(BASE);
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.goto(BASE);
  await page.waitForSelector("input");
  await page.locator("input").first().fill(email);
  await page.locator('input[type="password"]').fill("password");
  await page.locator('button:has-text("Sign in")').click();
  await page.waitForTimeout(2000);
}

async function shot(page: Page, name: string, waitMs = 1500): Promise<void> {
  await page.waitForTimeout(waitMs);
  // Hide dev clock widget for clean screenshots
  await page.evaluate(() => {
    const els = document.querySelectorAll('[class*="fixed bottom"]');
    els.forEach((el) => ((el as HTMLElement).style.display = "none"));
  }).catch(() => {});
  await page.screenshot({ path: join(IMG_DIR, `${name}.png`), fullPage: false });
  console.log(`  📸 ${name}.png`);
}

async function main() {
  console.log("🎬 Neighborhood Budget Council — Screenshot Capture\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // ── ACT 1: Carmen's View — The Active Delegate ────────────────

  console.log("Act 1: Carmen — The Infrastructure Expert");

  // Carmen Delgado receives both global and topic delegations
  await login(page, "carmen-delgado@example.com");

  // 01. Carmen's dashboard — shows her assemblies and pending work
  await page.goto(BASE);
  await shot(page, "01-carmen-dashboard");

  // 02. Municipal assembly dashboard — stats showing delegation
  await page.goto(`${BASE}/assembly/${MUN_ID}`);
  await shot(page, "02-municipal-dashboard");

  // 03. Carmen's delegations — she receives delegations from others
  await page.goto(`${BASE}/assembly/${MUN_ID}/delegations`);
  await shot(page, "03-carmen-delegations-received");

  // ── ACT 2: Nkechi's Topic-Scoped Delegation ──────────────────

  console.log("Act 2: Nkechi — Topic-Scoped Trust");

  // Nkechi trusts Carmen on Infrastructure, votes directly on everything else
  await login(page, "nkechi-adeyemi@example.com");

  // 04. Nkechi's delegations — shows topic-scoped delegation to Carmen
  await page.goto(`${BASE}/assembly/${MUN_ID}/delegations`);
  await shot(page, "04-nkechi-topic-delegation");

  // 05. Event view — some issues delegated (Infrastructure), others need direct vote
  await page.goto(`${BASE}/assembly/${MUN_ID}/events/${EVENTS.emergencyInfra}`);
  await shot(page, "05-nkechi-event-mixed-delegation");

  // Scroll to see issue-level delegation status
  await page.evaluate(() => window.scrollBy(0, 300));
  await shot(page, "06-nkechi-issues-detail", 500);

  // ── ACT 3: Omar's Chain — Depth-2 Delegation ─────────────────

  console.log("Act 3: Omar — Delegation Chain");

  // Omar → Kwame → Marcus (depth 2)
  await login(page, "omar-hadid@example.com");

  // 07. Omar's delegations — chain visualization
  await page.goto(`${BASE}/assembly/${MUN_ID}/delegations`);
  await shot(page, "07-omar-chain-delegation");

  // ── ACT 4: Marcus — The Terminal Voter ────────────────────────

  console.log("Act 4: Marcus — Carrying Delegated Weight");

  // Marcus receives votes from Omar→Kwame→Marcus chain
  await login(page, "marcus-chen@example.com");

  // 08. Marcus's delegations — shows he carries weight
  await page.goto(`${BASE}/assembly/${MUN_ID}/delegations`);
  await shot(page, "08-marcus-weight-delegation");

  // 09. Voting with weight — Marcus's vote counts for multiple people
  await page.goto(`${BASE}/assembly/${MUN_ID}/events/${EVENTS.emergencyInfra}`);
  await shot(page, "09-marcus-voting-with-weight");

  // Scroll to see vote buttons
  await page.evaluate(() => window.scrollBy(0, 300));
  await shot(page, "10-marcus-vote-buttons", 500);

  // ── ACT 5: Surveys — Community Observations ───────────────────

  console.log("Act 5: Surveys");

  // 11. Surveys page (Municipal has surveys enabled)
  await page.goto(`${BASE}/assembly/${MUN_ID}/surveys`);
  await shot(page, "11-surveys-list");

  // ── ACT 6: The Deliberation Process ───────────────────────────

  console.log("Act 6: Event Overview");

  // 12. Events list showing different phases
  await page.goto(`${BASE}/assembly/${MUN_ID}/events`);
  await shot(page, "12-events-list");

  // 13. Emergency Infrastructure event detail
  await page.goto(`${BASE}/assembly/${MUN_ID}/events/${EVENTS.emergencyInfra}`);
  await shot(page, "13-emergency-infra-detail");

  // Scroll to see all issues
  await page.evaluate(() => window.scrollBy(0, 400));
  await shot(page, "14-emergency-infra-issues", 500);

  // ── ACT 7: Group Settings ─────────────────────────────────────

  console.log("Act 7: Governance Configuration");

  // 14. Assembly dashboard with governance settings visible
  await page.goto(`${BASE}/assembly/${MUN_ID}`);
  await page.evaluate(() => window.scrollBy(0, 400));
  await shot(page, "15-governance-settings");

  // Scroll more to see features
  await page.evaluate(() => window.scrollBy(0, 300));
  await shot(page, "16-features-config", 500);

  // ── Done ──────────────────────────────────────────────────────

  await browser.close();
  console.log(`\n✅ All screenshots captured! → ${IMG_DIR}/`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
