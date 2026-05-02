// tests/schema/color.test.ts
//
// Validates that the color category schema (src/schema/color.ts) faithfully
// encodes docs/research/color-category-proposal.md. Each block cites the
// proposal section it locks down.

import { describe, it, expect } from "vitest";
import {
  DEFAULT_COLOR_KNOBS,
  NEUTRAL_STOP_COUNT,
  ACCENT_STOP_COUNT,
  NEUTRAL_L_RANGE,
  NEUTRAL_DEFAULT_CHROMA,
  ACCENT_L_HALF_SPREAD,
  SEMANTIC_PALETTE,
  SEMANTIC_DEPTH_VARIANTS,
  SEMANTIC_DEPTH_INCLUDES_INFO,
  SURFACE_ALIASES_STANDARD,
  TEXT_ALIASES_STANDARD,
  ALIAS_CARDINALITY,
  NEUTRAL_STOPS_OPTIONS,
  NEUTRAL_TINT_OPTIONS,
  ACCENT_STOPS_OPTIONS,
  ACCENT_SECONDARY_OPTIONS,
  SEMANTIC_DEPTH_OPTIONS,
  ALIASES_CARDINALITY_OPTIONS,
} from "../../src/schema/color.js";

describe("DEFAULT_COLOR_KNOBS — proposal §5", () => {
  it("uses 'standard' for every cardinality knob", () => {
    expect(DEFAULT_COLOR_KNOBS.neutral.stops).toBe("standard");
    expect(DEFAULT_COLOR_KNOBS.accent.stops).toBe("standard");
    expect(DEFAULT_COLOR_KNOBS.semantic.depth).toBe("standard");
    expect(DEFAULT_COLOR_KNOBS.aliases.cardinality).toBe("standard");
  });

  it("defaults neutral tint to achromatic (corpus 38% achromatic, 0/56 warm)", () => {
    expect(DEFAULT_COLOR_KNOBS.neutral.tint).toBe("achromatic");
  });

  it("defaults accent.secondary to off (multi-hue corpus signal is over-counted)", () => {
    expect(DEFAULT_COLOR_KNOBS.accent.secondary).toBe("off");
  });
});

describe("Tier 1 stop counts — proposal §2, §5", () => {
  it("neutral: few=5 / standard=9 / rich=11", () => {
    expect(NEUTRAL_STOP_COUNT).toEqual({ few: 5, standard: 9, rich: 11 });
  });

  it("accent: few=4 / standard=5 / rich=8", () => {
    expect(ACCENT_STOP_COUNT).toEqual({ few: 4, standard: 5, rich: 8 });
  });
});

describe("Neutral palette constants — proposal §2", () => {
  it("L floor 0.10 (lifted from corpus 0.00) and ceiling 1.00", () => {
    expect(NEUTRAL_L_RANGE.min).toBe(0.1);
    expect(NEUTRAL_L_RANGE.max).toBe(1.0);
  });

  it("default chroma is 0", () => {
    expect(NEUTRAL_DEFAULT_CHROMA).toBe(0);
  });
});

describe("Accent palette constants — proposal §2", () => {
  it("L half-spread is ±0.18 around input L", () => {
    expect(ACCENT_L_HALF_SPREAD).toBe(0.18);
  });
});

describe("SEMANTIC_PALETTE — proposal §3", () => {
  it("error at hue 20° (red), core priority", () => {
    expect(SEMANTIC_PALETTE.error.hue).toBe(20);
    expect(SEMANTIC_PALETTE.error.priority).toBe("core");
  });

  it("success at hue 150° (green), core priority", () => {
    expect(SEMANTIC_PALETTE.success.hue).toBe(150);
    expect(SEMANTIC_PALETTE.success.priority).toBe("core");
  });

  it("warning at hue 70° (yellow/orange), core priority", () => {
    expect(SEMANTIC_PALETTE.warning.hue).toBe(70);
    expect(SEMANTIC_PALETTE.warning.priority).toBe("core");
  });

  it("info at hue 230° (blue), optional priority", () => {
    expect(SEMANTIC_PALETTE.info.hue).toBe(230);
    expect(SEMANTIC_PALETTE.info.priority).toBe("optional");
  });
});

describe("SEMANTIC_DEPTH — proposal §5", () => {
  it("minimal: bg only, no info → 3 tokens total", () => {
    expect(SEMANTIC_DEPTH_VARIANTS.minimal).toEqual(["background"]);
    expect(SEMANTIC_DEPTH_INCLUDES_INFO.minimal).toBe(false);
  });

  it("standard: bg+text, includes info → 8 tokens total", () => {
    expect(SEMANTIC_DEPTH_VARIANTS.standard).toEqual(["background", "text"]);
    expect(SEMANTIC_DEPTH_INCLUDES_INFO.standard).toBe(true);
    const totalRoles = 4;
    expect(SEMANTIC_DEPTH_VARIANTS.standard.length * totalRoles).toBe(8);
  });

  it("rich: bg+text+border, includes info → 12 tokens total", () => {
    expect(SEMANTIC_DEPTH_VARIANTS.rich).toEqual(["background", "text", "border"]);
    expect(SEMANTIC_DEPTH_INCLUDES_INFO.rich).toBe(true);
    expect(SEMANTIC_DEPTH_VARIANTS.rich.length * 4).toBe(12);
  });
});

