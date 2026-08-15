import { describe, it, expect } from "vitest";
import { toColorSystem } from "../../../src/export/color/adapter.js";
import { SCALE_ORDER, SCALE_ROLES } from "../../../src/color/roles.js";
import { STOP_KEYS, fillScale, type Pin } from "../../../src/color/scale.js";
import { buildNeutral, TINT_STRENGTHS } from "../../../src/color/neutral.js";
import { SEMANTIC_ANCHORS, buildSemantic } from "../../../src/color/semantic.js";
import { oklchToHex, parsePrimary } from "../../../src/generator/color.js";

/** 실제 엔진 산출물. 어댑터 테스트만 엔진에 붙는다 — 나머지 산출 테스트는 픽스처를 쓴다. */
function realScales() {
  const pins: Pin[] = [{ index: 5, color: parsePrimary("#3b82f6") }];
  const semantic = Object.fromEntries(
    SEMANTIC_ANCHORS.map((a) => [a.id, buildSemantic(a).map(oklchToHex)]),
  );
  return {
    accent: fillScale(pins).map(oklchToHex),
    neutral: buildNeutral({ hue: 258, strength: TINT_STRENGTHS.soft }).map(oklchToHex),
    semantic,
  };
}

describe("toColorSystem", () => {
  it("emits scales in SCALE_ORDER, not in Record key order", () => {
    const system = toColorSystem(realScales(), SCALE_ORDER, SCALE_ROLES, STOP_KEYS);
    expect(system.scales.map((s) => s.name)).toEqual(SCALE_ORDER.map((d) => d.name));
    expect(system.scales[0].name).toBe("accent");
    expect(system.scales[1].name).toBe("neutral");
  });

  it("is stable when the semantic Record's key order is reversed", () => {
    const scales = realScales();
    const reversed = Object.fromEntries(Object.entries(scales.semantic).reverse());
    const a = toColorSystem(scales, SCALE_ORDER, SCALE_ROLES, STOP_KEYS);
    const b = toColorSystem({ ...scales, semantic: reversed }, SCALE_ORDER, SCALE_ROLES, STOP_KEYS);
    expect(b.scales.map((s) => s.name)).toEqual(a.scales.map((s) => s.name));
    expect(b.scales.map((s) => s.hexes)).toEqual(a.scales.map((s) => s.hexes));
  });

  it("carries the display label from the order descriptor", () => {
    const system = toColorSystem(realScales(), SCALE_ORDER, SCALE_ROLES, STOP_KEYS);
    expect(system.scales[0].label).toBe("액센트");
    expect(system.scales[1].label).toBe("뉴트럴");
    const err = system.scales.find((s) => s.name === "error")!;
    expect(err.label).toBe(SEMANTIC_ANCHORS.find((a) => a.id === "error")!.label);
  });

  it("passes role indices through verbatim — this is the drift point the design guards", () => {
    const system = toColorSystem(realScales(), SCALE_ORDER, SCALE_ROLES, STOP_KEYS);
    expect(system.roles).toHaveLength(SCALE_ROLES.length);
    SCALE_ROLES.forEach((role, i) => {
      expect(system.roles[i].id).toBe(role.id);
      expect(system.roles[i].lightIndex).toBe(role.lightIndex);
      expect(system.roles[i].darkIndex).toBe(role.darkIndex);
    });
  });

  it("produces the real system's shape: 6 scales of 11 stops", () => {
    const system = toColorSystem(realScales(), SCALE_ORDER, SCALE_ROLES, STOP_KEYS);
    expect(system.scales).toHaveLength(6);
    for (const s of system.scales) expect(s.hexes).toHaveLength(11);
  });

  it("throws when the order names a scale the ScaleSet does not have", () => {
    const order = [...SCALE_ORDER, { name: "nope", label: "없음" }];
    expect(() => toColorSystem(realScales(), order, SCALE_ROLES, STOP_KEYS)).toThrow(/nope/);
  });

  it("runs the ColorSystem guards — a short scale is rejected", () => {
    const scales = realScales();
    expect(() =>
      toColorSystem({ ...scales, neutral: scales.neutral.slice(0, 5) }, SCALE_ORDER, SCALE_ROLES, STOP_KEYS),
    ).toThrow(/neutral/);
  });
});
