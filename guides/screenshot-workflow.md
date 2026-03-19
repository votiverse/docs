# Screenshot Workflow for Case Studies

Guide for creating reproducible, high-quality screenshots from the Votiverse web UI.

---

## Approach

We use **Playwright** (headless Chromium) to capture screenshots programmatically. This gives us:

- **Reproducible** — run the script anytime to regenerate all screenshots
- **Consistent** — same viewport size, Retina quality, no OS chrome
- **Automated** — walks through the full scenario without manual interaction
- **Version-controlled** — the script documents exactly what's being captured

## Prerequisites

```bash
# From the votiverse repo root
pnpm add -D playwright -w        # Install Playwright
npx playwright install chromium   # Install Chromium browser

# Running servers (all three must be up)
cd platform/vcp && pnpm dev       # Port 3000
cd platform/backend && pnpm dev   # Port 4000
cd platform/web && pnpm dev       # Port 5173
```

## Writing a Screenshot Script

Each case study has its own TypeScript script in `docs/case-study/`.

### Template

```typescript
import { chromium, type Page } from "playwright";
import { join } from "path";

const BASE = "http://localhost:5173";
const API = "http://localhost:4000";
const IMG_DIR = join(import.meta.dirname ?? ".", "images");

async function login(page: Page, email: string): Promise<void> {
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE);
  await page.locator("input").first().fill(email);
  await page.locator('input[type="password"]').fill("password");
  await page.locator('button:has-text("Sign in")').click();
  await page.waitForTimeout(2000);
}

async function screenshot(page: Page, name: string, waitMs = 1000): Promise<void> {
  await page.waitForTimeout(waitMs);
  await page.screenshot({ path: join(IMG_DIR, `${name}.png`), fullPage: false });
  console.log(`  📸 ${name}.png`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,  // Retina quality
  });
  const page = await context.newPage();

  // Your scenario here...
  await login(page, "elena-vasquez@example.com");
  await page.goto(`${BASE}/assemblies`);
  await screenshot(page, "01-my-groups");

  await browser.close();
}

main().catch(console.error);
```

### Running

```bash
cd platform/backend  # tsx is available here
npx tsx ../../docs/case-study/take-screenshots.ts
```

## Key Patterns

### Login switching

```typescript
// Clear session and login as a different user
await page.evaluate(() => localStorage.clear());
await login(page, "marcus-chen@example.com");
```

### Scrolling to reveal content

```typescript
// Scroll to bottom
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

// Scroll by a specific amount
await page.evaluate(() => window.scrollBy(0, 300));
```

### Advancing the dev clock

```typescript
// Advance VCP + backend by 9 days (through deliberation + curation)
await fetch("http://localhost:3000/dev/clock/advance", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ ms: 9 * 86400000 }),
});
await fetch("http://localhost:4000/dev/clock/advance", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ ms: 9 * 86400000 }),
});
```

### Seeding test notifications

```typescript
const res = await fetch(`${API}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "elena@example.com", password: "password" }),
});
const { accessToken } = await res.json();
await fetch(`${API}/dev/notifications/seed`, {
  method: "POST",
  headers: { Authorization: `Bearer ${accessToken}` },
});
```

### Clicking specific elements

```typescript
// By text — be specific to avoid ambiguity
await page.locator('button:has-text("Invite link")').click();

// When multiple elements match, use .first() or .nth()
await page.locator('button:has-text("For")').first().click();

// By role
await page.locator('button[aria-label*="Notification"]').click();
```

### Getting data from the page

```typescript
// Read a value from the DOM
const inviteCode = await page.evaluate(() => {
  const code = document.querySelector("code");
  return code?.textContent?.split("/invite/")[1] ?? null;
});
```

## Screenshot Conventions

| Aspect | Convention |
|--------|-----------|
| **Viewport** | 1280x800 logical pixels |
| **Scale** | 2x (Retina quality, 2560x1600 actual) |
| **Format** | PNG |
| **Naming** | `NN-kebab-case-description.png` (numbered for order) |
| **Directory** | `docs/case-study/images/` per case study |
| **Headless** | Always `true` — no OS chrome, no cursor |

## Scenario Data

Each case study may require specific data in the database. Options:

1. **Use seeded data** — the VCP and backend seed scripts create 5 assemblies with participants. Good for existing-feature screenshots.

2. **Create via API** — the script uses `fetch()` to create assemblies, events, proposals through the backend API. Good for custom scenarios.

3. **Existing scenario data** — if you've run the condo board roleplay, that data persists in the dev databases. The script can capture it directly.

After a `pnpm reset`, scenario data is lost. Document the setup steps in your script's comments.

## Workflow Summary

1. **Plan the narrative** — decide what story you're telling and what screenshots illustrate it
2. **Number the shots** — `01-`, `02-`, etc. for the order they appear in the document
3. **Write the script** — Playwright TypeScript, following the template above
4. **Run and verify** — check each screenshot looks right
5. **Write the markdown** — narrative text with `![alt](images/NN-name.png)` references
6. **Move to docs repo** — images + markdown go to `votiverse/docs` (separate repo)
