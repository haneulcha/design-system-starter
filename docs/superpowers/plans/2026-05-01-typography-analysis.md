# Typography Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Pass 1 (raw extraction) and Pass 2 (normalized) infrastructure for typography category analysis, mirroring the color-roles methodology, plus stub out Tracks Size/Weight/LineHeight/LetterSpacing/FontFamily.

**Architecture:** New `scripts/analysis/type-styles/` module that parses every Hierarchy table row from each corpus DESIGN.md, normalizes raw role names via a hand-authored dictionary, and emits per-axis analytical reports. Parallel structure to `scripts/analysis/color-roles/`.

**Tech Stack:** TypeScript, vitest, tsx (existing toolchain). Pure functions, no IO inside library modules.

**Spec:** `docs/superpowers/specs/2026-05-01-typography-analysis-design.md`

---

## Session A — Extraction Foundation

After Session A completes, the user runs `pnpm type-styles --pass=raw` and reviews the output to author the role dictionary by hand.

### Task 1: Create the type-styles types module

**Files:**
- Create: `scripts/analysis/type-styles/types.ts`

- [ ] **Step 1: Write the type definitions**

Create `scripts/analysis/type-styles/types.ts`:

```typescript
export interface TypeStyleRow {
  system: string;
  rawRole: string;
  font: string | null;
  sizePx: number | null;
  weight: number | null;
  weightRange?: [number, number];
  lineHeight: number | null;
  lineHeightRange?: [number, number];
  letterSpacingPx: number | null;
  letterSpacingRange?: [number, number];
  uppercase?: boolean;
  features: string[];
  notes: string;
  rowIndex: number;
}

export interface FontFamilyMetadata {
  primary: string | null;
  primaryFallbacks: string[];
  mono: string | null;
  monoFallbacks: string[];
  display: string | null;
  openTypeFeatures: string[];
}

export interface SystemResult {
  system: string;
  hasTypographySection: boolean;
  rows: TypeStyleRow[];
  fontFamily: FontFamilyMetadata;
  principlesText: string;
}

export interface FrequencyEntry {
  key: string;
  count: number;
  systems: string[];
}
```

- [ ] **Step 2: Verify tsc passes**

Run: `pnpm build`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add scripts/analysis/type-styles/types.ts
git commit -m "feat(type-styles): schema for type-style rows and per-system metadata"
```

---

### Task 2: parse-values.ts — pure value parsers

**Files:**
- Create: `scripts/analysis/type-styles/parse-values.ts`
- Test: `tests/analysis/type-styles-parse-values.test.ts`

- [ ] **Step 1: Write failing tests for `parseSize`**

Create `tests/analysis/type-styles-parse-values.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  parseSize,
  parseWeight,
  parseLineHeight,
  parseLetterSpacing,
} from "../../scripts/analysis/type-styles/parse-values.js";

