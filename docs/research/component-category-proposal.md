# Starter Component Category — Proposal v1

_Synthesized from a corpus survey across all 58 design systems in `data/raw/`. Components is a **consumer category** — every component spec is a structured alias over the existing token systems (spacing / radius / typography / elevation / color). The category contributes no scale of its own; what it contributes is the per-primitive `variants × states × sizes × modifiers` taxonomy and the cross-category alias rules that turn primitive tokens into ready-to-render component specs. Per-axis track docs are folded into §§3–4 because Phase B's normalized output (`docs/research/component-roles-normalized.md`) is the axis distribution data._

## 1. Token architecture (1 tier — alias only)

```
Tier 1 — Component specs   6 primitives × {variants, states, sizes}
                           Every leaf value is a token-ref string (e.g. "spacing.lg",
                           "radius.button", "typography.body", "elevation.raised").
                           Color is intentionally NOT alias-encoded here — color
                           bindings happen at render time so theming stays orthogonal.
```

There is no scale tier and no aliases-of-aliases tier. The component category is end-of-pipeline: it consumes tokens, never defines them. Every `componentTokens.button.sizes.md.height` resolves through `spacing.xxl`; every `componentTokens.card.radius` resolves through `radius.card`; every `componentTokens.button.sizes.md.fontSize` resolves through `typography.button`.

This deliberately keeps the layer thin. v0 had a `generateComponents(archetype)` that hardcoded spec values per mood; v1 collapses that to a `generateComponentCategory(input)` that picks variants and applies a small set of cross-category alias rules.

## 2. Scope — 6 primitives (user-selected from corpus frequency)

| primitive | corpus systems | corpus rows | shape of evidence |
|---|---:|---:|---|
| **buttons** | 58 / 58 | 212 | universal; primary>secondary>ghost=outline>text>icon; md sizing dominates 96% |
| **cards** | 56 / 58 | 147 | universal; default>filled>outlined>elevated; no states; md>lg |
| **inputs** | 46 / 58 | 58 | strong; text>search>textarea; default state dominant, focus appears in 9% |
| **badges** | 22 / 58 | 28 | moderate; subtle>solid; all sm; pill modifier in 50% |
| **tabs** | 17 / 58 | 31 | light; underline>pill>segmented; default vs active explicitly enumerated |
| **avatar** | 1 / 58 | 1 | thin — defaults from convention (circle, 5-stop sizes), not corpus |

Out-of-scope primitives (deferred): `divider` (corpus n=1, currently in legacy generator), `link` (corpus shows it lives in typography), `nav` (page-architecture chrome, not a primitive), `forms.checkbox/radio/select/datepicker` (a future `forms` category), `modal/tooltip/popover/dialog` (a future `overlay` category — these consume `elevation.overlay`).

## 3. Per-primitive specs (the variant/state/size taxonomy)

Each primitive declares `variants × states × sizes`. Modifier flags (pill, onDark) are not part of the spec matrix — they're knob-driven (§5) or render-time concerns.

### 3.1 buttons

| axis | values |
|---|---|
| variants | `primary` / `secondary` / `ghost` / `outline` / `text` / `icon` |
| states | `default` / `hover` / `active` / `disabled` / `focus` |
| sizes | `sm` / `md` (default) / `lg` |

**Per-size structural alias map** (every value is a token-ref string):

| size | height | paddingX | gap | fontSize | iconSize | radius |
|---|---|---|---|---|---|---|
| `sm` | `spacing.xl` (32px) | `spacing.sm` | `spacing.xxs` | `typography.caption-md` | `spacing.md` | `radius.button` |
| `md` | `spacing.xxl` (48px) | `spacing.md` | `spacing.xs` | `typography.button-md` | `spacing.md` | `radius.button` |
| `lg` | `spacing.xxl` (48px) | `spacing.lg` | `spacing.xs` | `typography.body-md` | `spacing.lg` | `radius.button` |

