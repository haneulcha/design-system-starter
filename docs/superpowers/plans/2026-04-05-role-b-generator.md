# Role B: Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the pure-function generation pipeline that takes 4 user inputs and produces a complete DesignSystem, DESIGN.md string, and design-tokens.json — with zero I/O dependencies.

**Architecture:** Each generator module is a pure function: inputs in, data out. The orchestrator (`index.ts`) wires them together. All modules import types from `src/schema/` (Role A output). No `fs`, `path`, or `process` imports anywhere in `src/generator/`.

**Tech Stack:** TypeScript, culori (oklch color space), vitest

**Prerequisite:** Role A (schema) must be complete.

---

## File Structure

```
src/generator/
├── index.ts          # generate(UserInputs) → GenerateResult
├── color.ts          # generatePalette(hex, undertone) → ColorPalette
├── typography.ts     # generateTypography(archetype, font) → TypographySystem
├── components.ts     # generateComponents(palette, archetype) → ComponentSpecs
├── layout.ts         # generateLayout(archetype) → LayoutSystem
├── elevation.ts      # generateElevation(archetype, palette) → ElevationSystem
├── responsive.ts     # generateResponsive() → ResponsiveSystem
└── tokens.ts         # generateTokens(DesignSystem) → DesignTokens
```

---

### Task 1: Color palette generation

**Files:**
- Create: `src/generator/color.ts`
- Create: `tests/generator/color.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// tests/generator/color.test.ts
import { describe, it, expect } from "vitest";
import { generatePalette } from "../../src/generator/color.js";

describe("generatePalette", () => {
  it("generates correct structure from hex + neutral undertone", () => {
    const p = generatePalette("#5e6ad2", "neutral");
    expect(p.primary).toHaveLength(3);
    expect(p.accent).toHaveLength(2);
    expect(p.neutral.length).toBeGreaterThanOrEqual(8);
    expect(p.semantic).toHaveLength(4);
    expect(p.surface.length).toBeGreaterThanOrEqual(3);
    expect(p.border.length).toBeGreaterThanOrEqual(2);
    expect(p.dark.surface.length).toBeGreaterThanOrEqual(3);
    expect(p.dark.text.length).toBeGreaterThanOrEqual(2);
    expect(p.dark.border.length).toBeGreaterThanOrEqual(2);
  });

  it("all hex values are valid 6-digit hex", () => {
    const p = generatePalette("#c96442", "warm");
    const all = [
      ...p.primary, ...p.accent, ...p.neutral, ...p.semantic,
      ...p.surface, ...p.border, ...p.dark.surface, ...p.dark.text,
    ];
    for (const c of all) {
      expect(c.hex, `${c.name} has invalid hex: ${c.hex}`).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("warm undertone neutrals mention warm", () => {
    const p = generatePalette("#c96442", "warm");
    expect(p.neutral.some((c) => c.description.toLowerCase().includes("warm"))).toBe(true);
  });

  it("cool undertone neutrals mention cool", () => {
    const p = generatePalette("#0a72ef", "cool");
    expect(p.neutral.some((c) => c.description.toLowerCase().includes("cool"))).toBe(true);
  });

  it("accent differs from primary", () => {
    const p = generatePalette("#5e6ad2", "neutral");
    expect(p.accent[0].hex).not.toBe(p.primary[0].hex);
  });

  it("semantic has success, error, warning, info", () => {
    const p = generatePalette("#5e6ad2", "neutral");
    const names = p.semantic.map((c) => c.name);
    expect(names).toContain("Success Green");
    expect(names).toContain("Error Red");
    expect(names).toContain("Warning Amber");
    expect(names).toContain("Info Blue");
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npx vitest run tests/generator/color.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement color.ts**

```ts
// src/generator/color.ts
import { parse, formatHex, converter } from "culori";
import type { ColorPalette, NeutralUndertone, ColorRole } from "../schema/types.js";

const toOklch = converter("oklch");

interface Oklch {
  mode: "oklch";
  l: number;
  c: number;
  h?: number;
}

function hexToOklch(hex: string): Oklch {
  const parsed = parse(hex);
  if (!parsed) throw new Error(`Invalid hex: ${hex}`);
  const result = toOklch(parsed);
  return { mode: "oklch", l: result.l, c: result.c ?? 0, h: result.h };
}

