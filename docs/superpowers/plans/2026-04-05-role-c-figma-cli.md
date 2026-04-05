# Role C: Figma Bridge + CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform design tokens into Figma-compatible structures (variable collections, text styles, effect styles) and provide a CLI interface for the full pipeline.

**Architecture:** `src/figma/` contains pure transformers (no Figma API calls — those happen via MCP at runtime). `src/cli/` is the only module with Node.js I/O dependencies. The Figma transformer parses shadow strings and maps tokens to Figma's data model.

**Tech Stack:** TypeScript, vitest, @inquirer/prompts (CLI only)

**Prerequisite:** Role A (schema) and Role B (generator) must be complete.

---

## File Structure

```
src/
├── figma/
│   ├── index.ts            # barrel export
│   ├── types.ts            # Figma-specific type definitions
│   └── transformer.ts      # DesignTokens → FigmaDesignSystem
└── cli/
    └── index.ts            # interactive prompts + file output
```

---

### Task 1: Figma types

**Files:**
- Create: `src/figma/types.ts`

- [ ] **Step 1: Write Figma types**

```ts
// src/figma/types.ts

export interface FigmaColor {
  r: number; // 0-1
  g: number; // 0-1
  b: number; // 0-1
  a: number; // 0-1
}

export interface FigmaVariable {
  name: string;
  type: "COLOR" | "FLOAT";
  valuesByMode: Record<string, string | number>;
}

export interface FigmaVariableCollection {
  name: string;
  modes: { name: string; modeId: string }[];
  variables: FigmaVariable[];
}

export interface FigmaTextStyle {
  name: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
}

export interface FigmaShadowLayer {
  type: "DROP_SHADOW";
  color: FigmaColor;
  offset: { x: number; y: number };
  radius: number;
  spread: number;
}

export interface FigmaEffectStyle {
  name: string;
  shadows: FigmaShadowLayer[];
}

export interface FigmaDesignSystem {
  variableCollections: FigmaVariableCollection[];
  textStyles: FigmaTextStyle[];
  effectStyles: FigmaEffectStyle[];
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/figma/types.ts
git commit -m "feat(figma): Figma-specific type definitions"
```

---

### Task 2: Figma transformer

**Files:**
- Create: `src/figma/transformer.ts`
- Create: `tests/figma/transformer.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// tests/figma/transformer.test.ts
import { describe, it, expect } from "vitest";
import { transformToFigma, parseShadowString } from "../../src/figma/transformer.js";
import { generate } from "../../src/generator/index.js";

describe("parseShadowString", () => {
  it("parses single rgba shadow", () => {
    const layers = parseShadowString("rgba(0,0,0,0.1) 0px 4px 8px");
    expect(layers).toHaveLength(1);
    expect(layers[0].color.a).toBeCloseTo(0.1);
    expect(layers[0].offset.y).toBe(4);
    expect(layers[0].radius).toBe(8);
  });

  it("parses multi-layer shadow", () => {
    const layers = parseShadowString(
      "rgba(0,0,0,0.08) 0px 1px 2px, rgba(0,0,0,0.04) 0px 2px 4px"
    );
    expect(layers).toHaveLength(2);
    expect(layers[0].color.a).toBeCloseTo(0.08);
    expect(layers[1].color.a).toBeCloseTo(0.04);
  });

  it("parses ring shadow (0 blur, spread as radius)", () => {
    const layers = parseShadowString("#e5e5e5 0px 0px 0px 1px");
    expect(layers).toHaveLength(1);
    expect(layers[0].radius).toBe(0);
    expect(layers[0].spread).toBe(1);
  });

  it("returns empty array for 'none'", () => {
    expect(parseShadowString("none")).toHaveLength(0);
  });
});

describe("transformToFigma", () => {
  const { tokens } = generate({
    brandName: "Test",
    primaryColor: "#5e6ad2",
    mood: "clean-minimal",
    fontFamily: "Inter",
  });
  const figma = transformToFigma(tokens);

  it("creates Colors collection with light/dark modes", () => {
    const colors = figma.variableCollections.find((c) => c.name === "Colors");
    expect(colors).toBeTruthy();
    expect(colors!.modes.map((m) => m.name)).toContain("Light");
    expect(colors!.modes.map((m) => m.name)).toContain("Dark");
    expect(colors!.variables.length).toBeGreaterThanOrEqual(5);
  });

  it("creates Spacing collection", () => {
    const spacing = figma.variableCollections.find((c) => c.name === "Spacing");
    expect(spacing).toBeTruthy();
    expect(spacing!.variables.length).toBeGreaterThanOrEqual(8);
    expect(spacing!.variables[0].type).toBe("FLOAT");
  });

  it("creates Border Radius collection", () => {
    const radius = figma.variableCollections.find((c) => c.name === "Border Radius");
    expect(radius).toBeTruthy();
    expect(radius!.variables.length).toBeGreaterThanOrEqual(5);
  });

  it("creates text styles from typography tokens", () => {
    expect(figma.textStyles.length).toBeGreaterThanOrEqual(12);
    const hero = figma.textStyles.find((s) => s.name === "Display Hero");
    expect(hero).toBeTruthy();
    expect(hero!.fontSize).toBe(48);
  });

  it("creates effect styles from elevation tokens", () => {
    expect(figma.effectStyles.length).toBeGreaterThanOrEqual(2);
    const raised = figma.effectStyles.find((s) => s.name === "Raised");
    expect(raised).toBeTruthy();
    expect(raised!.shadows.length).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npx vitest run tests/figma/transformer.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement transformer.ts**

```ts
// src/figma/transformer.ts
import type { DesignTokens } from "../schema/types.js";
import type {
  FigmaDesignSystem,
  FigmaVariable,
  FigmaVariableCollection,
  FigmaTextStyle,
  FigmaEffectStyle,
  FigmaShadowLayer,
  FigmaColor,
} from "./types.js";

