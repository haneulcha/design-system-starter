# The Minimum to Start Designing

**design-system-starter** encodes my current answer to one question: *what is the minimum you need before you can start designing?*

It is not the truth — it is a snapshot of my judgment, backed by corpus research on real design systems, and it gets revised as my judgment grows. The revision history is part of the point. ([Identity & non-goals →](docs/IDENTITY.md))

---

## Why a design system at all

A design system's first job is not consistency. It is **pre-paid decisions**.

Every screen you design asks the same questions: what size is this heading, how far apart are these cards, how round is this button, how loud is this shadow. Without a system you re-litigate them every time — and each answer drifts a little. A design system answers them once, in advance, so that designing a screen becomes composition instead of deliberation. Consistency is the side effect, not the goal.

In 2026 there is a second consumer: **AI agents**. An agent building your UI cannot read taste off your existing screens the way a designer absorbs it. It needs the decisions written down. That is why one of this starter's four outputs is a `DESIGN.md` — the system stated in prose, for humans and agents alike.

## The minimum to start

Not a component library. Not a token-management platform. My answer is smaller:

> **Enough decisions, across six categories, that the first screen draws itself.**

The six categories: **color, typography, spacing, radius, elevation, component primitives**. Answer those and you can open an editor — Figma or a code file — and begin. Everything else a mature design system accumulates (governance, theming infrastructure, full component APIs) is downstream of shipping screens, not upstream of the first one.

The minimum also includes a shape: every category emits a **base layer** (primitives — the raw scale) and a **semantic layer** (aliases that reference it). Dark mode only touches the base layer; the semantics cascade. That two-layer shape is, in my judgment, the smallest structure that survives contact with a real product.

## What it's made of

Each category ships **defaults** (what the research answered) and **knobs** (where taste legitimately belongs). Every default has a written lineage — corpus analysis → proposal → rejected options → post-v1 refinements.

| Category | Defaults (fixed) | Knobs (yours) | Rationale |
|---|---|---|---|
| **Color** | Hue-keyed primitives (neutral 9-stop, accent, 4 status hues), semantic aliases, dark mode via neutral inversion | Archetype preset, per-slot hex overrides | [proposal](docs/research/color-category-proposal.md) · [role corpus](docs/research/color-roles-normalized.md) · [status hues](docs/research/status-hue-principles.md) · [semantic layer](docs/research/semantic-layer.md) |
| **Typography** | 13-stop size scale, 4 weights, 6 line-heights, 22 category profiles, CJK-inclusive font chains | Sans/mono family, heading style (`default` / `flat` / `bold`) | [proposal](docs/research/type-category-proposal.md) · [size](docs/research/type-size-track.md) · [line-height](docs/research/type-line-height-track.md) · [letter-spacing](docs/research/type-letter-spacing-track.md) · [families](docs/research/type-font-family-track.md) |
| **Spacing** | 12-stop scale, 8 semantic aliases | Density (`comfortable` / `compact` / `dense`) | [proposal](docs/research/spacing-category-proposal.md) |
| **Radius** | 8-stop scale + 2 specials, 8 tokens | Style (`sharp` / `standard` / `generous` / `pill`) | [proposal](docs/research/radius-category-proposal.md) |
| **Elevation** | 5 levels, base + semantic shadows | Style (`shadow` / `ring` / `flat`) × intensity (`whisper` → `dramatic`) | [proposal](docs/research/elevation-category-proposal.md) |
| **Components** | 6 primitives, alias-only token consumption | Card surface (`outlined` / `elevated` / `filled`), button shape (`rect` / `pill`) | [proposal](docs/research/component-category-proposal.md) · [role corpus](docs/research/component-roles-normalized.md) |

An **archetype preset** (`clean-minimal`, `warm-friendly`, `bold-energetic`, `professional`, `playful-creative`) anchors the palette and sets coherent per-category knob defaults; anything you specify per category wins over the preset.

## The core: the default/knob boundary

The central claim of this project is the boundary itself.

Where good design systems **converge** — body text at 16px, line-height around 1.5, a status red — the value is a *default*, and offering a knob would be manufacturing a decision for you to get wrong. Where good systems **legitimately diverge** — heading weight, density, corner rounding, shadow character — the value is a *knob*, because that is where a brand's taste actually lives.

