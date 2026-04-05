# Role A: Schema & Presets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Define the type system, 5 mood archetype presets, and DESIGN.md template renderer that Role B's generator will consume.

**Architecture:** All modules in `src/schema/` are pure data and functions with zero Node.js I/O dependencies. Types define the shape of the entire design system. Archetypes are static preset objects. Template renderer converts a DesignSystem object to markdown string.

**Tech Stack:** TypeScript, vitest

---

## File Structure

```
design-system-starter/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .gitignore
└── src/
    └── schema/
        ├── index.ts          # barrel export
        ├── types.ts          # all type definitions
        ├── archetypes.ts     # 5 mood presets
        └── template.ts       # DesignSystem → DESIGN.md string
```

---

### Task 1: Project scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "design-system-starter",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    "./schema": "./dist/schema/index.js",
    "./generator": "./dist/generator/index.js",
    "./figma": "./dist/figma/index.js"
  },
  "bin": { "design-system": "./dist/cli/index.js" },
  "scripts": {
    "dev": "tsx src/cli/index.ts",
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "culori": "^4.0.0"
  },
  "devDependencies": {
    "@inquirer/prompts": "^7.0.0",
    "@types/node": "^22.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "declaration": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Create vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["tests/**/*.test.ts"] } });
```

- [ ] **Step 4: Create .gitignore**

```
node_modules/
dist/
output/
```

- [ ] **Step 5: Install dependencies**

Run: `cd /Users/haneul/Projects/design-system-starter && npm install`
Expected: clean install, lock file created.

- [ ] **Step 6: Verify**

Run: `npx vitest run`
Expected: "No test files found" or 0 tests, exit 0.

- [ ] **Step 7: Commit**

```bash
git init
git add package.json package-lock.json tsconfig.json vitest.config.ts .gitignore
git commit -m "chore: scaffold design-system-starter"
```

---

### Task 2: Type definitions

**Files:**
- Create: `src/schema/types.ts`

- [ ] **Step 1: Write types.ts**

```ts
// src/schema/types.ts

// ═══ User Inputs ═══

export type MoodArchetype =
  | "clean-minimal"
  | "warm-friendly"
  | "bold-energetic"
  | "professional"
  | "playful-creative";

export interface UserInputs {
  brandName: string;
  primaryColor: string;
  mood: MoodArchetype;
  fontFamily: string;
}

// ═══ Color ═══

export interface ColorRole {
  name: string;
  hex: string;
  description: string;
}

export interface ColorPalette {
  primary: ColorRole[];
  accent: ColorRole[];
  neutral: ColorRole[];
  semantic: ColorRole[];
  surface: ColorRole[];
  border: ColorRole[];
  dark: {
    surface: ColorRole[];
    text: ColorRole[];
    border: ColorRole[];
  };
}

// ═══ Typography ═══

export interface TypeStyle {
  role: string;
  font: string;
  size: string;
  weight: number;
  lineHeight: string;
  letterSpacing: string;
  notes: string;
}

export interface TypographySystem {
  families: {
    primary: string;
    primaryFallback: string;
    mono: string;
    monoFallback: string;
  };
  hierarchy: TypeStyle[];
  principles: string[];
}

// ═══ Components ═══

export interface ButtonVariant {
  name: string;
  background: string;
  text: string;
  padding: string;
  radius: string;
  shadow: string;
  hoverBg: string;
  use: string;
}

export interface ComponentSpecs {
  buttons: ButtonVariant[];
  cards: {
    background: string;
    border: string;
    radius: string;
    shadow: string;
    padding: string;
    hoverEffect: string;
  };
  inputs: {
    background: string;
    border: string;
    radius: string;
    focusBorder: string;
    focusShadow: string;
    padding: string;
    textColor: string;
    placeholderColor: string;
  };
  navigation: {
    background: string;
    position: string;
    linkSize: string;
    linkWeight: number;
    linkColor: string;
    activeIndicator: string;
  };
}

// ═══ Layout ═══

export interface LayoutSystem {
  spacing: { name: string; value: string }[];
  grid: { maxWidth: string; columns: number; gutter: string };
  borderRadius: { name: string; value: string; use: string }[];
  whitespacePhilosophy: string;
}

// ═══ Elevation ═══

export interface ElevationLevel {
  name: string;
  level: number;
  shadow: string;
  use: string;
}

export interface ElevationSystem {
  levels: ElevationLevel[];
  philosophy: string;
}

// ═══ Responsive ═══

export interface Breakpoint {
  name: string;
  minWidth: string;
  maxWidth: string;
  changes: string;
}

export interface ResponsiveSystem {
  breakpoints: Breakpoint[];
  touchTarget: string;
  collapsingStrategy: string[];
  imageBehavior: string[];
}

// ═══ Full Design System ═══

export interface DesignSystem {
  brandName: string;
  mood: MoodArchetype;
  theme: { atmosphere: string; characteristics: string[] };
  colors: ColorPalette;
  typography: TypographySystem;
  components: ComponentSpecs;
  layout: LayoutSystem;
  elevation: ElevationSystem;
  responsive: ResponsiveSystem;
  dos: string[];
  donts: string[];
  agentGuide: {
    quickColors: { name: string; hex: string }[];
    examplePrompts: string[];
    iterationTips: string[];
  };
}

// ═══ Archetype Preset ═══

export type NeutralUndertone = "cool" | "warm" | "neutral";
export type ShadowIntensity = "whisper" | "subtle" | "medium" | "dramatic";

export interface ArchetypePreset {
  mood: MoodArchetype;
  label: string;
  description: string;
  atmosphereTemplate: string;
  characteristics: string[];
  defaultFont: string;
  defaultFontFallback: string;
  monoFont: string;
  monoFontFallback: string;
  fontWeights: { heading: number; ui: number; body: number };
  headingLetterSpacing: string;
  bodyLineHeight: string;
  headingLineHeight: string;
  sectionSpacing: string;
  componentSpacing: string;
  buttonRadius: string;
  cardRadius: string;
  inputRadius: string;
  pillRadius: string;
  shadowIntensity: ShadowIntensity;
  neutralUndertone: NeutralUndertone;
  dos: string[];
  donts: string[];
  suggestedFonts: { name: string; fallback: string }[];
}

// ═══ Design Tokens (for Figma bridge) ═══

export interface DesignTokens {
  brand: { name: string; mood: MoodArchetype };
  color: {
    light: Record<string, string>;
    dark: Record<string, string>;
  };
  typography: {
    families: Record<string, string>;
    styles: Record<
      string,
      {
        fontFamily: string;
        fontSize: number;
        fontWeight: number;
        lineHeight: number;
        letterSpacing: number;
      }
    >;
  };
  spacing: Record<string, number>;
  borderRadius: Record<string, number>;
  elevation: Record<string, string>;
  breakpoint: Record<string, number>;
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/schema/types.ts
git commit -m "feat(schema): type definitions"
```

---

### Task 3: Archetype presets

**Files:**
- Create: `src/schema/archetypes.ts`
- Create: `tests/schema/archetypes.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// tests/schema/archetypes.test.ts
import { describe, it, expect } from "vitest";
import { getArchetype, ARCHETYPES } from "../../src/schema/archetypes.js";
import type { MoodArchetype } from "../../src/schema/types.js";

const ALL_MOODS: MoodArchetype[] = [
  "clean-minimal",
  "warm-friendly",
  "bold-energetic",
  "professional",
  "playful-creative",
];

describe("ARCHETYPES", () => {
  it("has exactly 5 entries", () => {
    expect(Object.keys(ARCHETYPES)).toHaveLength(5);
  });
});

describe("getArchetype", () => {
  for (const mood of ALL_MOODS) {
    describe(mood, () => {
      it("returns preset with matching mood", () => {
        expect(getArchetype(mood).mood).toBe(mood);
      });

      it("has non-empty label and description", () => {
        const p = getArchetype(mood);
        expect(p.label.length).toBeGreaterThan(0);
        expect(p.description.length).toBeGreaterThan(0);
      });

      it("atmosphere template contains placeholders", () => {
        const p = getArchetype(mood);
        expect(p.atmosphereTemplate).toContain("{{brandName}}");
        expect(p.atmosphereTemplate).toContain("{{primaryHex}}");
        expect(p.atmosphereTemplate).toContain("{{fontFamily}}");
      });

      it("has 5+ characteristics", () => {
        expect(getArchetype(mood).characteristics.length).toBeGreaterThanOrEqual(5);
      });

      it("has 3+ suggested fonts", () => {
        expect(getArchetype(mood).suggestedFonts.length).toBeGreaterThanOrEqual(3);
      });

      it("has 7+ dos and 7+ donts", () => {
        const p = getArchetype(mood);
        expect(p.dos.length).toBeGreaterThanOrEqual(7);
        expect(p.donts.length).toBeGreaterThanOrEqual(7);
      });
    });
  }

  it("warm-friendly has warm undertone", () => {
    expect(getArchetype("warm-friendly").neutralUndertone).toBe("warm");
  });

  it("clean-minimal has neutral undertone", () => {
    expect(getArchetype("clean-minimal").neutralUndertone).toBe("neutral");
  });

  it("professional has cool undertone", () => {
    expect(getArchetype("professional").neutralUndertone).toBe("cool");
  });

  it("bold-energetic has neutral undertone", () => {
    expect(getArchetype("bold-energetic").neutralUndertone).toBe("neutral");
  });

  it("playful-creative has warm undertone", () => {
    expect(getArchetype("playful-creative").neutralUndertone).toBe("warm");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/schema/archetypes.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement archetypes.ts**

```ts
// src/schema/archetypes.ts
import type { ArchetypePreset, MoodArchetype } from "./types.js";

const cleanMinimal: ArchetypePreset = {
  mood: "clean-minimal",
  label: "Clean & Minimal",
  description: "Restrained, gallery-like emptiness where every element earns its pixel",
  atmosphereTemplate: `{{brandName}}'s design system is built on restraint and precision — a near-white canvas where typography and spacing do all the heavy lifting. The page is overwhelmingly white with near-black text, creating a gallery-like emptiness where every element earns its place. This isn't minimalism as decoration; it's minimalism as engineering principle.

The {{fontFamily}} typeface anchors the entire system. At display sizes, aggressive negative letter-spacing creates headlines that feel compressed and engineered. At body sizes, the tracking relaxes but geometric precision persists. The primary brand color ({{primaryHex}}) appears sparingly — only on interactive elements and key moments — making each appearance feel intentional and earned.

What distinguishes this system is its shadow-as-border philosophy. Instead of traditional CSS borders, ring shadows (\`0px 0px 0px 1px\`) create border-like lines without box model implications. The entire depth system is built on layered, multi-value shadow stacks where each layer serves a specific purpose.`,
  characteristics: [
    "{{fontFamily}} with negative letter-spacing at display sizes — text as compressed infrastructure",
    "Near-pure white canvas with near-black (#171717) text — micro-contrast softness",
    "Shadow-as-border technique: ring shadows replace traditional borders throughout",
    "Multi-layer shadow stacks for nuanced depth (border + elevation + ambient)",
    "Three-weight system: {{fontWeights.body}} (body), {{fontWeights.ui}} (UI), {{fontWeights.heading}} (headings)",
    "Primary color ({{primaryHex}}) used sparingly — only on CTAs, links, and active states",
    "Gallery-like whitespace between sections — the empty space IS the design",
    "Monospace font for code and technical labels as secondary voice",
  ],
  defaultFont: "Inter",
  defaultFontFallback: "system-ui, -apple-system, sans-serif",
  monoFont: "JetBrains Mono",
  monoFontFallback: "ui-monospace, SFMono-Regular, Consolas, monospace",
  fontWeights: { heading: 600, ui: 500, body: 400 },
  headingLetterSpacing: "-2.4px",
  bodyLineHeight: "1.50",
  headingLineHeight: "1.10",
  sectionSpacing: "80px",
  componentSpacing: "24px",
  buttonRadius: "6px",
  cardRadius: "8px",
  inputRadius: "6px",
  pillRadius: "9999px",
  shadowIntensity: "whisper",
  neutralUndertone: "neutral",
  dos: [
    "Use {{fontFamily}} with negative letter-spacing at display sizes (-2.4px at 48px, -1.28px at 32px)",
    "Use shadow-as-border (0px 0px 0px 1px rgba(0,0,0,0.08)) instead of CSS borders",
    "Use the three-weight system: {{fontWeights.body}} (body), {{fontWeights.ui}} (UI), {{fontWeights.heading}} (headings) — strict roles",
    "Keep the color palette achromatic — grays from near-black to white are the system",
    "Use multi-layer shadow stacks for cards (border + elevation + ambient)",
    "Use near-black (#171717) instead of pure black for primary text",
    "Apply primary color ({{primaryHex}}) only on interactive elements and brand moments",
    "Use monospace font for code, technical labels, and developer-facing content",
  ],
  donts: [
    "Don't use positive letter-spacing on headings — it's always negative or zero",
    "Don't use bold (700) on body text — {{fontWeights.heading}} is the maximum weight",
    "Don't use traditional CSS border on cards — use the shadow-border technique",
    "Don't introduce warm or decorative colors into UI chrome",
    "Don't apply heavy shadows (> 0.1 opacity) — the system is whisper-level",
    "Don't use pill radius (9999px) on primary action buttons — pills are for badges only",
    "Don't add decorative elements — every pixel must serve a functional purpose",
  ],
  suggestedFonts: [
    { name: "Inter", fallback: "system-ui, sans-serif" },
    { name: "Geist", fallback: "system-ui, sans-serif" },
    { name: "IBM Plex Sans", fallback: "system-ui, sans-serif" },
    { name: "Satoshi", fallback: "system-ui, sans-serif" },
  ],
};

const warmFriendly: ArchetypePreset = {
  mood: "warm-friendly",
  label: "Warm & Friendly",
  description: "Approachable warmth with generous spacing and organic feel",
  atmosphereTemplate: `{{brandName}}'s design is warm, unhurried, and quietly inviting — built on a parchment-toned canvas that deliberately evokes the feeling of premium paper rather than a cold digital surface. Where most products lean into clinical aesthetics, {{brandName}} radiates human warmth, as if the interface itself has good taste in interior design.

The {{fontFamily}} typeface brings approachability to every headline and body text. Combined with the primary brand color ({{primaryHex}}) and organic, rounded forms, the visual language says "thoughtful companion" rather than "powerful tool." Headlines breathe at comfortable line-heights, creating a cadence that feels more like reading an essay than scanning a dashboard.

What makes this system distinctive is its warm neutral palette. Every gray carries a subtle yellow-brown undertone — there are no cool blue-grays anywhere. Borders are cream-tinted, shadows use warm transparent tones, and even the darkest surfaces carry a barely perceptible warmth. This chromatic consistency creates a space that feels lived-in and trustworthy.`,
  characteristics: [
    "Warm parchment-toned canvas — evoking premium paper, not screens",
    "{{fontFamily}} with comfortable weight (500) for approachable authority",
    "Primary color ({{primaryHex}}) — warm, earthy, deliberately human",
    "Exclusively warm-toned neutrals — every gray has a yellow-brown undertone",
    "Generous, relaxed line-heights (1.60 for body) — reading comfort over density",
    "Ring-based shadow system creating border-like depth without harsh borders",
    "Magazine-like pacing with generous section spacing",
    "Rounded corners (8-12px) conveying softness and approachability",
  ],
  defaultFont: "DM Sans",
  defaultFontFallback: "system-ui, -apple-system, sans-serif",
  monoFont: "DM Mono",
  monoFontFallback: "ui-monospace, SFMono-Regular, Consolas, monospace",
  fontWeights: { heading: 500, ui: 500, body: 400 },
  headingLetterSpacing: "-0.5px",
  bodyLineHeight: "1.60",
  headingLineHeight: "1.20",
  sectionSpacing: "72px",
  componentSpacing: "24px",
  buttonRadius: "8px",
  cardRadius: "12px",
  inputRadius: "8px",
  pillRadius: "9999px",
  shadowIntensity: "subtle",
  neutralUndertone: "warm",
  dos: [
    "Use warm-toned neutrals throughout — every gray should carry a yellow-brown undertone",
    "Use generous line-heights (1.60 for body, 1.20 for headings) for reading comfort",
    "Use {{fontFamily}} at weight 500 for headings — approachable authority, not shouty",
    "Use warm shadow tints rather than pure black shadows",
    "Keep border radius comfortable (8-12px) — soft but not childish",
    "Use ring-based shadows (0px 0px 0px 1px) for gentle containment",
    "Apply primary color ({{primaryHex}}) for CTAs and brand moments — warm and inviting",
    "Use generous whitespace — nothing should feel crowded or urgent",
  ],
  donts: [
    "Don't use cool blue-grays — every neutral must carry warm undertone",
    "Don't use aggressive negative letter-spacing — this system breathes, not compresses",
    "Don't use bold (700) for headings — 500 is the ceiling for warmth",
    "Don't use sharp corners (0-4px) — they conflict with the warm personality",
    "Don't use heavy, dark shadows — keep them subtle and warm-tinted",
    "Don't overcrowd content — generous spacing is the system's personality",
    "Don't use cold, clinical accent colors — stay within the warm palette",
  ],
  suggestedFonts: [
    { name: "DM Sans", fallback: "system-ui, sans-serif" },
    { name: "Plus Jakarta Sans", fallback: "system-ui, sans-serif" },
    { name: "Nunito Sans", fallback: "system-ui, sans-serif" },
    { name: "Source Sans 3", fallback: "system-ui, sans-serif" },
  ],
};

const boldEnergetic: ArchetypePreset = {
  mood: "bold-energetic",
  label: "Bold & Energetic",
  description: "High-contrast confidence with dramatic presence and pill-shaped CTAs",
  atmosphereTemplate: `{{brandName}}'s design is a statement of confidence — dark, dense, and unapologetically bold. The interface commands attention through sheer contrast: near-black backgrounds with bright, saturated elements that pop with physical intensity. This is not a design that whispers; it's one that performs on stage.

The {{fontFamily}} typeface is pushed to its limits — weight 700 at display sizes with uppercase transforms and aggressive tracking creates headlines that feel like they're being broadcast, not read. The primary brand color ({{primaryHex}}) is deployed at full saturation on pill-shaped CTAs and key interactive moments, creating focal points that demand action.

The depth system is dramatic: heavy shadows with high opacity give elements real physical presence, as if they're floating above the dark canvas. Pill-shaped buttons (9999px radius) are the signature interactive element — rounded, tactile, and unmistakably clickable.`,
  characteristics: [
    "Dark-first design — near-black canvas with high-contrast content",
    "{{fontFamily}} at weight 700 with uppercase transforms for display text",
    "Primary color ({{primaryHex}}) at full saturation — bold, unapologetic accent",
    "Pill-shaped CTAs (9999px radius) as signature interactive pattern",
    "Dramatic shadow system — elements float with real physical presence",
    "Generous card radius (16px) for modern, approachable containers",
    "Dense internal spacing but vast separation between sections",
    "High contrast throughout — no subtle, barely-visible elements",
  ],
  defaultFont: "Montserrat",
  defaultFontFallback: "system-ui, -apple-system, sans-serif",
  monoFont: "Fira Code",
  monoFontFallback: "ui-monospace, SFMono-Regular, Consolas, monospace",
  fontWeights: { heading: 700, ui: 600, body: 400 },
  headingLetterSpacing: "-1.0px",
  bodyLineHeight: "1.50",
  headingLineHeight: "1.05",
  sectionSpacing: "96px",
  componentSpacing: "24px",
  buttonRadius: "9999px",
  cardRadius: "16px",
  inputRadius: "12px",
  pillRadius: "9999px",
  shadowIntensity: "dramatic",
  neutralUndertone: "neutral",
  dos: [
    "Use {{fontFamily}} at weight 700 for headings — bold and commanding",
    "Use pill radius (9999px) for primary CTAs — the signature interaction pattern",
    "Use high-contrast color pairs — dark backgrounds with bright foregrounds",
    "Use dramatic shadows (0.2+ opacity) for floating, physical depth",
    "Use uppercase transforms with letter-spacing for display text emphasis",
    "Use primary color ({{primaryHex}}) at full saturation — no washed-out tints",
    "Use generous card radius (16px) for modern container feel",
    "Use vast spacing between sections to create dramatic visual rhythm",
  ],
  donts: [
    "Don't use whisper-level shadows — this system demands visible depth",
    "Don't use light weight (300-400) for headings — bold is the identity",
    "Don't use small radius (4-6px) for buttons — pills are mandatory",
    "Don't use muted or desaturated accent colors — saturation is key",
    "Don't use tight section spacing — dramatic gaps create energy",
    "Don't use serif fonts — this system is geometric and contemporary",
    "Don't whisper — every element should be confident and visible",
  ],
  suggestedFonts: [
    { name: "Montserrat", fallback: "system-ui, sans-serif" },
    { name: "Sora", fallback: "system-ui, sans-serif" },
    { name: "Space Grotesk", fallback: "system-ui, sans-serif" },
    { name: "Outfit", fallback: "system-ui, sans-serif" },
  ],
};

const professional: ArchetypePreset = {
  mood: "professional",
  label: "Professional & Trustworthy",
  description: "Precise, premium, and quietly authoritative with cool-tinted depth",
  atmosphereTemplate: `{{brandName}}'s design is the gold standard of professional digital presence — a system that manages to feel simultaneously technical and luxurious, precise and warm. The page opens on a clean white canvas with deep navy headings and the primary brand color ({{primaryHex}}) functioning as both brand anchor and interactive accent.

The {{fontFamily}} typeface is the defining element. At display sizes, it runs at an extraordinarily light weight (300) — creating an ethereal, almost whispered authority. This is the opposite of the "bold hero headline" convention; the headlines feel like they don't need to shout. Negative letter-spacing tightens the text into dense, engineered blocks.

The shadow system uses multi-layer, cool-tinted shadows that create depth with an almost atmospheric quality — like elements floating in space. Conservative border-radius (4-8px) and structured spacing create an environment of precision and trust.`,
  characteristics: [
    "{{fontFamily}} at weight 300 for display — light weight as luxury and confidence",
    "Primary color ({{primaryHex}}) as brand anchor and interactive accent",
    "Deep navy headings instead of black — warm, premium, trustworthy",
    "Cool-tinted multi-layer shadows — elevation that feels atmospheric",
    "Conservative border-radius (4-8px) — nothing pill-shaped, nothing harsh",
    "Structured, purposeful spacing — dense enough for seriousness, open enough to breathe",
    "Two-weight simplicity: 300 (body/headings) and 400 (UI/buttons)",
    "Progressive letter-spacing — tighter at display, relaxing toward body",
  ],
  defaultFont: "Source Sans 3",
  defaultFontFallback: "system-ui, -apple-system, sans-serif",
  monoFont: "Source Code Pro",
  monoFontFallback: "ui-monospace, SFMono-Regular, Consolas, monospace",
  fontWeights: { heading: 300, ui: 400, body: 300 },
  headingLetterSpacing: "-1.4px",
  bodyLineHeight: "1.40",
  headingLineHeight: "1.10",
  sectionSpacing: "80px",
  componentSpacing: "16px",
  buttonRadius: "4px",
  cardRadius: "8px",
  inputRadius: "4px",
  pillRadius: "9999px",
  shadowIntensity: "medium",
  neutralUndertone: "cool",
  dos: [
    "Use {{fontFamily}} at weight 300 for display — lightness is luxury",
    "Use progressive letter-spacing: -1.4px at 48px, -0.64px at 32px, normal at 16px",
    "Use cool-tinted multi-layer shadows for premium atmospheric depth",
    "Use conservative radius (4px buttons, 8px cards) — precision over playfulness",
    "Use deep navy (#0a1628) for headings instead of pure black",
    "Use primary color ({{primaryHex}}) for CTAs and interactive highlights",
    "Use structured, purposeful spacing — every margin serves hierarchy",
    "Use monospace font for code and financial data with tabular numerals",
  ],
  donts: [
    "Don't use bold (600-700) for headlines — light weight is the signature",
    "Don't use pill-shaped buttons — keep radius conservative (4px)",
    "Don't use warm-tinted shadows — cool tints reinforce professionalism",
    "Don't use playful or rounded design elements — maintain precision",
    "Don't use casual typography — every text element should feel considered",
    "Don't use heavy shadows — medium intensity with cool tints",
    "Don't use decorative colors — the palette is purposeful and restrained",
  ],
  suggestedFonts: [
    { name: "Source Sans 3", fallback: "system-ui, sans-serif" },
    { name: "Instrument Sans", fallback: "system-ui, sans-serif" },
    { name: "General Sans", fallback: "system-ui, sans-serif" },
    { name: "Switzer", fallback: "system-ui, sans-serif" },
  ],
};

const playfulCreative: ArchetypePreset = {
  mood: "playful-creative",
  label: "Playful & Creative",
  description: "Energetic, colorful, and expressive with generous rounding and personality",
  atmosphereTemplate: `{{brandName}}'s design is a celebration of creativity — vibrant, expressive, and unafraid to show personality. The interface mixes bold colors with generous rounding and playful micro-interactions, creating an experience that feels alive and dynamic. This is design that makes you smile.

The {{fontFamily}} typeface brings geometric clarity with a friendly face. At display sizes, weight 600 gives headlines presence without aggression. The primary brand color ({{primaryHex}}) is used generously alongside accent colors, creating a palette that feels like a curated color swatch collection rather than a corporate identity system.

The distinctive touch is in the details: generous border-radius (12-20px) makes every container feel like a friendly card, hover animations add playful motion, and the warm neutral undertone throughout creates a cohesive warmth that ties the colorful accents together.`,
  characteristics: [
    "{{fontFamily}} at weight 600 — present and friendly, not aggressive",
    "Primary color ({{primaryHex}}) used generously alongside complementary accents",
    "Generous border-radius (12px buttons, 20px cards) — everything feels rounded and friendly",
    "Warm neutral undertone throughout — cohesive warmth tying colorful accents together",
    "Playful hover interactions — subtle transforms and color shifts on engagement",
    "Medium shadow system — visible depth without heaviness",
    "Varied section spacing — playful rhythm between tight and generous gaps",
    "Color used expressively — multiple accent colors in the same view",
  ],
  defaultFont: "Nunito Sans",
  defaultFontFallback: "system-ui, -apple-system, sans-serif",
  monoFont: "Fira Code",
  monoFontFallback: "ui-monospace, SFMono-Regular, Consolas, monospace",
  fontWeights: { heading: 600, ui: 500, body: 400 },
  headingLetterSpacing: "-0.5px",
  bodyLineHeight: "1.55",
  headingLineHeight: "1.15",
  sectionSpacing: "64px",
  componentSpacing: "20px",
  buttonRadius: "12px",
  cardRadius: "20px",
  inputRadius: "12px",
  pillRadius: "9999px",
  shadowIntensity: "medium",
  neutralUndertone: "warm",
  dos: [
    "Use {{fontFamily}} at weight 600 for headings — friendly presence",
    "Use generous border-radius (12px buttons, 20px cards) — roundness is personality",
    "Use primary color ({{primaryHex}}) and accent colors together expressively",
    "Use playful hover interactions — subtle scale, rotation, or color shifts",
    "Use warm neutral undertones to tie colorful elements together",
    "Use medium shadows for visible but friendly depth",
    "Use varied section spacing for visual rhythm and energy",
    "Use color boldly — multiple accent colors in the same view are welcome",
  ],
  donts: [
    "Don't use sharp corners (0-4px) — generous rounding is the identity",
    "Don't use a monochrome palette — color expressiveness is core",
    "Don't use clinical, cold neutrals — warm undertones throughout",
    "Don't use whisper-level shadows — depth should be visible and friendly",
    "Don't use overly structured, rigid layouts — allow for visual playfulness",
    "Don't use light font weights (300) — maintain friendly presence (500-600)",
    "Don't be afraid of personality — this system celebrates creative expression",
  ],
  suggestedFonts: [
    { name: "Nunito Sans", fallback: "system-ui, sans-serif" },
    { name: "Poppins", fallback: "system-ui, sans-serif" },
    { name: "Quicksand", fallback: "system-ui, sans-serif" },
    { name: "Comfortaa", fallback: "system-ui, sans-serif" },
  ],
};

export const ARCHETYPES: Record<MoodArchetype, ArchetypePreset> = {
  "clean-minimal": cleanMinimal,
  "warm-friendly": warmFriendly,
  "bold-energetic": boldEnergetic,
  professional,
  "playful-creative": playfulCreative,
};

export function getArchetype(mood: MoodArchetype): ArchetypePreset {
  return ARCHETYPES[mood];
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/schema/archetypes.test.ts`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/schema/archetypes.ts tests/schema/archetypes.test.ts
git commit -m "feat(schema): 5 mood archetype presets"
```

---

### Task 4: DESIGN.md template renderer

**Files:**
- Create: `src/schema/template.ts`
- Create: `tests/schema/template.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// tests/schema/template.test.ts
import { describe, it, expect } from "vitest";
import { renderDesignMd } from "../../src/schema/template.js";
import type { DesignSystem } from "../../src/schema/types.js";

function createMockSystem(): DesignSystem {
  return {
    brandName: "MockBrand",
    mood: "clean-minimal",
    theme: {
      atmosphere: "A clean, minimal design system built on restraint.",
      characteristics: [
        "Near-pure white canvas with near-black text",
        "Shadow-as-border technique throughout",
        "Three-weight typographic system",
        "Gallery-like whitespace between sections",
        "Primary color used sparingly on interactive elements",
      ],
    },
    colors: {
      primary: [
        { name: "Brand Primary", hex: "#5e6ad2", description: "Core brand color." },
        { name: "Brand Dark", hex: "#4a55a8", description: "Darker variant." },
        { name: "Brand Light", hex: "#c4c9f0", description: "Light tint." },
      ],
      accent: [
        { name: "Accent", hex: "#d26a5e", description: "Secondary accent." },
        { name: "Accent Light", hex: "#f0c4c4", description: "Soft accent." },
      ],
      neutral: [
        { name: "Gray 900", hex: "#1a1a1a", description: "Primary text." },
        { name: "Gray 700", hex: "#555555", description: "Secondary text." },
        { name: "Gray 500", hex: "#888888", description: "Muted text." },
        { name: "Gray 300", hex: "#bbbbbb", description: "Borders." },
        { name: "Gray 100", hex: "#eeeeee", description: "Subtle surface." },
        { name: "Gray 50", hex: "#f8f8f8", description: "Lightest surface." },
      ],
      semantic: [
        { name: "Success Green", hex: "#22c55e", description: "Success states." },
        { name: "Error Red", hex: "#ef4444", description: "Error states." },
        { name: "Warning Amber", hex: "#f59e0b", description: "Warning states." },
        { name: "Info Blue", hex: "#3b82f6", description: "Info states." },
      ],
      surface: [
        { name: "Background", hex: "#ffffff", description: "Page background." },
        { name: "Surface", hex: "#fafafa", description: "Card surface." },
        { name: "Surface Elevated", hex: "#ffffff", description: "Overlay surface." },
      ],
      border: [
        { name: "Border Default", hex: "#e5e5e5", description: "Standard border." },
        { name: "Border Subtle", hex: "#f0f0f0", description: "Subtle border." },
      ],
      dark: {
        surface: [
          { name: "Dark Background", hex: "#0a0a0a", description: "Dark bg." },
          { name: "Dark Surface", hex: "#1a1a1a", description: "Dark surface." },
          { name: "Dark Surface Elevated", hex: "#2a2a2a", description: "Elevated." },
        ],
        text: [
          { name: "Dark Text Primary", hex: "#f0f0f0", description: "Light text." },
          { name: "Dark Text Secondary", hex: "#aaaaaa", description: "Secondary." },
        ],
        border: [
          { name: "Dark Border Default", hex: "rgba(255,255,255,0.08)", description: "Dark border." },
          { name: "Dark Border Subtle", hex: "rgba(255,255,255,0.05)", description: "Subtle." },
        ],
      },
    },
    typography: {
      families: {
        primary: "Inter",
        primaryFallback: "system-ui, sans-serif",
        mono: "JetBrains Mono",
        monoFallback: "ui-monospace, monospace",
      },
      hierarchy: [
        { role: "Display Hero", font: "Inter", size: "48px (3.00rem)", weight: 600, lineHeight: "1.10", letterSpacing: "-2.4px", notes: "Maximum impact" },
        { role: "Section Heading", font: "Inter", size: "40px (2.50rem)", weight: 600, lineHeight: "1.15", letterSpacing: "-1.6px", notes: "Section titles" },
        { role: "Sub-heading", font: "Inter", size: "32px (2.00rem)", weight: 600, lineHeight: "1.20", letterSpacing: "-1.0px", notes: "Sub-sections" },
        { role: "Card Title", font: "Inter", size: "24px (1.50rem)", weight: 600, lineHeight: "1.25", letterSpacing: "-0.5px", notes: "Card headings" },
        { role: "Body Large", font: "Inter", size: "20px (1.25rem)", weight: 400, lineHeight: "1.60", letterSpacing: "normal", notes: "Intro text" },
        { role: "Body", font: "Inter", size: "16px (1.00rem)", weight: 400, lineHeight: "1.50", letterSpacing: "normal", notes: "Standard body" },
        { role: "Body Small", font: "Inter", size: "14px (0.88rem)", weight: 400, lineHeight: "1.50", letterSpacing: "normal", notes: "Compact body" },
        { role: "Button", font: "Inter", size: "14px (0.88rem)", weight: 500, lineHeight: "1.00", letterSpacing: "normal", notes: "Button text" },
        { role: "Link", font: "Inter", size: "14px (0.88rem)", weight: 500, lineHeight: "1.00", letterSpacing: "normal", notes: "Navigation links" },
        { role: "Caption", font: "Inter", size: "12px (0.75rem)", weight: 400, lineHeight: "1.33", letterSpacing: "normal", notes: "Metadata" },
        { role: "Label", font: "Inter", size: "11px (0.69rem)", weight: 500, lineHeight: "1.25", letterSpacing: "0.5px", notes: "Small labels" },
        { role: "Mono Body", font: "JetBrains Mono", size: "14px (0.88rem)", weight: 400, lineHeight: "1.60", letterSpacing: "normal", notes: "Code blocks" },
        { role: "Mono Caption", font: "JetBrains Mono", size: "12px (0.75rem)", weight: 500, lineHeight: "1.33", letterSpacing: "normal", notes: "Code labels" },
      ],
      principles: [
        "Compression at display sizes: negative letter-spacing creates engineered headlines",
        "Three-weight system: 400 (read), 500 (interact), 600 (announce)",
        "Mono for technical voice: code, labels, and developer-facing content",
      ],
    },
    components: {
      buttons: [
        { name: "Primary", background: "#5e6ad2", text: "#ffffff", padding: "8px 16px", radius: "6px", shadow: "none", hoverBg: "#4a55a8", use: "Primary CTA" },
        { name: "Secondary", background: "#f0f0f0", text: "#1a1a1a", padding: "8px 16px", radius: "6px", shadow: "none", hoverBg: "#e5e5e5", use: "Secondary actions" },
        { name: "Ghost", background: "transparent", text: "#5e6ad2", padding: "8px 16px", radius: "6px", shadow: "#e5e5e5 0px 0px 0px 1px", hoverBg: "#fafafa", use: "Tertiary actions" },
      ],
      cards: { background: "#fafafa", border: "#e5e5e5 0px 0px 0px 1px", radius: "8px", shadow: "rgba(0,0,0,0.04) 0px 1px 2px", padding: "24px", hoverEffect: "shadow intensification" },
      inputs: { background: "#ffffff", border: "#e5e5e5", radius: "6px", focusBorder: "#5e6ad2", focusShadow: "0 0 0 2px rgba(94,106,210,0.2)", padding: "8px 12px", textColor: "#1a1a1a", placeholderColor: "#888888" },
      navigation: { background: "#ffffff", position: "sticky", linkSize: "14px", linkWeight: 500, linkColor: "#1a1a1a", activeIndicator: "font-weight 600 or underline" },
    },
    layout: {
      spacing: [
        { name: "3xs", value: "2px" }, { name: "2xs", value: "4px" },
        { name: "xs", value: "8px" }, { name: "sm", value: "12px" },
        { name: "md", value: "16px" }, { name: "lg", value: "24px" },
        { name: "xl", value: "32px" }, { name: "2xl", value: "48px" },
        { name: "3xl", value: "64px" }, { name: "4xl", value: "80px" },
      ],
      grid: { maxWidth: "1200px", columns: 12, gutter: "24px" },
      borderRadius: [
        { name: "None", value: "0px", use: "Sharp elements" },
        { name: "Subtle", value: "4px", use: "Small elements" },
        { name: "Button", value: "6px", use: "Buttons, inputs" },
        { name: "Card", value: "8px", use: "Cards, containers" },
        { name: "Large", value: "24px", use: "Large containers" },
        { name: "Pill", value: "9999px", use: "Badges, tags" },
        { name: "Circle", value: "50%", use: "Avatars" },
      ],
      whitespacePhilosophy: "Gallery-like emptiness. Massive vertical padding between sections communicates confidence.",
    },
    elevation: {
      levels: [
        { name: "Flat", level: 0, shadow: "none", use: "Page background, text blocks" },
        { name: "Ring", level: 1, shadow: "rgba(0,0,0,0.08) 0px 0px 0px 1px", use: "Borders, dividers" },
        { name: "Raised", level: 2, shadow: "rgba(0,0,0,0.04) 0px 1px 2px", use: "Cards, buttons" },
        { name: "Floating", level: 3, shadow: "rgba(0,0,0,0.06) 0px 4px 8px", use: "Dropdowns, popovers" },
        { name: "Overlay", level: 4, shadow: "rgba(0,0,0,0.08) 0px 8px 24px", use: "Modals, dialogs" },
      ],
      philosophy: "Shadows are whisper-level — structure comes from spacing and ring borders.",
    },
    responsive: {
      breakpoints: [
        { name: "Mobile", minWidth: "0px", maxWidth: "639px", changes: "Single column, stacked layout" },
        { name: "Tablet", minWidth: "640px", maxWidth: "1023px", changes: "2-column grids" },
        { name: "Desktop", minWidth: "1024px", maxWidth: "1399px", changes: "Full layout, 3-column" },
        { name: "Large Desktop", minWidth: "1400px", maxWidth: "---", changes: "Centered, generous margins" },
      ],
      touchTarget: "44px minimum height and width for all interactive elements",
      collapsingStrategy: [
        "Hero: display text scales down proportionally",
        "Navigation: horizontal links collapse to hamburger menu",
        "Feature cards: 3-column to 2-column to single stacked",
        "Section spacing: desktop values x0.6 on mobile",
      ],
      imageBehavior: [
        "Maintain aspect ratio at all breakpoints",
        "Full-width on mobile, contained on desktop",
        "Lazy loading for below-fold images",
      ],
    },
    dos: [
      "Use negative letter-spacing at display sizes",
      "Use shadow-as-border instead of CSS borders",
      "Use three-weight system strictly",
      "Keep palette achromatic with sparse primary accent",
      "Use multi-layer shadow stacks for cards",
      "Use near-black instead of pure black",
      "Apply primary color only on interactive elements",
    ],
    donts: [
      "Don't use positive letter-spacing on headings",
      "Don't use bold (700) on body text",
      "Don't use CSS border on cards",
      "Don't introduce warm colors into UI chrome",
      "Don't use heavy shadows",
      "Don't use pill radius on action buttons",
      "Don't add decorative elements",
    ],
    agentGuide: {
      quickColors: [
        { name: "Primary CTA", hex: "#5e6ad2" },
        { name: "Background", hex: "#ffffff" },
        { name: "Heading Text", hex: "#1a1a1a" },
        { name: "Body Text", hex: "#555555" },
        { name: "Border", hex: "#e5e5e5" },
      ],
      examplePrompts: [
        "Create a hero section on white background. Headline at 48px Inter weight 600, letter-spacing -2.4px, color #1a1a1a. CTA button: #5e6ad2 bg, white text, 6px radius.",
        "Design a card: #fafafa background, ring shadow rgba(0,0,0,0.08) 0px 0px 0px 1px, 8px radius. Title 24px weight 600.",
        "Build navigation: white sticky header, 14px Inter weight 500 links, dark CTA right-aligned.",
        "Create a form input: white bg, #e5e5e5 border, 6px radius. Focus: #5e6ad2 border with soft ring shadow.",
        "Design a pill badge: #c4c9f0 background, #5e6ad2 text, 9999px radius, 12px font weight 500.",
      ],
      iterationTips: [
        "All neutrals are pure gray — no warm or cool undertone",
        "Button radius is 6px, card radius is 8px — don't mix",
        "Heading weight 600, UI weight 500, body weight 400 — strict roles",
        "Shadow intensity is whisper — keep all shadows under 0.1 opacity",
      ],
    },
  };
}

describe("renderDesignMd", () => {
  const md = renderDesignMd(createMockSystem());

  it("starts with brand name heading", () => {
    expect(md).toContain("# Design System: MockBrand");
  });

  it("has all 9 numbered sections", () => {
    expect(md).toContain("## 1. Visual Theme & Atmosphere");
    expect(md).toContain("## 2. Color Palette & Roles");
    expect(md).toContain("## 3. Typography Rules");
    expect(md).toContain("## 4. Component Stylings");
    expect(md).toContain("## 5. Layout Principles");
    expect(md).toContain("## 6. Depth & Elevation");
    expect(md).toContain("## 7. Do's and Don'ts");
    expect(md).toContain("## 8. Responsive Behavior");
    expect(md).toContain("## 9. Agent Prompt Guide");
  });

  it("section 2 has 7 standard sub-headings", () => {
    for (const sub of [
      "### Primary", "### Accent", "### Neutral Scale",
      "### Semantic", "### Surface & Background", "### Border", "### Dark Mode",
    ]) {
      expect(md).toContain(sub);
    }
  });

  it("section 3 has 7-column typography table", () => {
    expect(md).toContain("| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |");
  });

  it("section 4 has 4 component sub-sections", () => {
    for (const sub of ["### Buttons", "### Cards & Containers", "### Inputs & Forms", "### Navigation"]) {
      expect(md).toContain(sub);
    }
  });

  it("section 6 has elevation table", () => {
    expect(md).toContain("| Level | Treatment | Use |");
  });

  it("section 7 has Do and Don't sub-sections", () => {
    expect(md).toContain("### Do");
    expect(md).toContain("### Don't");
  });

  it("section 8 has 4 responsive sub-sections", () => {
    for (const sub of ["### Breakpoints", "### Touch Targets", "### Collapsing Strategy", "### Image Behavior"]) {
      expect(md).toContain(sub);
    }
  });

  it("section 9 has 3 guide sub-sections", () => {
    for (const sub of ["### Quick Color Reference", "### Example Component Prompts", "### Iteration Guide"]) {
      expect(md).toContain(sub);
    }
  });

  it("contains hex color values", () => {
    expect(md).toMatch(/#[0-9a-fA-F]{6}/);
  });

  it("contains button variant specs", () => {
    expect(md).toContain("Primary");
    expect(md).toContain("Secondary");
    expect(md).toContain("Ghost");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/schema/template.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement template.ts**

```ts
// src/schema/template.ts
import type { DesignSystem, ColorRole, ButtonVariant } from "./types.js";

function colorList(colors: ColorRole[]): string {
  return colors.map((c) => `- **${c.name}** (\`${c.hex}\`): ${c.description}`).join("\n");
}

function renderTheme(s: DesignSystem): string {
  return `## 1. Visual Theme & Atmosphere

${s.theme.atmosphere}

**Key Characteristics:**
${s.theme.characteristics.map((c) => `- ${c}`).join("\n")}`;
}

function renderColors(s: DesignSystem): string {
  return `## 2. Color Palette & Roles

### Primary
${colorList(s.colors.primary)}

### Accent
${colorList(s.colors.accent)}

### Neutral Scale
${colorList(s.colors.neutral)}

### Semantic
${colorList(s.colors.semantic)}

### Surface & Background
${colorList(s.colors.surface)}

### Border
${colorList(s.colors.border)}

### Dark Mode
${colorList(s.colors.dark.surface)}

${colorList(s.colors.dark.text)}

${colorList(s.colors.dark.border)}`;
}

function renderTypography(s: DesignSystem): string {
  const f = s.typography.families;
  const rows = s.typography.hierarchy
    .map((t) =>
      `| ${t.role} | ${t.font} | ${t.size} | ${t.weight} | ${t.lineHeight} | ${t.letterSpacing} | ${t.notes} |`
    )
    .join("\n");

  return `## 3. Typography Rules

### Font Family
- **Primary**: \`${f.primary}\`, with fallback: \`${f.primaryFallback}\`
- **Monospace**: \`${f.mono}\`, with fallback: \`${f.monoFallback}\`

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
${rows}

### Principles
${s.typography.principles.map((p) => `- ${p}`).join("\n")}`;
}

function renderButton(b: ButtonVariant): string {
  const lines = [
    `**${b.name}**`,
    `- Background: \`${b.background}\``,
    `- Text: \`${b.text}\``,
    `- Padding: ${b.padding}`,
    `- Radius: ${b.radius}`,
  ];
  if (b.shadow && b.shadow !== "none") {
    lines.push(`- Shadow: \`${b.shadow}\``);
  }
  lines.push(`- Hover: \`${b.hoverBg}\``);
  lines.push(`- Use: ${b.use}`);
  return lines.join("\n");
}

function renderComponents(s: DesignSystem): string {
  const c = s.components;
  return `## 4. Component Stylings

### Buttons

${c.buttons.map(renderButton).join("\n\n")}

### Cards & Containers
- Background: \`${c.cards.background}\`
- Border: \`${c.cards.border}\`
- Radius: ${c.cards.radius}
- Shadow: \`${c.cards.shadow}\`
- Padding: ${c.cards.padding}
- Hover: ${c.cards.hoverEffect}

### Inputs & Forms
- Background: \`${c.inputs.background}\`
- Border: \`${c.inputs.border}\`
- Radius: ${c.inputs.radius}
- Focus border: \`${c.inputs.focusBorder}\`
- Focus shadow: \`${c.inputs.focusShadow}\`
- Padding: ${c.inputs.padding}
- Text: \`${c.inputs.textColor}\`
- Placeholder: \`${c.inputs.placeholderColor}\`

### Navigation
- Background: \`${c.navigation.background}\`
- Position: ${c.navigation.position}
- Link size: ${c.navigation.linkSize}
- Link weight: ${c.navigation.linkWeight}
- Link color: \`${c.navigation.linkColor}\`
- Active: ${c.navigation.activeIndicator}`;
}

function renderLayout(s: DesignSystem): string {
  const l = s.layout;
  return `## 5. Layout Principles

### Spacing System
- Base unit: 8px
- Scale: ${l.spacing.map((sp) => `${sp.value} (${sp.name})`).join(", ")}

### Grid & Container
- Max width: ${l.grid.maxWidth}
- Columns: ${l.grid.columns}
- Gutter: ${l.grid.gutter}

### Whitespace Philosophy
${l.whitespacePhilosophy}

### Border Radius Scale
${l.borderRadius.map((r) => `- **${r.name}** (${r.value}): ${r.use}`).join("\n")}`;
}

function renderElevation(s: DesignSystem): string {
  const rows = s.elevation.levels
    .map((l) => `| ${l.name} (Level ${l.level}) | \`${l.shadow}\` | ${l.use} |`)
    .join("\n");

  return `## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
${rows}

**Shadow Philosophy:** ${s.elevation.philosophy}`;
}

function renderDosAndDonts(s: DesignSystem): string {
  return `## 7. Do's and Don'ts

### Do
${s.dos.map((d) => `- ${d}`).join("\n")}

### Don't
${s.donts.map((d) => `- ${d}`).join("\n")}`;
}

function renderResponsive(s: DesignSystem): string {
  const rows = s.responsive.breakpoints
    .map((b) => `| ${b.name} | ${b.minWidth}–${b.maxWidth} | ${b.changes} |`)
    .join("\n");

  return `## 8. Responsive Behavior

### Breakpoints
| Name | Width | Key Changes |
|------|-------|-------------|
${rows}

### Touch Targets
${s.responsive.touchTarget}

### Collapsing Strategy
${s.responsive.collapsingStrategy.map((c) => `- ${c}`).join("\n")}

### Image Behavior
${s.responsive.imageBehavior.map((b) => `- ${b}`).join("\n")}`;
}

function renderAgentGuide(s: DesignSystem): string {
  return `## 9. Agent Prompt Guide

### Quick Color Reference
${s.agentGuide.quickColors.map((c) => `- ${c.name}: \`${c.hex}\``).join("\n")}

### Example Component Prompts
${s.agentGuide.examplePrompts.map((p) => `- "${p}"`).join("\n")}

### Iteration Guide
${s.agentGuide.iterationTips.map((t, i) => `${i + 1}. ${t}`).join("\n")}`;
}

export function renderDesignMd(system: DesignSystem): string {
  return [
    `# Design System: ${system.brandName}`,
    "",
    renderTheme(system),
    "",
    renderColors(system),
    "",
    renderTypography(system),
    "",
    renderComponents(system),
    "",
    renderLayout(system),
    "",
    renderElevation(system),
    "",
    renderDosAndDonts(system),
    "",
    renderResponsive(system),
    "",
    renderAgentGuide(system),
    "",
  ].join("\n");
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/schema/template.test.ts`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/schema/template.ts tests/schema/template.test.ts
git commit -m "feat(schema): DESIGN.md template renderer"
```

---

### Task 5: Barrel export

**Files:**
- Create: `src/schema/index.ts`

- [ ] **Step 1: Create barrel export**

```ts
// src/schema/index.ts
export * from "./types.js";
export { ARCHETYPES, getArchetype } from "./archetypes.js";
export { renderDesignMd } from "./template.js";
```

- [ ] **Step 2: Verify full compilation**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Run all tests**

Run: `npx vitest run`
Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add src/schema/index.ts
git commit -m "feat(schema): barrel export for schema module"
```
