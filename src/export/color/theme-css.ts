// src/export/color/theme-css.ts
//
// Tailwind v4 테마. @theme(inline 아님)이라 유틸리티가 var(--color-…)를 참조하고
// 실제로 쓰인 변수가 :root로 나간다 — 그래서 .dark 재선언이 먹는다.
// (Tailwind 4는 쓰이지 않는 @theme 변수를 출력에서 털어낸다.)
// inline을 쓰면 값이 유틸리티에 치환돼 다크 역할 재배치가 통째로 죽는다 (스펙 D5).
// palette.css와 같은 변수 목록 함수를 쓰므로 두 파일이 갈라질 수 없다.

import type { ColorSystem } from "./types.js";
import { assertColorSystem } from "./types.js";
import { primitiveVars, roleVars, darkRoleVars, renderBlock } from "./vars.js";

const HEADER = [
  "/* 팔레트 생성기 산출 — Tailwind v4 테마 */",
  "/* @import \"tailwindcss\" 다음에 이 파일을 import하면 */",
  "/* bg-accent-solid · text-accent-text 같은 유틸리티가 생성된다. */",
  "/* 다크를 켜려면 루트에 .dark 클래스를 붙인다. */",
].join("\n");

export function generateColorThemeCss(system: ColorSystem): string {
  assertColorSystem(system);
  const light = [...primitiveVars(system), ...roleVars(system)];
  return [
    HEADER,
    "",
    renderBlock("@theme", light),
    "",
    renderBlock(".dark", darkRoleVars(system)),
    "",
  ].join("\n");
}
