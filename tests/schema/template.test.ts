// tests/schema/template.test.ts

import { describe, it, expect, beforeAll } from "vitest";
import { renderDesignMd } from "../../src/schema/template.js";
import type { DesignSystem } from "../../src/schema/types.js";

const mockSystem: DesignSystem = {
  brandName: "MockBrand",
  mood: "precise",
  theme: {
    atmosphere:
      "MockBrand lives in a restrained world where whitespace is the primary design material.",
    characteristics: [
      "Monochrome palette with a single chromatic accent",
      "Aggressive negative letter-spacing on headings",
      "Shadow-as-border surfaces float via whisper-level box-shadow",
    ],
  },
  colors: {
    gray: {
      "100": { light: "#f5f5f5", dark: "#0b0b0b" },
      "200": { light: "#e8e8e8", dark: "#141414" },
      "300": { light: "#d4d4d4", dark: "#1f1f1f" },
      "400": { light: "#b8b8b8", dark: "#2e2e2e" },
      "500": { light: "#969696", dark: "#454545" },
      "600": { light: "#757575", dark: "#616161" },
      "700": { light: "#545454", dark: "#878787" },
      "800": { light: "#363636", dark: "#adadad" },
      "900": { light: "#1f1f1f", dark: "#d1d1d1" },
      "1000": { light: "#1b1a1a", dark: "#e8e7e8" },
    },
    blue: {
      "100": { light: "#f3f5fb", dark: "#0a0b0f" },
      "200": { light: "#e2e7f5", dark: "#111521" },
      "300": { light: "#c8d3ed", dark: "#192036" },
      "400": { light: "#a2b3e0", dark: "#253252" },
      "500": { light: "#7a93d0", dark: "#374c72" },
      "600": { light: "#5873bc", dark: "#4d6391" },
      "700": { light: "#4a53a8", dark: "#6874bc" },
      "800": { light: "#3a4090", dark: "#8d97d0" },
      "900": { light: "#2c3175", dark: "#b8bde2" },
      "1000": { light: "#110f49", dark: "#dee6ff" },
    },
    green: {
      "100": { light: "#f2fbf4", dark: "#050f07" },
      "200": { light: "#e0f5e5", dark: "#0e1f12" },
      "300": { light: "#c3ebcc", dark: "#162e1c" },
      "400": { light: "#98d9a6", dark: "#1f452a" },
      "500": { light: "#6dc47f", dark: "#2d633d" },
      "600": { light: "#47ae5b", dark: "#3d8150" },
      "700": { light: "#3a9649", dark: "#55a368" },
      "800": { light: "#2d7939", dark: "#79c18a" },
      "900": { light: "#225f2c", dark: "#a8d9b2" },
      "1000": { light: "#0e2d14", dark: "#d2efd8" },
    },
  },
  typography: {
    families: {
      primary: "Inter",
      primaryFallback: "system-ui, -apple-system, sans-serif",
      mono: "JetBrains Mono",
      monoFallback: "ui-monospace, SFMono-Regular, Consolas, monospace",
    },
    hierarchy: [
      {
        role: "Display Hero",
        font: "Inter",
        size: "72px",
        weight: 600,
        lineHeight: "1.10",
        letterSpacing: "-2.4px",
        notes: "Used for hero sections",
      },
      {
        role: "Heading 1",
        font: "Inter",
        size: "48px",
        weight: 600,
        lineHeight: "1.15",
        letterSpacing: "-1.5px",
        notes: "Page-level headings",
      },
      {
        role: "Heading 2",
        font: "Inter",
        size: "32px",
        weight: 600,
        lineHeight: "1.20",
        letterSpacing: "-1.0px",
        notes: "Section headings",
      },
      {
        role: "Body",
        font: "Inter",
        size: "16px",
        weight: 400,
        lineHeight: "1.50",
        letterSpacing: "0px",
        notes: "Default body text",
      },
      {
        role: "Caption",
        font: "Inter",
        size: "12px",
        weight: 400,
        lineHeight: "1.40",
        letterSpacing: "0.2px",
        notes: "Captions and metadata",
      },
      {
        role: "Button",
        font: "Inter",
        size: "14px",
        weight: 500,
        lineHeight: "1.00",
        letterSpacing: "0px",
        notes: "Button labels",
      },
    ],
    principles: [
      "Use aggressive negative letter-spacing on headings",
      "Maintain strict weight hierarchy: 600/500/400",
      "Let typographic scale carry the visual hierarchy",
    ],
  },
  components: {
    button: {
      sizes: {
        sm: { height: "spacing.xl", paddingX: "spacing.sm", gap: "spacing.2xs", fontSize: "typography.caption", iconSize: "spacing.md", radius: "radius.button" },
        md: { height: "spacing.2xl", paddingX: "spacing.md", gap: "spacing.xs", fontSize: "typography.button", iconSize: "spacing.md", radius: "radius.button" },
        lg: { height: "spacing.3xl", paddingX: "spacing.lg", gap: "spacing.xs", fontSize: "typography.body", iconSize: "spacing.lg", radius: "radius.button" },
      },
      variants: ["primary", "secondary", "ghost"],
    },
    input: {
      fieldHeight: "spacing.2xl", fieldPaddingX: "spacing.sm", fieldRadius: "radius.input",
      labelFieldGap: "spacing.2xs", fieldHelperGap: "spacing.2xs",
      labelFont: "typography.label", valueFont: "typography.body", helperFont: "typography.caption",
      iconSize: "spacing.md", states: ["default", "focus", "error", "disabled"],
    },
    card: {
      radius: "radius.card", contentPadding: "spacing.lg", contentGap: "spacing.sm",
      shadow: "elevation.raised", headerFont: "typography.card-title", bodyFont: "typography.body",
      footerGap: "spacing.xs", variants: ["default", "compact"],
    },
    badge: {
      sizes: {
        sm: { height: "spacing.lg", paddingX: "spacing.xs", radius: "radius.pill", font: "typography.label" },
        md: { height: "spacing.xl", paddingX: "spacing.sm", radius: "radius.pill", font: "typography.caption" },
      },
      variants: ["default", "success", "error", "warning", "info"],
    },
    divider: { lineHeight: "spacing.3xs", labelPaddingX: "spacing.sm", labelFont: "typography.caption" },
  },
  layout: {
    spacing: [
      { name: "xs", value: "4px" },
      { name: "sm", value: "8px" },
      { name: "md", value: "16px" },
      { name: "lg", value: "24px" },
    ],
    grid: {
      maxWidth: "1280px",
      columns: 12,
      gutter: "24px",
    },
    borderRadius: [
      { name: "sm", value: "4px", use: "Subtle rounding" },
      { name: "md", value: "6px", use: "Buttons and inputs" },
      { name: "lg", value: "8px", use: "Cards and containers" },
    ],
    whitespacePhilosophy:
      "Generous whitespace between sections (80px) reads as intentional silence rather than emptiness.",
  },
  elevation: {
    levels: [
      {
        name: "Flat",
        level: 0,
        shadow: "none",
        use: "Default state, no elevation",
      },
      {
        name: "Raised",
        level: 1,
        shadow: "0 1px 3px rgba(0,0,0,0.06)",
        use: "Cards and panels",
      },
      {
        name: "Overlay",
        level: 2,
        shadow: "0 4px 12px rgba(0,0,0,0.10)",
        use: "Dropdowns and popovers",
      },
    ],
    philosophy:
      "Shadow is used as border — surfaces appear to float rather than sit.",
  },
  responsive: {
    breakpoints: [
      {
        name: "Mobile",
        minWidth: "0px",
        maxWidth: "767px",
        changes: "Single column layout, full-width components",
      },
      {
        name: "Tablet",
        minWidth: "768px",
        maxWidth: "1023px",
        changes: "Two column layout, condensed navigation",
      },
    ],
    touchTarget: "Minimum 44px × 44px for all interactive elements",
    collapsingStrategy: [
      "Navigation collapses to hamburger menu at mobile breakpoint",
      "Multi-column grids collapse to single column below 768px",
    ],
    imageBehavior: [
      "Images are fluid by default: max-width 100%, height auto",
      "Hero images use object-fit: cover with defined aspect ratios",
    ],
  },
  dos: [
    "Use aggressive negative letter-spacing (−2.4px) on all headings",
    "Rely on shadow instead of border for surface separation",
    "Limit the palette to neutral grays plus one precise accent hex",
    "Apply the three-weight system strictly: 600/500/400",
    "Preserve large whitespace zones between sections",
    "Keep border-radius small and consistent (6–8px)",
    "Let typographic scale carry the visual hierarchy",
    "Use Inter or another geometric grotesque for crisp neutrality",
  ],
  donts: [
    "Don't add decorative illustrations or gradients",
    "Don't use more than one accent color family",
    "Don't soften headings with loose or positive letter-spacing",
    "Don't crowd components — respect the 24px component spacing minimum",
    "Don't use heavy drop-shadows that break the floating surface effect",
    "Don't introduce a fourth font weight without a clear semantic role",
    "Don't use rounded pill buttons outside of tag/badge contexts",
    "Don't mix display and body fonts without a strong typographic rationale",
  ],
  agentGuide: {
    quickColors: [
      { name: "Primary", hex: "#0066FF" },
      { name: "Background", hex: "#FFFFFF" },
      { name: "Text", hex: "#212121" },
      { name: "Accent", hex: "#00BFA5" },
    ],
    examplePrompts: [
      'Build a hero section with a headline in Inter 600 at 72px with −2.4px letter-spacing, subheadline in 400/20px, and a #0066FF primary CTA button with 6px radius.',
      'Create a card grid with 8px radius cards, 1px #E0E0E0 border, subtle box-shadow 0 1px 3px rgba(0,0,0,0.06), and 24px internal padding.',
      'Design a sticky navigation bar with white background, 14px/500 links in #616161, and a 2px bottom border active indicator in #0066FF.',
    ],
    iterationTips: [
      "If the design feels too sparse, add a subtle warm background (#FAFAFA) behind key sections rather than introducing new colors.",
      "To increase visual interest without breaking the system, vary the font size scale rather than adding color.",
      "When in doubt, add more whitespace — this system is built for generous breathing room.",
    ],
  },
};

