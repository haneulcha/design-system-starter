import { describe, it, expect } from "vitest";
import {
  NEUTRAL_CURVE,
  C_SHAPE_SOFT,
  C_SHAPE_STRONG,
  TINT_ATTRACTORS,
  snapTint,
  cShape,
  SOFT_REF_CMAX,
  STRONG_REF_CMAX,
} from "../../src/lab/palette/neutral.js";
import { SCALE_SIZE } from "../../src/lab/palette/builder.js";
import {
  buildNeutral,
  neutralCandidates,
  tintAttractor,
  TINT_STRENGTHS,
  type NeutralCandidate,
} from "../../src/lab/palette/neutral.js";

describe("NEUTRAL_CURVE", () => {
  it("has 11 stops with strictly decreasing lightness", () => {
    expect(NEUTRAL_CURVE).toHaveLength(SCALE_SIZE);
    for (let i = 1; i < NEUTRAL_CURVE.length; i++) {
      expect(NEUTRAL_CURVE[i].l, `stop ${i}`).toBeLessThan(NEUTRAL_CURVE[i - 1].l);
    }
  });

  it("matches the tailwind neutral mean measured 2026-08-09", () => {
    const expected = [
      0.9848, 0.9684, 0.9244, 0.8702, 0.7066,
      0.5532, 0.4434, 0.372, 0.2736, 0.2098, 0.1384,
    ];
    NEUTRAL_CURVE.forEach((s, i) => expect(s.l, `stop ${i}`).toBeCloseTo(expected[i], 4));
  });

  it("drops faster than the accent curve past stop 400 (why it needs its own table)", () => {
    // 액센트 OURS_CURVE의 500은 0.6838 — 뉴트럴은 0.13 이상 더 어둡다.
    expect(NEUTRAL_CURVE[5].l).toBeLessThan(0.6838 - 0.12);
    // 반대로 밝은 쪽 50은 액센트(0.9772)보다 밝다.
    expect(NEUTRAL_CURVE[0].l).toBeGreaterThan(0.9772);
  });
});

