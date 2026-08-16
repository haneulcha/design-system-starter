// web/src/color-palette/contrastWarnings.test.ts
//
// buildContrastWarnings의 필터·문구를 단위로 고정한다 — DownloadRow의 useMemo
// 안에 박혀 있었을 때는 이 필터 버그(부분집합화)를 잡을 테스트가 없었다.

import { describe, it, expect } from "vitest";
import { fillScale } from "@core/color/scale.js";
import { buildNeutral, snapTint, TINT_STRENGTHS } from "@core/color/neutral.js";
import { SEMANTIC_ANCHORS, buildSemantic } from "@core/color/semantic.js";
import { SCALE_ROLES, type ScaleSet } from "@core/color/roles.js";
import { oklchToHex, parsePrimary } from "@core/generator/color.js";
import { buildContrastWarnings } from "./contrastWarnings";

// tests/color/contrast.test.ts의 systemFor와 같은 조립 — 엔진이 실제로 만드는 팔레트로
// 시험해야 화면 뱃지·다운로드 파일과 같은 입력을 보는 셈이 된다.
function systemFor(hex: string): ScaleSet {
  const a = parsePrimary(hex);
  return {
    accent: fillScale([{ index: 5, color: a }]).map(oklchToHex),
    neutral: buildNeutral({ hue: snapTint(a.h).hue, strength: TINT_STRENGTHS.soft }).map(
      oklchToHex,
    ),
    semantic: Object.fromEntries(
      SEMANTIC_ANCHORS.map((s) => [s.id, buildSemantic(s).map(oklchToHex)]),
    ) as unknown as ScaleSet["semantic"],
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
    expect(onSolid).toContain("3.68");
  });

  it("covers both light and dark theme failures", () => {
    const warnings = buildContrastWarnings(FLAT_SYSTEM, SCALE_ROLES);
    expect(warnings.some((w) => w.includes("라이트"))).toBe(true);
    expect(warnings.some((w) => w.includes("다크"))).toBe(true);
  });

  // 2.96은 큰 글씨 기준 3:1도 못 넘는다 — "큰 글씨에만 쓰라"는 존재하지 않는
  // 허용이므로 그렇게 읽히는 문구를 절대 내면 안 된다.
  it("never claims the known 2.96 failure clears large text", () => {
    const warnings = buildContrastWarnings(systemFor("#3b82f6"), SCALE_ROLES);
    const known = warnings.find((w) => w.includes("2.96"));
    expect(known).toBeDefined();
    expect(known).toContain("큰 글씨(3:1)로도 부족하다");
    expect(known).not.toContain("큰 글씨에만");
  });

  // on-solid의 3.68은 3:1은 넘지만 본문(4.5:1)에는 여전히 못 쓴다 — 그 구분을
  // 문구가 실측으로 반영해야 한다(고정 문구로 뭉개면 안 된다).
  it("reflects the large-text threshold per case instead of a fixed phrase", () => {
    const warnings = buildContrastWarnings(systemFor("#3b82f6"), SCALE_ROLES);
    const onSolid = warnings.find((w) => w.includes("on-solid"))!;
    expect(onSolid).toContain("큰 글씨(3:1) 기준은 넘지만");
    expect(onSolid).not.toContain("큰 글씨에만");
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
