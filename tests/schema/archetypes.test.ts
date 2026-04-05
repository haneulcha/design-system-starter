import { describe, it, expect } from "vitest";
import { getArchetype, ARCHETYPES } from "../../src/schema/archetypes.js";
import type { MoodArchetype } from "../../src/schema/types.js";

const ALL_MOODS: MoodArchetype[] = [
  "precise",
  "confident",
  "expressive",
  "modern",
];

describe("ARCHETYPES", () => {
  it("has exactly 4 entries", () => {
    expect(Object.keys(ARCHETYPES)).toHaveLength(4);
  });
});

describe("getArchetype", () => {
  for (const mood of ALL_MOODS) {
    describe(mood, () => {
      it("returns preset with matching mood", () => {
        expect(getArchetype(mood).mood).toBe(mood);
      });

      it("has non-empty label and description", () => {
        const p = getArchetype(mood);
        expect(p.label.length).toBeGreaterThan(0);
        expect(p.description.length).toBeGreaterThan(0);
      });

      it("atmosphere template contains placeholders", () => {
        const p = getArchetype(mood);
        expect(p.atmosphereTemplate).toContain("{{brandName}}");
        expect(p.atmosphereTemplate).toContain("{{primaryHex}}");
        expect(p.atmosphereTemplate).toContain("{{fontFamily}}");
      });

      it("has 5+ characteristics", () => {
        expect(getArchetype(mood).characteristics.length).toBeGreaterThanOrEqual(5);
      });

      it("has 3+ suggested fonts", () => {
        expect(getArchetype(mood).suggestedFonts.length).toBeGreaterThanOrEqual(3);
      });

      it("has statusHues with red, green, blue, amber", () => {
        const p = getArchetype(mood);
        expect(typeof p.statusHues.red).toBe("number");
        expect(typeof p.statusHues.green).toBe("number");
        expect(typeof p.statusHues.blue).toBe("number");
        expect(typeof p.statusHues.amber).toBe("number");
      });

      it("has 7+ dos and 7+ donts", () => {
        const p = getArchetype(mood);
        expect(p.dos.length).toBeGreaterThanOrEqual(7);
        expect(p.donts.length).toBeGreaterThanOrEqual(7);
      });
    });
  }

  it("precise has cool undertone", () => {
    expect(getArchetype("precise").neutralUndertone).toBe("cool");
  });

  it("confident has neutral undertone", () => {
    expect(getArchetype("confident").neutralUndertone).toBe("neutral");
  });

  it("expressive has warm undertone", () => {
    expect(getArchetype("expressive").neutralUndertone).toBe("warm");
  });

  it("modern has neutral undertone", () => {
    expect(getArchetype("modern").neutralUndertone).toBe("neutral");
  });
});
