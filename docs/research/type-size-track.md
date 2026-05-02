# Type Size Track (Session C)

_Source: `docs/research/type-styles-normalized.md` — 799 rows tagged with `(category, sizeVariant)` via `docs/research/type-style-dictionary.json`. This document records the size-axis decisions for the typography starter._

## Corpus Summary

- 58 systems · 799 rows · 100% matched
- 9 categories (heading, body, caption, code, button, card, nav, link, badge)
- Per-category sizeVariant distribution (after pruning n<5 buckets):

| category | variants | total rows |
| --- | --- | ---: |
| heading | xs, sm, md, lg, xl | 285 |
| body | sm, md, lg | 150 |
| caption | xs, sm, md | 129 |
| code | xs, sm, md | 52 |
| button | sm, md | 49 |
| card | (single) | 29 |
| nav | (single) | 33 |
| link | (single) | 13 |
| badge | (single) | 36 |

## Pruning Rules Applied

- **`heading.2xl` dropped** (n=10, median 80px). Off-scale outlier driven by hero-heavy brands (Apple, BMW, Lamborghini). Starter caps at xl=64px.
- **All `n<5` buckets dropped**: `code.lg` (n=2), `card.lg` (n=1), `nav.lg` (n=1), `nav.sm` (n=2), `link.lg` (n=1), `button.lg` (n=4).
- **`link` collapsed to single variant** since md(7) and sm(5) both resolved to 14px — variant axis is meaningless when values coincide.

## Final Size Scale

13-stop modal scale (px):

```
[10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64]
```

- **Used by v1 alias**: 10, 11, 12, 14, 16, 18, 24, 32, 48, 64 (10 of 13)
- **Reserved (palette)**: 20, 28, 36 — exposed for downstream additions, not bound to any v1 token
- 11px added specifically for `caption.xs` (corpus mode = 10×11, but median = 11)

## Suggested Starter Token Mapping

| category.variant | px | n | corpus signal |
| --- | ---: | ---: | --- |
| heading.xl | 64 | 57 | mode 64×11, range 28–320 (long tail) |
| heading.lg | 48 | 38 | mode 48×5 / 56×5 (close); 48 picked for scale fit |
| heading.md | 32 | 98 | top 24×13 / 48×13 / 36×11 — wide spread, median = 32 |
| heading.sm | 24 | 74 | mode 24×15, secondary 18×11 / 20×10 (bimodal) |
| heading.xs | 16 | 18 | mode 16×11, very tight |
| body.lg | 18 | 26 | mode 18×14 (strong) |
| body.md | 16 | 106 | mode 16×72 — strongest signal in entire corpus |
| body.sm | 14 | 18 | mode 14×11 |
| caption.md | 14 | 65 | mode 14×41 |
| caption.sm | 12 | 35 | mode 12×21 |
| caption.xs | 11 | 29 | mode 10×11, median 11. 11px chosen to add a fine-grain stop between 10 and 12. |
| code.md | 14 | 23 | mode 14×9 |
| code.sm | 12 | 22 | mode 12×9, median 13 → snapped to 12 |
| code.xs | 10 | 7 | thin but consistent |
| button.md | 16 | 38 | mode 14×17 vs 16×13 — close call; 16 picked to differentiate from `body.md`/`nav` and lift CTA visual weight |
| button.sm | 14 | 11 | mode 14×6 |
| card | 24 | 29 | mode 24×10, secondary 20×5 / 32×5 |
| nav | 14 | 33 | mode 14×15 |
| link | 14 | 13 | merged from md(7) + sm(5), both = 14 |
| badge | 12 | 36 | mode 12×8, secondary 11×6 / 14×4 |

## Notes

- **Bimodal heading.sm** (24 vs 18-20): chose 24 because (a) it dominates by count, (b) it preserves a clean 8px step from heading.xs(16) → heading.sm(24).
- **`button.md` = 16 over 14**: gives CTAs a half-step lift over body copy; resolves ambiguity when button label and body text appear in the same row (cards, list rows).
- **`link.sm` dropped, link single**: keeps the `<a>` token surface area minimal. Designers needing emphasized links can use `link` at any size context (size is inherited from parent).
- **`heading.md` mode dispersion** (24/48/36 nearly equal): this category is the most "branded" — different systems use it for very different purposes (section headings vs feature headings). 32 picked as the middle-of-spread compromise.

## Carry-forward to Sessions D–H

- Session D (weight): per-bucket weight modes, intersect with `[400, 500, 600, 700]`.
- Session E (line-height): tighter for headings, looser for body. Cluster medians per category.
- Session F (letter-spacing): mostly 0; uppercase variants (badge, etc.) likely > 0.
- Session G (font-family): per-system sans/serif/mono distribution.
- Session H (synthesis): combine into `docs/research/type-category-proposal.md` parallel to `color-category-proposal.md`. Translate scale + alias map into `src/schema/typography.ts` with knobs.
