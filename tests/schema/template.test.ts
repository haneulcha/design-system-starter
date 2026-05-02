// tests/schema/template.test.ts

import { describe, it, expect, beforeAll } from "vitest";
import { generate } from "../../src/generator/index.js";
import { renderDesignMd } from "../../src/schema/template.js";
import type { DesignSystem } from "../../src/schema/types.js";

let system: DesignSystem;
let output: string;

let systemOverride: DesignSystem;
let outputOverride: string;

beforeAll(() => {
  const result = generate({
    brandName: "MockBrand",
    brandColor: "#5e6ad2",
    fontFamily: "Inter",
  });
  system = result.system;
  output = result.designMd;

  const resultOverride = generate({
    brandName: "OverrideBrand",
    brandColor: "#5e6ad2",
    typographyKnobs: { fontFamily: { sans: "Mona Sans" } },
  });
  systemOverride = resultOverride.system;
  outputOverride = resultOverride.designMd;
});

describe("renderDesignMd", () => {
  it("produces a top-level heading with the brand name", () => {
    expect(output).toMatch(/^# Design System: MockBrand/m);
  });

  it("contains all 9 numbered sections", () => {
    for (let i = 1; i <= 9; i++) {
      expect(output).toMatch(new RegExp(`^## ${i}\\.`, "m"));
    }
  });

  it("does not reference legacy 'mood' field anywhere", () => {
    expect(output).not.toMatch(/\*\*Mood:\*\*/);
  });

  describe("Section 2 — Color System (3-tier)", () => {
    it("has Tier 1 — Neutral Scale heading", () => {
      expect(output).toMatch(/^### Tier 1 — Neutral Scale$/m);
    });
    it("has Tier 1 — Accent Scale heading", () => {
      expect(output).toMatch(/^### Tier 1 — Accent Scale$/m);
    });
    it("has Tier 2 — Semantic Palette heading", () => {
      expect(output).toMatch(/^### Tier 2 — Semantic Palette$/m);
    });
    it("has Tier 3 — Role Aliases heading", () => {
      expect(output).toMatch(/^### Tier 3 — Role Aliases$/m);
    });
    it("renders neutral steps with the proposal naming", () => {
      expect(output).toContain("neutral.50");
      expect(output).toContain("neutral.900");
    });
    it("renders accent contrast slot", () => {
      expect(output).toContain("accent.contrast");
    });
    it("renders surface and text alias bullets", () => {
      expect(output).toContain("`surface.canvas`");
      expect(output).toContain("`text.ink`");
      expect(output).toContain("`text.on-primary`");
    });
    it("declares the active knob set", () => {
      expect(output).toMatch(/Active knobs/);
      expect(output).toMatch(/neutral\.tint:\s*`achromatic`/);
    });
  });

  describe("Section 3 — Typography", () => {
    it("has the ## 3. Typography heading", () => {
      expect(output).toMatch(/^## 3\. Typography$/m);
    });

    it("has Font Family Chains subsection", () => {
      expect(output).toMatch(/^### Font Family Chains$/m);
    });

    it("has Scales subsection", () => {
      expect(output).toMatch(/^### Scales$/m);
    });

    it("has category subsections for all 5 multi-variant categories", () => {
      for (const cat of ["Heading", "Body", "Caption", "Button"]) {
        expect(output).toMatch(new RegExp(`^#### ${cat}$`, "m"));
      }
      // Code category has a family annotation in the label
      expect(output).toMatch(/^#### Code \(mono family\)$/m);
    });

    it("has the single-variant table with correct header", () => {
      expect(output).toMatch(/\| category \| family \| size \| weight \| line-height \| letter-spacing \|/);
    });

    it("heading.xl row has size 64", () => {
      // The xl row in the Heading table contains 64
      expect(output).toMatch(/\| xl\s*\|\s*64\s*\|/);
    });

    it("badge row has letter-spacing 0.05em", () => {
      expect(output).toContain("0.05em");
    });

    it("font chains include Korean fallback markers", () => {
      expect(output).toContain("Pretendard");
      expect(output).toContain("D2Coding");
      expect(output).toContain("Noto Serif KR");
    });

    it("does not contain legacy role names", () => {
      expect(output).not.toContain("Display Hero");
      expect(output).not.toContain("Section Heading");
      expect(output).not.toContain("Body Large");
      expect(output).not.toContain("Card Title");
      expect(output).not.toContain("Mono Body");
    });

    it("does not contain legacy Principles subsection", () => {
      expect(output).not.toMatch(/^### Principles$/m);
    });

    it("font override: sans override appears in rendered Sans chain", () => {
      expect(outputOverride).toContain("Mona Sans");
    });
  });

  describe("Section 4 — Components", () => {
    it("section 4 has 5 component sub-sections", () => {
      for (const sub of ["### Button", "### Input", "### Card", "### Badge", "### Divider"]) {
        expect(output).toContain(sub);
      }
      expect(output).not.toContain("### Avatar");
    });
    it("button section has size table with token references", () => {
      expect(output).toContain("spacing.xl");
      expect(output).toContain("spacing.2xl");
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

  it("DesignSystem keeps colorTokens as the source of truth", () => {
    expect(system.colorTokens).toBeDefined();
    expect(Object.keys(system.colorTokens.neutral.stops)).toHaveLength(9);
  });
});
