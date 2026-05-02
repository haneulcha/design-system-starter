# Starter Border Radius Category — Proposal v1

_Synthesized from a corpus survey across all 58 design systems in `data/raw/`. Like spacing, radius converged cleanly enough on a small set of canonical values that the proposal is built directly from the inline survey rather than full per-axis track docs. The track-level analysis is preserved below in §§2–4._

## 1. Token architecture (2 tiers)

```
Tier 1 — Scale + Special   8-stop px scale [0, 2, 4, 6, 8, 12, 16, 24]
                           + 2 non-numeric: pill="9999px", circle="50%"
Tier 2 — Named tokens      none / subtle / button / input / card / large / pill / circle
```

Spacing is 2-tier with no per-component layer (component-padding decisions belong to components category). Radius is also 2-tier — but unlike spacing, the per-component values (`button`, `input`, `card`) ARE the tokens themselves, because radius is the rare design dimension where per-component decisions are universal across designers' mental model. Asking a designer "what's your card radius?" gets a number; asking "what's your spacing.lg?" gets a question back.

Knob effect: the `style` knob shifts the values of `button` / `input` / `card`. The other 5 tokens (none, subtle, large, pill, circle) are constant.

## 2. Tier 1 — Scale + Special

**`SCALE` (8 stops, px)**

```
[0, 2, 4, 6, 8, 12, 16, 24]
```

- Cap at 24 — corpus mode for "largest container" radius. Outliers like 32px (Airbnb category strips), 40px (Framer pill alternative), 50px (Figma pill) are dropped per the playbook §3 outlier rule. The `pill` special handles the very-large case.
- 2 stops (`2`, `6`) are reserved palette values — not consumed by Tier 2 tokens at any style. Kept in scale because:
  - `2` — Linear and NVIDIA hairline-style elements
  - `6` — Hashicorp/PostHog mid-sharp value, common as an in-between

**Per-stop corpus signal:**

| stop | n (declared) | role |
|---:|---:|---|
| 0 | 18 | "sharp / rectangular" elements (BMW, Lamborghini, IBM, Stripe nav) — `none` token |
| 2 | 4 | hairline-precise (Linear, NVIDIA) — reserved |
| 4 | 18 | sharp-style buttons (Hashicorp, Intercom, Stripe, IBM, Linear) — `subtle` token + `style: sharp` |
| 6 | 6 | mid-sharp (Hashicorp, PostHog, Lovable) — reserved |
| 8 | 25+ | canonical button/input radius — `style: standard` |
| 12 | 18+ | canonical card radius — `style: standard` |
| 16 | 7+ | hero/feature container — `style: generous` |
| 24 | 5+ | largest container, also Mintlify featured cards — `large` token + `style: generous` card |

**`SPECIAL` (2 non-numeric values)**

```
pill   = "9999px"
circle = "50%"
```

Both are universal across the corpus — every system that has badges uses pill or near-pill (40–9999px); every system with avatars uses 50%. They are NOT scale stops because they are not interpolatable values; they are semantic constants.

## 3. Tier 2 — Named tokens

| token | default value (style: standard) | varies by knob? | corpus role |
|---|---:|---|---|
| `none` | `0px` | no | sharp-edged elements (body grid, full-bleed sections) |
| `subtle` | `4px` | no | small interactive elements (focus rings, mini chips) |
| `button` | `8px` | **yes** | the primary CTA radius |
| `input` | `8px` | **yes** | form fields |
| `card` | `12px` | **yes** | content containers |
| `large` | `24px` | no | large hero/feature containers |
| `pill` | `"9999px"` | no | badges, tags, pill CTAs |
| `circle` | `"50%"` | no | avatars, icon buttons |

Total: **8 tokens**, of which 3 (`button`, `input`, `card`) shift with the `style` knob.

## 4. Patterns embedded in defaults

Three patterns shape the table above. Each is a deliberate starter opinion grounded in corpus convergence:

1. **Button = input radius** — both default to the same value (8px standard). Corpus shows ~85% of systems pair them; mismatched button/input radius is a deliberate brand choice (e.g., Airbnb: 8px button + pill search input) and stays available via per-token override, not a default.
2. **Card > button** — card radius is always one stop higher than button (8→12, 4→8, 12→16). Corpus mode: card radius is "softer" than button radius across every archetype except sharp-rectangular brands (BMW: 0/0).
3. **Hero/feature uses `large`** — the `large=24px` token is kept fixed across all styles because hero/feature containers maintain visual weight regardless of the brand's button radius style. Corpus mode: 16–24px for the largest container, even in sharp-style systems.

