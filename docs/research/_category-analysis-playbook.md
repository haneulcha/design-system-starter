# Category Analysis Playbook

_Per-category inductive analysis methodology used to build the design system starter. Color (2026-05-01) and Typography (2026-05-02) followed this playbook end to end. Future categories — spacing, border radius, elevation, component sizing — should follow the same path. This document also preserves the **rejected alternatives** at every decision point: those are not regrets, they are the v2/v3 design space already validated against the corpus._

## 1. Purpose

This is a recipe for going from a corpus of 58 design systems (in `data/raw/*.md`) to a settled v1 starter category, encoded into TypeScript schema + generator + tests. It defines:

- The 8-phase flow (raw extraction → v1 encoded code)
- The standard set of user decision points and how to frame each
- The heuristics for resolving corpus signal vs starter opinion
- The rejected alternatives log — preserved for v2 work

A fresh agent session reading this playbook + the existing color/typography artifacts can pick up category #3 (e.g., spacing) and run the same shape without losing methodology fidelity.

## 2. Phases

The methodology has 8 sessions (A–H). Sessions A–B build the data foundation; C–G analyze each axis; H synthesizes.

```
A: Raw extraction          → docs/research/<category>-raw.md / .csv
B: Dictionary + classify   → docs/research/<category>-dictionary.json
                            + docs/research/<category>-normalized.md
C–G: Per-axis tracks       → docs/research/<category>-<axis>-track.md  (one per axis)
H: Synthesis               → docs/research/<category>-category-proposal.md
                            (the encoded-code spec)
I: Code encoding           → src/schema/<category>.ts
                            + src/generator/<category>-category.ts
                            + integration into main pipeline
                            + legacy cleanup
```

Color used Sessions C–G as `neutral-baseline`, `accent-baseline`, `semantic-layer`. Typography used `size`, `weight`, `line-height`, `letter-spacing`, `font-family`. The axis names differ but the structure is identical: one track doc per axis with corpus-driven decisions, a final proposal doc that compiles them, then code.

### Phase A — Raw extraction

**Goal:** parse `data/raw/<system>.md` files; extract every row of category-relevant data into a flat table; case-fold, normalize, emit `<category>-raw.md` (human-readable) and `<category>-raw.csv` (machine-readable).

**Files to create:**
- `scripts/analysis/<category>-roles.ts` (CLI entry: `pnpm <category>-roles --pass=raw`)
- `scripts/analysis/<category>-roles/types.ts` — row schema
- `scripts/analysis/<category>-roles/extract-*.ts` — section parser, header-aware table walker
- `scripts/analysis/<category>-roles/render-raw.ts` — markdown + csv renderer
- `tests/analysis/<category>-roles*.test.ts` — TDD tests for each module

**Commit pattern:** one commit per module (TDD: failing test → implementation → pass → commit). 6–7 commits total in Phase A.

**Definition of done:** running `pnpm <category>-roles --pass=raw` outputs the report and CSV. Sanity check: top entries by frequency match expected category-relevant terms (e.g., for color: "primary", "background"; for typography: "body", "caption"; for spacing: "small", "section").

### Phase B — Dictionary + classifier

**Goal:** the analyst (you, the human user) hand-authors `docs/research/<category>-dictionary.json` mapping every distinct rawRole to a standard category + sub-classification. Then the classifier validates and applies it, producing Pass 2 normalized output.

**Files to create:**
- `docs/research/<category>-dictionary.json` — hand-authored (NOT generated)
- `scripts/analysis/<category>-roles/dictionary.ts` — validator + classifier
- `scripts/analysis/<category>-roles/render-normalized.ts` — Pass 2 report
- Wire `--pass=normalized` into the CLI

**Dictionary shape (from typography, reusable):**
```json
{
  "version": 1,
  "categories": ["heading", "body", ...],
  "sizeVariants": { "heading": ["xs","sm","md","lg","xl"], ... },
  "rules": ["human-readable rules e.g. uppercase → badge"],
  "mappings": {
    "raw role lowercased": { "category": "...", "sizeVariant": "...", "weightVariant": "...", "modifier": "..." }
  },
  "unmapped": [...]
}
```

**Critical decision in Phase B**: the analyst's hand-authored mappings encode JUDGMENT (e.g. "title-lg → heading.sm despite the 'lg' in the name"). The classifier MUST NOT regex-infer sub-classification from rawRole — it must read it from the dictionary entry. Otherwise authored judgment is corrupted.

**Definition of done:** `--pass=normalized` reports ≥85% match rate. Below that, dictionary is incomplete and analyst returns to author more.

### Phases C–G — Per-axis tracks

