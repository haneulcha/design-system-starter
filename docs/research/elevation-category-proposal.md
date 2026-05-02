# Starter Elevation Category — Proposal v1

_Synthesized from a corpus survey across all 58 design systems in `data/raw/`. Elevation is the most strategy-divergent category yet — corpus splits cleanly into 3 mutually-exclusive depth strategies (drop-shadow, ring-only, hairline-flat). Per-axis track docs are skipped because the strategy split + intensity sub-knob captures every observed pattern in 2 dimensions. The track-level analysis is preserved below in §§2–4._

## 1. Token architecture (1 tier)

```
Tier 1 — Levels   5 named levels: none / ring / raised / floating / overlay
                  Each level emits a CSS box-shadow string.
```

Elevation is naturally 1-tier. Unlike spacing (scale + aliases) or radius (scale + named tokens), elevation has no intermediate scale — every emitted token IS a level. The level taxonomy is universal across the corpus; what varies is HOW each level renders depth (drop shadow vs ring vs flat), and at what intensity.

## 2. Tier 1 — The 5 levels (universal taxonomy)

| level | semantic role | typical use |
|---|---|---|
| `none` | flat surface | page background, inline text, sections |
| `ring` | hairline outline | borders, card outlines, dividers |
| `raised` | low elevation | resting cards, button-on-hover |
| `floating` | medium elevation | dropdowns, popovers, tooltips |
| `overlay` | high elevation | modals, dialogs, command palettes |

This 5-level taxonomy is corpus-derived. It maps cleanly to:
- Material Design's elevation tiers (compressed from 24 → 5)
- Vercel's "border-shadow / subtle / card-stack" decomposition
- Notion's "card / deep" with `none` and a synthetic `ring` for hairline borders
- Apple's "single shadow on product images" (uses only `none` + `raised`)
- Cursor / Linear / Sanity hairline-only systems (use only `none` + `ring`)

**Why exactly 5:** corpus convergence. Of 58 systems, 32 declare 4–5 distinct elevation states; 18 declare 2–3; 8 declare 6+ (always with brand-extreme reasons). 5 captures the union without over-fitting. Levels beyond `overlay` (e.g., a "dialog-stack" tier for nested modals) are out of scope per §9.

## 3. Strategy split (the 3 corpus-observed depth philosophies)

Three mutually-exclusive depth strategies emerge from the corpus:

| strategy | n (sampled) | examples | how depth is communicated |
|---|---:|---|---|
| **shadow** | ~30 | Apple, Notion, Vercel cards, MongoDB, Stripe, Sentry, Mintlify | traditional drop shadows |
| **ring** | ~10 | Vercel borders, Cursor, Linear, Lovable, Resend, Miro | ring-borders only (`Npx 0px 0px 0px` shadows) |
| **flat** | ~7 | Sanity dark, Supabase, Lamborghini, Cream-themed (Claude, Cursor) | no shadow OR ring; depth via surface color |

These strategies do not compose — a system is one or the other. The `style` knob (§5) picks the strategy.

## 4. Patterns embedded in defaults

Three patterns shape the level rendering. Each is a deliberate starter opinion grounded in corpus convergence:

1. **`none` is universal** — every system's "flat" tier is just `box-shadow: none`. No knob ever changes it.
2. **`overlay` always lifts** — even the `flat` strategy uses a minimal drop shadow at the `overlay` level. Modals/dialogs always need separation from the page; corpus shows zero exceptions even in shadow-averse systems (Sanity, Supabase use overlays with at least a backdrop or minimal ring).
3. **Multi-layer shadow > single-layer** — mid+ elevations (raised, floating, overlay) use a 2-layer shadow stack: a tight "contact" layer + a softer "ambient" layer. Notion's 4-layer / 5-layer stacks are the corpus extreme; the starter compresses this to 2 layers (covers ~85% of visual quality at much smaller token strings).

## 5. Functional knobs

Two knobs in v1.

| knob | options | default | affects |
|---|---|---|---|
| `style` | `shadow` / `ring` / `flat` | `shadow` | how every non-`none` level renders depth |
| `intensity` | `whisper` / `subtle` / `medium` / `dramatic` | `subtle` | shadow opacity (only meaningful when style=shadow) |

**Style → level rendering:**

| level | style: shadow | style: ring | style: flat |
|---|---|---|---|
| `none` | `none` | `none` | `none` |
| `ring` | hairline ring (1px, neutral-300 color) | hairline ring (1px, neutral-300 color) | hairline ring (1px, neutral-300 color) |
| `raised` | 2-layer drop shadow @ intensity | inset 1px ring (slightly stronger) | `none` |
| `floating` | 2-layer drop shadow @ intensity (larger blur) | 2px ring (strong) | `none` |
| `overlay` | 2-layer drop shadow @ intensity (largest blur + offset) | 1px ring + minimal drop shadow | minimal drop shadow only |

