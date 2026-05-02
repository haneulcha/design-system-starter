// tests/generator/color-category.test.ts
//
// Validates the color-category generator produces the contract described in
// docs/research/color-category-proposal.md. Each describe block cites the
// proposal section it locks down.

import { describe, it, expect } from "vitest";
import {
  generateColorCategory,
  countEmittedTokens,
  resolveKnobs,
  buildNeutralScale,
  buildAccentScale,
  buildSemanticTokens,
} from "../../src/generator/color-category.js";
import {
  DEFAULT_COLOR_KNOBS,
  NEUTRAL_L_RANGE,
  SEMANTIC_PALETTE,
} from "../../src/schema/color.js";

const BRAND_BLUE = "#3b82f6"; // mid-tone blue

describe("generateColorCategory @ all defaults — proposal §7", () => {
  const tokens = generateColorCategory({ brandColor: BRAND_BLUE });

  it("emits exactly 33 tokens", () => {
    expect(countEmittedTokens(tokens)).toBe(33);
  });

  it("emits 9 neutral stops named 50/100/200/300/400/500/600/800/900", () => {
    expect(Object.keys(tokens.neutral.stops)).toEqual([
      "50",
      "100",
      "200",
      "300",
      "400",
      "500",
      "600",
      "800",
      "900",
    ]);
  });

  it("emits 5 accent stops with `contrast` slot for text.on-primary", () => {
    expect(Object.keys(tokens.accent.stops).sort()).toEqual([
      "300",
      "500",
      "700",
      "900",
      "contrast",
    ]);
  });

  it("emits 8 semantic tokens (4 roles × {bg, text})", () => {
    const total = Object.values(tokens.semantic).reduce(
      (n, v) => n + Object.keys(v ?? {}).length,
      0,
    );
    expect(total).toBe(8);
  });

  it("emits 5 surface aliases and 6 text aliases", () => {
    expect(Object.keys(tokens.surface)).toHaveLength(5);
    expect(Object.keys(tokens.text)).toHaveLength(6);
  });

  it("exposes the resolved knob set on the output", () => {
    expect(tokens.knobs).toEqual(DEFAULT_COLOR_KNOBS);
  });

  it("does not emit accentSecondary when off (default)", () => {
    expect(tokens.accentSecondary).toBeUndefined();
  });
});

describe("resolveKnobs — partial input", () => {
  it("fills missing knobs from defaults", () => {
    const knobs = resolveKnobs({
      brandColor: BRAND_BLUE,
      knobs: { neutral: { tint: "cool" } },
    });
    expect(knobs.neutral.tint).toBe("cool");
    expect(knobs.neutral.stops).toBe("standard");
    expect(knobs.accent).toEqual(DEFAULT_COLOR_KNOBS.accent);
    expect(knobs.semantic).toEqual(DEFAULT_COLOR_KNOBS.semantic);
  });
});

describe("buildNeutralScale — proposal §2", () => {
  it("achromatic tint → chroma 0, stops within [0.10, 1.00]", () => {
    const scale = buildNeutralScale("achromatic", "standard");
    for (const stop of Object.values(scale.stops)) {
      expect(stop.c).toBe(0);
      expect(stop.l).toBeGreaterThanOrEqual(NEUTRAL_L_RANGE.min);
      expect(stop.l).toBeLessThanOrEqual(NEUTRAL_L_RANGE.max);
    }
  });

  it("cool tint → blue-ish hue and small non-zero chroma", () => {
    const scale = buildNeutralScale("cool", "standard");
    const sample = scale.stops["500"];
    expect(sample.c).toBeGreaterThan(0);
    expect(sample.h).toBeGreaterThan(200);
    expect(sample.h).toBeLessThan(280);
  });

  it("green tint hue lands in the green band", () => {
    const scale = buildNeutralScale("green", "standard");
    expect(scale.stops["500"].h).toBe(150);
  });

  it("purple tint hue lands in the purple band", () => {
    const scale = buildNeutralScale("purple", "standard");
    expect(scale.stops["500"].h).toBe(290);
  });

  it("monotonically darkens from neutral.50 to neutral.900", () => {
    const scale = buildNeutralScale("achromatic", "standard");
    const order = ["50", "100", "200", "300", "400", "500", "600", "800", "900"];
    for (let i = 1; i < order.length; i++) {
      expect(scale.stops[order[i]].l).toBeLessThan(scale.stops[order[i - 1]].l);
    }
  });

  it("throws on non-standard stops knob (deferred to v0.2)", () => {
    expect(() => buildNeutralScale("achromatic", "few")).toThrow(/not yet implemented/);
    expect(() => buildNeutralScale("achromatic", "rich")).toThrow(/not yet implemented/);
  });
});

