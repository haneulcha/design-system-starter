# Upstream awesome-design-md DESIGN.md Format Reference

> Notes from inspecting 5 systems on 2026-04-29. Used to author the parsers in `scripts/analysis/parsers/`.
> Systems inspected: stripe, airbnb, vercel, linear.app, apple.

---

## Heading structure (observed)

### Format A — Numbered top-level headings (stripe, vercel, linear.app)

```
## 1. Visual Theme & Atmosphere
## 2. Color Palette & Roles
## 3. Typography Rules
## 4. Component Stylings
## 5. Layout Principles
## 6. Depth & Elevation
## 7. Do's and Don'ts
## 8. Responsive Behavior
## 9. Agent Prompt Guide
```

Subsections under `## 4. Component Stylings`:
- `### Buttons`
- `### Cards & Containers`
- `### Badges / Tags / Pills`
- `### Inputs & Forms`
- `### Navigation`
- `### Decorative Elements`
- `### Image Treatment` (linear.app only)

Subsections under `## 3. Typography Rules`:
- `### Font Family`
- `### Hierarchy` (pipe table)
- `### Principles`

Subsections under `## 2. Color Palette & Roles`:
- `### Primary`
- `### Brand & Dark`
- `### Accent Colors`
- `### Interactive`
- `### Neutral Scale`
- `### Surface & Borders`
- `### Shadow Colors` (stripe, vercel)
- `### Background Surfaces` (linear.app, replaces Primary)
- `### Text & Content` (linear.app)
- `### Workflow Accent Colors` (vercel)

### Format B — YAML frontmatter + prose sections (airbnb, apple)

These files begin with a YAML block (between `---` delimiters) containing structured token data, followed by prose sections using *un-numbered* `## Heading` names:

```yaml
---
version: alpha
name: Airbnb
colors:
  primary: "#ff385c"
  ...
typography:
  display-xl:
    fontSize: 28px
    fontWeight: 700
    lineHeight: 1.43
    letterSpacing: 0
  ...
rounded:
  sm: 8px
  md: 14px
  ...
components:
  button-primary:
    rounded: "{rounded.sm}"
    ...
---

## Overview
## Colors
## Typography
## Layout
## Elevation
## Components
## Responsive Behavior
## Known Gaps
```

**Critical difference for parsers**: Format A stores all values in Markdown prose/tables. Format B stores canonical values in YAML frontmatter; prose sections describe but don't always restate numeric values.

---

## Per-variable extraction patterns

### btn_radius

**Format A (stripe, vercel, linear.app)**
- Section: `### Buttons` under `## 4. Component Stylings`
- Format: prose block per variant. First variant's `- Radius:` line.
- stripe: `- Radius: 4px` (under `**Primary Purple**`)
- vercel: `- Radius: 6px (subtly rounded)` (under `**Primary White (Shadow-bordered)**`)
- linear.app: `- Radius: 6px` (under `**Ghost Button (Default)**`)
- Rule: take the first `- Radius: ` line; extract leading integer.

**Format B (airbnb, apple)**
- airbnb YAML: `components.button-primary.rounded: "{rounded.sm}"` → resolve via `rounded.sm: 8px` → `8px`
- apple YAML: `components.button-primary.rounded: "{rounded.pill}"` → resolve via `rounded.pill: 9999px` → `9999px`
- Rule: follow the token reference from `components.button-primary.rounded` through the `rounded:` map.

**Quirks**:
- apple's primary button is a full pill (9999px). Parser should not reject large values.
- stripe lists multiple radii inline for cards but individual buttons always have a single `- Radius:` line.
- vercel has a note in parentheses after the radius value: `6px (subtly rounded)` — strip non-numeric suffix.

---

### card_radius

**Format A (stripe, vercel, linear.app)**
- Section: `### Cards & Containers` under `## 4. Component Stylings`
- Format: prose bullet. May list multiple values with semantic labels.
- stripe: `- Radius: 4px (tight), 5px (standard), 6px (comfortable), 8px (featured)` — take first value: `4px`
- vercel: `- Radius: 8px (standard), 12px (featured/image cards)` — take first value: `8px`
- linear.app: `- Radius: 8px (standard), 12px (featured), 22px (large panels)` — take first value: `8px`
- Rule: take first `- Radius: ` line; extract leading integer before any space or comma.

