# Phase B Archetype Re-clustering — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix two known extraction bugs, then re-evaluate the corpus via Gower+hierarchical and mixed-type GMM clustering and a supervised mood classifier — pre-registered decision rules pick one of three paths (continue unsupervised, switch supervised, hybrid).

**Architecture:** TypeScript extraction pipeline gets a typed schema change (`btn_radius_px` + `is_fully_pill`) and a clip on `heading_letter_spacing`. A new Jupyter notebook runs three modeling tracks (two unsupervised + one supervised) against re-extracted data plus a hand-labeled mood column. Final curated markdown report applies the spec's decision rules to pick the next step.

**Tech Stack:** TypeScript + Vitest (extraction); Python 3.11 via uv + pandas + scikit-learn + `gower` (Gower distance) + matplotlib + seaborn (analysis); Jupyter notebook for narrative.

---

## Pre-flight

- [ ] Read [`docs/superpowers/specs/2026-04-30-archetype-phase-b-design.md`](../specs/2026-04-30-archetype-phase-b-design.md).
- [ ] Confirm branch state: `git status` clean, on a fresh `feat/archetype-phase-b` branch cut from main after PR #1 merges. If PR #1 has not merged yet, base on `feat/archetype-revalidation`.
- [ ] Confirm `data/raw/*.md` exists (run `npx tsx scripts/analysis/fetch.ts` if missing).
- [ ] Confirm `pnpm test` passes 240/240 before any change.

---

### Task 1: Add `is_fully_pill` to the ExtractedRecord type

**Files:**
- Modify: `scripts/analysis/types.ts`

- [ ] **Step 1: Update the type**

Replace the contents of `scripts/analysis/types.ts` with:

```ts
// scripts/analysis/types.ts

export interface ExtractedRecord {
  system: string;
  // Original 7 (btn_radius semantics changed: null when fully pill)
  btn_radius: number | null;
  is_fully_pill: boolean | null;
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

export const FULL_PILL_THRESHOLD_PX = 999; // values >= this are treated as the "fully pill" sentinel
export const LETTER_SPACING_RANGE: readonly [number, number] = [-6, 2]; // px; clip outliers outside
```

- [ ] **Step 2: Verify type-check**

Run: `pnpm build`
Expected: tsc fails — `pickComponentRadius` and other consumers don't return the new shape yet. Note the failures, they'll be fixed in Tasks 2-4.

- [ ] **Step 3: Commit**

```bash
git add scripts/analysis/types.ts
git commit -m "feat(analysis): add is_fully_pill flag and parsing constants"
```

---

### Task 2: Fix `heading_letter_spacing` clip — TDD

**Files:**
- Modify: `tests/analysis/parsers.test.ts`
- Modify: `scripts/analysis/parsers/typography.ts`

- [ ] **Step 1: Write the failing tests**

Append to `tests/analysis/parsers.test.ts` (inside the existing `describe("parseHeadingLetterSpacing", …)` block — if no such block exists, create one alongside the others):

```ts
describe("parseHeadingLetterSpacing — clip range", () => {
  const md = (ls: string) => `## Typography\n\n| Role | Size | Weight | LH | LS |\n|---|---|---|---|---|\n| Display Hero | 56px | 700 | 1.2 | ${ls} |\n`;

  it("returns null for letter-spacing > 2 px", () => {
    expect(parseHeadingLetterSpacing(md("70px"))).toBeNull();
    expect(parseHeadingLetterSpacing(md("53.2px"))).toBeNull();
  });

  it("returns null for letter-spacing < -6 px", () => {
    expect(parseHeadingLetterSpacing(md("-7.5px"))).toBeNull();
  });

  it("keeps in-range values unchanged", () => {
    expect(parseHeadingLetterSpacing(md("-2.4px"))).toBe(-2.4);
    expect(parseHeadingLetterSpacing(md("0px"))).toBe(0);
    expect(parseHeadingLetterSpacing(md("1.4px"))).toBe(1.4);
  });

  it("treats boundary values as in-range", () => {
    expect(parseHeadingLetterSpacing(md("-6px"))).toBe(-6);
    expect(parseHeadingLetterSpacing(md("2px"))).toBe(2);
  });
});
```

- [ ] **Step 2: Run the tests, confirm they fail**

Run: `pnpm test -- tests/analysis/parsers.test.ts -t "clip range"`
Expected: FAIL on at least the "returns null for > 2 px" cases — the current parser returns 70 not null.

- [ ] **Step 3: Implement the clip**

Edit `scripts/analysis/parsers/typography.ts`. Add the import at the top:

```ts
import { LETTER_SPACING_RANGE } from "../types.js";
```

Replace the body of `parseHeadingLetterSpacing` (lines 88-95) with:

```ts
export function parseHeadingLetterSpacing(md: string): number | null {
  const section = findSection(md, "Typography");
  if (!section) return null;
  const rows = parseRows(section);
  if (rows.length === 0) return null;
  const display = rows.reduce((a, b) => (a.size >= b.size ? a : b));
  const ls = display.letterSpacing;
  if (ls === null) return null;
  const [lo, hi] = LETTER_SPACING_RANGE;
  return ls >= lo && ls <= hi ? ls : null;
}
```

- [ ] **Step 4: Run the tests, confirm they pass**

Run: `pnpm test -- tests/analysis/parsers.test.ts`
Expected: PASS for all parsers tests, including the new clip-range cases. No existing test should regress.

- [ ] **Step 5: Apply the same clip to the YAML extractor**

In `scripts/analysis/parsers/yaml-extract.ts`, find this line (~156):

```ts
heading_letter_spacing: parsePxNumber(display?.letterSpacing),
```

Replace with:

```ts
heading_letter_spacing: clipLetterSpacing(parsePxNumber(display?.letterSpacing)),
```

Add the import near the top:

```ts
import type { ExtractedRecord, BtnShape } from "../types.js";
import { LETTER_SPACING_RANGE } from "../types.js";
```

And add this helper above `extractFromYaml`:

```ts
function clipLetterSpacing(v: number | null): number | null {
  if (v === null) return null;
  const [lo, hi] = LETTER_SPACING_RANGE;
  return v >= lo && v <= hi ? v : null;
}
```

- [ ] **Step 6: Add a YAML clip test**

Append to the YAML-extract section of `tests/analysis/parsers.test.ts`:

```ts
describe("extractFromYaml — letter_spacing clip", () => {
  const yamlMd = (ls: string) => `---
name: Demo
typography:
  hero-display:
    fontSize: 56px
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: ${ls}
colors:
  primary: "#0066cc"
---
`;

  it("clips out-of-range letter-spacing", () => {
    const r = extractFromYaml("demo", yamlMd("70px"));
    expect(r?.heading_letter_spacing).toBeNull();
  });

  it("keeps in-range letter-spacing", () => {
    const r = extractFromYaml("demo", yamlMd("-0.28px"));
    expect(r?.heading_letter_spacing).toBeCloseTo(-0.28);
  });
});
```

- [ ] **Step 7: Run all tests**

Run: `pnpm test`
Expected: 240 + 6 = 246 tests pass (or whatever the new test count is — the only new failures should be Task 1's still-broken type signatures, which we'll fix next).

If tsc complains about the unused `BtnShape` re-import, remove the duplicate.

- [ ] **Step 8: Commit**

```bash
git add tests/analysis/parsers.test.ts scripts/analysis/parsers/typography.ts scripts/analysis/parsers/yaml-extract.ts
git commit -m "feat(analysis): clip heading_letter_spacing to [-6, +2] range"
```

---

### Task 3: Split `btn_radius` and add `is_fully_pill` — Format B (YAML) — TDD

**Files:**
- Modify: `tests/analysis/parsers.test.ts`
- Modify: `scripts/analysis/parsers/yaml-extract.ts`

- [ ] **Step 1: Write the failing tests**

Append to `tests/analysis/parsers.test.ts`:

```ts
describe("extractFromYaml — pill detection", () => {
  const ymd = (roundedPill: string, btnRef: string) => `---
name: Demo
colors:
  primary: "#0066cc"
typography:
  display-lg:
    fontSize: 40px
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: 0
rounded:
  sm: 4px
  md: 8px
  pill: ${roundedPill}
components:
  button-primary:
    rounded: "${btnRef}"
---
`;

  it("flags fully-pill buttons (rounded.pill = 9999px) and zeroes btn_radius", () => {
    const r = extractFromYaml("demo", ymd("9999px", "{rounded.pill}"));
    expect(r?.is_fully_pill).toBe(true);
    expect(r?.btn_radius).toBeNull();
    expect(r?.btn_shape).toBe(3); // pill
  });

  it("returns the resolved px and is_fully_pill=false for finite pill (e.g., 32px)", () => {
    const r = extractFromYaml("demo", ymd("32px", "{rounded.pill}"));
    expect(r?.is_fully_pill).toBe(false);
    expect(r?.btn_radius).toBe(32);
    expect(r?.btn_shape).toBe(2); // rounded (32 >= 8 and < 999)
  });

  it("returns the resolved px and is_fully_pill=false for non-pill rounded refs", () => {
    const r = extractFromYaml("demo", ymd("9999px", "{rounded.md}"));
    expect(r?.is_fully_pill).toBe(false);
    expect(r?.btn_radius).toBe(8);
    expect(r?.btn_shape).toBe(2);
  });
});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `pnpm test -- tests/analysis/parsers.test.ts -t "pill detection"`
Expected: FAIL — `is_fully_pill` is undefined or the schema lacks the field.