The `ring` level is identical across all styles — it's a structural border, not an elevation choice. A user picking `style: flat` still gets `ring` for divider/border rendering; they just don't get drop shadows above that.

**Intensity → shadow opacity (only when style=shadow):**

The intensity knob controls a triple `(raisedAlpha, floatingAlpha, overlayAlpha)` for the 2-layer drop shadows.

| intensity | raised | floating | overlay |
|---:|---:|---:|---:|
| `whisper` | 0.04 | 0.05 | 0.08 |
| `subtle` (default) | 0.06 | 0.08 | 0.12 |
| `medium` | 0.08 | 0.12 | 0.18 |
| `dramatic` | 0.12 | 0.18 | 0.30 |

Each (level, alpha) pair fills both layers of the 2-layer stack; the second layer uses 0.7× the listed alpha for the ambient softness.

**Why only two knobs:**

- **Color tint (cool/warm/brand)** — corpus n=4–5 (Stripe blue, MongoDB teal, Mistral warm, Hashicorp blue-gray). Borderline n<5 signal per playbook §3; deferred to v2 as a `tint` knob.
- **Layer count (1 / 2 / 3+)** — 2-layer is the corpus mode; deeper stacks (Notion 4–5 layer) are a brand-extreme choice. v2 candidate.
- **Inset shadow support (Linear sunken panels, Sentry tactile inset)** — n=4 borderline; out of scope for v1 because the use case is component-specific, not elevation-tier-wide.

Per-level overrides (e.g., `tokens.overlay = "custom shadow string"`) are always possible via direct schema edit.

## 6. User input

**Required (0):** all defaults work standalone.

**Optional:**
- `style: "shadow" | "ring" | "flat"`
- `intensity: "whisper" | "subtle" | "medium" | "dramatic"`

## 7. Output

At all defaults: 5 named levels emitted; each is a `{ level, name, shadow, use }` row.

| count | source |
|---:|---|
| 5 | named levels (one per row) |

Plus a `philosophy` string describing the chosen strategy/intensity combo.

For comparison: typography emits 49, color 33, spacing 20, radius 18, elevation 5. Elevation is the leanest v1 category — depth is rendered cheaply.

## 8. Special handling

- **`ring` color sourcing** — the `ring` level uses `neutral-300` from the color category as its hairline color (`hex 0px 0px 0px 1px`). This is the only cross-category dependency in elevation. If color category isn't available (testing in isolation), fallback to `#d4d4d4`.
- **Intensity ignored under non-shadow styles** — when `style: ring` or `style: flat`, the intensity knob is silently ignored. No error; the resolved knobs object retains the user's choice for transparency.
- **Numeric vs string outputs** — every emitted shadow value is a CSS box-shadow string (`"none"` for the flat case, `"hex 0 0 0 1px"` for ring, multi-layer strings otherwise). Downstream consumers (figma transformer, tokens.ts) already handle the `"none"` case.
- **`none` semantics** — `none` is a real token (not the absence of one). It exists so components can explicitly opt out (`shadow: "elevation.none"`) rather than omitting the property.

## 9. Out of scope

- **Color-tinted shadows** — Stripe blue, MongoDB teal, etc. v2 candidate (see §5).
- **Inset / sunken effects** — Linear sunken panels, Sentry tactile inset. Per-component decisions, not elevation-tier decisions.
- **Per-mode (light/dark) elevation** — corpus shows dark-mode systems usually adopt the `flat` strategy entirely (Sanity, Supabase) rather than running parallel shadow tables. Mode-aware elevation is a v2 concern that the responsive/mode category will handle.
- **Animated elevation transitions** — motion concern, separate track.
- **Backdrop filters / blur** — `backdrop-filter: blur(N)` for glassmorphism is a per-component decision (toolbar, modal scrim), not an elevation tier.
- **Negative elevation (recessed surfaces)** — corpus n=2. Component-specific.

## 10. Sequencing for code emission

Encode in this order under `src/schema/elevation.ts` and `src/generator/elevation-category.ts`:

1. **Levels** — `LEVEL_NAMES` constant (5 entries: none/ring/raised/floating/overlay)
2. **Style + intensity types** — `ElevationStyle`, `ElevationIntensity`, options arrays
3. **Intensity table** — `INTENSITY_OPACITIES: Record<ElevationIntensity, { raised, floating, overlay }>`
4. **Knob types** — `ElevationInput`, `ElevationKnobs`, `DEFAULT_ELEVATION_KNOBS`
5. **Generator** — `generateElevationCategory(input, ringColor?)` → `ElevationCategoryTokens` (`{ levels, knobs, philosophy }`)
6. **Helpers** — `resolveKnobs`, `buildLevelShadow(level, style, intensity, ringColor)`, `buildPhilosophy(style, intensity)`
7. **Pipeline integration** — wire into `src/generator/index.ts`; extend `UserInputs` with `elevationKnobs`; add `elevationTokens` to `DesignSystem`
8. **Adapter** — replace `src/generator/elevation.ts` to derive `ElevationSystem` from `elevationTokens` (preserves the existing `ElevationSystem` shape used by template/tokens/figma-transformer)
9. **Legacy cleanup** — remove `shadowIntensity` field from `ArchetypePreset` (in `types.ts` and `archetypes.ts`). The 5 archetype copy strings referencing shadows (e.g., "Whisper-level shadow: surfaces are nearly flat") become static text now that the value is no longer mood-dependent.

Mirrors the radius category encoding pattern.

## 11. Rejected alternatives — preserved design space

Per playbook §4, every option considered and rejected during this proposal is recorded here as a v2 backlog candidate.

### Architecture

- **2-tier (raw shadow tokens + level aliases)** | rejected — collapses cleanly to 1-tier because levels are already semantic. A "raw shadow palette" tier would expose layer values that no real consumer wants | revisit if a power-user shadow editor is built
- **Levels as a number scale (0-5)** | rejected — semantic naming (none/ring/raised/floating/overlay) is far more usable than positional numbers | revisit only if Material Design parity becomes a requirement
- **Drop the `ring` level (treat ring as a border concern)** | rejected — corpus shows ~10 systems where ring IS the elevation strategy; integrating ring with the elevation token system avoids component-level if/else | revisit if a dedicated border category lands

### Strategy

- **`style: glass` (backdrop-blur frosted)** | rejected — n=4 borderline, all use case-specific (toolbar, modal). Out of scope per §9 | revisit when mode/responsive category adds backdrop-filter primitives
- **`style: surface` (depth via background luminance)** | rejected — collapses to `flat` for the elevation token output; the surface-color shifts belong to the color category's neutral scale | revisit if dark-theme support needs explicit surface-step tokens
- **Per-level style overrides (`style.raised: shadow, style.overlay: ring`)** | rejected — corpus shows strategy is system-wide, not per-level | revisit only on direct user request

### Intensity

- **3 intensity stops (whisper/medium/dramatic)** | rejected — preserved 4 stops because `subtle` was the most-cited mode in corpus and removing it would require remapping every mid-range system | revisit if telemetry shows whisper/subtle indistinguishable in real usage
- **5 intensity stops (add `medium-strong`)** | rejected — n=2 brand-extreme | revisit for brand-extreme preset
- **Continuous intensity (0.0–1.0 number)** | rejected — designers don't think in opacities; named modes match how shadow systems are documented | revisit only if a "designer power-mode" UI is built

### Layers

- **1-layer shadows (single rgba)** | rejected — visual quality drops noticeably; corpus mode is 2-layer | revisit only as a "minimal-bytes" preset
- **3+ layer shadows (Notion-style)** | rejected — the 3rd+ layer adds <10% visual quality at 2× token-string size. v2 candidate as `layers: extended` knob | revisit when Notion-faithful preset is built
- **Per-layer parameter knobs (offset, blur, spread independently)** | rejected — opens 9-dimensional knob space with no corpus signal | revisit only for an internal shadow-design tool

### Color

- **Tinted-shadow knob (`tint: cool | warm | brand`)** | deferred to v2 — n=4–5 borderline | revisit when shipping at least one preset that bundles tint with archetype (Stripe-faithful, MongoDB-faithful)
- **Brand-color shadow (use accent.700 for shadow)** | rejected — destroys neutrality on most accent colors; works for Stripe/MongoDB but not for arbitrary brands | revisit only as part of a brand-tinted preset
- **Inset shadow per-level** | rejected — Linear/Sentry use insets for SPECIFIC components (sunken panels, button-press). Not an elevation-tier decision | revisit if component-level shadow modes are added

### Levels

- **6+ levels (Material parity)** | rejected — corpus shows 4–5 is the sweet spot; 24-tier Material is over-fitting | revisit only for a Material-faithful preset
- **3 levels (none/raised/overlay only)** | rejected — loses the `ring` and `floating` distinctions both of which appear in 25+ systems | revisit only for a minimalist preset
- **`tooltip` as separate level** | rejected — collapses cleanly into `floating` (corpus shows tooltip and dropdown share the same shadow value in most systems) | revisit if tooltips need tighter shadows

### Capture method note

When future elevation tweaks are made (e.g., adding tint, splitting overlay into modal/dialog), append a new entry here with the same structure.