**Format B (airbnb, apple)**
- airbnb YAML: `components.property-card.rounded: "{rounded.md}"` → `rounded.md: 14px` → `14px`
- apple YAML: `components.store-utility-card.rounded: "{rounded.lg}"` → `rounded.lg: 18px` → `18px`
- Rule: resolve `components.property-card.rounded` (airbnb) or `components.store-utility-card.rounded` (apple) through `rounded:` map.

**Quirks**:
- stripe's multiple radii with semantic labels — always take first value.
- apple's "product tiles" have `rounded: "{rounded.none}"` (0px) but `store-utility-card` is 18px. Use a non-tile card for card_radius.

---

### heading_weight

**Format A (stripe, vercel, linear.app)**
- Section: `### Hierarchy` table under `## 3. Typography Rules`
- Format: pipe table with columns including `Weight`.
- Rule: look for the first row whose Role contains "Display Hero", "Display XL", or similar top-level display text; read the `Weight` column.
- stripe: `| Display Hero | sohne-var | 56px (3.50rem) | 300 | ...` → `300`
- vercel: `| Display Hero | Geist | 48px (3.00rem) | 600 | ...` → `600`
- linear.app: `| Display XL | Inter Variable | 72px (4.50rem) | 510 | ...` → `510`

**Format B (airbnb, apple)**
- airbnb YAML: `typography.display-xl.fontWeight: 700` → `700`
- apple YAML: `typography.hero-display.fontWeight: 600` → `600`
- Rule: read the top-most display token's `fontWeight`.

**Quirks**:
- stripe uses weight `300` for display headlines — counter-intuitive, not a data error.
- linear.app uses weight `510` — a fractional variable-font axis value, not a standard CSS keyword integer.
- airbnb's YAML table header is `display-xl` not `Display Hero`; both mean the same thing.

---

### body_line_height

**Format A (stripe, vercel, linear.app)**
- Section: `### Hierarchy` table under `## 3. Typography Rules`
- Format: pipe table. Look for the row whose Role is "Body" (16px standard body).
- stripe: `| Body | sohne-var | 16px (1.00rem) | 300-400 | 1.40 | normal | ...` → `1.40`
- vercel: `| Body Small | Geist | 16px (1.00rem) | 400 | 1.50 | normal | ...` → `1.50`
- linear.app: `| Body | Inter Variable | 16px (1.00rem) | 400 | 1.50 | normal | ...` → `1.50`
- Rule: find the row with role "Body" (or "Body Small") at 16px; read the `Line Height` column.

**Format B (airbnb, apple)**
- airbnb YAML: `typography.body-md.lineHeight: 1.5` → `1.5`
- apple YAML: `typography.body.lineHeight: 1.47` → `1.47`
- Rule: read `typography.body-md.lineHeight` (airbnb) or `typography.body.lineHeight` (apple).

**Quirks**:
- vercel's hierarchy table uses "Body Small" rather than "Body" as the 16px row label.
- stripe lists weight as a range `300-400` in that cell — not a simple integer.
- apple uses 17px (not 16px) as its body size; `typography.body.fontSize: 17px`.

---

### heading_letter_spacing

**Format A (stripe, vercel, linear.app)**
- Section: `### Hierarchy` table under `## 3. Typography Rules`
- Format: pipe table. Look for the "Display Hero" / "Display XL" row; read the `Letter Spacing` column.
- stripe: `| Display Hero | ... | -1.4px | ...` → `-1.4px`
- vercel: `| Display Hero | ... | -2.4px to -2.88px | ...` → take first value `-2.4px`
- linear.app: `| Display XL | ... | -1.584px | ...` → `-1.584px`
- Rule: extract from top-level display row; if a range is given take the first value.

**Format B (airbnb, apple)**
- airbnb YAML: `typography.display-xl.letterSpacing: 0` → `0`
- apple YAML: `typography.hero-display.letterSpacing: -0.28px` → `-0.28px`
- Rule: read `typography.display-xl.letterSpacing` (airbnb) or `typography.hero-display.letterSpacing` (apple).

**Quirks**:
- vercel states a range `"-2.4px to -2.88px"` in a single table cell. Parser must split on " to " and take the first token.
- airbnb's display headline has `letterSpacing: 0` — valid zero value, not a gap.
- Values mix units: some are px strings (`-1.4px`), others are bare numbers (`1.40` for line-height). Letter spacing is consistently px-suffixed when non-zero in Format A.

