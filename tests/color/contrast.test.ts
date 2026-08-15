import { describe, it, expect } from "vitest";
import {
  contrastRatio, onSolidColor, AA_BODY, ON_SOLID_FLOOR,
  checkContrast, suggestRoleShifts, applyRoleShifts,
} from "../../src/color/contrast.js";
import { SCALE_ROLES, type ScaleSet } from "../../src/color/roles.js";
import { fillScale } from "../../src/color/scale.js";
import { buildNeutral, snapTint, TINT_STRENGTHS } from "../../src/color/neutral.js";
import { SEMANTIC_ANCHORS, buildSemantic } from "../../src/color/semantic.js";
import { oklchToHex, parsePrimary } from "../../src/generator/color.js";

function systemFor(hex: string): ScaleSet {
  const a = parsePrimary(hex);
  return {
    accent: fillScale([{ index: 5, color: a }]).map(oklchToHex),
    neutral: buildNeutral({
      hue: snapTint(a.h).hue,
      strength: TINT_STRENGTHS.soft,
    }).map(oklchToHex),
    semantic: Object.fromEntries(
      SEMANTIC_ANCHORS.map((s) => [s.id, buildSemantic(s).map(oklchToHex)]),
    ) as ScaleSet["semantic"],
  };
}

describe("contrastRatio", () => {
  it("returns 21 for black on white", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
  });

  it("returns 1 for identical colours", () => {
    expect(contrastRatio("#3b82f6", "#3b82f6")).toBeCloseTo(1, 5);
  });

  it("is symmetric", () => {
    expect(contrastRatio("#3b82f6", "#ffffff")).toBeCloseTo(
      contrastRatio("#ffffff", "#3b82f6"),
      10,
    );
  });

  // WCAG의 대표적 경계값 — #767676이 흰 배경에서 본문 AA를 겨우 통과하는 회색이다.
  it("puts #767676 on white just over the AA body threshold", () => {
    const r = contrastRatio("#767676", "#ffffff");
    expect(r).toBeGreaterThanOrEqual(AA_BODY);
    expect(r).toBeLessThan(4.6);
  });

  // 잘못된 hex 형식은 반드시 throw해야 한다. 조용한 오답이 최악이다.
  it("throws on hex without #", () => {
    expect(() => contrastRatio("000000", "#ffffff")).toThrow("not a #rrggbb colour");
  });

  it("throws on 3-digit hex shorthand", () => {
    expect(() => contrastRatio("#fff", "#000")).toThrow("not a #rrggbb colour");
  });
});

describe("onSolidColor", () => {
  it("picks white on a dark solid", () => {
    expect(onSolidColor("#1d59b9")).toBe("#ffffff");
  });

  // 관례 유지: 파랑은 흰 글자가 3.68로 AA 미달이지만 3.0은 넘으므로 흰색을 지킨다.
  // Tailwind·Radix·Bootstrap이 모두 이 자리에 흰 글자를 쓴다 (스펙 D5).
  it("keeps white on tailwind blue-500 even though it misses AA", () => {
    expect(onSolidColor("#3b82f6")).toBe("#ffffff");
    expect(contrastRatio("#ffffff", "#3b82f6")).toBeLessThan(AA_BODY);
    expect(contrastRatio("#ffffff", "#3b82f6")).toBeGreaterThanOrEqual(ON_SOLID_FLOOR);
  });

  it("keeps white on a red solid", () => {
    expect(onSolidColor("#fb2c36")).toBe("#ffffff");
  });

  // 바닥(3.0) 아래에서는 관례보다 가독이 앞선다.
  it("flips to black on yellow, where white is unreadable at any size", () => {
    expect(contrastRatio("#ffffff", "#eab308")).toBeLessThan(ON_SOLID_FLOOR);
    expect(onSolidColor("#eab308")).toBe("#000000");
  });

  it("flips to black on the fixed warning and success anchors", () => {
    expect(onSolidColor("#f69e00")).toBe("#000000");
    expect(onSolidColor("#00c65a")).toBe("#000000");
  });
});

