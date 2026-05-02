# Starter Spacing Category — Proposal v1

_Synthesized from a corpus survey across all 58 design systems in `data/raw/`. Unlike color (3 axis tracks) and typography (5 axis tracks), spacing converged so cleanly on a small number of well-known shapes that the v1 proposal is built directly from a Phase-A-lite inline survey rather than the full per-axis track docs. The track-level analysis is preserved below in §§2–4 (each numbered finding plays the role one axis track played for color/typography). If a future revision needs the full Phase A pipeline (TS extraction + dictionary + per-axis distribution), the playbook in `_category-analysis-playbook.md` defines it._

## 1. Token architecture (2 tiers)

```
Tier 1 — Scale     12-stop px scale [2, 4, 8, 12, 16, 20, 24, 32, 48, 64, 80, 96]
Tier 2 — Aliases   xxs / xs / sm / md / lg / xl / xxl / section
```

Spacing is naturally 2-tier — there are no per-component "category profiles" the way typography has heading/body/code etc. Component-level spacing decisions (card padding, button padding, input height) live in the components category and consume Tier 2 aliases by name.

## 2. Tier 1 — Scale

**`SCALE` (12 stops, px)**

```
[2, 4, 8, 12, 16, 20, 24, 32, 48, 64, 80, 96]
```

- Every Tier 2 alias and every density-knob value resolves to a stop in this scale.
- 4 stops (`2`, `20`, `64`, `80`) are reserved palette values not consumed by Tier 2 aliases at the default density. Parallel to color's neutral scale (9 stops, 5 used by aliases) and typography's size scale (13 stops, 10 used by category defaults).
- Cap at 96 for the canonical SaaS rhythm. Marketing-extreme stops (128, 176, 192, 208 — seen only in Lovable n=1, Ferrari n=1) are dropped per the playbook §3 outlier rule. Future `scale: "extended"` knob can extend the cap when needed (see §11).

**Per-stop corpus signal:**

| stop | n (declared) | role |
|---:|---:|---|
| 2 | 4 | hairline / micro-step (Airbnb, IBM, Mistral, HashiCorp) — reserved |
| 4 | 50+ | base 4-multiple (universal) |
| 8 | 56+ | universal |
| 12 | 50+ | universal |
| 16 | 56+ | universal |
| 20 | 6 | "comfortable component" step (ElevenLabs, Coinbase, Cursor, Composio, Expo) — reserved |
| 24 | 50+ | universal |
| 32 | 50+ | universal |
| 48 | 45+ | universal |
| 64 | 8 | section.dense (Airbnb only at default; intermediate stop for several others) — reserved |
| 80 | 6 | section.compact (Apple, BMW, Cursor, Renault) — consumed by `density: compact` |
| 96 | 12 | section.comfortable (modern SaaS canonical) — consumed by `density: comfortable` (default) |

**Pruning rules applied:**
- Drop `n<5` outliers (playbook §3): excludes Ferrari's 128, Lovable's 176/192/208, Figma's 4.5/10/18/46/50.
- Reserve unused stops rather than removing them (playbook §3 "Reserve unused scale stops"): 2, 20, 64, 80 stay in the scale because consumers (raw-token escape, density knob, micro-step needs) reach them even though no v1 alias points there.

## 3. Tier 2 — Aliases

| alias | px | corpus convention | what it's typically used for |
|---|---:|---|---|
| `xxs` | 4 | universal | hairline gutters, dense divider rows |
| `xs` | 8 | universal | tight inline gaps, caption rows |
| `sm` | 12 | universal | inline button gap, small card meta gap |
| `md` | 16 | universal | standard component padding, grid gutter |
| `lg` | 24 | universal | card padding, comfortable form-field gap |
| `xl` | 32 | universal | section sub-block separation |
| `xxl` | 48 | universal | section internal padding for tight modes |
| `section` | 96 (default) | density-knob driven | major editorial band vertical padding |

Total: **8 alias tokens** at default density.

The `section` alias resolves to one of `64 / 80 / 96` depending on the `density` knob (see §5). The other 7 aliases are fixed.

**Why these 8:** these are the t-shirt-named tokens that appear verbatim across 12+ systems (Airbnb, Cal, Claude, Clay, Clickhouse, Airtable, Composio, Expo, ElevenLabs, Coinbase, BMW, Apple). Naming follows the dominant corpus convention (`xxs..section`) rather than the alternative `2xs..4xl` style used by the prior `layout.ts` output.

## 4. Patterns embedded in defaults

Three patterns shape the table above. Each is a deliberate starter opinion grounded in corpus convergence:

1. **The 4-multiple geometric step** — every alias is a 4-multiple. This is the lowest common denominator that satisfies both 4px-base systems (12 corpus systems incl. Airbnb, Cal, Claude) and 8px-base systems (41 systems incl. IBM, Stripe, Linear). A Tier 2 user does not need to declare which base they are using; the scale is valid against both conventions.
2. **Even-step doubling above md** — `md → lg → xl → xxl` is `16 → 24 → 32 → 48`, an irregular but corpus-canonical progression. It is NOT geometric (×1.5) — it is the empirical convention. Designers think in these specific stops.
3. **Section is its own decision** — `xxl=48` to `section=96` is a 2× jump because the corpus treats section padding as a separate decision from component spacing. The intermediate values (56, 64, 72, 80) are either unused (56, 72) or reserved for the density knob (64, 80).