---

### shadow_intensity

**Format A (stripe, vercel, linear.app)**
- Section: `## 6. Depth & Elevation`
- Format: a pipe table with columns `Level | Treatment | Use`, plus a prose paragraph titled `**Shadow Philosophy**`.
- stripe: multi-layer blue-tinted shadows with alpha up to 0.25 — "dramatic / multi-layer". Signature value: `rgba(50,50,93,0.25) 0px 30px 45px -30px, rgba(0,0,0,0.1) 0px 18px 36px -18px`
- vercel: whisper-level shadows; max alpha 0.08 for borders, 0.04 for elevation. "no shadow / shadow-as-border" philosophy.
- linear.app: dark-surface system; uses inset shadows and `rgba(0,0,0,0.4)` for floating elements. Moderate intensity.
- Rule: classify as `none` / `subtle` / `moderate` / `dramatic` based on: presence of any shadow, highest alpha value seen, multi-layer vs single layer. See classification table in parser spec.

**Format B (airbnb, apple)**
- airbnb: `## Elevation` section contains the single shadow value: `rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px 0, rgba(0,0,0,0.1) 0 4px 8px 0` — subtle.
- apple: `## Elevation & Depth` — states "**Shadow philosophy.** Apple uses **exactly one** drop-shadow... `rgba(0, 0, 0, 0.22) 3px 5px 30px 0`". Single shadow, moderate alpha.

**Quirks**:
- shadow_intensity is a derived/categorical variable, not directly stated. Parser must read the shadow values and classify.
- linear.app is dark-mode-native; its shadows look strong numerically (`0.4` alpha for floating) but are thematically "moderate" because the dark background makes them invisible anyway.
- apple's shadow applies only to product imagery, not UI chrome — this semantic distinction matters for classification.

---

### btn_shape

Derived from `btn_radius`:
- `btn_radius == 9999` (or `full` / `pill` token) → `"pill"`
- `btn_radius >= 20` → `"rounded"`
- `btn_radius <= 8` → `"square"`

Known values:
- stripe: 4px → `"square"`
- vercel: 6px → `"square"`
- linear.app: 6px → `"square"`
- airbnb: 8px → `"square"`
- apple: 9999px → `"pill"`

---

### brand_l, brand_c, brand_h

Derived by converting the primary brand color hex to OKLCH.

**Source for primary hex**:
- stripe: `## 2. Color Palette & Roles → ### Primary` — `**Stripe Purple** (\`#533afd\`)` → first named brand color.
- vercel: no single brand color; nearest is `#171717` (text/UI) — the system is achromatic. Consider using the workflow accent `#ff5b4f` as the accent anchor OR document as `null`.
- linear.app: `### Brand & Accent` — `**Brand Indigo** (\`#5e6ad2\`)`.
- airbnb YAML: `colors.primary: "#ff385c"`.
- apple YAML: `colors.primary: "#0066cc"`.

**Quirks**:
- vercel is achromatic; `brand_c` will be near-zero if `#171717` is used. This is valid — Vercel's design intent is monochrome. Document as intentional low-chroma.
- linear.app's `#5e6ad2` and airbnb's `#ff385c` will produce very different OKLCH hue angles (~280 vs ~15 degrees respectively).
- OKLCH conversion must be done programmatically (see `scripts/analysis/parsers/oklch.ts`).

---

### dark_mode_present

- Section: anywhere — `### Dark Mode` subsection inside Color or Theme, OR Light/Dark column in a table, OR prose mentioning "dark mode" / "dark theme".
- stripe: no dark mode section found anywhere in the file → `false`
- vercel: no dark mode section found → `false`
- linear.app: entire system IS dark-mode-native (`#08090a` background); `## 2. Color Palette & Roles` contains a `### Light Mode Neutrals (for light theme contexts)` subsection → `true`
- airbnb: `## Colors → ### Surface` — explicit prose: "Airbnb does not have a dark mode on the public web." → `false`
- apple: alternating dark tiles are a surface mode, not a theme switch. No dark-mode toggle documented. → `false`

**Quirks**:
- linear.app is the clearest `true` case — the entire system defaults dark.
- apple has dark-colored product tiles but no dark-mode *theme*. The parser should look for explicit dark-mode subsection or "dark mode" prose, not just the presence of dark colors.