## 5. Functional knobs

One knob in v1.

| knob | options | default | affects |
|---|---|---|---|
| `style` | `sharp` / `standard` / `generous` / `pill` | `standard` | `button`, `input`, `card` token values |

**Style → token-value mapping:**

| style | button | input | card | tone |
|---|---:|---:|---:|---|
| `sharp` | 4 | 4 | 8 | precision/engineering (Hashicorp, IBM, Intercom, Linear, Stripe) |
| `standard` (default) | 8 | 8 | 12 | modern SaaS (Cal, Claude, Clickhouse, Mintlify, Lovable) |
| `generous` | 12 | 8 | 16 | warm/playful (Clay, Mintlify cards, Airbnb-soft) |
| `pill` | `"9999px"` | `"9999px"` | 12 | brand-pill systems (Apple, Airbnb search, Figma) |

**Why only one knob:**

- **`baseUnit` knob (4 vs 8)**: rejected — radius is corpus-empirical, not base-driven. 6 (a non-4-multiple) appears in 6+ systems as a deliberate "sharp-but-friendly" mid-step.
- **Per-component knobs (`buttonStyle`, `cardStyle` independently)**: rejected — corpus shows button/card move together as an archetype signal. Decoupling them creates a 4×4=16-mode space with no corpus support for most cells.
- **`scaleVariant` (extended with 32/40/50)**: deferred to v2 — the 50px "Figma pill alternative" is n=1; 32px is n=1 (Airbnb category strip). Not enough signal for a knob.

Per-token overrides (e.g., `tokens.button = 16`) are always possible via direct schema edit.

## 6. User input

**Required (0):** all defaults work standalone.

**Optional:**
- `style: "sharp" | "standard" | "generous" | "pill"` — affects `button`/`input`/`card`

## 7. Output

At all defaults: 8 named tokens emitted, drawn from a 8-stop scale + 2 special values.

| tier | count | source |
|---|---:|---|
| Scale | 8 | base |
| Special | 2 | base |
| **Tier 1 total** | **10** | |
| Named tokens | 8 | category |
| **Tier 2 total** | **8** | |
| **Grand total tokens** | **18** | |

For comparison: spacing emits 20 (12 scale + 8 aliases); radius is leaner because the special values double as named tokens.

## 8. Special handling

- **Numeric vs string token values** — `button`/`input`/`card`/`none`/`subtle`/`large` are emitted as numeric px values; `pill` and `circle` are emitted as strings (`"9999px"`, `"50%"`). Downstream consumers (tokens.ts, template.ts) must accept both.
- **Per-token overrides** — the `style` knob is for the common archetype split. Brand-distinctive cases (Airbnb's 8px button + pill search input, Apple's pill button + 18px utility-card) are not knob-reachable; they require per-token override at the schema-edit level. The radius proposal explicitly does NOT try to encode every brand's signature mix.
- **`circle` is structural, not aesthetic** — every archetype uses 50% for avatars and icon buttons. The token exists to give downstream components a stable name; no knob ever moves it.

## 9. Out of scope

- **Per-corner radius** — corpus has near-zero declarations of asymmetric radii (e.g., `border-radius: 8px 0 0 8px`). Per-corner control is a per-component CSS concern, not a token concern.
- **Responsive radius shifts** — corpus signal zero. Radius is mode-invariant.
- **Animated radius transitions** — motion concern, separate track.
- **Unit-flexible tokens (e.g., `0.5rem`)** — corpus is uniformly px-based. Em/rem/% support is a downstream convention, not a token-level decision.

## 10. Sequencing for code emission

Encode in this order under `src/schema/radius.ts` and `src/generator/radius-category.ts`:

1. **Scale + Special** — `SCALE` constant (8 px values), `SPECIAL` constant (`pill`, `circle`)
2. **Style profiles** — `STYLE_PROFILES` constant: `Record<RadiusStyle, { button, input, card }>` mapping each style mode to the variable token values
3. **Knob types** — `RadiusStyle`, `RadiusInput`, `RadiusKnobs`, `DEFAULT_RADIUS_KNOBS`, `RADIUS_STYLE_OPTIONS`
4. **Generator** — `generateRadiusCategory(input)` → `RadiusCategoryTokens` (`{ scale, special, tokens, knobs }`)
5. **Helpers** — `resolveKnobs`, `resolveStyleProfile`, `countEmittedTokens`
6. **Pipeline integration** — wire into `src/generator/index.ts`; extend `UserInputs` with `radiusKnobs`; add `radiusTokens` to `DesignSystem`
7. **Layout adapter** — update `src/generator/layout.ts` to derive `LayoutSystem.borderRadius` from `radiusTokens` (preserves the `LayoutSystem` shape used by the markdown template), and stop reading `archetype.buttonRadius` / `inputRadius` / `cardRadius` / `pillRadius`
8. **Tokens emitter** — update `src/generator/tokens.ts` to read from `system.radiusTokens.tokens` for clean numeric/string emission
9. **Legacy cleanup** — remove `buttonRadius`, `inputRadius`, `cardRadius`, `pillRadius` fields from `ArchetypePreset` (in `types.ts` and `archetypes.ts`). The 5 archetype copy strings referencing specific px values (e.g., "6px button radius for restrained, near-rectangular geometry") become static text now that the value is no longer mood-dependent.

