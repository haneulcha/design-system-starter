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

  it("creates Color Primitives collection (base layer) with light/dark modes", () => {
    const prim = figma.variableCollections.find((c) => c.name === "Color Primitives");
    expect(prim).toBeTruthy();
    expect(prim!.modes.map((m) => m.name)).toContain("Light");
    expect(prim!.modes.map((m) => m.name)).toContain("Dark");
    // 9 neutral + 1 accent + 4 status × 2 = 18
    expect(prim!.variables).toHaveLength(18);
    const names = prim!.variables.map((v) => v.name);
    expect(names).toContain("neutral-50");
    expect(names).toContain("neutral-900");
    expect(names).toContain("accent-500");
    expect(names).toContain("red-50");
    expect(names).toContain("blue-500");
    // neutral-50 differs across modes (Radix-style scale-position semantics)
    const n50 = prim!.variables.find((v) => v.name === "neutral-50")!;
    expect(n50.valuesByMode["mode-light"]).not.toBe(n50.valuesByMode["mode-dark"]);
    // accent-500 same across modes
    const a500 = prim!.variables.find((v) => v.name === "accent-500")!;
    expect(a500.valuesByMode["mode-light"]).toBe(a500.valuesByMode["mode-dark"]);
  });

  it("creates Colors collection (semantic layer) with light/dark modes", () => {
    const colors = figma.variableCollections.find((c) => c.name === "Colors");
    expect(colors).toBeTruthy();
    expect(colors!.modes.map((m) => m.name)).toContain("Light");
    expect(colors!.modes.map((m) => m.name)).toContain("Dark");
    expect(colors!.variables.length).toBeGreaterThanOrEqual(5);
    // Semantic variables should also differ across modes
    const bgCanvas = colors!.variables.find((v) => v.name === "bg/canvas");
    expect(bgCanvas!.valuesByMode["mode-light"]).not.toBe(bgCanvas!.valuesByMode["mode-dark"]);
  });

  it("creates Spacing collection", () => {
    const spacing = figma.variableCollections.find((c) => c.name === "Spacing");
    expect(spacing).toBeTruthy();
    expect(spacing!.variables.length).toBeGreaterThanOrEqual(8);
    expect(spacing!.variables[0].type).toBe("FLOAT");
  });

  it("creates Radius Primitives collection with sm/md/lg names", () => {
    const rp = figma.variableCollections.find((c) => c.name === "Radius Primitives");
    expect(rp).toBeTruthy();
    // 8 alias names — circle (50%) excluded as not numeric, 6 px reserved
    expect(rp!.variables).toHaveLength(8);
    expect(rp!.variables.every((v) => v.type === "FLOAT")).toBe(true);
    const names = rp!.variables.map((v) => v.name);
    for (const n of ["none", "xs", "sm", "md", "lg", "xl", "2xl", "pill"]) {
      expect(names, `missing radius alias: ${n}`).toContain(n);
    }
    expect(names).not.toContain("4");
    expect(names).not.toContain("24");
  });

  it("creates Border Radius collection (semantic tokens)", () => {
    const radius = figma.variableCollections.find((c) => c.name === "Border Radius");
    expect(radius).toBeTruthy();
    expect(radius!.variables.length).toBeGreaterThanOrEqual(5);
  });

  it("creates text styles from typography tokens", () => {
    expect(figma.textStyles.length).toBeGreaterThanOrEqual(12);
    const hero = figma.textStyles.find((s) => s.name === "Heading Xl");
    expect(hero).toBeTruthy();
    expect(hero!.fontSize).toBe(64);
  });

  it("creates effect styles from elevation tokens (sm/md/lg names)", () => {
    expect(figma.effectStyles.length).toBeGreaterThanOrEqual(2);
    const sm = figma.effectStyles.find((s) => s.name === "Sm");
    expect(sm).toBeTruthy();
    expect(sm!.shadows.length).toBeGreaterThanOrEqual(1);
  });

  it("creates Shadow Primitives collection (base layer)", () => {
    const sp = figma.variableCollections.find((c) => c.name === "Shadow Primitives");
    expect(sp).toBeTruthy();
    // some elevation styles produce 'none' which Figma still emits as a
    // STRING var. Expect 5 base aliases at most; at least 4 must be present.
    expect(sp!.variables.length).toBeGreaterThanOrEqual(4);
    const names = sp!.variables.map((v) => v.name);
    for (const n of ["xs", "sm", "md", "lg"]) {
      expect(names, `missing shadow alias: ${n}`).toContain(n);
    }
  });

  it("creates Shadows collection (semantic layer)", () => {
    const s = figma.variableCollections.find((c) => c.name === "Shadows");
    expect(s).toBeTruthy();
    expect(s!.variables).toHaveLength(4);
    const names = s!.variables.map((v) => v.name);
    for (const n of ["hairline", "card", "popover", "modal"]) {
      expect(names, `missing semantic shadow: ${n}`).toContain(n);
    }
  });
});
