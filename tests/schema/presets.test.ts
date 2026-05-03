import { describe, it, expect } from "vitest";
import { PRESETS, PRESET_NAMES, type PresetName } from "../../src/schema/presets.js";

describe("preset bundle vocabulary", () => {
  it("declares the 5 archetype presets", () => {
    expect(PRESET_NAMES).toEqual([
      "clean-minimal", "warm-friendly", "bold-energetic", "professional", "playful-creative",
    ]);
  });

  it("every preset name has a bundle entry", () => {
    for (const name of PRESET_NAMES) {
      expect(PRESETS[name]).toBeDefined();
    }
  });
});

describe("preset bundle content sanity", () => {
  it("every preset sets all 5 category knob fields (color now lives in archetype-palettes)", () => {
    for (const name of PRESET_NAMES) {
      const b = PRESETS[name];
      expect(b.typographyKnobs,  `${name}.typographyKnobs`).toBeDefined();
      expect(b.spacingKnobs,     `${name}.spacingKnobs`).toBeDefined();
      expect(b.radiusKnobs,      `${name}.radiusKnobs`).toBeDefined();
      expect(b.elevationKnobs,   `${name}.elevationKnobs`).toBeDefined();
      expect(b.componentKnobs,   `${name}.componentKnobs`).toBeDefined();
    }
  });
});

describe("editorial intent encoding", () => {
  // These assertions tie the preset content to the prose intent in
  // archetypes.ts. If the prose changes substantially, update both together.

  it("clean-minimal: flat heading + sharp radius + whisper shadow + outlined card", () => {
    const b = PRESETS["clean-minimal"];
    expect(b.typographyKnobs?.headingStyle).toBe("flat");
    expect(b.radiusKnobs?.style).toBe("sharp");
    expect(b.elevationKnobs?.intensity).toBe("whisper");
    expect(b.componentKnobs?.cardSurface).toBe("outlined");
    expect(b.componentKnobs?.buttonShape).toBe("rect");
  });

  it("professional: sharp radius + subtle shadow + outlined card", () => {
    const b = PRESETS["professional"];
    expect(b.radiusKnobs?.style).toBe("sharp");
    expect(b.elevationKnobs?.intensity).toBe("subtle");
    expect(b.componentKnobs?.cardSurface).toBe("outlined");
  });

  it("bold-energetic: bold heading + dramatic shadow + dense spacing + pill button", () => {
    const b = PRESETS["bold-energetic"];
    expect(b.typographyKnobs?.headingStyle).toBe("bold");
    expect(b.spacingKnobs?.density).toBe("dense");
    expect(b.elevationKnobs?.intensity).toBe("dramatic");
    expect(b.componentKnobs?.buttonShape).toBe("pill");
    expect(b.componentKnobs?.cardSurface).toBe("elevated");
  });

  it("playful-creative: bold heading + generous radius + dramatic shadow + filled+pill", () => {
    const b = PRESETS["playful-creative"];
    expect(b.typographyKnobs?.headingStyle).toBe("bold");
    expect(b.radiusKnobs?.style).toBe("generous");
    expect(b.elevationKnobs?.intensity).toBe("dramatic");
    expect(b.componentKnobs?.cardSurface).toBe("filled");
    expect(b.componentKnobs?.buttonShape).toBe("pill");
  });

  it("warm-friendly: filled card + subtle shadow", () => {
    const b = PRESETS["warm-friendly"];
    expect(b.elevationKnobs?.intensity).toBe("subtle");
    expect(b.componentKnobs?.cardSurface).toBe("filled");
  });
});

describe("preset name type narrowing", () => {
  it("PresetName values match PRESET_NAMES at runtime", () => {
    const sample: PresetName = "professional";
    expect(PRESET_NAMES).toContain(sample);
  });
});
