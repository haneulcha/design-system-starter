# Archetype Re-validation — Design Spec

> Phase C: Quantitative re-analysis of the awesome-design-md corpus to validate or refine the archetypes derived from the original 54-system study (K=4 in the original clustering: Precise, Confident, Expressive, Pill+Light; the public-facing README exposes a 5-mood UX that may or may not align with the K-means partition).

**Date:** 2026-04-30
**Status:** Approved for planning

---

## Goal

Re-extract structured variables from the *current* awesome-design-md corpus using the same methodology as the original 2026-04 study, then compare cluster stability and individual system drift against the original findings. Produce a research report that decides whether Phase A (retune existing archetype thresholds) is sufficient or whether Phase B (add new generator dimensions) is warranted.

A secondary aim: surface whether the README-exposed 5-mood taxonomy still maps cleanly onto the K-means partition (the original study found K=4 optimal, K=5 produced a 2-system splinter group). The report should explicitly answer this.

This phase is **research only** — no changes to `src/` or generator outputs.

## Non-Goals

- Adding new variables to the generator's input/output (deferred to Phase B if triggered).
- Manual qualitative review of every system (we rely on structured extraction).
- Reproducing the original 10-system color analysis verbatim — color variables are folded into the unified extraction here.

## Methodology Overview

Three-stage pipeline:

1. **Extraction (TypeScript)** — fetch corpus, parse DESIGN.md sections by heading, emit a flat JSON record per system.
2. **Analysis (Python notebook)** — load JSON, run K-means with cluster-count search, compute silhouette / Calinski-Harabasz, identify drift vs. original assignments.
3. **Reporting (Markdown)** — curated narrative summarising sample changes, cluster stability, variable distributions, drift, and Phase A vs. B recommendation.

## Variables Extracted (13)

### Original 7 (preserved for direct comparability)

| Variable | Source section | Type |
|---|---|---|
| `btn_radius` | `## Buttons` | px (number) |
| `card_radius` | `## Cards` | px (number) |
| `heading_weight` | `## Typography` (Display Hero) | font-weight (number) |
| `body_line_height` | `## Typography` (Body) | unitless (number) |
| `heading_letter_spacing` | `## Typography` (Display Hero) | px (number) |
| `shadow_intensity` | `## Elevation` | ordinal 0–4 (none/whisper/subtle/medium/dramatic) |
| `btn_shape` | `## Buttons` | ordinal 0–3 (sharp/standard/rounded/pill) |

### Color 3 (OKLCH, via culori)

| Variable | Source | Type |
|---|---|---|
| `brand_l` | `## Colors` (brand primary) | 0–1 |
| `brand_c` | `## Colors` (brand primary) | 0–~0.4 |
| `brand_h` | `## Colors` (brand primary) | 0–360 |

### New 3 (trivial-extract additions)

| Variable | Source | Type |
|---|---|---|
| `dark_mode_present` | `## Modes` or dark token presence | boolean |
| `gray_chroma` | `## Colors` (gray-500 OKLCH C) | 0–~0.05 |
| `accent_offset` | `## Colors` (accent_h − brand_h, mod 360) | degrees |

Records with any extraction failure are stored with explicit `null` and excluded from clustering. The exclusion count is reported.

## Pipeline Stages

### Stage 1: Extraction (TypeScript)

Location: `scripts/analysis/`

| File | Responsibility |
|---|---|
| `fetch.ts` | Shallow-clone awesome-design-md to `data/raw-repo/`, enumerate DESIGN.md files, copy raw markdown to `data/raw/{system}.md`. Re-runs are idempotent (clean `data/raw-repo/` first). |
| `extract.ts` | For each `data/raw/*.md`, locate sections by heading regex, parse each variable. Emit `data/extracted.json` (array of records). |
| `types.ts` | Shared `ExtractedRecord` shape. |

Each variable has its own pure parser function (`parseBtnRadius(section: string): number | null`, etc.) so individual extractors can be unit-tested. Acquisition (`fetch.ts`) and parsing (`extract.ts`) stay isolated — extraction only ever touches local files.

**Source acquisition:** `git clone --depth 1 https://github.com/nicepkg/awesome-design-md data/raw-repo` (no rate limit, fast).

**Run:** `npx tsx scripts/analysis/fetch.ts && npx tsx scripts/analysis/extract.ts`

### Stage 2: Analysis (Python notebook)

Location: `docs/research/notebooks/2026-04-30-archetype-revalidation.ipynb`

**Environment:** `uv` with a notebook-local `pyproject.toml`. Dependencies: `pandas`, `numpy`, `scikit-learn`, `matplotlib`, `seaborn`. The notebook runs against `../../../data/extracted.json`.

Notebook sections:

