// web/src/color-palette/contrastWarnings.ts
//
// DESIGN.md에 실릴 대비 경고 문구. 화면 뱃지(PreviewPane)가 보는 것과 같은 checkContrast
// 전체 실패 집합을 쓴다 — 부분집합으로 걸러내면 화면에는 뜨는 경고가 파일에서만 빠지는,
// 스펙 D5가 걱정한 "산출 코드가 직접 재면 갈라진다"와 같은 종류의 갈라짐이 생긴다.

import { checkContrast, type ContrastCheck } from "@core/color/contrast.js";
import type { ScaleRole, ScaleSet } from "@core/color/roles.js";

/** 큰 글씨(WCAG 2.2)의 대비 하한. 본문 하한(AA_BODY=4.5)과 별개로 실측에만 쓴다 —
 *  "여기부터는 큰 글씨로만 쓰라"는 허용을 주지 않기 위해 케이스마다 직접 판정한다. */
const AA_LARGE = 3.0;

function themeLabel(theme: ContrastCheck["theme"]): string {
  return theme === "light" ? "라이트" : "다크";
}

function bgLabel(against: ContrastCheck["against"]): string {
  if (against === "subtle-bg") return "은은한 배경";
  if (against === "page") return "페이지 배경";
  return "solid";
}

/** 라이트는 진해지는 방향, 다크는 밝아지는 방향으로 옮기면 대비가 오른다 —
 *  suggestRoleShifts와 같은 방향(스펙 D5). 구체적 stop 번호는 곡선·팔레트마다
 *  달라 여기서 단정하지 않는다 — 방향만 안내한다. */
function directionHint(theme: ContrastCheck["theme"]): string {
  return theme === "light" ? "더 진한 stop" : "더 밝은 stop";
}

/** 3:1(큰 글씨) 기준을 실제로 넘는지 케이스마다 판정한다. "큰 글씨에만 쓰라"는
 *  존재하지 않는 허용을 주지 않기 위해 — 이 경계값 위에서도 본문에는 여전히
 *  못 쓴다는 사실을 같이 밝힌다. */
function largeTextClause(ratio: number): string {
  return ratio >= AA_LARGE
    ? "큰 글씨(3:1) 기준은 넘지만 본문에는 못 쓴다"
    : "큰 글씨(3:1)로도 부족하다";
}

/** on-solid은 stop을 옮겨 고칠 수 없다 — 흑/백 중 관례상 나은 쪽을 고른 결과라
 *  "직접 다른 stop을 쓰라"는 안내가 맞지 않는다(스펙 D5). 별도 문구를 준다. */
function onSolidWarning(c: ContrastCheck): string {
  return (
    `\`--color-${c.scaleName}-on-solid\`는 AA에 미달한다 — solid 위 ${c.ratio.toFixed(2)}이라 ` +
    `본문(${c.required}:1)은 물론 ${largeTextClause(c.ratio)}. 흰/검 중 대비가 나은 쪽을 관례대로 ` +
    `고른 값이라 stop을 옮겨 고칠 수 없다 — 미달을 감수하고 쓰거나 solid 위에는 별도 배경/경계를 더할 것.`
  );
}

function stopWarning(c: ContrastCheck): string {
  return (
    `\`--color-${c.scaleName}-${c.roleId}\`는 ${themeLabel(c.theme)} 테마에서 AA에 미달한다 — ` +
    `${bgLabel(c.against)} 위 ${c.ratio.toFixed(2)}이라 본문(${c.required}:1)은 물론 ` +
    `${largeTextClause(c.ratio)}. AA가 필요하면 ${directionHint(c.theme)}을 직접 쓸 것.`
  );
}

/** 경고 문구는 엔진 계산(checkContrast)으로 만들어 산출 코드에 데이터로 넘긴다 —
 *  산출 코드가 대비를 직접 재면 화면 뱃지와 갈라질 수 있다(스펙 D5). 화면 뱃지와
 *  같은 전체 실패 집합(`checks.filter((c) => !c.passes)`, PreviewPane 참고)을 쓴다 —
 *  theme·against로 걸러내는 부분집합화는 재계산과 같은 종류의 갈라짐을 만든다. */
export function buildContrastWarnings(
  scales: ScaleSet,
  roles: readonly ScaleRole[],
): string[] {
  return checkContrast(scales, roles)
    .filter((c) => !c.passes)
    .map((c) => (c.roleId === "on-solid" ? onSolidWarning(c) : stopWarning(c)));
}
