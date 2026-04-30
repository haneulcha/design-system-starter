# Archetype Re-validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a TypeScript extraction pipeline + Python (uv) analysis notebook that re-validates the original 54-system archetype clustering against the current awesome-design-md corpus, producing a curated research report with an explicit Phase A vs. Phase B recommendation.

**Architecture:** Two-language pipeline by responsibility — TS for stack-consistent corpus ingestion and DESIGN.md parsing into a flat JSON record set; Python notebook (sklearn) for clustering, silhouette analysis, drift comparison, and figure export. The notebook is a research artifact; the curated markdown report is the durable deliverable.

**Tech Stack:** TypeScript / tsx / vitest / culori (extraction), Python ≥ 3.11 / uv / pandas / numpy / scikit-learn / matplotlib / seaborn / scipy (analysis), git (corpus acquisition).

---

## Pre-flight

Spec: `docs/superpowers/specs/2026-04-30-archetype-revalidation-design.md`. Re-read this before starting Task 1.

---

### Task 1: Project setup — directories and gitignore

**Files:**
- Modify: `.gitignore`
- Create: `scripts/analysis/.gitkeep`
- Create: `tests/analysis/fixtures/.gitkeep`
- Create: `docs/research/notebooks/.gitkeep`
- Create: `docs/research/figures/2026-04-30/.gitkeep`

- [ ] **Step 1: Add `data/` to `.gitignore`**

Append to `.gitignore`:

```
data/
```

- [ ] **Step 2: Create directory placeholders**

```bash
mkdir -p scripts/analysis/parsers tests/analysis/fixtures docs/research/notebooks docs/research/figures/2026-04-30
touch scripts/analysis/.gitkeep tests/analysis/fixtures/.gitkeep docs/research/notebooks/.gitkeep docs/research/figures/2026-04-30/.gitkeep
```

- [ ] **Step 3: Commit**

```bash
git add .gitignore scripts/analysis/.gitkeep tests/analysis/fixtures/.gitkeep docs/research/notebooks/.gitkeep docs/research/figures/2026-04-30/.gitkeep
git commit -m "chore(analysis): scaffold pipeline directories and gitignore data/"
```

---

### Task 2: Corpus acquisition (`scripts/analysis/fetch.ts`)

**Files:**
- Create: `scripts/analysis/fetch.ts`

This task has no automated test. Verify by running it.

The upstream awesome-design-md repo (`VoltAgent/awesome-design-md`) carries only stub READMEs in `design-md/{system}/`; full content is fetched per-system via the `getdesign` CLI. `fetch.ts` clones the index repo for the system list, then runs `npx -y getdesign@latest add {system}` per system, copying each generated `DESIGN.md` into `data/raw/{system}.md`.

`execFileSync` is used (not `execSync`) so arguments are array-passed with no shell interpretation. Runtime: ~5–10 min for ~59 systems.

- [ ] **Step 1: Write `fetch.ts`**

```ts
// scripts/analysis/fetch.ts
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

const REPO_URL = "https://github.com/VoltAgent/awesome-design-md";
const REPO_DIR = "data/raw-repo";
const OUT_DIR = "data/raw";
const TMP_DIR = "data/.fetch-tmp";

function clone(): void {
  if (existsSync(REPO_DIR)) {
    rmSync(REPO_DIR, { recursive: true, force: true });
  }
  console.log(`Cloning ${REPO_URL} → ${REPO_DIR}`);
  execFileSync("git", ["clone", "--depth", "1", REPO_URL, REPO_DIR], { stdio: "inherit" });
}

function listSystems(): string[] {
  const root = join(REPO_DIR, "design-md");
  return readdirSync(root)
    .filter((entry) => statSync(join(root, entry)).isDirectory())
    .sort();
}

function fetchSystem(system: string): boolean {
  const tmp = join(TMP_DIR, system);
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  try {
    execFileSync("npx", ["-y", "getdesign@latest", "add", system], {
      cwd: tmp,
      stdio: ["ignore", "ignore", "pipe"],
    });
  } catch {
    return false;
  }
  const designPath = join(tmp, "DESIGN.md");
  if (!existsSync(designPath)) return false;
  renameSync(designPath, join(OUT_DIR, `${system}.md`));
  rmSync(tmp, { recursive: true, force: true });
  return true;
}

function main(): void {
  clone();
  const systems = listSystems();
  console.log(`Found ${systems.length} systems`);

  if (existsSync(OUT_DIR)) rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(TMP_DIR, { recursive: true });

  let ok = 0;
  for (const [i, system] of systems.entries()) {
    process.stdout.write(`[${i + 1}/${systems.length}] ${system} ... `);
    if (fetchSystem(system)) {
      ok++;
      console.log("ok");
    } else {
      console.log("FAILED");
    }
  }

  rmSync(TMP_DIR, { recursive: true, force: true });
  console.log(`\nCollected ${ok}/${systems.length} DESIGN.md files into ${OUT_DIR}/`);
}

main();
```

- [ ] **Step 2: Run it to verify**

```bash
npx tsx scripts/analysis/fetch.ts
ls data/raw | wc -l
head -5 data/raw/stripe.md
```

Expected: `Collected N/M DESIGN.md files` with N ≥ 50. Each file starts with `# Design System Inspired by {System}`.

- [ ] **Step 3: Commit**

```bash
git add scripts/analysis/fetch.ts
git commit -m "feat(analysis): add corpus fetcher for awesome-design-md"
```

---

### Task 3: Format reconnaissance (`scripts/analysis/FORMAT.md`)

**Files:**
- Create: `scripts/analysis/FORMAT.md`
- Create: `tests/analysis/fixtures/stripe.md`, `airbnb.md`, `vercel.md`, `linear.md`, `apple.md` (excerpts)

Output of this task: a written-down record of the actual upstream DESIGN.md format the parsers must handle.

- [ ] **Step 1: Sample 5 representative systems**

```bash
ls data/raw | grep -iE "^(stripe|airbnb|vercel|linear|apple)\.md$"
```

If any name doesn't match, substitute the closest alternative from `data/raw/` (e.g., `stripe-pay.md`).

- [ ] **Step 2: Document observed patterns in `scripts/analysis/FORMAT.md`**

Cover, for each variable in the spec's table (13 variables), the literal heading text observed and the value formats. Example skeleton:

```markdown
# Upstream awesome-design-md DESIGN.md Format Reference

> Notes from inspecting 5 systems on 2026-04-30. Used to author the parsers in `scripts/analysis/parsers/`.

## Section heading variants observed

| Heading | Systems |
|---|---|
| `## Buttons` | stripe, airbnb |
| `## 4. Buttons` | vercel |

## Per-variable patterns

### btn_radius
- Format examples: `border-radius: 8px`, `radius: 8px`, `Radius | 8px`
- Section: Buttons

### btn_shape
- Inferred from btn_radius:
  - 0–2 → sharp; 3–7 → standard; 8–16 → rounded; ≥9999 or "pill" → pill

### heading_weight
- Source: largest-size row in Typography table; `font-weight` column

