# Typography Category Analysis — Design

_Date: 2026-05-01. Status: design approved, ready for implementation plan._

## 1. Context & goal

The color category was the pilot for a per-category inductive-analysis methodology
(see `docs/research/color-analysis-notes.md`). It produced
`docs/research/color-category-proposal.md` — a starter v1 spec with 1 required
input, 6 functional knobs, and 33 default-emitted tokens, all defensible against
the 58-system DESIGN.md corpus.

**Typography is the next category.** Same methodology, scaled to the richer
typography axes (size, weight, line-height, letter-spacing, font family). The
deliverable is `docs/research/type-category-proposal.md` — typography's
equivalent of the color proposal — plus the underlying analytical reports.

## 2. Scope

**In scope:**
- The `## Typography` (or `## Type Rules` / `## Type System`) section of each
  corpus DESIGN.md, specifically:
  - The Hierarchy table (one row per emitted type style)
  - The `### Font Family` subsection (primary/mono family + fallbacks +
    OpenType features)
  - The `### Principles` subsection (text dump only — not analyzed in v1)

**Out of scope (deferred):**
- Cross-section type assignments (e.g. component sections that say
  "card title uses Body Large"). These belong to a future component-category
  analysis.
- Variable font axes (`wght`, `opsz`, `slnt`) beyond the static weight value.
- Vertical metrics (cap-height, x-height, ascender/descender).
- Type-scale-base-size auto-derivation (Pass 1 captures every emitted size;
  base-size detection is a Track-Size concern, not a parser concern).

## 3. Methodology — mirror of color analysis

Same five-stage flow as color, scaled for typography's larger axis count.

```
Pass 1 (raw)            extract every Hierarchy row + per-system metadata
                        ↓
Hand-authored dict      raw role string → standard role
                        ↓
Pass 2 (normalized)     match-rate + per-role frequency
                        ↓
Per-axis tracks (5)     Size, Weight, LineHeight, LetterSpacing, FontFamily
                        ↓
type-category-proposal  starter v1 spec (knobs + inputs + emission rules)
```

This is identical in shape to color (Pass 1 → dictionary → Pass 2 → Tracks
A/B/S → color-category-proposal.md). The only difference is more tracks
because typography has more axes.

## 4. Architecture

### 4.1 Module layout

Mirror `scripts/analysis/color-roles/` exactly.

```
scripts/analysis/
  type-styles.ts                          (CLI entry; mirrors color-roles.ts)
  type-styles/
    types.ts                              TypeStyleRow, SystemResult, FrequencyEntry
    extract-styles.ts                     section + table walker; per-row parser
    parse-values.ts                       "16px (1.00rem)" → 16; "1.50 (relaxed)" → 1.50; etc.
    frequency.ts                          tally helpers (per-axis)
    dictionary.ts                         RoleDictionary validator + classifier
    size-scale.ts                         Track Size
    weight-system.ts                      Track Weight
    line-height.ts                        Track LineHeight
    letter-spacing.ts                     Track LetterSpacing
    font-family.ts                        Track FontFamily
    render-raw.ts                         Pass 1 markdown report
    render-normalized.ts                  Pass 2 markdown report
    render-size-scale.ts
    render-weight-system.ts
    render-line-height.ts
    render-letter-spacing.ts
    render-font-family.ts
```

### 4.2 CLI

`package.json` script:

```json
"type-styles": "tsx scripts/analysis/type-styles.ts"
```

Usage:
```
pnpm type-styles --pass=raw
pnpm type-styles --pass=normalized
pnpm type-styles --pass=size-scale
pnpm type-styles --pass=weight-system
pnpm type-styles --pass=line-height
pnpm type-styles --pass=letter-spacing
pnpm type-styles --pass=font-family
```

Each pass reads `data/raw/*.md` (58 files) and writes one report to
`docs/research/`.

### 4.3 Output artifacts

