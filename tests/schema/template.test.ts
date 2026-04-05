// tests/schema/template.test.ts

import { describe, it, expect, beforeAll } from "vitest";
import { renderDesignMd } from "../../src/schema/template.js";
import type { DesignSystem } from "../../src/schema/types.js";

const mockSystem: DesignSystem = {
  brandName: "MockBrand",
  mood: "clean-minimal",
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
    primary: [
      { name: "Primary 500", hex: "#0066FF", description: "Main brand color" },
      { name: "Primary 600", hex: "#0052CC", description: "Hover state" },
      { name: "Primary 400", hex: "#3385FF", description: "Light variant" },
    ],
    accent: [
      { name: "Accent Teal", hex: "#00BFA5", description: "Supporting accent" },
      { name: "Accent Amber", hex: "#FFB300", description: "Warning accent" },
    ],
    neutral: [
      { name: "Gray 50", hex: "#FAFAFA", description: "Lightest background" },
      { name: "Gray 100", hex: "#F5F5F5", description: "Subtle background" },
      { name: "Gray 300", hex: "#E0E0E0", description: "Borders" },
      { name: "Gray 500", hex: "#9E9E9E", description: "Muted text" },
      { name: "Gray 700", hex: "#616161", description: "Secondary text" },
      { name: "Gray 900", hex: "#212121", description: "Primary text" },
    ],
    semantic: [
      { name: "Success", hex: "#4CAF50", description: "Success state" },
      { name: "Warning", hex: "#FF9800", description: "Warning state" },
      { name: "Error", hex: "#F44336", description: "Error state" },
      { name: "Info", hex: "#2196F3", description: "Info state" },
    ],
    surface: [
      { name: "Surface White", hex: "#FFFFFF", description: "Default surface" },
      { name: "Surface Gray", hex: "#FAFAFA", description: "Subtle surface" },
      { name: "Surface Dark", hex: "#121212", description: "Dark surface" },
    ],
    border: [
      { name: "Border Light", hex: "#E0E0E0", description: "Default border" },
      { name: "Border Medium", hex: "#BDBDBD", description: "Stronger border" },
    ],
    dark: {
      surface: [
        {
          name: "Dark Surface 900",
          hex: "#121212",
          description: "Primary dark background",
        },
        {
          name: "Dark Surface 800",
          hex: "#1E1E1E",
          description: "Secondary dark surface",
        },
        {
          name: "Dark Surface 700",
          hex: "#2C2C2C",
          description: "Elevated dark surface",
        },
      ],
      text: [
        {
          name: "Dark Text Primary",
          hex: "#FFFFFF",
          description: "Primary text on dark",
        },
        {
          name: "Dark Text Secondary",
          hex: "#B0B0B0",
          description: "Secondary text on dark",
        },
      ],
      border: [
        {
          name: "Dark Border",
          hex: "#333333",
          description: "Border on dark background",
        },
        {
          name: "Dark Border Strong",
          hex: "#444444",
          description: "Strong border on dark",
        },
      ],
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
    it("has ### Primary sub-heading", () => {
      expect(output).toMatch(/^### Primary$/m);
    });
    it("has ### Accent sub-heading", () => {
      expect(output).toMatch(/^### Accent$/m);
    });
    it("has ### Neutral Scale sub-heading", () => {
      expect(output).toMatch(/^### Neutral Scale$/m);
    });
    it("has ### Semantic sub-heading", () => {
      expect(output).toMatch(/^### Semantic$/m);
    });
    it("has ### Surface & Background sub-heading", () => {
      expect(output).toMatch(/^### Surface & Background$/m);
    });
    it("has ### Border sub-heading", () => {
      expect(output).toMatch(/^### Border$/m);
    });
    it("has ### Dark Mode sub-heading", () => {
      expect(output).toMatch(/^### Dark Mode$/m);
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