describe("chroma shape tables", () => {
  it("both have 11 entries in 0..1", () => {
    for (const t of [C_SHAPE_SOFT, C_SHAPE_STRONG]) {
      expect(t).toHaveLength(SCALE_SIZE);
      for (const v of t) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it("STRONG holds chroma at the dark end while SOFT lets it fall", () => {
    // 이 방향성이 V3의 발견 — 뒤집히면 강도-종속 모델이 무너진다.
    for (const i of [8, 9, 10]) {
      expect(C_SHAPE_STRONG[i], `stop ${i}`).toBeGreaterThan(C_SHAPE_SOFT[i] + 0.2);
    }
  });

  it("agrees at the light end (where the ramps did not diverge)", () => {
    for (const i of [2, 3]) {
      expect(Math.abs(C_SHAPE_STRONG[i] - C_SHAPE_SOFT[i]), `stop ${i}`).toBeLessThan(0.05);
    }
  });
});

describe("cShape", () => {
  it("returns SOFT at the soft reference strength and STRONG at the strong one", () => {
    for (let i = 0; i < SCALE_SIZE; i++) {
      expect(cShape(i, SOFT_REF_CMAX), `soft ${i}`).toBeCloseTo(C_SHAPE_SOFT[i], 5);
      expect(cShape(i, STRONG_REF_CMAX), `strong ${i}`).toBeCloseTo(C_SHAPE_STRONG[i], 5);
    }
  });

  it("clamps outside the reference range instead of extrapolating", () => {
    expect(cShape(9, 0.0)).toBeCloseTo(C_SHAPE_SOFT[9], 5);
    expect(cShape(9, 0.5)).toBeCloseTo(C_SHAPE_STRONG[9], 5);
  });
});

describe("TINT_ATTRACTORS", () => {
  it("has exactly 5 entries with unique ids and exactly one achromatic", () => {
    expect(TINT_ATTRACTORS).toHaveLength(5);
    expect(new Set(TINT_ATTRACTORS.map((a) => a.id)).size).toBe(5);
    expect(TINT_ATTRACTORS.filter((a) => a.hue === null)).toHaveLength(1);
  });

  it("hues are in 0..360 and notes are educational", () => {
    for (const a of TINT_ATTRACTORS) {
      if (a.hue !== null) {
        expect(a.hue, a.id).toBeGreaterThanOrEqual(0);
        expect(a.hue, a.id).toBeLessThan(360);
      }
      expect(a.label.length, a.id).toBeGreaterThan(0);
      expect(a.note.length, a.id).toBeGreaterThan(10);
    }
  });
});

describe("snapTint", () => {
  it("never returns the achromatic attractor", () => {
    for (let h = 0; h < 360; h++) {
      expect(snapTint(h).hue, `hue ${h}`).not.toBeNull();
    }
  });

  it("picks the circular-nearest chromatic attractor for every hue", () => {
    const chromatic = TINT_ATTRACTORS.filter((a) => a.hue !== null);
    const dist = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
    for (let h = 0; h < 360; h++) {
      const best = Math.min(...chromatic.map((a) => dist(h, a.hue!)));
      expect(dist(h, snapTint(h).hue!), `hue ${h}`).toBeCloseTo(best, 6);
    }
  });

  it("pushes orange accents to the warm attractor, not to their own hue", () => {
    // 순수 웜 그레이는 갈색이 된다 — radix sand 107°, tw stone 58°가 밀어낸 이유.
    for (const h of [30, 40, 50]) {
      const t = snapTint(h);
      expect(t.id, `hue ${h}`).toBe("warm");
      expect(t.hue!, `hue ${h}`).toBeGreaterThan(h + 25);
    }
  });

  it("maps blue and purple accents to their own neighbourhood", () => {
    expect(snapTint(259).id).toBe("cool");
    expect(snapTint(290).id).toBe("purple");
    expect(snapTint(150).id).toBe("green");
  });

  it("handles hues outside 0..360 by normalizing", () => {
    expect(snapTint(-100).id).toBe(snapTint(260).id);
    expect(snapTint(620).id).toBe(snapTint(260).id);
  });
});

describe("tintAttractor", () => {
  it("returns the achromatic attractor for { hue: null, strength: 0 }", () => {
    // null === null 매칭이 핵심 동작이다 — hue 0(빨강 근처 실측)과 혼동되면
    // 무채색 틴트가 엉뚱한 유채색 어트랙터로 되짚힌다.
    const found = tintAttractor({ hue: null, strength: 0 });
    expect(found.id).toBe("achromatic");
  });

  it("returns the matching attractor for each chromatic hue", () => {
    for (const a of TINT_ATTRACTORS) {
      if (a.hue === null) continue;
      const found = tintAttractor({ hue: a.hue, strength: TINT_STRENGTHS.soft });
      expect(found.id, a.id).toBe(a.id);
    }
  });

  it("throws when the hue is not one of the attractors (engine contract violation)", () => {
    expect(() => tintAttractor({ hue: 40, strength: TINT_STRENGTHS.soft })).toThrow(
      /no attractor matches hue/,
    );
  });
});

describe("buildNeutral", () => {
  it("returns 11 stops with strictly decreasing lightness", () => {
    const scale = buildNeutral({ hue: 258, strength: TINT_STRENGTHS.soft });
    expect(scale).toHaveLength(SCALE_SIZE);
    for (let i = 1; i < scale.length; i++) {
      expect(scale[i].l, `stop ${i}`).toBeLessThan(scale[i - 1].l);
    }
  });

  it("keeps chroma far below accent territory", () => {
    const scale = buildNeutral({ hue: 258, strength: TINT_STRENGTHS.strong });
    // 액센트 C_max 코퍼스 중앙값은 0.213 — 뉴트럴은 그 1/5 아래에 머문다.
    for (const s of scale) expect(s.c).toBeLessThan(0.05);
  });

  it("emits pure grey when the tint is achromatic", () => {
    const scale = buildNeutral({ hue: null, strength: 0 });
    for (const s of scale) expect(s.c).toBe(0);
  });

  it("carries the requested hue on every chromatic stop", () => {
    const scale = buildNeutral({ hue: 85, strength: TINT_STRENGTHS.soft });
    for (const s of scale) {
      if (s.c > 0) expect(s.h).toBeCloseTo(85, 6);
    }
  });

  it("strong tint holds more chroma at the dark end than soft", () => {
    const soft = buildNeutral({ hue: 258, strength: TINT_STRENGTHS.soft });
    const strong = buildNeutral({ hue: 258, strength: TINT_STRENGTHS.strong });
    expect(strong[9].c).toBeGreaterThan(soft[9].c);
  });

  it("throws on a negative strength (programmer error guard)", () => {
    expect(() => buildNeutral({ hue: 258, strength: -0.01 })).toThrow(
      /strength must be >= 0/,
    );
  });

  it("throws on NaN strength (the >= 0 guard catches it too)", () => {
    expect(() => buildNeutral({ hue: 258, strength: NaN })).toThrow(
      /strength must be >= 0/,
    );
  });
});

describe("neutralCandidates", () => {
  it("offers exactly 3 candidates: achromatic, snapped soft, snapped strong", () => {
    const list = neutralCandidates(259);
    expect(list).toHaveLength(3);
    expect(list[0].color.c).toBe(0);
    expect(list[1].color.h).toBeCloseTo(258, 6);
    expect(list[2].color.h).toBeCloseTo(258, 6);
    expect(list[2].color.c).toBeGreaterThan(list[1].color.c);
  });

  it("labels and notes are educational", () => {
    for (const c of neutralCandidates(40)) {
      expect(c.label.length).toBeGreaterThan(0);
      expect(c.note.length).toBeGreaterThan(10);
    }
  });

  it("names the snapped attractor in the note so the user sees the reasoning", () => {
    const warm = neutralCandidates(40);
    expect(warm[1].note).toContain("웜");
    const cool = neutralCandidates(259);
    expect(cool[1].note).toContain("쿨");
  });

  it("hands the warm attractor's hue to the grey, not the accent's own", () => {
    // V2의 핵심 주장: 주황 액센트에 자기 hue를 그대로 주면 회색이 갈색이 된다.
    const [, soft, strong] = neutralCandidates(40);
    for (const c of [soft, strong]) {
      expect(c.color.h).toBeCloseTo(85, 6);
      expect(Math.abs(c.color.h - 40)).toBeGreaterThan(25);
    }
  });

  it("carries the tint that actually produced its own color (color and tint cannot disagree)", () => {
    // UI가 순서로 tint를 되짚는 대신 이 필드를 읽는다 — 각 후보의 tint로 buildNeutral을
    // 다시 돌리면 정확히 그 후보의 color(스케일 500 자리)가 나와야 한다.
    for (const hex of [259, 40, 150]) {
      for (const c of neutralCandidates(hex) as NeutralCandidate[]) {
        expect(buildNeutral(c.tint)[5]).toEqual(c.color);
      }
    }
  });

  it("candidate 0's tint is achromatic ({ hue: null, strength: 0 })", () => {
    const [achromatic] = neutralCandidates(259) as NeutralCandidate[];
    expect(achromatic.tint).toEqual({ hue: null, strength: 0 });
  });

  it("candidates 1 and 2 carry the snapped attractor's hue with soft/strong strength", () => {
    const snapped = snapTint(259);
    const [, soft, strong] = neutralCandidates(259) as NeutralCandidate[];
    expect(soft.tint).toEqual({ hue: snapped.hue, strength: TINT_STRENGTHS.soft });
    expect(strong.tint).toEqual({ hue: snapped.hue, strength: TINT_STRENGTHS.strong });
  });
});
