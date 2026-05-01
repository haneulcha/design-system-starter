# Phase C Lean — 2026-05-01

> Quick follow-up to [`2026-04-30-archetype-phase-b.md`](2026-04-30-archetype-phase-b.md). Goal: see whether **4 cheap new variables** break the Phase B impasse and produce mood-interpretable clusters. They didn't — closing the clustering thread and pivoting to hand-curation.

## What changed

Added 4 variables to the extraction pipeline:

| Variable | Failure rate | Notes |
|---|---|---|
| `typography_has_serif` | 1.7% | Boolean. Strict regex (named families + word boundaries); only Claude trips true. |
| `font_family_count` | 1.7% | Distinct first-token font families. Spread 1–10, median 4. |
| `color_palette_size` | 1.7% | Color-token count. Spread 2–29, median 19. |
| `spacing_range_ratio` | 5.2% | max/min spacing token, capped to [1, 200]px. Spread 5–200, median 40. |

All four wired through both Format A (markdown) and Format B (YAML) extraction paths with TDD coverage (14 new tests, 267/267 total pass).

## Clustering results

### Combined: original 10 + 4 new variables (Gower hierarchical)

| k | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|
| silhouette | 0.132 | 0.117 | **0.164** | 0.128 | 0.123 |

**Identical partition to Phase B.** Same 5 clusters, same mega-cluster of 27 (airbnb, apple, bmw, claude, …), same singleton (Renault). The 4 new variables get absorbed by Gower's per-feature normalization and don't shift the partition meaningfully.

### Subspace: 4 new variables only (Gower hierarchical)

| k | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|
| silhouette | **0.332** | 0.296 | 0.323 | 0.285 | 0.251 |

Best k=3 silhouette 0.332 — narrowly above the 0.30 threshold, but the partition is degenerate:

| cluster | n | description |
|---|---:|---|
| 1 | 5 | framer, lovable, replicate, together.ai, warp — high spacing range, small palette |
| 2 | 52 | corpus mega-cluster |
| 3 | 1 | claude (singleton — the only true-serif system) |

The "above-threshold" silhouette is mathematical illusion: the 1-system cluster sits far from the 52-cluster centroid and inflates the score. Not a real partition.

## Decision-rule check

Pre-agreed fallback trigger (per session notes):

> "5개 이상 cluster 중 3개 이상이 mega-cluster (n≥20) 없이 멤버 8-15개로 깔끔하게 갈라지면 → 진행. mega-cluster 또 나오거나 singleton 많으면 → Path 2 fallback."

Combined partition has 5 clusters but only 2 fall into the 8-15 range (cluster 1 with 13 members, cluster 4 with 13 members). The other three are mega(27), tiny(4), singleton(1). **Trigger fires: fallback.**

## What we learned (worth saving)

1. **The mega-cluster of 27 is structural, not parameter-dependent.** It survived three different partition recipes (K-means, Gower, GMM) and ignored 4 new variables. Half the corpus genuinely sits in a "neutral / unspecified" zone for the kind of features we can extract automatically.
2. **`typography_has_serif` is too rare to be informative.** 1 of 58 systems uses a serif primary face (Claude, with Tiempos). That's a true population fact, not an extraction limit — modern web design systems are overwhelmingly sans-only.
3. **The Phase A → B → C-lean arc converges on the same diagnosis:** automated extraction of the awesome-design-md corpus does not yield enough discrete signal to reproduce a 4-7 mood partition. The signal is in things automated extractors can't see — typographic pairing, photographic vs. illustrative imagery, motion language, layout density.

## Recommendation

Stop trying to derive moods from clustering. The data has spoken three times. **Pivot to Path 2: hand-curate moods directly.**

Concrete next steps for Path 2 (separate plan):

1. Re-open `mood_labels.csv` and re-look at every row with the analysis we have (centroids per cluster, brand_c/h/l, body_lh, btn_radius, font count, palette size). Refine to 4-7 moods that the curator can defend looking at any individual system.
2. For each mood, compute representative token presets (median radius, modal shadow, modal shape, brand-color guidance).
3. Build a small generator-side mapping: `mood → tokens` direct table, replacing `src/schema/archetypes.ts`.
4. The clustering work in Phase A/B/C-lean stays in `docs/research/` as the empirical record of *why* clustering was abandoned. Not deleted — that history is load-bearing for any future "should we try clustering again?" question.

The four extraction-parser additions (`typography_has_serif`, `font_family_count`, `color_palette_size`, `spacing_range_ratio`) are correct improvements regardless of clustering outcome. They land on `feat/archetype-phase-c-lean` as part of this PR and become available to any downstream Path 2 curation script (e.g., for filtering "all systems with font_family_count ≥ 5" when sanity-checking a "playful" mood).
