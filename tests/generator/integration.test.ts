import { describe, it, expect } from "vitest";
import { generate } from "../../src/generator/index.js";
import { ARCHETYPES } from "../../src/schema/archetypes.js";
import { PRESET_NAMES, type PresetName } from "../../src/schema/presets.js";
import {
  ARCHETYPE_PALETTES,
  PALETTE_SLOTS,
} from "../../src/schema/archetype-palettes.js";
import type { ArchetypePreset } from "../../src/schema/types.js";
import { DEFAULT_ARCHETYPE } from "../../src/schema/archetypes.js";

const ALL_ARCHETYPES: ArchetypePreset[] = Object.values(ARCHETYPES);

for (const archetype of ALL_ARCHETYPES) {
  describe(`generate (archetype: ${archetype.preset})`, () => {
    const result = generate(
      {
        brandName: "TestBrand",
        preset: archetype.preset,
        fontFamily: "Inter",
      },
      archetype,
    );

    it("DESIGN.md has all 9 sections", () => {
      for (let i = 1; i <= 9; i++) {
        expect(result.designMd).toContain(`## ${i}.`);
      }
    });

    it("no unresolved template placeholders", () => {
      expect(result.designMd).not.toMatch(/\{\{[^}]+\}\}/);
    });

    it("brandName appears in heading", () => {
      expect(result.designMd).toContain("# Design System: TestBrand");
    });

    it("tokens.primitive.colors collapses to a single 'palette' hue", () => {
      expect(result.tokens.primitive.colors).toHaveProperty("palette");
      const stops = Object.keys(result.tokens.primitive.colors.palette);
      expect(stops).toHaveLength(PALETTE_SLOTS.length);
    });

    it("primitive.palette stops match the archetype's baseline palette", () => {
      const expected = ARCHETYPE_PALETTES[archetype.preset];
      for (const slot of PALETTE_SLOTS) {
        expect(
          result.system.colorTokens.palette[slot],
          `palette.${slot} drift`,
        ).toBe(expected[slot]);
      }
    });

    it("each palette slot has light and dark Oklch", () => {
      for (const [slot, value] of Object.entries(result.tokens.primitive.colors.palette)) {
        expect(value.light, `palette/${slot}.light`).toHaveProperty("l");
        expect(value.dark, `palette/${slot}.dark`).toHaveProperty("l");
      }
    });

    it("tokens.semantic values use the 'palette/<slot>' format", () => {
      for (const [role, value] of Object.entries(result.tokens.semantic)) {
        expect(value, `semantic["${role}"] = "${value}"`).toMatch(/^palette\/[a-z0-9-]+$/);
      }
    });

    it("tokens.component.button.primary exists", () => {
      expect(result.tokens.component.button.primary.bg).toBeTruthy();
    });

    it("tokenFiles has 4 entries", () => {
      expect(Object.keys(result.tokenFiles)).toHaveLength(4);
    });

    it("system has 6 component primitives via componentTokens", () => {
      const c = result.system.componentTokens;
      expect(c.button.variants).toHaveLength(6);
      expect(c.input.states).toHaveLength(5);
      expect(c.card.variants).toHaveLength(4);
      expect(c.badge.variants).toHaveLength(2);
      expect(c.tab.variants).toHaveLength(2);
      expect(c.avatar.variants).toEqual(["circle"]);
    });

    it("system.typographyTokens has 20 profiles", () => {
      expect(Object.keys(result.system.typographyTokens.profiles)).toHaveLength(20);
    });
  });
}

// ─── Palette override propagation ───────────────────────────────────────────

describe("generate — paletteOverrides", () => {
  const result = generate({
    brandName: "OverrideTest",
    preset: "professional",
    fontFamily: "Inter",
    paletteOverrides: { accent: "#ff0066", canvas: "#fef9e7" },
  });

  it("overridden slots replace the archetype baseline", () => {
    expect(result.system.colorTokens.palette.accent).toBe("#ff0066");
    expect(result.system.colorTokens.palette.canvas).toBe("#fef9e7");
  });

  it("non-overridden slots keep the archetype baseline", () => {
    const baseline = ARCHETYPE_PALETTES["professional"];
    expect(result.system.colorTokens.palette.ink).toBe(baseline.ink);
    expect(result.system.colorTokens.palette.hairline).toBe(baseline.hairline);
  });

  it("colorTokens.overrides carries the diff", () => {
    expect(result.system.colorTokens.overrides).toEqual({ accent: "#ff0066", canvas: "#fef9e7" });
  });
});

// ─── Font propagation (unchanged) ───────────────────────────────────────────

describe("generate — typographyKnobs.fontFamily.sans propagation", () => {
  const result = generate(
    {
      brandName: "PropTest",
      preset: "professional",
      fontFamily: "Inter",
      typographyKnobs: { fontFamily: { sans: "Mona Sans" } },
    },
    DEFAULT_ARCHETYPE,
  );

  it("typographyTokens.fontChains.sans starts with Mona Sans", () => {
    expect(result.system.typographyTokens.fontChains.sans).toMatch(/^"?Mona Sans"?,/);
  });
});

describe("generate — typographyKnobs omitted (default behavior)", () => {
  const result = generate(
    {
      brandName: "DefaultTest",
      preset: "professional",
      fontFamily: "Roboto",
    },
    DEFAULT_ARCHETYPE,
  );

  it("typographyTokens.fontChains.sans reflects fontFamily input", () => {
    expect(result.system.typographyTokens.fontChains.sans).toContain("Roboto");
  });
});
