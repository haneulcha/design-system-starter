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
import { generateTypographyCategory } from "../../src/generator/typography-category.js";
import { generate } from "../../src/generator/index.js";
import type {
  PrimitiveTokens,
  SemanticTokens,
  ComponentTokens,
  DesignTokens,
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

// ─── buildDesignTokens — typography section ───────────────────────────────────

describe("buildDesignTokens — typography", () => {
  const result = generate({
    brandName: "TokenTest",
    brandColor: "#5e6ad2",
  });
  const tokens: DesignTokens = result.tokens;

  it("families has exactly 3 keys: sans, mono, serif", () => {
    const keys = Object.keys(tokens.typography.families).sort();
    expect(keys).toEqual(["mono", "sans", "serif"]);
  });

  it("families does NOT have legacy keys: primary, primaryFallback, monoFallback", () => {
    const keys = Object.keys(tokens.typography.families);
    expect(keys).not.toContain("primary");
    expect(keys).not.toContain("primaryFallback");
    expect(keys).not.toContain("monoFallback");
  });

  it("styles has exactly 20 keys", () => {
    expect(Object.keys(tokens.typography.styles)).toHaveLength(20);
  });

  it("all style keys use '-' separator (no dots)", () => {
    for (const key of Object.keys(tokens.typography.styles)) {
      expect(key, `key "${key}" must not contain dots`).not.toContain(".");
    }
  });

  it("styles has the expected 20 profile keys", () => {
    const expectedKeys = [
      "heading-xl", "heading-lg", "heading-md", "heading-sm", "heading-xs",
      "body-lg", "body-md", "body-sm",
      "caption-md", "caption-sm", "caption-xs",
      "code-md", "code-sm", "code-xs",
      "button-md", "button-sm",
      "card", "nav", "link", "badge",
    ];
    for (const key of expectedKeys) {
      expect(tokens.typography.styles, `missing style key: "${key}"`).toHaveProperty(key);
    }
  });

  it("does NOT have legacy style keys like 'display-hero', 'body-large', 'card-title'", () => {
    expect(tokens.typography.styles).not.toHaveProperty("display-hero");
    expect(tokens.typography.styles).not.toHaveProperty("body-large");
    expect(tokens.typography.styles).not.toHaveProperty("card-title");
  });

  it("heading-xl has fontSize=64 and letterSpacing=-0.02", () => {
    const style = tokens.typography.styles["heading-xl"];
    expect(style.fontSize).toBe(64);
    expect(style.letterSpacing).toBe(-0.02);
  });

  it("heading-lg has letterSpacing=-0.02", () => {
    expect(tokens.typography.styles["heading-lg"].letterSpacing).toBe(-0.02);
  });

  it("badge has letterSpacing=0.05", () => {
    expect(tokens.typography.styles["badge"].letterSpacing).toBe(0.05);
  });

  it("body-md has letterSpacing=0", () => {
    expect(tokens.typography.styles["body-md"].letterSpacing).toBe(0);
  });

  it("body-md.fontFamily includes both 'Inter' and 'Pretendard'", () => {
    const fontFamily = tokens.typography.styles["body-md"].fontFamily;
    expect(fontFamily).toContain("Inter");
    expect(fontFamily).toContain("Pretendard");
  });

  it("all letterSpacing values are numbers", () => {
    for (const [key, style] of Object.entries(tokens.typography.styles)) {
      expect(typeof style.letterSpacing, `${key}.letterSpacing must be a number`).toBe("number");
    }
  });

  it("code styles use the mono font chain", () => {
    const codeMd = tokens.typography.styles["code-md"];
    // The mono chain starts with "Geist Mono"
    expect(codeMd.fontFamily).toContain("Geist Mono");
  });

  it("sans font chain is the full fallback string", () => {
    // Must include at least Inter and a generic fallback
    expect(tokens.typography.families.sans).toContain("Inter");
    expect(tokens.typography.families.sans).toContain("sans-serif");
  });

  it("custom sans font flows through families.sans and body-md.fontFamily", () => {
    const customResult = generate({
      brandName: "CustomFont",
      brandColor: "#5e6ad2",
      typographyKnobs: { fontFamily: { sans: "Mona Sans" } },
    });
    expect(customResult.tokens.typography.families.sans).toContain("Mona Sans");
    expect(customResult.tokens.typography.styles["body-md"].fontFamily).toContain("Mona Sans");
  });
});