function hexToFigmaColor(hex: string): FigmaColor {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16) / 255,
    g: parseInt(clean.slice(2, 4), 16) / 255,
    b: parseInt(clean.slice(4, 6), 16) / 255,
    a: 1,
  };
}

function parseRgba(rgba: string): FigmaColor | null {
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!match) return null;
  return {
    r: parseInt(match[1]) / 255,
    g: parseInt(match[2]) / 255,
    b: parseInt(match[3]) / 255,
    a: match[4] ? parseFloat(match[4]) : 1,
  };
}

function parseColorToken(token: string): FigmaColor | null {
  if (token.startsWith("#")) return hexToFigmaColor(token);
  if (token.startsWith("rgb")) return parseRgba(token);
  return null;
}

export function parseShadowString(shadow: string): FigmaShadowLayer[] {
  if (shadow === "none") return [];

  const layers: FigmaShadowLayer[] = [];
  // Split on comma that's NOT inside parentheses
  const parts = shadow.split(/,\s*(?![^(]*\))/);

  for (const part of parts) {
    const trimmed = part.trim();
    // Pattern: color offsetX offsetY blur [spread]
    // Color can be rgba(...) or #hex
    let color: FigmaColor | null = null;
    let nums: number[] = [];

    // Try rgba first
    const rgbaMatch = trimmed.match(/(rgba?\([^)]+\))\s+(.*)/);
    if (rgbaMatch) {
      color = parseRgba(rgbaMatch[1]);
      nums = rgbaMatch[2].split(/\s+/).map((n) => parseFloat(n) || 0);
    } else {
      // Try hex color at start
      const hexMatch = trimmed.match(/(#[0-9a-fA-F]{6})\s+(.*)/);
      if (hexMatch) {
        color = hexToFigmaColor(hexMatch[1]);
        nums = hexMatch[2].split(/\s+/).map((n) => parseFloat(n) || 0);
      }
    }

    if (color && nums.length >= 3) {
      layers.push({
        type: "DROP_SHADOW",
        color,
        offset: { x: nums[0], y: nums[1] },
        radius: nums[2],
        spread: nums[3] ?? 0,
      });
    }
  }

  return layers;
}

function buildColorCollection(tokens: DesignTokens): FigmaVariableCollection {
  const lightMode = "light-mode";
  const darkMode = "dark-mode";

  // Find shared keys between light and dark
  const lightKeys = Object.keys(tokens.color.light);
  const darkKeys = Object.keys(tokens.color.dark);
  const allKeys = [...new Set([...lightKeys, ...darkKeys])];

  const variables: FigmaVariable[] = allKeys.map((key) => ({
    name: `color/${key}`,
    type: "COLOR" as const,
    valuesByMode: {
      [lightMode]: tokens.color.light[key] ?? tokens.color.dark[key],
      [darkMode]: tokens.color.dark[key] ?? tokens.color.light[key],
    },
  }));

  return {
    name: "Colors",
    modes: [
      { name: "Light", modeId: lightMode },
      { name: "Dark", modeId: darkMode },
    ],
    variables,
  };
}

function buildFloatCollection(
  name: string,
  values: Record<string, number>
): FigmaVariableCollection {
  const defaultMode = "default";
  const variables: FigmaVariable[] = Object.entries(values)
    .filter(([, v]) => v >= 0) // exclude special markers like -1
    .map(([key, value]) => ({
      name: `${name.toLowerCase()}/${key}`,
      type: "FLOAT" as const,
      valuesByMode: { [defaultMode]: value },
    }));

  return {
    name,
    modes: [{ name: "Default", modeId: defaultMode }],
    variables,
  };
}

function buildTextStyles(tokens: DesignTokens): FigmaTextStyle[] {
  return Object.entries(tokens.typography.styles).map(([key, style]) => {
    // Convert kebab-case to Title Case
    const name = key
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    return {
      name,
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      lineHeight: style.lineHeight,
      letterSpacing: style.letterSpacing,
    };
  });
}

function buildEffectStyles(tokens: DesignTokens): FigmaEffectStyle[] {
  return Object.entries(tokens.elevation).map(([name, shadow]) => {
    const styleName = name
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    return {
      name: styleName,
      shadows: parseShadowString(shadow),
    };
  });
}

export function transformToFigma(tokens: DesignTokens): FigmaDesignSystem {
  return {
    variableCollections: [
      buildColorCollection(tokens),
      buildFloatCollection("Spacing", tokens.spacing),
      buildFloatCollection("Border Radius", tokens.borderRadius),
    ],
    textStyles: buildTextStyles(tokens),
    effectStyles: buildEffectStyles(tokens),
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/figma/transformer.test.ts`
Expected: all PASS.

- [ ] **Step 5: Create barrel export**

```ts
// src/figma/index.ts
export { transformToFigma, parseShadowString } from "./transformer.js";
export type * from "./types.js";
```

- [ ] **Step 6: Commit**

```bash
git add src/figma/ tests/figma/
git commit -m "feat(figma): design tokens to Figma structure transformer"
```

---

### Task 3: CLI entry point

**Files:**
- Create: `src/cli/index.ts`

- [ ] **Step 1: Implement CLI**

```ts
#!/usr/bin/env node
// src/cli/index.ts
import { input, select } from "@inquirer/prompts";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { generate } from "../generator/index.js";
import { getArchetype, ARCHETYPES } from "../schema/archetypes.js";
import { transformToFigma } from "../figma/transformer.js";
import type { MoodArchetype } from "../schema/types.js";

async function main() {
  console.log("\n  Design System Starter\n");
  console.log("  Answer 4 questions to generate a complete design system.\n");

  const brandName = await input({
    message: "Brand name:",
    validate: (v) => v.trim().length > 0 || "Brand name is required",
  });

  const primaryColor = await input({
    message: "Primary brand color (hex):",
    default: "#5e6ad2",
    validate: (v) =>
      /^#[0-9a-fA-F]{6}$/.test(v.trim()) || "Enter a valid hex (e.g. #5e6ad2)",
  });

  const mood = await select<MoodArchetype>({
    message: "Design mood:",
    choices: (Object.values(ARCHETYPES) as { mood: MoodArchetype; label: string; description: string }[]).map((a) => ({
      value: a.mood,
      name: `${a.label} — ${a.description}`,
    })),
  });

  const archetype = getArchetype(mood);
  const fontChoice = await select({
    message: "Primary font:",
    choices: [
      ...archetype.suggestedFonts.map((f) => ({
        value: f.name,
        name: `${f.name} (${f.fallback})`,
      })),
      { value: "__custom__", name: "Custom (type your own)" },
    ],
  });

  const resolvedFont =
    fontChoice === "__custom__"
      ? await input({ message: "Font family name:" })
      : fontChoice;

  console.log("\n  Generating...\n");

  const result = generate({
    brandName: brandName.trim(),
    primaryColor: primaryColor.trim(),
    mood,
    fontFamily: resolvedFont,
  });

  const figmaData = transformToFigma(result.tokens);

  const outDir = join(process.cwd(), "output");
  mkdirSync(outDir, { recursive: true });

  writeFileSync(join(outDir, "DESIGN.md"), result.designMd, "utf-8");
  writeFileSync(
    join(outDir, "design-tokens.json"),
    JSON.stringify(result.tokens, null, 2),
    "utf-8"
  );
  writeFileSync(
    join(outDir, "figma-system.json"),
    JSON.stringify(figmaData, null, 2),
    "utf-8"
  );

  console.log("  Generated:");
  console.log("    output/DESIGN.md            Design system definition");
  console.log("    output/design-tokens.json   Universal design tokens");
  console.log("    output/figma-system.json    Figma MCP-ready structure");
  console.log("");
  console.log("  Next steps:");
  console.log("    1. Review and customize output/DESIGN.md");
  console.log("    2. Use figma-system.json with Figma MCP to create Figma variables");
  console.log("    3. Copy DESIGN.md into your project for AI-assisted development");
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Test manually**

Run: `npx tsx src/cli/index.ts`
Answer: "TestBrand", "#5e6ad2", "Clean & Minimal", "Inter"
Expected: 3 files in output/ directory.

- [ ] **Step 3: Verify output files**

Run: `ls -la output/ && head -20 output/DESIGN.md`
Expected: DESIGN.md starts with `# Design System: TestBrand`, design-tokens.json and figma-system.json exist.

- [ ] **Step 4: Commit**

```bash
git add src/cli/index.ts
git commit -m "feat(cli): interactive design system generator"
```

---

### Task 4: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write README**

```md
# Design System Starter

Generate a complete, cohesive design system from 4 inputs. Outputs a DESIGN.md (compatible with [awesome-design-md](https://github.com/nicepkg/awesome-design-md) format), universal design tokens JSON, and a Figma-ready structure file.

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
```

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: all tests PASS.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: README with usage, web integration, and Figma guide"
```
