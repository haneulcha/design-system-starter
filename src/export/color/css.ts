// src/export/color/css.ts
//
// 프레임워크 무관 CSS. 2레이어: 프리미티브를 먼저 선언하고 역할이 var()로 참조한다.
// 다크는 프리미티브를 덮지 않는다 — 역할이 가리키는 stop만 바꾼다 (레거시와 반대).

import type { ColorSystem } from "./types.js";
import { assertColorSystem } from "./types.js";
import { primitiveVars, roleVars, darkRoleVars, renderBlock } from "./vars.js";

export interface CssSelectors {
  readonly light: string;
  readonly dark: string;
}

const DEFAULT_SELECTORS: CssSelectors = { light: ":root", dark: ".dark" };

const HEADER = [
  "/* 팔레트 생성기 산출 — 색 시스템 */",
  "/* 프리미티브는 테마와 무관하게 고정. 다크는 역할이 가리키는 stop만 바꾼다. */",
  "/* .dark에 재선언되지 않은 역할 = 테마를 가로질러 안 바뀌는 역할. */",
].join("\n");

export function generateColorCss(
  system: ColorSystem,
  selectors: CssSelectors = DEFAULT_SELECTORS,
): string {
  assertColorSystem(system);
  const light = [...primitiveVars(system), ...roleVars(system)];
  return [
    HEADER,
    "",
    renderBlock(selectors.light, light),
    "",
    renderBlock(selectors.dark, darkRoleVars(system)),
    "",
  ].join("\n");
}