```
docs/research/
  type-styles-raw.md          Pass 1 report
  type-styles-raw.csv         Pass 1 full row dump
  type-style-dictionary.json  hand-authored mapping
  type-styles-normalized.md   Pass 2 report
  type-size-scale.md          Track Size report
  type-weight-system.md       Track Weight report
  type-line-height.md         Track LineHeight report
  type-letter-spacing.md      Track LetterSpacing report
  type-font-family.md         Track FontFamily report
  type-category-proposal.md   v1 starter spec (final deliverable)
  type-analysis-notes.md      meta / session notes
```

### 4.4 Tests

```
tests/analysis/
  type-styles.test.ts                   extraction + parse-values + dictionary integration
  type-styles-dictionary.test.ts        RoleDictionary validator
  type-styles-size-scale.test.ts
  type-styles-weight-system.test.ts
  type-styles-line-height.test.ts
  type-styles-letter-spacing.test.ts
  type-styles-font-family.test.ts
```

Each test file uses inline markdown fixtures plus a corpus full-run smoke test.
Estimated 400-500 tests total (color-roles has 377; typography has more axes).

## 5. Pass 1 — extraction

### 5.1 Row schema

```typescript
interface TypeStyleRow {
  system: string;                          // file basename, e.g. "linear.app"
  rawRole: string;                         // "Display XL", "{typography.body-md}", etc.
  font: string | null;                     // "Inter Variable"; null if no Font column
  sizePx: number | null;                   // "16px (1.00rem)" → 16
  weight: number | null;                   // "510" → 510; "300 (Light)" → 300
  weightRange?: [number, number];          // "400-510" → [400, 510]
  lineHeight: number | null;               // "1.50 (relaxed)" → 1.50
  lineHeightRange?: [number, number];      // "1.33-1.45" → [1.33, 1.45]
  letterSpacingPx: number | null;          // "-1.584px" → -1.584; "normal"/"0" → 0
  letterSpacingRange?: [number, number];   // "-2.4px to -2.88px" → [-2.88, -2.4]
  features: string[];                      // ["ss01", "tnum"], extracted from Features col or notes
  notes: string;                           // raw notes/use cell
  rowIndex: number;                        // 0-based within the system's table
}
```

### 5.2 Header-aware parsing

The Hierarchy table header determines column indices. Aliases:
- `Role` ≡ `Token`
- `Notes` ≡ `Use`

Optional columns (parser must handle absence):
- `Font` — Airbnb-style single-family systems omit it
- `Notes`/`Use` — some systems lack them
- `Features` — only Stripe-style systems include it

### 5.3 Per-system metadata

Emitted alongside the row list:

```typescript
interface SystemResult {
  system: string;
  rows: TypeStyleRow[];
  fontFamily: {
    primary: string | null;
    primaryFallbacks: string[];
    mono: string | null;
    monoFallbacks: string[];
    display: string | null;                // some systems separate display family
    openTypeFeatures: string[];            // global features like "ss01" or "tnum"
  };
  principlesText: string;                  // dump only; no parsing
}
```

### 5.4 Value normalization (`parse-values.ts`)

Pure functions, all return `null` on parse failure rather than throwing
(extraction must be tolerant of corpus noise).

Each parser returns a `ParsedValue<T>`:

```typescript
interface ParsedValue<T> {
  value: T | null;            // singular value, null if range-only or unparseable
  range?: [T, T];             // populated when input is a range
  uppercase?: boolean;        // letter-spacing only
}
```

The TypeStyleRow construction layer copies `value` into the singular field
(`sizePx`, `weight`, etc.) and `range` into the matching `*Range` field. This
keeps the parser pure and TypeStyleRow flat.

Examples:

- `parseSize("16px (1.00rem)") → { value: 16 }`
- `parseWeight("300 (Light)") → { value: 300 }`
- `parseWeight("400-510") → { value: null, range: [400, 510] }`
- `parseLineHeight("1.50 (relaxed)") → { value: 1.50 }`
- `parseLineHeight("1.17 (70px)") → { value: 1.17 }` (px annotation discarded)
- `parseLetterSpacing("-1.584px") → { value: -1.584 }`
- `parseLetterSpacing("normal") → { value: 0 }`
- `parseLetterSpacing("0") → { value: 0 }`
- `parseLetterSpacing("0.32px (uppercase)") → { value: 0.32, uppercase: true }`
- `parseLetterSpacing("-2.4px to -2.88px") → { value: null, range: [-2.88, -2.4] }`