These mirror the legacy `generateComponents` map and match corpus mode height (40px for md ≈ `spacing.2xl` after density resolution). The `radius.button` ref is a single value across sizes per corpus convention — buttons share their radius across sizes within a system.

**Variant resolution** is structural (each variant is a {bg, text, border} color binding), not size-affecting. Defined at render time by the consumer; the spec only enumerates which variants exist.

**Dropped variants:** `tertiary` (n=3, borderline), `danger` (n=2, color-semantic — use `color.error` directly with the `primary` variant). Both archived in §11.

### 3.2 cards

| axis | values |
|---|---|
| variants | `default` / `outlined` / `elevated` / `filled` |
| states | _(none — cards don't hover)_ |
| sizes | `sm` / `md` (default) / `lg` |

**Per-size structural alias map:**

| size | radius | contentPadding | contentGap | shadow (when variant=elevated) | headerFont | bodyFont |
|---|---|---|---|---|---|---|
| `sm` | `radius.card` | `spacing.md` | `spacing.xs` | `elevation.raised` | `typography.card-md` | `typography.body-sm` |
| `md` | `radius.card` | `spacing.lg` | `spacing.sm` | `elevation.raised` | `typography.card-md` | `typography.body-md` |
| `lg` | `radius.card` | `spacing.xl` | `spacing.md` | `elevation.floating` | `typography.heading-md` | `typography.body-md` |

`lg` cards earn `elevation.floating` because hero/illustration cards in corpus run higher elevation. Other sizes use `elevation.raised` only when `variant=elevated`; `outlined` cards use `elevation.ring`; `default` and `filled` use `elevation.none`.

### 3.3 inputs

| axis | values |
|---|---|
| variants | `text` / `search` / `textarea` |
| states | `default` / `hover` / `focus` / `disabled` / `error` |
| sizes | `sm` / `md` (default) / `lg` |

**Per-size structural alias map** (height + paddingX + radius are size-driven; fonts are universal):

| size | height | paddingX | radius | labelFont | valueFont | helperFont |
|---|---|---|---|---|---|---|
| `sm` | `spacing.xl` (32px) | `spacing.sm` | `radius.input` | `typography.caption-md` | `typography.body-sm` | `typography.caption-sm` |
| `md` | `spacing.xxl` (48px) | `spacing.sm` | `radius.input` | `typography.caption-md` | `typography.body-md` | `typography.caption-sm` |
| `lg` | `spacing.xxl` (48px) | `spacing.md` | `radius.input` | `typography.caption-md` | `typography.body-md` | `typography.caption-sm` |

`textarea` overrides height to `auto` and adds a `minHeight: spacing.section` (96px). `search` is identical to `text` plus a leading-icon slot.

`error` state is convention-driven (corpus has 0 explicit error rows, but every starter UI lib needs it). Bound to `color.error` at render time.

### 3.4 badges

| axis | values |
|---|---|
| variants | `subtle` / `solid` |
| states | _(none)_ |
| sizes | `sm` (default) / `md` |

| size | height | paddingX | radius | font |
|---|---|---|---|---|
| `sm` | `spacing.lg` (24px) | `spacing.xs` | `radius.pill` (knob-resolved) | `typography.badge-md` |
| `md` | `spacing.xl` (32px) | `spacing.sm` | `radius.pill` (knob-resolved) | `typography.caption-md` |

The badge radius alias resolves to `radius.pill` when knob `buttonShape: pill` (default per corpus 50% pill prevalence and the badge–button correlation rule §5) or to `radius.subtle` when `buttonShape: rect`. **Dropped variant:** `outline` (n=1).

### 3.5 tabs

| axis | values |
|---|---|
| variants | `underline` / `pill` |
| states | `default` / `active` / `disabled` |
| sizes | `sm` / `md` (default) |

| size | height | paddingX | gap | font |
|---|---|---|---|---|
| `sm` | `spacing.lg` (24px) | `spacing.sm` | `spacing.xs` | `typography.caption-md` |
| `md` | `spacing.xl` (32px) | `spacing.md` | `spacing.sm` | `typography.button-md` |

`underline` variant uses no radius; the active state paints a 2px bottom border in `color.primary`. `pill` variant uses `radius.pill` and active state fills with `color.primary`. **Dropped variant:** `segmented` (n=3, borderline).

### 3.6 avatar (convention-driven, corpus too thin)

| axis | values |
|---|---|
| variants | `circle` |
| states | _(none)_ |
| sizes | `xs` / `sm` / `md` (default) / `lg` / `xl` |

| size | dimension |
|---|---|
| `xs` | `spacing.md` (16px) |
| `sm` | `spacing.lg` (24px) |
| `md` | `spacing.xl` (32px) |
| `lg` | `spacing.xxl` (48px) |
| `xl` | `spacing.section` (96px) |

`radius` is always `radius.circle` (`9999px`) — the `circle` variant name is structural, not optional. Avatar uses spacing aliases as direct dimensional tokens; if spacing density changes, avatar sizes track automatically.

## 4. Cross-category alias rules (the single hard pattern)

Every leaf value in a component spec is a `category.token` string. The runtime resolution rule: at consumer time, look up the value in the named category's emitted tokens. If the alias points to a missing token (e.g. component spec asks for `spacing.4xl` but spacing knobs only emit through `spacing.3xl`), the resolver falls back through the scale; this is the consumer's concern, not the component category's.

Specific cross-category alias conventions:

1. **`radius.<primitive>` keys** — `radius.none / .subtle / .button / .input / .card / .large / .pill / .circle` are the stable token names already emitted by the radius category. The component category MUST NOT introduce new radius keys; it only consumes them.
2. **`elevation.<level>` keys** — `elevation.none / .ring / .raised / .floating / .overlay` are the universal 5-level taxonomy from the elevation category. Same rule: consume only.
3. **`spacing.<alias>` keys** — `spacing.xxs / .xs / .sm / .md / .lg / .xl / .xxl / .section` are the 8 spacing category aliases. The three sizes (sm/md/lg) of every primitive draw from a 2-stop height subset (`spacing.xl` for sm; `spacing.xxl` for both md and lg) plus paddingX from `spacing.sm / .md / .lg`. The collapsed md=lg height matches the legacy generator's existing decision and corpus mode (40–48px is one band).
4. **`typography.<category>-<size>` keys** — Typography emits compound keys `body-md`, `body-sm`, `heading-md`, `caption-md`, `caption-sm`, `button-md`, `card-md`, `nav-md`, `link-md`, `badge-md`, `code-md`, etc. (9 categories × 5 size variants). Component fontSize bindings consume those directly. There is no plain `typography.body` key — every binding includes a size variant.
5. **Color is not aliased here** — variants enumerate logical roles (`primary / secondary / ghost / outline / text / icon` for buttons), but the bg/text/border color resolution happens at render time using `color.primary`, `color.surface`, etc. This keeps the component category schema **light/dark-mode neutral**. Consumer (template renderer, figma transformer) is responsible for picking the mode-correct color.

Pattern: a component spec is the **shape of the component**, not the **paint of the component**.

## 5. Functional knobs

Two knobs in v1.

| knob | options | default | affects |
|---|---|---|---|
| `cardSurface` | `outlined` / `elevated` / `filled` | `outlined` | the default `card` variant when consumer doesn't specify; sets `radius.card` and `elevation` resolution |
| `buttonShape` | `rect` / `pill` | `rect` | resolves `radius.button`; corpus 17% pill prevalence (Airbnb, ElevenLabs, modern AI brands) |

**Why only two knobs:**

- **`badgeShape: pill / rect`** — corpus shows 50% pill, but the badge shape decision is *correlated* with the `buttonShape` decision in 80%+ of corpus systems. Folded into `buttonShape` to avoid two knobs that always co-vary. v2 candidate if telemetry shows independent variation.
- **`density: compact / comfortable / spacious`** — already exists in spacing category. Component sizing inherits via spacing aliases, no second knob needed.
- **`tabStyle: underline / pill`** — corpus split is real (Linear underline, modern AI pill), but the consumer almost always picks per-instance. Variant axis covers it.
- **`inputStyle: outline / underline / filled`** — n<5 for non-outline variants (only Material-derived systems use underline inputs). Borderline; v2.
- **`cornerRadius: tight / standard / round / pill`** — would set the global radius character but radius category already has its own `style` knob. Cross-category overlap; deferred.

Per-component spec overrides (e.g., `componentSpec.button.sizes.md.height = "spacing.3xl"`) are always possible via direct schema edit.

## 6. User input

**Required (0):** all defaults work standalone.

**Optional:**
- `cardSurface: "outlined" | "elevated" | "filled"`
- `buttonShape: "rect" | "pill"`

## 7. Output

At all defaults: 6 primitives × N variants × N sizes emitted as a structured `ComponentTokens` tree. Token-ref strings are NOT resolved at this layer.

| count | source |
|---|---|
| 6 | primitives (button, input, card, badge, tab, avatar) |
| 19 | total variants summed across primitives (6+3+4+2+2+2) |
| 19 | total size rows summed (3+3+3+2+2+5+1) — including avatar's 5 sizes |
| ~80 | total leaf alias-strings emitted |

For comparison: typography emits 49 tokens, color 33, spacing 20, radius 18, elevation 5. Components emits structured specs (not flat tokens), but the leaf-alias count is comparable to color.

A `philosophy` string describes the chosen `cardSurface × buttonShape` combo (e.g., "Outlined cards on rectangular buttons — restrained Stripe-like character").

## 8. Patterns embedded in defaults

Five patterns shape v1 specs. Each is a deliberate starter opinion grounded in corpus convergence:

1. **md is the default size everywhere.** Corpus shows 96% of button rows are md-sized. Components without an explicit size ref to a different stop default to md.
2. **Text variants drop padding-Y.** `button:variant=text` and `link-style` buttons consume only `paddingX` and inherit line-height from `typography.body` rather than carving vertical box space.
3. **Cards have no states.** Corpus shows zero systems define hover/active card states explicitly — interactivity lives on the children (button-in-card), not the card surface.
4. **Pill modifier is a knob-flag, not a variant axis.** `pill` would otherwise multiply variants by 2 (primary-pill, primary-rect, secondary-pill, etc.). Folded into the global `buttonShape` knob.
5. **Universal radius binding.** `radius.button` is a single value across all button sizes. Corpus shows 53/58 systems share radius across sizes within a primitive; the 5 exceptions are brand-extreme.

## 9. Special handling

- **Color is render-time, not alias-time.** Variant names like `primary` enumerate logical bindings; resolving them to actual hex requires the color category's emitted tokens at render time. The component category must work whether `color.ts` is present or not.
- **Missing token references are runtime errors, not schema errors.** If a downstream consumer references a typography size variant the typography category did not emit (e.g. `caption-sm` when only `caption-md` is shipped), the resolver should warn and fall back to the closest available size. The component schema does not pre-validate ref availability.
- **Avatar sizes overlap with spacing aliases.** Avatar uses 5 sizes (xs/sm/md/lg/xl), all of which alias to spacing values. If spacing density changes, avatar sizes track automatically.
- **Knobs are silent on irrelevant primitives.** `buttonShape: pill` does not change input or card or tab radius — only button and badge (the badge correlation rule).
- **The legacy `generateComponents(archetype)` path is removed.** Components no longer dispatches on archetype; the new path is `generateComponentCategory(input)` matching radius/spacing/elevation pattern.

## 10. Out of scope

- **Forms components** — checkbox, radio, switch, select, datepicker. Future `forms` category.
- **Overlay components** — modal, dialog, popover, tooltip, drawer, command-palette. Future `overlay` category; will consume `elevation.overlay`.
- **Navigation primitives** — top-nav, breadcrumb, pagination. Page-architecture, not primitives.
- **Page-architecture composites** — hero-band, cta-band, footer, pricing-card, feature-card. These are SLOTS where primitives are deployed, not primitives themselves. Future `pages` category if there's demand.
- **Animation / motion** — hover transitions, ripple, fade-in. Separate motion category.
- **Composition rules** — "card-with-button-bar" or "input-with-icon-trailing" patterns. These are pattern-library concerns, not primitive concerns.
- **Component-level color tokens** — `button.primary.bg = color.primary.500` style aliasing. Color resolution stays render-time per §4.
- **Density override at component level** — spacing's density knob is the single source of truth for size scale; per-primitive density would be a redundant axis.

## 11. Sequencing for code emission

Encode in this order under `src/schema/components.ts` (new) and `src/generator/components-category.ts` (new — replaces `src/generator/components.ts`):

1. **Primitives + variant taxonomies** — `PRIMITIVE_NAMES` constant; per-primitive `VARIANTS` / `STATES` / `SIZES` arrays.
2. **Knob types + options** — `ComponentInput`, `ComponentKnobs`, `DEFAULT_COMPONENT_KNOBS`, option arrays.
3. **Size alias maps** — `BUTTON_SIZE_SPECS`, `INPUT_SIZE_SPECS`, `CARD_SIZE_SPECS`, etc. Each is a `Record<size, { ... token-ref strings }>`.
4. **Token type** — `ComponentCategoryTokens` mirroring the structure (primitive → variants/states/sizes → spec).
5. **Generator** — `generateComponentCategory(input)` → `ComponentCategoryTokens` (`{ button, input, card, badge, tab, avatar, knobs, philosophy }`).
6. **Helpers** — `resolveKnobs`, `buildButtonRadius(shape)`, `buildBadgeRadius(shape)`, `buildPhilosophy(cardSurface, buttonShape)`.
7. **Pipeline integration** — wire into `src/generator/index.ts`; extend `UserInputs` with `componentKnobs`; add `componentTokens` to `DesignSystem`.
8. **Adapter** — replace the legacy `generateComponents(archetype)` call site to read from `componentTokens`. Keep the `ComponentSpecs` shape backwards-compatible for consumers (template, figma transformer, tokens.ts).
9. **Legacy cleanup** — delete `src/generator/components.ts` (the archetype-driven version). Remove `divider` from output entirely (out of v1 scope per memory). Remove archetype `componentSizing` field if it exists.

Mirrors radius/elevation encoding pattern, with the consumer-category twist that tokens are alias strings, not numeric values.

## 12. Rejected alternatives — preserved design space

Per playbook §4, every option considered and rejected during this proposal is recorded here as a v2 backlog candidate.

### Architecture

- **2-tier (raw size scale + per-primitive aliases)** | rejected — components has no own scale; introducing a "component scale" would just duplicate spacing | revisit only if components needs height/width values that don't fit on the spacing ladder
- **Color-aliased component tokens (button.primary.bg = color.primary.500)** | rejected — locks component spec into a single color theme, breaking light/dark separation | revisit when a "themed-component-tokens" emit pass is added (probably as a separate pipeline step, not in this category)
- **Embed component specs into archetype** | rejected — that's the v0 approach; recipe couples mood to component sizing in ways that don't generalize | revisit only if an archetype-bundle preset feature lands

### Scope

- **Include `divider` as v1 primitive** | rejected — corpus n=1; not a primitive but a 1px hairline already covered by border styling | revisit if a border category lands and dividers need their own variant matrix
- **Include `link` as primitive** | rejected — link is typography (text + color + underline state), not a structural primitive | revisit only if link gains structural variants beyond inline text
- **Include `nav-link` and `breadcrumb`** | rejected — page-architecture, not primitive | revisit if a nav category is added
- **Include `forms` (checkbox/radio/select)** | rejected — sized differently, semantically different from inputs (boolean vs text) | revisit as a `forms` category v2
- **Include `overlay` (modal/tooltip/popover)** | rejected — fundamentally different (positioning, focus management, escape behavior) | revisit as an `overlay` category v2
- **Include `tertiary` button variant** | rejected — corpus n=3, all from accessibility-focused systems (IBM, Sentry, Material-derived) | revisit when an a11y-strict preset lands
- **Include `danger` button variant** | rejected — corpus n=2, all are color-semantic uses (`primary` variant + `color.error` substitution covers this) | revisit if destructive-action UX patterns drive a need
- **Include `outline` badge variant** | rejected — corpus n=1 (mongodb monospace tag) | revisit only if a "developer doc" preset is added
- **Include `segmented` tab variant** | rejected — corpus n=3, mostly from configurator/comparison UIs (BMW, IDE-style) | revisit if developer-tools preset materializes

### Sizes

- **Add `xs` button size** | rejected — corpus n=6 / 212 = 3% | revisit for "compact dashboard" preset
- **Avatar 7-stop scale (add `2xl`, `3xl`)** | rejected — corpus too thin to choose; 5 stops covers convention | revisit when team-photo / hero-portrait UIs need it
- **Per-primitive density override** | rejected — spacing density covers it via aliases | revisit only if a power-user "tighten only buttons" demand emerges

### Variants

- **Use brand-color-named variants (purple-button, coral-button)** | rejected — couples spec to color category state; primary/secondary/ghost is theme-neutral | revisit if a "branded-component-bundle" preset feature lands
- **Combine `outline` and `ghost` into one variant** | rejected — corpus shows them as distinct (outline has visible border, ghost is fully transparent until hover) | revisit only on direct user feedback that they're indistinguishable in real usage
- **Drop `text` button variant (it's just a styled link)** | rejected — corpus systems (Stripe `transparent-info`, Claude `button-text-link`) define them as button structure with no padding-Y; users want one prop instead of an `<a>` re-implementation | revisit only if a separate `linkButton` primitive is added
- **Add `glass` variant (backdrop-blur frosted)** | rejected — n=4 borderline, all use case-specific (toolbar, hero overlay) | revisit when an effects/glass category is added

### Knobs

- **`cardEmphasis: hairline / bold` (border width)** | rejected — radius category's `style` knob already affects border character indirectly | revisit if a power-user "thicken-borders" demand emerges
- **`focusRingStyle: outline / inset / glow`** | rejected — accessibility decision, not a component decision; should live in a future `accessibility` category | revisit when a11y category is built
- **`elevationOnHover: bool`** | rejected — corpus n<5 explicit mentions; most systems use color shift on hover not elevation shift | revisit for a "Material-faithful" preset
- **`buttonShape: rect / pill / square` (3 options)** | rejected — `square` would mean fully rectangular icon-only; corpus n=2 (Apple icon-buttons) and the `icon` variant already addresses square dimensions | revisit if iOS-faithful preset is added
- **`badgeShape` independent of `buttonShape`** | rejected per §5; correlated 80%+ in corpus | revisit if telemetry shows independent variation
- **`density` knob duplicating spacing density** | rejected per §5 | revisit only if components need a density independent of layout density

### Cross-category coupling

- **Component category emits color-resolved tokens (button.primary.bg = "#cc785c")** | rejected — defers to render time per §4 | revisit when a "themed-token-bundle" emit pipeline is added
- **Hard-import all category modules at component schema load time** | rejected — keeps schema independent and unit-testable; runtime resolution is the consumer's concern | revisit only if cyclic-dependency detection becomes important
- **Define a separate `componentRadius` token set instead of consuming `radius.*`** | rejected — duplicates radius work; the radius category's component-keyed tokens (`radius.button`, `radius.card`) exist exactly for this consumer | revisit only if a power-user "different radius for component vs everywhere-else" demand emerges

### Capture method note

When future component tweaks are made (e.g., adding tertiary variant, splitting card into surface/elevation), append a new entry here with the same structure.