**Goal:** for each axis (size/weight/lineHeight/etc.), examine the per-bucket distribution and decide the v1 default. Each axis produces one markdown track doc.

**Per-axis flow:**
1. Run a quick distribution script (one-off, in conversation): for each `(category, sizeVariant)` bucket, compute n / median / mode / range
2. Identify decision points: thin buckets (n<5), off-scale outliers, bimodal distributions
3. Ask the user to resolve each decision point — present 2-3 options with tradeoffs and a recommendation
4. Write `docs/research/<category>-<axis>-track.md` documenting:
   - Corpus summary (n, scale chosen, pruning rules)
   - Default value per bucket with corpus signal column
   - Pattern observations (e.g. "inverse heading curve")
   - Notes on UI-convention overrides
   - Carry-forward to next session

**Decision-point question pattern (used 15+ times across both categories):**
```
**Q — <topic>:**

1. **Option 1** — short description, who uses it
2. **Option 2** — short description, who uses it
3. **Option 3** — short description (or "Other")

저는 **N번** 추천 — <reasoning grounded in corpus + design convention>.

어느 쪽?
```

The user answers with a number. Their answer + your reasoning are both archived (the chosen option in the track doc, the rejected ones in §5 of this playbook).

### Phase H — Synthesis

**Goal:** combine all axis tracks into a single proposal document at `docs/research/<category>-category-proposal.md`. This document is the spec for code encoding.

**Required sections (from color and typography proposals):**
1. Token architecture (1-3 tiers depending on category)
2. Tier 1 — Scales / base values
3. Tier 2 — Aliases / category profiles (if applicable)
4. (Tier 3 if applicable)
5. Functional knobs (with options + default + what each affects)
6. User input (required vs optional)
7. Output (token count breakdown)
8. Patterns embedded in defaults
9. Special handling
10. Out of scope
11. Sequencing for code emission

**Definition of done:** the proposal compiles every axis decision + structural decision into a coherent v1 spec ready for code.

### Phase I — Code encoding

**Goal:** translate the proposal into `src/schema/<category>.ts` and `src/generator/<category>-category.ts`, integrate into the main pipeline, migrate any legacy code, delete what's no longer needed.

**Sub-steps (separate commits):**
1. Schema: `src/schema/<category>.ts` — types, scales, defaults, knobs
2. Generator: `src/generator/<category>-category.ts` — `generate<Category>Category(input)` + helpers
3. Integration: wire into `src/generator/index.ts`; update `UserInputs`/`DesignSystem` types
4. Template: rewrite `src/schema/template.ts` rendering for this category
5. Tokens: update `src/generator/tokens.ts` to emit new shape
6. Figma transformer: usually auto-migrates if it consumes `tokens.<category>`; otherwise update
7. Legacy cleanup: delete the old generator + tests + archetype fields that fed only the legacy path

**Reference parallels:**
- Color: commits `061c6a4` (schema+gen), `01e2eb8` (integration+migration), `505_*` (research pipeline `29fe1e7`)
- Typography: `ea339f7` (schema), `e9bfe30` (gen), `4cda11f` (integration), `76c3051` (template), `507c8b1` (tokens), `05dc554` (legacy removal)

## 3. Heuristics

These rules-of-thumb proved themselves across both categories. Apply them implicitly; surface explicitly only when the user's answer would change the outcome.

| Rule | When | Rationale |
|---|---|---|
| **Drop n<5 buckets** | per-bucket distributions in axis tracks | A single design system's quirk shouldn't shape the starter; ≥5 systems = pattern |
| **Snap to clean scale, not raw median** | calibration of px/em values | Designers think in scales; raw 13.4px medians become 14px |
| **Off-scale outlier ≠ scale extension** | when a bucket sits clearly outside the scale | E.g. heading 80px → don't extend to 80; drop the bucket. Brand-extreme cases override per-token |
| **Reserve unused scale stops** | when v1 alias map skips some scale values | Color neutral has 9 stops, aliases use 5. Reserve the rest as palette. Same for typography size: 20/28/36 reserved |
| **UI convention beats data mode for visual-weight categories** | card/button/badge/nav weight decisions | E.g. card weight: corpus mode 400, but UI convention 600 wins because cards need to read as headings within their containers |
| **Inverse weight/line-height curves on heading** | when heading spans 16–64+ px | Larger sizes self-establish hierarchy; smaller sizes need more weight + line-height to differentiate from body |
| **Bimodal data → starter picks one side opinionated** | e.g. heading defaults split 400 vs 700 | The starter is opinionated; users wanting the other archetype override per-category |
| **Korean fallback in every font chain** | font-family work | This is a project-level constraint (see memory: user_korean_market.md) |
| **No alias layer for v1 if raw scale suffices** | weightVariant in typography, possibly elsewhere | Don't add a tier of indirection if raw tokens already serve the use case |
| **Categories with single value drop the variant axis** | link.md=14, link.sm=14 collapsed to single | Variant axis only meaningful when values differ |