- [ ] **Step 3: Implement pill detection in yaml-extract.ts**

In `scripts/analysis/parsers/yaml-extract.ts`, replace `pickComponentRadius` (lines 56-67) and the consuming code in `extractFromYaml` with:

```ts
import { FULL_PILL_THRESHOLD_PX } from "../types.js";

interface RadiusInfo {
  px: number | null;
  isPill: boolean;
}

function pickComponentRadiusInfo(doc: YamlDoc, candidates: string[]): RadiusInfo | null {
  const components = doc.components ?? {};
  for (const key of candidates) {
    if (key in components) {
      const ref = components[key].rounded;
      const resolved = resolveTokenRef(ref, doc.rounded);
      const px = parsePxNumber(resolved as string | number | undefined);
      if (px === null) continue;
      const isPill = px >= FULL_PILL_THRESHOLD_PX;
      return { px: isPill ? null : px, isPill };
    }
  }
  return null;
}
```

Then update `extractFromYaml` to use it (~lines 147-148):

```ts
  const btnInfo = pickComponentRadiusInfo(doc, ["button-primary", "button", "button-default"]);
  const cardInfo = pickComponentRadiusInfo(doc, ["card", "card-product", "card-listing", "card-default"]);
```

And in the returned object (~lines 150-165):

```ts
  return {
    system,
    btn_radius: btnInfo?.px ?? null,
    is_fully_pill: btnInfo ? btnInfo.isPill : null,
    card_radius: cardInfo?.px ?? null,
    heading_weight: display?.fontWeight ?? null,
    body_line_height: typeof body?.lineHeight === "number" ? body.lineHeight : null,
    heading_letter_spacing: clipLetterSpacing(parsePxNumber(display?.letterSpacing)),
    shadow_intensity: null,
    btn_shape: classifyBtnShape(btnInfo),
    brand_l: brand?.l ?? null,
    brand_c: brand?.c ?? null,
    brand_h: brand?.h ?? null,
    dark_mode_present: detectDarkMode(doc, md),
    gray_chroma: grayOklch?.c ?? null,
    accent_offset: brand && accentOklch ? ((accentOklch.h - brand.h) % 360 + 360) % 360 : null,
  };
```

Update `classifyBtnShape` to take `RadiusInfo` instead of a raw number:

```ts
function classifyBtnShape(info: RadiusInfo | null): BtnShape | null {
  if (info === null) return null;
  if (info.isPill) return 3;
  const r = info.px;
  if (r === null) return null;
  if (r >= 8) return 2;
  if (r >= 3) return 1;
  return 0;
}
```

- [ ] **Step 4: Run all tests**

Run: `pnpm test`
Expected: PASS for all pill-detection tests. Existing parser tests should also still pass.

- [ ] **Step 5: Commit**

```bash
git add tests/analysis/parsers.test.ts scripts/analysis/parsers/yaml-extract.ts
git commit -m "feat(analysis): split btn_radius into px + is_fully_pill flag (YAML)"
```

---

### Task 4: Apply pill split to Format A (markdown) extractor

**Files:**
- Modify: `scripts/analysis/parsers/numeric.ts`
- Modify: `scripts/analysis/parsers/categorical.ts` (if `parseBtnShape` lives there)
- Modify: `scripts/analysis/extract.ts`
- Modify: `tests/analysis/parsers.test.ts`

- [ ] **Step 1: Inspect current Format A extraction call site**

Run: `grep -n "btn_radius\|is_fully_pill\|btn_shape" scripts/analysis/extract.ts`
Note the call structure so the new fields slot in correctly. The Format A path likely calls `parseBtnRadius(md)` and `parseBtnShape(md)` independently.

