# Phase B Archetype Re-clustering — Design Spec (2026-04-30)

> Follow-up to [`2026-04-30-archetype-revalidation-design.md`](2026-04-30-archetype-revalidation-design.md). The Phase A→B verdict is documented in [`docs/research/2026-04-30-archetype-revalidation.md`](../../research/2026-04-30-archetype-revalidation.md).

## Why

Phase C re-validation (Tasks 12–18 of the prior plan) concluded **Phase B**:

- Silhouette dropped from 0.275 (orig, k=4) to 0.222 (new, k=6) — below the 0.247 threshold.
- 17/30 overlapping systems drifted archetype (56.7%, well above the 20% bar).
- Two of six new clusters are noise from `heading_letter_spacing` parsing outliers (IBM 70, Renault 53, Tesla 48).
- The original 9999 pill sentinel collapses under re-extraction, so Confident and Expressive archetypes evaporate.

Threshold retune (Phase A) cannot recover these archetypes while the data representation is wrong. Phase B fixes the **data representation**, then re-evaluates clustering vs. supervised modeling against the README's 5-mood taxonomy.

## What changes

1. **Two parser fixes** (only the known-broken ones; other gaps deferred to a future plan):
   - `heading_letter_spacing`: clip to `[-6, +2]` px. Anything outside is a parsing artifact, not a real design choice.
   - `btn_radius`: split into `btn_radius_px: number | null` (real px when not pill) plus `is_fully_pill: boolean | null` (categorical flag). The 9999 sentinel disappears from the numeric column.
2. **Two clustering methods** evaluated head-to-head:
   - Gower distance + hierarchical clustering (Ward linkage)
   - Mixed-type GMM (continuous-vars-only fallback if GMM tooling proves unreliable)
   - Pick the winner by silhouette **and** qualitative review of the resulting partition.
3. **Supervised reframe** alongside unsupervised:
   - Manually label all 58 systems with one of the 5 README moods (Clean & Minimal, Warm & Friendly, Bold & Energetic, Professional, Playful & Creative).
   - Train a logistic-regression and a random-forest classifier on the 7+3 variable set.
   - Report per-mood precision/recall and feature importances.
4. **Final report compares unsupervised winner vs. supervised classifier** and produces a single recommendation: continue with the K-means lineage, switch to supervised, or hybrid.

## Out of scope

- Fixing other extraction gaps (`card_radius` 34.5% NaN, `accent_offset` 34.5% NaN). Separate plan.
- Re-tuning generator thresholds. Gated on this report's outcome.
- Adding new variables beyond the existing 7 + 3 + the new `is_fully_pill` flag.

## Decision rules (pre-registered)

After running the notebook end-to-end, the report picks **one** of three paths:

1. **Continue unsupervised:** chosen method silhouette ≥ 0.30 **and** qualitative archetype interpretation is coherent.
2. **Switch to supervised:** classifier macro-F1 ≥ 0.70 on stratified 5-fold CV, **and** unsupervised silhouette < 0.30.
3. **Hybrid (cluster within mood):** classifier macro-F1 ≥ 0.70 **and** within-mood unsupervised silhouette ≥ 0.30 for at least 3 of 5 moods.

If none of these pass, the report flags "insufficient signal in current variable set" and proposes adding new variables in a subsequent plan.

## Test/verification plan

- All existing 240 tests still pass.
- Two new failing tests written first (TDD) for the parser fixes, then made to pass.
- Notebook re-executes deterministically via `uv run jupyter nbconvert --to notebook --execute`.
- Final report has no bracketed `[placeholder]` text (verified by grep).