---

### gray_chroma

Derived from the "standard" gray neutral hex converted to OKLCH.

**Source for representative gray**:
- stripe: `### Neutral Scale` — `**Body** (\`#64748d\`)` — has visible blue-slate cast; chroma > 0.
- vercel: `### Neutral Scale` — `**Gray 600** (\`#4d4d4d\`)` — neutral gray; chroma ≈ 0.
- linear.app: `### Text & Content` — `**Secondary Text** (\`#d0d6e0\`)` — cool silver with slight blue cast; low chroma.
- airbnb YAML: `colors.muted: "#6a6a6a"` — neutral; chroma ≈ 0.
- apple YAML: `colors.ink-muted-48: "#7a7a7a"` — neutral; chroma ≈ 0.

**Quirks**:
- stripe's body gray `#64748d` has meaningful chroma — it's a brand-tinted gray. This is intentional design.
- "Representative gray" definition: use the mid-tone body/secondary text color for the dominant surface mode (light or dark).

---

### accent_offset

Derived as the hue-angle difference between `brand_h` and any documented accent / secondary color's OKLCH hue.

**Source for accent color**:
- stripe: `### Accent Colors` — `**Ruby** (\`#ea2261\`)` and `**Magenta** (\`#f96bee\`)`.
- vercel: `### Workflow Accent Colors` — `**Ship Red** (\`#ff5b4f\`)`, `**Preview Pink** (\`#de1d8d\`)`, `**Develop Blue** (\`#0a72ef\`)`.
- linear.app: `### Brand & Accent` — `**Accent Violet** (\`#7170ff\`)`.
- airbnb YAML: `colors.luxe: "#460479"` (sub-brand) — but only appears in Luxe sub-brand, not mainline.
- apple: only one color (`#0066cc`). No documented accent. → `accent_offset = null`.

**Quirks**:
- apple has no second color at all → `accent_offset` is not extractable, must be `null`.
- airbnb's Luxe purple is explicitly a sub-brand accent; mainline Airbnb has no secondary accent. Could treat `luxe` as accent with a note, or null.
- vercel has three workflow accents that play three distinct hue roles (red/pink/blue). Pick the first listed (`#ff5b4f`) or document all three.

---

## Format quirks summary

1. **Two fundamentally different formats exist**: numbered-heading prose (stripe/vercel/linear) vs YAML-frontmatter (airbnb/apple). Parsers must detect format type first.

2. **Token references in Format B**: values like `"{rounded.sm}"` are not literal — they must be resolved through the `rounded:` map in the same YAML block. A parser that reads component values without resolving tokens will get wrong results.

3. **Ranges in table cells**: vercel's hierarchy table writes `"-2.4px to -2.88px"` in the Letter Spacing column and `"1.00–1.17 (tight)"` in Line Height. Similar patterns may exist in other Format A files. Parser must handle "X to Y" and "X–Y" range strings by extracting the first number.

4. **Semantic label suffixes on radius values**: stripe writes `- Radius: 4px (tight), 5px (standard), ...`. Parser must strip everything after the first numeric token.

5. **Dark-mode detection**: linear.app is dark-mode-native but has no "Dark Mode" subsection — it IS the dark mode. The signal is `### Light Mode Neutrals` as an alternative-theme subsection. The parser should look for: explicit `### Dark Mode` heading, OR prose containing `"dark mode"` / `"dark theme"`, OR a light-mode-counterpart subsection in an otherwise dark-first file.

6. **Missing sections**: apple has no `## 6. Depth & Elevation` titled section (it uses `## Elevation & Depth`). No shadow values in a `### Shadow Colors` subsection — shadow data is in the prose of the elevation section. Parsers must not hard-fail on missing sections.

7. **Non-standard weight values**: linear.app uses `510` and `590` as fontWeight values (variable font axis, not CSS keywords). These are valid numbers and should not be rounded or rejected.

8. **Apple's body size is 17px not 16px**: when extracting `body_line_height`, the standard 16px heuristic will miss apple. Use `typography.body` (or the row labelled "Body") regardless of font size.

9. **Vercel is achromatic**: brand_c and gray_chroma will both be near-zero. This is correct data, not an extraction error.

10. **apple btn_radius is 9999px**: the primary button is a pill. btn_shape derivation must handle this correctly.