- [ ] **Step 2: Write the failing test**

Append to `tests/analysis/parsers.test.ts`:

```ts
describe("parseBtnRadiusInfo — markdown pill detection", () => {
  it("flags '9999px' as fully pill and returns null px", () => {
    const md = `## Buttons\n\nradius: 9999px\nshape: pill\n`;
    const info = parseBtnRadiusInfo(md);
    expect(info?.isPill).toBe(true);
    expect(info?.px).toBeNull();
  });

  it("returns finite px for non-pill", () => {
    const md = `## Buttons\n\nradius: 8px\nshape: rounded\n`;
    const info = parseBtnRadiusInfo(md);
    expect(info?.isPill).toBe(false);
    expect(info?.px).toBe(8);
  });

  it("returns null when section is absent", () => {
    expect(parseBtnRadiusInfo(`## Other\n\nfoo\n`)).toBeNull();
  });
});
```

Add the import to the top of the test file (with the other parser imports):

```ts
import { parseBtnRadius, parseCardRadius, parseBtnRadiusInfo } from "../../scripts/analysis/parsers/numeric.js";
```

- [ ] **Step 3: Run, confirm failure**

Run: `pnpm test -- tests/analysis/parsers.test.ts -t "markdown pill"`
Expected: FAIL — `parseBtnRadiusInfo` is not exported.

- [ ] **Step 4: Implement `parseBtnRadiusInfo`**

Replace the body of `scripts/analysis/parsers/numeric.ts` with:

```ts
import { findSection } from "./section.js";
import { FULL_PILL_THRESHOLD_PX } from "../types.js";

const FIRST_PX = /(\d+(?:\.\d+)?)\s*px/;

function firstPxIn(section: string | null): number | null {
  if (!section) return null;
  const m = section.match(FIRST_PX);
  return m ? Number(m[1]) : null;
}

export interface RadiusInfo {
  px: number | null;
  isPill: boolean;
}

export function parseBtnRadiusInfo(md: string): RadiusInfo | null {
  const section = findSection(md, "Buttons");
  if (!section) return null;
  const px = firstPxIn(section);
  if (px === null) return null;
  const isPill = px >= FULL_PILL_THRESHOLD_PX;
  return { px: isPill ? null : px, isPill };
}

export function parseBtnRadius(md: string): number | null {
  return parseBtnRadiusInfo(md)?.px ?? null;
}

