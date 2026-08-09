import { describe, it, expect } from "vitest";
import {
  SEMANTIC_ANCHORS,
  buildSemantic,
  type SemanticId,
} from "../../src/lab/palette/semantic.js";
import { SCALE_SIZE } from "../../src/lab/palette/builder.js";

/** status-hue-principles.md의 코퍼스 관측 밴드 — tailwind 앵커가 여기 들어야 한다. */
const CORPUS_BANDS: Record<SemanticId, [number, number]> = {
  error: [11, 34],
  warning: [67, 90],
  success: [145, 163],
  info: [254, 262],
};

describe("SEMANTIC_ANCHORS", () => {
  it("has exactly 4 roles with unique ids", () => {
    expect(SEMANTIC_ANCHORS).toHaveLength(4);
    expect(new Set(SEMANTIC_ANCHORS.map((a) => a.id)).size).toBe(4);
  });

  it("every anchor hue falls inside the corpus-observed band", () => {
    for (const a of SEMANTIC_ANCHORS) {
      const [lo, hi] = CORPUS_BANDS[a.id];
      expect(a.anchor.h, a.id).toBeGreaterThanOrEqual(lo);
      expect(a.anchor.h, a.id).toBeLessThanOrEqual(hi);
    }
  });

  it("hue ramps have 11 entries and are zero at the anchor", () => {
    for (const a of SEMANTIC_ANCHORS) {
      expect(a.hueRamp, a.id).toHaveLength(SCALE_SIZE);
      expect(a.hueRamp[5], a.id).toBe(0);
    }
  });

  it("only the warm role drifts hue substantially", () => {
    // amber는 밝은 쪽 +25°, 어두운 쪽 -24°. 나머지는 10° 안쪽.
    for (const a of SEMANTIC_ANCHORS) {
      const maxDrift = Math.max(...a.hueRamp.map(Math.abs));
      if (a.id === "warning") expect(maxDrift).toBeGreaterThan(20);
      else expect(maxDrift, a.id).toBeLessThan(10);
    }
  });

  it("labels and notes are educational", () => {
    for (const a of SEMANTIC_ANCHORS) {
      expect(a.label.length, a.id).toBeGreaterThan(0);
      expect(a.note.length, a.id).toBeGreaterThan(10);
    }
  });
});

describe("buildSemantic", () => {
  it("returns 11 stops with strictly decreasing lightness for every role", () => {
    for (const a of SEMANTIC_ANCHORS) {
      const scale = buildSemantic(a);
      expect(scale, a.id).toHaveLength(SCALE_SIZE);
      for (let i = 1; i < scale.length; i++) {
        expect(scale[i].l, `${a.id} stop ${i}`).toBeLessThan(scale[i - 1].l);
      }
    }
  });

  it("preserves the anchor verbatim at index 5", () => {
    for (const a of SEMANTIC_ANCHORS) {
      const scale = buildSemantic(a);
      expect(scale[5].l, a.id).toBeCloseTo(a.anchor.l, 6);
      expect(scale[5].c, a.id).toBeCloseTo(a.anchor.c, 6);
      expect(scale[5].h, a.id).toBeCloseTo(a.anchor.h, 6);
    }
  });

  it("applies the measured hue ramp — warning swings both ways", () => {
    const warning = SEMANTIC_ANCHORS.find((a) => a.id === "warning")!;
    const scale = buildSemantic(warning);
    expect(scale[0].h).toBeGreaterThan(warning.anchor.h + 20);  // 밝은 쪽 노랑으로
    expect(scale[10].h).toBeLessThan(warning.anchor.h - 20);    // 어두운 쪽 주황으로
  });

  it("applies the hue ramp before clamping, not after", () => {
    // 순서가 뒤집히면 앵커 hue에서 잘린 채도를 들고 hue만 도는 꼴이 된다.
    // amber stop 200은 올바른 순서에서 0.079 근처, 뒤집히면 0.055 근처.
    const warning = SEMANTIC_ANCHORS.find((a) => a.id === "warning")!;
    expect(buildSemantic(warning)[2].c).toBeGreaterThan(0.07);
  });

  it("keeps every stop inside sRGB", () => {
    for (const a of SEMANTIC_ANCHORS) {
      for (const s of buildSemantic(a)) {
        expect(s.c, a.id).toBeGreaterThanOrEqual(0);
        expect(s.l, a.id).toBeGreaterThan(0);
        expect(s.l, a.id).toBeLessThanOrEqual(1);
      }
    }
  });
});
