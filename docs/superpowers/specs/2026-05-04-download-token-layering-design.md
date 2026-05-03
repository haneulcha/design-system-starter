# Download Token Layering — 2-Layer Architecture

**Date**: 2026-05-04
**Status**: Approved (brainstorm); ready for implementation plan
**Scope**: CSS export, Tailwind preset, Figma JSON. DESIGN.md unchanged.

---

## Goal

Restructure download outputs so every token category emits a **base
(primitive) layer** with **semantic aliases** that reference it via `var()`
(or Figma collection separation). Dark mode overrides only the base layer;
semantics cascade automatically.

User-stated requirement:
- Color: `--color-neutral-50..900`, `--color-accent-500`, `--color-red-500` etc.
  as primitives; semantic vars reference them.
- Spacing/radius/shadow: all three have a base layer; radius and shadow get
  an additional semantic layer. (Spacing stays alias-only — already its
  current shape.)
- Dark mode: defining only the base layer must be sufficient.

This applies to every download artifact (`design-tokens.css`,
`tailwind.config.js`, `figma-system.json`).

---

## 1. Color

### 1.1 Base layer (primitives)

Total: **18 primitives**.

```css
/* Neutral scale — 9 stops, sourced from ColorCategoryTokens.baseScale */
--color-neutral-50, -100, -200, -300, -400, -500, -600, -800, -900

/* Brand accent — single value, suffix -500 for naming consistency */
--color-accent-500

/* Status hues — fixed naming (red/green/amber/blue), -50 = bg, -500 = text */
--color-red-50,   --color-red-500     /* error-bg,    error-text   */
--color-green-50, --color-green-500   /* success-bg,  success-text */
--color-amber-50, --color-amber-500   /* warning-bg,  warning-text */
--color-blue-50,  --color-blue-500    /* info-bg,     info-text    */
```

Status-hue naming is **fixed** regardless of archetype hue (warm-friendly's
error-text trends orange, but it is still emitted under `--color-red-500`).
This is a convention call: chip-name stability over hue accuracy.

### 1.2 Semantic layer (aliases)

```css
--color-bg-canvas:   var(--color-neutral-50)   /* surfaceRefs.canvas   */
--color-bg-soft:     var(--color-neutral-100)  /* surfaceRefs.soft     */
--color-bg-hairline: var(--color-neutral-300)  /* surfaceRefs.hairline */
--color-text-ink:    var(--color-neutral-900)  /* textRefs.ink         */
--color-text-body:   var(--color-neutral-800)  /* textRefs.body        */
--color-text-muted:  var(--color-neutral-500)  /* textRefs.muted       */
--color-accent-primary: var(--color-accent-500)
--color-status-error-bg:    var(--color-red-50)
--color-status-error-text:  var(--color-red-500)
--color-status-success-bg:   var(--color-green-50)
--color-status-success-text: var(--color-green-500)
--color-status-warning-bg:   var(--color-amber-50)
--color-status-warning-text: var(--color-amber-500)
--color-status-info-bg:      var(--color-blue-50)
--color-status-info-text:    var(--color-blue-500)
```

`bg/*` and `text/*` semantic targets follow the archetype's
`surfaceRefs`/`textRefs` (configurable per archetype). The mapping must
be derived from `ARCHETYPE_PALETTES[preset]`, not hardcoded.

The existing `tokens.semantic` shape (`SemanticTokens`) currently uses
`palette/<slot>` refs. Two options for implementation:

- **Option A**: Keep `tokens.semantic` as-is (refs into `palette/*`); the
  CSS exporter looks up `surfaceRefs`/`textRefs` to translate. Tokens stay
  backward-compatible with existing consumers.
- **Option B**: Rewrite `generateSemantic()` to emit refs into the new
  primitive shape (e.g. `"neutral/50"`, `"red/500"`).

Implementation chooses **Option B**: rewriting generateSemantic produces a
single source of truth. Adapt the figma transformer in lockstep.

### 1.3 Dark mode

Only the base layer is overridden. The neutral scale uses **value
inversion** (Radix-style scale-position semantics): `--color-neutral-50`
in dark mode resolves to the dark-mode hex of the lightest scale position
(near-black). Status hues are adjusted by the existing
`adjustStatusForDark` rule. Accent is identical in both modes.

