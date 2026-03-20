/**
 * Screenshot capture for the Riverside Community Center case study.
 *
 * Focuses on topic classification, topic-scoped delegation, issue-scoped
 * delegation, issue cancellation, and the correction workflow.
 *
 * Uses seed data from the Riverside Community Center assembly.
 *
 * Usage: npm run screenshots:riverside
 *   or:  npx tsx case-studies/riverside-community-center/take-screenshots.ts
 */

import { chromium, type Page } from "playwright";
import { join } from "path";
import { loadManifest } from "../../lib/seed-manifest.js";

const BASE = "http://localhost:5173";
const IMG_DIR = join(import.meta.dirname ?? ".", "images");

const manifest = loadManifest();
const RSV_ID = manifest.assembly("riverside");
const EVENTS = {
  spring: manifest.event("riverside-spring"),
  summer: manifest.event("riverside-summer"),
  camp: manifest.event("riverside-camp"),
};

async function login(page: Page, email: string): Promise<void> {
  await page.goto(BASE);
  await page.waitForTimeout(500);
  await page.evaluate(() => localStorage.clear());
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
  console.log("🎬 Riverside Community Center — Screenshot Capture\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // ═══════════════════════════════════════════════════════════════════
  // ACT 1: Priya's View — Topic-Scoped Delegation
  // ═══════════════════════════════════════════════════════════════════

  console.log("Act 1: Priya — Topic-Scoped Delegation");

  await login(page, "priya-nair@example.com");

  // 01. Priya's dashboard — shows Riverside with active votes
  await page.goto(BASE);
  await shot(page, "01-priya-dashboard");

  // 02. Priya's delegation page — Sam (Budget) and Marco (Facilities)
  await page.goto(`${BASE}/assembly/${RSV_ID}/delegations`);
  await shot(page, "02-priya-delegates");

  // 03. Closed event — Spring review with topic badges and results
  await page.goto(`${BASE}/assembly/${RSV_ID}/events/${EVENTS.spring}`);
  await shot(page, "03-spring-results-top");

  // 04. Scroll to see all three issues with topic badges
  await page.evaluate(() => window.scrollBy(0, 500));
  await shot(page, "04-spring-results-bottom", 500);

  // ═══════════════════════════════════════════════════════════════════
  // ACT 2: The Misclassified Issue
  // ═══════════════════════════════════════════════════════════════════

  console.log("Act 2: The Misclassified Issue");

  // 05. Summer Planning event — shows HVAC, cancelled camp fees, and adult fitness
  await page.goto(`${BASE}/assembly/${RSV_ID}/events/${EVENTS.summer}`);
  await shot(page, "05-summer-planning-top");

  // 06. Scroll to show cancelled issue and adult fitness
  await page.evaluate(() => window.scrollBy(0, 400));
  await shot(page, "06-cancelled-issue", 500);

  // ═══════════════════════════════════════════════════════════════════
  // ACT 3: The Correction — Reclassified Under Programs / Youth
  // ═══════════════════════════════════════════════════════════════════

  console.log("Act 3: The Correction");

  // 07. Corrected event — Summer Camp Program Design with Programs / Youth badge
  await page.goto(`${BASE}/assembly/${RSV_ID}/events/${EVENTS.camp}`);
  await shot(page, "07-corrected-camp-issue");

  // ═══════════════════════════════════════════════════════════════════
  // ACT 4: Diana's View — The Director
  // ═══════════════════════════════════════════════════════════════════

  console.log("Act 4: Diana — The Director");

  await login(page, "diana-reyes@example.com");

  // 08. Events list — all three events with statuses
  await page.goto(`${BASE}/assembly/${RSV_ID}/events`);
  await shot(page, "08-diana-events-list");

  // 09. Diana's view of the spring results — she voted on everything directly
  await page.goto(`${BASE}/assembly/${RSV_ID}/events/${EVENTS.spring}`);
  await shot(page, "09-diana-spring-results");

  // ═══════════════════════════════════════════════════════════════════
  // ACT 5: Community Notes
  // ═══════════════════════════════════════════════════════════════════

  console.log("Act 5: Community Notes");

  // 10. Notes page — shows Leah's misclassification note
  await page.goto(`${BASE}/assembly/${RSV_ID}/notes`);
  await shot(page, "10-community-notes");

  // ═══════════════════════════════════════════════════════════════════
  // ACT 6: Sam's View — The Finance Chair with Delegated Weight
  // ═══════════════════════════════════════════════════════════════════

  console.log("Act 6: Sam — Delegated Weight on Budget");

  await login(page, "sam-okonkwo@example.com");

  // 11. Sam's delegates page — shows who trusts him
  await page.goto(`${BASE}/assembly/${RSV_ID}/delegations`);
  await shot(page, "11-sam-delegations");

  // 12. Sam's view of the spring results — his vote on Budget/Fees carried weight
  await page.goto(`${BASE}/assembly/${RSV_ID}/events/${EVENTS.spring}`);
  await page.evaluate(() => window.scrollBy(0, 300));
  await shot(page, "12-sam-budget-weight", 500);

  // ═══════════════════════════════════════════════════════════════════
  // ACT 7: Governance Configuration
  // ═══════════════════════════════════════════════════════════════════

  console.log("Act 7: Governance Settings");

  // 13. Group settings showing CIVIC_PARTICIPATORY config
  await page.goto(`${BASE}/assembly/${RSV_ID}`);
  await page.evaluate(() => window.scrollBy(0, 400));
  await shot(page, "13-governance-settings");

  // ═══════════════════════════════════════════════════════════════════

  await browser.close();
  console.log(`\n✅ All screenshots captured! → ${IMG_DIR}/`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
