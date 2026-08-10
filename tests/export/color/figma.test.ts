import { describe, it, expect } from "vitest";
import { toColorFigma } from "../../../src/export/color/figma.js";
import { fixtureSystem } from "./fixture.js";

describe("toColorFigma", () => {
  it("emits exactly two collections and no text/effect styles", () => {
    const f = toColorFigma(fixtureSystem());
    expect(f.variableCollections.map((c) => c.name)).toEqual(["Color Primitives", "Colors"]);
    expect(f.textStyles).toEqual([]);
    expect(f.effectStyles).toEqual([]);
  });

  it("gives Color Primitives a single mode — primitives do not change with the theme", () => {
    const [primitives] = toColorFigma(fixtureSystem()).variableCollections;
    expect(primitives.modes).toHaveLength(1);
    expect(primitives.modes[0].name).toBe("Default");
    expect(primitives.variables).toHaveLength(66);
  });

  it("gives Colors two modes with one variable per scale × role", () => {
    const [, colors] = toColorFigma(fixtureSystem()).variableCollections;
    expect(colors.modes.map((m) => m.name)).toEqual(["Light", "Dark"]);
    expect(colors.variables).toHaveLength(36);
  });

  it("resolves each role to the hex at its light/dark index", () => {
    const system = fixtureSystem();
    const [, colors] = toColorFigma(system).variableCollections;
    const accent = system.scales[0];
    const solid = system.roles.find((r) => r.id === "solid")!;
    const v = colors.variables.find((x) => x.name === "accent-solid")!;
    const [light, dark] = colors.modes.map((m) => m.modeId);
    expect(v.valuesByMode[light]).toBe(accent.hexes[solid.lightIndex]);
    expect(v.valuesByMode[dark]).toBe(accent.hexes[solid.darkIndex]);
  });

  it("names variables {scale}-{key} without slashes — slashes create Figma folders", () => {
    const f = toColorFigma(fixtureSystem());
    for (const c of f.variableCollections) {
      for (const v of c.variables) {
        expect(v.name).not.toContain("/");
        expect(v.type).toBe("COLOR");
      }
    }
    expect(f.variableCollections[0].variables[0].name).toBe("accent-50");
  });

  it("keeps every scale's stops in stopKeys order", () => {
    const system = fixtureSystem();
    const [primitives] = toColorFigma(system).variableCollections;
    const accentNames = primitives.variables
      .filter((v) => v.name.startsWith("accent-"))
      .map((v) => v.name);
    expect(accentNames).toEqual(system.stopKeys.map((k) => `accent-${k}`));
  });

  it("runs the contract guards", () => {
    const s = fixtureSystem();
    expect(() => toColorFigma({ ...s, stopKeys: [] })).toThrow();
  });
});
