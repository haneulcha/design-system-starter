import { describe, it, expect } from "vitest";
import {
  contrastRatio, onSolidColor, AA_BODY, ON_SOLID_FLOOR, formatRatio,
  checkContrast, suggestRoleShifts, applyRoleShifts, buildContrastWarnings,
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

// 모든 stop이 같은 회색이면 배경과 글자가 늘 같은 색이라(ratio 1.0) 라이트·다크
// 양쪽에서, 모든 스케일·역할에서 실패한다 — 다크 케이스를 억지로 만들지 않고도
// "라이트·다크가 둘 다 다뤄진다"를 결정론적으로 시험할 수 있다.
const FLAT_GRAY: readonly string[] = Array(11).fill("#808080") as string[];
const FLAT_SYSTEM: ScaleSet = {
  accent: FLAT_GRAY,
  neutral: FLAT_GRAY,
  semantic: Object.fromEntries(
    SEMANTIC_ANCHORS.map((a) => [a.id, FLAT_GRAY]),
  ) as unknown as ScaleSet["semantic"],
};

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

describe("formatRatio", () => {
  // 4.4957을 toFixed(2)로 반올림하면 4.50이 되어 AA(4.5) 기준을 충족한 것처럼
  // 보인다 — 뱃지·DESIGN.md 둘 다 내림을 써야 한다.
  it("floors instead of rounding, so a near-miss never reads as passing", () => {
    expect(formatRatio(4.4957)).toBe("4.49");
    expect(formatRatio(4.4957)).not.toBe("4.50");
  });

  it("keeps two decimal places", () => {
    expect(formatRatio(3.6779011537825332)).toBe("3.67");
  });
});

// buildContrastWarnings의 필터·문구를 단위로 고정한다 — 원래 web/src/color-palette/
// contrastWarnings.test.ts에 있었다. src/color/contrast.ts로 승격되며 엔진 테스트로
// 옮겼다 — export/ 쪽 산출 코드는 여전히 이 함수를 import하지 않는다(D5).
describe("buildContrastWarnings", () => {
  it("includes the on-solid warning for the default blue accent", () => {
    const warnings = buildContrastWarnings(systemFor("#3b82f6"), SCALE_ROLES);
    expect(warnings.some((w) => w.includes("on-solid"))).toBe(true);
  });

  // 브리프의 원래 필터(theme==="light" && against==="subtle-bg")는 on-solid을
  // 통째로 뺐다 — 화면 뱃지에는 뜨는데 파일에는 없는 갈라짐이었다.
  it("does not silently drop the on-solid failure the way the old subset filter did", () => {
    const warnings = buildContrastWarnings(systemFor("#3b82f6"), SCALE_ROLES);
    const onSolid = warnings.find((w) => w.includes("on-solid"));
    expect(onSolid).toBeDefined();
    expect(onSolid).toContain("3.67"); // 내림 — toFixed(2)라면 3.68로 반올림됐을 값
  });

  it("covers both light and dark theme failures", () => {
    const warnings = buildContrastWarnings(FLAT_SYSTEM, SCALE_ROLES);
    expect(warnings.some((w) => w.includes("라이트"))).toBe(true);
    expect(warnings.some((w) => w.includes("다크"))).toBe(true);
  });

  // 2.96은 큰 글씨 기준 3:1도 못 넘는다 — "본문은 물론 큰 글씨로도 부족하다" 틀을
  // 써야 한다. "큰 글씨는 넘지만"이 섞이면 존재하지 않는 허용을 준 것이 된다.
  // 변수명 바로 뒤에 조사를 붙이지 않는 전체 문장 형태까지 고정한다 — "text"는
  // 발음(텍스트)상 받침이 없어 "는"이 맞고 "text-strong"은 받침이 있어 "은"이 맞는데,
  // 영문 마지막 글자만 보는 판정으로는 이 둘을 못 맞힌다(이전 시도의 실패). 조사
  // 자체를 피하는 " — " 구조라야 스케일·역할 이름이 늘어도 항상 맞는다.
  it("uses the below-3:1 sentence frame for the known 2.96 failure", () => {
    const warnings = buildContrastWarnings(systemFor("#3b82f6"), SCALE_ROLES);
    const known = warnings.find((w) => w.includes("2.96"));
    expect(known).toBeDefined();
    expect(known).toContain(
      "`--color-warning-text` — 라이트 테마에서 AA 미달: 은은한 배경 위 2.96이라 " +
        "본문(4.5:1)은 물론 큰 글씨(3:1)로도 부족하다.",
    );
    expect(known).not.toContain("큰 글씨(3:1)는 넘지만");
  });

  // on-solid의 3.67은 3:1은 넘지만 본문(4.5:1)에는 여전히 못 쓴다 — "넘지만 …
  // 못 쓴다" 틀을 써야 하고, 부족 틀("본문은 물론")과 섞이면 자기모순이 된다.
  // 여기도 변수명 뒤에 조사를 안 붙이는 전체 형태를 고정한다("on-solid"는 발음
  // (솔리드)상 받침이 없어 "는"이 맞지만, 영문 마지막 글자(d)만 보면 "은"이
  // 나와 틀렸었다).
  it("uses the at-or-above-3:1 sentence frame for the on-solid 3.67 case", () => {
    const warnings = buildContrastWarnings(systemFor("#3b82f6"), SCALE_ROLES);
    const onSolid = warnings.find((w) => w.includes("on-solid"))!;
    expect(onSolid).toContain(
      "`--color-accent-on-solid` — AA 미달: solid 위 3.67이라 " +
        "큰 글씨(3:1)는 넘지만 본문(4.5:1)에는 못 쓴다.",
    );
    expect(onSolid).not.toContain("은 물론");
  });

  it("never emits the forbidden 'use it for large text only' phrasing anywhere", () => {
    const warnings = [
      ...buildContrastWarnings(systemFor("#3b82f6"), SCALE_ROLES),
      ...buildContrastWarnings(FLAT_SYSTEM, SCALE_ROLES),
    ];
    expect(warnings.every((w) => !w.includes("큰 글씨에만"))).toBe(true);
  });

  it("omits the on-solid warning when the solid stop clears AA on white", () => {
    // solid(index 5)만 아주 어둡게 바꾼다 — 흰 글자가 넉넉히 AA(4.5)를 넘어
    // on-solid만 통과해야 한다. 나머지 stop은 FLAT_GRAY 그대로라 다른 실패는
    // 여전히 나올 수 있지만, 여기서는 on-solid 항목만 따로 본다.
    const darkSolid: readonly string[] = FLAT_GRAY.map((h, i) => (i === 5 ? "#101010" : h));
    const system: ScaleSet = {
      accent: darkSolid,
      neutral: darkSolid,
      semantic: Object.fromEntries(
        SEMANTIC_ANCHORS.map((a) => [a.id, darkSolid]),
      ) as unknown as ScaleSet["semantic"],
    };
    const onSolidWarnings = buildContrastWarnings(system, SCALE_ROLES).filter((w) =>
      w.includes("on-solid"),
    );
    expect(onSolidWarnings).toEqual([]);
  });
});