1. **Load & sanity check** — record count, extraction failure rate per variable.
2. **Univariate distributions** — histogram of every variable, side-by-side with the original 54-system means.
3. **Baseline re-clustering** — re-run K-means on the original 54-system raw table (recovered from `docs/research/archetype-clustering.md`) to obtain a baseline silhouette score under the same code path, so the new corpus is compared like-for-like.
4. **Cluster-count search** — k=3..7 K-means with `n_init=10`, plot silhouette and Calinski-Harabasz; identify the recommended k. Highlight whether k=4 (original optimum) still wins.
5. **Cluster characterization** — for the recommended k, centroid table + box plot per variable; map clusters back to the original archetypes (Precise/Confident/Expressive/Pill+Light) by centroid nearest-neighbour matching.
6. **Drift analysis** — for systems present in both old and new corpora, compute archetype assignment change. Tabulate movers and inspect their variable changes.
7. **New-variable inspection** — distributions and inter-cluster separation contributed by `dark_mode_present`, `gray_chroma`, `accent_offset`. Compute silhouette uplift if each new variable is added to the feature set. Near-constant variables flagged as saturated.
8. **README mood ↔ cluster mapping** — explicit table comparing the 5 README moods to the K-means clusters. Note any non-1:1 mappings.
9. **Phase A vs B recommendation** — explicit decision rule:
   - **Phase A only** if recommended-k silhouette ≥ baseline × 0.9 *and* drift count < 20% of overlapping systems *and* no new variable contributes ≥ 0.05 silhouette uplift.
   - **Phase B** if any of those conditions fails. The triggering condition(s) are named in the report.

### Stage 3: Reporting

Location: `docs/research/2026-04-30-archetype-revalidation.md`

This is a **curated narrative report**, not a raw notebook export. Sections:

- Methodology (brief — link to this spec)
- Sample changes (old N=54 → new N, additions/removals listed)
- Baseline vs new silhouette / Calinski-Harabasz / recommended k
- Per-archetype centroid comparison (table; old vs new for each cluster)
- Variable drift highlights
- Drift findings (notable system movers)
- New-variable contribution (silhouette uplift per variable)
- README 5-mood ↔ K-means cluster mapping (table + commentary)
- **Recommendation:** Phase A vs B with the decision rule's evidence

Plots from the notebook are exported as PNG to `docs/research/figures/2026-04-30/` and referenced from the report.

## File Layout

| Path | Purpose | Tracked |
|---|---|---|
| `scripts/analysis/fetch.ts` | Corpus acquisition | ✓ |
| `scripts/analysis/extract.ts` | Variable extraction | ✓ |
| `scripts/analysis/types.ts` | Shared types | ✓ |
| `scripts/analysis/parsers/*.ts` | Per-variable parsers | ✓ |
| `tests/analysis/parsers.test.ts` | Parser unit tests | ✓ |
| `docs/research/notebooks/2026-04-30-archetype-revalidation.ipynb` | Analysis notebook | ✓ |
| `docs/research/notebooks/pyproject.toml` | uv-managed env | ✓ |
| `docs/research/figures/2026-04-30/*.png` | Exported plots | ✓ |
| `docs/research/2026-04-30-archetype-revalidation.md` | Final report | ✓ |
| `data/raw-repo/` | Cloned awesome-design-md | gitignored |
| `data/raw/*.md` | Per-system raw markdown | gitignored |
| `data/extracted.json` | Structured records | gitignored |

`.gitignore` gets an entry for `/data/`.

## Testing Strategy

- **Parser unit tests** — each `parseX(section: string)` function has positive and negative cases derived from a sample of real DESIGN.md sections (kept as fixtures in `tests/analysis/fixtures/`). Includes malformed input → returns `null`.
- **Extraction smoke test** — runs `extract.ts` against a 3-system fixture set and asserts the JSON shape.
- No tests for the notebook itself — the notebook's contract is the published report.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| awesome-design-md format drift (renamed sections) | Heading regex tolerates common variants; failure rate per variable reported in stage 2.1. If > 30% failure on any variable, flag for parser update before clustering. |
| Original 54-system archetype assignments not stored | Recover from `docs/research/archetype-clustering.md` raw data table. If a system from the original list is missing from the new corpus, it's excluded from drift analysis but kept in distribution stats. |
| New variables may cluster trivially (e.g., `dark_mode_present` is now near-universal) | Stage 2.7 explicitly tests separation contribution; near-constant variables get noted as "saturated" and excluded from Phase B candidacy. |
| Python env complexity | `uv` keeps it isolated to the notebooks directory. The TypeScript pipeline runs without Python at all. |

## Out of Scope

- Updates to `src/generator/` archetype presets (that's Phase A or B, gated on this report's recommendation).
- Re-running the existing color chroma analysis as a separate document — folded into this unified extraction.
- Live monitoring / scheduled re-analysis (one-shot for now).

## Open Questions

None remaining at design time.
