# Content Guidelines

How to write documentation, case studies, and articles for the Votiverse docs site.

---

## Audience

This repo is for **the general public** — people who want to run fair, transparent votes in their communities. They are:

- Condo board presidents who need to approve a renovation budget
- Cooperative members deciding on new bylaws
- Club officers running elections
- Neighborhood associations allocating community funds
- Anyone who has sat through a meeting where three loud people decided everything

They are **not** governance researchers, software engineers, or democratic theorists. They don't care about formal properties or event sourcing. They care about: *Will this work for my group? How do I set it up? Is it fair?*

**The main repo** (`votiverse/votiverse`) under `docs/papers/` contains the academic treatment — whitepaper, formal proofs, architectural decisions. That's for developers and researchers.

**This repo** (`votiverse/docs`) is where we show people what the app does and help them use it. If the papers are the theory, this is the practice.

---

## Content Types

### Case Studies

**Purpose:** Show the app solving a real problem through a relatable story.

**When to write one:** When you need to demonstrate a cluster of features working together in context. A case study answers: *"What does it look like when a real group uses this?"*

**Structure:**
1. **The Setting** — who are these people, what's their group, what problem do they face
2. **The Story** — walk through the scenario chronologically, with screenshots at each key moment
3. **What This Demonstrates** — summary table mapping features to governance principles

**Guidelines:**
- Use real-sounding names and realistic scenarios. Elena the condo president is more relatable than "User A."
- Every screenshot should show something a reader would recognize from their own life — a vote, a notification, a cost breakdown.
- Don't explain the technology. Explain what the person is doing and why.
- Keep the narrative moving. If a feature doesn't advance the story, skip it or mention it briefly.
- End with a summary that connects features to principles — this is where you earn the right to be slightly conceptual.

**Naming:** `case-studies/{scenario-name}/README.md` with `images/` subdirectory.

**Existing case studies:**
- **Maple Heights Condo Board** — covers creation, admission, proposals, community notes, voting, results

**Planned:**
- **Open Source Governance** — covers delegation, topic scoping, candidacy, elections

---

### Feature Guides

**Purpose:** Explain one concept clearly, with screenshots showing the UI.

**When to write one:** When someone searches "how does delegation work in Votiverse" or "how do I invite members." A feature guide answers: *"How do I use this specific thing?"*

**Structure:**
1. **What it is** — one paragraph, plain language
2. **Why it matters** — the governance problem it solves (one paragraph, not a lecture)
3. **How it works** — step-by-step with screenshots
4. **Things to know** — edge cases, tips, related features

**Guidelines:**
- Start with the user's goal, not the feature's name. "Invite members to your group" not "The InvitationService API."
- Use screenshots from existing case studies whenever possible — don't create new scenarios just for a feature guide.
- Link to the relevant case study: *"See this in action in the [Maple Heights case study](...)."*
- Keep it under 500 words of text. Screenshots do the heavy lifting.
- Don't document implementation details. The user doesn't need to know about content hashes or event sourcing.

**Naming:** `guides/{feature-name}.md`

---

### Articles

**Purpose:** Explain a governance concept in accessible terms, connecting it to Votiverse.

**When to write one:** When the concept needs more context than a feature guide provides, but you're writing for practitioners, not academics. An article answers: *"Why should I care about this governance idea?"*

**Examples:**
- "What Is a Sybil Attack and Why Should Your Group Care?" — explains the problem in plain terms, shows how admission control addresses it
- "Why Secret Ballots Matter More Than You Think" — real-world coercion examples, how sealed results protect free participation
- "Delegation: Trusting Someone Without Giving Up Your Voice" — liquid democracy explained for people who've never heard the term

**Guidelines:**
- Write for someone who has never taken a political science course.
- Use concrete examples from everyday life, not abstract formulations.
- Reference Votiverse features naturally — "In Votiverse, you can..." — but don't make it a product pitch.
- Link to the whitepaper or Paper II for readers who want to go deeper, but don't require it.
- Keep it under 1000 words. If it's longer, it's probably two articles.

**Naming:** `articles/{topic-slug}.md`

