import { describe, it, expect, beforeAll } from "vitest";
import {
  generateColorCategory,
  toLegacyColorScales,
} from "../../src/generator/color-category.js";
import {
  generatePrimitive,
  generateSemantic,
  generateComponent,
} from "../../src/generator/tokens.js";
import type {
  PrimitiveTokens,
  SemanticTokens,
  ComponentTokens,
} from "../../src/schema/types.js";

const colorTokens = generateColorCategory({ brandColor: "#5e6ad2" });
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
  it("has neutral, accent, and 4 semantic hues", () => {
    expect(primitive.colors).toHaveProperty("neutral");
    expect(primitive.colors).toHaveProperty("accent");
    expect(primitive.colors).toHaveProperty("error");
    expect(primitive.colors).toHaveProperty("success");
    expect(primitive.colors).toHaveProperty("warning");
    expect(primitive.colors).toHaveProperty("info"); // standard depth includes info
  });

  it("neutral has 9 stops including the alias-referenced names", () => {
    const stops = Object.keys(primitive.colors.neutral);
    expect(stops).toHaveLength(9);
    for (const required of ["50", "100", "200", "300", "500", "600", "800", "900"]) {
      expect(stops).toContain(required);
    }
  });

  it("accent has 5 stops including 'contrast'", () => {
    const stops = Object.keys(primitive.colors.accent);
    expect(stops).toHaveLength(5);
    expect(stops).toContain("contrast");
    expect(stops).toContain("500");
  });

  it("each step has light and dark Oklch values", () => {
    for (const [hue, scale] of Object.entries(primitive.colors)) {
      for (const [step, value] of Object.entries(scale)) {
        expect(value.light, `${hue}-${step}.light`).toHaveProperty("l");
        expect(value.dark, `${hue}-${step}.dark`).toHaveProperty("l");
      }
    }
  });

  it("does NOT have legacy gray/brand/red/green/amber/blue keys", () => {
    const keys = Object.keys(primitive.colors);
    for (const legacy of ["gray", "brand", "red", "green", "amber", "blue"]) {
      expect(keys, `legacy key "${legacy}" should be gone`).not.toContain(legacy);
    }
  });
});

// ─── generateSemantic ─────────────────────────────────────────────────────────

describe("generateSemantic", () => {
  const requiredKeys = [
    // surface aliases
    "bg/canvas", "bg/soft", "bg/strong", "bg/card", "bg/hairline",
    // text aliases
    "text/ink", "text/body", "text/body-strong",
    "text/muted", "text/muted-soft", "text/on-primary",
    // accent
    "accent/primary", "accent/hover", "accent/active", "accent/strong",
    // status
    "status/error-bg", "status/error-text",
    "status/success-bg", "status/success-text",
    "status/warning-bg", "status/warning-text",
    "status/info-bg", "status/info-text",
  ];

  it("has all required role keys", () => {
    for (const role of requiredKeys) {
      expect(semantic, `missing role: ${role}`).toHaveProperty(role);
    }
  });

  it("text/on-primary points at accent-contrast", () => {
    expect(semantic["text/on-primary"]).toBe("accent-contrast");
  });

  it("ALL referenced hues exist in primitive.colors", () => {
    const primitiveHues = new Set(Object.keys(primitive.colors));
    for (const [role, ref] of Object.entries(semantic)) {
      const lastDash = ref.lastIndexOf("-");
      const hue = ref.slice(0, lastDash);
      expect(
        primitiveHues.has(hue),
        `semantic["${role}"] = "${ref}" — hue "${hue}" not in primitive`,
      ).toBe(true);
    }
  });

  it("ALL referenced steps exist in the respective hue", () => {
    for (const [role, ref] of Object.entries(semantic)) {
      const lastDash = ref.lastIndexOf("-");
      const hue = ref.slice(0, lastDash);
      const step = ref.slice(lastDash + 1);
      const hueMap = primitive.colors[hue];
      expect(
        hueMap,
        `semantic["${role}"] = "${ref}" — hue not in primitive`,
      ).toBeDefined();
      expect(
        hueMap,
        `semantic["${role}"] = "${ref}" — step "${step}" missing in "${hue}"`,
      ).toHaveProperty(step);
    }
  });

  it("omits info status keys when semantic.depth=minimal", () => {
    const minimalTokens = generateColorCategory({
      brandColor: "#5e6ad2",
      knobs: { semantic: { depth: "minimal" } },
    });
    const minimalSemantic = generateSemantic(minimalTokens);
    expect(minimalSemantic).not.toHaveProperty("status/info-bg");
    expect(minimalSemantic).not.toHaveProperty("status/info-text");
  });

  it("emits accent/secondary keys when accentSecondary is on", () => {
    const dualTokens = generateColorCategory({
      brandColor: "#5e6ad2",
      brandColorSecondary: "#f97316",
      knobs: { accent: { secondary: "on" } },
    });
    const dualSemantic = generateSemantic(dualTokens);
    expect(dualSemantic).toHaveProperty("accent/secondary");
  });
});

// ─── generateComponent ────────────────────────────────────────────────────────

describe("generateComponent", () => {
  it("has button.primary, button.secondary, button.ghost", () => {
    expect(component.button.primary).toBeDefined();
    expect(component.button.secondary).toBeDefined();
    expect(component.button.ghost).toBeDefined();
  });

  it("button.primary references the new accent + on-primary aliases", () => {
    expect(component.button.primary.bg).toBe("accent/primary");
    expect(component.button.primary.text).toBe("text/on-primary");
  });

  it("has input.default, input.focus, input.error, input.disabled", () => {
    expect(component.input.default).toBeDefined();
    expect(component.input.focus).toBeDefined();
    expect(component.input.error).toBeDefined();
    expect(component.input.disabled).toBeDefined();
  });

  it("has card.default", () => {
    expect(component.card.default).toBeDefined();
  });

  it("has badge.default, badge.success, badge.error, badge.warning, badge.info", () => {
    expect(component.badge.default).toBeDefined();
    expect(component.badge.success).toBeDefined();
    expect(component.badge.error).toBeDefined();
    expect(component.badge.warning).toBeDefined();
    expect(component.badge.info).toBeDefined();
  });

  it("has divider.default", () => {
    expect(component.divider.default).toBeDefined();
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