describe("renderDesignMd", () => {
  let output: string;

  beforeAll(() => {
    output = renderDesignMd(mockSystem);
  });

  it("produces a top-level heading with the brand name", () => {
    expect(output).toMatch(/^# Design System: MockBrand/m);
  });

  it("contains all 9 numbered sections", () => {
    for (let i = 1; i <= 9; i++) {
      expect(output).toMatch(new RegExp(`^## ${i}\\.`, "m"));
    }
  });

  describe("Section 2 — Colors", () => {
    it("has ### Color Scales sub-heading", () => {
      expect(output).toMatch(/^### Color Scales$/m);
    });
    it("has #### Gray hue heading", () => {
      expect(output).toMatch(/^#### Gray$/m);
    });
    it("has #### Blue hue heading", () => {
      expect(output).toMatch(/^#### Blue$/m);
    });
    it("has #### Green hue heading", () => {
      expect(output).toMatch(/^#### Green$/m);
    });
    it("has step table header", () => {
      expect(output).toMatch(/\| Step \| Light \| Dark \|/);
    });
    it("contains step values in table rows", () => {
      expect(output).toMatch(/\| 100 \|/);
      expect(output).toMatch(/\| 1000 \|/);
    });
  });

  describe("Section 3 — Typography", () => {
    it("has a 7-column table header", () => {
      expect(output).toMatch(
        /\| Role \| Font \| Size \| Weight \| Line Height \| Letter Spacing \| Notes \|/
      );
    });
  });

  describe("Section 4 — Components", () => {
    let md: string;
    beforeAll(() => {
      md = output;
    });

    it("section 4 has 5 component sub-sections", () => {
      for (const sub of ["### Button", "### Input", "### Card", "### Badge", "### Divider"]) {
        expect(md).toContain(sub);
      }
      expect(md).not.toContain("### Avatar");
    });

    it("button section has size table with token references", () => {
      expect(md).toContain("spacing.xl");
      expect(md).toContain("spacing.2xl");
      expect(md).toContain("typography.button");
    });
  });

  describe("Section 6 — Elevation", () => {
    it("has the elevation table header", () => {
      expect(output).toMatch(/\| Level \| Treatment \| Use \|/);
    });
  });

  describe("Section 7 — Dos and Don'ts", () => {
    it("has ### Do sub-heading", () => {
      expect(output).toMatch(/^### Do$/m);
    });
    it("has ### Don't sub-heading", () => {
      expect(output).toMatch(/^### Don't$/m);
    });
  });

  describe("Section 8 — Responsive", () => {
    it("has ### Breakpoints sub-heading", () => {
      expect(output).toMatch(/^### Breakpoints$/m);
    });
    it("has ### Touch Targets sub-heading", () => {
      expect(output).toMatch(/^### Touch Targets$/m);
    });
    it("has ### Collapsing Strategy sub-heading", () => {
      expect(output).toMatch(/^### Collapsing Strategy$/m);
    });
    it("has ### Image Behavior sub-heading", () => {
      expect(output).toMatch(/^### Image Behavior$/m);
    });
  });

  describe("Section 9 — Agent Guide", () => {
    it("has ### Quick Color Reference sub-heading", () => {
      expect(output).toMatch(/^### Quick Color Reference$/m);
    });
    it("has ### Example Component Prompts sub-heading", () => {
      expect(output).toMatch(/^### Example Component Prompts$/m);
    });
    it("has ### Iteration Guide sub-heading", () => {
      expect(output).toMatch(/^### Iteration Guide$/m);
    });
  });

  it("contains hex color values", () => {
    expect(output).toMatch(/#[0-9a-fA-F]{6}/);
  });
});
