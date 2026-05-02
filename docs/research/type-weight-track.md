# Type Weight Track (Session D)

_Source: `docs/research/type-styles-normalized.md` — `weight` column per row, grouped by `(category, sizeVariant)`. Default weight is the data mode unless overridden by UI convention._

## Corpus Summary

- 4-stop scale: **`[400, 500, 600, 700]`** — covers 88% of all corpus weights (649/735 rows with non-null weight)
- Long-tail weights ignored: 300 (29 rows / 4%), 460/510/590 (vendor-specific), 800/900/100 (rare)
- `weightVariant` aliases (`light`, `medium`, `semibold`, `bold`) **dropped from v1 API** — raw scale `[400, 500, 600, 700]` is exposed directly; categories pick a single default weight per `sizeVariant`

## Default Weight Per Bucket

| category.variant | weight | n | mode |
| --- | ---: | ---: | --- |
| heading.xl | 500 | 56 | 400×15 / 700×12 / 500×10 — trimodal; 500 picked as middle compromise |
| heading.lg | 500 | 38 | 400×13 / 500×8 / 700×6 — 400 leads but inverse pattern keeps 500 |
| heading.md | 600 | 95 | 400×33 / 600×18 / 700×18 — 400 mode but inverse weight applied |
| heading.sm | 600 | 70 | 400×19 / 600×17 / 500×14 — close call; inverse pattern → 600 |
| heading.xs | 600 | 18 | 600×9 (mode) — naturally heaviest |
| body.lg | 400 | 21 | 400×15 (clear) |
| body.md | 400 | 52 | 400×46 — strongest signal in entire weight corpus |
| body.sm | 400 | 17 | 400×16 (clear) |
| caption.md | 400 | 38 | 400×24 |
| caption.sm | 400 | 22 | 400×14 |
| caption.xs | 400 | 24 | 400×10 mode; 700×5 belongs to uppercase variants (handled in badge) |
| code.md | 400 | 20 | 400×15 |
| code.sm | 400 | 18 | 400×13 |
| code.xs | 400 | 7 | 400×4 |
| button.md | 500 | 33 | 500×14 (mode 42%) — clear default-emphasis signal |
| button.sm | 500 | 9 | thin, mirror button.md |
| card | 600 | 27 | 400×12 / 700×6 / 600×4 — data favors 400 but **UI convention** wins (card titles need to read as headings within their containers) |
| nav | 500 | 33 | 500×19 (clear) |
| link | 400 | 11 | 400×7 (clear) — color/underline carry the affordance, weight stays neutral |
| badge | 600 | 34 | 600×17 (clear) — labels always need emphasis vs surrounding body |

## Pattern: Inverse Heading Weight

Heading defaults follow an **inverse weight curve** — the smaller the heading, the heavier the weight:

```
heading.xl (64px) → 500
heading.lg (48px) → 500
heading.md (32px) → 600
heading.sm (24px) → 600
heading.xs (16px) → 600
```

Rationale: large sizes already establish hierarchy through scale, so weight stays light. Small headings (`heading.xs` at 16px is body-size) need weight to differentiate from body copy. This mirrors common SaaS/UI design system patterns (GitHub, Notion, Linear).

This is a deliberate departure from corpus mode in heading.lg / heading.md / heading.sm — those are bimodal in raw data (400 strong, 600 secondary), reflecting two brand archetypes (elegant vs punchy). The starter picks the punchy/UI side; brands wanting the elegant side override per-category in the schema.

## Notes

- **`caption.xs` weight=400 not 700**: corpus shows 700×5 secondary mode, but those rows are uppercase tag/overline patterns that map to `badge` (already weight=600). Pure caption.xs stays 400.
- **`button.sm` n=9 (thin)**: copied from `button.md` since data is too sparse to justify a different weight.
- **No weightVariant alias layer**: raw 4-stop scale is exposed directly. If a user wants "body in semibold", they compose `body.md` + raw weight token `600`. Color does the same: scale tokens always reachable; alias layer only exists where it carries semantic meaning.

## Carry-forward to Sessions E–H

- Session E (line-height): the inverse-weight pattern hints at how line-height should also tighten with size. Verify against corpus.
- Session F (letter-spacing): badge defaults likely positive (uppercase tracking); body/caption near 0; large headings sometimes negative (tight optical kerning).
- Session H (synthesis): default-weight table folds into the schema's `categoryDefaults` — each `(category, sizeVariant)` bucket emits `{ size, weight, lineHeight, letterSpacing }`.