## 6. Dictionary & Pass 2

### 6.1 Dictionary structure

`docs/research/type-style-dictionary.json` is hand-authored after Pass 1
inspection. Same schema as `color-role-dictionary.json`:

```json
{
  "version": 1,
  "categories": {
    "display": ["display xl", "display large", "display hero", "hero display", "rating display", "..."],
    "heading": ["heading 1", "heading 2", "section heading", "..."],
    "body": ["body large", "body", "body emphasis", "..."],
    "caption": ["caption", "caption large", "caption tabular", "..."],
    "label": ["label", "badge", "micro label", "uppercase tag", "..."],
    "button": ["button", "button small", "..."],
    "link": ["link", "link large", "nav link", "..."],
    "mono": ["mono body", "code body", "code label", "..."],
    "micro": ["micro", "tiny", "nano", "micro tabular", "..."]
  },
  "excludes": ["..."]
}
```

Final standard roles are determined after Pass 1 inspection — the list above
is a quick-survey hypothesis, not a commitment.

### 6.2 Sub-classification

The classifier emits `NormalizedTypeStyleRow` — a `TypeStyleRow` extended
with three sub-classification fields parsed from `rawRole`:

```typescript
interface NormalizedTypeStyleRow extends TypeStyleRow {
  standardRole: StandardRole | null;       // "display" | "heading" | ... | null when excluded
  sizeVariant: "xl" | "lg" | "md" | "sm" | "xs" | null;
  weightVariant: "light" | "regular" | "medium" | "semibold" | "bold" | null;
  modifier: "tabular" | "uppercase" | "emphasis" | null;
  matchStatus: "matched" | "excluded" | "unmatched";
}
```

These sub-classifications feed track analyses (e.g. Track Size uses
sizeVariant to detect scale shape; Track Weight uses weightVariant to detect
weight-system patterns). They are derived purely from `rawRole` substring
matching and do not require dictionary entries.

### 6.3 Pass 2 report

`type-styles-normalized.md`. Same structure as `color-roles-normalized.md`:
- Match rate (matched / excluded / unmatched ratios)
- Per-role frequency (count + percent)
- Per-system role coverage matrix
- Unmatched row dump (manual review backlog)

Target: ≥85% match rate (color hit 91%); unmatched <10%.

## 7. Tracks

Each track is one analytical axis, with a markdown report ending in an
**"Implications for v1 spec"** subsection that directly answers
spec-shaping questions.

### 7.1 Track Size (`size-scale.ts`)

Per-system:
- distinct size count
- min/max px
- base-size detection (most common body-tagged size)
- adjacent-pair size ratios

Cross-system:
- size cardinality distribution (median, IQR)
- standard ratio detection: how close adjacent ratios cluster to known scales
  (minor-third 1.2, major-third 1.25, perfect-fourth 1.333, golden 1.618)
- size × standard-role matrix

**Implications for v1 spec**: defaults for `scale.ratio` and `roles.cardinality`.

### 7.2 Track Weight (`weight-system.ts`)

