import { describe, it, expect, beforeAll } from "vitest";
import { generateScales } from "../../src/generator/color.js";
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

const scales = generateScales("#5e6ad2", "cool", "balanced");

let primitive: PrimitiveTokens;
let semantic: SemanticTokens;
let component: ComponentTokens;

beforeAll(() => {
  primitive = generatePrimitive(scales);
  semantic = generateSemantic(primitive);
  component = generateComponent(semantic);
});

// ─── generatePrimitive ────────────────────────────────────────────────────────

describe("generatePrimitive", () => {
  it("has a gray hue", () => {
    expect(primitive.colors).toHaveProperty("gray");
  });

  it("each hue has exactly 10 steps (100-1000)", () => {
    const expectedSteps = ["100", "200", "300", "400", "500", "600", "700", "800", "900", "1000"];
    for (const [hue, scale] of Object.entries(primitive.colors)) {
      for (const step of expectedSteps) {
        expect(scale, `${hue} missing step ${step}`).toHaveProperty(step);
      }
      expect(Object.keys(scale)).toHaveLength(10);
    }
  });

  it("each step has light and dark hex values", () => {
    for (const [hue, scale] of Object.entries(primitive.colors)) {
      for (const [step, value] of Object.entries(scale)) {
        expect(value, `${hue}-${step} missing light`).toHaveProperty("light");
        expect(value, `${hue}-${step} missing dark`).toHaveProperty("dark");
        expect(value.light, `${hue}-${step}.light not hex`).toMatch(/^#[0-9a-f]{6}$/i);
        expect(value.dark, `${hue}-${step}.dark not hex`).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  it("has at least 5 hues (gray + brand + accent + 4 status)", () => {
    expect(Object.keys(primitive.colors).length).toBeGreaterThanOrEqual(5);
  });

  it("has status hues: green, red, amber, blue", () => {
    const hues = Object.keys(primitive.colors);
    expect(hues).toContain("green");
    expect(hues).toContain("red");
    expect(hues).toContain("amber");
    expect(hues).toContain("blue");
  });
});

// ─── generateSemantic ─────────────────────────────────────────────────────────

describe("generateSemantic", () => {
  const expectedRoles = [
    "bg/base", "bg/subtle", "bg/muted",
    "text/primary", "text/secondary", "text/muted", "text/disabled",
    "border/default", "border/subtle", "border/strong",
    "brand/primary", "brand/secondary", "brand/subtle", "brand/muted",
    "accent/primary", "accent/subtle",
    "status/success", "status/success-subtle", "status/success-text",
    "status/error", "status/error-subtle", "status/error-text",
    "status/warning", "status/warning-subtle", "status/warning-text",
    "status/info", "status/info-subtle", "status/info-text",
    "white", "black",
  ];

  it("has all required role keys", () => {
    for (const role of expectedRoles) {
      expect(semantic, `missing role: ${role}`).toHaveProperty(role);
    }
  });

  it("ALL values match \"{hue}-{step}\" pattern", () => {
    const pattern = /^[a-z]+-\d{3,4}$/;
    for (const [role, value] of Object.entries(semantic)) {
      expect(
        value,
        `semantic["${role}"] = "${value}" does not match {hue}-{step} pattern`
      ).toMatch(pattern);
    }
  });

  it("ALL referenced hues exist in primitive.colors", () => {
    const primitiveHues = new Set(Object.keys(primitive.colors));
    for (const [role, ref] of Object.entries(semantic)) {
      const lastDash = ref.lastIndexOf("-");
      const hue = ref.slice(0, lastDash);
      expect(
        primitiveHues.has(hue),
        `semantic["${role}"] = "${ref}" — hue "${hue}" not in primitive.colors`
      ).toBe(true);
    }
  });

  it("ALL referenced steps exist in the respective hue", () => {
    for (const [role, ref] of Object.entries(semantic)) {
      const lastDash = ref.lastIndexOf("-");
      const hue = ref.slice(0, lastDash);
      const step = ref.slice(lastDash + 1);
      const hueMap = primitive.colors[hue];
      if (hueMap) {
        expect(
          hueMap,
          `semantic["${role}"] = "${ref}" — step "${step}" not in primitive.colors["${hue}"]`
        ).toHaveProperty(step);
      }
    }
  });
});

// ─── generateComponent ────────────────────────────────────────────────────────

describe("generateComponent", () => {
  it("has button.primary, button.secondary, button.ghost", () => {
    expect(component.button).toBeDefined();
    expect(component.button.primary).toBeDefined();
    expect(component.button.secondary).toBeDefined();
    expect(component.button.ghost).toBeDefined();
  });

  it("button.primary has required keys", () => {
    const bp = component.button.primary;
    expect(bp).toHaveProperty("bg");
    expect(bp).toHaveProperty("bgHover");
    expect(bp).toHaveProperty("bgDisabled");
    expect(bp).toHaveProperty("text");
    expect(bp).toHaveProperty("textDisabled");
  });

  it("has input.default, input.focus, input.error, input.disabled", () => {
    expect(component.input).toBeDefined();
    expect(component.input.default).toBeDefined();
    expect(component.input.focus).toBeDefined();
    expect(component.input.error).toBeDefined();
    expect(component.input.disabled).toBeDefined();
  });

  it("has card.default", () => {
    expect(component.card).toBeDefined();
    expect(component.card.default).toBeDefined();
  });

  it("has badge.default, badge.success, badge.error, badge.warning, badge.info", () => {
    expect(component.badge).toBeDefined();
    expect(component.badge.default).toBeDefined();
    expect(component.badge.success).toBeDefined();
    expect(component.badge.error).toBeDefined();
    expect(component.badge.warning).toBeDefined();
    expect(component.badge.info).toBeDefined();
  });

  it("has divider.default", () => {
    expect(component.divider).toBeDefined();
    expect(component.divider.default).toBeDefined();
  });

  it("does NOT have avatar component", () => {
    expect(component.avatar).toBeUndefined();
  });

  it("ALL leaf values exist as semantic keys OR are 'transparent'", () => {
    const semanticKeys = new Set(Object.keys(semantic));

    for (const [componentName, variants] of Object.entries(component)) {
      for (const [variantName, props] of Object.entries(variants)) {
        for (const [propName, value] of Object.entries(props)) {
          const isValid = value === "transparent" || semanticKeys.has(value);
          expect(
            isValid,
            `component.${componentName}.${variantName}.${propName} = "${value}" is not in semantic or "transparent"`
          ).toBe(true);
        }
      }
    }
  });
});
