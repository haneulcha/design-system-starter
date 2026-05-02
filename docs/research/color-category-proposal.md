# Starter Color Category — Proposal v1

_Synthesized from `color-roles-raw.md`, `color-role-dictionary.json`, `color-roles-normalized.md`, `neutral-baseline.md`, `accent-baseline.md`, `semantic-layer.md`. Numbers in parentheses are corpus medians from those reports._

## 1. Token architecture (3 tiers)

```
Tier 1 — Base palettes        neutral scale + accent scale
Tier 2 — Semantic palette     error / success / warning / info  (independent hues)
Tier 3 — Role aliases         surface.* / text.*                (reference Tier 1)
```

Evidence: surface 78% / text 95% of values trace to neutral; semantic 83% are unique chromatic; accent has near-zero overlap with surface/text. Three layers are not an architectural opinion — the corpus is already structured this way.

## 2. Tier 1 — Base palettes

**`neutral` scale**
- Stops: **9** at `standard` (corpus implicit median 9; explicit 6 covers narrow middle only — implicit reflects what systems actually emit)
- L range: **0.10 → 1.00** (floor lifted from corpus 0.00 — pure black is too harsh for text-on-light defaults)
- Chroma: **0** by default (38% of corpus is purely achromatic, 0/56 are warm-tinted)
- Tint knob: `achromatic` (default) | `cool` | `green` | `purple` — **no warm** (corpus rejects it)

**`accent` scale**
- Stops: **5** (corpus median total accent stops; covers base + hover + active + disabled + on-color)
- L spread: **±0.18 around user-input L** (corpus median primary-hue L_min 0.51, L_max 0.67 — narrow range, anchored)
- Chroma: preserve user input chroma (corpus median 0.213 — strongly saturated; not amplifying or muting)
- Hue: derived from user hex
- Single-hue default; secondary accent off by default

## 3. Tier 2 — Semantic palette

Fixed defaults (independent of user brand hue, per corpus 83% unique):

| token | hue family | suggested h | priority | rationale |
|---|---|---|---|---|
| `error` | red | ~20° | core | universal validation/destructive |
| `success` | green | ~150° | core | universal confirmation |
| `warning` | yellow/orange | ~70° | core | universal attention |
| `info` | blue | ~230° | optional | informational; emitted from `standard` upward |

`info` overlaps with blue-family brand colors when present (~26% of corpus). **Overlap is accepted** — `info` is lower priority than the other three semantics and a brand-blue project simply has visual overlap between brand and info.

Cardinality controlled by `semantic.depth` knob (see §5).

## 4. Tier 3 — Role aliases

**`surface` — 5 tokens** (corpus median 5)

| token | maps to | corpus label hits |
|---|---|---|
| `surface.canvas` | neutral.50 (lightest) | "canvas" 13× |
| `surface.soft` | neutral.100 | "surface soft" 8× |
| `surface.strong` | neutral.200 | "surface strong" 10× |
| `surface.card` | neutral.50 | "surface card" 10× (often = canvas) |
| `surface.hairline` | neutral.300 | "hairline" 14× — most common label in corpus |

**`text` — 6 tokens** (corpus median 6)

| token | maps to | corpus label hits |
|---|---|---|
| `text.ink` | neutral.900 (darkest) | "ink" 13× |
| `text.body` | neutral.800 | "body" 14× — most common |
| `text.body-strong` | neutral.900 | "body strong" 10× |
| `text.muted` | neutral.600 | "muted" 13× |
| `text.muted-soft` | neutral.500 | "muted soft" 12× |
| `text.on-primary` | accent contrast (white or near-white) | "on primary" 9× |

## 5. Functional knobs

Six knobs total, all independent. All have defaults — minimum required user input is still just `brand_color`.

| knob | options | default | affects |
|---|---|---|---|
| `neutral.stops` | `few` (5) / `standard` (9) / `rich` (11) | `standard` | Tier 1 neutral palette depth |
| `neutral.tint` | `achromatic` / `cool` / `green` / `purple` | `achromatic` | Tier 1 neutral chroma & hue |
| `accent.stops` | `few` (4) / `standard` (5) / `rich` (8) | `standard` | Tier 1 accent palette depth |
| `accent.secondary` | `off` / `on` | `off` | adds a second accent hue (requires second hex when `on`) |
| `semantic.depth` | `minimal` (3 × bg = 3 tokens, no `info`) / `standard` (4 × {bg,text} = 8) / `rich` (4 × {bg,text,border} = 12) | `standard` | Tier 2 variant count per semantic role + whether `info` is included |
| `aliases.cardinality` | `few` (surface 3 / text 4) / `standard` (surface 5 / text 6) / `rich` (surface 8 / text 7) | `standard` | Tier 3 alias count for surface and text |

Why these six: each axis is structurally independent in the architecture (a tier doesn't dictate cardinality of a referencing tier; semantic palette doesn't depend on neutral; accent independence holds). Bundling would be a UX choice, not a structural one — and would force users wanting asymmetry (e.g. rich neutrals + minimal semantic) to fork the generator.

`surface` and `text` are intentionally bundled into one `aliases.cardinality` knob since they share the same conceptual axis ("how opinionated should role aliases be"). Split if user friction emerges.

## 6. User input

**Required (1):**
- `brand_color: hex` — anchors the entire accent scale + drives `text.on-primary`

**Optional:** the 6 knobs in §5, all with defaults. When `accent.secondary=on`, a second `brand_color_secondary: hex` is required.

Replaces the current `(brandName, primaryColor, mood, font)` flow for the color portion. `brandName` and `font` belong to separate categories.

## 7. Output

Total emitted tokens at all defaults (`neutral.stops=standard, neutral.tint=achromatic, accent.stops=standard, accent.secondary=off, semantic.depth=standard, aliases.cardinality=standard`):

| tier | count | source |
|---|---:|---|
| neutral scale | 9 | base |
| accent scale | 5 | base |
| semantic palette | 8 | fixed (4 roles × 2 variants) |
| surface aliases | 5 | references neutral |
| text aliases | 6 | references neutral + accent |
| **total** | **33** | |

This is the starter v1 baseline — minimal, defensible against the 58-system corpus, single required input.

---

## Decisions captured (2026-05-01)

1. ✅ Knob granularity: **split into 6 independent knobs** (not bundled). Tiers are structurally independent in the architecture, so the UX should reflect that.
2. ✅ `info` ↔ blue brand overlap: **accept overlap**. `info` is lower-priority than error/success/warning and is omitted entirely at `semantic.depth=minimal`.
3. ✅ `accent.secondary` default `off`. Always exposed as a knob — user can flip on; UX must support adding the secondary hex without friction.
4. ✅ Neutral L floor lifted to **0.10**. Pure black (corpus 0.00) is too harsh for default text-on-light contrast.
