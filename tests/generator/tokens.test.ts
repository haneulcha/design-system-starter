import { describe, it, expect, beforeAll } from "vitest";
import { generatePalette } from "../../src/generator/color.js";
import { getArchetype } from "../../src/schema/archetypes.js";
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

const archetype = getArchetype("clean-minimal");
const palette = generatePalette("#5e6ad2", archetype.neutralUndertone);

let primitive: PrimitiveTokens;
let semantic: SemanticTokens;
let component: ComponentTokens;

beforeAll(() => {
  primitive = generatePrimitive(palette, "#5e6ad2");
  semantic = generateSemantic(primitive, archetype);
  component = generateComponent(semantic);
});

// ─── generatePrimitive ────────────────────────────────────────────────────────

describe("generatePrimitive", () => {
  it("has hue-named brand colors: blue500, blue700, blue200", () => {
    expect(primitive.colors).toHaveProperty("blue500");
    expect(primitive.colors).toHaveProperty("blue700");
    expect(primitive.colors).toHaveProperty("blue200");
  });

  it("has neutral gray scale from gray950 to gray50", () => {
    const expected = [
      "gray950", "gray900", "gray800", "gray700", "gray600",
      "gray500", "gray400", "gray300", "gray200", "gray100", "gray50",
    ];
    for (const key of expected) {
      expect(primitive.colors, `missing ${key}`).toHaveProperty(key);
    }
  });

  it("has semantic hues: green500, green200, red500, red200, amber500, amber200, cyan500, cyan200", () => {
    const semanticKeys = [
      "green500", "green200",
      "red500", "red200",
      "amber500", "amber200",
      "cyan500", "cyan200",
    ];
    for (const key of semanticKeys) {
      expect(primitive.colors, `missing ${key}`).toHaveProperty(key);
    }
  });

  it("has surface tokens: surfaceBase, surfaceSubtle, surfaceMuted, surfaceRaised", () => {
    expect(primitive.colors).toHaveProperty("surfaceBase");
    expect(primitive.colors).toHaveProperty("surfaceSubtle");
    expect(primitive.colors).toHaveProperty("surfaceMuted");
    expect(primitive.colors).toHaveProperty("surfaceRaised");
  });

  it("has border tokens: borderSubtle, borderDefault, borderStrong", () => {
    expect(primitive.colors).toHaveProperty("borderSubtle");
    expect(primitive.colors).toHaveProperty("borderDefault");
    expect(primitive.colors).toHaveProperty("borderStrong");
  });

  it("has dark tokens", () => {
    const darkKeys = [
      "darkBg", "darkSubtle", "darkRaised",
      "darkTextMuted", "darkTextDefault", "darkTextStrong",
      "darkBorderSubtle", "darkBorderDefault", "darkBorderStrong",
    ];
    for (const key of darkKeys) {
      expect(primitive.colors, `missing ${key}`).toHaveProperty(key);
    }
  });

  it("has constants white and black", () => {
    expect(primitive.colors.white).toBe("#ffffff");
    expect(primitive.colors.black).toBe("#000000");
  });

  it("ALL values match /^#[0-9a-f]{6}$/i", () => {
    for (const [key, value] of Object.entries(primitive.colors)) {
      expect(value, `${key} = "${value}" is not a valid 6-digit hex`).toMatch(
        /^#[0-9a-f]{6}$/i
      );
    }
  });
});

// ─── generateSemantic ─────────────────────────────────────────────────────────

describe("generateSemantic", () => {
  const requiredLightKeys = [
    "bgBase", "bgSubtle", "bgMuted", "bgRaised",
    "textStrong", "textDefault", "textMuted",
    "borderSubtle", "borderDefault", "borderStrong",
    "brandPrimary", "brandHover", "brandLight",
    "success", "successLight",
    "error", "errorLight",
    "warning", "warningLight",
    "info", "infoLight",
    "white", "black",
  ];

  it("has all required light keys", () => {
    for (const key of requiredLightKeys) {
      expect(semantic.light, `missing light.${key}`).toHaveProperty(key);
    }
  });

  it("has dark mode keys", () => {
    const requiredDarkKeys = [
      "bgBase", "bgSubtle", "bgRaised",
      "textStrong", "textDefault", "textMuted",
      "borderSubtle", "borderDefault", "borderStrong",
      "brandPrimary", "brandHover", "brandLight",
      "success", "successLight",
      "error", "errorLight",
      "warning", "warningLight",
      "info", "infoLight",
      "white", "black",
    ];
    for (const key of requiredDarkKeys) {
      expect(semantic.dark, `missing dark.${key}`).toHaveProperty(key);
    }
  });

  it("ALL light values are keys that exist in primitive.colors", () => {
    for (const [key, value] of Object.entries(semantic.light)) {
      expect(
        primitive.colors,
        `semantic.light.${key} = "${value}" is not a key in primitive.colors`
      ).toHaveProperty(value);
    }
  });

  it("ALL dark values are keys that exist in primitive.colors", () => {
    for (const [key, value] of Object.entries(semantic.dark)) {
      expect(
        primitive.colors,
        `semantic.dark.${key} = "${value}" is not a key in primitive.colors`
      ).toHaveProperty(value);
    }
  });
});

// ─── generateComponent ────────────────────────────────────────────────────────

describe("generateComponent", () => {
  it("has button.primary with required keys", () => {
    expect(component.button).toBeDefined();
    expect(component.button.primary).toBeDefined();
    const bp = component.button.primary;
    expect(bp).toHaveProperty("bg");
    expect(bp).toHaveProperty("bgHover");
    expect(bp).toHaveProperty("bgActive");
    expect(bp).toHaveProperty("bgDisabled");
    expect(bp).toHaveProperty("text");
    expect(bp).toHaveProperty("textDisabled");
  });

  it("has button.secondary and button.ghost", () => {
    expect(component.button.secondary).toBeDefined();
    expect(component.button.ghost).toBeDefined();
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

  it("has avatar.default and divider.default", () => {
    expect(component.avatar).toBeDefined();
    expect(component.avatar.default).toBeDefined();
    expect(component.divider).toBeDefined();
    expect(component.divider.default).toBeDefined();
  });

  it("ALL leaf values exist in semantic.light keys OR are 'transparent'", () => {
    const semanticLightKeys = new Set(Object.keys(semantic.light));

    for (const [componentName, variants] of Object.entries(component)) {
      for (const [variantName, props] of Object.entries(variants)) {
        for (const [propName, value] of Object.entries(props)) {
          const isValid = value === "transparent" || semanticLightKeys.has(value);
          expect(
            isValid,
            `component.${componentName}.${variantName}.${propName} = "${value}" is not in semantic.light or "transparent"`
          ).toBe(true);
        }
      }
    }
  });
});
