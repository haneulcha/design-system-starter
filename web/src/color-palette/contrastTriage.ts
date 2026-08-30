// 대비 실패를 "고칠 수 있는 것 / 없는 것"으로 가른다.
//
// 왜 ContrastCheck.adjustable을 그대로 쓰지 않는가: 그 플래그는 "이 스케일을
// 사용자가 바꿀 수 있는가"(accent·neutral)이지 "이 실패를 고칠 수 있는가"가
// 아니다. on-solid은 스케일이 accent여도 못 고친다 — 엔진의 onSolidWarning이
// "흰/검 중 관례대로 고른 값이라 stop을 옮겨 고칠 수 없다"고 적었다. 그 둘을
// 같은 축으로 취급해서 기본 상태의 헤드라인이 대책 없는 경고 하나를 맨 위에
// 올려두고 있었다 (스펙 D4).
//
// 판정: suggestRoleShifts가 이 role·theme에 대한 이동을 제안했는가. 제안 함수는
// TEXT_ROLES(text·text-strong)와 조정 가능한 스케일에만 제안을 내므로,
// on-solid은 구조적으로 절대 매칭되지 않는다.
import type { ContrastCheck, RoleShift } from "@core/color/contrast.js";
import { SCALE_ROLES } from "@core/color/roles.js";

export interface Triage {
  readonly fixable: ContrastCheck[];
  readonly unfixable: ContrastCheck[];
}

export function triageChecks(
  checks: readonly ContrastCheck[],
  shifts: readonly RoleShift[],
): Triage {
  const canFix = (c: ContrastCheck) =>
    c.adjustable && shifts.some((s) => s.roleId === c.roleId && s.theme === c.theme);
  return {
    fixable: checks.filter(canFix),
    unfixable: checks.filter((c) => !canFix(c)),
  };
}

/** 역할의 사람이 읽는 이름. roles.ts가 "UI 문구는 엔진에 둔다"고 적어뒀고,
 *  뱃지의 scaleName은 이미 그렇게 하고 있다 — roleId만 생으로 남아 있었다. */
export function roleLabel(roleId: string): string {
  return SCALE_ROLES.find((r) => r.id === roleId)?.label ?? roleId;
}