describe("parseSize", () => {
  it("extracts px from '16px (1.00rem)'", () => {
    expect(parseSize("16px (1.00rem)")).toEqual({ value: 16 });
  });
  it("extracts px from '64px'", () => {
    expect(parseSize("64px")).toEqual({ value: 64 });
  });
  it("returns null for empty or unparseable", () => {
    expect(parseSize("")).toEqual({ value: null });
    expect(parseSize("normal")).toEqual({ value: null });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test tests/analysis/type-styles-parse-values.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `parseSize` + supporting types**

Create `scripts/analysis/type-styles/parse-values.ts`:

```typescript
export interface ParsedValue<T> {
  value: T | null;
  range?: [T, T];
  uppercase?: boolean;
}

const PX_RE = /(-?\d+(?:\.\d+)?)\s*px/;

export function parseSize(input: string): ParsedValue<number> {
  const m = input.match(PX_RE);
  if (!m) return { value: null };
  return { value: Number(m[1]) };
}

export function parseWeight(_input: string): ParsedValue<number> {
  return { value: null };
}

export function parseLineHeight(_input: string): ParsedValue<number> {
  return { value: null };
}

export function parseLetterSpacing(_input: string): ParsedValue<number> {
  return { value: null };
}
```

- [ ] **Step 4: Run parseSize tests, verify PASS**

Run: `pnpm test tests/analysis/type-styles-parse-values.test.ts -t parseSize`
Expected: parseSize tests PASS.

- [ ] **Step 5: Add parseWeight tests**

Append to `tests/analysis/type-styles-parse-values.test.ts`:

```typescript
describe("parseWeight", () => {
  it("extracts plain integer", () => {
    expect(parseWeight("510")).toEqual({ value: 510 });
  });
  it("extracts integer with annotation", () => {
    expect(parseWeight("300 (Light)")).toEqual({ value: 300 });
  });
  it("parses range '400-510' into range only", () => {
    expect(parseWeight("400-510")).toEqual({ value: null, range: [400, 510] });
  });
  it("parses range '400–590' (en-dash)", () => {
    expect(parseWeight("400–590")).toEqual({ value: null, range: [400, 590] });
  });
  it("returns null on unparseable", () => {
    expect(parseWeight("normal")).toEqual({ value: null });
  });
});
```

- [ ] **Step 6: Run, verify FAIL**

Run: `pnpm test tests/analysis/type-styles-parse-values.test.ts -t parseWeight`
Expected: parseWeight tests FAIL.

- [ ] **Step 7: Implement parseWeight**

Replace `parseWeight` in `parse-values.ts`:

```typescript
const WEIGHT_RANGE_RE = /^\s*(\d{2,3})\s*[-–]\s*(\d{2,3})\b/;
const WEIGHT_NUM_RE = /^\s*(\d{2,3})\b/;

export function parseWeight(input: string): ParsedValue<number> {
  const r = input.match(WEIGHT_RANGE_RE);
  if (r) return { value: null, range: [Number(r[1]), Number(r[2])] };
  const n = input.match(WEIGHT_NUM_RE);
  if (n) return { value: Number(n[1]) };
  return { value: null };
}
```

- [ ] **Step 8: Run, verify PASS**

Run: `pnpm test tests/analysis/type-styles-parse-values.test.ts -t parseWeight`
Expected: PASS.

- [ ] **Step 9: Add parseLineHeight tests**

Append:

```typescript
describe("parseLineHeight", () => {
  it("extracts plain number", () => {
    expect(parseLineHeight("1.50")).toEqual({ value: 1.5 });
  });
  it("strips annotation '(relaxed)'", () => {
    expect(parseLineHeight("1.50 (relaxed)")).toEqual({ value: 1.5 });
  });
  it("strips px annotation '(70px)'", () => {
    expect(parseLineHeight("1.17 (70px)")).toEqual({ value: 1.17 });
  });
  it("parses range '1.33-1.45'", () => {
    expect(parseLineHeight("1.33-1.45")).toEqual({ value: null, range: [1.33, 1.45] });
  });
  it("treats 'normal' as null", () => {
    expect(parseLineHeight("normal")).toEqual({ value: null });
  });
});
```

- [ ] **Step 10: Implement parseLineHeight, run, verify PASS**

Replace `parseLineHeight` in `parse-values.ts`:

```typescript
const LH_RANGE_RE = /^\s*(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/;
const LH_NUM_RE = /^\s*(\d+(?:\.\d+)?)/;

export function parseLineHeight(input: string): ParsedValue<number> {
  if (/^\s*normal\b/i.test(input)) return { value: null };
  const r = input.match(LH_RANGE_RE);
  if (r) {
    // disambiguate range from number-with-px-annotation: range needs the second number to be a plausible LH
    const lo = Number(r[1]);
    const hi = Number(r[2]);
    if (lo >= 0.5 && lo <= 3 && hi >= 0.5 && hi <= 3) {
      return { value: null, range: [lo, hi] };
    }
  }
  const n = input.match(LH_NUM_RE);
  if (n) return { value: Number(n[1]) };
  return { value: null };
}
```

Run: `pnpm test tests/analysis/type-styles-parse-values.test.ts -t parseLineHeight`
Expected: PASS.

- [ ] **Step 11: Add parseLetterSpacing tests**

Append:

```typescript
describe("parseLetterSpacing", () => {
  it("extracts negative px", () => {
    expect(parseLetterSpacing("-1.584px")).toEqual({ value: -1.584 });
  });
  it("treats 'normal' as 0", () => {
    expect(parseLetterSpacing("normal")).toEqual({ value: 0 });
  });
  it("treats '0' as 0", () => {
    expect(parseLetterSpacing("0")).toEqual({ value: 0 });
  });
  it("flags uppercase annotation", () => {
    expect(parseLetterSpacing("0.32px (uppercase)")).toEqual({
      value: 0.32,
      uppercase: true,
    });
  });
  it("parses range '-2.4px to -2.88px'", () => {
    expect(parseLetterSpacing("-2.4px to -2.88px")).toEqual({
      value: null,
      range: [-2.88, -2.4],
    });
  });
});
```

- [ ] **Step 12: Implement parseLetterSpacing**

Replace `parseLetterSpacing`:

```typescript
const LS_RANGE_RE = /(-?\d+(?:\.\d+)?)\s*px\s+to\s+(-?\d+(?:\.\d+)?)\s*px/i;
const UPPERCASE_RE = /\(\s*uppercase\s*\)/i;

export function parseLetterSpacing(input: string): ParsedValue<number> {
  const trimmed = input.trim();
  const uppercase = UPPERCASE_RE.test(trimmed) || undefined;

  if (/^\s*normal\b/i.test(trimmed)) return { value: 0, ...(uppercase ? { uppercase } : {}) };

  const r = trimmed.match(LS_RANGE_RE);
  if (r) {
    const a = Number(r[1]);
    const b = Number(r[2]);
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    return { value: null, range: [lo, hi], ...(uppercase ? { uppercase } : {}) };
  }

  const m = trimmed.match(PX_RE);
  if (m) return { value: Number(m[1]), ...(uppercase ? { uppercase } : {}) };

  if (/^\s*0\b/.test(trimmed)) return { value: 0, ...(uppercase ? { uppercase } : {}) };

  return { value: null, ...(uppercase ? { uppercase } : {}) };
}
```

- [ ] **Step 13: Run all parse-values tests, verify PASS**

Run: `pnpm test tests/analysis/type-styles-parse-values.test.ts`
Expected: All tests PASS.

- [ ] **Step 14: Commit**

```bash
git add scripts/analysis/type-styles/parse-values.ts tests/analysis/type-styles-parse-values.test.ts
git commit -m "feat(type-styles): pure value parsers for size/weight/LH/LS"
```

---

### Task 3: extract-styles.ts — header-aware table walker

**Files:**
- Create: `scripts/analysis/type-styles/extract-styles.ts`
- Test: `tests/analysis/type-styles-extract.test.ts`

- [ ] **Step 1: Write failing test for a single-row table extraction**

Create `tests/analysis/type-styles-extract.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { extractFromSystem } from "../../scripts/analysis/type-styles/extract-styles.js";

const MINIMAL_MD = `# System

## Typography

### Font Family
- **Primary**: \`Inter\`, with fallback: \`system-ui\`

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Body | Inter | 16px (1.00rem) | 400 | 1.50 | normal | Reading |
`;

describe("extractFromSystem", () => {
  it("extracts a single body row", () => {
    const result = extractFromSystem("test-sys", MINIMAL_MD);
    expect(result.hasTypographySection).toBe(true);
    expect(result.rows).toHaveLength(1);
    const r = result.rows[0];
    expect(r.system).toBe("test-sys");
    expect(r.rawRole).toBe("Body");
    expect(r.font).toBe("Inter");
    expect(r.sizePx).toBe(16);
    expect(r.weight).toBe(400);
    expect(r.lineHeight).toBe(1.5);
    expect(r.letterSpacingPx).toBe(0);
    expect(r.notes).toBe("Reading");
    expect(r.rowIndex).toBe(0);
  });

  it("returns hasTypographySection=false when section missing", () => {
    const result = extractFromSystem("test-sys", "# nothing\n");
    expect(result.hasTypographySection).toBe(false);
    expect(result.rows).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `pnpm test tests/analysis/type-styles-extract.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement minimal extract-styles.ts**

Create `scripts/analysis/type-styles/extract-styles.ts`:

```typescript
import { findSection } from "../parsers/section.js";
import {
  parseSize,
  parseWeight,
  parseLineHeight,
  parseLetterSpacing,
} from "./parse-values.js";
import type {
  TypeStyleRow,
  SystemResult,
  FontFamilyMetadata,
} from "./types.js";

const HEADER_ALIASES: Record<string, string> = {
  role: "role",
  token: "role",
  font: "font",
  size: "size",
  weight: "weight",
  "line height": "lineHeight",
  "letter spacing": "letterSpacing",
  features: "features",
  notes: "notes",
  use: "notes",
};

function splitRow(line: string): string[] {
  // Markdown table rows usually have leading + trailing pipes that produce
  // empty strings on split; strip those before returning.
  const parts = line.split("|").map((c) => c.trim());
  if (parts.length > 0 && parts[0] === "") parts.shift();
  if (parts.length > 0 && parts[parts.length - 1] === "") parts.pop();
  return parts;
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every((c) => /^[-:\s]+$/.test(c));
}

function parseHeader(cells: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  cells.forEach((c, i) => {
    const key = HEADER_ALIASES[c.toLowerCase().trim()];
    if (key) out[key] = i;
  });
  return out;
}

function stripBackticks(s: string): string {
  return s.replace(/^`+|`+$/g, "");
}

function emptyFontFamily(): FontFamilyMetadata {
  return {
    primary: null,
    primaryFallbacks: [],
    mono: null,
    monoFallbacks: [],
    display: null,
    openTypeFeatures: [],
  };
}

export function extractFromSystem(system: string, md: string): SystemResult {
  const section = findSection(md, "Typography");
  if (section === null) {
    return {
      system,
      hasTypographySection: false,
      rows: [],
      fontFamily: emptyFontFamily(),
      principlesText: "",
    };
  }

  const rows: TypeStyleRow[] = [];
  const lines = section.split("\n");
  let header: Record<string, number> | null = null;
  let rowIndex = 0;

  for (const line of lines) {
    if (!line.trim().startsWith("|")) {
      header = null;
      continue;
    }
    const cells = splitRow(line);
    if (isSeparatorRow(cells)) continue;

    if (!header) {
      header = parseHeader(cells);
      // Header must have at least Role/Token + Size to count
      if (header.role === undefined || header.size === undefined) {
        header = null;
      }
      continue;
    }

    const get = (k: string) => (header![k] !== undefined ? cells[header![k]] : "");
    const sizeRaw = get("size");
    const sizeP = parseSize(sizeRaw);
    if (sizeP.value === null) continue; // skip rows without parseable size

    const weightP = parseWeight(get("weight"));
    const lhP = parseLineHeight(get("lineHeight"));
    const lsP = parseLetterSpacing(get("letterSpacing"));
    const featuresRaw = get("features");
    const features = featuresRaw
      ? featuresRaw.split(/[,;]\s*/).map(stripBackticks).filter(Boolean)
      : [];

    rows.push({
      system,
      rawRole: stripBackticks(get("role")).replace(/^\{|\}$/g, "").replace(/^typography\./, ""),
      font: header.font !== undefined ? stripBackticks(get("font")) || null : null,
      sizePx: sizeP.value,
      weight: weightP.value,
      ...(weightP.range ? { weightRange: weightP.range } : {}),
      lineHeight: lhP.value,
      ...(lhP.range ? { lineHeightRange: lhP.range } : {}),
      letterSpacingPx: lsP.value,
      ...(lsP.range ? { letterSpacingRange: lsP.range } : {}),
      ...(lsP.uppercase ? { uppercase: true } : {}),
      features,
      notes: get("notes"),
      rowIndex: rowIndex++,
    });
  }

  return {
    system,
    hasTypographySection: true,
    rows,
    fontFamily: emptyFontFamily(),
    principlesText: "",
  };
}
```

- [ ] **Step 4: Run, verify PASS**

Run: `pnpm test tests/analysis/type-styles-extract.test.ts`
Expected: PASS.

- [ ] **Step 5: Add tests for header aliases (Token, Use)**

Append:

```typescript
const TOKEN_HEADER_MD = `## Typography
| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| \`{typography.body-md}\` | 16px | 400 | 1.5 | 0 | Body |
`;

it("treats 'Token' as Role and 'Use' as Notes", () => {
  const r = extractFromSystem("a", TOKEN_HEADER_MD);
  expect(r.rows).toHaveLength(1);
  expect(r.rows[0].rawRole).toBe("body-md"); // typography.body-md → body-md
  expect(r.rows[0].notes).toBe("Body");
});
```

- [ ] **Step 6: Run, verify PASS** (the implementation already supports these via HEADER_ALIASES)

Run: `pnpm test tests/analysis/type-styles-extract.test.ts`
Expected: PASS.

- [ ] **Step 7: Add tests for missing-Font-column (Airbnb-style)**

Append:

```typescript
const NO_FONT_MD = `## Typography
| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| body | 14px | 500 | 1.43 | 0 | text |
`;

it("returns font=null when Font column is absent", () => {
  const r = extractFromSystem("a", NO_FONT_MD);
  expect(r.rows[0].font).toBeNull();
});
```

- [ ] **Step 8: Run, verify PASS**

Run: `pnpm test tests/analysis/type-styles-extract.test.ts`
Expected: PASS.

- [ ] **Step 9: Add a corpus smoke test**

Append:

```typescript
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const CORPUS_DIR = join(process.cwd(), "data", "raw");

it("extracts at least 30 systems from the live corpus without throwing", () => {
  const files = readdirSync(CORPUS_DIR).filter((f) => f.endsWith(".md"));
  let withSection = 0;
  let totalRows = 0;
  for (const f of files) {
    const md = readFileSync(join(CORPUS_DIR, f), "utf-8");
    const r = extractFromSystem(f.replace(/\.md$/, ""), md);
    if (r.hasTypographySection) withSection++;
    totalRows += r.rows.length;
  }
  expect(withSection).toBeGreaterThanOrEqual(30);
  expect(totalRows).toBeGreaterThanOrEqual(300);
});
```

- [ ] **Step 10: Run, verify PASS**

Run: `pnpm test tests/analysis/type-styles-extract.test.ts`
Expected: PASS. If `withSection` is below 30, inspect failures and fix the section walker before proceeding.

- [ ] **Step 11: Commit**

```bash
git add scripts/analysis/type-styles/extract-styles.ts tests/analysis/type-styles-extract.test.ts
git commit -m "feat(type-styles): header-aware Hierarchy table extractor"
```

---

### Task 4: Font Family + Principles extraction

**Files:**
- Modify: `scripts/analysis/type-styles/extract-styles.ts`
- Modify: `tests/analysis/type-styles-extract.test.ts`

- [ ] **Step 1: Write failing test for font family extraction**

Append to `tests/analysis/type-styles-extract.test.ts`:

```typescript
const FF_MD = `## Typography

### Font Family
- **Primary**: \`Inter Variable\`, with fallbacks: \`system-ui, -apple-system\`
- **Monospace**: \`JetBrains Mono\`, with fallbacks: \`ui-monospace, SF Mono\`
- **OpenType Features**: \`"ss01", "tnum"\` enabled globally

### Hierarchy
| Role | Size | Weight | Line Height | Letter Spacing |
|---|---|---|---|---|
| Body | 16px | 400 | 1.5 | 0 |

### Principles
- Light weight is the signature.
- ss01 always on.
`;

it("extracts primary, mono families, fallbacks, OpenType features, principles text", () => {
  const r = extractFromSystem("a", FF_MD);
  expect(r.fontFamily.primary).toBe("Inter Variable");
  expect(r.fontFamily.primaryFallbacks).toEqual(["system-ui", "-apple-system"]);
  expect(r.fontFamily.mono).toBe("JetBrains Mono");
  expect(r.fontFamily.monoFallbacks).toEqual(["ui-monospace", "SF Mono"]);
  expect(r.fontFamily.openTypeFeatures).toEqual(["ss01", "tnum"]);
  expect(r.principlesText).toContain("Light weight is the signature.");
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `pnpm test tests/analysis/type-styles-extract.test.ts -t "extracts primary"`
Expected: FAIL.

- [ ] **Step 3: Implement font-family + principles parsing**

In `scripts/analysis/type-styles/extract-styles.ts`, add helpers above `extractFromSystem`:

```typescript
function findSubsection(section: string, name: string): string | null {
  const lines = section.split("\n");
  const target = name.toLowerCase().trim();
  let startIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^###\s+(.+?)\s*$/);
    if (m && m[1].toLowerCase().trim() === target) {
      startIdx = i + 1;
      break;
    }
  }
  if (startIdx === -1) return null;
  let endIdx = lines.length;
  for (let i = startIdx; i < lines.length; i++) {
    if (/^#{1,3}\s+/.test(lines[i])) {
      endIdx = i;
      break;
    }
  }
  return lines.slice(startIdx, endIdx).join("\n").trim();
}

function extractBacktickedNames(s: string): string[] {
  return [...s.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
}

function parseFontFamilySubsection(sub: string | null): FontFamilyMetadata {
  const ff = emptyFontFamily();
  if (!sub) return ff;
  for (const line of sub.split("\n")) {
    const m = line.match(/^\s*[-*]\s+\*\*([^*]+)\*\*\s*:?\s*(.*)$/);
    if (!m) continue;
    const label = m[1].toLowerCase().trim();
    const body = m[2];
    const names = extractBacktickedNames(body);
    if (label === "primary") {
      ff.primary = names[0] ?? null;
      // fallbacks: backticked names after the first, or comma-split fallback list
      if (names.length > 1) {
        ff.primaryFallbacks = names.slice(1).flatMap((n) =>
          n.split(/,\s*/).map((s) => s.trim()).filter(Boolean),
        );
      }
    } else if (label === "monospace" || label === "mono") {
      ff.mono = names[0] ?? null;
      if (names.length > 1) {
        ff.monoFallbacks = names.slice(1).flatMap((n) =>
          n.split(/,\s*/).map((s) => s.trim()).filter(Boolean),
        );
      }
    } else if (label === "display") {
      ff.display = names[0] ?? null;
    } else if (label === "opentype features" || label === "features") {
      ff.openTypeFeatures = names.flatMap((n) =>
        n.split(/,\s*/).map((s) => s.replace(/^"|"$/g, "").trim()).filter(Boolean),
      );
    }
  }
  return ff;
}
```

Replace the final return in `extractFromSystem` (the success path) to populate `fontFamily` and `principlesText`:

```typescript
  const fontFamily = parseFontFamilySubsection(findSubsection(section, "Font Family"));
  const principlesText = findSubsection(section, "Principles") ?? "";

  return {
    system,
    hasTypographySection: true,
    rows,
    fontFamily,
    principlesText,
  };
```

- [ ] **Step 4: Run, verify PASS**

Run: `pnpm test tests/analysis/type-styles-extract.test.ts`
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/analysis/type-styles/extract-styles.ts tests/analysis/type-styles-extract.test.ts
git commit -m "feat(type-styles): parse Font Family and Principles subsections"
```

---

### Task 5: frequency.ts — tally helpers

**Files:**
- Create: `scripts/analysis/type-styles/frequency.ts`
- Test: `tests/analysis/type-styles-frequency.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/analysis/type-styles-frequency.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  frequencyByRawRole,
  frequencyBySize,
  frequencyByWeight,
} from "../../scripts/analysis/type-styles/frequency.js";
import type { TypeStyleRow } from "../../scripts/analysis/type-styles/types.js";

function row(over: Partial<TypeStyleRow>): TypeStyleRow {
  return {
    system: "a",
    rawRole: "Body",
    font: null,
    sizePx: 16,
    weight: 400,
    lineHeight: 1.5,
    letterSpacingPx: 0,
    features: [],
    notes: "",
    rowIndex: 0,
    ...over,
  };
}

describe("frequencyByRawRole", () => {
  it("tallies by case-folded raw role across systems", () => {
    const rows = [
      row({ system: "a", rawRole: "Body" }),
      row({ system: "b", rawRole: "body" }),
      row({ system: "a", rawRole: "Heading 1" }),
    ];
    const freq = frequencyByRawRole(rows);
    expect(freq[0].key).toBe("body");
    expect(freq[0].count).toBe(2);
    expect(freq[0].systems).toEqual(["a", "b"]);
  });
});

describe("frequencyBySize", () => {
  it("tallies sizePx as integers", () => {
    const rows = [row({ sizePx: 16, system: "a" }), row({ sizePx: 16, system: "b" }), row({ sizePx: 14, system: "a" })];
    const freq = frequencyBySize(rows);
    expect(freq[0].key).toBe("16");
    expect(freq[0].count).toBe(2);
  });
  it("ignores rows with null sizePx", () => {
    const rows = [row({ sizePx: null }), row({ sizePx: 16 })];
    expect(frequencyBySize(rows)).toHaveLength(1);
  });
});

describe("frequencyByWeight", () => {
  it("ignores rows with null weight", () => {
    const rows = [row({ weight: 400, system: "a" }), row({ weight: null, system: "b" })];
    const freq = frequencyByWeight(rows);
    expect(freq).toHaveLength(1);
    expect(freq[0].key).toBe("400");
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `pnpm test tests/analysis/type-styles-frequency.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement frequency.ts**

Create `scripts/analysis/type-styles/frequency.ts`:

```typescript
import type { TypeStyleRow, FrequencyEntry } from "./types.js";

function tally(entries: Array<{ key: string; system: string }>): FrequencyEntry[] {
  const map = new Map<string, { count: number; systems: Set<string> }>();
  for (const { key, system } of entries) {
    const slot = map.get(key);
    if (slot) {
      slot.count += 1;
      slot.systems.add(system);
    } else {
      map.set(key, { count: 1, systems: new Set([system]) });
    }
  }
  const out: FrequencyEntry[] = [];
  for (const [key, { count, systems }] of map) {
    out.push({ key, count, systems: [...systems].sort() });
  }
  out.sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  return out;
}

export function frequencyByRawRole(rows: TypeStyleRow[]): FrequencyEntry[] {
  return tally(rows.map((r) => ({ key: r.rawRole.toLowerCase(), system: r.system })));
}

export function frequencyBySize(rows: TypeStyleRow[]): FrequencyEntry[] {
  const entries: Array<{ key: string; system: string }> = [];
  for (const r of rows) {
    if (r.sizePx === null) continue;
    entries.push({ key: String(r.sizePx), system: r.system });
  }
  return tally(entries);
}

export function frequencyByWeight(rows: TypeStyleRow[]): FrequencyEntry[] {
  const entries: Array<{ key: string; system: string }> = [];
  for (const r of rows) {
    if (r.weight === null) continue;
    entries.push({ key: String(r.weight), system: r.system });
  }
  return tally(entries);
}
```

- [ ] **Step 4: Run, verify PASS**

Run: `pnpm test tests/analysis/type-styles-frequency.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/analysis/type-styles/frequency.ts tests/analysis/type-styles-frequency.test.ts
git commit -m "feat(type-styles): frequency tally helpers (rawRole/size/weight)"
```

---

### Task 6: render-raw.ts — Pass 1 markdown report

**Files:**
- Create: `scripts/analysis/type-styles/render-raw.ts`
- Test: `tests/analysis/type-styles-render-raw.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/analysis/type-styles-render-raw.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { renderRawReport, renderRawCsv } from "../../scripts/analysis/type-styles/render-raw.js";
import type { SystemResult } from "../../scripts/analysis/type-styles/types.js";

const SAMPLE: SystemResult[] = [
  {
    system: "alpha",
    hasTypographySection: true,
    rows: [
      { system: "alpha", rawRole: "Body", font: "Inter", sizePx: 16, weight: 400, lineHeight: 1.5, letterSpacingPx: 0, features: [], notes: "x", rowIndex: 0 },
    ],
    fontFamily: { primary: "Inter", primaryFallbacks: [], mono: null, monoFallbacks: [], display: null, openTypeFeatures: [] },
    principlesText: "",
  },
  {
    system: "beta",
    hasTypographySection: false,
    rows: [],
    fontFamily: { primary: null, primaryFallbacks: [], mono: null, monoFallbacks: [], display: null, openTypeFeatures: [] },
    principlesText: "",
  },
];

describe("renderRawReport", () => {
  const md = renderRawReport(SAMPLE);
  it("includes a coverage summary", () => {
    expect(md).toMatch(/2 systems/);
    expect(md).toMatch(/1 with Typography section/);
    expect(md).toMatch(/beta/); // listed as missing
  });
  it("includes a raw-role frequency table", () => {
    expect(md).toMatch(/^## Raw role frequency/m);
    expect(md).toMatch(/\bbody\b/);
  });
  it("includes a size frequency table", () => {
    expect(md).toMatch(/^## Size frequency/m);
    expect(md).toMatch(/\b16\b/);
  });
});

describe("renderRawCsv", () => {
  it("produces a header and one row per extracted style", () => {
    const csv = renderRawCsv(SAMPLE);
    const lines = csv.trim().split("\n");
    expect(lines[0]).toContain("system,rawRole,font,sizePx,weight");
    expect(lines).toHaveLength(2); // header + 1 row
    expect(lines[1]).toContain("alpha,Body,Inter,16,400");
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `pnpm test tests/analysis/type-styles-render-raw.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement render-raw.ts**

Create `scripts/analysis/type-styles/render-raw.ts`:

```typescript
import {
  frequencyByRawRole,
  frequencyBySize,
  frequencyByWeight,
} from "./frequency.js";
import type { FrequencyEntry, SystemResult, TypeStyleRow } from "./types.js";

const FREQ_TOP_N = 50;

function tableRow(cells: string[]): string {
  return "| " + cells.join(" | ") + " |";
}

function escapeCell(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function renderFrequencyTable(title: string, entries: FrequencyEntry[]): string {
  const lines: string[] = [];
  lines.push(`## ${title}`);
  lines.push("");
  if (entries.length === 0) {
    lines.push("(no entries)");
    return lines.join("\n");
  }
  lines.push(tableRow(["key", "count", "systems_present", "example_systems"]));
  lines.push(tableRow(["---", "---:", "---:", "---"]));
  for (const e of entries.slice(0, FREQ_TOP_N)) {
    const examples =
      e.systems.slice(0, 5).join(", ") + (e.systems.length > 5 ? ", …" : "");
    lines.push(
      tableRow([escapeCell(e.key), String(e.count), String(e.systems.length), escapeCell(examples)]),
    );
  }
  if (entries.length > FREQ_TOP_N) {
    lines.push("");
    lines.push(`_…${entries.length - FREQ_TOP_N} more keys truncated. See CSV for full data._`);
  }
  return lines.join("\n");
}

export function renderRawReport(results: SystemResult[]): string {
  const allRows = results.flatMap((r) => r.rows);
  const totalSystems = results.length;
  const withSection = results.filter((r) => r.hasTypographySection).length;
  const missing = results.filter((r) => !r.hasTypographySection).map((r) => r.system);

  const sections: string[] = [];
  sections.push("# Typography — Raw Pass 1");
  sections.push("");
  sections.push(`${totalSystems} systems · ${withSection} with Typography section · ${allRows.length} extracted style rows.`);
  sections.push("");
  if (missing.length > 0) {
    sections.push("**Systems missing a Typography section:** " + missing.join(", "));
    sections.push("");
  }

  sections.push(renderFrequencyTable("Raw role frequency", frequencyByRawRole(allRows)));
  sections.push("");
  sections.push(renderFrequencyTable("Size frequency", frequencyBySize(allRows)));
  sections.push("");
  sections.push(renderFrequencyTable("Weight frequency", frequencyByWeight(allRows)));

  return sections.join("\n");
}

const CSV_HEADERS = [
  "system",
  "rawRole",
  "font",
  "sizePx",
  "weight",
  "weightRange",
  "lineHeight",
  "lineHeightRange",
  "letterSpacingPx",
  "letterSpacingRange",
  "uppercase",
  "features",
  "notes",
  "rowIndex",
];

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = Array.isArray(value)
    ? value.join("|")
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function renderRawCsv(results: SystemResult[]): string {
  const rows: string[] = [CSV_HEADERS.join(",")];
  for (const result of results) {
    for (const r of result.rows) {
      rows.push(
        [
          r.system,
          r.rawRole,
          r.font,
          r.sizePx,
          r.weight,
          r.weightRange ? r.weightRange.join("-") : null,
          r.lineHeight,
          r.lineHeightRange ? r.lineHeightRange.join("-") : null,
          r.letterSpacingPx,
          r.letterSpacingRange ? r.letterSpacingRange.join("-") : null,
          r.uppercase ?? "",
          r.features,
          r.notes,
          r.rowIndex,
        ]
          .map(csvCell)
          .join(","),
      );
    }
  }
  return rows.join("\n");
}
```

- [ ] **Step 4: Run, verify PASS**

Run: `pnpm test tests/analysis/type-styles-render-raw.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/analysis/type-styles/render-raw.ts tests/analysis/type-styles-render-raw.test.ts
git commit -m "feat(type-styles): Pass 1 markdown + CSV renderer"
```

---

### Task 7: CLI runner (raw pass)

**Files:**
- Create: `scripts/analysis/type-styles.ts`
- Modify: `package.json`

- [ ] **Step 1: Implement the CLI runner**

Create `scripts/analysis/type-styles.ts`:

```typescript
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { extractFromSystem } from "./type-styles/extract-styles.js";
import { renderRawReport, renderRawCsv } from "./type-styles/render-raw.js";
import type { SystemResult } from "./type-styles/types.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(HERE, "..", "..");
const RAW_DIR = join(PROJECT_ROOT, "data", "raw");
const OUT_DIR = join(PROJECT_ROOT, "docs", "research");

type Pass = "raw";
const PASSES: Pass[] = ["raw"];

function parsePass(argv: string[]): Pass {
  const arg = argv.find((a) => a.startsWith("--pass="));
  const value = arg?.split("=")[1];
  if (PASSES.includes(value as Pass)) return value as Pass;
  throw new Error(`usage: type-styles --pass=${PASSES.join("|")}`);
}

function loadAllSystems(): SystemResult[] {
  const files = readdirSync(RAW_DIR).filter((f) => f.endsWith(".md"));
  return files.map((f) => {
    const md = readFileSync(join(RAW_DIR, f), "utf-8");
    return extractFromSystem(f.replace(/\.md$/, ""), md);
  });
}

function main(): void {
  const pass = parsePass(process.argv.slice(2));
  mkdirSync(OUT_DIR, { recursive: true });
  const results = loadAllSystems();

  if (pass === "raw") {
    writeFileSync(join(OUT_DIR, "type-styles-raw.md"), renderRawReport(results));
    writeFileSync(join(OUT_DIR, "type-styles-raw.csv"), renderRawCsv(results));
    const totalRows = results.reduce((n, r) => n + r.rows.length, 0);
    console.log(`type-styles --pass=raw: ${results.length} systems, ${totalRows} rows extracted`);
  }
}

main();
```

- [ ] **Step 2: Add the pnpm script**

Modify `package.json`. Add to `scripts`:

```json
"type-styles": "tsx scripts/analysis/type-styles.ts"
```

- [ ] **Step 3: Run the raw pass**

Run: `pnpm type-styles --pass=raw`
Expected output: `type-styles --pass=raw: 58 systems, 600+ rows extracted`. The exact row count depends on corpus content; ≥300 is acceptable.

- [ ] **Step 4: Inspect the generated reports**

Verify these files exist and are non-empty:
- `docs/research/type-styles-raw.md`
- `docs/research/type-styles-raw.csv`

Quick sanity check: open `type-styles-raw.md` and confirm the raw role frequency table contains expected entries (`body`, `heading 1`, `display`, etc.).

- [ ] **Step 5: Commit**

```bash
git add scripts/analysis/type-styles.ts package.json docs/research/type-styles-raw.md docs/research/type-styles-raw.csv
git commit -m "feat(type-styles): CLI runner for --pass=raw + emitted reports"
```

---

### **Manual step — Dictionary authoring (no task)**

**This is not a coding task. Hand the raw report to the user.** They review `docs/research/type-styles-raw.md` and `docs/research/type-styles-raw.csv`, then hand-write `docs/research/type-style-dictionary.json`.

The dictionary file structure (the shape Pass 2 expects):

```json
{
  "version": 1,
  "axis": "rawRole",
  "matching": "case_insensitive_exact",
  "groups": {
    "display": ["display xl", "display large", "display hero", "..."],
    "heading": ["heading 1", "section heading", "..."],
    "body": ["body", "body large", "..."],
    "caption": ["caption", "caption large", "..."],
    "label": ["label", "badge", "..."],
    "button": ["button", "button small", "..."],
    "link": ["link", "nav link", "..."],
    "mono": ["mono body", "code body", "..."],
    "micro": ["micro", "tiny", "nano", "..."]
  },
  "exclude": ["..."]
}
```

When the dictionary is written, proceed to Session B.

---

## Session B — Pass 2 (Normalized)

### Task 8: dictionary.ts — validator + classifier

**Files:**
- Create: `scripts/analysis/type-styles/dictionary.ts`
- Test: `tests/analysis/type-styles-dictionary.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/analysis/type-styles-dictionary.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  classifyAll,
  classifyRow,
  validateDictionary,
} from "../../scripts/analysis/type-styles/dictionary.js";
import type { TypeStyleRow } from "../../scripts/analysis/type-styles/types.js";
import type { RoleDictionary } from "../../scripts/analysis/type-styles/dictionary.js";

const DICT: RoleDictionary = {
  version: 1,
  axis: "rawRole",
  matching: "case_insensitive_exact",
  groups: {
    body: ["body", "body large"],
    heading: ["heading 1", "section heading"],
  },
  exclude: ["rating display"],
};

function row(rawRole: string, system = "a"): TypeStyleRow {
  return {
    system,
    rawRole,
    font: null,
    sizePx: 16,
    weight: 400,
    lineHeight: 1.5,
    letterSpacingPx: 0,
    features: [],
    notes: "",
    rowIndex: 0,
  };
}

describe("classifyRow", () => {
  it("matches by case-folded exact rawRole", () => {
    const c = classifyRow(row("BODY"), DICT);
    expect(c.matchStatus).toBe("matched");
    expect(c.standardRole).toBe("body");
  });
  it("excludes rows in the exclude list", () => {
    const c = classifyRow(row("Rating Display"), DICT);
    expect(c.matchStatus).toBe("excluded");
    expect(c.standardRole).toBeNull();
  });
  it("returns unmatched for unknown roles", () => {
    const c = classifyRow(row("nav-mega-menu"), DICT);
    expect(c.matchStatus).toBe("unmatched");
    expect(c.standardRole).toBeNull();
  });
});

describe("classifyRow sub-classification", () => {
  it("parses sizeVariant from rawRole", () => {
    expect(classifyRow(row("Display XL"), { ...DICT, groups: { display: ["display xl"] } }).sizeVariant).toBe("xl");
    expect(classifyRow(row("Body Large"), DICT).sizeVariant).toBe("lg");
    expect(classifyRow(row("Body"), DICT).sizeVariant).toBeNull();
  });
  it("parses weightVariant from rawRole", () => {
    expect(classifyRow(row("Body Light"), { ...DICT, groups: { body: ["body light"] } }).weightVariant).toBe("light");
    expect(classifyRow(row("Body Semibold"), { ...DICT, groups: { body: ["body semibold"] } }).weightVariant).toBe("semibold");
  });
  it("parses modifier from rawRole", () => {
    expect(classifyRow(row("Caption Tabular"), { ...DICT, groups: { caption: ["caption tabular"] } }).modifier).toBe("tabular");
    expect(classifyRow(row("Uppercase Tag"), { ...DICT, groups: { label: ["uppercase tag"] } }).modifier).toBe("uppercase");
  });
});

describe("classifyAll", () => {
  it("preserves input length and tags every row", () => {
    const rows = [row("Body"), row("rating display"), row("xyz")];
    const out = classifyAll(rows, DICT);
    expect(out).toHaveLength(3);
    expect(out.map((r) => r.matchStatus)).toEqual(["matched", "excluded", "unmatched"]);
  });
});

describe("validateDictionary", () => {
  it("rejects unknown axis", () => {
    expect(() => validateDictionary({ ...DICT, axis: "section_heading" })).toThrow();
  });
  it("rejects when a heading appears in two groups", () => {
    expect(() =>
      classifyAll([], {
        ...DICT,
        groups: { body: ["body"], heading: ["body"] },
      }),
    ).toThrow(/multiple groups/);
  });
  it("rejects when a heading is in both group and exclude", () => {
    expect(() =>
      classifyAll([], { ...DICT, exclude: ["body"] }),
    ).toThrow(/group and exclude/);
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `pnpm test tests/analysis/type-styles-dictionary.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement dictionary.ts**

Create `scripts/analysis/type-styles/dictionary.ts`:

```typescript
import type { TypeStyleRow } from "./types.js";

export type StandardRole = string;

export interface RoleDictionary {
  version: number;
  axis: "rawRole";
  matching: "case_insensitive_exact";
  groups: Record<StandardRole, string[]>;
  exclude: string[];
  notes?: Record<string, string>;
}

export type MatchStatus = "matched" | "excluded" | "unmatched";
export type SizeVariant = "xl" | "lg" | "md" | "sm" | "xs";
export type WeightVariant = "light" | "regular" | "medium" | "semibold" | "bold";
export type Modifier = "tabular" | "uppercase" | "emphasis";

export interface NormalizedTypeStyleRow extends TypeStyleRow {
  standardRole: StandardRole | null;
  sizeVariant: SizeVariant | null;
  weightVariant: WeightVariant | null;
  modifier: Modifier | null;
  matchStatus: MatchStatus;
}

const SIZE_VARIANT_RES: Array<[RegExp, SizeVariant]> = [
  [/\b(xl|extra[-\s]?large)\b/i, "xl"],
  [/\b(lg|large)\b/i, "lg"],
  [/\b(md|medium)\b/i, "md"],
  [/\b(sm|small)\b/i, "sm"],
  [/\b(xs|x[-\s]?small)\b/i, "xs"],
];

const WEIGHT_VARIANT_RES: Array<[RegExp, WeightVariant]> = [
  [/\blight\b/i, "light"],
  [/\bsemibold\b/i, "semibold"],
  [/\bbold\b/i, "bold"],
  [/\bmedium\b/i, "medium"],
  [/\bregular\b/i, "regular"],
];

const MODIFIER_RES: Array<[RegExp, Modifier]> = [
  [/\btabular\b/i, "tabular"],
  [/\buppercase\b/i, "uppercase"],
  [/\bemphasis\b/i, "emphasis"],
];

function pickFirst<T>(s: string, table: Array<[RegExp, T]>): T | null {
  for (const [re, v] of table) if (re.test(s)) return v;
  return null;
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

interface CompiledDictionary {
  groups: Map<string, StandardRole>;
  exclude: Set<string>;
}

function compile(dict: RoleDictionary): CompiledDictionary {
  const groups = new Map<string, StandardRole>();
  for (const [role, items] of Object.entries(dict.groups)) {
    for (const item of items) {
      const key = norm(item);
      if (groups.has(key)) {
        throw new Error(`raw role "${item}" appears in multiple groups`);
      }
      groups.set(key, role);
    }
  }
  const exclude = new Set(dict.exclude.map(norm));
  for (const ex of exclude) {
    if (groups.has(ex)) {
      throw new Error(`raw role "${ex}" is in both a group and exclude`);
    }
  }
  return { groups, exclude };
}

export function classifyRow(row: TypeStyleRow, dict: RoleDictionary): NormalizedTypeStyleRow {
  const compiled = compile(dict);
  return classifyRowCompiled(row, compiled);
}

function classifyRowCompiled(row: TypeStyleRow, compiled: CompiledDictionary): NormalizedTypeStyleRow {
  const key = norm(row.rawRole);
  const matched = compiled.groups.get(key);
  const sizeVariant = pickFirst(row.rawRole, SIZE_VARIANT_RES);
  const weightVariant = pickFirst(row.rawRole, WEIGHT_VARIANT_RES);
  const modifier = pickFirst(row.rawRole, MODIFIER_RES);
  const base = { sizeVariant, weightVariant, modifier };
  if (matched) {
    return { ...row, ...base, standardRole: matched, matchStatus: "matched" };
  }
  if (compiled.exclude.has(key)) {
    return { ...row, ...base, standardRole: null, matchStatus: "excluded" };
  }
  return { ...row, ...base, standardRole: null, matchStatus: "unmatched" };
}

export function classifyAll(rows: TypeStyleRow[], dict: RoleDictionary): NormalizedTypeStyleRow[] {
  const compiled = compile(dict);
  return rows.map((r) => classifyRowCompiled(r, compiled));
}

export function validateDictionary(dict: unknown): RoleDictionary {
  if (typeof dict !== "object" || dict === null) {
    throw new Error("dictionary: not an object");
  }
  const d = dict as Record<string, unknown>;
  if (d.axis !== "rawRole") throw new Error("dictionary: axis must be 'rawRole'");
  if (d.matching !== "case_insensitive_exact") {
    throw new Error("dictionary: matching must be 'case_insensitive_exact'");
  }
  if (typeof d.groups !== "object" || d.groups === null) throw new Error("dictionary: groups missing");
  if (!Array.isArray(d.exclude)) throw new Error("dictionary: exclude must be an array");
  return d as unknown as RoleDictionary;
}
```

- [ ] **Step 4: Run, verify PASS**

Run: `pnpm test tests/analysis/type-styles-dictionary.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/analysis/type-styles/dictionary.ts tests/analysis/type-styles-dictionary.test.ts
git commit -m "feat(type-styles): role dictionary validator + classifier with sub-classification"
```

---

### Task 9: render-normalized.ts — Pass 2 report

**Files:**
- Create: `scripts/analysis/type-styles/render-normalized.ts`
- Test: `tests/analysis/type-styles-render-normalized.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/analysis/type-styles-render-normalized.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { renderNormalizedReport } from "../../scripts/analysis/type-styles/render-normalized.js";
import type { NormalizedTypeStyleRow } from "../../scripts/analysis/type-styles/dictionary.js";

function nrow(over: Partial<NormalizedTypeStyleRow>): NormalizedTypeStyleRow {
  return {
    system: "a",
    rawRole: "Body",
    font: null,
    sizePx: 16,
    weight: 400,
    lineHeight: 1.5,
    letterSpacingPx: 0,
    features: [],
    notes: "",
    rowIndex: 0,
    standardRole: "body",
    sizeVariant: null,
    weightVariant: null,
    modifier: null,
    matchStatus: "matched",
    ...over,
  };
}

describe("renderNormalizedReport", () => {
  const rows = [
    nrow({ rawRole: "Body", standardRole: "body", matchStatus: "matched" }),
    nrow({ rawRole: "Body Large", standardRole: "body", sizeVariant: "lg", matchStatus: "matched" }),
    nrow({ rawRole: "Rating Display", standardRole: null, matchStatus: "excluded" }),
    nrow({ rawRole: "nav-mega-menu", standardRole: null, matchStatus: "unmatched" }),
  ];
  const md = renderNormalizedReport(rows);

  it("reports the match-rate breakdown", () => {
    expect(md).toMatch(/matched: 2/);
    expect(md).toMatch(/excluded: 1/);
    expect(md).toMatch(/unmatched: 1/);
  });

  it("includes a per-standard-role count table", () => {
    expect(md).toMatch(/^## Standard role frequency/m);
    expect(md).toMatch(/\bbody\b/);
  });

  it("lists unmatched raw roles for review", () => {
    expect(md).toMatch(/^## Unmatched raw roles/m);
    expect(md).toMatch(/nav-mega-menu/);
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `pnpm test tests/analysis/type-styles-render-normalized.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement render-normalized.ts**

Create `scripts/analysis/type-styles/render-normalized.ts`:

```typescript
import type { NormalizedTypeStyleRow } from "./dictionary.js";

function tableRow(cells: string[]): string {
  return "| " + cells.join(" | ") + " |";
}

function escapeCell(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function frequencyByStandardRole(
  rows: NormalizedTypeStyleRow[],
): Array<{ role: string; count: number; systems: string[] }> {
  const map = new Map<string, { count: number; systems: Set<string> }>();
  for (const r of rows) {
    if (r.standardRole === null) continue;
    const slot = map.get(r.standardRole);
    if (slot) {
      slot.count++;
      slot.systems.add(r.system);
    } else {
      map.set(r.standardRole, { count: 1, systems: new Set([r.system]) });
    }
  }
  return [...map.entries()]
    .map(([role, { count, systems }]) => ({ role, count, systems: [...systems].sort() }))
    .sort((a, b) => b.count - a.count || a.role.localeCompare(b.role));
}

export function renderNormalizedReport(rows: NormalizedTypeStyleRow[]): string {
  const matched = rows.filter((r) => r.matchStatus === "matched").length;
  const excluded = rows.filter((r) => r.matchStatus === "excluded").length;
  const unmatched = rows.filter((r) => r.matchStatus === "unmatched").length;
  const total = rows.length;
  const matchPct = total === 0 ? 0 : Math.round((matched / total) * 100);

  const sections: string[] = [];
  sections.push("# Typography — Normalized Pass 2");
  sections.push("");
  sections.push(
    `${total} rows total · matched: ${matched} (${matchPct}%) · excluded: ${excluded} · unmatched: ${unmatched}`,
  );
  sections.push("");

  // Standard role frequency
  sections.push("## Standard role frequency");
  sections.push("");
  const freq = frequencyByStandardRole(rows);
  if (freq.length === 0) {
    sections.push("(no matched rows)");
  } else {
    sections.push(tableRow(["standardRole", "count", "systems_present"]));
    sections.push(tableRow(["---", "---:", "---:"]));
    for (const { role, count, systems } of freq) {
      sections.push(tableRow([escapeCell(role), String(count), String(systems.length)]));
    }
  }
  sections.push("");

  // Unmatched dump
  sections.push("## Unmatched raw roles");
  sections.push("");
  const unmatchedRows = rows.filter((r) => r.matchStatus === "unmatched");
  if (unmatchedRows.length === 0) {
    sections.push("(none)");
  } else {
    const seen = new Map<string, Set<string>>();
    for (const r of unmatchedRows) {
      const key = r.rawRole.toLowerCase();
      if (!seen.has(key)) seen.set(key, new Set());
      seen.get(key)!.add(r.system);
    }
    sections.push(tableRow(["rawRole", "systems"]));
    sections.push(tableRow(["---", "---"]));
    for (const [key, systems] of [...seen.entries()].sort((a, b) =>
      a[0].localeCompare(b[0]),
    )) {
      sections.push(tableRow([escapeCell(key), [...systems].sort().join(", ")]));
    }
  }

  return sections.join("\n");
}
```

- [ ] **Step 4: Run, verify PASS**

Run: `pnpm test tests/analysis/type-styles-render-normalized.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/analysis/type-styles/render-normalized.ts tests/analysis/type-styles-render-normalized.test.ts
git commit -m "feat(type-styles): Pass 2 normalized report renderer"
```

---

### Task 10: Wire `--pass=normalized` into CLI

**Files:**
- Modify: `scripts/analysis/type-styles.ts`

- [ ] **Step 1: Extend the CLI to support `--pass=normalized`**

Replace the contents of `scripts/analysis/type-styles.ts`:

```typescript
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { extractFromSystem } from "./type-styles/extract-styles.js";
import { renderRawReport, renderRawCsv } from "./type-styles/render-raw.js";
import {
  classifyAll,
  validateDictionary,
} from "./type-styles/dictionary.js";
import { renderNormalizedReport } from "./type-styles/render-normalized.js";
import type { SystemResult } from "./type-styles/types.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(HERE, "..", "..");
const RAW_DIR = join(PROJECT_ROOT, "data", "raw");
const OUT_DIR = join(PROJECT_ROOT, "docs", "research");
const DICT_PATH = join(OUT_DIR, "type-style-dictionary.json");

type Pass = "raw" | "normalized";
const PASSES: Pass[] = ["raw", "normalized"];

function parsePass(argv: string[]): Pass {
  const arg = argv.find((a) => a.startsWith("--pass="));
  const value = arg?.split("=")[1];
  if (PASSES.includes(value as Pass)) return value as Pass;
  throw new Error(`usage: type-styles --pass=${PASSES.join("|")}`);
}

function loadAllSystems(): SystemResult[] {
  const files = readdirSync(RAW_DIR).filter((f) => f.endsWith(".md"));
  return files.map((f) => {
    const md = readFileSync(join(RAW_DIR, f), "utf-8");
    return extractFromSystem(f.replace(/\.md$/, ""), md);
  });
}

function main(): void {
  const pass = parsePass(process.argv.slice(2));
  mkdirSync(OUT_DIR, { recursive: true });
  const results = loadAllSystems();
  const allRows = results.flatMap((r) => r.rows);

  if (pass === "raw") {
    writeFileSync(join(OUT_DIR, "type-styles-raw.md"), renderRawReport(results));
    writeFileSync(join(OUT_DIR, "type-styles-raw.csv"), renderRawCsv(results));
    console.log(`type-styles --pass=raw: ${results.length} systems, ${allRows.length} rows extracted`);
    return;
  }

  if (pass === "normalized") {
    const dictRaw = JSON.parse(readFileSync(DICT_PATH, "utf-8"));
    const dict = validateDictionary(dictRaw);
    const normalized = classifyAll(allRows, dict);
    writeFileSync(join(OUT_DIR, "type-styles-normalized.md"), renderNormalizedReport(normalized));
    const matched = normalized.filter((r) => r.matchStatus === "matched").length;
    const total = normalized.length;
    const pct = Math.round((matched / total) * 100);
    console.log(`type-styles --pass=normalized: ${matched}/${total} matched (${pct}%)`);
  }
}

main();
```

- [ ] **Step 2: Run the normalized pass**

Run: `pnpm type-styles --pass=normalized`
Expected: console shows match rate ≥85%. The report writes to `docs/research/type-styles-normalized.md`.

If match rate < 85%, **stop and have the user revise the dictionary**. The plan does not proceed past this checkpoint until match rate clears 85%.

- [ ] **Step 3: Commit**

```bash
git add scripts/analysis/type-styles.ts docs/research/type-styles-normalized.md
git commit -m "feat(type-styles): CLI --pass=normalized + Pass 2 report"
```

---

## Sessions C–H — Tracks (Stubs)

Each track is its own follow-on plan, written after Session B completes and the normalized data is in hand. The shape of each track follows the spec §7. Below are the high-level acceptance criteria so the implementer of each track plan knows when they're done.

### Session C — Track Size

**Files:** `scripts/analysis/type-styles/size-scale.ts`, `scripts/analysis/type-styles/render-size-scale.ts`, `tests/analysis/type-styles-size-scale.test.ts`. CLI: `--pass=size-scale`. Output: `docs/research/type-size-scale.md`.

**Acceptance:**
- Per-system: distinct size count, min/max, base-size detection (most common body-tagged size).
- Cross-system: cardinality distribution (median, IQR), adjacent-pair size ratios bucketed against minor-third (1.2), major-third (1.25), perfect-fourth (1.333), golden (1.618). Standard role × size matrix.
- "Implications for v1 spec" subsection answers: default `scale.ratio`, default `roles.cardinality.standard` style count.

### Session D — Track Weight

**Files:** `weight-system.ts`, `render-weight-system.ts`, tests. CLI: `--pass=weight-system`. Output: `docs/research/type-weight-system.md`.

**Acceptance:**
- Per-system distinct weight count + 2/3/4-weight pattern classification.
- Standard role × weight matrix.
- Non-standard weight (510, 590, etc.) catalogue.
- Implications: default `weights.system`; whether non-standard weights are knob options.

### Session E — Track LineHeight

**Files:** `line-height.ts`, `render-line-height.ts`, tests. CLI: `--pass=line-height`. Output: `docs/research/type-line-height.md`.

**Acceptance:**
- Per-system LH range, distinct value count.
- Tight/normal/relaxed band breakdown.
- Size-LH correlation (Pearson coefficient over the corpus).
- Standard LH value frequency.
- Implications: default `line-height.style`; LH defaults per role.

### Session F — Track LetterSpacing

**Files:** `letter-spacing.ts`, `render-letter-spacing.ts`, tests. CLI: `--pass=letter-spacing`. Output: `docs/research/type-letter-spacing.md`.

**Acceptance:**
- Per-system LS coverage (rows non-zero / rows zero).
- Linear regression of LS on size (slope + R²) per system + corpus aggregate.
- "Negative LS at large sizes" pattern frequency.
- Uppercase annotation distribution.
- Implications: default `letter-spacing.curve`; tightening rate formula.

### Session G — Track FontFamily

**Files:** `font-family.ts`, `render-font-family.ts`, tests. CLI: `--pass=font-family`. Output: `docs/research/type-font-family.md`.

**Acceptance:**
- Family-system pattern distribution (single / primary+mono / primary+display+mono).
- Variable-font usage rate, OpenType feature frequency.
- Mono-presence rate. Fallback first-stage frequency.
- Implications: default `family.system`; mono on/off default.

### Session H — Synthesis

**Files:** `docs/research/type-category-proposal.md`, `docs/research/type-analysis-notes.md`. No code changes.

**Acceptance:**
- `type-category-proposal.md` covers all six sections from spec §8, with concrete defaults in every knob and a final default-emission token count.
- `type-analysis-notes.md` captures methodology choices, negative findings, caveats — analogous to `color-analysis-notes.md`.
- All open questions from each track's "Implications" subsection are resolved.

---

## Self-Review Notes

This plan covers Sessions A and B in TDD detail. Spec §9 lists Sessions A through H; Sessions C-H are stubbed because:

1. They are independent of each other (per spec §9: "Tracks are independent enough that each can be its own follow-on plan").
2. Their analysis depends on real Pass 2 output, which doesn't exist yet at plan-writing time.
3. Each track's "Implications" subsection requires inspecting the data to write meaningfully.

When Session B completes and `type-styles-normalized.md` is in hand, write per-track implementation plans using this same TDD pattern.

**Reuse decision deferred to implementation:** Spec §10 flags whether to extract `frequency.ts` / `dictionary.ts` patterns into a shared `scripts/analysis/lib/`. This plan keeps them as parallel copies in `type-styles/` for now; if a third category (spacing, radius, elevation) is analyzed later, revisit and DRY then.

**Token row count target:** Spec §11 success criteria expect ≥85% match rate at Pass 2. Task 10 step 2 enforces this gate.
