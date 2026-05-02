# Color Analysis — Session Notes (2026-05-01)

_Context, discoveries, and rationale that emerged during the color category analysis session. Not a re-summary of the analysis reports — those have their own files. This doc captures what would otherwise be lost between sessions._

## 1. The pivot from mood archetypes

**Why mood was abandoned.**
Two prior approaches failed:
- **Pass 1 (clustering)** — Tried to derive 4–5 mood presets by clustering DESIGN.md systems on quantitative features (radius, weights, chroma offset). Verdict across three notebook passes (`docs/research/2026-04-30-archetype-*.md`, `2026-05-01-archetype-phase-c-lean.md`): `insufficient_signal`. Mood differences too subjective for inductive clustering.
- **Pass 2 (per-category clustering)** — Tried to cluster on per-category features (palette/typography/spacing). Each brand defined the same concept differently (accent=brand=primary=-800), so cross-system comparison was noisy.

**New direction (this session):**
- Drop "mood" entirely.
- Per-category inductive analysis. One category at a time.
- **Functional knobs**, not mood-flavored options ("토큰 갯수 적게/중간/많이", not "warm/soft").
- Categories should be standardized first by *role* (e.g. "what counts as `surface`?"), then analyzed for *cardinality* and *value distributions*.

This document covers the **color** category pilot only. typography/spacing/radius/elevation are future work using the same methodology.

## 2. Architecture discoveries

### 2.1 The corpus is already 3-tier — we didn't decide it, we discovered it

Initial framing treated 5 roles as peers (`accent` / `neutral` / `surface` / `text` / `semantic`). Pass 2 surfaced an anomaly: `neutral` only 19/58 systems vs others 35–58. This wasn't because systems lacked neutrals — they had them inlined under surface/text instead of breaking them out.

The right model is **layered**:
- **Tier 1 (base)**: neutral + accent — raw color palettes
- **Tier 2 (semantic)**: error/success/warning/info — independent hues
- **Tier 3 (alias)**: surface/text — derived references to Tier 1

Origin classification (Track S) confirmed this:
- surface 78% neutral-derived, 2% accent
- text 95% neutral-derived, 0% accent
- semantic 83% unique (NOT brand-derived)

The corpus rejected the "5 peer roles" framing on its own. Architecture is forced by data, not chosen.

### 2.2 Explicit vs implicit divergence is informative, not error

Track B (neutral baseline) found explicit-documented neutrals (n=19) had *narrower* L range and *fewer* stops than implicit reconstruction (n=37) from surface+text:

| metric | explicit | implicit |
|---|---|---|
| stop count median | 6 | 9 |
| L_min median | 0.31 | 0.17 |
| L_max median | 0.96 | 1.00 |
| L range median | 0.58 | 0.81 |

These are **answering different questions**:
- explicit = "the gray scale the system documents" (typically 6 stops, 100–800 mid-range)
- implicit = "every neutral the system actually emits across surface+text" (includes pure black text + pure white surface)

The starter should follow **implicit** because emitted tokens are what users consume. The explicit sample is academic.

### 2.3 Multi-hue accent (40%) often isn't really multi-brand

Track A flagged 30/58 systems as multi-hue. On inspection, most "secondary" clusters were *within the same family* (e.g. stripe: purple@278° + magenta@333° + blue@251° + red@11° — all in purple/blue zone). Genuinely cross-family secondaries (cohere blue + orange) are rarer. Rough estimate: 10–15 systems have a true secondary brand color, not 30. Detection threshold (15° hue) is too tight for this question.

This is why `accent.secondary` defaults `off` despite 30/58 raw signal.

## 3. Methodology decisions

### 3.1 Why item-level (B), not heading-level (A+)

Heading-level (5–7 group buckets) gave clean signal but lost the granularity needed for cardinality analysis (Track S). Item-level had bigger noise but the noise was where the signal lived (description keywords reveal sub-roles like `canvas`/`hairline`/`muted`). User accepted noise tradeoff explicitly.

### 3.2 Why 2-pass dictionary, not 1-pass with priors

Pass 1 (raw frequencies) → user inspects → user proposes mappings → Pass 2 normalized. The dictionary embodies the analyst's hypothesis about what counts as the same role. Building it from priors before seeing data biases the analysis. Building it from data forces the analyst to confront the actual vocabulary.

Result: 91% match rate, 0% unmatched, 9% intentionally excluded. 83 unique heading strings collapsed to 5 standard roles + 16 explicit excludes.

### 3.3 Why split knobs (6) after initially bundling (3)

Initial draft bundled `neutral.stops` / `aliases.cardinality` / `semantic.depth` into a single `density` knob, citing co-varying corpus IQRs. User pushed back: tiers are *structurally independent*, IQR co-variation is statistical not architectural, bundling forces user to fork generator for asymmetric preferences.

Lesson: don't infer knob coupling from statistical correlation alone. Check architectural independence first.

## 4. Negative findings

These are the things the corpus *rejected*:

- **0/56 systems** use warm-tinted neutrals (yellow-orange grays). Tint options are achromatic / cool / green / purple — no warm.
- **0% of `text` rows** are accent-derived. Brand-colored text is essentially absent in the corpus. Link colors live in `semantic` or as separate aliases, not in text.
- **2% of `surface` rows** are accent-derived. Brand-tinted surfaces are rare; cohere/claude signature surfaces are the exception, not the norm.
- **`Functional` heading** appears only in voltagent. Excluded as system-specific noise.
- Mood-based clustering — verdict from three prior notebook passes: `insufficient_signal`.

