// src/export/color/vars.ts
//
// 변수 선언 목록. palette.css와 palette.theme.css가 이 함수들을 공유하므로
// 두 파일의 선언이 갈라질 수 없다 (스펙 D4).

import type { ColorSystem } from "./types.js";

export interface VarDecl {
  readonly name: string;
  readonly value: string;
}

/** Tailwind v4는 --color- 접두사에서만 색 유틸리티를 생성한다 (스펙 D3). */
export function varName(scaleName: string, key: string): string {
  return `--color-${scaleName}-${key}`;
}

export function primitiveVars(system: ColorSystem): VarDecl[] {
  const out: VarDecl[] = [];
  for (const scale of system.scales) {
    system.stopKeys.forEach((key, i) => {
      out.push({ name: varName(scale.name, key), value: scale.hexes[i] });
    });
  }
  return out;
}

export function roleVars(system: ColorSystem): VarDecl[] {
  const out: VarDecl[] = [];
  for (const scale of system.scales) {
    for (const role of system.roles) {
      out.push({
        name: varName(scale.name, role.id),
        value: `var(${varName(scale.name, system.stopKeys[role.lightIndex])})`,
      });
    }
  }
  return out;
}

/** 다크에서 실제로 자리가 바뀌는 역할만. 재선언하지 않은 것 = 안 바뀌는 것. */
export function darkRoleVars(system: ColorSystem): VarDecl[] {
  const out: VarDecl[] = [];
  for (const scale of system.scales) {
    for (const role of system.roles) {
      if (role.darkIndex === role.lightIndex) continue;
      out.push({
        name: varName(scale.name, role.id),
        value: `var(${varName(scale.name, system.stopKeys[role.darkIndex])})`,
      });
    }
  }
  return out;
}

export function renderBlock(selector: string, decls: readonly VarDecl[]): string {
  return [`${selector} {`, ...decls.map((d) => `  ${d.name}: ${d.value};`), "}"].join("\n");
}
