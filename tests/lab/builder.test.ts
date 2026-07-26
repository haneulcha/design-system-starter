import { describe, it, expect } from "vitest";
import {
  fillScale,
  clampToGamut,
  SCALE_SIZE,
  STOP_KEYS,
  type Pin,
} from "../../src/lab/accent-scale/builder.js";
import { oursAlgorithm } from "../../src/lab/accent-scale/ours.js";
import { parsePrimary } from "../../src/generator/color.js";

const anchorPin = (hex: string): Pin => ({ index: 5, color: parsePrimary(hex) });

// EVAL_PRESETS(lab-data)의 11개 hue와 동일 — 눈 평가에서 검증한 대표 입력
const PRESET_HEXES = ["#3b82f6", "#ef4444", "#f97316", "#eab308", "#16a34a",
  "#06b6d4", "#8b5cf6", "#ec4899", "#cc785c", "#93c5fd", "#1e40af"];

describe("fillScale", () => {
  it("requires the anchor pin", () => {
    expect(() => fillScale([{ index: 0, color: { l: 0.98, c: 0.01, h: 260 } }]))
      .toThrow(/anchor/);
  });

  it("with only the anchor pin ≡ ours v0 (gamut-clamped)", () => {
    // 동치는 앵커 L ∈ [0.32, 0.93] (v0 warp 대역) 에서만 성립.
    // PRESET_HEXES는 모두 이 범위 내 (L 약 0.42..0.81).
    // 범위 밖에서는 fillScale이 true anchor L 사용 → v0와 의도적으로 발산
    // (v0의 clamp는 단조성 손실 유발; fillScale이 더 나음).
    for (const hex of PRESET_HEXES) {
      const built = fillScale([anchorPin(hex)]);
      const v0 = oursAlgorithm
        .derive(hex, oursAlgorithm.nativeSpec)
        .map(clampToGamut);
      expect(built).toHaveLength(SCALE_SIZE);
      built.forEach((c, i) => {
        expect(c.l, `${hex} stop ${i} L`).toBeCloseTo(v0[i].l, 6);
        expect(c.c, `${hex} stop ${i} C`).toBeCloseTo(v0[i].c, 6);
      });
    }
  });

  it("preserves every pin verbatim", () => {
    const pins: Pin[] = [
      anchorPin("#3b82f6"),
      { index: 0, color: { l: 0.977, c: 0.02, h: 259 } },
      { index: 3, color: { l: 0.84, c: 0.1, h: 259 } },
      { index: 10, color: { l: 0.25, c: 0.08, h: 240 } },
    ];
    const out = fillScale(pins);
    for (const p of pins) expect(out[p.index]).toEqual(p.color);
  });

  it("keeps lightness strictly decreasing with monotone pins", () => {
    for (const hex of PRESET_HEXES) {
      const a = parsePrimary(hex);
      const pins: Pin[] = [
        { index: 5, color: a },
        { index: 0, color: { l: 0.977, c: a.c * 0.18, h: a.h } },
        { index: 10, color: { l: 0.22, c: a.c * 0.42, h: a.h } },
        { index: 3, color: clampToGamut({ l: (0.977 + a.l) / 2 + 0.06, c: a.c * 0.83, h: a.h }) },
        { index: 7, color: clampToGamut({ l: (a.l + 0.22) / 2, c: a.c * 0.97, h: a.h }) },
      ];
      const out = fillScale(pins);
      for (let i = 1; i < out.length; i++) {
        expect(out[i].l, `${hex} stop ${i}`).toBeLessThan(out[i - 1].l);
      }
    }
  });

  it("is order-invariant over the pin list (순수성)", () => {
    const pins: Pin[] = [
      { index: 10, color: { l: 0.25, c: 0.08, h: 240 } },
      anchorPin("#3b82f6"),
      { index: 0, color: { l: 0.977, c: 0.02, h: 259 } },
    ];
    const reversed = [...pins].reverse();
    expect(fillScale(pins)).toEqual(fillScale(reversed));
  });

  it("interpolates hue toward a drifted dark pin (골드 드리프트 경로)", () => {
    const a = parsePrimary("#eab308"); // h ≈ 92
    const out = fillScale([
      { index: 5, color: a },
      { index: 10, color: { l: 0.278, c: a.c * 0.42, h: a.h - 25 } },
    ]);
    // 앵커(5)와 드리프트된 950 사이의 stop들은 hue가 단조로 이동
    for (let i = 6; i <= 10; i++) {
      expect(out[i].h, `stop ${i}`).toBeLessThanOrEqual(out[i - 1].h + 1e-9);
      expect(out[i].h).toBeGreaterThanOrEqual(a.h - 25 - 1e-9);
    }
  });

  it("keeps lightness strictly decreasing even with extreme anchor L outside v0 band", () => {
    // v0 warp 대역 [0.32, 0.93] 밖의 앵커는 v0에서 단조성 손실 유발.
    // fillScale은 true anchor L 사용해 단조성 항상 보존 (더 나은 동작).
    // 극값: 0.3 (어두움), 0.9 (밝음) — 경계 근처지만 곡선 형태 수용 가능.
    const extremeHigh = { l: 0.9, c: 0.02, h: 260 };
    const extremeLow = { l: 0.3, c: 0.05, h: 260 };
    for (const anchor of [extremeHigh, extremeLow]) {
      const out = fillScale([{ index: 5, color: anchor }]);
      for (let i = 1; i < out.length; i++) {
        expect(out[i].l, `anchor L=${anchor.l} stop ${i}`).toBeLessThan(out[i - 1].l);
      }
    }
  });
});

describe("clampToGamut", () => {
  it("returns in-gamut colors unchanged", () => {
    const c = { l: 0.6, c: 0.1, h: 260 };
    expect(clampToGamut(c)).toEqual(c);
  });
  it("reduces chroma (only) for out-of-gamut colors", () => {
    const wild = { l: 0.55, c: 0.4, h: 145 };
    const out = clampToGamut(wild);
    expect(out.c).toBeLessThan(wild.c);
    expect(out.l).toBe(wild.l);
    expect(out.h).toBe(wild.h);
  });
});

describe("STOP_KEYS", () => {
  it("has 11 tailwind-style keys with 500 at the anchor index", () => {
    expect(STOP_KEYS).toHaveLength(SCALE_SIZE);
    expect(STOP_KEYS[5]).toBe("500");
    expect(STOP_KEYS[0]).toBe("50");
    expect(STOP_KEYS[10]).toBe("950");
  });
});
