import { describe, it, expect, beforeAll } from "vitest";
import {
  generateColorCategory,
  toLegacyColorScales,
} from "../../src/generator/color-category.js";
import {
  generatePrimitive,
  generateSemantic,
  generateComponent,
  buildDesignTokens,
} from "../../src/generator/tokens.js";
import { generate } from "../../src/generator/index.js";
import { PALETTE_SLOTS } from "../../src/schema/archetype-palettes.js";
import type {
  PrimitiveTokens,
  SemanticTokens,
  ComponentTokens,
  DesignTokens,
} from "../../src/schema/types.js";

const colorTokens = generateColorCategory({ preset: "professional" });
const scales = toLegacyColorScales(colorTokens);

let primitive: PrimitiveTokens;
let semantic: SemanticTokens;
let component: ComponentTokens;

beforeAll(() => {
  primitive = generatePrimitive(scales);
  semantic = generateSemantic(colorTokens);
  component = generateComponent(semantic);
});

// ─── generatePrimitive ────────────────────────────────────────────────────────

describe("generatePrimitive", () => {
  it("has a single 'palette' hue containing every slot", () => {
    expect(primitive.colors).toHaveProperty("palette");
    const stops = Object.keys(primitive.colors.palette);
    expect(stops).toHaveLength(PALETTE_SLOTS.length);
    for (const slot of PALETTE_SLOTS) {
      expect(stops, `slot "${slot}" missing in palette`).toContain(slot);
    }
  });

  it("each slot has light and dark Oklch values", () => {
    for (const [step, value] of Object.entries(primitive.colors.palette)) {
      expect(value.light, `palette/${step}.light`).toHaveProperty("l");
      expect(value.dark, `palette/${step}.dark`).toHaveProperty("l");
    }
  });

  it("also exposes the 'neutral' hue (9 base scale stops) for downstream display", () => {
    expect(primitive.colors).toHaveProperty("neutral");
    expect(Object.keys(primitive.colors.neutral)).toHaveLength(9);
  });

  it("does NOT contain the per-role hue keys from the prior derivation pipeline", () => {
    const keys = Object.keys(primitive.colors);
    for (const legacy of ["error", "success", "warning", "info"]) {
      expect(keys, `legacy key "${legacy}" should be gone`).not.toContain(legacy);
    }
  });
});

// ─── generateSemantic ─────────────────────────────────────────────────────────

describe("generateSemantic", () => {
  const requiredKeys = [
    // surface
    "bg/canvas", "bg/soft", "bg/strong", "bg/card", "bg/hairline",
    // text
    "text/ink", "text/body", "text/body-strong",
    "text/muted", "text/muted-soft", "text/on-primary",
    // accent
    "accent/primary", "accent/hover", "accent/active", "accent/strong",
    // status (always emitted — no depth knob)
    "status/error-bg",   "status/error-text",
    "status/success-bg", "status/success-text",
    "status/warning-bg", "status/warning-text",
    "status/info-bg",    "status/info-text",
  ];

  it("has all required role keys", () => {
    for (const role of requiredKeys) {
      expect(semantic, `missing role: ${role}`).toHaveProperty(role);
    }
  });

  it("every value uses the 'palette/<slot>' format", () => {
    for (const [role, ref] of Object.entries(semantic)) {
      expect(ref, `${role} must start with 'palette/'`).toMatch(/^palette\//);
    }
  });

  it("every referenced slot exists in primitive.colors.palette", () => {
    const palette = primitive.colors.palette;
    for (const [role, ref] of Object.entries(semantic)) {
      const slot = ref.slice("palette/".length);
      expect(palette, `semantic["${role}"] = "${ref}" — slot "${slot}" missing`).toHaveProperty(slot);
    }
  });
});

// ─── generateComponent ────────────────────────────────────────────────────────

describe("generateComponent", () => {
  it("has button.primary, button.secondary, button.ghost", () => {
    expect(component.button.primary).toBeDefined();
    expect(component.button.secondary).toBeDefined();
    expect(component.button.ghost).toBeDefined();
  });

  it("button.primary references the accent + on-primary aliases", () => {
    expect(component.button.primary.bg).toBe("accent/primary");
    expect(component.button.primary.text).toBe("text/on-primary");
  });

  it("has input.default/focus/error/disabled", () => {
    expect(component.input.default).toBeDefined();
    expect(component.input.focus).toBeDefined();
    expect(component.input.error).toBeDefined();
    expect(component.input.disabled).toBeDefined();
  });

  it("has card.default", () => {
    expect(component.card.default).toBeDefined();
  });

  it("has badge.default/success/error/warning/info", () => {
    expect(component.badge.default).toBeDefined();
    expect(component.badge.success).toBeDefined();
    expect(component.badge.error).toBeDefined();
    expect(component.badge.warning).toBeDefined();
    expect(component.badge.info).toBeDefined();
  });

  it("ALL leaf values exist as semantic keys OR are 'transparent'", () => {
    const semanticKeys = new Set(Object.keys(semantic));
    for (const [componentName, variants] of Object.entries(component)) {
      for (const [variantName, props] of Object.entries(variants)) {
        for (const [propName, value] of Object.entries(props)) {
          const isValid = value === "transparent" || semanticKeys.has(value);
          expect(
            isValid,
            `component.${componentName}.${variantName}.${propName} = "${value}" not in semantic and not 'transparent'`,
          ).toBe(true);
        }
      }
    }
  });
});

// ─── buildDesignTokens — typography section (unchanged) ───────────────────────

describe("buildDesignTokens — typography", () => {
  const result = generate({ brandName: "TokenTest", preset: "professional", fontFamily: "Inter" });
  const tokens: DesignTokens = result.tokens;

  it("families has exactly 3 keys: sans, mono, serif", () => {
    expect(Object.keys(tokens.typography.families).sort()).toEqual(["mono", "sans", "serif"]);
  });

  it("styles has exactly 20 keys", () => {
    expect(Object.keys(tokens.typography.styles)).toHaveLength(20);
  });

  it("all style keys use '-' separator (no dots)", () => {
    for (const key of Object.keys(tokens.typography.styles)) {
      expect(key, `key "${key}" must not contain dots`).not.toContain(".");
    }
  });

  it("heading-xl has fontSize=64 and letterSpacing=-0.02", () => {
    const style = tokens.typography.styles["heading-xl"];
    expect(style.fontSize).toBe(64);
    expect(style.letterSpacing).toBe(-0.02);
  });

  it("badge has letterSpacing=0.05", () => {
    expect(tokens.typography.styles["badge"].letterSpacing).toBe(0.05);
  });

  it("custom sans font flows through families.sans and body-md.fontFamily", () => {
    const customResult = generate({
      brandName: "CustomFont",
      preset: "professional",
      fontFamily: "Mona Sans",
      typographyKnobs: { fontFamily: { sans: "Mona Sans" } },
    });
    expect(customResult.tokens.typography.families.sans).toContain("Mona Sans");
    expect(customResult.tokens.typography.styles["body-md"].fontFamily).toContain("Mona Sans");
  });
});
