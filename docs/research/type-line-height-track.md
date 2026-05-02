# Type Line-Height Track (Session E)

_Source: `docs/research/type-styles-normalized.md` — `lineHeight` column per row, grouped by `(category, sizeVariant)`. Scaled and snapped to a 6-stop scale._

## Corpus Summary

- **6-stop scale**: `[1.0, 1.1, 1.2, 1.3, 1.4, 1.5]` (unitless multiplier)
- All buckets snap cleanly to a stop within ±0.05 of corpus median
- Outliers in raw mean (e.g., `heading.xl mean=1.97`) are parser bugs (px values landed in lineHeight column); medians are unaffected and used throughout

## Pattern: Inverse Heading + Loose Body

The corpus reveals two strong patterns:

1. **Heading inverse curve** — large headings run tight, small headings run loose. Mirrors the inverse-weight pattern from Session D: as size shrinks toward body-size, line-height expands to maintain readability.
2. **Body uniform 1.5** — body, code, link all converge on 1.5 regardless of size. This is the universal "comfortable reading" line-height.

```
heading.xl (64px) → 1.1       body.lg (18px) → 1.5
heading.lg (48px) → 1.1       body.md (16px) → 1.5
heading.md (32px) → 1.2       body.sm (14px) → 1.5
heading.sm (24px) → 1.3
heading.xs (16px) → 1.4
```

## Default Line-Height Per Bucket

| category.variant | line-height | n | corpus median | mode |
| --- | ---: | ---: | ---: | --- |
| heading.xl | 1.1 | 52 | 1.05 | 1.00×19 / 1.10×6 / 1.05×5 |
| heading.lg | 1.1 | 38 | 1.10 | 1.00×10 / 1.10×9 |
| heading.md | 1.2 | 92 | 1.20 | 1.20×12 / 1.15×9 |
| heading.sm | 1.3 | 71 | 1.29 | 1.20×11 / 1.30×9 / 1.40×9 (spread) |
| heading.xs | 1.4 | 18 | 1.40 | 1.40×13 (very tight) |
| body.lg | 1.5 | 24 | 1.50 | 1.50×7 / 1.40×5 |
| body.md | 1.5 | 55 | 1.50 | 1.50×30 (strongest signal) |
| body.sm | 1.5 | 17 | 1.50 | 1.50×9 |
| caption.md | 1.4 | 43 | 1.40 | 1.40×13 |
| caption.sm | 1.4 | 24 | 1.35 | 1.33×6 / 1.50×4 — snapped up to match caption.md |
| caption.xs | 1.3 | 22 | 1.33 | 1.33×4 |
| code.md | 1.5 | 21 | 1.50 | 1.50×12 |
| code.sm | 1.4 | 18 | 1.43 | 1.00×4 / 1.50×3 / 1.40×2 (bimodal) |
| code.xs | 1.5 | 6 | 1.50 | thin |
| button.md | 1.2 | 32 | 1.15 | 1.00×14 (mode) — snapped up to 1.2 to avoid clipping descenders |
| button.sm | 1.3 | 8 | 1.29 | 1.00×3 / 1.29×2 |
| card | 1.3 | 26 | 1.25 | 1.25×4 / 1.00×3 / 1.30×3 |
| nav | 1.4 | 31 | 1.40 | 1.40×14 |
| link | 1.5 | 12 | 1.50 | 1.50×7 — inherits from body convention |
| badge | 1.4 | 35 | 1.40 | 1.40×10 |

## Notes

- **`button.md` snapped from 1.0 mode → 1.2**: corpus mode is 1.00 (14/32 systems) but unitless 1.00 risks clipping descenders in many fonts. 1.2 matches the secondary cluster (1.15 mean) and is safer as a starter default.
- **`caption.sm` snapped 1.35 → 1.4**: rounding up matches caption.md, simplifying the caption family to two values (1.4 / 1.3 only).
- **`code.sm` 1.4 over 1.5**: bimodal at 1.0 and 1.5. 1.4 picked as middle compromise — code at smaller sizes still needs breathing room but doesn't need full body-like 1.5.
- **`button.sm` line-height (1.3) > button.md (1.2)**: matches inverse pattern from heading family. Smaller buttons need slightly looser spacing.

## Carry-forward to Sessions F–H

- Session F (letter-spacing): heading large sizes likely take negative tracking (~−0.02em), body/caption near 0, badge/uppercase variants positive (+0.02 to +0.10em). Code monospace is always 0.
- Session H synthesis: line-height values fold into per-`(category, sizeVariant)` defaults alongside size, weight, letterSpacing.
