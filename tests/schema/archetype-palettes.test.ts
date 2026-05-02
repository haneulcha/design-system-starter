import { describe, it, expect } from "vitest";
import {
  ARCHETYPE_PALETTES,
  PALETTE_SLOTS,
  SURFACE_SLOTS,
  TEXT_SLOTS,
  ACCENT_SLOTS,
  STATUS_SLOTS,
  resolvePalette,
} from "../../src/schema/archetype-palettes.js";
import { PRESET_NAMES } from "../../src/schema/presets.js";

describe("archetype palettes", () => {
  it("slot taxonomy adds up to 15 slots (3 surface + 3 text + 1 accent + 8 status)", () => {
    expect(SURFACE_SLOTS).toHaveLength(3);
    expect(TEXT_SLOTS).toHaveLength(3);
    expect(ACCENT_SLOTS).toHaveLength(1);
    expect(STATUS_SLOTS).toHaveLength(8);
    expect(PALETTE_SLOTS).toHaveLength(15);
  });

  it("every preset ships a complete palette covering every slot", () => {
    for (const preset of PRESET_NAMES) {
      const palette = ARCHETYPE_PALETTES[preset];
      for (const slot of PALETTE_SLOTS) {
        expect(palette[slot], `${preset}.${slot} missing`).toBeTruthy();
        expect(palette[slot], `${preset}.${slot} not a hex`).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    }
  });

  it("status slots are universal (identical across all 5 archetypes)", () => {
    const reference = ARCHETYPE_PALETTES["professional"];
    for (const preset of PRESET_NAMES) {
      const palette = ARCHETYPE_PALETTES[preset];
      for (const slot of STATUS_SLOTS) {
        expect(
          palette[slot],
          `${preset}.${slot} should equal professional.${slot}`,
        ).toBe(reference[slot]);
      }
    }
  });

  it("non-status slots actually differ between archetypes (palettes are distinct)", () => {
    const accents = new Set(PRESET_NAMES.map((p) => ARCHETYPE_PALETTES[p].accent));
    expect(accents.size).toBe(PRESET_NAMES.length);
  });
});

describe("resolvePalette", () => {
  it("returns the archetype baseline when no overrides are passed", () => {
    expect(resolvePalette("professional")).toEqual(ARCHETYPE_PALETTES["professional"]);
  });

  it("applies per-slot overrides on top of the baseline", () => {
    const out = resolvePalette("professional", { accent: "#ff0066", canvas: "#fef9e7" });
    expect(out.accent).toBe("#ff0066");
    expect(out.canvas).toBe("#fef9e7");
    expect(out.ink).toBe(ARCHETYPE_PALETTES["professional"].ink);
  });

  it("does not mutate the source palette", () => {
    const before = ARCHETYPE_PALETTES["clean-minimal"].accent;
    resolvePalette("clean-minimal", { accent: "#000000" });
    expect(ARCHETYPE_PALETTES["clean-minimal"].accent).toBe(before);
  });
});
