import { describe, it, expect } from "vitest";
import {
  fillScale,
  clampToGamut,
  SCALE_SIZE,
  STOP_KEYS,
  type Pin,
  BUILDER_STEPS,
  STEP_META,
  candidatesFor,
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

  it("keeps L strictly decreasing for anchors outside v0 warp band but inside curve range", () => {
    // v0 warp 대역 [0.32, 0.93] 밖이지만 곡선 범위 [0.2777, 0.9772] 안:
    // fillScale은 true anchor L 사용해 단조성 보존 (v0는 clamp로 인해 손실).
    // L=0.3 (OURS_CURVE[10]=0.2777보다 밝음), L=0.95 (OURS_CURVE[0]=0.9772보다 밝음)
    const outsideWarpBand = [
      { l: 0.3, c: 0.05, h: 260 },   // dark: outside v0's min 0.32, inside curve's range
      { l: 0.95, c: 0.02, h: 260 },  // light: outside v0's max 0.93, inside curve's range
    ];
    for (const anchor of outsideWarpBand) {
      const out = fillScale([{ index: 5, color: anchor }]);
      for (let i = 1; i < out.length; i++) {
        expect(out[i].l, `anchor L=${anchor.l} stop ${i}`).toBeLessThan(out[i - 1].l);
      }
    }
  });

  it("collapses stops toward anchor for truly extreme L beyond curve range (eps-branch)", () => {
    // Curve range [0.2777, 0.9772]. 범위 밖 anchor는 eps-guard 발동:
    // 같은 쪽 stop들이 anchor.l 근처로 붕괴 (headroom 없음 — 고정 한계).
    // 명시적으로 테스트: v1 spec에서 근-white/근-black은 지원 범위 밖.
    const beyondCurveRange = [
      { l: 0.99, c: 0.02, h: 260 },   // beyond light end: 0.9772
      { l: 0.1, c: 0.05, h: 260 },    // beyond dark end: 0.2777
    ];
    for (const anchor of beyondCurveRange) {
      const out = fillScale([{ index: 5, color: anchor }]);
      // (i) Strict monotonicity maintained
      for (let i = 1; i < out.length; i++) {
        expect(out[i].l, `anchor L=${anchor.l} stop ${i}`).toBeLessThan(out[i - 1].l);
      }
      // (ii) Collapse assertion: stops on anchor's side within 1e-6 of anchor.l
      const tolerance = 1e-6;
      if (anchor.l > 0.9772) {
        // Light anchor: stops 0-4 collapse toward anchor
        for (let i = 0; i < 5; i++) {
          expect(out[i].l, `light anchor L=${anchor.l} stop ${i} collapse`).toBeGreaterThan(
            anchor.l - tolerance
          );
        }
      } else if (anchor.l < 0.2777) {
        // Dark anchor: stops 6-10 collapse toward anchor
        for (let i = 6; i < 11; i++) {
          expect(out[i].l, `dark anchor L=${anchor.l} stop ${i} collapse`).toBeLessThan(
            anchor.l + tolerance
          );
        }
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

describe("BUILDER_STEPS / STEP_META", () => {
  it("follows the RUI order 500→50→950→300→700", () => {
    expect(BUILDER_STEPS).toEqual([5, 0, 10, 3, 7]);
  });
  it("has title+description for every step (교보재 계약)", () => {
    for (const idx of BUILDER_STEPS) {
      expect(STEP_META[idx].title.length, `step ${idx}`).toBeGreaterThan(0);
      expect(STEP_META[idx].description.length, `step ${idx}`).toBeGreaterThan(10);
    }
  });
});

describe("candidatesFor", () => {
  const pins = [anchorPin("#3b82f6")];

  it("throws without the anchor pin / on non-candidate stops", () => {
    expect(() => candidatesFor(0, [])).toThrow(/anchor/);
    expect(() => candidatesFor(5, pins)).toThrow(/unsupported/);
  });

  it.each([0, 10, 3, 7])(
    "stop %i: three displayable candidates with 교보재 labels",
    (stop) => {
      for (const hex of PRESET_HEXES) {
        const cands = candidatesFor(stop, [anchorPin(hex)]);
        expect(cands).toHaveLength(3);
        for (const cd of cands) {
          expect(cd.label.length).toBeGreaterThan(0);
          expect(cd.note.length).toBeGreaterThan(10);
          // clampToGamut는 in-gamut 색을 그대로 반환한다 (표시 가능성 증명)
          expect(clampToGamut(cd.color)).toEqual(cd.color);
        }
      }
    },
  );

  it("950 includes gold hue-drift for warm anchors only", () => {
    const warm = candidatesFor(10, [anchorPin("#eab308")]); // h≈92 ∈ [30,110]
    const cool = candidatesFor(10, [anchorPin("#3b82f6")]); // h≈259
    expect(warm.some((c) => c.label.includes("골드"))).toBe(true);
    expect(cool.some((c) => c.label.includes("골드"))).toBe(false);
    expect(cool.some((c) => c.label.includes("얕게"))).toBe(true);
  });

  it("marks degenerate (clamp-collapsed) candidates in the note instead of hiding", () => {
    // #3b82f6 (blue, h≈259, c≈0.158) 실제로 stop 0에서 클램프 붕괴 확인됨
    // 3개 후보 모두 반환하되, 겹친 후보는 note에 표시
    const cands = candidatesFor(0, [anchorPin("#3b82f6")]);
    expect(cands).toHaveLength(3);
    expect(cands.some((c) => c.note.includes("후보 폭이 좁아"))).toBe(true);
  });

  it("warm-hue boundaries (30°/110°) show gold drift, outside show shallow", () => {
    // hue 정확 제어: Oklch 직접 구성
    const edgeBoundaryMin = { index: 5, color: { l: 0.6, c: 0.15, h: 30 } as const };
    const edgeBoundaryMax = { index: 5, color: { l: 0.6, c: 0.15, h: 110 } as const };
    const outsideMin = { index: 5, color: { l: 0.6, c: 0.15, h: 29.9 } as const };
    const outsideMax = { index: 5, color: { l: 0.6, c: 0.15, h: 110.1 } as const };

    // 30° 정확: 골드 드리프트
    expect(candidatesFor(10, [edgeBoundaryMin]).some((c) => c.label.includes("골드")))
      .toBe(true);
    // 110° 정확: 골드 드리프트
    expect(candidatesFor(10, [edgeBoundaryMax]).some((c) => c.label.includes("골드")))
      .toBe(true);
    // 29.9° (따뜻 경계 밖): 얕게
    expect(candidatesFor(10, [outsideMin]).some((c) => c.label.includes("얕게")))
      .toBe(true);
    expect(candidatesFor(10, [outsideMin]).some((c) => c.label.includes("골드")))
      .toBe(false);
    // 110.1° (따뜻 경계 밖): 얕게
    expect(candidatesFor(10, [outsideMax]).some((c) => c.label.includes("얕게")))
      .toBe(true);
    expect(candidatesFor(10, [outsideMax]).some((c) => c.label.includes("골드")))
      .toBe(false);
  });

  it("does NOT mark collapsed candidates at non-collapsed stops", () => {
    // stop 10 (950)은 #3b82f6에서 붕괴 안 됨 — note에 표시 없어야 함
    const cands = candidatesFor(10, [anchorPin("#3b82f6")]);
    expect(cands).toHaveLength(3);
    expect(cands.every((c) => !c.note.includes("후보 폭이 좁아"))).toBe(true);
  });
});
