import { describe, it, expect } from "vitest";
import {
  ARCHETYPE_PALETTES,
  PALETTE_SLOTS,
  SURFACE_SLOTS,
  TEXT_SLOTS,
  ACCENT_SLOTS,
  STATUS_SLOTS,
  NEUTRAL_STOPS,
  resolvePalette,
  resolveBaseScale,
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

  it("base neutral scale has 9 stops", () => {
    expect(NEUTRAL_STOPS).toHaveLength(9);
  });

  it("every archetype ships a complete 9-stop base scale", () => {
    for (const preset of PRESET_NAMES) {
      const { baseScale } = ARCHETYPE_PALETTES[preset];
      for (const stop of NEUTRAL_STOPS) {
        expect(baseScale[stop], `${preset}.baseScale.${stop} missing`).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    }
  });

  it("every surface/text ref points to a valid base stop", () => {
    for (const preset of PRESET_NAMES) {
      const p = ARCHETYPE_PALETTES[preset];
      for (const slot of SURFACE_SLOTS) {
        expect(NEUTRAL_STOPS, `${preset}.surfaceRefs.${slot}`).toContain(p.surfaceRefs[slot]);
      }
      for (const slot of TEXT_SLOTS) {
        expect(NEUTRAL_STOPS, `${preset}.textRefs.${slot}`).toContain(p.textRefs[slot]);
      }
    }
  });

  it("every archetype ships an accent + 3 recommended alternatives", () => {
    for (const preset of PRESET_NAMES) {
      const p = ARCHETYPE_PALETTES[preset];
      expect(p.accent, `${preset}.accent`).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(p.recommendedAccents, `${preset}.recommendedAccents`).toHaveLength(3);
      for (const hex of p.recommendedAccents) {
        expect(hex).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    }
  });

  it("every archetype ships all 8 status slots", () => {
    for (const preset of PRESET_NAMES) {
      const { status } = ARCHETYPE_PALETTES[preset];
      for (const slot of STATUS_SLOTS) {
        expect(status[slot], `${preset}.status.${slot} missing`).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    }
  });

  it("status slots are NOT universal — at least one slot differs across archetypes", () => {
    // Pick any status slot; check the set of values is > 1.
    for (const slot of STATUS_SLOTS) {
      const values = new Set(PRESET_NAMES.map((p) => ARCHETYPE_PALETTES[p].status[slot]));
      // Not asserting strict per-slot uniqueness (some shared is fine), but
      // overall the status palettes shouldn't be all-identical.
      expect(values.size, `status.${slot} should vary OR be intentionally shared`).toBeGreaterThanOrEqual(1);
    }
    // Strong assertion: collectively, archetypes should differ on status.
    const allSignatures = PRESET_NAMES.map((p) =>
      STATUS_SLOTS.map((s) => ARCHETYPE_PALETTES[p].status[s]).join(","),
    );
    expect(new Set(allSignatures).size).toBeGreaterThan(1);
  });

  it("non-status slots actually differ between archetypes (palettes are distinct)", () => {
    const accents = new Set(PRESET_NAMES.map((p) => ARCHETYPE_PALETTES[p].accent));
    expect(accents.size).toBe(PRESET_NAMES.length);
  });
});

describe("resolvePalette", () => {
  it("returns a flat 15-slot hex map (no scale, no refs)", () => {
    const out = resolvePalette("professional");
    expect(Object.keys(out)).toHaveLength(15);
    for (const slot of PALETTE_SLOTS) {
      expect(out[slot]).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("derives surface slots from baseScale via refs", () => {
    const arche = ARCHETYPE_PALETTES["professional"];
    const out = resolvePalette("professional");
    expect(out.canvas).toBe(arche.baseScale[arche.surfaceRefs.canvas]);
    expect(out.hairline).toBe(arche.baseScale[arche.surfaceRefs.hairline]);
  });

  it("derives text slots from baseScale via refs", () => {
    const arche = ARCHETYPE_PALETTES["professional"];
    const out = resolvePalette("professional");
    expect(out.ink).toBe(arche.baseScale[arche.textRefs.ink]);
    expect(out.body).toBe(arche.baseScale[arche.textRefs.body]);
  });

  it("editing a base stop cascades to every referencing surface/text slot", () => {
    // canvas and ink reference different stops; overriding base 50 should
    // change canvas only.
    const out = resolvePalette("professional", { baseScale: { "50": "#ff00ff" } });
    expect(out.canvas).toBe("#ff00ff");
    expect(out.ink).not.toBe("#ff00ff");
  });

  it("accent override replaces the accent slot directly", () => {
    const out = resolvePalette("professional", { accent: "#ff0066" });
    expect(out.accent).toBe("#ff0066");
  });

  it("status override replaces individual status slots", () => {
    const out = resolvePalette("professional", { status: { "error-text": "#000000" } });
    expect(out["error-text"]).toBe("#000000");
    // Other status slots untouched.
    const baseline = ARCHETYPE_PALETTES["professional"].status;
    expect(out["success-text"]).toBe(baseline["success-text"]);
  });

  it("does not mutate the source palette", () => {
    const before = ARCHETYPE_PALETTES["clean-minimal"].accent;
    resolvePalette("clean-minimal", { accent: "#000000" });
    expect(ARCHETYPE_PALETTES["clean-minimal"].accent).toBe(before);
  });
});

describe("resolveBaseScale", () => {
  it("returns the archetype's base scale when no overrides", () => {
    const out = resolveBaseScale("professional");
    expect(out).toEqual(ARCHETYPE_PALETTES["professional"].baseScale);
  });

  it("applies per-stop overrides", () => {
    const out = resolveBaseScale("professional", { baseScale: { "500": "#ff0000" } });
    expect(out["500"]).toBe("#ff0000");
    expect(out["50"]).toBe(ARCHETYPE_PALETTES["professional"].baseScale["50"]);
  });
});