(... continue for all 13 variables, citing real lines from the 5 sample files)
```

- [ ] **Step 3: Extract minimal fixtures**

For each of the 5 sample systems, copy the relevant sections (Buttons, Typography, Cards, Colors, Elevation, Modes) verbatim into a fixture file:

- `tests/analysis/fixtures/stripe.md`
- `tests/analysis/fixtures/airbnb.md`
- `tests/analysis/fixtures/vercel.md`
- `tests/analysis/fixtures/linear.md`
- `tests/analysis/fixtures/apple.md`

Each fixture should be 30–80 lines containing the sections needed for all 13 variables. Keep verbatim text — no synthesis.

- [ ] **Step 4: Commit**

```bash
git add scripts/analysis/FORMAT.md tests/analysis/fixtures/
git commit -m "docs(analysis): document upstream DESIGN.md format with 5 fixtures"
```

---

### Task 4: Shared types (`scripts/analysis/types.ts`)

**Files:**
- Create: `scripts/analysis/types.ts`

- [ ] **Step 1: Write the types file**

```ts
// scripts/analysis/types.ts

export interface ExtractedRecord {
  system: string;
  // Original 7
  btn_radius: number | null;
  card_radius: number | null;
  heading_weight: number | null;
  body_line_height: number | null;
  heading_letter_spacing: number | null;
  shadow_intensity: ShadowIntensity | null;
  btn_shape: BtnShape | null;
  // Color 3
  brand_l: number | null;
  brand_c: number | null;
  brand_h: number | null;
  // New 3
  dark_mode_present: boolean | null;
  gray_chroma: number | null;
  accent_offset: number | null;
}

export type ShadowIntensity = 0 | 1 | 2 | 3 | 4; // none | whisper | subtle | medium | dramatic
export type BtnShape = 0 | 1 | 2 | 3;            // sharp | standard | rounded | pill

export const SHADOW_LABELS: readonly string[] = ["none", "whisper", "subtle", "medium", "dramatic"];
export const SHAPE_LABELS: readonly string[] = ["sharp", "standard", "rounded", "pill"];
```

- [ ] **Step 2: Commit**

```bash
git add scripts/analysis/types.ts
git commit -m "feat(analysis): add ExtractedRecord type"
```

---

### Task 5: Section locator helper (TDD)

**Files:**
- Create: `scripts/analysis/parsers/section.ts`
- Create: `tests/analysis/parsers.test.ts`

The locator finds a named section in DESIGN.md by heading **substring** match (case-insensitive, ignoring leading numbering), returning its body text up to the next heading of equal or higher level. Substring matching is necessary because the upstream format uses verbose headings like `## 6. Depth & Elevation` that should resolve from the query `"Elevation"`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/analysis/parsers.test.ts
import { describe, it, expect } from "vitest";
import { findSection } from "../../scripts/analysis/parsers/section.js";

