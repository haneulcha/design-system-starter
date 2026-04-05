import { describe, it, expect } from "vitest";
import { generateComponents } from "../../src/generator/components.js";
import { generatePalette } from "../../src/generator/color.js";
import { getArchetype } from "../../src/schema/archetypes.js";

describe("generateComponents", () => {
  it("generates 3 button variants", () => {
    const p = generatePalette("#5e6ad2", "neutral");
    const c = generateComponents(p, getArchetype("clean-minimal"));
    expect(c.buttons).toHaveLength(3);
  });

  it("buttons include primary, secondary, ghost", () => {
    const p = generatePalette("#5e6ad2", "neutral");
    const c = generateComponents(p, getArchetype("clean-minimal"));
    const names = c.buttons.map((b) => b.name.toLowerCase());
    expect(names).toContain("primary");
    expect(names).toContain("secondary");
    expect(names).toContain("ghost");
  });

  it("uses archetype radius", () => {
    const p = generatePalette("#ff5b4f", "neutral");
    const c = generateComponents(p, getArchetype("bold-energetic"));
    expect(c.buttons[0].radius).toBe("9999px");
    expect(c.cards.radius).toBe("16px");
  });

  it("cards and inputs are populated", () => {
    const p = generatePalette("#c96442", "warm");
    const c = generateComponents(p, getArchetype("warm-friendly"));
    expect(c.cards.background).toBeTruthy();
    expect(c.cards.radius).toBe("12px");
    expect(c.inputs.focusBorder).toBeTruthy();
    expect(c.inputs.radius).toBe("8px");
  });

  it("navigation is sticky", () => {
    const p = generatePalette("#5e6ad2", "neutral");
    const c = generateComponents(p, getArchetype("clean-minimal"));
    expect(c.navigation.position).toBe("sticky");
  });
});