describe("checkContrast", () => {
  it("never checks the border role", () => {
    const checks = checkContrast(systemFor("#3b82f6"), SCALE_ROLES);
    expect(checks.some((c) => c.roleId === "border")).toBe(false);
  });

  it("marks accent and neutral adjustable, semantics not", () => {
    const checks = checkContrast(systemFor("#3b82f6"), SCALE_ROLES);
    expect(checks.find((c) => c.scaleName === "accent")!.adjustable).toBe(true);
    expect(checks.find((c) => c.scaleName === "neutral")!.adjustable).toBe(true);
    expect(checks.find((c) => c.scaleName === "warning")!.adjustable).toBe(false);
  });

  it("reports the known warning failure in light theme", () => {
    const checks = checkContrast(systemFor("#3b82f6"), SCALE_ROLES);
    const c = checks.find(
      (x) => x.scaleName === "warning" && x.roleId === "text" &&
             x.theme === "light" && x.against === "subtle-bg",
    )!;
    expect(c.passes).toBe(false);
    expect(c.ratio).toBeCloseTo(2.96, 1);
  });

  it("passes every dark-theme text check", () => {
    for (const hex of ["#3b82f6", "#eab308", "#22c55e"]) {
      const dark = checkContrast(systemFor(hex), SCALE_ROLES)
        .filter((c) => c.theme === "dark" && c.roleId.startsWith("text"));
      expect(dark.every((c) => c.passes), hex).toBe(true);
    }
  });

  it("reports the accent on-solid miss for a blue accent", () => {
    const c = checkContrast(systemFor("#3b82f6"), SCALE_ROLES)
      .find((x) => x.scaleName === "accent" && x.roleId === "on-solid")!;
    expect(c.passes).toBe(false);
    expect(c.ratio).toBeCloseTo(3.68, 1);
  });
});

describe("suggestRoleShifts", () => {
  it("suggests nothing for a blue accent — semantics do not drive shifts", () => {
    expect(suggestRoleShifts(systemFor("#3b82f6"), SCALE_ROLES)).toEqual([]);
  });

  it("shifts light text for a yellow accent", () => {
    const shifts = suggestRoleShifts(systemFor("#eab308"), SCALE_ROLES);
    const text = shifts.find((s) => s.roleId === "text" && s.theme === "light")!;
    expect(text.from).toBe(6);
    expect(text.to).toBe(8);
  });

  it("suggests the minimum shift — one step less would still fail", () => {
    const scales = systemFor("#eab308");
    const shift = suggestRoleShifts(scales, SCALE_ROLES)
      .find((s) => s.roleId === "text" && s.theme === "light")!;
    const bg = scales.accent[0];
    expect(contrastRatio(scales.accent[shift.to], bg)).toBeGreaterThanOrEqual(AA_BODY);
    expect(contrastRatio(scales.accent[shift.to - 1], bg)).toBeLessThan(AA_BODY);
  });

  it("keeps text-strong darker than text after shifting", () => {
    const shifts = suggestRoleShifts(systemFor("#eab308"), SCALE_ROLES);
    const applied = applyRoleShifts(SCALE_ROLES, shifts);
    const idx = (id: string) => {
      const r = applied.find((x) => x.id === id)!;
      if (r.kind !== "stop") throw new Error("expected a stop role");
      return r.lightIndex;
    };
    expect(idx("text-strong")).toBeGreaterThan(idx("text"));
  });
});

describe("applyRoleShifts", () => {
  it("does not mutate the input roles", () => {
    const before = JSON.stringify(SCALE_ROLES);
    applyRoleShifts(SCALE_ROLES, suggestRoleShifts(systemFor("#eab308"), SCALE_ROLES));
    expect(JSON.stringify(SCALE_ROLES)).toBe(before);
  });
});