The corpus research is the evidence for where that line sits. The judgment is mine, and it changes: see the [post-v1 typography refinement](docs/research/type-size-track.md) for what a recorded change of mind looks like. Versions of this starter are versions of a viewpoint.

---

## So, this starter

A handful of knobs in → four files out:

| Output | What it is |
|---|---|
| `DESIGN.md` | The system in prose — an AI-ready spec for humans and agents |
| `design-tokens.css` | CSS custom properties, base + semantic layers, light + dark |
| `tailwind.config.js` | Tailwind preset referencing the CSS variables |
| `figma-system.json` | 7 variable collections + text/effect styles, for Figma MCP |

## Quick Start

**CLI** — five prompts (brand, archetype, sans font, mono font, heading style), writes to `output/`:

```bash
npm install
npm run dev
```

**Web wizard** — the same engine with a live preview and per-category inspector:

```bash
cd web && npm install && npm run dev
```

## Using the outputs

- **CSS**: import `design-tokens.css` into your global stylesheet. Use semantic variables (`--color-bg-canvas`, `--radius-button`, …); dark mode is automatic via `prefers-color-scheme`.
- **Tailwind**: apply `tailwind.config.js` as a preset. Classes resolve to the CSS variables, so themes stay in one place.
- **Figma**: feed `figma-system.json` to Figma MCP tooling (e.g. a `figma-generate-library` flow) to create variables with real light/dark modes.
- **AI-assisted development**: drop `DESIGN.md` into your project and reference it in your agent's context. It is the system's decisions, stated explicitly.

The `#builder` colour picker (a separate flow from the wizard above) exports its own four files, colour only: `palette.css`, `palette.theme.css`, `palette.figma.json`, and a colour-scoped `DESIGN.md`. `palette.css` is framework-free — plain CSS custom properties (`--color-accent-solid`, …) under `:root` and `.dark`, so it drops into any stack. `palette.theme.css` wraps the same variables in a Tailwind v4 `@theme` block instead, which also generates utility classes (`bg-accent-solid`, `text-accent-text`, …) at build time — use it if you're on Tailwind and want the utilities, use `palette.css` otherwise. Pick one, not both; they declare the same variables and would collide. Note what these four files do *not* cover: typography, spacing, radius, elevation, and component tokens still come only from the wizard's outputs above — the `#builder` export is colour-only by design.

## Programmatic API

The core is pure functions with zero Node.js dependencies — the web wizard runs it directly in the browser.

```ts
import { generate } from "design-system-starter/generator";
import { transformToFigma } from "design-system-starter/figma";

const result = generate({
  brandName: "MyBrand",
  preset: "professional",
  fontFamily: "Inter",
  typographyKnobs: { headingStyle: "bold" },
  radiusKnobs: { style: "generous" },
});

// result.designMd      — DESIGN.md string
// result.cssVariables  — design-tokens.css string
// result.tailwindConfig — tailwind.config.js string
// result.tokens        — assembled DesignTokens object

const figma = transformToFigma(result.tokens);
```

## Reproduce the research

Don't take the defaults on faith — the corpus analyses are runnable:

```bash
npm run color-roles      # color role frequency across the corpus
npm run type-styles      # 799 typography styles, normalized and tagged
npm run component-roles  # component primitive roles
```

The method itself is documented in the [category analysis playbook](docs/research/_category-analysis-playbook.md): an 8-phase flow from raw corpus to schema encoding, including the rejected-options log every category keeps.

## Architecture

```
src/schema/     — the answers: category constants, knob types, presets
src/generator/  — pure-function pipeline: knobs → tokens → css/tailwind/DESIGN.md
src/figma/      — tokens → Figma variable collections & styles
src/cli/        — interactive CLI (the only module with Node.js I/O)
web/            — wizard UI: inspector, live preview, downloads
```

## What this is not

No adoption metrics, no token-management platform, no framework matrix, no full component library. The scope ends where designing *starts*. The reasoning: [docs/IDENTITY.md](docs/IDENTITY.md).
