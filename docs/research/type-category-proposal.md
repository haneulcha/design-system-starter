# Starter Typography Category — Proposal v1

_Synthesized from `type-styles-raw.md`, `type-style-dictionary.json`, `type-styles-normalized.md`, `type-size-track.md`, `type-weight-track.md`, `type-line-height-track.md`, `type-letter-spacing-track.md`, `type-font-family-track.md`. Numbers in parentheses are corpus medians from those reports._

## 1. Token architecture (2 tiers)

```
Tier 1 — Scales              size scale + weight scale + line-height scale + 3 font-family chains
Tier 2 — Category profiles   heading.{xs,sm,md,lg,xl} / body.{sm,md,lg} / caption.{xs,sm,md} /
                             code.{xs,sm,md} / button.{sm,md} / card / nav / link / badge
```

Each category profile is a complete typography definition `{ fontFamily, size, weight, lineHeight, letterSpacing }` that resolves through Tier 1 scales. Unlike color (3 tiers with semantic palette + role aliases), typography is naturally 2-tier — there is no "semantic typography palette" worth abstracting between scales and category profiles.

Evidence from corpus: 100% of normalized rows fit cleanly into 9 categories. Per-category sizeVariant pruning (drop `n<5`) eliminated `heading.2xl`, `code.lg`, all `card/nav` variants, all `link` variants except a single value, and `button.lg`. The surviving 18 buckets each have a distinct corpus signal.

## 2. Tier 1 — Scales

**`size` scale (13 stops, px)**

```
[10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64]
```

