import { describe, it, expect } from "vitest";
import { transformToFigma, parseShadowString } from "../../src/figma/transformer.js";
import { generate } from "../../src/generator/index.js";

describe("parseShadowString", () => {
  it("parses single rgba shadow", () => {
    const layers = parseShadowString("rgba(0,0,0,0.1) 0px 4px 8px");
    expect(layers).toHaveLength(1);
    expect(layers[0].color.a).toBeCloseTo(0.1);
    expect(layers[0].offset.y).toBe(4);
    expect(layers[0].radius).toBe(8);
  });

  it("parses multi-layer shadow", () => {
    const layers = parseShadowString(
      "rgba(0,0,0,0.08) 0px 1px 2px, rgba(0,0,0,0.04) 0px 2px 4px"
    );
    expect(layers).toHaveLength(2);
    expect(layers[0].color.a).toBeCloseTo(0.08);
    expect(layers[1].color.a).toBeCloseTo(0.04);
  });

  it("parses ring shadow (0 blur, spread as 4th value)", () => {
    const layers = parseShadowString("#e5e5e5 0px 0px 0px 1px");
    expect(layers).toHaveLength(1);
    expect(layers[0].radius).toBe(0);
    expect(layers[0].spread).toBe(1);
  });

  it("returns empty array for 'none'", () => {
    expect(parseShadowString("none")).toHaveLength(0);
  });
});

describe("transformToFigma", () => {
  const { tokens } = generate({
    brandName: "Test",
    brandColor: "#5e6ad2",
    fontFamily: "Inter",
  });
  const figma = transformToFigma(tokens);

  it("creates Colors collection with light/dark modes", () => {
    const colors = figma.variableCollections.find((c) => c.name === "Colors");
    expect(colors).toBeTruthy();
    expect(colors!.modes.map((m) => m.name)).toContain("Light");
    expect(colors!.modes.map((m) => m.name)).toContain("Dark");
    expect(colors!.variables.length).toBeGreaterThanOrEqual(5);
  });

  it("creates Spacing collection", () => {
    const spacing = figma.variableCollections.find((c) => c.name === "Spacing");
    expect(spacing).toBeTruthy();
    expect(spacing!.variables.length).toBeGreaterThanOrEqual(8);
    expect(spacing!.variables[0].type).toBe("FLOAT");
  });

  it("creates Border Radius collection", () => {
    const radius = figma.variableCollections.find((c) => c.name === "Border Radius");
    expect(radius).toBeTruthy();
    expect(radius!.variables.length).toBeGreaterThanOrEqual(5);
  });

  it("creates text styles from typography tokens", () => {
    expect(figma.textStyles.length).toBeGreaterThanOrEqual(12);
    const hero = figma.textStyles.find((s) => s.name === "Display Hero");
    expect(hero).toBeTruthy();
    expect(hero!.fontSize).toBe(48);
  });

  it("creates effect styles from elevation tokens", () => {
    expect(figma.effectStyles.length).toBeGreaterThanOrEqual(2);
    const raised = figma.effectStyles.find((s) => s.name === "Raised");
    expect(raised).toBeTruthy();
    expect(raised!.shadows.length).toBeGreaterThanOrEqual(1);
  });
});