describe("SURFACE_ALIASES_STANDARD — proposal §4", () => {
  it("emits 5 surface aliases", () => {
    expect(Object.keys(SURFACE_ALIASES_STANDARD)).toHaveLength(5);
  });

  it("maps to neutral scale positions per the corpus median table", () => {
    expect(SURFACE_ALIASES_STANDARD).toEqual({
      canvas: "neutral.50",
      soft: "neutral.100",
      strong: "neutral.200",
      card: "neutral.50",
      hairline: "neutral.300",
    });
  });
});

describe("TEXT_ALIASES_STANDARD — proposal §4", () => {
  it("emits 6 text aliases", () => {
    expect(Object.keys(TEXT_ALIASES_STANDARD)).toHaveLength(6);
  });

  it("maps to neutral scale + accent.contrast for on-primary", () => {
    expect(TEXT_ALIASES_STANDARD).toEqual({
      ink: "neutral.900",
      body: "neutral.800",
      "body-strong": "neutral.900",
      muted: "neutral.600",
      "muted-soft": "neutral.500",
      "on-primary": "accent.contrast",
    });
  });
});

describe("ALIAS_CARDINALITY — proposal §5", () => {
  it("few: surface 3 / text 4", () => {
    expect(ALIAS_CARDINALITY.few).toEqual({ surface: 3, text: 4 });
  });

  it("standard: surface 5 / text 6 (matches enumerated maps)", () => {
    expect(ALIAS_CARDINALITY.standard).toEqual({ surface: 5, text: 6 });
    expect(Object.keys(SURFACE_ALIASES_STANDARD).length).toBe(
      ALIAS_CARDINALITY.standard.surface,
    );
    expect(Object.keys(TEXT_ALIASES_STANDARD).length).toBe(
      ALIAS_CARDINALITY.standard.text,
    );
  });

  it("rich: surface 8 / text 7", () => {
    expect(ALIAS_CARDINALITY.rich).toEqual({ surface: 8, text: 7 });
  });
});

describe("Knob option enumerations — proposal §5", () => {
  it("neutral.tint omits warm (corpus 0/56 warm-tinted)", () => {
    expect(NEUTRAL_TINT_OPTIONS).toEqual(["achromatic", "cool", "green", "purple"]);
    expect(NEUTRAL_TINT_OPTIONS).not.toContain("warm");
  });

  it("cardinality knobs all expose few/standard/rich", () => {
    expect(NEUTRAL_STOPS_OPTIONS).toEqual(["few", "standard", "rich"]);
    expect(ACCENT_STOPS_OPTIONS).toEqual(["few", "standard", "rich"]);
    expect(ALIASES_CARDINALITY_OPTIONS).toEqual(["few", "standard", "rich"]);
  });

  it("accent.secondary is binary off/on", () => {
    expect(ACCENT_SECONDARY_OPTIONS).toEqual(["off", "on"]);
  });

  it("semantic.depth exposes minimal/standard/rich", () => {
    expect(SEMANTIC_DEPTH_OPTIONS).toEqual(["minimal", "standard", "rich"]);
  });
});

describe("Default-emission token count — proposal §7", () => {
  it("totals 33 tokens at all defaults (9 + 5 + 8 + 5 + 6)", () => {
    const neutralCount = NEUTRAL_STOP_COUNT[DEFAULT_COLOR_KNOBS.neutral.stops];
    const accentCount = ACCENT_STOP_COUNT[DEFAULT_COLOR_KNOBS.accent.stops];
    const semanticVariants =
      SEMANTIC_DEPTH_VARIANTS[DEFAULT_COLOR_KNOBS.semantic.depth].length;
    const semanticRoles = SEMANTIC_DEPTH_INCLUDES_INFO[
      DEFAULT_COLOR_KNOBS.semantic.depth
    ]
      ? 4
      : 3;
    const semanticCount = semanticVariants * semanticRoles;
    const surfaceCount =
      ALIAS_CARDINALITY[DEFAULT_COLOR_KNOBS.aliases.cardinality].surface;
    const textCount =
      ALIAS_CARDINALITY[DEFAULT_COLOR_KNOBS.aliases.cardinality].text;

    expect(neutralCount).toBe(9);
    expect(accentCount).toBe(5);
    expect(semanticCount).toBe(8);
    expect(surfaceCount).toBe(5);
    expect(textCount).toBe(6);

    const total = neutralCount + accentCount + semanticCount + surfaceCount + textCount;
    expect(total).toBe(33);
  });
});
