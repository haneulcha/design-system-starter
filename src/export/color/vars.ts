// src/export/color/vars.ts
//
// 변수 선언 목록. palette.css와 palette.theme.css가 이 함수들을 공유하므로
// 두 파일의 선언이 갈라질 수 없다 (스펙 D4).

import type { ColorSystem, StopRole } from "./types.js";

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

/** 산출 코드의 유일한 대비 계산 구현. roleVars(→ palette.css·palette.theme.css)와
 *  toColorFigma(→ palette.figma.json)가 이 하나만 직접 호출하므로 산출물 사이에서
 *  값이 갈라질 수 없다 — 주입 지점을 두지 않는 이유가 이것이다: resolver를 파라미터로
 *  열어두면 호출자마다 다른 함수를 넘길 수 있게 되어 "갈라질 수 없다"는 이 문단의
 *  약속이 깨진다. (DESIGN.md는 리터럴 색을 계산하지 않고 "스케일마다 흑/백 자동"이라는
 *  고정 문구만 내므로 이 함수를 부르지 않는다 — 값 계산에서는 빠지지만 관례는 셋과
 *  어긋나지 않는다.) 엔진의 onSolidColor와 갈라지지 않는지는 두 구현을 맞대는 테스트가
 *  고정한다 — 산출 코드는 엔진을 import할 수 없으므로 사본 자체는 못 없앤다.
 *
 *  규칙은 엔진과 같다: 흰색이 3.0 이상이면 흰색, 아니면 흑백 중 나은 쪽 (스펙 D5). */
export const defaultResolver = (hex: string): string => {
  const c = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const n = Number.parseInt(hex.slice(1), 16);
  const lum =
    0.2126 * c(((n >> 16) & 0xff) / 255) +
    0.7152 * c(((n >> 8) & 0xff) / 255) +
    0.0722 * c((n & 0xff) / 255);
  const white = 1.05 / (lum + 0.05);
  const black = (lum + 0.05) / 0.05;
  if (white >= 3.0) return "#ffffff";
  return black > white ? "#000000" : "#ffffff";
};

export function stopRole(system: ColorSystem, id: string): StopRole {
  const found = system.roles.find((r) => r.kind === "stop" && r.id === id);
  if (!found || found.kind !== "stop") {
    throw new Error(`vars: no stop role "${id}" (assertColorSystem should have caught this)`);
  }
  return found;
}

export function roleVars(system: ColorSystem): VarDecl[] {
  const out: VarDecl[] = [];
  for (const scale of system.scales) {
    for (const role of system.roles) {
      if (role.kind === "contrast") {
        const target = stopRole(system, role.against);
        out.push({
          name: varName(scale.name, role.id),
          value: defaultResolver(scale.hexes[target.lightIndex]),
        });
        continue;
      }
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
      // 대비 역할은 자기가 참조하는 stop 역할이 테마 간 고정일 때만 존재한다
      // (지금은 on-solid × solid 하나뿐). 다크에 다시 쓸 것이 없다.
      if (role.kind === "contrast") continue;
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