Mirrors the spacing category encoding pattern from `src/schema/spacing.ts` and `src/generator/spacing-category.ts`.

## 11. Rejected alternatives — preserved design space

Per playbook §4, every option considered and rejected during this proposal is recorded here as a v2 backlog candidate.

### Architecture

- **3-tier (scale / aliases / per-component)** | rejected — collapses cleanly to 2-tier because the named tokens ARE per-component (button, card, etc.). Adding a middle "alias" tier (`sm`, `md`, `lg`) would create indirection without value | revisit if a future v2 wants to share radius aliases across non-component contexts (e.g., `radius.sm` as a primitive used by both buttons and a custom container)
- **No per-component tokens (only `sm/md/lg`)** | rejected — corpus universally names tokens by component intent (`button`, `card`, `pill`); designers don't think in t-shirt sizes for radius the way they do for spacing | revisit if components category absorbs all per-component decisions
- **Single flat list (no tiers)** | rejected — losing the `SCALE` constant means raw-token escape is harder for power users | revisit only if v1 telemetry shows zero raw-token usage

### Scale shape

- **Drop `2` and `6`** | rejected — both have n≥4 corpus signal as deliberate stops | revisit if reserved-stop budget is constrained
- **Add `10` to scale** | rejected — n=5 (Airtable, Apple utility, Stripe panels) but always functions as an "almost 8 / almost 12" alternative. Splitting between md(8) and lg(12) creates noise | revisit if a fifth `style: "soft-medium"` mode is added
- **Add `18` and `20` to scale** | rejected — n<3 each, all brand-extreme | revisit for marketing/luxury preset
- **Add `32` (Airbnb category strips, 9999px alternative)** | rejected — n=1 verbatim; the `pill` special handles the very-large case better | revisit if a "soft-ultra" style mode is added
- **Add `40` (Framer pill alternative)** | rejected — n=1; pill suffices | revisit only as a Framer-faithful preset
- **Add `50` (Figma pill notation)** | rejected — n=1; Figma uses 50px because `border-radius: 50px` on a 32px-tall element renders as a perfect pill, but `9999px` is the more portable convention | revisit if Figma-faithful preset is added
- **Express `pill` as `100%`** | rejected — `9999px` is more universally supported across CSS engines and embedded contexts | revisit if a pure-CSS-spec preset is added

### Knobs

- **Per-component independent knobs (`buttonStyle`, `cardStyle`)** | rejected — corpus shows button + card move together. Decoupling creates a 16-mode space with no signal for most cells | revisit if real telemetry shows users mixing styles per-component
- **`baseUnit: 2 | 4` knob** | rejected — radius is empirical, not base-driven. The scale stops `[0, 2, 4, 6, 8, 12, 16, 24]` mix 2-multiples and 4-multiples by design | revisit only if a strict-grid preset is needed
- **`style: "ultra-sharp"` mode (button=2, card=4)** | rejected — n=2 (NVIDIA, Linear hairline). The `sharp` mode with button=4 already covers this | revisit if a hardware/industrial preset is added
- **`style: "ultra-generous"` mode (button=16, card=24)** | rejected — corpus n=3 (Clay hero cards, Kraken, Mintlify featured) — borderline signal | revisit when shipping a marketing/brand-extreme preset
- **`shadowAware` knob (radius adjusts to shadow intensity)** | rejected — radius and elevation are independent in 95%+ of corpus | revisit if elevation category lands first and reveals a coupling

### Per-token overrides

- **Asymmetric `border-radius` (per-corner)** | rejected — out of scope (§9) | revisit only on direct user request
- **Different `button` radius for primary vs secondary** | rejected — corpus pairs them universally | revisit if components category encodes per-variant radius

### Capture method note

When future radius tweaks are made (e.g., adding a `soft-medium` style or splitting `card` into `card.compact / card.hero`), append a new entry here with the same structure.
