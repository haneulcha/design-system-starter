import { describe, it, expect } from "vitest";
import { serialize, parse } from "./paletteUrl";
import { defaultState, type PaletteState } from "./paletteState";

describe("serialize/parse round trip", () => {
  it("survives a full state", () => {
    const state: PaletteState = {
      accentHex: "#3b82f6",
      pins: { 0: "#f3f8ff", 3: "#9dc3ff", 7: undefined, 10: "#0f274e" },
      tint: { attractorId: "cool", strength: "strong" },
      // 저장되는 것은 RoleOverride다 — 제안의 `from`은 화면 표시용이라 URL에 없다.
      shifts: [{ roleId: "text", theme: "light", to: 8 }],
    };
    expect(parse(serialize(state))).toEqual(state);
  });

  it("omits defaults — accent-only state is a short URL", () => {
    const s = serialize(defaultState("#3b82f6"));
    expect(s).toBe("?v=1&a=3b82f6");
  });

  it("keeps achromatic tint without a strength suffix", () => {
    const state = { ...defaultState("#3b82f6"), tint: { attractorId: "achromatic", strength: "soft" as const } };
    expect(serialize(state)).toContain("n=achromatic");
    expect(parse(serialize(state)).tint!.attractorId).toBe("achromatic");
  });
});

describe("parse — 깨진 입력", () => {
  it("falls back to the default accent when the hex is malformed", () => {
    expect(parse("?v=1&a=zzz").accentHex).toBe(defaultState().accentHex);
  });

  it("ignores an unknown tint attractor", () => {
    expect(parse("?v=1&a=3b82f6&n=chartreuse-soft").tint).toBeNull();
  });

  it("ignores an out-of-range role shift", () => {
    expect(parse("?v=1&a=3b82f6&t=99-4").shifts).toEqual([]);
  });

  it("ignores an unknown format version", () => {
    expect(parse("?v=7&a=112233").accentHex).toBe(defaultState().accentHex);
  });

  it("never throws", () => {
    for (const s of ["", "?", "?v=1", "?a=", "?t=--", "?n=-", "?s0=nothex"]) {
      expect(() => parse(s), s).not.toThrow();
    }
  });
});