describe("findSection", () => {
  const sample = `## 1. Theme

intro

## 2. Buttons

radius: 8px
shape: rounded

## 3. Cards

radius: 12px
`;

  it("returns body of named section, case-insensitive", () => {
    const buttons = findSection(sample, "Buttons");
    expect(buttons).toContain("radius: 8px");
    expect(buttons).not.toContain("intro");
    expect(buttons).not.toContain("Cards");
  });

  it("matches numbered headings (e.g., '## 2. Buttons')", () => {
    expect(findSection(sample, "Buttons")).toContain("radius: 8px");
  });

  it("returns null when section is missing", () => {
    expect(findSection(sample, "Animation")).toBeNull();
  });

  it("matches subsection headings of any level", () => {
    const subbed = `## Typography\n### Display Hero\n48px / 700\n### Body\n16px / 400\n`;
    const display = findSection(subbed, "Display Hero");
    expect(display).toContain("48px / 700");
    expect(display).not.toContain("16px / 400");
  });

  it("substring-matches verbose headings", () => {
    const md = `## 6. Depth & Elevation\n\nshadow: subtle\n\n## 7. Other\n`;
    expect(findSection(md, "Elevation")).toContain("shadow: subtle");
  });

  it("prefers earliest match when multiple substring hits exist", () => {
    const md = `## Typography Rules\nA\n## Type Specimens\nB\n`;
    expect(findSection(md, "Type")).toContain("A");
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm test tests/analysis/parsers.test.ts
```

Expected: FAIL with import or "findSection is not defined".

- [ ] **Step 3: Implement `findSection`**

```ts
// scripts/analysis/parsers/section.ts

/**
 * Find a markdown section whose heading contains `name` (case-insensitive substring,
 * leading numbering stripped). Returns body text from after the heading to before the
 * next heading of equal or higher level. Returns null when not found.
 */
export function findSection(markdown: string, name: string): string | null {
  const lines = markdown.split("\n");
  const target = name.toLowerCase().trim();

  let startIdx = -1;
  let startLevel = 0;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s+(.+?)\s*$/);
    if (!m) continue;
    const headingText = m[2].toLowerCase().replace(/^\d+(\.\d+)*\.\s*/, "").trim();
    if (headingText.includes(target)) {
      startIdx = i + 1;
      startLevel = m[1].length;
      break;
    }
  }
  if (startIdx === -1) return null;

  let endIdx = lines.length;
  for (let i = startIdx; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s+/);
    if (m && m[1].length <= startLevel) {
      endIdx = i;
      break;
    }
  }

  return lines.slice(startIdx, endIdx).join("\n").trim();
}
```

- [ ] **Step 4: Run to verify pass**

```bash
pnpm test tests/analysis/parsers.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/analysis/parsers/section.ts tests/analysis/parsers.test.ts
git commit -m "feat(analysis): add findSection helper for DESIGN.md parsing"
```

---

### Task 6: Numeric parsers — `btn_radius`, `card_radius` (TDD)

**Files:**
- Create: `scripts/analysis/parsers/numeric.ts`
- Modify: `tests/analysis/parsers.test.ts`

Re-verify regex against `FORMAT.md` patterns from Task 3 — adjust if your fixtures show different shapes.

- [ ] **Step 1: Write the failing tests**

Append to `tests/analysis/parsers.test.ts`:

```ts
import { parseBtnRadius, parseCardRadius } from "../../scripts/analysis/parsers/numeric.js";

describe("parseBtnRadius", () => {
  it("extracts the first px value in a Buttons section", () => {
    const md = "## Buttons\n\nborder-radius: 8px\nheight: 40px\n";
    expect(parseBtnRadius(md)).toBe(8);
  });

  it("returns null when section is missing", () => {
    expect(parseBtnRadius("## Other\n\nnothing here\n")).toBeNull();
  });

  it("handles 'pill' / 9999px as 9999", () => {
    expect(parseBtnRadius("## Buttons\n\nradius: 9999px (pill)\n")).toBe(9999);
  });
});

describe("parseCardRadius", () => {
  it("extracts the first px value in a Cards section", () => {
    const md = "## Cards\n\nborder-radius: 12px\n";
    expect(parseCardRadius(md)).toBe(12);
  });

  it("returns null when section is missing", () => {
    expect(parseCardRadius("## Other\n\nx\n")).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm test tests/analysis/parsers.test.ts
```

- [ ] **Step 3: Implement**

```ts
// scripts/analysis/parsers/numeric.ts
import { findSection } from "./section.js";

const FIRST_PX = /(\d+(?:\.\d+)?)\s*px/;

function firstPxIn(section: string | null): number | null {
  if (!section) return null;
  const m = section.match(FIRST_PX);
  return m ? Number(m[1]) : null;
}

export function parseBtnRadius(md: string): number | null {
  return firstPxIn(findSection(md, "Buttons"));
}

export function parseCardRadius(md: string): number | null {
  return firstPxIn(findSection(md, "Cards"));
}
```

- [ ] **Step 4: Run to verify pass**

```bash
pnpm test tests/analysis/parsers.test.ts
```

- [ ] **Step 5: Sanity check against real fixtures**

Append:

```ts
import { readFileSync } from "node:fs";

describe("real fixtures — btn_radius", () => {
  it.each(["stripe", "airbnb", "vercel", "linear", "apple"])(
    "%s yields a numeric btn_radius",
    (system) => {
      const md = readFileSync(`tests/analysis/fixtures/${system}.md`, "utf-8");
      expect(parseBtnRadius(md)).toEqual(expect.any(Number));
    },
  );
});
```

If any fixture returns null, refine the regex or the section locator until all five pass.

- [ ] **Step 6: Commit**

```bash
git add scripts/analysis/parsers/numeric.ts tests/analysis/parsers.test.ts
git commit -m "feat(analysis): parse btn_radius and card_radius"
```

---

### Task 7: Typography parsers — `heading_weight`, `body_line_height`, `heading_letter_spacing` (TDD)

**Files:**
- Create: `scripts/analysis/parsers/typography.ts`
- Modify: `tests/analysis/parsers.test.ts`

These three parsers all read from the Typography section's hierarchy table. Heading variants pull from the largest display row; `body_line_height` from the body row.

- [ ] **Step 1: Write failing tests**

Append:

```ts
import {
  parseHeadingWeight,
  parseBodyLineHeight,
  parseHeadingLetterSpacing,
} from "../../scripts/analysis/parsers/typography.js";

describe("typography parsers", () => {
  const md = `## Typography

| Role | Size | Weight | Line Height | Letter Spacing |
|---|---|---|---|---|
| Display Hero | 48px | 700 | 1.10 | -0.70px |
| Body | 16px | 400 | 1.50 | normal |
`;

  it("parseHeadingWeight reads the largest-size row", () => {
    expect(parseHeadingWeight(md)).toBe(700);
  });

  it("parseBodyLineHeight reads the Body row", () => {
    expect(parseBodyLineHeight(md)).toBe(1.5);
  });

  it("parseHeadingLetterSpacing reads negative px from Display Hero", () => {
    expect(parseHeadingLetterSpacing(md)).toBe(-0.7);
  });

  it("returns null when Typography section missing", () => {
    expect(parseHeadingWeight("## Other\n")).toBeNull();
    expect(parseBodyLineHeight("## Other\n")).toBeNull();
    expect(parseHeadingLetterSpacing("## Other\n")).toBeNull();
  });

  it("treats 'normal' letter-spacing as 0", () => {
    const normal = `## Typography\n| Display Hero | 48px | 400 | 1.10 | normal |\n| Body | 16px | 400 | 1.50 | normal |\n`;
    expect(parseHeadingLetterSpacing(normal)).toBe(0);
  });
});
```

- [ ] **Step 2: Verify failure**

- [ ] **Step 3: Implement**

```ts
// scripts/analysis/parsers/typography.ts
import { findSection } from "./section.js";

interface TypeRow {
  role: string;
  size: number;
  weight: number | null;
  lineHeight: number | null;
  letterSpacing: number | null;
}

function parseRows(section: string): TypeRow[] {
  const rows: TypeRow[] = [];
  for (const line of section.split("\n")) {
    if (!line.trim().startsWith("|")) continue;
    const cells = line.split("|").map((c) => c.trim()).filter((c) => c.length > 0);
    if (cells.length < 2) continue;
    const sizeCell = cells.find((c) => /^\d+(?:\.\d+)?\s*px$/.test(c));
    if (!sizeCell) continue;
    const size = Number(sizeCell.replace(/px/, ""));
    const role = cells[0];

    const weight = cells.map((c) => Number(c)).find((n) => Number.isFinite(n) && n >= 100 && n <= 900) ?? null;
    const lh = cells.map((c) => Number(c)).find((n) => Number.isFinite(n) && n > 0 && n < 3) ?? null;

    let ls: number | null = null;
    for (const c of cells) {
      const m = c.match(/^(-?\d+(?:\.\d+)?)\s*px$/);
      if (m && Number(m[1]) !== size) { ls = Number(m[1]); break; }
      if (c.toLowerCase() === "normal") { ls = 0; break; }
    }

    rows.push({ role, size, weight, lineHeight: lh, letterSpacing: ls });
  }
  return rows;
}

function findRole(rows: TypeRow[], match: (r: TypeRow) => boolean): TypeRow | null {
  return rows.find(match) ?? null;
}

export function parseHeadingWeight(md: string): number | null {
  const section = findSection(md, "Typography");
  if (!section) return null;
  const rows = parseRows(section);
  if (rows.length === 0) return null;
  const display = rows.reduce((a, b) => (a.size >= b.size ? a : b));
  return display.weight;
}

export function parseBodyLineHeight(md: string): number | null {
  const section = findSection(md, "Typography");
  if (!section) return null;
  const rows = parseRows(section);
  const body = findRole(rows, (r) => /^body\b/i.test(r.role));
  return body?.lineHeight ?? null;
}

export function parseHeadingLetterSpacing(md: string): number | null {
  const section = findSection(md, "Typography");
  if (!section) return null;
  const rows = parseRows(section);
  if (rows.length === 0) return null;
  const display = rows.reduce((a, b) => (a.size >= b.size ? a : b));
  return display.letterSpacing;
}
```

- [ ] **Step 4: Verify pass**

- [ ] **Step 5: Verify against real fixtures**

```ts
describe("real fixtures — typography", () => {
  it.each(["stripe", "airbnb", "vercel", "linear", "apple"])("%s yields all 3", (system) => {
    const md = readFileSync(`tests/analysis/fixtures/${system}.md`, "utf-8");
    expect(parseHeadingWeight(md)).toEqual(expect.any(Number));
    expect(parseBodyLineHeight(md)).toEqual(expect.any(Number));
    expect(parseHeadingLetterSpacing(md)).toEqual(expect.any(Number));
  });
});
```

If any returns null, refine the table parser until all 5 succeed.

- [ ] **Step 6: Commit**

```bash
git add scripts/analysis/parsers/typography.ts tests/analysis/parsers.test.ts
git commit -m "feat(analysis): parse heading_weight, body_line_height, heading_letter_spacing"
```

---

### Task 8: Categorical parsers — `shadow_intensity`, `btn_shape` (TDD)

**Files:**
- Create: `scripts/analysis/parsers/categorical.ts`
- Modify: `tests/analysis/parsers.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { parseShadowIntensity, parseBtnShape } from "../../scripts/analysis/parsers/categorical.js";

describe("parseShadowIntensity", () => {
  it.each<[string, number]>([
    ["## Elevation\n\nNo shadows used.\n", 0],
    ["## Elevation\n\nWhisper-light shadows on cards.\n", 1],
    ["## Elevation\n\nSubtle shadows for elevation.\n", 2],
    ["## Elevation\n\nMedium shadows.\n", 3],
    ["## Elevation\n\nDramatic, deep shadows.\n", 4],
  ])("classifies shadow intensity from %j", (md, expected) => {
    expect(parseShadowIntensity(md)).toBe(expected);
  });

  it("returns null on missing section", () => {
    expect(parseShadowIntensity("## Other\n")).toBeNull();
  });
});

describe("parseBtnShape", () => {
  it("classifies sharp (radius ≤ 2)", () => {
    expect(parseBtnShape("## Buttons\nradius: 0px\n")).toBe(0);
    expect(parseBtnShape("## Buttons\nradius: 2px\n")).toBe(0);
  });
  it("classifies standard (3-7)", () => {
    expect(parseBtnShape("## Buttons\nradius: 6px\n")).toBe(1);
  });
  it("classifies rounded (8-16)", () => {
    expect(parseBtnShape("## Buttons\nradius: 12px\n")).toBe(2);
  });
  it("classifies pill (≥ 9999 or 'pill' literal)", () => {
    expect(parseBtnShape("## Buttons\nradius: 9999px\n")).toBe(3);
    expect(parseBtnShape("## Buttons\npill button\n")).toBe(3);
  });
  it("returns null when section missing", () => {
    expect(parseBtnShape("## Other\n")).toBeNull();
  });
});
```

- [ ] **Step 2: Verify failure**

- [ ] **Step 3: Implement**

```ts
// scripts/analysis/parsers/categorical.ts
import { findSection } from "./section.js";
import { parseBtnRadius } from "./numeric.js";
import type { ShadowIntensity, BtnShape } from "../types.js";

const SHADOW_KEYWORDS: ReadonlyArray<{ level: ShadowIntensity; words: readonly string[] }> = [
  { level: 4, words: ["dramatic", "deep", "heavy", "bold shadow"] },
  { level: 3, words: ["medium"] },
  { level: 2, words: ["subtle"] },
  { level: 1, words: ["whisper", "light shadow", "minimal shadow"] },
  { level: 0, words: ["no shadow", "none", "flat"] },
];

export function parseShadowIntensity(md: string): ShadowIntensity | null {
  const section = findSection(md, "Elevation") ?? findSection(md, "Shadows");
  if (!section) return null;
  const lower = section.toLowerCase();
  for (const { level, words } of SHADOW_KEYWORDS) {
    if (words.some((w) => lower.includes(w))) return level;
  }
  return null;
}

export function parseBtnShape(md: string): BtnShape | null {
  const section = findSection(md, "Buttons");
  if (!section) return null;
  if (/\bpill\b/i.test(section)) return 3;
  const radius = parseBtnRadius(md);
  if (radius === null) return null;
  if (radius >= 9999) return 3;
  if (radius >= 8) return 2;
  if (radius >= 3) return 1;
  return 0;
}
```

- [ ] **Step 4: Verify pass**

- [ ] **Step 5: Commit**

```bash
git add scripts/analysis/parsers/categorical.ts tests/analysis/parsers.test.ts
git commit -m "feat(analysis): parse shadow_intensity and btn_shape"
```

---

### Task 9: Color parsers — `brand_l/c/h`, `gray_chroma`, `accent_offset` (TDD)

**Files:**
- Create: `scripts/analysis/parsers/color.ts`
- Modify: `tests/analysis/parsers.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import {
  parseBrandOklch,
  parseGrayChroma,
  parseAccentOffset,
} from "../../scripts/analysis/parsers/color.js";

const SAMPLE_COLORS = `## Colors

### Brand
Primary: #5e6ad2

### Accent
Primary: #d29c5e

### Gray
500: #828282
`;

describe("color parsers", () => {
  it("parseBrandOklch returns L/C/H for the brand primary", () => {
    const result = parseBrandOklch(SAMPLE_COLORS);
    expect(result).not.toBeNull();
    expect(result!.l).toBeGreaterThan(0);
    expect(result!.l).toBeLessThan(1);
    expect(result!.c).toBeGreaterThan(0);
    expect(result!.h).toBeGreaterThanOrEqual(0);
    expect(result!.h).toBeLessThan(360);
  });

  it("parseGrayChroma returns small chroma for neutral gray", () => {
    const c = parseGrayChroma(SAMPLE_COLORS);
    expect(c).not.toBeNull();
    expect(c).toBeLessThan(0.05);
  });

  it("parseAccentOffset returns hue difference modulo 360", () => {
    const offset = parseAccentOffset(SAMPLE_COLORS);
    expect(offset).not.toBeNull();
    expect(offset).toBeGreaterThanOrEqual(0);
    expect(offset).toBeLessThan(360);
  });

  it("returns null when Colors section missing", () => {
    expect(parseBrandOklch("## Other\n")).toBeNull();
    expect(parseGrayChroma("## Other\n")).toBeNull();
    expect(parseAccentOffset("## Other\n")).toBeNull();
  });
});
```

- [ ] **Step 2: Verify failure**

- [ ] **Step 3: Implement**

```ts
// scripts/analysis/parsers/color.ts
import { converter } from "culori";
import { findSection } from "./section.js";
import type { Oklch } from "../../../src/schema/types.js";

const toOklch = converter("oklch");

const HEX = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/;
const OKLCH = /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/i;

function firstColorIn(section: string | null): Oklch | null {
  if (!section) return null;
  const oklchMatch = section.match(OKLCH);
  if (oklchMatch) {
    return { l: Number(oklchMatch[1]), c: Number(oklchMatch[2]), h: Number(oklchMatch[3]) };
  }
  const hexMatch = section.match(HEX);
  if (!hexMatch) return null;
  const hex = "#" + hexMatch[1];
  const o = toOklch(hex);
  if (!o) return null;
  return { l: o.l ?? 0, c: o.c ?? 0, h: o.h ?? 0 };
}

function brandSection(md: string): string | null {
  return findSection(md, "Brand") ?? findSection(md, "Primary") ?? findSection(md, "Colors");
}

function accentSection(md: string): string | null {
  return findSection(md, "Accent") ?? findSection(md, "Secondary");
}

function graySection(md: string): string | null {
  return findSection(md, "Gray") ?? findSection(md, "Neutral");
}

export function parseBrandOklch(md: string): Oklch | null {
  return firstColorIn(brandSection(md));
}

export function parseGrayChroma(md: string): number | null {
  const o = firstColorIn(graySection(md));
  return o ? o.c : null;
}

export function parseAccentOffset(md: string): number | null {
  const brand = parseBrandOklch(md);
  const accent = firstColorIn(accentSection(md));
  if (!brand || !accent) return null;
  return ((accent.h - brand.h) % 360 + 360) % 360;
}
```

- [ ] **Step 4: Verify pass**

- [ ] **Step 5: Verify against real fixtures**

```ts
describe("real fixtures — colors", () => {
  it.each(["stripe", "airbnb", "vercel", "linear", "apple"])("%s yields brand OKLCH", (system) => {
    const md = readFileSync(`tests/analysis/fixtures/${system}.md`, "utf-8");
    expect(parseBrandOklch(md)).not.toBeNull();
  });
});
```

- [ ] **Step 6: Commit**

```bash
git add scripts/analysis/parsers/color.ts tests/analysis/parsers.test.ts
git commit -m "feat(analysis): parse brand OKLCH, gray chroma, and accent offset"
```

---

### Task 10: Dark-mode presence (TDD)

**Files:**
- Create: `scripts/analysis/parsers/modes.ts`
- Modify: `tests/analysis/parsers.test.ts`

The upstream format does not have a dedicated `## Modes` section. Dark-mode signals are scattered: a `### Dark Mode` subsection inside Color or Theme, a Light/Dark column in a colors table, or "dark theme" mentioned in the prose. Detection is therefore a multi-signal heuristic.

- [ ] **Step 1: Write failing tests**

```ts
import { parseDarkModePresent } from "../../scripts/analysis/parsers/modes.js";

describe("parseDarkModePresent", () => {
  it("returns true when a Dark Mode subsection exists", () => {
    const md = `## 2. Color Palette\n\n### Dark Mode\n\nbackgrounds shift to navy.\n`;
    expect(parseDarkModePresent(md)).toBe(true);
  });
  it("returns true when Colors table has a Dark column", () => {
    const md = `## 2. Color\n\n| Step | Light | Dark |\n|---|---|---|\n| 100 | #fff | #000 |\n`;
    expect(parseDarkModePresent(md)).toBe(true);
  });
  it("returns true when prose mentions 'dark theme' or 'dark mode'", () => {
    const md = `## 1. Theme\n\nSupports light and dark theme out of the box.\n`;
    expect(parseDarkModePresent(md)).toBe(true);
  });
  it("returns false when no signal is present", () => {
    const md = `## 1. Theme\n\nA bright clean canvas.\n## 2. Color\n\nPrimary: #5e6ad2\n`;
    expect(parseDarkModePresent(md)).toBe(false);
  });
});
```

- [ ] **Step 2: Verify failure**

- [ ] **Step 3: Implement**

```ts
// scripts/analysis/parsers/modes.ts
import { findSection } from "./section.js";

const DARK_MODE_PHRASE = /\b(dark\s+(mode|theme))\b/i;
const DARK_TABLE_COLUMN = /\|\s*Dark\s*\|/i;

export function parseDarkModePresent(md: string): boolean {
  if (findSection(md, "Dark Mode") !== null) return true;
  if (findSection(md, "Dark Theme") !== null) return true;
  if (DARK_TABLE_COLUMN.test(md)) return true;
  if (DARK_MODE_PHRASE.test(md)) return true;
  return false;
}
```

- [ ] **Step 4: Verify pass**

- [ ] **Step 5: Commit**

```bash
git add scripts/analysis/parsers/modes.ts tests/analysis/parsers.test.ts
git commit -m "feat(analysis): parse dark mode presence"
```

---

### Task 11: Extraction orchestrator + integration smoke test

**Files:**
- Create: `scripts/analysis/extract.ts`
- Create: `tests/analysis/extract.test.ts`

- [ ] **Step 1: Write the orchestrator**

```ts
// scripts/analysis/extract.ts
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import type { ExtractedRecord } from "./types.js";
import { parseBtnRadius, parseCardRadius } from "./parsers/numeric.js";
import {
  parseHeadingWeight,
  parseBodyLineHeight,
  parseHeadingLetterSpacing,
} from "./parsers/typography.js";
import { parseShadowIntensity, parseBtnShape } from "./parsers/categorical.js";
import { parseBrandOklch, parseGrayChroma, parseAccentOffset } from "./parsers/color.js";
import { parseDarkModePresent } from "./parsers/modes.js";

export function extractOne(system: string, md: string): ExtractedRecord {
  const brand = parseBrandOklch(md);
  return {
    system,
    btn_radius: parseBtnRadius(md),
    card_radius: parseCardRadius(md),
    heading_weight: parseHeadingWeight(md),
    body_line_height: parseBodyLineHeight(md),
    heading_letter_spacing: parseHeadingLetterSpacing(md),
    shadow_intensity: parseShadowIntensity(md),
    btn_shape: parseBtnShape(md),
    brand_l: brand?.l ?? null,
    brand_c: brand?.c ?? null,
    brand_h: brand?.h ?? null,
    dark_mode_present: parseDarkModePresent(md),
    gray_chroma: parseGrayChroma(md),
    accent_offset: parseAccentOffset(md),
  };
}

export function extractAll(rawDir: string): ExtractedRecord[] {
  const files = readdirSync(rawDir).filter((f) => f.endsWith(".md"));
  return files.map((f) => {
    const md = readFileSync(join(rawDir, f), "utf-8");
    const system = basename(f, ".md");
    return extractOne(system, md);
  });
}

function reportFailureRates(records: ExtractedRecord[]): void {
  const keys = Object.keys(records[0] ?? {}).filter((k) => k !== "system") as Array<keyof ExtractedRecord>;
  console.log(`\nExtraction failure rate per variable (n=${records.length}):`);
  for (const k of keys) {
    const nullCount = records.filter((r) => r[k] === null).length;
    const pct = ((nullCount / records.length) * 100).toFixed(1);
    console.log(`  ${k.padEnd(24)} ${nullCount}/${records.length} (${pct}%)`);
  }
}

function main(): void {
  const RAW = "data/raw";
  const OUT = "data/extracted.json";
  if (!existsSync(RAW)) {
    console.error(`${RAW} not found — run scripts/analysis/fetch.ts first.`);
    process.exit(1);
  }
  const records = extractAll(RAW);
  mkdirSync("data", { recursive: true });
  writeFileSync(OUT, JSON.stringify(records, null, 2));
  console.log(`Wrote ${records.length} records to ${OUT}`);
  reportFailureRates(records);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
```

- [ ] **Step 2: Write the smoke test**

```ts
// tests/analysis/extract.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { extractOne } from "../../scripts/analysis/extract.js";

describe("extractOne — fixtures", () => {
  it.each(["stripe", "airbnb", "vercel", "linear", "apple"])(
    "%s yields ≥ 10 non-null variables",
    (system) => {
      const md = readFileSync(`tests/analysis/fixtures/${system}.md`, "utf-8");
      const rec = extractOne(system, md);
      const nonNull = Object.entries(rec).filter(([k, v]) => k !== "system" && v !== null);
      expect(nonNull.length, `${system}: ${JSON.stringify(rec, null, 2)}`).toBeGreaterThanOrEqual(10);
    },
  );
});
```

- [ ] **Step 3: Run smoke test**

```bash
pnpm test tests/analysis/extract.test.ts
```

Expected: all 5 fixtures yield at least 10 non-null variables.

- [ ] **Step 4: Run extraction on the full corpus**

```bash
npx tsx scripts/analysis/extract.ts
```

Expected: `Wrote N records to data/extracted.json`. The failure-rate table prints. Any variable above 30% failure → revisit its parser before continuing.

- [ ] **Step 5: Commit**

```bash
git add scripts/analysis/extract.ts tests/analysis/extract.test.ts
git commit -m "feat(analysis): add extraction orchestrator and smoke test"
```

---

### Task 12: Python environment setup (uv)

**Files:**
- Create: `docs/research/notebooks/pyproject.toml`
- Create: `docs/research/notebooks/README.md`

- [ ] **Step 1: Verify uv is installed**

```bash
uv --version
```

If missing: `curl -LsSf https://astral.sh/uv/install.sh | sh`.

- [ ] **Step 2: Write `pyproject.toml`**

```toml
# docs/research/notebooks/pyproject.toml
[project]
name = "archetype-revalidation"
version = "0.1.0"
description = "Notebook environment for archetype re-validation analysis."
requires-python = ">=3.11"
dependencies = [
  "pandas>=2.2",
  "numpy>=1.26",
  "scikit-learn>=1.4",
  "scipy>=1.12",
  "matplotlib>=3.8",
  "seaborn>=0.13",
  "jupyterlab>=4.0",
]
```

- [ ] **Step 3: Write `README.md`**

```markdown
# Archetype Revalidation Notebooks

## Setup

```bash
cd docs/research/notebooks
uv sync
uv run jupyter lab
```

Open `2026-04-30-archetype-revalidation.ipynb`.

## Inputs

The notebook reads `../../../data/extracted.json`. Generate it via:

```bash
npx tsx scripts/analysis/fetch.ts
npx tsx scripts/analysis/extract.ts
```

## Outputs

- Inline cells (drift tables, plots, recommendation)
- PNG figures exported to `../figures/2026-04-30/`
```

- [ ] **Step 4: Lock and commit**

```bash
cd docs/research/notebooks && uv sync && cd -
git add docs/research/notebooks/pyproject.toml docs/research/notebooks/uv.lock docs/research/notebooks/README.md
git commit -m "chore(analysis): scaffold uv-managed notebook environment"
```

---

### Task 13: Notebook part 1 — load + univariate distributions

**Files:**
- Create: `docs/research/notebooks/2026-04-30-archetype-revalidation.ipynb`

Author the notebook cell-by-cell. Use `jupyter nbconvert --to notebook --execute` to validate at each stage.

- [ ] **Step 1: Initialize the notebook in JupyterLab**

```bash
cd docs/research/notebooks
uv run jupyter lab 2026-04-30-archetype-revalidation.ipynb &
```

- [ ] **Step 2: Cell 1 — imports and constants**

```python
import json, os
from pathlib import Path
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score, calinski_harabasz_score
from sklearn.preprocessing import StandardScaler

DATA = Path("../../../data/extracted.json")
FIGS = Path("../figures/2026-04-30")
FIGS.mkdir(parents=True, exist_ok=True)

ORIGINAL_VARS = ["btn_radius", "card_radius", "heading_weight", "body_line_height",
                 "heading_letter_spacing", "shadow_intensity", "btn_shape"]
COLOR_VARS    = ["brand_l", "brand_c", "brand_h"]
NEW_VARS      = ["dark_mode_present", "gray_chroma", "accent_offset"]
ALL_VARS      = ORIGINAL_VARS + COLOR_VARS + NEW_VARS
```

- [ ] **Step 3: Cell 2 — load and describe**

```python
records = json.loads(DATA.read_text())
df = pd.DataFrame(records)
print(f"Loaded {len(df)} systems")
print("\nFailure rate per variable:")
for v in ALL_VARS:
    null = df[v].isna().sum()
    print(f"  {v:24s} {null}/{len(df)} ({null/len(df)*100:.1f}%)")
df.head()
```

- [ ] **Step 4: Cell 3 — univariate histograms**

```python
fig, axes = plt.subplots(4, 4, figsize=(14, 12))
for ax, v in zip(axes.flat, ALL_VARS):
    s = df[v].dropna()
    if s.dtype == bool:
        sns.countplot(x=s.astype(int), ax=ax)
    else:
        sns.histplot(s, ax=ax, bins=20)
    ax.set_title(v)
for ax in axes.flat[len(ALL_VARS):]:
    ax.axis("off")
fig.tight_layout()
fig.savefig(FIGS / "01-univariate.png", dpi=120)
plt.show()
```

- [ ] **Step 5: Execute end-to-end**

```bash
cd docs/research/notebooks
uv run jupyter nbconvert --to notebook --execute 2026-04-30-archetype-revalidation.ipynb --inplace
```

Expected: no exceptions, `figures/2026-04-30/01-univariate.png` created.

- [ ] **Step 6: Commit**

```bash
git add docs/research/notebooks/2026-04-30-archetype-revalidation.ipynb docs/research/figures/2026-04-30/01-univariate.png
git commit -m "feat(analysis): notebook part 1 — load + univariate distributions"
```

---

### Task 14: Notebook part 2 — baseline + cluster-count search

**Files:**
- Modify: `docs/research/notebooks/2026-04-30-archetype-revalidation.ipynb`
- Create: `docs/research/notebooks/original_54.csv`

- [ ] **Step 1: Recover original 54-system raw data**

Open `docs/research/archetype-clustering.md` and copy the raw 7-variable table (54 rows) into `docs/research/notebooks/original_54.csv`. Ordinal column encoding:

- `shadow`: none=0, whisper=1, subtle=2, medium=3, dramatic=4
- `shape`: sharp=0, standard=1, rounded=2, pill=3

Header:

```
system,btn_radius,card_radius,heading_weight,body_line_height,heading_letter_spacing,shadow_intensity,btn_shape
```

- [ ] **Step 2: Cell 4 — baseline silhouette on original data**

```python
ORIGINAL_CSV = Path("original_54.csv")
orig = pd.read_csv(ORIGINAL_CSV)
X_orig = StandardScaler().fit_transform(orig[ORIGINAL_VARS])
km4_orig = KMeans(n_clusters=4, n_init=10, random_state=42).fit(X_orig)
baseline_silhouette = silhouette_score(X_orig, km4_orig.labels_)
print(f"Original (n={len(orig)}, k=4) silhouette: {baseline_silhouette:.3f}")
```

- [ ] **Step 3: Cell 5 — cluster-count search on new corpus**

```python
new = df[ORIGINAL_VARS].dropna()
print(f"New corpus complete-case n={len(new)} of {len(df)}")
X_new = StandardScaler().fit_transform(new)

ks = list(range(3, 8))
silhouettes, calinskis = [], []
for k in ks:
    km = KMeans(n_clusters=k, n_init=10, random_state=42).fit(X_new)
    silhouettes.append(silhouette_score(X_new, km.labels_))
    calinskis.append(calinski_harabasz_score(X_new, km.labels_))

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11, 4))
ax1.plot(ks, silhouettes, "o-"); ax1.set_xlabel("k"); ax1.set_ylabel("silhouette")
ax1.axhline(baseline_silhouette, color="red", linestyle="--", label="original k=4")
ax1.legend(); ax1.set_title("Silhouette vs. k (new corpus)")
ax2.plot(ks, calinskis, "o-"); ax2.set_xlabel("k"); ax2.set_ylabel("Calinski-Harabasz")
ax2.set_title("Calinski-Harabasz vs. k (new corpus)")
fig.tight_layout()
fig.savefig(FIGS / "02-cluster-search.png", dpi=120)
plt.show()

best_k = ks[int(np.argmax(silhouettes))]
print(f"Recommended k = {best_k} (silhouette={max(silhouettes):.3f})")
```

- [ ] **Step 4: Execute and commit**

```bash
uv run jupyter nbconvert --to notebook --execute 2026-04-30-archetype-revalidation.ipynb --inplace
git add docs/research/notebooks/2026-04-30-archetype-revalidation.ipynb docs/research/notebooks/original_54.csv docs/research/figures/2026-04-30/02-cluster-search.png
git commit -m "feat(analysis): notebook part 2 — baseline silhouette and cluster-count search"
```

---

### Task 15: Notebook part 3 — characterization + drift

**Files:**
- Modify: `docs/research/notebooks/2026-04-30-archetype-revalidation.ipynb`

- [ ] **Step 1: Cell 6 — fit recommended-k clustering and centroid table**

```python
km = KMeans(n_clusters=best_k, n_init=10, random_state=42).fit(X_new)
new_complete = new.copy()
new_complete["cluster_new"] = km.labels_

# Inverse-transform centroids back to original variable scales for readability.
scaler = StandardScaler().fit(new[ORIGINAL_VARS])
centroids = pd.DataFrame(
    scaler.inverse_transform(km.cluster_centers_),
    columns=ORIGINAL_VARS,
)
centroids.index.name = "cluster"
print("New centroids:")
display(centroids.round(2))

orig_scaler = StandardScaler().fit(orig[ORIGINAL_VARS])
orig_centroids = pd.DataFrame(
    orig_scaler.inverse_transform(km4_orig.cluster_centers_),
    columns=ORIGINAL_VARS,
)
print("\nOriginal (k=4) centroids:")
display(orig_centroids.round(2))
```

- [ ] **Step 2: Cell 7 — match new clusters to original archetype labels**

```python
ARCHETYPE_NAMES = ["Precise", "Confident", "Expressive", "Pill+Light"]
from scipy.spatial.distance import cdist

dist = cdist(centroids.values, orig_centroids.values)
matches = dist.argmin(axis=1)
new_archetype = {i: ARCHETYPE_NAMES[matches[i]] for i in range(best_k)}
print("New cluster → original archetype:")
for k, v in new_archetype.items():
    print(f"  cluster {k} → {v}")

new_complete["archetype_new"] = new_complete["cluster_new"].map(new_archetype)
```

- [ ] **Step 3: Cell 8 — drift analysis**

```python
def normalize_name(s):
    return s.lower().replace(" ", "").replace("-", "").replace(".", "")

orig["norm"] = orig["system"].map(normalize_name)
df["norm"] = df["system"].map(normalize_name)

# Both datasets, joined on normalized system name.
both = pd.merge(
    orig[["system", "norm"] + ORIGINAL_VARS],
    df[["system", "norm"] + ORIGINAL_VARS],
    on="norm",
    suffixes=("_old", "_new"),
)
print(f"Systems in both old and new corpora: {len(both)}")

# Exclude rows with any null in the new-side feature columns.
new_cols = [v + "_new" for v in ORIGINAL_VARS]
old_cols = [v + "_old" for v in ORIGINAL_VARS]
both_complete = both.dropna(subset=new_cols + old_cols)

X_matched_new = scaler.transform(both_complete[new_cols].rename(columns=dict(zip(new_cols, ORIGINAL_VARS))))
X_matched_old = orig_scaler.transform(both_complete[old_cols].rename(columns=dict(zip(old_cols, ORIGINAL_VARS))))

archetype_new = pd.Series(km.predict(X_matched_new)).map(new_archetype).values
archetype_old = pd.Series(km4_orig.predict(X_matched_old)).map(lambda i: ARCHETYPE_NAMES[i]).values

drift = pd.DataFrame({
    "system": both_complete["system_old"].values,
    "archetype_old": archetype_old,
    "archetype_new": archetype_new,
})
drift["moved"] = drift["archetype_old"] != drift["archetype_new"]
movers = drift[drift["moved"]]
print(f"Drift count: {len(movers)} / {len(drift)} ({len(movers)/max(len(drift),1)*100:.1f}%)")
display(movers)
```

- [ ] **Step 4: Execute and commit**

```bash
uv run jupyter nbconvert --to notebook --execute 2026-04-30-archetype-revalidation.ipynb --inplace
git add docs/research/notebooks/2026-04-30-archetype-revalidation.ipynb
git commit -m "feat(analysis): notebook part 3 — cluster characterization and drift"
```

---

### Task 16: Notebook part 4 — new variables, README mapping, recommendation

**Files:**
- Modify: `docs/research/notebooks/2026-04-30-archetype-revalidation.ipynb`

- [ ] **Step 1: Cell 9 — silhouette uplift per new variable**

```python
df["dark_mode_present_int"] = df["dark_mode_present"].astype(float)
extras = ["gray_chroma", "accent_offset", "dark_mode_present_int"]

uplift = {}
for v in extras:
    augmented = df[ORIGINAL_VARS + [v]].dropna()
    if len(augmented) < 30:
        uplift[v] = None
        continue
    Xa = StandardScaler().fit_transform(augmented)
    s = silhouette_score(Xa, KMeans(n_clusters=best_k, n_init=10, random_state=42).fit_predict(Xa))
    uplift[v] = s - max(silhouettes)
print("Silhouette uplift vs. base feature set:")
for k, v in uplift.items():
    if v is None:
        print(f"  {k:24s} insufficient data")
    else:
        print(f"  {k:24s} {v:+.3f}")
```

- [ ] **Step 2: Cell 10 — README mood ↔ K-means cluster mapping (markdown cell)**

Insert a markdown cell summarizing the manual mapping (engineer fills in based on Cell 6's centroid table):

```markdown
**README mood ↔ cluster mapping:**

| README mood | Closest K-means cluster | Notes |
|---|---|---|
| Clean & Minimal | <cluster index, archetype name> | <observation> |
| Warm & Friendly | ... | ... |
| Bold & Energetic | ... | ... |
| Professional | ... | ... |
| Playful & Creative | ... | ... |

Conclusion: <1:1 / collapsed / drift>.
```

- [ ] **Step 3: Cell 11 — Phase A vs Phase B decision**

```python
phase_a_silhouette_ok = max(silhouettes) >= baseline_silhouette * 0.9
phase_a_drift_ok = (len(movers) / max(len(drift), 1)) < 0.20
phase_a_no_uplift = all((v is None) or (v < 0.05) for v in uplift.values())

phase_a = phase_a_silhouette_ok and phase_a_drift_ok and phase_a_no_uplift
verdict = "Phase A" if phase_a else "Phase B"

print(f"Silhouette ≥ baseline×0.9: {phase_a_silhouette_ok} ({max(silhouettes):.3f} vs {baseline_silhouette*0.9:.3f})")
print(f"Drift < 20%: {phase_a_drift_ok}")
print(f"No new variable uplift ≥ 0.05: {phase_a_no_uplift}")
print(f"\nRecommendation: {verdict}")
```

- [ ] **Step 4: Execute end-to-end**

```bash
uv run jupyter nbconvert --to notebook --execute 2026-04-30-archetype-revalidation.ipynb --inplace
```

Expected: all cells run without error, recommendation printed.

- [ ] **Step 5: Commit**

```bash
git add docs/research/notebooks/2026-04-30-archetype-revalidation.ipynb
git commit -m "feat(analysis): notebook part 4 — new variables, README mapping, Phase decision"
```

---

### Task 17: Final report (`docs/research/2026-04-30-archetype-revalidation.md`)

**Files:**
- Create: `docs/research/2026-04-30-archetype-revalidation.md`

This is curated narrative — pull the numbers from the notebook's last execution, do not paste raw cells.

- [ ] **Step 1: Author the report**

Create the file with this scaffold, filling in the bracketed values from the notebook:

```markdown
# Archetype Re-validation — 2026-04-30

> Re-extraction of the awesome-design-md corpus and comparison against the original 54-system clustering. Methodology: see [`docs/superpowers/specs/2026-04-30-archetype-revalidation-design.md`](../superpowers/specs/2026-04-30-archetype-revalidation-design.md).

## Sample

- Original (2026-04): 54 systems
- New (2026-04-30): [N] systems
- Overlap (in both): [M]
- Net additions: [list of newly indexed systems]
- Removed: [list, if any]

## Cluster stability

| Metric | Original (k=4) | New (k=[best_k]) |
|---|---|---|
| Silhouette | [baseline_silhouette] | [max(silhouettes)] |
| Calinski-Harabasz | — | [calinskis at best_k] |

![Cluster-count search](figures/2026-04-30/02-cluster-search.png)

Recommended k for the new corpus: **[best_k]**. [Commentary: same/changed vs. original.]

## Centroid comparison

| Cluster | Archetype (matched) | btn_radius | card_radius | heading_weight | body_line_height | letter_spacing | shadow | shape |
|---|---|---|---|---|---|---|---|---|
| 0 | [name] | [v] | [v] | ... | ... | ... | ... | ... |

[Commentary on which centroids shifted significantly.]

## Drift

[X] of [M] overlapping systems changed archetype assignment ([pct]%).

| System | Old | New |
|---|---|---|
| [name] | [old archetype] | [new archetype] |

[Commentary on whether movers cluster around a particular variable shift.]

## New variables

| Variable | Failure rate | Silhouette uplift | Saturated? |
|---|---|---|---|
| dark_mode_present | [pct]% | [delta] | [yes/no] |
| gray_chroma | [pct]% | [delta] | [yes/no] |
| accent_offset | [pct]% | [delta] | [yes/no] |

[Commentary on which variables, if any, would meaningfully improve the partition.]

## README mood ↔ K-means cluster mapping

| README mood | Closest K-means cluster | Notes |
|---|---|---|
| Clean & Minimal | [name] | [observation] |
| Warm & Friendly | [name] | [observation] |
| Bold & Energetic | [name] | [observation] |
| Professional | [name] | [observation] |
| Playful & Creative | [name] | [observation] |

[Conclusion: 1:1 mapping confirmed / partial collapse / mood realignment recommended.]

## Recommendation: Phase [A or B]

Decision rule evaluation:

- Silhouette ≥ baseline × 0.9: **[yes/no]** ([max] vs [baseline*0.9])
- Drift < 20%: **[yes/no]** ([pct]%)
- No new-variable uplift ≥ 0.05: **[yes/no]** ([variable, delta])

[Conclusion paragraph: what concretely should change next, scoped for the next plan.]
```

- [ ] **Step 2: Verify all bracketed placeholders are replaced**

```bash
grep -n '\[' docs/research/2026-04-30-archetype-revalidation.md || echo "Clean."
```

Expected: no matches except in legitimate non-placeholder text.

- [ ] **Step 3: Commit**

```bash
git add docs/research/2026-04-30-archetype-revalidation.md
git commit -m "docs(research): archetype re-validation report (2026-04-30)"
```

---

### Task 18: Final verification

**Files:** None.

- [ ] **Step 1: Re-run the full pipeline cleanly**

```bash
rm -rf data/
npx tsx scripts/analysis/fetch.ts
npx tsx scripts/analysis/extract.ts
cd docs/research/notebooks
uv run jupyter nbconvert --to notebook --execute 2026-04-30-archetype-revalidation.ipynb --inplace
cd -
```

Expected: no errors. Failure rate per variable still acceptable (< 30%).

- [ ] **Step 2: Run the test suite**

```bash
pnpm test
```

Expected: existing 181 tests pass plus all new analysis tests.

- [ ] **Step 3: Type-check**

```bash
pnpm build
```

Expected: clean tsc output.

- [ ] **Step 4: Confirm report is internally consistent**

Re-read `docs/research/2026-04-30-archetype-revalidation.md` and check the recommendation paragraph matches the cell-11 verdict in the notebook.

- [ ] **Step 5: Final commit if any cleanup needed**

```bash
git status
```

If clean, no commit needed.

---

## Files changed summary

| Path | Type |
|---|---|
| `.gitignore` | modified |
| `scripts/analysis/fetch.ts` | new |
| `scripts/analysis/extract.ts` | new |
| `scripts/analysis/types.ts` | new |
| `scripts/analysis/FORMAT.md` | new |
| `scripts/analysis/parsers/section.ts` | new |
| `scripts/analysis/parsers/numeric.ts` | new |
| `scripts/analysis/parsers/typography.ts` | new |
| `scripts/analysis/parsers/categorical.ts` | new |
| `scripts/analysis/parsers/color.ts` | new |
| `scripts/analysis/parsers/modes.ts` | new |
| `tests/analysis/parsers.test.ts` | new |
| `tests/analysis/extract.test.ts` | new |
| `tests/analysis/fixtures/{stripe,airbnb,vercel,linear,apple}.md` | new |
| `docs/research/notebooks/pyproject.toml` | new |
| `docs/research/notebooks/uv.lock` | new (auto) |
| `docs/research/notebooks/README.md` | new |
| `docs/research/notebooks/2026-04-30-archetype-revalidation.ipynb` | new |
| `docs/research/notebooks/original_54.csv` | new |
| `docs/research/figures/2026-04-30/*.png` | new |
| `docs/research/2026-04-30-archetype-revalidation.md` | new |

## Out of scope (deferred)

- Generator threshold updates — gated on this report's Phase A/B verdict, written as a separate plan.
- Continuous re-analysis (cron/CI) — one-shot for now.
- Manual qualitative survey of any individual mover — the report flags movers but does not adjudicate.
