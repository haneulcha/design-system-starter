import { describe, it, expect } from "vitest";
import { generateTypography } from "../../src/generator/typography.js";
import { getArchetype } from "../../src/schema/archetypes.js";

describe("generateTypography", () => {
  it("generates 14 hierarchy styles", () => {
    const t = generateTypography(getArchetype("clean-minimal"), "Inter");
    expect(t.hierarchy).toHaveLength(14);
  });

  it("includes expected roles", () => {
    const t = generateTypography(getArchetype("clean-minimal"), "Inter");
    const roles = t.hierarchy.map((s) => s.role);
    expect(roles).toContain("Display Hero");
    expect(roles).toContain("Section Heading");
    expect(roles).toContain("Body");
    expect(roles).toContain("Button");
    expect(roles).toContain("Caption");
    expect(roles).toContain("Mono Body");
  });

  it("applies archetype heading weight", () => {
    expect(generateTypography(getArchetype("bold-energetic"), "X").hierarchy[0].weight).toBe(700);
    expect(generateTypography(getArchetype("professional"), "X").hierarchy[0].weight).toBe(300);
    expect(generateTypography(getArchetype("clean-minimal"), "X").hierarchy[0].weight).toBe(600);
  });

  it("uses provided font family", () => {
    const t = generateTypography(getArchetype("warm-friendly"), "DM Sans");
    expect(t.families.primary).toBe("DM Sans");
    expect(t.hierarchy[0].font).toBe("DM Sans");
  });

  it("mono styles use archetype mono font", () => {
    const t = generateTypography(getArchetype("clean-minimal"), "Inter");
    const mono = t.hierarchy.filter((s) => s.role.startsWith("Mono"));
    expect(mono.length).toBe(2);
    expect(mono[0].font).toBe("JetBrains Mono");
  });

  it("generates 3+ principles", () => {
    const t = generateTypography(getArchetype("warm-friendly"), "DM Sans");
    expect(t.principles.length).toBeGreaterThanOrEqual(3);
  });
});
