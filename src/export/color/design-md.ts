// src/export/color/design-md.ts
//
// 핸드오프 문서. 값과 사용 규칙만 담는다.
// 유도 근거("왜 이 뉴트럴 hue인가")와 빌더에서의 선택 기록은 넣지 않는다 —
// 그건 고르는 순간에만 행동을 바꾸고, 확정된 팔레트를 받는 소비자에겐
// 행동을 바꾸지 않는 읽을거리다. 교보재는 빌더 화면에 남는다.
//
// "쓰는 법"의 항목들은 근거가 아니라 사용 규칙이다 — 안 적으면 소비자가
// 상태색을 브랜드에 맞춰 바꾸거나 다크용 색을 새로 만든다.

import type { ColorSystem, ContrastResolver } from "./types.js";
import { assertColorSystem } from "./types.js";
import { defaultResolver, varName } from "./vars.js";

/** 역할표는 스케일 하나당 한 번씩 다시 그려지지 않고 통째로 한 번만 렌더된다 —
 *  그래서 실제 스케일 이름 대신 자리표시자를 쓴다. varName을 통해 만들므로
 *  "--color-" 접두사가 여기 문자열로 다시 등장하지 않는다. */
const SCALE_PLACEHOLDER = "{스케일}";
const ROLE_PLACEHOLDER = "{역할 id}";

const USAGE_RULES: readonly string[] = [
  "상태색은 브랜드 색이 아니다 — 브랜드에 맞춰 바꾸지 말 것.",
  "배경과 텍스트는 뉴트럴, 강조만 액센트.",
  "다크는 색을 새로 만들지 않는다 — 역할이 가리키는 stop만 바뀐다.",
  "다크를 켜려면 루트에 `.dark` 클래스를 붙인다. 시스템 설정을 자동으로 따르지 않는다.",
];

export function renderColorDesignMd(
  system: ColorSystem,
  /** 라이트/다크에서 AA에 미달하는 조합의 설명. 호출자(화면)가 checkContrast 결과로 만든다.
   *  산출 코드가 직접 재지 않는 이유: 여기서 재면 화면 뱃지와 갈라질 수 있다. */
  contrastWarnings: readonly string[] = [],
  resolveContrast: ContrastResolver = defaultResolver,
): string {
  assertColorSystem(system);
  const lines: string[] = ["# 색 시스템", ""];

  lines.push("## 스케일", "");
  for (const scale of system.scales) {
    lines.push(`### ${scale.label} (${scale.name})`, "", "| stop | hex |", "| --- | --- |");
    system.stopKeys.forEach((key, i) => {
      lines.push(`| ${key} | ${scale.hexes[i]} |`);
    });
    lines.push("");
  }

  lines.push(
    "## 역할",
    "",
    "| 역할 | 변수 | 라이트 | 다크 |",
    "| --- | --- | --- | --- |",
  );
  for (const role of system.roles) {
    const varname = varName(SCALE_PLACEHOLDER, role.id);
    const cells =
      role.kind === "contrast"
        ? "스케일마다 흑/백 자동 | 좌동"
        : `${system.stopKeys[role.lightIndex]} | ${system.stopKeys[role.darkIndex]}`;
    lines.push(`| ${role.label} | ${varname} | ${cells} |`);
  }
  lines.push(
    "",
    "다크는 사다리의 반대쪽 자리를 쓴다. 라이트와 다크가 같은 역할은 테마를 가로질러 고정이다.",
    "",
  );

  lines.push("## 쓰는 법", "");
  for (const rule of USAGE_RULES) lines.push(`- ${rule}`);
  lines.push(
    `- 변수 이름 규칙: 원본 stop은 \`${varName(SCALE_PLACEHOLDER, "stop")}\`, ` +
      `역할은 \`${varName(SCALE_PLACEHOLDER, ROLE_PLACEHOLDER)}\`. ` +
      `예: 액센트 스케일의 500 stop은 \`${varName("accent", "500")}\`, ` +
      `그 스케일의 은은한 배경 역할은 \`${varName("accent", "subtle-bg")}\`.`,
  );
  for (const w of contrastWarnings) lines.push(`- ${w}`);
  lines.push("");

  return lines.join("\n");
}
