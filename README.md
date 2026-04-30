# Design System Starter

Generate a complete, cohesive design system from 4 inputs. Outputs a DESIGN.md (compatible with [awesome-design-md](https://github.com/VoltAgent/awesome-design-md) format), universal design tokens JSON, and a Figma-ready structure file.

## Quick Start

```bash
npm install
npm run dev
```

Answer 4 questions:

1. **Brand name** — your project or company name
2. **Primary color** — one hex color (e.g. `#5e6ad2`)
3. **Mood** — choose from 5 archetypes
4. **Font** — pick from suggestions or type your own

## Mood Archetypes

| Mood | Vibe | Button Radius | Shadow | Reference |
|------|------|--------------|--------|-----------|
| Clean & Minimal | Restrained, gallery-like | 6px | whisper | Vercel, Linear |
| Warm & Friendly | Approachable, organic | 8px | subtle | Airbnb, Claude |
| Bold & Energetic | Confident, high-contrast | pill (9999px) | dramatic | Spotify, Coinbase |
| Professional | Precise, premium | 4px | medium | Stripe, IBM |
| Playful & Creative | Expressive, colorful | 12px | medium | Figma, Clay |

## Output Files

| File | Purpose |
|------|---------|
| `output/DESIGN.md` | Human + AI readable design system spec (9 sections) |
| `output/design-tokens.json` | Flat tokens for code integration |
| `output/figma-system.json` | Figma MCP-ready: variable collections, text styles, effect styles |

## Web Integration

Core logic has zero Node.js dependencies. Import directly:

```ts
import { generate } from "design-system-starter/generator";
import { transformToFigma } from "design-system-starter/figma";

const result = generate({
  brandName: "MyBrand",
  primaryColor: "#5e6ad2",
  mood: "clean-minimal",
  fontFamily: "Inter",
});

// result.designMd — DESIGN.md string
// result.tokens — design tokens object
// result.system — full DesignSystem object

const figma = transformToFigma(result.tokens);
// figma.variableCollections — color/spacing/radius variables
// figma.textStyles — typography styles
// figma.effectStyles — shadow/elevation styles
```

## Figma Integration

Use `figma-system.json` with Figma MCP tools:

1. Run the generator to produce `output/figma-system.json`
2. Use the `figma-generate-library` skill with the JSON as input
3. The tool creates Figma variables (light/dark modes), text styles, and effect styles

## Module Structure

```
src/schema/     — Role A: types, archetype presets, DESIGN.md template
src/generator/  — Role B: pure-function generation pipeline
src/figma/      — Role C: design tokens → Figma structure
src/cli/        — CLI wrapper (only module with Node.js I/O)
```
