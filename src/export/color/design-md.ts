// src/export/color/design-md.ts
//
// 핸드오프 문서. 값과 사용 규칙만 담는다.
// 유도 근거("왜 이 뉴트럴 hue인가")와 빌더에서의 선택 기록은 넣지 않는다 —
// 그건 고르는 순간에만 행동을 바꾸고, 확정된 팔레트를 받는 소비자에겐
// 행동을 바꾸지 않는 읽을거리다. 교보재는 빌더 화면에 남는다.
//
// "쓰는 법"의 항목들은 근거가 아니라 사용 규칙이다 — 안 적으면 소비자가
// 상태색을 브랜드에 맞춰 바꾸거나 다크용 색을 새로 만든다.

import type { ColorSystem } from "./types.js";
import { assertColorSystem } from "./types.js";

const USAGE_RULES: readonly string[] = [
  "상태색은 브랜드 색이 아니다 — 브랜드에 맞춰 바꾸지 말 것.",
  "배경과 텍스트는 뉴트럴, 강조만 액센트.",
  "다크는 색을 새로 만들지 않는다 — 역할이 가리키는 stop만 바뀐다.",
  "다크를 켜려면 루트에 `.dark` 클래스를 붙인다. 시스템 설정을 자동으로 따르지 않는다.",
];

export function renderColorDesignMd(system: ColorSystem): string {
  assertColorSystem(system);
  const lines: string[] = ["# 색 시스템", ""];

  lines.push("## 스케일", "");
  for (const scale of system.scales) {
    lines.push(`### ${scale.label}`, "", "| stop | hex |", "| --- | --- |");
    system.stopKeys.forEach((key, i) => {
      lines.push(`| ${key} | ${scale.hexes[i]} |`);
    });
    lines.push("");
  }

  lines.push("## 역할", "", "| 역할 | 라이트 | 다크 |", "| --- | --- | --- |");
  for (const role of system.roles) {
    lines.push(
      `| ${role.label} | ${system.stopKeys[role.lightIndex]} | ${system.stopKeys[role.darkIndex]} |`,
    );
  }
  lines.push(
    "",
    "다크는 사다리의 반대쪽 자리를 쓴다. 라이트와 다크가 같은 역할은 테마를 가로질러 고정이다.",
    "",
  );

  lines.push("## 쓰는 법", "");
  for (const rule of USAGE_RULES) lines.push(`- ${rule}`);
  lines.push("");

  return lines.join("\n");
}