These patterns live in the table above. A user wanting to override (e.g., `lg = 20` instead of 24) edits the alias map directly — not via knob.

## 5. Functional knobs

One knob in v1. (Color has 6+ knobs across 3 dimensions; typography has 3. Spacing's corpus signal is tight enough that a single archetype split is the only thing worth exposing.)

| knob | options | default | affects |
|---|---|---|---|
| `density` | `comfortable` (96) / `compact` (80) / `dense` (64) | `comfortable` | `spacing.section` value only |

**Why only one knob:**

- **Base unit (4 vs 8):** rejected. The 12-stop scale satisfies both — declaring the base unit is a downstream design-language statement, not a token output. See §11 for the rejection log.
- **Scale variant (standard vs extended with 128/176):** deferred to v2. Corpus signal is n=1 per outlier; not strong enough for a knob.
- **Component padding density (card 16/24/32):** lives in the components category, not spacing. The components category will consume `xxs..xxl` aliases; component-level density is its own knob there.

Per-alias overrides (e.g., `aliases.section = 80`) are always possible via direct schema edit — the knob is for the common archetype split.

## 6. User input

**Required (0):** all defaults work standalone.

**Optional:**
- `density: "comfortable" | "compact" | "dense"` — affects `spacing.section`

## 7. Output

At all defaults: 8 alias tokens emitted, drawn from a 12-stop scale.

| tier | count | source |
|---|---:|---|
| Scale | 12 | base |
| **Tier 1 total** | **12** | |
| Aliases (`xxs..section`) | 8 | category |
| **Tier 2 total** | **8** | |
| **Grand total tokens** | **20** | |

For comparison: typography at all defaults emits 49 (29 Tier 1 + 20 profiles); color emits 33 (9 neutral + 5 accent + 8 semantic + 11 aliases). Spacing is the leanest v1 category yet — and intentionally so. Spacing is a small set of values doing a large amount of structural work.

## 8. Special handling

- **`section` resolution** — the `aliases.section` value is recomputed at generation time from the `density` knob. Other aliases are fixed at their proposal-§3 values regardless of knob.
- **Reserved-stop access** — `2`, `20`, `64`, `80` are exposed in the emitted `SCALE` constant for raw-token consumers (e.g., a component spec needing `8 + 12 = 20px input padding` can reference `SCALE[5]` directly). They do not appear in the alias map.
- **Component-level coupling** — the `components` category will reference aliases by string name (`"xxs"`, `"md"`, etc.), not by px value. This keeps components decoupled from any future scale tweaks.
- **Cross-category coupling with typography** — playbook §8 flagged that section spacing might depend on heading size. Resolved here by keeping spacing self-contained (section is a corpus-empirical 64/80/96 split, not derived from heading.xl). If a future user reports rhythm mismatch when `headingStyle: bold` × `density: dense`, that is a v2 preset-bundle concern, not a v1 spacing concern.

## 9. Out of scope

- **Responsive spacing scales** — desktop-only profile in v1. Mobile-specific shrinks (e.g., `section` shrinking to 48 on small screens) are a separate `responsive` category concern.
- **Per-mode (light/dark) spacing** — spacing is mode-invariant in the corpus; no system varies spacing by color mode.
- **Container max-width** — corpus signal weak (1200/1280/1440/1920 split with no clear mode). Lives in the existing `layout.grid.maxWidth` field; not a spacing concern.
- **Negative spacing** — corpus has no negative-margin tokens. Negative offsets are a per-component implementation choice.
- **Container queries / fluid spacing** — `clamp()`-based responsive spacing is post-v1 art; corpus has near-zero adoption.

## 10. Sequencing for code emission

Encode in this order under `src/schema/spacing.ts` and `src/generator/spacing-category.ts`:

1. **Scale** — `SCALE` constant (12 px values)
2. **Aliases** — `BASE_ALIASES` constant (the 7 fixed alias→px mappings; `section` is computed)
3. **Knob types** — `DensityMode`, `SpacingInput`, `SpacingKnobs`, `DEFAULT_SPACING_KNOBS`, `DENSITY_OPTIONS`, `DENSITY_TO_SECTION_PX`
4. **Generator** — `generateSpacingCategory(input)` → `SpacingCategoryTokens` (`{ scale, aliases }`)
5. **Helpers** — `resolveKnobs`, `resolveSection`, `countEmittedTokens`
6. **Pipeline integration** — wire into `src/generator/index.ts`; extend `UserInputs` with `spacingKnobs`; add `spacingTokens` to `DesignSystem`
7. **Tokens emitter** — update `src/generator/tokens.ts` `buildDesignTokens` to read from `system.spacingTokens.aliases` instead of `system.layout.spacing`
8. **Layout adapter** — update `src/generator/layout.ts` to derive `LayoutSystem.spacing` from `spacingTokens` (preserves the `LayoutSystem` shape used by the markdown template), and stop reading `archetype.sectionSpacing` / `archetype.componentSpacing`
9. **Legacy cleanup** — remove `sectionSpacing` and `componentSpacing` fields from `ArchetypePreset` (in `types.ts` and `archetypes.ts`). The 5 archetype string interpolations referencing `sectionSpacing` (atmosphere copy, dos, donts) become static text now that the value is no longer mood-dependent.

Mirrors the typography category encoding pattern from `src/schema/typography.ts` and `src/generator/typography-category.ts`.

## 11. Rejected alternatives — preserved design space

Per playbook §4, every option considered and rejected during this proposal is recorded here as a v2 backlog candidate. Each: **rejected option** | **why** | **revisit trigger**.

### Architecture

- **3-tier architecture (scale / aliases / component-defaults)** | rejected — component-level spacing belongs in the components category, where it can be parametrized with the actual component definition. A 3-tier spacing schema would duplicate that ownership | revisit if components category grows complex enough that a shared component-spacing layer makes sense
- **Separate component-scale + layout-scale (IBM Carbon split)** | rejected — corpus shows ~38 systems use a single scale. The Carbon-style split is a documentation convention, not a token-level distinction | revisit if a "Carbon-faithful" preset is shipped
- **Per-mode spacing (light vs dark variants)** | rejected — zero corpus signal | revisit only on direct user request

### Scale shape

- **9-stop scale (drop 20 + 80)** | rejected — both have n≥6 corpus signal as reserved/density values | revisit if scale-stop budget becomes a constraint
- **Geometric ×1.5 progression** | rejected — corpus is empirical (16→24→32→48 not geometric) | revisit if a "purely mathematical" preset is shipped
- **Fibonacci-based scale (4, 8, 12, 20, 32, 52)** | rejected — corpus n=0; mathematically appealing but not how designers actually publish | revisit only if a "mathematical curiosity" preset becomes a request
- **Add 56 to scale** | rejected — n=0 verbatim; no alias points there | revisit if `density: comfortable-tight` (56) variant is requested
- **Add 128 to scale (Lovable/Ferrari hero)** | rejected — n=2 only, brand-extreme | revisit as `scale: "extended"` knob for marketing/luxury preset
- **Cap at 64** | rejected — would force `density: comfortable` to land off-scale | revisit only if a "density-first compact" preset is added that drops the section idea
- **Cap at 80** | rejected — corpus 96-mode is dominant (n=12 vs n=6) | revisit for a luxury preset where 80 is canonical

### Naming

- **`2xs..4xl` naming (current `layout.ts` style)** | rejected — corpus dominantly uses `xxs..section`. T-shirt naming is more semantic than numbered scales | revisit if migration friction is high (track in v2 telemetry)
- **Include `base` alias = 16** | rejected — Airbnb/ElevenLabs use `base` but inconsistently (Airbnb base=16, ElevenLabs base=16 with separate md=20). `md=16` is the cleaner convergent name | revisit if "base" becomes the de facto industry term
- **Numeric-only naming (`spacing.4`, `spacing.16`)** | rejected — corpus n=2 (Tailwind-style); breaks alias indirection | revisit if a Tailwind-faithful preset is shipped

### Knobs

- **`baseUnit: 4 | 8` knob** | rejected — both base-unit conventions consume the same 4-multiple scale. The knob would emit identical output | revisit if the components category needs to know the base for component-padding rules
- **`microStep: enabled | disabled` knob** | rejected — `2` is in the reserved-palette stops; users who don't want it simply don't reference it | revisit if linting against micro-step usage becomes a requirement
- **`scale: "standard" | "extended"` knob** | deferred to v2 — corpus signal is n=1 per outlier (Lovable, Ferrari). Worth shipping when at least one design preset bundles it | revisit when adding marketing/luxury preset bundles
- **`gridGutter: tight | comfortable` knob** | rejected — gutter is a layout concern (consumes `md` or `lg` alias); not a spacing-category knob | revisit if grid system gets its own category
- **Density values `compact=72`** | rejected — n=1 (BMW M only); 80 is the corpus mode for compact | revisit only if a BMW-faithful preset ships
- **Density values `dense=48`** | rejected — collapses with `xxl`; the visual section break disappears | revisit only as part of a "dense-product" preset that intentionally removes section punctuation

### Component coupling

- **Spacing category emits `card.padding`, `button.padding`, etc.** | rejected — those are component decisions consuming spacing aliases, not spacing itself | revisit only if components category is dropped
- **Spacing category emits `grid.gutter`** | rejected — grid is in the layout category | revisit if layout becomes a sub-category of spacing

### Capture method note

When future spacing tweaks are made (e.g., adding 80 to the comfortable mode, or splitting `section` into `section.minor / section.major`), append a new entry here with the same structure. Track docs (`docs/research/<axis>-track.md`) are skipped for this category but can be retrofitted post-hoc if a v2 needs the per-axis distribution data.