describe("buildAccentScale — proposal §2", () => {
  it("anchors `500` at the input L and preserves chroma + hue", () => {
    const accent = buildAccentScale(BRAND_BLUE, "standard");
    expect(accent.stops["500"].l).toBeCloseTo(accent.baseL, 6);
    expect(accent.stops["500"].c).toBeGreaterThan(0);
    expect(accent.stops["500"].h).toBeCloseTo(accent.hue, 4);
  });

  it("spreads numeric stops across ±0.18 around base", () => {
    const accent = buildAccentScale(BRAND_BLUE, "standard");
    expect(accent.stops["300"].l).toBeGreaterThan(accent.baseL);
    expect(accent.stops["900"].l).toBeLessThan(accent.baseL);
    expect(accent.stops["300"].l - accent.stops["900"].l).toBeCloseTo(0.36, 4);
  });

  it("contrast is white when accent base is dark", () => {
    const accent = buildAccentScale("#1e3a8a", "standard"); // very dark blue
    expect(accent.stops.contrast.l).toBe(1.0);
    expect(accent.stops.contrast.c).toBe(0);
  });

  it("contrast is dark when accent base is light", () => {
    const accent = buildAccentScale("#fde68a", "standard"); // light yellow
    expect(accent.stops.contrast.l).toBeLessThan(0.5);
  });

  it("throws on non-standard stops knob", () => {
    expect(() => buildAccentScale(BRAND_BLUE, "few")).toThrow(/not yet implemented/);
  });
});

describe("buildSemanticTokens — proposal §3, §5", () => {
  it("minimal: bg only, info dropped → 3 tokens", () => {
    const tokens = buildSemanticTokens("minimal");
    expect(Object.keys(tokens).sort()).toEqual(["error", "success", "warning"]);
    for (const role of Object.keys(tokens) as Array<keyof typeof tokens>) {
      expect(Object.keys(tokens[role] ?? {})).toEqual(["background"]);
    }
  });

  it("standard: bg + text for all 4 roles → 8 tokens", () => {
    const tokens = buildSemanticTokens("standard");
    expect(Object.keys(tokens).sort()).toEqual(["error", "info", "success", "warning"]);
    for (const variants of Object.values(tokens)) {
      expect(Object.keys(variants ?? {}).sort()).toEqual(["background", "text"]);
    }
  });

  it("rich: bg + text + border for all 4 roles → 12 tokens", () => {
    const tokens = buildSemanticTokens("rich");
    let count = 0;
    for (const variants of Object.values(tokens)) {
      count += Object.keys(variants ?? {}).length;
    }
    expect(count).toBe(12);
  });

  it("uses the fixed semantic hues from SEMANTIC_PALETTE", () => {
    const tokens = buildSemanticTokens("standard");
    expect(tokens.error?.background?.h).toBe(SEMANTIC_PALETTE.error.hue);
    expect(tokens.success?.text?.h).toBe(SEMANTIC_PALETTE.success.hue);
    expect(tokens.warning?.background?.h).toBe(SEMANTIC_PALETTE.warning.hue);
    expect(tokens.info?.background?.h).toBe(SEMANTIC_PALETTE.info.hue);
  });
});

describe("accent.secondary knob", () => {
  it("emits a second accent scale when on + secondary hex provided", () => {
    const tokens = generateColorCategory({
      brandColor: BRAND_BLUE,
      brandColorSecondary: "#f97316",
      knobs: { accent: { secondary: "on" } },
    });
    expect(tokens.accentSecondary).toBeDefined();
    expect(Object.keys(tokens.accentSecondary!.stops)).toHaveLength(5);
    expect(tokens.accentSecondary!.hue).not.toBeCloseTo(tokens.accent.hue, 1);
  });

  it("throws when on but secondary hex missing", () => {
    expect(() =>
      generateColorCategory({
        brandColor: BRAND_BLUE,
        knobs: { accent: { secondary: "on" } },
      }),
    ).toThrow(/brandColorSecondary is required/);
  });
});

describe("aliases.cardinality knob", () => {
  it("standard returns the enumerated alias maps", () => {
    const tokens = generateColorCategory({ brandColor: BRAND_BLUE });
    expect(tokens.surface.canvas).toBe("neutral.50");
    expect(tokens.text["on-primary"]).toBe("accent.contrast");
  });

  it("throws on non-standard cardinality (deferred to v0.2)", () => {
    expect(() =>
      generateColorCategory({
        brandColor: BRAND_BLUE,
        knobs: { aliases: { cardinality: "few" } },
      }),
    ).toThrow(/not yet implemented/);
    expect(() =>
      generateColorCategory({
        brandColor: BRAND_BLUE,
        knobs: { aliases: { cardinality: "rich" } },
      }),
    ).toThrow(/not yet implemented/);
  });
});

describe("input validation", () => {
  it("throws when brandColor is empty", () => {
    expect(() =>
      generateColorCategory({ brandColor: "" }),
    ).toThrow(/brandColor is required/);
  });
});