## 4. Rejected alternatives — preserved design space

This section records every option the user explicitly rejected during color and typography decisions. Each rejection is tagged with **why-rejected** and **when-to-revisit**. Treat these as v2 features-in-waiting, not failures.

### 4.1 Color (2026-05-01)

Color decisions were largely settled before this playbook existed; the rejected items below are the high-level pivots and a few corpus-driven rejections noted in track docs.

- **Mood-based generation** (5 archetypes drove all categories)
  - **Why rejected:** color, typography, and component sizing each have their own corpus shape; one mood knob coupling all of them was lossy and forced false correlations
  - **When to revisit:** if a "preset bundles" feature is added — e.g. `preset: "professional"` autoselects matching color knobs + heading style + radius. The 5 archetypes (`professional`, `bold-energetic`, `clean-minimal`, `warm-friendly`, `playful-creative`) are still in `src/schema/archetypes.ts` for spacing/radius/elevation; they could become preset bundles
- **Warm-tinted neutral**
  - **Why rejected:** corpus showed 0/56 systems use warm tints in their neutral scale (Phase E neutral-baseline)
  - **When to revisit:** if user requests a "fashion/luxury" preset — warm taupe neutrals are common in those categories but absent from our corpus
- **info as core semantic (alongside error/success/warning)**
  - **Why rejected:** info overlaps with brand-blue families in ~26% of corpus → user confusion. Demoted to optional.
  - **When to revisit:** product analytics for "data dashboard" use cases where info is necessary

### 4.2 Typography (2026-05-02) — full rejection log

Each entry: **rejected option** | **why** | **revisit trigger**.

#### Taxonomy structure

- **`button` as base category (not semantic)** | placed in semantic because data showed `button` is universally a UI role with weight/case differentiation, not a size-driven category | revisit if buttons appear in editorial/article contexts where they read as inline body text
- **`code` as base mono category** | placed in semantic because `code` ≠ `mono base` — mono is a font-family choice, code is a usage role. Mono prefix is handled as a rule | revisit if a "documentation" category is added with prose-mono mixing
- **`label` as 7th semantic category** | rejected because corpus had only ~50 scattered label rows, mostly variants like "Mono Label", "Uppercase Label". No coherent semantic identity | revisit if forms/admin UI category is added later — labels there are a stable role

#### Size scale

- **Original 12-stop scale (10/12/14/16/18/20/24/36/48/56/64)** | dropped 56, added 28 + 32 + 11 | revisit if a "very large hero typography" preset is added — 56 + 80 are the natural marketing-page steps
- **Add 80 to size scale (extend for heading.2xl)** | dropped because n=10 only, all hero-heavy brands (Apple, BMW, Lamborghini) | revisit for "marketing/luxury" archetype preset
- **Drop 20/28/36 from scale** (unused by v1 aliases) | kept as reserved palette stops | revisit when downstream components need them — already in scale, just no v1 alias points there yet

#### Variants

- **Keep all thin buckets (n<5)** | dropped uniformly to avoid one-system quirks shaping starter | revisit if user reports needing `link.lg`, `nav.lg`, `card.lg` etc.
- **Keep borderline buckets only (button.lg n=4, link.sm n=5)** | dropped same as the thin-bucket rule | revisit if button.lg use case emerges from real apps using starter
- **link as multi-variant (sm/md)** | collapsed to single because both bucketed at 14px | revisit if link sizing varies in real apps; data could be collected from starter telemetry

#### Weight

- **All-400 heading (elegant Stripe/Linear style)** | rejected — chose inverse weight curve | revisit as `headingStyle: "flat"` knob (already shipped as alternative)
- **Forward weight curve (xl=700, xs=500)** | rejected — chose inverse | revisit as `headingStyle: "bold"` knob (already shipped)
- **All-700 heading (traditional print)** | rejected | revisit as marketing/editorial preset
- **weightVariant alias layer (semibold/bold/light/medium named tokens)** | rejected because raw 4-stop scale [400,500,600,700] suffices | revisit if a typed weight API is requested for designer ergonomics

#### Line-height

- **7-stop scale (add 1.6 for body.lg)** | rejected — 6-stop sufficient | revisit for very long-form reading apps (blog/news)
- **Bespoke per-token line-height (no scale)** | rejected — scale is cleaner | revisit only if a design system reaches >100 typography tokens

#### Letter-spacing

