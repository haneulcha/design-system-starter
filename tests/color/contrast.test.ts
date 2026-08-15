import { describe, it, expect } from "vitest";
import {
  contrastRatio, onSolidColor, AA_BODY, ON_SOLID_FLOOR,
} from "../../src/color/contrast.js";

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
