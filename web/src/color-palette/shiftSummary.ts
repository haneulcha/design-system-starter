// web/src/color-palette/shiftSummary.ts
//
// "한 번에 고치기"는 역할 → stop 매핑을 조용히 다시 쓴다. 이 도구의 산출물은
// 디자인 시스템 명세이고, 그걸 말없이 바꾸는 것은 감당할 수 없는 침묵이다
// (스펙 D5). 여기서는 그 이동을 사람이 읽는 한 줄로 만든다.
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

import { STOP_KEYS } from "@core/color/scale.js";
import type { RoleShift } from "@core/color/contrast.js";
import { roleLabel } from "./contrastTriage";
import { mockTargetFor } from "./mockTargets";
import type { MockTarget } from "./mockTargets";

const stopName = (index: number): string => STOP_KEYS[index];

/** "한 번에 고치기"가 실제로 옮긴 역할·stop을 한 문장으로.
 *  예: "텍스트 (링크)를 600 → 700으로, 진한 텍스트를 700 → 800으로 옮겼습니다"
 *
 *  suggestRoleShifts는 라이트/다크를 각각의 항목으로 낸다 — 같은 역할이 두
 *  테마에서 같은 stop 이동을 냈으면(roleId+from+to가 같으면) 한 번만 말한다.
 *  안 그러면 "텍스트를 600→700으로, 텍스트를 600→700으로"처럼 같은 말이
 *  테마 수만큼 반복된다. */
export function summarizeShifts(shifts: readonly RoleShift[]): string {
  if (shifts.length === 0) return "";
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const s of shifts) {
    const key = `${s.roleId}:${s.from}:${s.to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    // roleLabel이 다루는 두 역할("텍스트 (링크)", "진한 텍스트") 모두 받침
    // 없는 음절로 끝나 조사는 "를"이 맞다. RoleOverride.roleId가 이 둘로
    // 고정된 유니온이라(src/color/contrast.ts) 조사 분기 없이 하드코딩해도
    // 어긋나지 않는다 — 유니온이 늘면 이 가정부터 다시 봐야 한다.
    parts.push(`${roleLabel(s.roleId)}를 ${stopName(s.from)} → ${stopName(s.to)}으로`);
  }
  return `${parts.join(", ")} 옮겼습니다`;
}

/** 조정 가능한 스케일 — suggestRoleShifts가 이동을 계산할 때 보는 것과 같은
 *  집합(엔진의 ADJUSTABLE, contrast.ts). RoleShift는 scaleName을 안 담는다 —
 *  역할은 스케일을 가로질러 공유되는 자리라서다(roles.ts). 그래서 "이동한
 *  역할이 목업 어디에 대응하는가"를 물으려면 이 두 스케일 각각에 물어야 한다. */
const HIGHLIGHTABLE_SCALES = ["neutral", "accent"] as const;

/** 이동한 역할들이 목업 어디를 가리키는지 — Task 6의 강조 장치
 *  (mockTargetFor)를 그대로 쓴다, 새로 만들지 않는다. "text"는 neutral에만
 *  대응 요소가 있고(mockTargets.ts: 액센트 text는 목업에 그 stop을 쓰는
 *  요소가 없다), "text-strong"은 neutral·accent 둘 다 있다 — 중복은
 *  Set으로 걷는다. */
export function shiftHighlightTargets(shifts: readonly RoleShift[]): readonly MockTarget[] {
  const targets = new Set<MockTarget>();
  for (const s of shifts) {
    for (const scaleName of HIGHLIGHTABLE_SCALES) {
      const target = mockTargetFor(scaleName, s.roleId);
      if (target) targets.add(target);
    }
  }
  return [...targets];
}
