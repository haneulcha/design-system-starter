// web/src/color-palette/shiftSummary.ts
//
// "한 번에 고치기"는 역할 → stop 매핑을 조용히 다시 쓴다. 이 도구의 산출물은
// 디자인 시스템 명세이고, 그걸 말없이 바꾸는 것은 감당할 수 없는 침묵이다
// (스펙 D5). 여기서는 그 이동을 사람이 읽는 문장으로 만든다.
//
// RoleShift.from/to는 인덱스(6, 7 …)인데 화면 어디에도 인덱스는 안 보인다 —
// STOP_KEYS를 거쳐 "600 → 700"으로 옮긴다. 역할 이름은 새로 짓지 않고 엔진
// 라벨(roleLabel, Task 5)을 그대로 쓴다 — roles.ts가 "UI 문구는 엔진에
// 둔다"고 적어뒀다.
//
// RoleShift.from은 URL/상태에 저장되지 않는다 — 엔진 주석(contrast.ts의
// RoleShift): "옛 링크가 옛 기본값을 실어 오면 안 되므로 URL에는 to만
// 싣는다". 그래서 이 요약은 "한 번에 고치기"를 누른 그 순간,
// suggestRoleShifts가 아직 살아있는 결과를 들고 있을 때만 만들 수 있다 —
// 새로고침하면 상태의 shifts는 {roleId, theme, to}만 남고 from은 없으므로
// 다시는 재구성할 수 없다. 사라지는 것이 버그가 아니라 계약이다.
//
// 테마를 반드시 살린다 — suggestRoleShifts는 라이트만/다크만 이동을 내는
// 경우가 흔하다(리뷰 실측: hue·L·C를 훑은 액센트 432개 중 이동이 나온 365개
// 중 121개, 33%가 다크 전용). 테마를 뭉개면 "라이트 텍스트를 옮겼다"고
// 말하면서 실제로는 안 바뀐 라이트 목업 요소를 가리키는 거짓 진술이 된다 —
// D5가 막으려는 바로 그 침묵의 반대편(거짓 발화)이다.

import { STOP_KEYS } from "@core/color/scale.js";
import type { RoleShift } from "@core/color/contrast.js";
import { SCALE_ORDER } from "@core/color/roles.js";
import { roleLabel } from "./contrastTriage";
import { mockTargetFor } from "./mockTargets";
import type { MockTarget } from "./mockTargets";

const stopName = (index: number): string => STOP_KEYS[index];

/** ContrastBadge 등 다른 곳에서도 라이트/다크를 이렇게 쓴다(PreviewPane의
 *  인라인 삼항과 같은 매핑) — 여긴 그 표기를 문장 접두로 쓴다. */
function themeLabel(theme: "light" | "dark"): string {
  return theme === "light" ? "라이트" : "다크";
}

/** "한 번에 고치기"가 실제로 옮긴 역할·stop을 사람이 읽는 문장으로.
 *  테마별로 묶어 각각 "라이트: …" / "다크: …" 문장을 만들고 " / "로 잇는다 —
 *  라이트만 움직였는데 "텍스트를 옮겼습니다"라고만 하면 어느 테마 얘기인지
 *  알 수 없고, 다크 전용 이동에 라이트 목업을 갖다 붙이는 착시가 생긴다.
 *
 *  예: "라이트: 텍스트 (링크)를 600 → 700으로, 진한 텍스트를 700 → 800으로
 *  옮겼습니다" (#00a3a3 실측 — mockTargets.ts D3 리뷰 반증 사례와 같은 액센트).
 *
 *  같은 테마 안에서 같은 역할이 두 번 나올 일은 없다 — suggestRoleShifts가
 *  TEXT_ROLES(text·text-strong)를 테마당 한 번씩만 순회해서 (roleId, theme)
 *  조합은 이미 유일하다. 그래서 여기엔 dedup이 없다: roleId만으로 라이트·
 *  다크를 합치려던 이전 버전은 두 테마의 from이 롤 정의(roles.ts: text
 *  lightIndex 6 / darkIndex 4)상 구조적으로 같을 수 없어 절대 발화하지 않는
 *  죽은 분기였다. */
export function summarizeShifts(shifts: readonly RoleShift[]): string {
  if (shifts.length === 0) return "";
  const sentences: string[] = [];
  for (const theme of ["light", "dark"] as const) {
    const inTheme = shifts.filter((s) => s.theme === theme);
    if (inTheme.length === 0) continue;
    const parts = inTheme.map(
      (s) => `${roleLabel(s.roleId)}를 ${stopName(s.from)} → ${stopName(s.to)}으로`,
    );
    sentences.push(`${themeLabel(theme)}: ${parts.join(", ")} 옮겼습니다`);
  }
  return sentences.join(" / ");
}

/** 테마별로 가른 목업 강조 대상. PreviewPane이 라이트 Mock에는 light만,
 *  다크 Mock에는 dark만 넘겨야 "안 바뀐 테마의 요소에 링이 걸리는" 거짓
 *  강조를 피한다. */
export interface ThemeHighlightTargets {
  readonly light: readonly MockTarget[];
  readonly dark: readonly MockTarget[];
}

/** 이동한 역할이 목업 어디를 가리키는지 — Task 6의 강조 장치(mockTargetFor)를
 *  그대로 쓴다, 새로 만들지 않는다.
 *
 *  모든 스케일(SCALE_ORDER)에 물어본다 — "이동을 계산할 때 어느 스케일을
 *  보는가"(엔진의 ADJUSTABLE = accent·neutral)와 "이동이 실제로 어느
 *  스케일에 반영되는가"는 다른 질문이다. applyRoleShifts는 역할의
 *  lightIndex/darkIndex를 전역으로 바꾸고, Mock의 모든 스케일(error 포함)이
 *  그 공유 role을 통해 stop을 읽는다(stopIdx) — 그래서 text-strong이
 *  움직이면 error 배지 글자색도 실제로 따라 움직인다(실측:
 *  `?a=eab308` 적용 전후 error-badge color가 rgb(183,0,15) →
 *  rgb(125,18,22)). ADJUSTABLE로 스케일을 좁히면 이 사실을 놓치고 "대응
 *  요소가 없다"는 틀린 전제로 실제로 바뀌는 요소를 강조에서 빼게 된다.
 *  (참고: contrastTriage.ts의 `c.adjustable` 논의는 "이 실패를 고칠 수
 *  있는가"를 가리는 것이라 여기 질문과는 축이 다르다 — 혼동하지 않는다.) */
function targetsForTheme(
  shifts: readonly RoleShift[],
  theme: "light" | "dark",
): readonly MockTarget[] {
  const targets = new Set<MockTarget>();
  for (const s of shifts) {
    if (s.theme !== theme) continue;
    for (const { name } of SCALE_ORDER) {
      const target = mockTargetFor(name, s.roleId);
      if (target) targets.add(target);
    }
  }
  return [...targets];
}

export function shiftHighlightTargets(shifts: readonly RoleShift[]): ThemeHighlightTargets {
  return {
    light: targetsForTheme(shifts, "light"),
    dark: targetsForTheme(shifts, "dark"),
  };
}