export function parseCardRadius(md: string): number | null {
  return firstPxIn(findSection(md, "Cards"));
}
```

- [ ] **Step 5: Run tests, confirm they pass**

Run: `pnpm test -- tests/analysis/parsers.test.ts`
Expected: PASS for the new tests. `parseBtnRadius` continues to work for callers that just want the number.

- [ ] **Step 6: Wire `is_fully_pill` into the markdown branch of `extract.ts`**

Open `scripts/analysis/extract.ts`. Locate the Format A branch (where it builds an `ExtractedRecord` from the markdown parsers). Replace the `btn_radius:` line with both:

```ts
const btnInfo = parseBtnRadiusInfo(raw);
// ...
btn_radius: btnInfo?.px ?? null,
is_fully_pill: btnInfo ? btnInfo.isPill : null,
```

(You may need to add `parseBtnRadiusInfo` to the import list at the top of `extract.ts`.)

If the markdown branch derives `btn_shape` from a separate parser (e.g., `parseBtnShape`), confirm that parser already classifies "pill" correctly. If not, after the existing `parseBtnShape(raw)` call, force pill when `btnInfo?.isPill === true`:

```ts
const rawShape = parseBtnShape(raw);
const btn_shape = btnInfo?.isPill ? 3 : rawShape;
```

- [ ] **Step 7: Run all tests**

Run: `pnpm test`
Expected: PASS for all (including the existing `extract.test.ts` integration smoke tests).

- [ ] **Step 8: Type-check**

Run: `pnpm build`
Expected: clean tsc. If any consumer of `ExtractedRecord` breaks (e.g., the JSON serializer), update it to include `is_fully_pill`.

- [ ] **Step 9: Commit**

```bash
git add scripts/analysis/parsers/numeric.ts scripts/analysis/extract.ts tests/analysis/parsers.test.ts
git commit -m "feat(analysis): split btn_radius into px + is_fully_pill flag (markdown)"
```

---

### Task 5: Re-run extraction and sanity-check outliers

**Files:**
- Modify: `data/extracted.json` (regenerated; gitignored, do not commit)

- [ ] **Step 1: Regenerate extraction**

```bash
npx tsx scripts/analysis/extract.ts
```

Expected: prints per-variable failure rates. `heading_letter_spacing` failure rate may rise modestly (the clip turns 3-4 outliers into nulls); `btn_radius` failure rate rises by exactly the count of formerly-9999 pill systems (those become null + is_fully_pill=true).

- [ ] **Step 2: Verify outlier removal**

```bash
node -e "
const r = require('./data/extracted.json');
const out = r.filter(x => x.heading_letter_spacing !== null && (x.heading_letter_spacing > 2 || x.heading_letter_spacing < -6));
console.log('LS out-of-range count (should be 0):', out.length);
const pills = r.filter(x => x.is_fully_pill === true);
console.log('Pill count:', pills.length, pills.map(p => p.system).slice(0,10));
const noisy = r.filter(x => x.btn_radius !== null && x.btn_radius >= 999);
console.log('btn_radius >= 999 count (should be 0):', noisy.length);
"
```

Expected: 0 letter-spacing outliers, ≥10 pill systems, 0 btn_radius ≥ 999.

- [ ] **Step 3: No commit (data/ is gitignored)**

---

### Task 6: Add Python `gower` dep and bump notebook environment

**Files:**
- Modify: `docs/research/notebooks/pyproject.toml`
- Modify: `docs/research/notebooks/uv.lock` (auto)

- [ ] **Step 1: Add `gower` to dependencies**

Edit `docs/research/notebooks/pyproject.toml` — add `"gower>=0.1.2"` to the `dependencies` list.

- [ ] **Step 2: Lock and verify**

```bash
cd docs/research/notebooks
uv sync
uv run python -c "import gower; print(gower.__version__)"
cd -
```

Expected: prints a version string with no import error.

- [ ] **Step 3: Commit**

```bash
git add docs/research/notebooks/pyproject.toml docs/research/notebooks/uv.lock
git commit -m "chore(analysis): add gower distance package for Phase B notebook"
```

---

### Task 7: Manual mood labeling

**Files:**
- Create: `docs/research/notebooks/mood_labels.csv`

- [ ] **Step 1: Generate the unlabeled stub**

```bash
uv --directory docs/research/notebooks run python -c "
import json
recs = json.loads(open('../../../data/extracted.json').read())
print('system,mood')
for r in sorted(recs, key=lambda x: x['system']):
    print(f\"{r['system']},\")
" > docs/research/notebooks/mood_labels.csv
```

Expected: 59 lines (header + 58 rows), `mood` column empty.

- [ ] **Step 2: Hand-label all 58 rows**

Open `docs/research/notebooks/mood_labels.csv` and fill the `mood` column with one of these exact strings (case-sensitive, no aliases):

- `clean_minimal`
- `warm_friendly`
- `bold_energetic`
- `professional`
- `playful_creative`

Reference: `README.md` of this repo for the canonical mood definitions. When in doubt, lean on:
- **clean_minimal**: light shadows, neutral palette, minimal radius, sans-serif weight ≤ 500.
- **warm_friendly**: rounded radius (≥10px), generous line-height (≥1.5), non-blue brand hue, dark-mode rare.
- **bold_energetic**: high-chroma brand (c≥0.18), large headings, dramatic shadows.
- **professional**: tight LH (≤1.4), low chroma (c≤0.12), dark-blue brand hue range.
- **playful_creative**: pill buttons OR very high-chroma + saturated accents OR extreme heading weight contrast.

Each system should get **exactly one** label. If two moods seem equally plausible, pick the one the system's marketing site emphasizes.

- [ ] **Step 3: Verify completeness**

```bash
awk -F, 'NR>1 && $2 == ""' docs/research/notebooks/mood_labels.csv
```

Expected: no output (all rows labeled).

- [ ] **Step 4: Verify label distribution**

```bash
awk -F, 'NR>1 {print $2}' docs/research/notebooks/mood_labels.csv | sort | uniq -c
```

Expected: each of the 5 moods has at least 5 systems. If any mood has < 5, re-review borderline cases — a single-class mood breaks the stratified-CV in Task 11.

- [ ] **Step 5: Commit**

```bash
git add docs/research/notebooks/mood_labels.csv
git commit -m "data(analysis): hand-label 58 systems with README mood taxonomy"
```

---

### Task 8: Notebook part 1 — load + variable-quality recap

**Files:**
- Create: `docs/research/notebooks/2026-04-30-archetype-phase-b.ipynb`

The Phase A notebook is preserved as-is. This is a separate notebook for Phase B.

- [ ] **Step 1: Initialize the notebook**

Create `docs/research/notebooks/2026-04-30-archetype-phase-b.ipynb` with this exact JSON content:

```json
{
 "cells": [
  {
   "cell_type": "markdown",
   "id": "intro",
   "metadata": {},
   "source": [
    "# Phase B Archetype Re-clustering — 2026-04-30\n\nThree tracks: Gower+hierarchical, mixed-type GMM, supervised mood classifier. Decision rules in spec."
   ]
  },
  {
   "cell_type": "code",
   "execution_count": null,
   "id": "imports",
   "metadata": {},
   "outputs": [],
   "source": [
    "import json\n",
    "from pathlib import Path\n",
    "import numpy as np\n",
    "import pandas as pd\n",
    "import matplotlib.pyplot as plt\n",
    "import seaborn as sns\n",
    "from sklearn.cluster import KMeans, AgglomerativeClustering\n",
    "from sklearn.metrics import silhouette_score\n",
    "from sklearn.preprocessing import StandardScaler\n",
    "from sklearn.mixture import GaussianMixture\n",
    "from sklearn.linear_model import LogisticRegression\n",
    "from sklearn.ensemble import RandomForestClassifier\n",
    "from sklearn.model_selection import StratifiedKFold, cross_val_score, cross_val_predict\n",
    "from sklearn.metrics import classification_report, confusion_matrix\n",
    "from sklearn.pipeline import Pipeline\n",
    "from sklearn.impute import SimpleImputer\n",
    "from IPython.display import display\n",
    "import gower\n",
    "from scipy.cluster.hierarchy import linkage, fcluster, dendrogram\n",
    "from scipy.spatial.distance import squareform\n",
    "\n",
    "DATA = Path('../../../data/extracted.json')\n",
    "MOODS = Path('mood_labels.csv')\n",
    "FIGS = Path('../figures/2026-04-30-phase-b')\n",
    "FIGS.mkdir(parents=True, exist_ok=True)\n",
    "\n",
    "CONT_VARS = ['btn_radius','card_radius','heading_weight','body_line_height',\n",
    "             'heading_letter_spacing','brand_l','brand_c','brand_h','gray_chroma','accent_offset']\n",
    "ORD_VARS  = ['shadow_intensity','btn_shape']\n",
    "BOOL_VARS = ['is_fully_pill','dark_mode_present']\n",
    "ALL_VARS  = CONT_VARS + ORD_VARS + BOOL_VARS"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": null,
   "id": "load",
   "metadata": {},
   "outputs": [],
   "source": [
    "df = pd.DataFrame(json.loads(DATA.read_text()))\n",
    "moods = pd.read_csv(MOODS)\n",
    "df = df.merge(moods, on='system', how='left')\n",
    "print(f'rows: {len(df)}; mood-labeled: {df[\"mood\"].notna().sum()}')\n",
    "print('\\nFailure rate per variable:')\n",
    "for v in ALL_VARS:\n",
    "    null = df[v].isna().sum()\n",
    "    print(f'  {v:24s} {null}/{len(df)} ({null/len(df)*100:.1f}%)')\n",
    "print('\\nMood distribution:')\n",
    "print(df['mood'].value_counts().to_string())\n",
    "print('\\nis_fully_pill distribution:')\n",
    "print(df['is_fully_pill'].value_counts(dropna=False).to_string())"
   ]
  }
 ],
 "metadata": {
  "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
  "language_info": {"name": "python", "version": "3.11"}
 },
 "nbformat": 4,
 "nbformat_minor": 5
}
```

- [ ] **Step 2: Execute**

```bash
cd docs/research/notebooks
uv run jupyter nbconvert --to notebook --execute 2026-04-30-archetype-phase-b.ipynb --inplace
cd -
```

Expected: no errors. `is_fully_pill` distribution prints with at least one True row.

- [ ] **Step 3: Commit**

```bash
git add docs/research/notebooks/2026-04-30-archetype-phase-b.ipynb
git commit -m "feat(analysis): phase-b notebook part 1 — load + variable recap"
```

---

### Task 9: Notebook part 2A — Gower + hierarchical clustering

**Files:**
- Modify: `docs/research/notebooks/2026-04-30-archetype-phase-b.ipynb`

- [ ] **Step 1: Append cells to the notebook**

Use a Python helper to append (or edit the JSON directly). Here is the cells block to add (each as a code cell):

```python
# Cell 3 — Gower distance matrix on mixed-type data
mixed = df[CONT_VARS + ORD_VARS + BOOL_VARS].copy()
# gower handles NaN natively. Boolean flags must be cast to category for the categorical-aware distance.
for v in BOOL_VARS:
    mixed[v] = mixed[v].astype('category')
gower_dist = gower.gower_matrix(mixed)
print(f'Gower distance matrix: {gower_dist.shape}')

# Cell 4 — hierarchical clustering, search k 3..7
from scipy.spatial.distance import squareform
condensed = squareform(gower_dist, checks=False)
Z = linkage(condensed, method='average')

ks = list(range(3, 8))
sils = []
for k in ks:
    labels = fcluster(Z, t=k, criterion='maxclust')
    s = silhouette_score(gower_dist, labels, metric='precomputed')
    sils.append(s)
    print(f'k={k} silhouette={s:.3f}')
gower_best_k = ks[int(np.argmax(sils))]
gower_best_sil = max(sils)
print(f'\nGower+hierarchical best: k={gower_best_k}, silhouette={gower_best_sil:.3f}')

fig, ax = plt.subplots(figsize=(10, 5))
ax.plot(ks, sils, 'o-')
ax.axhline(0.30, color='red', linestyle='--', label='spec threshold')
ax.set_xlabel('k'); ax.set_ylabel('silhouette'); ax.legend()
ax.set_title('Gower+hierarchical silhouette vs. k')
fig.tight_layout()
fig.savefig(FIGS / 'gower-silhouette.png', dpi=120)
plt.show()

# Cell 5 — characterize the chosen partition
gower_labels = fcluster(Z, t=gower_best_k, criterion='maxclust')
df_g = df.copy()
df_g['gower_cluster'] = gower_labels
profile = df_g.groupby('gower_cluster')[CONT_VARS + ORD_VARS].mean(numeric_only=True).round(2)
display(profile)

# Members per cluster (compact)
for cid, group in df_g.groupby('gower_cluster'):
    members = ', '.join(group['system'].head(8).tolist())
    suffix = '...' if len(group) > 8 else ''
    print(f'cluster {cid} (n={len(group)}): {members}{suffix}')
```

To insert these cells programmatically:

```bash
uv --directory docs/research/notebooks run python << 'EOF'
import json, pathlib
nb_path = pathlib.Path('2026-04-30-archetype-phase-b.ipynb')
nb = json.loads(nb_path.read_text())
new_cells = [
    {"cell_type":"code","execution_count":None,"id":"gower-dist","metadata":{},"outputs":[],
     "source":[
        "mixed = df[CONT_VARS + ORD_VARS + BOOL_VARS].copy()\n",
        "for v in BOOL_VARS:\n",
        "    mixed[v] = mixed[v].astype('category')\n",
        "gower_dist = gower.gower_matrix(mixed)\n",
        "print(f'Gower distance matrix: {gower_dist.shape}')"
     ]},
    {"cell_type":"code","execution_count":None,"id":"gower-search","metadata":{},"outputs":[],
     "source":[
        "from scipy.spatial.distance import squareform\n",
        "condensed = squareform(gower_dist, checks=False)\n",
        "Z = linkage(condensed, method='average')\n",
        "ks = list(range(3, 8)); sils = []\n",
        "for k in ks:\n",
        "    labels = fcluster(Z, t=k, criterion='maxclust')\n",
        "    s = silhouette_score(gower_dist, labels, metric='precomputed')\n",
        "    sils.append(s); print(f'k={k} silhouette={s:.3f}')\n",
        "gower_best_k = ks[int(np.argmax(sils))]\n",
        "gower_best_sil = max(sils)\n",
        "print(f'\\nGower+hierarchical best: k={gower_best_k}, silhouette={gower_best_sil:.3f}')\n",
        "fig, ax = plt.subplots(figsize=(10, 5))\n",
        "ax.plot(ks, sils, 'o-')\n",
        "ax.axhline(0.30, color='red', linestyle='--', label='spec threshold')\n",
        "ax.set_xlabel('k'); ax.set_ylabel('silhouette'); ax.legend()\n",
        "ax.set_title('Gower+hierarchical silhouette vs. k')\n",
        "fig.tight_layout(); fig.savefig(FIGS / 'gower-silhouette.png', dpi=120); plt.show()"
     ]},
    {"cell_type":"code","execution_count":None,"id":"gower-profile","metadata":{},"outputs":[],
     "source":[
        "gower_labels = fcluster(Z, t=gower_best_k, criterion='maxclust')\n",
        "df_g = df.copy(); df_g['gower_cluster'] = gower_labels\n",
        "profile = df_g.groupby('gower_cluster')[CONT_VARS + ORD_VARS].mean(numeric_only=True).round(2)\n",
        "display(profile)\n",
        "for cid, group in df_g.groupby('gower_cluster'):\n",
        "    members = ', '.join(group['system'].head(8).tolist())\n",
        "    suffix = '...' if len(group) > 8 else ''\n",
        "    print(f'cluster {cid} (n={len(group)}): {members}{suffix}')"
     ]},
]
nb['cells'].extend(new_cells)
nb_path.write_text(json.dumps(nb, indent=1))
print('appended', len(new_cells), 'cells')
EOF
```

- [ ] **Step 2: Execute notebook end-to-end**

```bash
cd docs/research/notebooks
uv run jupyter nbconvert --to notebook --execute 2026-04-30-archetype-phase-b.ipynb --inplace
cd -
```

Expected: no errors; `gower-silhouette.png` written; profile table printed.

- [ ] **Step 3: Commit**

```bash
git add docs/research/notebooks/2026-04-30-archetype-phase-b.ipynb docs/research/figures/2026-04-30-phase-b/gower-silhouette.png
git commit -m "feat(analysis): phase-b notebook part 2A — Gower+hierarchical clustering"
```

---

### Task 10: Notebook part 2B — mixed-type GMM (continuous fallback)

**Files:**
- Modify: `docs/research/notebooks/2026-04-30-archetype-phase-b.ipynb`

scikit-learn does not ship a true mixed-type GMM; the standard play is to (a) one-hot the categoricals and standardize the continuous, then fit Gaussian mixture, OR (b) fall back to GMM on continuous-only and report this limitation in the report.

- [ ] **Step 1: Append the GMM cells**

```bash
uv --directory docs/research/notebooks run python << 'EOF'
import json, pathlib
nb_path = pathlib.Path('2026-04-30-archetype-phase-b.ipynb')
nb = json.loads(nb_path.read_text())
new_cells = [
    {"cell_type":"code","execution_count":None,"id":"gmm-prep","metadata":{},"outputs":[],
     "source":[
        "# Build a one-hot+standardized matrix; rows with any continuous NaN are imputed by column median.\n",
        "from sklearn.impute import SimpleImputer\n",
        "X_cont = df[CONT_VARS].to_numpy(dtype=float)\n",
        "X_cont = SimpleImputer(strategy='median').fit_transform(X_cont)\n",
        "X_cont = StandardScaler().fit_transform(X_cont)\n",
        "ord_arr = df[ORD_VARS].fillna(-1).to_numpy(dtype=float)\n",
        "bool_arr = df[BOOL_VARS].fillna(False).astype(int).to_numpy()\n",
        "X_mix = np.hstack([X_cont, ord_arr, bool_arr])\n",
        "print('GMM input shape:', X_mix.shape)"
     ]},
    {"cell_type":"code","execution_count":None,"id":"gmm-search","metadata":{},"outputs":[],
     "source":[
        "ks = list(range(3, 8)); bics = []; sils_g = []\n",
        "for k in ks:\n",
        "    gmm = GaussianMixture(n_components=k, n_init=5, random_state=42, covariance_type='full').fit(X_mix)\n",
        "    bics.append(gmm.bic(X_mix))\n",
        "    labels = gmm.predict(X_mix)\n",
        "    sils_g.append(silhouette_score(X_mix, labels))\n",
        "    print(f'k={k} BIC={bics[-1]:.0f} silhouette={sils_g[-1]:.3f}')\n",
        "gmm_best_k = ks[int(np.argmax(sils_g))]\n",
        "gmm_best_sil = max(sils_g)\n",
        "print(f'\\nGMM best (silhouette): k={gmm_best_k}, sil={gmm_best_sil:.3f}')\n",
        "fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11, 4))\n",
        "ax1.plot(ks, bics, 'o-'); ax1.set_xlabel('k'); ax1.set_ylabel('BIC'); ax1.set_title('GMM BIC vs k')\n",
        "ax2.plot(ks, sils_g, 'o-'); ax2.axhline(0.30, color='red', linestyle='--')\n",
        "ax2.set_xlabel('k'); ax2.set_ylabel('silhouette'); ax2.set_title('GMM silhouette vs k')\n",
        "fig.tight_layout(); fig.savefig(FIGS / 'gmm-search.png', dpi=120); plt.show()"
     ]},
    {"cell_type":"code","execution_count":None,"id":"gmm-profile","metadata":{},"outputs":[],
     "source":[
        "gmm = GaussianMixture(n_components=gmm_best_k, n_init=5, random_state=42, covariance_type='full').fit(X_mix)\n",
        "df_m = df.copy(); df_m['gmm_cluster'] = gmm.predict(X_mix)\n",
        "profile_m = df_m.groupby('gmm_cluster')[CONT_VARS + ORD_VARS].mean(numeric_only=True).round(2)\n",
        "display(profile_m)"
     ]},
]
nb['cells'].extend(new_cells)
nb_path.write_text(json.dumps(nb, indent=1))
print('appended', len(new_cells), 'cells')
EOF
```

- [ ] **Step 2: Execute and commit**

```bash
cd docs/research/notebooks
uv run jupyter nbconvert --to notebook --execute 2026-04-30-archetype-phase-b.ipynb --inplace
cd -
git add docs/research/notebooks/2026-04-30-archetype-phase-b.ipynb docs/research/figures/2026-04-30-phase-b/gmm-search.png
git commit -m "feat(analysis): phase-b notebook part 2B — GMM clustering"
```

---

### Task 11: Notebook part 3 — supervised mood classifier

**Files:**
- Modify: `docs/research/notebooks/2026-04-30-archetype-phase-b.ipynb`

- [ ] **Step 1: Append classifier cells**

```bash
uv --directory docs/research/notebooks run python << 'EOF'
import json, pathlib
nb_path = pathlib.Path('2026-04-30-archetype-phase-b.ipynb')
nb = json.loads(nb_path.read_text())
new_cells = [
    {"cell_type":"code","execution_count":None,"id":"sup-prep","metadata":{},"outputs":[],
     "source":[
        "labeled = df.dropna(subset=['mood']).copy()\n",
        "print(f'Labeled rows: {len(labeled)}')\n",
        "X_sup_cont = labeled[CONT_VARS].to_numpy(dtype=float)\n",
        "X_sup_cont = SimpleImputer(strategy='median').fit_transform(X_sup_cont)\n",
        "X_sup_ord = labeled[ORD_VARS].fillna(-1).to_numpy(dtype=float)\n",
        "X_sup_bool = labeled[BOOL_VARS].fillna(False).astype(int).to_numpy()\n",
        "X_sup = np.hstack([StandardScaler().fit_transform(X_sup_cont), X_sup_ord, X_sup_bool])\n",
        "y = labeled['mood'].to_numpy()\n",
        "print('class distribution:', dict(pd.Series(y).value_counts()))"
     ]},
    {"cell_type":"code","execution_count":None,"id":"sup-cv","metadata":{},"outputs":[],
     "source":[
        "skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)\n",
        "models = {\n",
        "    'logreg': LogisticRegression(max_iter=1000),\n",
        "    'rf': RandomForestClassifier(n_estimators=300, random_state=42),\n",
        "}\n",
        "scores = {}\n",
        "for name, m in models.items():\n",
        "    s = cross_val_score(m, X_sup, y, cv=skf, scoring='f1_macro')\n",
        "    scores[name] = s\n",
        "    print(f'{name:8s} macro-F1: mean={s.mean():.3f} std={s.std():.3f} folds={s.round(3).tolist()}')\n",
        "best_name = max(scores, key=lambda k: scores[k].mean())\n",
        "best_macro_f1 = scores[best_name].mean()\n",
        "print(f'\\nBest classifier: {best_name} (macro-F1={best_macro_f1:.3f})')"
     ]},
    {"cell_type":"code","execution_count":None,"id":"sup-report","metadata":{},"outputs":[],
     "source":[
        "y_pred = cross_val_predict(models[best_name], X_sup, y, cv=skf)\n",
        "print(classification_report(y, y_pred, zero_division=0))\n",
        "labels_sorted = sorted(set(y))\n",
        "cm = confusion_matrix(y, y_pred, labels=labels_sorted)\n",
        "fig, ax = plt.subplots(figsize=(6, 5))\n",
        "sns.heatmap(cm, annot=True, fmt='d', xticklabels=labels_sorted, yticklabels=labels_sorted, ax=ax, cmap='Blues')\n",
        "ax.set_xlabel('predicted'); ax.set_ylabel('true'); ax.set_title(f'{best_name} confusion matrix (CV)')\n",
        "fig.tight_layout(); fig.savefig(FIGS / 'classifier-cm.png', dpi=120); plt.show()"
     ]},
    {"cell_type":"code","execution_count":None,"id":"sup-importance","metadata":{},"outputs":[],
     "source":[
        "if best_name == 'rf':\n",
        "    rf = RandomForestClassifier(n_estimators=300, random_state=42).fit(X_sup, y)\n",
        "    feat_names = CONT_VARS + ORD_VARS + BOOL_VARS\n",
        "    imp = pd.Series(rf.feature_importances_, index=feat_names).sort_values(ascending=False)\n",
        "    print('Random forest feature importances:'); print(imp.round(3).to_string())\n",
        "else:\n",
        "    lr = LogisticRegression(max_iter=1000).fit(X_sup, y)\n",
        "    feat_names = CONT_VARS + ORD_VARS + BOOL_VARS\n",
        "    coef_abs = np.abs(lr.coef_).mean(axis=0)\n",
        "    imp = pd.Series(coef_abs, index=feat_names).sort_values(ascending=False)\n",
        "    print('Logistic regression mean |coef| per feature:'); print(imp.round(3).to_string())"
     ]},
]
nb['cells'].extend(new_cells)
nb_path.write_text(json.dumps(nb, indent=1))
print('appended', len(new_cells), 'cells')
EOF
```

- [ ] **Step 2: Execute and commit**

```bash
cd docs/research/notebooks
uv run jupyter nbconvert --to notebook --execute 2026-04-30-archetype-phase-b.ipynb --inplace
cd -
git add docs/research/notebooks/2026-04-30-archetype-phase-b.ipynb docs/research/figures/2026-04-30-phase-b/classifier-cm.png
git commit -m "feat(analysis): phase-b notebook part 3 — supervised mood classifier"
```

---

### Task 12: Notebook part 4 — decision-rule evaluation

**Files:**
- Modify: `docs/research/notebooks/2026-04-30-archetype-phase-b.ipynb`

- [ ] **Step 1: Append the decision cell**

```bash
uv --directory docs/research/notebooks run python << 'EOF'
import json, pathlib
nb_path = pathlib.Path('2026-04-30-archetype-phase-b.ipynb')
nb = json.loads(nb_path.read_text())
new_cell = {
    "cell_type":"code","execution_count":None,"id":"decision","metadata":{},"outputs":[],
    "source":[
        "best_unsup_sil = max(gower_best_sil, gmm_best_sil)\n",
        "best_unsup_method = 'gower' if gower_best_sil >= gmm_best_sil else 'gmm'\n",
        "best_unsup_k = gower_best_k if best_unsup_method=='gower' else gmm_best_k\n",
        "print(f'Best unsupervised: {best_unsup_method} k={best_unsup_k} sil={best_unsup_sil:.3f}')\n",
        "print(f'Best supervised macro-F1: {best_macro_f1:.3f} ({best_name})')\n",
        "\n",
        "# Hybrid: within-mood unsupervised silhouette\n",
        "hybrid_pass = 0; hybrid_total = 0\n",
        "for mood, sub in df.dropna(subset=['mood']).groupby('mood'):\n",
        "    if len(sub) < 4: continue\n",
        "    hybrid_total += 1\n",
        "    sub_mixed = sub[CONT_VARS + ORD_VARS + BOOL_VARS].copy()\n",
        "    for v in BOOL_VARS: sub_mixed[v] = sub_mixed[v].astype('category')\n",
        "    g = gower.gower_matrix(sub_mixed)\n",
        "    if len(sub) < 6: continue\n",
        "    Zsub = linkage(squareform(g, checks=False), method='average')\n",
        "    best_sub = max(\n",
        "        (silhouette_score(g, fcluster(Zsub, t=k, criterion='maxclust'), metric='precomputed') for k in (2,3)),\n",
        "        default=-1.0)\n",
        "    if best_sub >= 0.30:\n",
        "        hybrid_pass += 1\n",
        "    print(f'  mood={mood} n={len(sub)} within-silhouette={best_sub:.3f}')\n",
        "print(f'\\nHybrid moods passing 0.30 threshold: {hybrid_pass}/{hybrid_total}')\n",
        "\n",
        "rule_unsup = best_unsup_sil >= 0.30\n",
        "rule_sup = best_macro_f1 >= 0.70 and best_unsup_sil < 0.30\n",
        "rule_hybrid = best_macro_f1 >= 0.70 and hybrid_pass >= 3\n",
        "print()\n",
        "print(f'Rule 1 (continue unsupervised, sil>=0.30): {rule_unsup}')\n",
        "print(f'Rule 2 (switch supervised, macro-F1>=0.70 & sil<0.30): {rule_sup}')\n",
        "print(f'Rule 3 (hybrid, macro-F1>=0.70 & hybrid_pass>=3): {rule_hybrid}')\n",
        "if rule_unsup: verdict = 'continue_unsupervised'\n",
        "elif rule_hybrid: verdict = 'hybrid'\n",
        "elif rule_sup: verdict = 'switch_supervised'\n",
        "else: verdict = 'insufficient_signal'\n",
        "print(f'\\nVerdict: {verdict}')"
    ]
}
nb['cells'].append(new_cell)
nb_path.write_text(json.dumps(nb, indent=1))
print('appended decision cell')
EOF
```

- [ ] **Step 2: Execute and commit**

```bash
cd docs/research/notebooks
uv run jupyter nbconvert --to notebook --execute 2026-04-30-archetype-phase-b.ipynb --inplace
cd -
git add docs/research/notebooks/2026-04-30-archetype-phase-b.ipynb
git commit -m "feat(analysis): phase-b notebook part 4 — decision-rule evaluation"
```

---

### Task 13: Final report

**Files:**
- Create: `docs/research/2026-04-30-archetype-phase-b.md`

This is curated narrative — pull numbers from the notebook's last execution.

- [ ] **Step 1: Author the report**

Create `docs/research/2026-04-30-archetype-phase-b.md` with this scaffold and fill every bracketed value from the notebook:

```markdown
# Phase B Archetype Re-clustering — 2026-04-30

> Follow-up to [`2026-04-30-archetype-revalidation.md`](2026-04-30-archetype-revalidation.md). Spec: [`2026-04-30-archetype-phase-b-design.md`](../superpowers/specs/2026-04-30-archetype-phase-b-design.md).

## What changed since Phase A

- Two parser fixes landed: `heading_letter_spacing` clipped to [-6, +2] (removed [N] outliers); `btn_radius` split into `btn_radius_px` + `is_fully_pill` flag (no more 9999 sentinel collapsing variance).
- Re-extraction failure rates: btn_radius [pct]%, card_radius [pct]%, heading_weight [pct]%, body_line_height [pct]%, heading_letter_spacing [pct]%, shadow_intensity [pct]%, btn_shape [pct]%, brand_l/c/h [pct]%, dark_mode_present [pct]%, gray_chroma [pct]%, accent_offset [pct]%.
- Manually labeled 58 systems with the README 5-mood taxonomy. Distribution: clean_minimal [N], warm_friendly [N], bold_energetic [N], professional [N], playful_creative [N].

## Unsupervised: Gower + hierarchical

Silhouette across k:

| k | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|
| silhouette | [v] | [v] | [v] | [v] | [v] |

Best k = [N], silhouette = [v].

![Gower silhouette](figures/2026-04-30-phase-b/gower-silhouette.png)

Cluster profiles (centroids on continuous + ordinal vars, [N] members each):

| cluster | btn_r | card_r | h.weight | body_lh | letter_sp | shadow | shape | n |
|---|---|---|---|---|---|---|---|---|
| 1 | [v] | [v] | [v] | [v] | [v] | [v] | [v] | [n] |
| ... | | | | | | | | |

[1-paragraph commentary on whether the partition is interpretable.]

## Unsupervised: GMM (one-hot + standardized)

| k | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|
| BIC | [v] | [v] | [v] | [v] | [v] |
| silhouette | [v] | [v] | [v] | [v] | [v] |

Best k = [N] (silhouette), BIC-optimal k = [N].

![GMM search](figures/2026-04-30-phase-b/gmm-search.png)

[1-paragraph commentary on agreement/disagreement with Gower partition.]

## Supervised: 5-mood classifier

5-fold stratified cross-validation:

| Model | macro-F1 mean | macro-F1 std |
|---|---|---|
| Logistic regression | [v] | [v] |
| Random forest | [v] | [v] |

Best: [model], macro-F1 = [v].

![Confusion matrix](figures/2026-04-30-phase-b/classifier-cm.png)

Per-class precision/recall:

| Mood | precision | recall | f1 | support |
|---|---|---|---|---|
| clean_minimal | [v] | [v] | [v] | [n] |
| warm_friendly | ... | | | |
| bold_energetic | ... | | | |
| professional | ... | | | |
| playful_creative | ... | | | |

Top features by importance: [list].

## Decision-rule evaluation

- Rule 1 (continue unsupervised, silhouette ≥ 0.30): **[yes/no]** ([v] vs 0.30)
- Rule 2 (switch supervised, macro-F1 ≥ 0.70 and unsupervised silhouette < 0.30): **[yes/no]** ([macro-F1] / [sil])
- Rule 3 (hybrid, macro-F1 ≥ 0.70 and ≥3 of 5 moods cluster cleanly within): **[yes/no]** ([N]/5 moods passed)

## Recommendation: [continue_unsupervised | switch_supervised | hybrid | insufficient_signal]

[2-3 paragraphs on what concretely should change next: generator threshold work, schema work, additional variables to extract, or a hold pending more data. Be explicit about whether the K-means-archetype lineage in the codebase should be retired in favor of mood prediction.]
```

- [ ] **Step 2: Verify no unfilled placeholders**

```bash
grep -nE '\[(v|n|N|pct|model|yes/no|continue|hybrid|insufficient)' docs/research/2026-04-30-archetype-phase-b.md || echo "Clean."
```

Expected: `Clean.` Bracketed values for legitimate ranges/links/code (e.g., `[-6, +2]`) are fine; the regex above targets only placeholder tokens.

- [ ] **Step 3: Commit**

```bash
git add docs/research/2026-04-30-archetype-phase-b.md
git commit -m "docs(research): phase-b archetype re-clustering report"
```

---

### Task 14: Final verification

- [ ] **Step 1: Re-run the full pipeline**

```bash
rm -rf data/extracted.json
npx tsx scripts/analysis/extract.ts
cd docs/research/notebooks
uv run jupyter nbconvert --to notebook --execute 2026-04-30-archetype-phase-b.ipynb --inplace
cd -
```

Expected: clean run, no errors. Notebook outputs match the report's numbers.

- [ ] **Step 2: Run the test suite**

```bash
pnpm test
```

Expected: all tests pass (240 + new TDD tests from Tasks 2-4 = ~250+).

- [ ] **Step 3: Type-check**

```bash
pnpm build
```

Expected: clean tsc.

- [ ] **Step 4: Confirm report ↔ notebook consistency**

Open `docs/research/2026-04-30-archetype-phase-b.md` and the notebook side-by-side. The verdict in the report's Recommendation section must match the `verdict` printed by the decision cell. Any number in the report tables must match the notebook's last execution.

- [ ] **Step 5: Final status check**

```bash
git status
git log --oneline origin/main..HEAD
```

If clean and all commits present (Tasks 1–13), no further commit needed.

---

## Files changed summary

| Path | Type |
|---|---|
| `docs/superpowers/specs/2026-04-30-archetype-phase-b-design.md` | new |
| `docs/superpowers/plans/2026-04-30-archetype-phase-b.md` | new |
| `scripts/analysis/types.ts` | modified |
| `scripts/analysis/parsers/typography.ts` | modified |
| `scripts/analysis/parsers/yaml-extract.ts` | modified |
| `scripts/analysis/parsers/numeric.ts` | modified |
| `scripts/analysis/extract.ts` | modified |
| `tests/analysis/parsers.test.ts` | modified |
| `docs/research/notebooks/pyproject.toml` | modified |
| `docs/research/notebooks/uv.lock` | modified (auto) |
| `docs/research/notebooks/mood_labels.csv` | new |
| `docs/research/notebooks/2026-04-30-archetype-phase-b.ipynb` | new |
| `docs/research/figures/2026-04-30-phase-b/*.png` | new |
| `docs/research/2026-04-30-archetype-phase-b.md` | new |

## Out of scope (deferred)

- Other extraction gaps (`card_radius`, `accent_offset` 34.5% NaN). Track in a future plan if they become blocking.
- Generator threshold updates. Gated on this report's recommendation.
- New variables beyond the existing 7+3 plus `is_fully_pill`. Add only if Rule 3 (hybrid) fails and the report calls for them.
- Replacing the K-means downstream code (`src/schema/archetypes.ts` etc.). This plan produces a recommendation; the actual code migration is a separate plan.
