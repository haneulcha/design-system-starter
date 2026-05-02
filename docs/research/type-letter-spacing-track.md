# Type Letter-Spacing Track (Session F)

_Source: `docs/research/type-styles-normalized.md` — `letterSpacingPx` column normalized to em (`letterSpacingPx / sizePx`) per row, grouped by `(category, sizeVariant)`._

## Corpus Summary

- **Default for nearly all buckets: `0em`**. The corpus mode is 0 in every bucket except `badge`.
- Two opt-in exceptions in the starter: large headings (negative tracking) and badge (positive tracking for uppercase).
- Unit: em (size-relative) so values stay correct as sizes change. Output as `em` in CSS, scaled to absolute px in Figma.

## Default Letter-Spacing Per Bucket

| category.variant | letter-spacing | n | corpus median | mode |
| --- | ---: | ---: | ---: | --- |
| heading.xl | −0.02em | 54 | −0.020 | 0×17 / −0.025×7 / −0.020×7 — bimodal |
| heading.lg | −0.02em | 37 | −0.020 | 0×11 / −0.020×5 / −0.010×4 |
| heading.md | 0 | 92 | 0.000 | 0×47 (strong) |
| heading.sm | 0 | 70 | 0.000 | 0×35 |
| heading.xs | 0 | 17 | 0.000 | 0×15 |
| body.lg | 0 | 24 | 0.000 | 0×14 |
| body.md | 0 | 62 | 0.000 | 0×45 |
| body.sm | 0 | 17 | 0.000 | 0×14 |
| caption.md | 0 | 53 | 0.000 | 0×38 |
| caption.sm | 0 | 28 | 0.000 | 0×20 |
| caption.xs | 0 | 26 | 0.000 | 0×16 |
| code.md | 0 | 22 | 0.000 | 0×18 |
| code.sm | 0 | 22 | 0.000 | 0×13 |
| code.xs | 0 | 7 | 0.000 | 0×5 |
| button.md | 0 | 37 | 0.000 | 0×25 |
| button.sm | 0 | 8 | 0.000 | 0×5 |
| card | 0 | 26 | 0.000 | 0×13 |
| nav | 0 | 32 | 0.000 | 0×25 |
| link | 0 | 12 | 0.000 | 0×10 |
| badge | +0.05em | 35 | 0.036 | 0×13 / 0.10×5 / 0.08×4 — bimodal |

## Pattern: Two Opt-In Exceptions

1. **Large headings get negative tracking** — `heading.xl` and `heading.lg` apply `−0.02em`. At 48–64px, default font tracking looks loose; pulling it tighter mirrors the optical adjustment that print typography has used for decades. Mode is 0 in raw data but a meaningful 28–30% of systems apply this refinement; the starter ships it on by default.
2. **Badge gets positive tracking** — `+0.05em`. Badges/tags/overlines are uppercase categories where letter-spacing carries the convention. Mode is 0 in raw data but the secondary cluster (0.08–0.10em across 9 systems) drives this default. 0.05em is a middle-ground that reads as "deliberate" without going caps-lock loud.

All other buckets stay 0em — no tracking. Designers who want tight body or extra-loose captions override per-token.

## Notes

- **No track scale**: unlike size/weight/line-height (where a fixed scale gates the values), letter-spacing has only three values in v1 (`−0.02em`, `0`, `+0.05em`). A 3-stop "scale" is not worth formalizing.
- **`heading.md` stays 0** despite 8 systems applying `−0.01em`: the mode advantage is decisive (47/92 = 51%), and at 32px the optical issue is much smaller than at 48px+.
- **Code mono stays 0** even though some systems apply 0.05em on small mono labels: monospace fonts typically have built-in tracking baked into the metrics.

## Carry-forward to Sessions G–H

- Session G (font-family): orthogonal to letter-spacing. The −0.02em / 0 / +0.05em decisions hold across font families.
- Session H synthesis: letter-spacing folds into per-`(category, sizeVariant)` defaults, completing the 4-axis profile (size, weight, lineHeight, letterSpacing).