```css
@media (prefers-color-scheme: dark) {
  :root {
    --color-neutral-50: <dark-mode hex of position-50>;
    ...
    --color-neutral-900: <dark-mode hex of position-900>;
    --color-red-500:   <lightened error-text hex>;
    --color-red-50:    <darkened error-bg hex>;
    /* green/amber/blue same pattern */
    /* accent stays unchanged */
  }
}
```

Semantic vars never appear in the dark block — they resolve correctly
through `var()` cascade.

### 1.4 Source-of-truth changes

`ColorCategoryTokens` already exposes `baseScale` (9 stops) and `palette`
(15 slots including 8 status). The mapping to status hue names lives
**only in the exporter**:

```ts
const STATUS_HUE_MAP = {
  error:   "red",
  success: "green",
  warning: "amber",
  info:    "blue",
} as const;
```

This is exporter-local. ColorCategoryTokens does not gain a hue field.

---

## 2. Spacing

**No change.** Already alias-only:

```css
--spacing-xxs, --spacing-xs, --spacing-sm, --spacing-md, --spacing-lg,
--spacing-xl, --spacing-xxl, --spacing-section
```

Total: 8 vars.

---

## 3. Radius

### 3.1 Base layer

```css
--radius-none:   0;
--radius-xs:     2px;
--radius-sm:     4px;
--radius-md:     8px;
--radius-lg:     12px;
--radius-xl:     16px;
--radius-2xl:    24px;
--radius-pill:   9999px;
--radius-circle: 50%;
```

`SCALE = [0, 2, 4, 6, 8, 12, 16, 24]` from `src/schema/radius.ts`.
**6px is reserved and NOT exposed.** All other stops map to alias names.

### 3.2 Semantic layer

```css
--radius-button: var(--radius-md)   /* style=standard default; remaps with knob */
--radius-input:  var(--radius-md)
--radius-card:   var(--radius-lg)
--radius-subtle: var(--radius-sm)
--radius-large:  var(--radius-2xl)
```

Style knob still drives ref targets. For `style=pill`,
`--radius-button: var(--radius-pill)` etc.

### 3.3 Mapping table (px → alias name)

| px    | alias  |
|-------|--------|
| 0     | none   |
| 2     | xs     |
| 4     | sm     |
| 6     | (reserved, dropped) |
| 8     | md     |
| 12    | lg     |
| 16    | xl     |
| 24    | 2xl    |
| 9999  | pill   |
| 50%   | circle |

The exporter maintains this mapping. `radiusPrimitives: readonly number[]`
in DesignTokens is replaced (or augmented) by an alias-keyed shape.

---

## 4. Shadow

### 4.1 Base layer

```css
--shadow-none: none
--shadow-xs:   <ring shadow CSS string>      /* hairline ring */
--shadow-sm:   <raised string>
--shadow-md:   <floating string>
--shadow-lg:   <overlay string>
```

Mapping from `ElevationCategoryTokens.levels`:

| ElevationLevel | base name |
|----------------|-----------|
| none           | none      |
| ring           | xs        |
| raised         | sm        |
| floating       | md        |
| overlay        | lg        |

### 4.2 Semantic layer

```css
--shadow-hairline: var(--shadow-xs)
--shadow-card:     var(--shadow-sm)
--shadow-popover:  var(--shadow-md)
--shadow-modal:    var(--shadow-lg)
```

`none` is not surfaced as a semantic alias.

The 5-level taxonomy in ElevationCategoryTokens stays as-is; the rename
happens only at export time.

---

## 5. Tailwind config

Both base and semantic exposed.

