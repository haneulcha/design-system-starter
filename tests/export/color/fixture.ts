// 합성 픽스처. 실제 엔진 값을 쓰지 않는 이유: 산출 코드는 엔진과 독립이어야 하고,
// 엔진 상수가 바뀌었다고 산출 테스트가 깨지면 그 독립성이 거짓말이 된다.
// 실제 엔진과의 연결은 adapter 테스트(Task 2)가 따로 덮는다.

import type { ColorSystem, ExportRole, ExportScale } from "../../../src/export/color/types.js";

export const FIXTURE_STOP_KEYS = [
  "50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950",
] as const;

/** tag 2자리 + stop 인덱스 2자리 → 겹치지 않고 눈으로 추적 가능한 hex. */
function hexes(tag: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => `#${tag}${tag}${i.toString(16).padStart(2, "0")}`);
}

export const FIXTURE_ROLES: readonly ExportRole[] = [
  { id: "subtle-bg", label: "은은한 배경", lightIndex: 0, darkIndex: 10 },
  { id: "hover-bg", label: "호버 배경", lightIndex: 1, darkIndex: 9 },
  { id: "border", label: "테두리", lightIndex: 2, darkIndex: 8 },
  { id: "solid", label: "솔리드", lightIndex: 5, darkIndex: 5 },
  { id: "text", label: "텍스트", lightIndex: 6, darkIndex: 4 },
  { id: "text-strong", label: "진한 텍스트", lightIndex: 7, darkIndex: 3 },
];

const FIXTURE_SCALE_DEFS: readonly [string, string, string][] = [
  ["accent", "액센트", "a0"],
  ["neutral", "뉴트럴", "b0"],
  ["error", "오류 (빨강)", "c0"],
  ["warning", "경고 (앰버)", "d0"],
  ["success", "성공 (초록)", "e0"],
  ["info", "정보 (파랑)", "f0"],
];

export function fixtureSystem(): ColorSystem {
  const scales: ExportScale[] = FIXTURE_SCALE_DEFS.map(([name, label, tag]) => ({
    name,
    label,
    hexes: hexes(tag, FIXTURE_STOP_KEYS.length),
  }));
  return { stopKeys: [...FIXTURE_STOP_KEYS], scales, roles: FIXTURE_ROLES };
}

/** 가드 테스트용 최소 시스템 — 길이 계약을 짧게 검사한다. */
export function tinySystem(): ColorSystem {
  return {
    stopKeys: ["a", "b", "c"],
    scales: [
      { name: "one", label: "하나", hexes: ["#000000", "#111111", "#222222"] },
      { name: "two", label: "둘", hexes: ["#333333", "#444444", "#555555"] },
    ],
    roles: [
      { id: "low", label: "낮음", lightIndex: 0, darkIndex: 2 },
      { id: "mid", label: "중간", lightIndex: 1, darkIndex: 1 },
    ],
  };
}
