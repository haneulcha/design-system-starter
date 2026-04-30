# Archetype Revalidation Notebooks

## Setup

```bash
cd docs/research/notebooks
uv sync
uv run jupyter lab
```

Open `2026-04-30-archetype-revalidation.ipynb`.

## Inputs

The notebook reads `../../../data/extracted.json`. Generate it via:

```bash
npx tsx scripts/analysis/fetch.ts
npx tsx scripts/analysis/extract.ts
```

## Outputs

- Inline cells (drift tables, plots, recommendation)
- PNG figures exported to `../figures/2026-04-30/`