```js
colors: {
  // Base
  neutral: { 50: 'var(--color-neutral-50)', ..., 900: '...' },
  accent:  { DEFAULT: 'var(--color-accent-500)', 500: '...' },
  red:     { 50: 'var(--color-red-50)', 500: 'var(--color-red-500)' },
  green:   { 50: '...', 500: '...' },
  amber:   { 50: '...', 500: '...' },
  blue:    { 50: '...', 500: '...' },
  // Semantic (flat kebab to avoid nested-name awkwardness)
  'bg-canvas':         'var(--color-bg-canvas)',
  'bg-soft':           'var(--color-bg-soft)',
  'bg-hairline':       'var(--color-bg-hairline)',
  'text-ink':          'var(--color-text-ink)',
  'text-body':         'var(--color-text-body)',
  'text-muted':        'var(--color-text-muted)',
  'accent-primary':    'var(--color-accent-primary)',
  'status-error-bg':   'var(--color-status-error-bg)',
  'status-error-text': 'var(--color-status-error-text)',
  // success/warning/info same pattern
},
spacing: { xxs, xs, sm, md, lg, xl, xxl, section },
borderRadius: {
  // base
  none, xs, sm, md, lg, xl, '2xl', pill, circle,
  // semantic
  button, input, card, subtle, large,
},
boxShadow: {
  // base
  none, xs, sm, md, lg,
  // semantic
  hairline, card, popover, modal,
},
fontFamily: { /* unchanged */ },
fontSize:   { /* unchanged */ },
```

Tailwind name collisions: `card`/`button` exist only as borderRadius and
boxShadow keys (Tailwind namespaces these), so no actual collision.

---

## 6. Figma JSON

Extend from 5 to **7 collections**.

| Collection | Status | Variables |
|---|---|---|
| Color Primitives | redefined | 18 (neutral.50-900, accent.500, red/green/amber/blue × {50,500}) |
| Colors | redefined | semantic vars (bg-canvas, text-ink, status-error-bg, etc.) |
| Spacing | unchanged | 8 aliases |
| Radius Primitives | renamed | 8 aliases (none, xs, sm, md, lg, xl, 2xl, pill) — circle excluded (not numeric) |
| Border Radius | unchanged | semantic (button, input, card, subtle, large, pill, circle, none) |
| **Shadow Primitives** | **new** | 5 aliases (none, xs, sm, md, lg) |
| **Shadows** | **new** | 4 semantic (hairline, card, popover, modal) |

Out of scope for v1: Figma variable aliasing (linking semantic Figma vars
to primitive Figma vars via VARIABLE_ALIAS). Both collections emit raw
resolved values. Future work.

---

## 7. DESIGN.md

Narrative document — does not list raw token variable names. **No
changes.**

---

## 8. Files to touch

| File | Change |
|---|---|
| `src/generator/css-export.ts` | Rewrite emit logic per §1–4 |
| `src/generator/tailwind-export.ts` | Rewrite per §5 |
| `src/figma/transformer.ts` | Extend per §6 |
| `src/generator/tokens.ts` | Update `generateSemantic()` to ref new primitive shape; rename radius primitive shape |
| `src/schema/types.ts` | Adjust `DesignTokens.radiusPrimitives` shape; consider adding shadow primitive map |
| `tests/generator/tokens.test.ts` | Update for new semantic refs |
| `tests/figma/transformer.test.ts` | Update for new collection structure |
| (tests for css-export / tailwind-export) | Add or update — verify base+semantic emit |

---

## 9. Explicit non-goals (YAGNI)

- Per-archetype hue naming (warm-friendly error-orange stays under `red-500`).
- Synthesizing full color scales for accent or status (only the two
  curated stops, -50 and -500).
- Figma `VARIABLE_ALIAS` linking — values still duplicated across
  primitives/semantic.
- Changes to DESIGN.md narrative output.
- New token categories (typography unchanged).

---

## 10. Open implementation questions (defer to plan)

1. Should `tokens.semantic` keys change format (e.g. `"bg-canvas"` flat)
   to match the CSS var name directly? Currently uses `"bg/canvas"`
   slash form for grouping. Decision deferred to plan-writing.
2. Order of CSS var emission within `:root` — base first (every category)
   then semantic, or interleaved per category? Recommend interleaved per
   category (current pattern); reads better.
3. Should the css-export accept the `ColorCategoryTokens` directly (to
   reach `baseScale` cleanly) or stay on `DesignTokens` and look up via
   `tokens.primitive.colors.neutral`? Recommend introducing a `neutral`
   pseudo-hue in primitive and keeping the exporter on `DesignTokens`.
