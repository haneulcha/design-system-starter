import { describe, it, expect } from "vitest";
import { generate } from "../../src/generator/index.js";
import { PRESETS } from "../../src/schema/presets.js";

const baseInputs = {
  brandName: "Test",
  preset: "professional" as const,
  fontFamily: "Inter",
};

describe("preset application via generate()", () => {
  it("preset:professional defaults applied", () => {
    const r = generate(baseInputs);
    expect(r.system.componentTokens.knobs.cardSurface).toBe("outlined");
    expect(r.system.componentTokens.knobs.buttonShape).toBe("rect");
    expect(r.system.spacingTokens.knobs.density).toBe("compact");
    expect(r.system.radiusTokens.knobs.style).toBe("sharp");
    expect(r.system.elevationTokens.knobs.intensity).toBe("subtle");
  });

  it("preset:bold-energetic flows through to every category", () => {
    const r = generate({ ...baseInputs, preset: "bold-energetic" });
    expect(r.system.componentTokens.knobs.buttonShape).toBe("pill");
    expect(r.system.componentTokens.knobs.cardSurface).toBe("elevated");
    expect(r.system.spacingTokens.knobs.density).toBe("dense");
    expect(r.system.elevationTokens.knobs.intensity).toBe("dramatic");
    // headingStyle: "bold" — every heading profile carries weight ≥ 600.
    const headingWeights = Object.entries(r.system.typographyTokens.profiles)
      .filter(([k]) => k.startsWith("heading."))
      .map(([, p]) => p.weight);
    for (const w of headingWeights) expect(w).toBeGreaterThanOrEqual(600);
  });

  it("preset:professional anchors palette + sharp radius", () => {
    const r = generate({ ...baseInputs, preset: "professional" });
    expect(r.system.colorTokens.preset).toBe("professional");
    expect(r.system.colorTokens.palette.accent).toBe("#635bff");
    expect(r.system.radiusTokens.knobs.style).toBe("sharp");
  });

  it("explicit knob overrides preset for that whole category", () => {
    const r = generate({
      ...baseInputs,
      preset: "bold-energetic",
      componentKnobs: { buttonShape: "rect" }, // overrides preset's "pill"
    });
    expect(r.system.componentTokens.knobs.buttonShape).toBe("rect");
    // cardSurface NOT supplied by user → preset default for cardSurface kicks
    // in only if buttonShape was the only supplied knob. v1 design: user
    // supplying ANY componentKnob replaces the preset's whole componentKnobs.
    expect(r.system.componentTokens.knobs.cardSurface).toBe("outlined");
    // Other categories' preset values still apply.
    expect(r.system.spacingTokens.knobs.density).toBe("dense");
    expect(r.system.elevationTokens.knobs.intensity).toBe("dramatic");
  });

  it("user fontFamily layered on top of preset typography", () => {
    const r = generate({
      ...baseInputs,
      fontFamily: "Mona Sans",
      preset: "clean-minimal",
    });
    // The preset asks for headingStyle: flat AND user supplies fontFamily.
    // Both should be reflected.
    expect(r.system.typographyTokens.fontChains.sans).toContain("Mona Sans");
    // headingStyle: "flat" → every heading profile carries weight 400.
    const flatHeadingWeights = Object.entries(r.system.typographyTokens.profiles)
      .filter(([k]) => k.startsWith("heading."))
      .map(([, p]) => p.weight);
    for (const w of flatHeadingWeights) expect(w).toBe(400);
  });

  it("explicit typographyKnobs replaces preset typography entirely", () => {
    const r = generate({
      ...baseInputs,
      preset: "bold-energetic", // would normally headingStyle: "bold"
      typographyKnobs: { headingStyle: "flat" },
    });
    const weights = Object.entries(r.system.typographyTokens.profiles)
      .filter(([k]) => k.startsWith("heading."))
      .map(([, p]) => p.weight);
    for (const w of weights) expect(w).toBe(400);
  });

  it("each of the 5 presets generates without throwing", () => {
    for (const name of Object.keys(PRESETS) as Array<keyof typeof PRESETS>) {
      expect(() => generate({ ...baseInputs, preset: name })).not.toThrow();
    }
  });
});
