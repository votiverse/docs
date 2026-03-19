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
import { loadManifest } from "../../lib/seed-manifest.js";

const BASE = "http://localhost:5173";
const API = "http://localhost:4000";
const IMG_DIR = join(import.meta.dirname ?? ".", "images");

// Load entity IDs from the seed manifest — never hardcode UUIDs
const manifest = loadManifest();
const ASM_ID = manifest.assembly("maple");
const EVENT_ID = manifest.event("maple-lobby");

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
  // Hide dev clock widget for clean screenshots
  await page.evaluate(() => {
    const els = document.querySelectorAll('[class*="fixed bottom"]');
    els.forEach((el) => ((el as HTMLElement).style.display = "none"));
  }).catch(() => {});
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
  await page.goto(`${BASE}/assembly/${ASM_ID}`);
  await screenshot(page, "01-group-dashboard");

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

## Seed Manifest — Resolving Entity IDs

The VCP seed generates UUIDs dynamically. Screenshot scripts must **never hardcode UUIDs** — they change on every `pnpm reset`. Instead, use the **seed manifest**.

After seeding, the VCP writes `platform/vcp/seed-manifest.json` with all key→UUID mappings. The shared reader at `lib/seed-manifest.ts` provides typed lookups:

```typescript
import { loadManifest } from "../../lib/seed-manifest.js";

const m = loadManifest();

m.assembly("maple")                  // → assembly UUID
m.event("maple-lobby")               // → event UUID
m.issue("maple-lobby", 0)            // → first issue UUID in that event
m.participant("maple", "Elena Vasquez") // → participant UUID
m.topic("municipal", "roads")         // → topic UUID
```

The reader auto-discovers the manifest by looking for a sibling `votiverse/` repo. Override with the `SEED_MANIFEST_PATH` environment variable if your layout differs.

**If the manifest is missing**, the reader throws a clear error telling you to run `pnpm reset`.

## Scenario Data

Each case study uses data from the standard VCP seed. To add a new scenario:

1. **Define your assembly, events, and content** in `platform/vcp/scripts/seed-data/` (organizations, participants, events, votes, content).
2. **Run `pnpm reset`** in both VCP and backend — the manifest regenerates automatically.
3. **Reference entities by key** in your screenshot script using `loadManifest()`.

Currently seeded assemblies and their keys:

| Key          | Assembly                 | Case Study |
|--------------|--------------------------|------------|
| `greenfield` | Greenfield Community Council | — |
| `osc`        | OSC Governance Board     | — |
| `municipal`  | Municipal Budget Committee | Neighborhood Budget Council |
| `youth`      | Youth Advisory Panel     | — |
| `board`      | Board of Directors       | — |
| `maple`      | Maple Heights Condo Board | Maple Heights Condo Board |

## Workflow Summary

1. **Plan the narrative** — decide what story you're telling and what screenshots illustrate it
2. **Add seed data** — define the assembly, participants, events, and content in the VCP seed
3. **Reset** — `pnpm reset` in VCP and backend; manifest regenerates
4. **Write the script** — Playwright TypeScript using `loadManifest()` for IDs, following the template above
5. **Add npm script** — `"screenshots:<name>": "tsx case-studies/<name>/take-screenshots.ts"` in `package.json`
6. **Run and verify** — `npm run screenshots:<name>` with all three servers running
7. **Write the markdown** — narrative text with `![alt](images/NN-name.png)` references