- v1 category profiles consume **10 of 13** stops; 3 stops (20, 28, 36) are reserved palette values (parallel to color's neutral scale where some stops are unused by aliases but still exposed)
- 11px added specifically for `caption.xs` (corpus mode 10×11, median 11)
- Capped at 64 — `heading.2xl` (median 80px, n=10) dropped as off-scale outlier driven by hero-heavy brands

**`weight` scale (4 stops)**

```
[400, 500, 600, 700]
```

- Covers 88% of corpus weights (649/735 rows). Long-tail weights (300, 800, 900) ignored.
- 700 is exposed but not consumed by any v1 category default — held for raw-token use (e.g., `<strong>`).

**`lineHeight` scale (6 stops, unitless)**

```
[1.0, 1.1, 1.2, 1.3, 1.4, 1.5]
```

- 0.1-step granularity covers every corpus median to within ±0.05.
- 1.0 exposed but only used as a raw-token escape hatch (no v1 category consumes 1.0 by default — `button.md` corpus mode is 1.0 but starter snaps to 1.2 to avoid clipping descenders).

**`letterSpacing` (3 discrete values, em)**

```
[-0.02em, 0em, 0.05em]
```

No formal scale — only three values exist in v1. Em units stay correct as sizes change.

**`fontFamily` (3 fallback chains)**

```
sans:  Inter, Pretendard, "Apple SD Gothic Neo", "Noto Sans KR",
       system-ui, -apple-system, "Segoe UI", Roboto, sans-serif

mono:  "Geist Mono", "IBM Plex Mono", D2Coding, "Noto Sans Mono CJK KR",
       "SF Mono", Consolas, monospace

serif: Georgia, "Noto Serif KR", "Nanum Myeongjo", "Times New Roman", serif
```

- 4-tier fallback strategy: brand primary → Korean web font (Pretendard/D2Coding/Noto Serif KR) → OS-specific Korean → generic web fallback
- Inter + Pretendard share metrics — mixed Latin/Hangul renders without "font hop"

## 3. Tier 2 — Category profiles

| category.variant | family | size | weight | lineHeight | letterSpacing |
| --- | --- | ---: | ---: | ---: | ---: |
| heading.xl | sans | 64 | 500 | 1.1 | −0.02em |
| heading.lg | sans | 48 | 500 | 1.1 | −0.02em |
| heading.md | sans | 32 | 600 | 1.2 | 0 |
| heading.sm | sans | 24 | 600 | 1.3 | 0 |
| heading.xs | sans | 16 | 600 | 1.4 | 0 |
| body.lg | sans | 18 | 400 | 1.5 | 0 |
| body.md | sans | 16 | 400 | 1.5 | 0 |
| body.sm | sans | 14 | 400 | 1.5 | 0 |
| caption.md | sans | 14 | 400 | 1.4 | 0 |
| caption.sm | sans | 12 | 400 | 1.4 | 0 |
| caption.xs | sans | 11 | 400 | 1.3 | 0 |
| code.md | mono | 14 | 400 | 1.5 | 0 |
| code.sm | mono | 12 | 400 | 1.4 | 0 |
| code.xs | mono | 10 | 400 | 1.5 | 0 |
| button.md | sans | 16 | 500 | 1.2 | 0 |
| button.sm | sans | 14 | 500 | 1.3 | 0 |
| card | sans | 24 | 600 | 1.3 | 0 |
| nav | sans | 14 | 500 | 1.4 | 0 |
| link | sans | 14 | 400 | 1.5 | 0 |
| badge | sans | 12 | 600 | 1.4 | 0.05em |

Total: **20 category profiles** (5 heading + 3 body + 3 caption + 3 code + 2 button + 1 card + 1 nav + 1 link + 1 badge).

## 4. Patterns embedded in the defaults

Three patterns shape the table above. Each is a deliberate starter opinion, not a corpus mode:

1. **Inverse heading curve** — heading weight increases as size decreases (`xl/lg=500`, `md/sm/xs=600`); line-height also expands (`xl/lg=1.1`, `md=1.2`, `sm=1.3`, `xs=1.4`). Big sizes establish hierarchy through scale; small headings need extra weight + air to differentiate from body.
2. **Body uniform** — body/code/link all converge on `lineHeight=1.5` and `weight=400` regardless of size. The "comfortable reading" preset.
3. **UI tight** — button/card/nav/badge run at `lineHeight=1.2-1.4` and `weight=500-600`. UI elements need visual weight and don't need reading rhythm.

These patterns live in the table above (no separate enforcement). A user overriding `card.weight = 400` simply opts out of pattern 3 for that category.

## 5. Functional knobs

Three knobs total. All have defaults — minimum required user input is just `fontFamily.sans` override (or nothing, for full defaults).

| knob | options | default | affects |
| --- | --- | --- | --- |
| `fontFamily.sans` | any string (prepended to chain) | `null` (use Inter primary) | replaces or prepends primary brand font |
| `fontFamily.mono` | any string (prepended to chain) | `null` (use Geist Mono primary) | replaces or prepends primary mono font |
| `headingStyle` | `default` (inverse curve) / `flat` (all 400) / `bold` (all 700) | `default` | overrides heading weight pattern across all variants |

Why only three: size/weight/lineHeight/letterSpacing are already opinionated defaults. The corpus signal is strong enough that exposing those as knobs would just re-create the noise the starter is trying to filter. `headingStyle` is the one bundled override worth exposing because it matches a real brand archetype split (elegant vs punchy).

Per-category overrides (`heading.xl.weight = 700`, `body.fontFamily = "serif"`, etc.) are always possible via direct schema edit — knobs are for the common cases.

## 6. User input

**Required (0):** all defaults work standalone.

**Optional:**
- `fontFamily.sans: string` — prepends to sans chain (e.g., `"Mona Sans"`)
- `fontFamily.mono: string` — prepends to mono chain (e.g., `"Berkeley Mono"`)
- `headingStyle: "default" | "flat" | "bold"`

## 7. Output

At all defaults: 20 category profiles emitted, each consuming Tier 1 scales.

| tier | count | source |
| --- | ---: | --- |
| size scale | 13 | base |
| weight scale | 4 | base |
| lineHeight scale | 6 | base |
| letterSpacing values | 3 | base |
| fontFamily chains | 3 | base |
| **Tier 1 total** | **29** | |
| heading.* profiles | 5 | category |
| body.* profiles | 3 | category |
| caption.* profiles | 3 | category |
| code.* profiles | 3 | category |
| button.* profiles | 2 | category |
| card / nav / link / badge | 4 | category |
| **Tier 2 total** | **20** | |
| **Grand total tokens** | **49** | |

For comparison: color category at all defaults emits 9 (neutral) + 5 (accent) + 8 (semantic) + 11 (aliases) = 33 tokens. Typography is heavier because each category profile bundles 5 axes (family, size, weight, lineHeight, letterSpacing).

## 8. Special handling

- **Uppercase variants** — `badge` is the only uppercase-by-default category (letter-spacing 0.05em). Other categories with `modifier: "uppercase"` in the dictionary (e.g., `caption-uppercase`, `button-uppercase`, `sub-heading-uppercase`) are normalized to `badge` during classification. No category-level "uppercase mode" knob.
- **Mono in non-code categories** — corpus has rare entries like "mono caption", "mono body". These map to `code.{sm,md}` (mono family wins, sizing inherits from code track). No separate `mono.body` category.
- **Display vs heading** — corpus distinguished display (very large hero text) from heading (section/subsection). Starter merges into `heading` with size variants `xl` (display) and `md/sm` (section/subsection). The 2xl tier (display-mega/hero-xl, n=10) is dropped per Session C decision.

## 9. Out of scope

- **Responsive scales** — desktop-only profile in v1. Mobile-specific size shifts (e.g., `heading.xl` shrinking to 48 on small screens) are a separate feature.
- **Italic styles** — corpus had near-zero italic data. Italic is a runtime toggle (`<em>`, `font-style: italic`), not a token.
- **Animation/transition** — typography animation is a motion concern, separate track.
- **Multi-script support beyond Korean** — Japanese, Chinese, Arabic, etc. would extend the fallback chains. v1 ships with Korean as the only non-Latin language explicitly supported.
- **OpenType features** — `font-feature-settings` (tabular-nums, ligatures, etc.) handled by individual rendering decisions, not by the category schema.

## 10. Sequencing for code emission

Encode in this order under `src/schema/typography.ts` (parallel to `src/schema/color.ts`):

1. **Scales** — `SIZE_SCALE`, `WEIGHT_SCALE`, `LINE_HEIGHT_SCALE`, `LETTER_SPACING_VALUES`, `FONT_FAMILY_CHAINS` constants
2. **Knob types** — `TypographyInput`, `TypographyKnobs`, `DEFAULT_TYPOGRAPHY_KNOBS`
3. **Category profile defaults** — `CATEGORY_PROFILES` keyed by `${category}.${sizeVariant?}` (e.g., `heading.xl`, `body.md`, `card`)
4. **Generator** — `generateTypographyCategory(input, knobs)` → `TypographyCategoryTokens`
5. **Legacy bridge** — `toLegacyTypographyScales(tokens)` to keep current generator/figma transformer working during migration

Mirrors the color category encoding pattern from `src/schema/color.ts` and `src/generator/color-category.ts`.