## 5. Numerical thresholds and their rationale

| threshold | value | used in | why |
|---|---|---|---|
| Implicit neutral chroma max | 0.025 | Track B | Empirical: pure achromatic is C=0; subtle warm/cool tints stop around 0.02–0.03; 0.025 captures tinted grays without bleeding into accents. |
| Accent chroma minimum | 0.05 | Track S origin classifier | Below 0.05 a hex carries no meaningful hue; classify by chroma threshold (neutral) instead of trying to match accent. |
| Hue cluster tolerance | ±15° | Track A multi-hue detection | Tight enough that purple@270 and magenta@330 don't merge; loose enough that hover/active variants of the same hue stay together. |
| Accent hue tolerance | ±20° | Track S origin classifier | Slightly looser than cluster tolerance because variants like brand-300 (lighter) drift in hue. |
| `info` semantic hue | ~230° | Tier 2 fixed defaults | Modal blue family in corpus when info is documented; overlaps with blue brands ~26% of the time, accepted. |
| Neutral L floor | 0.10 | Tier 1 default | Corpus implicit goes to 0.00 (pure black) but pure black text on white is harsh. Lift to 0.10 for default contrast quality. |

## 6. Caveats about the corpus

- **Template bias**: the surprising consistency of item labels (`canvas` 13×, `body` 14×, `muted` 13×, `hairline` 14×) likely reflects a shared template/style guide used to author the awesome-design-md DESIGN.md files, not natural cross-industry vocabulary convergence. The numbers are still useful for picking starter token names, but treat them as "valid prior", not "ground truth".
- **Tech-heavy skew**: corpus is SaaS/dev-tool dominated (vercel, linear, supabase, etc.). Purple+blue accents = 60%; warm grays = 0/56. A consumer/retail/automotive starter would have different priors.
- **Markdown-as-data limits**: hex extraction is best-effort. ~16% of `surface` rows are `no_color` (referenced via name, not hex). Description keyword extraction strips down to first 1–3 tokens, which loses nuance.
- **Multi-hue detection is noisy**: 30/58 multi-hue is an over-count; tighter same-family folding would drop this to 10–15.

## 7. File map (what to read for what)

### Source data
- `data/raw/*.md` — 58 system DESIGN.md files
- `data/extracted.json` — pre-existing feature extraction (used by other notebooks; **NOT** used by this color analysis)

### Code (all under `scripts/analysis/color-roles/`)
| file | purpose |
|---|---|
| `types.ts` | `ColorItemRow`, `SystemResult`, `FrequencyEntry` |
| `extract-items.ts` | per-bullet parser; section walker |
| `keywords.ts` | description → first N non-stopword tokens |
| `css-var.ts` | `--ds-*` extraction + last-segment helper |
| `frequency.ts` | tally helpers (3 axes) |
| `dictionary.ts` | `RoleDictionary` validator + classifier (Pass 2) |
| `neutral-baseline.ts` | Track B: explicit + implicit neutral profiling |
| `accent-baseline.ts` | Track A: hue clustering, circular mean, family classification |
| `semantic-layer.ts` | Track S: origin classifier (neutral/accent/unique), per-role stats |
| `render-{raw,normalized,neutral-baseline,accent-baseline,semantic-layer}.ts` | markdown report renderers |

Entry: `scripts/analysis/color-roles.ts`. CLI: `pnpm color-roles --pass={raw|normalized|neutral-baseline|accent-baseline|semantic-layer}`.

### Tests (under `tests/analysis/color-roles*.test.ts`)
377 tests total. extract-items, keywords, css-var, frequency, dictionary, neutral-baseline, accent-baseline, semantic-layer all covered.

### Output artifacts (under `docs/research/`)
| file | content | role |
|---|---|---|
| `color-roles-raw.md` | Pass 1: 3-axis raw frequencies + sample rows | analytical |
| `color-roles-raw.csv` | Per-bullet row dump | analytical (full data) |
| `color-role-dictionary.json` | Mapping 83 raw headings → 5 standard roles + 16 excludes | hand-authored input |
| `color-roles-normalized.md` | Pass 2: matched/excluded/unmatched + role frequencies | analytical |
| `neutral-baseline.md` | Track B: explicit + implicit neutral profiles | analytical |
| `accent-baseline.md` | Track A: hue distribution + per-system profiles | analytical |
| `semantic-layer.md` | Track S: origin classification + cardinality + sub-role labels | analytical |
| `color-category-proposal.md` | **The starter v1 spec.** All decisions captured. | **design spec** |
| `color-analysis-notes.md` | This file — session context | meta |

### Existing code (relevant when implementing)
- `src/schema/types.ts` — current token types (mood-based)
- `src/schema/archetypes.ts` — current 5-mood presets (to be deprecated)
- `src/schema/template.ts` — DESIGN.md output template
- `src/generator/color.ts`, `tokens.ts`, `index.ts` — current token generation pipeline
- `src/cli/index.ts` — current 4-input CLI flow
- `tests/schema/`, `tests/generator/` — existing test surface (will need refactor)

## 8. Open items not addressed in this session

- typography / spacing / radius / elevation categories (same methodology, future sessions)
- Generator/CLI rewrite to consume the new knobs
- DESIGN.md output template adaptation for 3-tier structure
- Figma transformer (`src/figma/`) updates for new token shape
- Web app (`web/`) UX for 6 knobs + brand color input

## 9. Memory pointers

- Auto-memory file `project_archetype_revalidation.md` is from before this session and references the old mood approach. Update or supersede with a new memory entry capturing this session's pivot.
