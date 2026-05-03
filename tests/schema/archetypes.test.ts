import { describe, it, expect } from "vitest";
import { getArchetype, ARCHETYPES } from "../../src/schema/archetypes.js";
import type { PresetName } from "../../src/schema/presets.js";

const ALL_PRESETS: PresetName[] = [
  "clean-minimal",
  "warm-friendly",
  "bold-energetic",
  "professional",
  "playful-creative",
];

describe("ARCHETYPES", () => {
  it("has exactly 5 entries", () => {
    expect(Object.keys(ARCHETYPES)).toHaveLength(5);
  });
});

describe("getArchetype", () => {
  for (const preset of ALL_PRESETS) {
    describe(preset, () => {
      it("returns preset with matching preset", () => {
        expect(getArchetype(preset).preset).toBe(preset);
      });

      it("has non-empty label and description", () => {
        const p = getArchetype(preset);
        expect(p.label.length).toBeGreaterThan(0);
        expect(p.description.length).toBeGreaterThan(0);
      });

      it("atmosphere template contains placeholders", () => {
        const p = getArchetype(preset);
        expect(p.atmosphereTemplate).toContain("{{brandName}}");
        expect(p.atmosphereTemplate).toContain("{{primaryHex}}");
        expect(p.atmosphereTemplate).toContain("{{fontFamily}}");
      });

      it("has 5+ characteristics", () => {
        expect(getArchetype(preset).characteristics.length).toBeGreaterThanOrEqual(5);
      });

      it("has 7+ dos and 7+ donts", () => {
        const p = getArchetype(preset);
        expect(p.dos.length).toBeGreaterThanOrEqual(7);
        expect(p.donts.length).toBeGreaterThanOrEqual(7);
      });
    });
  }

  it("professional has cool undertone", () => {
    expect(getArchetype("professional").neutralUndertone).toBe("cool");
  });

  it("bold-energetic has neutral undertone", () => {
    expect(getArchetype("bold-energetic").neutralUndertone).toBe("neutral");
  });

  it("warm-friendly has warm undertone", () => {
    expect(getArchetype("warm-friendly").neutralUndertone).toBe("warm");
  });

  it("clean-minimal has neutral undertone", () => {
    expect(getArchetype("clean-minimal").neutralUndertone).toBe("neutral");
  });

  it("playful-creative has warm undertone", () => {
    expect(getArchetype("playful-creative").neutralUndertone).toBe("warm");
  });
});