Per-system:
- distinct weight count
- weight-system pattern: 2-weight (body+heading), 3-weight, 4-weight, custom
- non-standard weight detection (Linear's 510/590, etc.)

Cross-system:
- weight × standard-role matrix
- weight range usage (light coverage, bold coverage)

**Implications for v1 spec**: default `weights.system`; whether to support
non-standard weights as a knob option.

### 7.3 Track LineHeight (`line-height.ts`)

Per-system:
- LH range (min/max), distinct value count
- tight band (≤1.2) / normal band (1.3–1.5) / relaxed band (1.5+) breakdown

Cross-system:
- size × LH correlation: is "tight at large, relaxed at body" a corpus norm?
- standard LH value frequency (1.0, 1.1, 1.2, 1.33, 1.5, 1.6, 2.0)

**Implications for v1 spec**: default `line-height.style`; LH defaults per role.

### 7.4 Track LetterSpacing (`letter-spacing.ts`)

Per-system:
- LS coverage (rows with non-zero LS / rows with zero LS)
- size-LS scatter (linear regression slope)

Cross-system:
- "negative LS at large sizes" pattern frequency
- typical tightening rate (px LS per px size)
- uppercase annotation distribution

**Implications for v1 spec**: default `letter-spacing.curve`; tightening rate
formula.

### 7.5 Track FontFamily (`font-family.ts`)

Per-system:
- family-system pattern: single, primary+mono, primary+display+mono
- variable-font usage (name contains "Variable" or "VF")
- OpenType feature usage (`ss01`, `tnum`, `cv01`, etc.)

Cross-system:
- mono-presence rate
- fallback first-stage frequency (Inter, system-ui, -apple-system, etc.)
- sans-serif / serif / display family classification

**Implications for v1 spec**: default `family.system`; whether mono is on or
off by default.

## 8. Deliverable: `type-category-proposal.md`

Same shape as `color-category-proposal.md`. Sections:

1. **Token architecture** — Tier 1 type styles only (Tier 2 component refs
   deferred to component-category analysis).
2. **Type style emission** — schema for each emitted style.
3. **User input** — required: `font_family`. Optional: `mono_family`,
   `display_family`, `base_size`.
4. **Functional knobs** — expected ~5-6, exact list set after tracks complete:
   - `family.system`
   - `weights.system`
   - `scale.ratio`
   - `line-height.style`
   - `letter-spacing.curve`
   - `roles.cardinality`
5. **Standard type-style mapping table** — defaults from track findings.
6. **Default emission count** — projected ~14-17 styles at all defaults
   (color comparison: 33 tokens). Final number set by `roles.cardinality=standard`
   choice.

## 9. Sequencing

The work splits naturally across multiple sessions.

**Session A — extraction foundation**
1. `types.ts` + tests
2. `parse-values.ts` + tests
3. `extract-styles.ts` + tests
4. `frequency.ts` + `render-raw.ts` + tests
5. `pnpm type-styles --pass=raw` → produce `type-styles-raw.md` + `.csv`

Stop here. Hand off Pass 1 output to user for inspection.

**Manual step — dictionary authoring** (user-driven)
- User reviews raw report
- Hand-writes `type-style-dictionary.json`

**Session B — Pass 2**
6. `dictionary.ts` + tests
7. `render-normalized.ts` + tests
8. `pnpm type-styles --pass=normalized` → produce normalized report

**Sessions C/D/E/F/G — tracks (one per session, parallelizable)**
9. Track Size
10. Track Weight
11. Track LineHeight
12. Track LetterSpacing
13. Track FontFamily

**Session H — synthesis**
14. Write `type-category-proposal.md` from track findings
15. Write `type-analysis-notes.md` (meta)

The implementation plan (next step, via `writing-plans`) covers Sessions A and
B in detail and stubs out C-H. Tracks are independent enough that each can be
its own follow-on plan.

## 10. Reuse opportunities

The color-roles modules are structured generically enough that several
components transfer directly:

- `scripts/analysis/color-roles/frequency.ts` — tally helpers; lift wholesale
- The `RoleDictionary` validator + classifier pattern from
  `dictionary.ts` — same shape, different role set
- The `extractFromSystem` / section-walker shape from `extract-items.ts`
- The CLI runner pattern from `color-roles.ts`

**Decision point during implementation**: extract these into a shared
`scripts/analysis/lib/` if the duplication is large, or keep parallel
copies if differences (e.g. table-vs-list parsing) make sharing awkward.
The implementation plan should call this out explicitly so the choice
is conscious.

## 11. Success criteria

- All 58 corpus systems extract without throwing.
- Pass 2 match rate ≥85% (target: match color's 91%).
- Each track report ends with a non-empty "Implications for v1 spec"
  subsection that names a concrete spec decision.
- `type-category-proposal.md` covers all 6 sections from §8 and resolves
  every open question listed in §7's Implications subsections.
- All tests pass; tsc clean.