function toHex(color: Oklch): string {
  const raw = formatHex({ mode: "oklch", l: color.l, c: color.c, h: color.h });
  return raw ?? "#000000";
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

function shiftHue(h: number | undefined, deg: number): number {
  return (((h ?? 0) + deg) % 360 + 360) % 360;
}

function neutralHue(primaryHue: number, undertone: NeutralUndertone): number {
  if (undertone === "warm") return 70;
  if (undertone === "cool") return 250;
  return primaryHue;
}

function neutralChroma(undertone: NeutralUndertone): number {
  return undertone === "neutral" ? 0.003 : 0.012;
}

function undertoneLabel(undertone: NeutralUndertone): string {
  if (undertone === "neutral") return "";
  return ` with ${undertone} undertone`;
}

export function generatePalette(primaryHex: string, undertone: NeutralUndertone): ColorPalette {
  const pri = hexToOklch(primaryHex);
  const hue = pri.h ?? 260;
  const nHue = neutralHue(hue, undertone);
  const nChroma = neutralChroma(undertone);
  const ut = undertoneLabel(undertone);

  const primary: ColorRole[] = [
    { name: "Brand Primary", hex: formatHex(parse(primaryHex)!)!, description: "Core brand color. CTAs, links, active states." },
    { name: "Brand Dark", hex: toHex({ mode: "oklch", l: clamp(pri.l - 0.15, 0.1, 0.9), c: pri.c, h: hue }), description: "Darker brand variant. Hover states, pressed buttons." },
    { name: "Brand Light", hex: toHex({ mode: "oklch", l: clamp(pri.l + 0.2, 0.1, 0.95), c: clamp(pri.c * 0.4, 0, 0.15), h: hue }), description: "Lighter brand tint. Badges, selected state backgrounds." },
  ];

  const accentHue = shiftHue(hue, 150);
  const accent: ColorRole[] = [
    { name: "Accent", hex: toHex({ mode: "oklch", l: 0.6, c: 0.12, h: accentHue }), description: "Secondary accent for highlights and decorative elements." },
    { name: "Accent Light", hex: toHex({ mode: "oklch", l: 0.88, c: 0.04, h: accentHue }), description: "Soft accent surface for badges and tags." },
  ];

  const neutralSteps: { name: string; l: number; desc: string }[] = [
    { name: "Gray 950", l: 0.13, desc: `Deepest neutral${ut}. Dark backgrounds.` },
    { name: "Gray 900", l: 0.20, desc: `Primary text color${ut}.` },
    { name: "Gray 800", l: 0.30, desc: `Strong text, headings.` },
    { name: "Gray 700", l: 0.40, desc: `Secondary text${ut}.` },
    { name: "Gray 600", l: 0.50, desc: `Tertiary text, labels.` },
    { name: "Gray 500", l: 0.58, desc: `Placeholder text, disabled.` },
    { name: "Gray 400", l: 0.68, desc: `Muted content, metadata.` },
    { name: "Gray 300", l: 0.78, desc: `Subtle borders, dividers.` },
    { name: "Gray 200", l: 0.87, desc: `Light borders, outlines.` },
    { name: "Gray 100", l: 0.93, desc: `Subtle surface tint, hover.` },
    { name: "Gray 50", l: 0.97, desc: `Lightest surface${ut}.` },
  ];
  const neutral = neutralSteps.map(({ name, l, desc }) => ({
    name,
    hex: toHex({ mode: "oklch", l, c: nChroma, h: nHue }),
    description: desc,
  }));

  const semantic: ColorRole[] = [
    { name: "Success Green", hex: toHex({ mode: "oklch", l: 0.6, c: 0.17, h: 145 }), description: "Success states, completion, positive indicators." },
    { name: "Error Red", hex: toHex({ mode: "oklch", l: 0.55, c: 0.2, h: 25 }), description: "Error states, destructive actions, alerts." },
    { name: "Warning Amber", hex: toHex({ mode: "oklch", l: 0.7, c: 0.15, h: 80 }), description: "Warning states, caution indicators." },
    { name: "Info Blue", hex: toHex({ mode: "oklch", l: 0.6, c: 0.15, h: 250 }), description: "Informational states, help indicators." },
  ];

  const surfChroma = undertone === "neutral" ? 0 : 0.005;
  const surfHue = undertone === "warm" ? 70 : hue;
  const surface: ColorRole[] = [
    { name: "Background", hex: toHex({ mode: "oklch", l: undertone === "warm" ? 0.975 : 1.0, c: surfChroma, h: surfHue }), description: "Primary page background." },
    { name: "Surface", hex: toHex({ mode: "oklch", l: undertone === "warm" ? 0.985 : 0.99, c: surfChroma * 0.6, h: surfHue }), description: "Card and container surface." },
    { name: "Surface Elevated", hex: "#ffffff", description: "Maximum elevation surface, overlays." },
    { name: "Surface Muted", hex: toHex({ mode: "oklch", l: 0.95, c: surfChroma, h: surfHue }), description: "Muted background for secondary sections." },
  ];

  const border: ColorRole[] = [
    { name: "Border Default", hex: toHex({ mode: "oklch", l: 0.88, c: nChroma * 0.5, h: nHue }), description: "Standard border for cards and dividers." },
    { name: "Border Subtle", hex: toHex({ mode: "oklch", l: 0.93, c: nChroma * 0.3, h: nHue }), description: "Subtle border for secondary elements." },
    { name: "Border Strong", hex: toHex({ mode: "oklch", l: 0.75, c: nChroma * 0.8, h: nHue }), description: "Prominent border for active elements." },
  ];

  const dark = {
    surface: [
      { name: "Dark Background", hex: toHex({ mode: "oklch", l: 0.1, c: nChroma * 0.5, h: nHue }), description: "Primary dark mode background." },
      { name: "Dark Surface", hex: toHex({ mode: "oklch", l: 0.15, c: nChroma * 0.5, h: nHue }), description: "Elevated dark surface." },
      { name: "Dark Surface Elevated", hex: toHex({ mode: "oklch", l: 0.2, c: nChroma * 0.5, h: nHue }), description: "Highest dark surface." },
    ] as ColorRole[],
    text: [
      { name: "Dark Text Primary", hex: toHex({ mode: "oklch", l: 0.95, c: 0.003, h: nHue }), description: "Primary text on dark." },
      { name: "Dark Text Secondary", hex: toHex({ mode: "oklch", l: 0.75, c: 0.005, h: nHue }), description: "Secondary text on dark." },
      { name: "Dark Text Muted", hex: toHex({ mode: "oklch", l: 0.55, c: 0.005, h: nHue }), description: "Muted text on dark." },
    ] as ColorRole[],
    border: [
      { name: "Dark Border Default", hex: "rgba(255,255,255,0.08)", description: "Standard dark border." },
      { name: "Dark Border Subtle", hex: "rgba(255,255,255,0.05)", description: "Subtle dark border." },
    ] as ColorRole[],
  };

  return { primary, accent, neutral, semantic, surface, border, dark };
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/generator/color.test.ts`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/generator/color.ts tests/generator/color.test.ts
git commit -m "feat(generator): oklch color palette generation"
```

---

### Task 2: Typography generation

**Files:**
- Create: `src/generator/typography.ts`
- Create: `tests/generator/typography.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// tests/generator/typography.test.ts
import { describe, it, expect } from "vitest";
import { generateTypography } from "../../src/generator/typography.js";
import { getArchetype } from "../../src/schema/archetypes.js";

describe("generateTypography", () => {
  it("generates 14 hierarchy styles", () => {
    const t = generateTypography(getArchetype("clean-minimal"), "Inter");
    expect(t.hierarchy).toHaveLength(14);
  });

  it("includes expected roles", () => {
    const t = generateTypography(getArchetype("clean-minimal"), "Inter");
    const roles = t.hierarchy.map((s) => s.role);
    expect(roles).toContain("Display Hero");
    expect(roles).toContain("Section Heading");
    expect(roles).toContain("Body");
    expect(roles).toContain("Button");
    expect(roles).toContain("Caption");
    expect(roles).toContain("Mono Body");
  });

  it("applies archetype heading weight", () => {
    expect(generateTypography(getArchetype("bold-energetic"), "X").hierarchy[0].weight).toBe(700);
    expect(generateTypography(getArchetype("professional"), "X").hierarchy[0].weight).toBe(300);
    expect(generateTypography(getArchetype("clean-minimal"), "X").hierarchy[0].weight).toBe(600);
  });

  it("uses provided font family", () => {
    const t = generateTypography(getArchetype("warm-friendly"), "DM Sans");
    expect(t.families.primary).toBe("DM Sans");
    expect(t.hierarchy[0].font).toBe("DM Sans");
  });

  it("mono styles use archetype mono font", () => {
    const t = generateTypography(getArchetype("clean-minimal"), "Inter");
    const mono = t.hierarchy.filter((s) => s.role.startsWith("Mono"));
    expect(mono.length).toBe(2);
    expect(mono[0].font).toBe("JetBrains Mono");
  });

  it("generates 3+ principles", () => {
    const t = generateTypography(getArchetype("warm-friendly"), "DM Sans");
    expect(t.principles.length).toBeGreaterThanOrEqual(3);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npx vitest run tests/generator/typography.test.ts`

- [ ] **Step 3: Implement typography.ts**

```ts
// src/generator/typography.ts
import type { ArchetypePreset, TypographySystem, TypeStyle } from "../schema/types.js";

function scaleLetterSpacing(base: string, factor: number): string {
  if (base === "normal" || base === "0px") return "normal";
  const px = parseFloat(base);
  if (isNaN(px)) return "normal";
  const scaled = px * factor;
  if (Math.abs(scaled) < 0.1) return "normal";
  return `${scaled.toFixed(1)}px`;
}

export function generateTypography(archetype: ArchetypePreset, fontChoice: string): TypographySystem {
  const { fontWeights, headingLetterSpacing, bodyLineHeight, headingLineHeight } = archetype;
  const f = fontChoice;
  const m = archetype.monoFont;

  const hierarchy: TypeStyle[] = [
    { role: "Display Hero", font: f, size: "48px (3.00rem)", weight: fontWeights.heading, lineHeight: headingLineHeight, letterSpacing: headingLetterSpacing, notes: "Maximum impact, hero headlines" },
    { role: "Section Heading", font: f, size: "40px (2.50rem)", weight: fontWeights.heading, lineHeight: String(Number(parseFloat(headingLineHeight) + 0.05).toFixed(2)), letterSpacing: scaleLetterSpacing(headingLetterSpacing, 0.67), notes: "Section titles" },
    { role: "Sub-heading Large", font: f, size: "32px (2.00rem)", weight: fontWeights.heading, lineHeight: String(Number(parseFloat(headingLineHeight) + 0.10).toFixed(2)), letterSpacing: scaleLetterSpacing(headingLetterSpacing, 0.42), notes: "Sub-sections" },
    { role: "Sub-heading", font: f, size: "26px (1.63rem)", weight: fontWeights.heading, lineHeight: String(Number(parseFloat(headingLineHeight) + 0.15).toFixed(2)), letterSpacing: scaleLetterSpacing(headingLetterSpacing, 0.25), notes: "Smaller section heads" },
    { role: "Card Title", font: f, size: "24px (1.50rem)", weight: fontWeights.heading, lineHeight: "1.30", letterSpacing: scaleLetterSpacing(headingLetterSpacing, 0.2), notes: "Card headings" },
    { role: "Body Large", font: f, size: "20px (1.25rem)", weight: fontWeights.body, lineHeight: bodyLineHeight, letterSpacing: "normal", notes: "Intro text, descriptions" },
    { role: "Body", font: f, size: "16px (1.00rem)", weight: fontWeights.body, lineHeight: bodyLineHeight, letterSpacing: "normal", notes: "Standard body text" },
    { role: "Body Small", font: f, size: "14px (0.88rem)", weight: fontWeights.body, lineHeight: bodyLineHeight, letterSpacing: "normal", notes: "Compact body text" },
    { role: "Button", font: f, size: "14px (0.88rem)", weight: fontWeights.ui, lineHeight: "1.00", letterSpacing: "normal", notes: "Button labels" },
    { role: "Link", font: f, size: "14px (0.88rem)", weight: fontWeights.ui, lineHeight: "1.00", letterSpacing: "normal", notes: "Navigation links" },
    { role: "Caption", font: f, size: "12px (0.75rem)", weight: fontWeights.body, lineHeight: "1.33", letterSpacing: "normal", notes: "Metadata, timestamps" },
    { role: "Label", font: f, size: "11px (0.69rem)", weight: fontWeights.ui, lineHeight: "1.25", letterSpacing: "0.5px", notes: "Small labels, overlines" },
    { role: "Mono Body", font: m, size: "14px (0.88rem)", weight: 400, lineHeight: "1.60", letterSpacing: "normal", notes: "Code blocks" },
    { role: "Mono Caption", font: m, size: "12px (0.75rem)", weight: 500, lineHeight: "1.33", letterSpacing: "normal", notes: "Code labels, technical" },
  ];

  const principles = [
    `Heading weight ${fontWeights.heading} establishes hierarchy without competing weights — consistent voice across all sizes.`,
    `Letter-spacing scales with size: ${headingLetterSpacing} at 48px, progressively relaxing to normal at body sizes.`,
    `Body line-height ${bodyLineHeight} balances readability with density — generous enough for comfort, tight enough for efficiency.`,
    `${m} for technical voice: code, data, and developer-facing labels.`,
  ];

  return {
    families: {
      primary: fontChoice,
      primaryFallback: archetype.defaultFontFallback,
      mono: archetype.monoFont,
      monoFallback: archetype.monoFontFallback,
    },
    hierarchy,
    principles,
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/generator/typography.test.ts`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/generator/typography.ts tests/generator/typography.test.ts
git commit -m "feat(generator): typography hierarchy generation"
```

---

### Task 3: Component specs generation

**Files:**
- Create: `src/generator/components.ts`
- Create: `tests/generator/components.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// tests/generator/components.test.ts
import { describe, it, expect } from "vitest";
import { generateComponents } from "../../src/generator/components.js";
import { generatePalette } from "../../src/generator/color.js";
import { getArchetype } from "../../src/schema/archetypes.js";

describe("generateComponents", () => {
  it("generates 3 button variants", () => {
    const p = generatePalette("#5e6ad2", "neutral");
    const c = generateComponents(p, getArchetype("clean-minimal"));
    expect(c.buttons).toHaveLength(3);
  });

  it("buttons include primary, secondary, ghost", () => {
    const p = generatePalette("#5e6ad2", "neutral");
    const c = generateComponents(p, getArchetype("clean-minimal"));
    const names = c.buttons.map((b) => b.name.toLowerCase());
    expect(names).toContain("primary");
    expect(names).toContain("secondary");
    expect(names).toContain("ghost");
  });

  it("uses archetype radius", () => {
    const p = generatePalette("#ff5b4f", "neutral");
    const c = generateComponents(p, getArchetype("bold-energetic"));
    expect(c.buttons[0].radius).toBe("9999px");
    expect(c.cards.radius).toBe("16px");
  });

  it("cards and inputs are populated", () => {
    const p = generatePalette("#c96442", "warm");
    const c = generateComponents(p, getArchetype("warm-friendly"));
    expect(c.cards.background).toBeTruthy();
    expect(c.cards.radius).toBe("12px");
    expect(c.inputs.focusBorder).toBeTruthy();
    expect(c.inputs.radius).toBe("8px");
  });

  it("navigation is sticky", () => {
    const p = generatePalette("#5e6ad2", "neutral");
    const c = generateComponents(p, getArchetype("clean-minimal"));
    expect(c.navigation.position).toBe("sticky");
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npx vitest run tests/generator/components.test.ts`

- [ ] **Step 3: Implement components.ts**

```ts
// src/generator/components.ts
import type { ArchetypePreset, ColorPalette, ComponentSpecs } from "../schema/types.js";

export function generateComponents(palette: ColorPalette, archetype: ArchetypePreset): ComponentSpecs {
  const brand = palette.primary[0].hex;
  const brandDark = palette.primary[1].hex;
  const surfaceBg = palette.surface[0].hex;
  const surfaceCard = palette.surface[1].hex;
  const borderDefault = palette.border[0].hex;
  const textPrimary = palette.neutral[1].hex;
  const textSecondary = palette.neutral[3].hex;
  const textPlaceholder = palette.neutral[5].hex;

  return {
    buttons: [
      {
        name: "Primary",
        background: brand,
        text: "#ffffff",
        padding: "8px 16px",
        radius: archetype.buttonRadius,
        shadow: "none",
        hoverBg: brandDark,
        use: "Primary CTA, main actions",
      },
      {
        name: "Secondary",
        background: palette.surface[3]?.hex ?? palette.neutral[10]?.hex ?? "#f0f0f0",
        text: textPrimary,
        padding: "8px 16px",
        radius: archetype.buttonRadius,
        shadow: "none",
        hoverBg: borderDefault,
        use: "Secondary actions, cancel buttons",
      },
      {
        name: "Ghost",
        background: "transparent",
        text: brand,
        padding: "8px 16px",
        radius: archetype.buttonRadius,
        shadow: `${borderDefault} 0px 0px 0px 1px`,
        hoverBg: surfaceCard,
        use: "Tertiary actions, outlined buttons",
      },
    ],
    cards: {
      background: surfaceCard,
      border: `${borderDefault} 0px 0px 0px 1px`,
      radius: archetype.cardRadius,
      shadow: "rgba(0,0,0,0.04) 0px 1px 2px, rgba(0,0,0,0.04) 0px 2px 4px",
      padding: archetype.componentSpacing,
      hoverEffect: "shadow intensification on hover",
    },
    inputs: {
      background: "#ffffff",
      border: borderDefault,
      radius: archetype.inputRadius,
      focusBorder: brand,
      focusShadow: `0 0 0 2px ${palette.primary[2].hex}`,
      padding: "8px 12px",
      textColor: textPrimary,
      placeholderColor: textPlaceholder,
    },
    navigation: {
      background: surfaceBg,
      position: "sticky",
      linkSize: "14px",
      linkWeight: archetype.fontWeights.ui,
      linkColor: textPrimary,
      activeIndicator: `font-weight ${archetype.fontWeights.heading} or underline`,
    },
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/generator/components.test.ts`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/generator/components.ts tests/generator/components.test.ts
git commit -m "feat(generator): component specs generation"
```

---

### Task 4: Layout, elevation, responsive

**Files:**
- Create: `src/generator/layout.ts`
- Create: `src/generator/elevation.ts`
- Create: `src/generator/responsive.ts`

- [ ] **Step 1: Implement layout.ts**

```ts
// src/generator/layout.ts
import type { ArchetypePreset, LayoutSystem } from "../schema/types.js";

export function generateLayout(archetype: ArchetypePreset): LayoutSystem {
  const whitespaceMap: Record<string, string> = {
    "clean-minimal": "Gallery-like emptiness. Massive vertical padding between sections communicates confidence. The whitespace IS the design.",
    "warm-friendly": "Generous, relaxed spacing throughout. Nothing feels crowded or urgent — the whitespace conveys warmth and approachability.",
    "bold-energetic": "Dramatic vertical spacing between sections creates visual impact. Content blocks are dense internally but separated by vast breathing room.",
    "professional": "Structured, purposeful spacing. Every margin serves information hierarchy. Dense enough to convey seriousness, open enough to breathe.",
    "playful-creative": "Playful rhythm with varied spacing. Sections alternate between tight groupings and generous gaps, creating visual energy and surprise.",
  };

  return {
    spacing: [
      { name: "3xs", value: "2px" },
      { name: "2xs", value: "4px" },
      { name: "xs", value: "8px" },
      { name: "sm", value: "12px" },
      { name: "md", value: "16px" },
      { name: "lg", value: "24px" },
      { name: "xl", value: "32px" },
      { name: "2xl", value: "48px" },
      { name: "3xl", value: "64px" },
      { name: "4xl", value: archetype.sectionSpacing },
    ],
    grid: {
      maxWidth: "1200px",
      columns: 12,
      gutter: archetype.componentSpacing,
    },
    borderRadius: [
      { name: "None", value: "0px", use: "Sharp-edged elements" },
      { name: "Subtle", value: "4px", use: "Small interactive elements" },
      { name: "Button", value: archetype.buttonRadius, use: "Buttons, form actions" },
      { name: "Input", value: archetype.inputRadius, use: "Form inputs, selects" },
      { name: "Card", value: archetype.cardRadius, use: "Cards, containers" },
      { name: "Large", value: "24px", use: "Large containers, sections" },
      { name: "Pill", value: archetype.pillRadius, use: "Badges, tags, pills" },
      { name: "Circle", value: "50%", use: "Avatars, icon buttons" },
    ],
    whitespacePhilosophy: whitespaceMap[archetype.mood],
  };
}
```

- [ ] **Step 2: Implement elevation.ts**

```ts
// src/generator/elevation.ts
import type { ArchetypePreset, ColorPalette, ElevationSystem } from "../schema/types.js";

export function generateElevation(archetype: ArchetypePreset, palette: ColorPalette): ElevationSystem {
  const border = palette.border[0].hex;
  const opMap = {
    whisper: { a: "0.04", b: "0.04", c: "0.06", d: "0.08" },
    subtle:  { a: "0.06", b: "0.06", c: "0.10", d: "0.15" },
    medium:  { a: "0.08", b: "0.08", c: "0.12", d: "0.20" },
    dramatic:{ a: "0.10", b: "0.12", c: "0.20", d: "0.35" },
  };
  const o = opMap[archetype.shadowIntensity];

  const philMap = {
    whisper: "Shadows are almost imperceptible — structure comes from spacing and ring borders, not elevation.",
    subtle: "Soft, warm shadows that suggest depth without demanding attention. Elevation is felt, not seen.",
    medium: "Balanced shadow system providing clear depth hierarchy. Cool-tinted shadows reinforce precision.",
    dramatic: "Bold, confident shadows giving elements real physical presence. Elevation is a primary design tool.",
  };

  return {
    levels: [
      { name: "Flat", level: 0, shadow: "none", use: "Page background, inline text" },
      { name: "Ring", level: 1, shadow: `${border} 0px 0px 0px 1px`, use: "Borders, card outlines, dividers" },
      { name: "Raised", level: 2, shadow: `rgba(0,0,0,${o.a}) 0px 1px 2px, rgba(0,0,0,${o.a}) 0px 1px 3px`, use: "Cards, buttons on hover" },
      { name: "Floating", level: 3, shadow: `rgba(0,0,0,${o.b}) 0px 4px 8px, rgba(0,0,0,${o.a}) 0px 2px 4px`, use: "Dropdowns, popovers, tooltips" },
      { name: "Overlay", level: 4, shadow: `rgba(0,0,0,${o.d}) 0px 8px 24px, rgba(0,0,0,${o.c}) 0px 4px 8px`, use: "Modals, dialogs, command palettes" },
    ],
    philosophy: philMap[archetype.shadowIntensity],
  };
}
```

- [ ] **Step 3: Implement responsive.ts**

```ts
// src/generator/responsive.ts
import type { ResponsiveSystem } from "../schema/types.js";

export function generateResponsive(): ResponsiveSystem {
  return {
    breakpoints: [
      { name: "Mobile", minWidth: "0px", maxWidth: "639px", changes: "Single column, stacked layout, condensed spacing" },
      { name: "Tablet", minWidth: "640px", maxWidth: "1023px", changes: "2-column grids, expanded padding, side navigation may appear" },
      { name: "Desktop", minWidth: "1024px", maxWidth: "1399px", changes: "Full layout, 3-column grids, horizontal navigation" },
      { name: "Large Desktop", minWidth: "1400px", maxWidth: "---", changes: "Centered content, generous margins, max content width" },
    ],
    touchTarget: "44px minimum height and width for all interactive elements",
    collapsingStrategy: [
      "Hero: display text scales down proportionally, maintains letter-spacing ratio",
      "Navigation: horizontal links collapse to hamburger menu at tablet breakpoint",
      "Feature cards: 3-column to 2-column to single column stacked",
      "Section spacing: desktop values multiplied by 0.6 on mobile",
      "Footer: multi-column grid collapses to single stacked column",
    ],
    imageBehavior: [
      "Maintain aspect ratio at all breakpoints",
      "Full-width on mobile, contained with max-width on desktop",
      "Lazy loading for images below the fold",
    ],
  };
}
```

- [ ] **Step 4: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/generator/layout.ts src/generator/elevation.ts src/generator/responsive.ts
git commit -m "feat(generator): layout, elevation, responsive systems"
```

---

### Task 5: Design tokens transformer

**Files:**
- Create: `src/generator/tokens.ts`

- [ ] **Step 1: Implement tokens.ts**

```ts
// src/generator/tokens.ts
import type { DesignSystem, DesignTokens } from "../schema/types.js";

function kebab(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "-");
}

function parsePx(s: string): number {
  const match = s.match(/^(\d+(?:\.\d+)?)px/);
  return match ? parseFloat(match[1]) : 0;
}

function parseLineHeight(s: string): number {
  return parseFloat(s) || 1.5;
}

function parseLetterSpacing(s: string): number {
  if (s === "normal") return 0;
  return parseFloat(s) || 0;
}

export function generateTokens(system: DesignSystem): DesignTokens {
  const lightColors: Record<string, string> = {};
  const darkColors: Record<string, string> = {};

  for (const c of system.colors.primary) lightColors[kebab(c.name)] = c.hex;
  for (const c of system.colors.accent) lightColors[kebab(c.name)] = c.hex;
  for (const c of system.colors.neutral) lightColors[kebab(c.name)] = c.hex;
  for (const c of system.colors.semantic) lightColors[kebab(c.name)] = c.hex;
  for (const c of system.colors.surface) lightColors[kebab(c.name)] = c.hex;
  for (const c of system.colors.border) lightColors[kebab(c.name)] = c.hex;

  for (const c of system.colors.dark.surface) darkColors[kebab(c.name)] = c.hex;
  for (const c of system.colors.dark.text) darkColors[kebab(c.name)] = c.hex;
  for (const c of system.colors.dark.border) darkColors[kebab(c.name)] = c.hex;
  // Include primary/accent/semantic in dark too (shared)
  for (const c of system.colors.primary) darkColors[kebab(c.name)] = c.hex;
  for (const c of system.colors.accent) darkColors[kebab(c.name)] = c.hex;
  for (const c of system.colors.semantic) darkColors[kebab(c.name)] = c.hex;

  const styles: DesignTokens["typography"]["styles"] = {};
  for (const t of system.typography.hierarchy) {
    styles[kebab(t.role)] = {
      fontFamily: t.font,
      fontSize: parsePx(t.size),
      fontWeight: t.weight,
      lineHeight: parseLineHeight(t.lineHeight),
      letterSpacing: parseLetterSpacing(t.letterSpacing),
    };
  }

  const spacing: Record<string, number> = {};
  for (const s of system.layout.spacing) {
    spacing[s.name] = parsePx(s.value);
  }

  const borderRadius: Record<string, number> = {};
  for (const r of system.layout.borderRadius) {
    if (r.value === "50%") {
      borderRadius[kebab(r.name)] = -1; // special marker for 50%
    } else if (r.value === "9999px") {
      borderRadius[kebab(r.name)] = 9999;
    } else {
      borderRadius[kebab(r.name)] = parsePx(r.value);
    }
  }

  const elevation: Record<string, string> = {};
  for (const e of system.elevation.levels) {
    if (e.shadow !== "none") {
      elevation[kebab(e.name)] = e.shadow;
    }
  }

  const breakpoint: Record<string, number> = {};
  for (const b of system.responsive.breakpoints) {
    breakpoint[kebab(b.name)] = parsePx(b.minWidth);
  }

  return {
    brand: { name: system.brandName, mood: system.mood },
    color: { light: lightColors, dark: darkColors },
    typography: {
      families: {
        primary: system.typography.families.primary,
        "primary-fallback": system.typography.families.primaryFallback,
        mono: system.typography.families.mono,
        "mono-fallback": system.typography.families.monoFallback,
      },
      styles,
    },
    spacing,
    borderRadius,
    elevation,
    breakpoint,
  };
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/generator/tokens.ts
git commit -m "feat(generator): design tokens JSON transformer"
```

---

### Task 6: Orchestrator + integration tests

**Files:**
- Create: `src/generator/index.ts`
- Create: `tests/generator/integration.test.ts`

- [ ] **Step 1: Implement generator/index.ts**

```ts
// src/generator/index.ts
import type { UserInputs, DesignSystem, DesignTokens } from "../schema/types.js";
import { getArchetype } from "../schema/archetypes.js";
import { renderDesignMd } from "../schema/template.js";
import { generatePalette } from "./color.js";
import { generateTypography } from "./typography.js";
import { generateComponents } from "./components.js";
import { generateLayout } from "./layout.js";
import { generateElevation } from "./elevation.js";
import { generateResponsive } from "./responsive.js";
import { generateTokens } from "./tokens.js";

export interface GenerateResult {
  system: DesignSystem;
  designMd: string;
  tokens: DesignTokens;
}

function replaceVars(s: string, vars: Record<string, string>): string {
  let result = s;
  for (const [key, val] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, val);
  }
  return result;
}

export function generate(inputs: UserInputs): GenerateResult {
  const archetype = getArchetype(inputs.mood);
  const palette = generatePalette(inputs.primaryColor, archetype.neutralUndertone);
  const typography = generateTypography(archetype, inputs.fontFamily);
  const components = generateComponents(palette, archetype);
  const layout = generateLayout(archetype);
  const elevation = generateElevation(archetype, palette);
  const responsive = generateResponsive();

  const vars: Record<string, string> = {
    brandName: inputs.brandName,
    primaryHex: palette.primary[0].hex,
    fontFamily: inputs.fontFamily,
    "fontWeights.heading": String(archetype.fontWeights.heading),
    "fontWeights.ui": String(archetype.fontWeights.ui),
    "fontWeights.body": String(archetype.fontWeights.body),
  };

  const system: DesignSystem = {
    brandName: inputs.brandName,
    mood: inputs.mood,
    theme: {
      atmosphere: replaceVars(archetype.atmosphereTemplate, vars),
      characteristics: archetype.characteristics.map((c) => replaceVars(c, vars)),
    },
    colors: palette,
    typography,
    components,
    layout,
    elevation,
    responsive,
    dos: archetype.dos.map((d) => replaceVars(d, vars)),
    donts: archetype.donts.map((d) => replaceVars(d, vars)),
    agentGuide: {
      quickColors: [
        { name: "Primary CTA", hex: palette.primary[0].hex },
        { name: "Background", hex: palette.surface[0].hex },
        { name: "Heading Text", hex: palette.neutral[2].hex },
        { name: "Body Text", hex: palette.neutral[3].hex },
        { name: "Border", hex: palette.border[0].hex },
        { name: "Accent", hex: palette.accent[0].hex },
      ],
      examplePrompts: [
        `Create a hero section on ${palette.surface[0].hex} background. Headline at 48px ${inputs.fontFamily} weight ${archetype.fontWeights.heading}, letter-spacing ${archetype.headingLetterSpacing}, color ${palette.neutral[2].hex}. CTA button: ${palette.primary[0].hex} bg, white text, ${archetype.buttonRadius} radius, 8px 16px padding.`,
        `Design a card: ${palette.surface[1].hex} background, ${palette.border[0].hex} ring border, ${archetype.cardRadius} radius. Title at 24px weight ${archetype.fontWeights.heading}, body at 16px weight ${archetype.fontWeights.body} color ${palette.neutral[3].hex}.`,
        `Build navigation: ${palette.surface[0].hex} background, sticky. Links at 14px ${inputs.fontFamily} weight ${archetype.fontWeights.ui}, color ${palette.neutral[2].hex}. Primary CTA button right-aligned.`,
        `Create a form input: white background, ${palette.border[0].hex} border, ${archetype.inputRadius} radius. Focus: ${palette.primary[0].hex} border with ${palette.primary[2].hex} ring shadow.`,
        `Design a pill badge: ${palette.primary[2].hex} background, ${palette.primary[0].hex} text, ${archetype.pillRadius} radius, 12px font weight ${archetype.fontWeights.ui}.`,
      ],
      iterationTips: [
        `All neutrals have ${archetype.neutralUndertone} undertone — maintain this in any custom grays.`,
        `Button radius is ${archetype.buttonRadius}, card radius is ${archetype.cardRadius} — don't mix these.`,
        `Heading weight ${archetype.fontWeights.heading}, UI weight ${archetype.fontWeights.ui}, body weight ${archetype.fontWeights.body} — strict roles.`,
        `Shadow intensity is ${archetype.shadowIntensity} — keep all custom shadows at this level.`,
      ],
    },
  };

  return {
    system,
    designMd: renderDesignMd(system),
    tokens: generateTokens(system),
  };
}
```

- [ ] **Step 2: Write integration test**

```ts
// tests/generator/integration.test.ts
import { describe, it, expect } from "vitest";
import { generate } from "../../src/generator/index.js";
import type { MoodArchetype } from "../../src/schema/types.js";

const ALL_MOODS: MoodArchetype[] = [
  "clean-minimal", "warm-friendly", "bold-energetic",
  "professional", "playful-creative",
];

for (const mood of ALL_MOODS) {
  describe(`generate: ${mood}`, () => {
    const result = generate({
      brandName: "TestBrand",
      primaryColor: "#5e6ad2",
      mood,
      fontFamily: "Inter",
    });

    it("DESIGN.md has all 9 sections", () => {
      for (let i = 1; i <= 9; i++) {
        expect(result.designMd).toContain(`## ${i}.`);
      }
    });

    it("no unresolved template placeholders", () => {
      expect(result.designMd).not.toMatch(/\{\{[^}]+\}\}/);
    });

    it("brandName appears in heading", () => {
      expect(result.designMd).toContain("# Design System: TestBrand");
    });

    it("tokens have light colors", () => {
      expect(result.tokens.color.light["brand-primary"]).toBeTruthy();
    });

    it("tokens have dark colors", () => {
      expect(result.tokens.color.dark["dark-background"]).toBeTruthy();
    });

    it("tokens have 12+ typography styles", () => {
      expect(Object.keys(result.tokens.typography.styles).length).toBeGreaterThanOrEqual(12);
    });

    it("tokens have 8+ spacing values", () => {
      expect(Object.keys(result.tokens.spacing).length).toBeGreaterThanOrEqual(8);
    });

    it("tokens have elevation values", () => {
      expect(Object.keys(result.tokens.elevation).length).toBeGreaterThanOrEqual(3);
    });

    it("tokens have breakpoints", () => {
      expect(Object.keys(result.tokens.breakpoint).length).toBe(4);
    });
  });
}
```

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add src/generator/index.ts tests/generator/integration.test.ts
git commit -m "feat(generator): orchestrator + integration tests for all 5 archetypes"
```
