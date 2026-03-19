# Votiverse Documentation

Documentation, case studies, and screenshot tooling for [Votiverse](https://github.com/votiverse/votiverse) — a configurable governance engine for democratic decision-making.

---

## Case Studies

Real-world scenarios demonstrating Votiverse in action. Each case study includes a narrative walkthrough with screenshots captured from a live instance, plus a Playwright script that can regenerate all images.

- **[Maple Heights Condo Board](case-studies/maple-heights-condo-board/)** — How a 24-unit condominium uses Votiverse to make transparent, accountable decisions about their shared building. Covers group creation, admission control, proposals, community notes, voting, and results.
- **[Neighborhood Budget Council](case-studies/neighborhood-budget-council/)** — How 18 residents use delegation to make better budget decisions without requiring everyone to be an expert on everything. Covers delegation, topic scoping, chains, override rule, weight, surveys, and governance configuration.

## Guides

- **[Content Guidelines](guides/content-guidelines.md)** — Voice, tone, structure, and quality checklist for writing documentation and case studies.
- **[Screenshot Workflow](guides/screenshot-workflow.md)** — How to create reproducible, high-quality screenshots using Playwright, including the seed manifest system for resolving entity IDs.

## Papers

The governance model papers live in the [main repo](https://github.com/votiverse/votiverse/tree/main/docs/papers):

- **Paper I: Whitepaper** — Governance model, formal properties, design rationale.
- **Paper II: Self-Sustaining Governance** — Proposals, candidacies, community notes.
- **Paper III: Democracy in Every Pocket** — Planned.

---

## Running Screenshot Scripts

Each case study has a `take-screenshots.ts` script that walks through the scenario and captures all images automatically. Prerequisites:

1. **Seed the databases** in the [main repo](https://github.com/votiverse/votiverse):
   ```bash
   cd platform/vcp && pnpm reset      # seeds VCP + writes seed-manifest.json
   cd platform/backend && pnpm reset   # seeds backend users from VCP
   ```

2. **Start all three servers** (VCP on :3000, backend on :4000, web on :5173):
   ```bash
   cd platform/vcp && pnpm dev
   cd platform/backend && pnpm dev
   cd platform/web && pnpm dev
   ```

3. **Run a screenshot script** from this repo:
   ```bash
   npm run screenshots:maple-heights
   npm run screenshots:neighborhood
   ```

Screenshot scripts resolve entity IDs via the **seed manifest** (`platform/vcp/seed-manifest.json`), which is generated automatically during seeding. This means IDs never need to be hardcoded — scripts stay correct across reseeds.

## Repo Structure

```
docs/
├── case-studies/
│   ├── maple-heights-condo-board/
│   │   ├── README.md              ← narrative with embedded screenshots
│   │   ├── take-screenshots.ts    ← Playwright script
│   │   └── images/                ← generated PNGs (20 screenshots)
│   └── neighborhood-budget-council/
│       ├── README.md
│       ├── take-screenshots.ts
│       └── images/                ← generated PNGs (16 screenshots)
├── guides/
│   ├── content-guidelines.md
│   └── screenshot-workflow.md
├── lib/
│   └── seed-manifest.ts           ← shared reader for VCP seed manifest
├── package.json
└── README.md
```

## Adding a New Case Study

1. **Add seed data** — define your assembly, participants, events, votes, and content in the main repo's `platform/vcp/scripts/seed-data/` files.
2. **Reset** — run `pnpm reset` in both VCP and backend to generate fresh data and the seed manifest.
3. **Create the directory** — `case-studies/<name>/` with an `images/` subfolder.
4. **Write the screenshot script** — use `loadManifest()` from `lib/seed-manifest.ts` to resolve IDs. See the [Screenshot Workflow](guides/screenshot-workflow.md) guide for Playwright patterns.
5. **Add the npm script** — `"screenshots:<name>": "tsx case-studies/<name>/take-screenshots.ts"` in `package.json`.
6. **Run and verify** — capture screenshots, then write the narrative README with `![alt](images/NN-name.png)` references.