---

### Blog Posts

**Purpose:** Announcements, updates, and reflections.

**When to write one:** New features, new case studies, lessons learned, community stories.

**Naming:** `blog/{YYYY-MM-DD}-{slug}.md`

---

## Voice and Tone

**We are:** Clear, direct, respectful of the reader's time. We explain without condescending.

**We are not:** Academic, marketing-heavy, or vague. No buzzwords. No "leverage synergies in your governance journey."

**Specific rules:**
- Use "you" to address the reader. "You can delegate your vote" not "Users may delegate their votes."
- Use present tense. "The admin approves the request" not "The admin will approve the request."
- Explain jargon the first time you use it. "Sybil attack (creating fake accounts to manipulate votes)."
- Avoid words that assume expertise: "trivially," "simply," "obviously," "just."
- Prefer short sentences. If a sentence has more than one comma, consider splitting it.

---

## Screenshots

See [Screenshot Workflow](screenshot-workflow.md) for the technical process.

**Content guidelines for screenshots:**
- Every screenshot should show realistic data. "Emergency Roof Repair" not "Test Event 1."
- Use consistent character names across a case study. The reader follows Elena's journey.
- Crop to what matters. If the screenshot is about the notification bell, don't show the full page.
- Hide the dev clock widget in published screenshots (it's a dev tool, not a user feature).
- Use alt text that describes what the reader should notice: `![Pending join request with approve/reject buttons](...)` not `![Screenshot](...)`.

---

## Cross-Referencing

Content should link to related content:

- **Case study → Feature guide:** "To learn more about how delegation works, see the [Delegation guide](...)."
- **Feature guide → Case study:** "See this in action in the [Maple Heights case study](...)."
- **Article → Feature guide:** "Votiverse addresses this with [admission control](...)."
- **Any → Whitepaper:** "For the formal treatment, see [Paper I, Section 12](...)." — but only for readers who want to go deeper. Never require it.

---

## Case Study Planning

Before writing a new case study, answer these questions:

1. **What features does it showcase?** List the Votiverse features that are central to the story. Don't overlap heavily with existing case studies.
2. **What's the setting?** Choose a scenario the target audience recognizes. Condo boards, co-ops, clubs, open source projects, student councils.
3. **Who are the characters?** 3-6 named people with distinct roles and personalities. At least one skeptic.
4. **What's the conflict?** A decision that matters, where people disagree. Unanimous votes don't make good stories.
5. **What governance principles does it illustrate?** Map features to principles in the summary table.
6. **What seed data exists?** Check if the VCP seed has assemblies that match the scenario, or plan API calls to create the data.
7. **How many screenshots?** Plan 15-25 key moments. Number them in order.

---

## Directory Structure

```
docs/
├── README.md                    # Index — links to everything
├── case-studies/
│   ├── maple-heights-condo-board/
│   │   ├── README.md            # The narrative
│   │   ├── take-screenshots.ts  # Playwright script
│   │   └── images/              # 01-xxx.png through NN-xxx.png
│   └── {next-case-study}/
├── guides/
│   ├── content-guidelines.md    # This file
│   ├── screenshot-workflow.md   # How to capture screenshots
│   ├── {feature-name}.md        # Feature guides
│   └── ...
├── articles/
│   └── {topic-slug}.md          # Accessible concept explanations
├── papers/                      # Links to main repo papers (not copies)
├── blog/
│   └── {YYYY-MM-DD}-{slug}.md   # Announcements and updates
├── package.json                 # Playwright + tsx for screenshot tooling
└── tsconfig.json                # If needed
```

---

## Quality Checklist

Before publishing any content:

- [ ] Would a condo board president understand this without Googling anything?
- [ ] Does every screenshot show realistic, relatable data?
- [ ] Are all image references valid (`![alt](images/NN-name.png)`)?
- [ ] Is the Playwright script reproducible (`npm run screenshots:{name}`)?
- [ ] Does it link to related content (case studies, guides, articles)?
- [ ] Is it under the word count guideline for its type?
- [ ] Does the alt text on images describe what the reader should notice?