- **All buckets at 0em (data-mode purist)** | rejected — chose -0.02 for heading.xl/.lg + 0.05 for badge | revisit if a "neutral / no opinion" preset is shipped
- **xl-only negative tracking, lg=0** | rejected — both xl and lg get -0.02 | revisit if 48px headings in real usage feel over-tightened
- **badge=0em** | rejected — chose 0.05em (uppercase tracking) | revisit only if badges go non-uppercase by default

#### Font family

- **2-slot architecture (sans + mono only)** | rejected in favor of 3-slot with serif as override-only | revisit if serif use cases never materialize (could be 2-slot in a leaner v2)
- **3-slot with serif as full first-class default** | rejected — serif stays opt-in via category override | revisit if "editorial" preset is added with serif heading default
- **Pretendard primary (Korean-first ordering)** | rejected — Latin (Inter) primary, Pretendard secondary in chain | revisit if a "Korean market" preset is shipped — the chain reorder is a 1-line change

### 4.3 Capture method

When using this playbook for a new category, append a new §4.X subsection per category with the same structure: each rejected option, why-rejected, when-to-revisit. Future product work mines this section for backlog ideas.

## 5. Re-runnability checklist

When a fresh agent session picks up category #N from this playbook:

1. **Read MEMORY.md** — see which categories are done, where their proposals live
2. **Read this playbook** — internalize the 8-phase flow and decision-point pattern
3. **Read the most recent category's proposal** (e.g. `type-category-proposal.md`) — concrete shape of expected output
4. **Read the most recent category's track docs** — concrete shape of mid-flow analyst documents
5. **Skim `scripts/analysis/<recent-category>/`** — the extraction code patterns
6. **Skim `src/schema/<recent-category>.ts` + `src/generator/<recent-category>-category.ts`** — encoding patterns
7. **Confirm with user before starting Phase A** — ask "starting category analysis for <category>; you want the same flow as color/typography?" — gate on yes

The playbook + memory should give the new session enough context that this confirmation is the only gate before Phase A starts.

## 6. Next category candidates

Listed in roughly suggested order (fastest payoff first). Each has its corpus parsing pre-existing or trivially derived from `data/raw/`:

1. **Spacing & layout** — section spacing, component spacing, gutters, max-widths. Currently archetype-driven (`sectionSpacing`, `componentSpacing` fields). Likely 5-7 stops on a base-4 scale; per-category aliases (heading-margin, paragraph-gap, list-item-gap)
2. **Border radius** — buttonRadius, cardRadius, inputRadius, pillRadius. Currently single value per archetype. Likely 4-5 stops; per-component aliases
3. **Elevation / shadow** — currently `shadowIntensity: whisper|subtle|medium|dramatic`. Likely 5 levels with per-mode (light/dark) tuning; multi-layer shadows for higher levels
4. **Component sizing** — button/input/card sm/md/lg dimensions. Tightly coupled to typography (font-size flows through). Best done after spacing because component sizes consume spacing tokens

Each follows Phases A–I. Estimate: A+B = 1 day analyst work, C–G = 0.5 day per axis, H = 2 hours, I = 4–6 hours code+tests = ~3-4 days per category for an experienced analyst+coder pair (or one agent session with this playbook).

## 7. Conventions

- **Branch naming:** `feat/<category>-category-system` or similar. Don't reuse the current `feat/mood-showcase` branch for new category work — start fresh from main
- **Commit prefixes:** `docs(<category>):` for research/track docs; `feat(<category>):` for code; `refactor(<category>):` for migrations; `test(<category>):` for test-only changes
- **TDD discipline:** Phase B onwards uses TDD strictly (test first → fail → implement → pass → commit). Phase A scripts can be exploratory but tests should follow before code is committed
- **One commit per logical unit:** parallel-able test+impl together (typography Tasks 1-7); never mix migration with new feature in one commit
- **Coauthor trailer:** every commit includes the model that did the work as `Co-Authored-By: Claude <Model> <noreply@anthropic.com>`. This is automatic if you use the standard heredoc pattern

## 8. Open questions for future categories

These came up during typography/color but didn't need resolution there. They will need answers when the relevant category lands:

- **Cross-category coupling:** if spacing analysis discovers section-spacing depends on heading-size (and it almost certainly does), does the spacing schema take a typography token reference, or does it just hardcode the px-equivalent? Color sidesteps this by being self-contained; spacing won't.
- **Responsive breakpoints:** typography v1 ships desktop-only profiles. When mobile profile shifting is added, is it a separate category (`responsive`) or a per-token `_mobile` field? Same question will hit spacing.
- **User-extensible categories:** if a user wants a 10th typography category (e.g. `pullquote`), do they fork the schema or is there a runtime extension API? Currently fork. Same will apply to spacing/etc.

These are good first questions to surface in Phase H of whichever category hits them first.
