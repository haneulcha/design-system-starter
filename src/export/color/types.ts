// src/export/color/types.ts
//
// 색 산출물의 입력 계약. 이 파일은 아무것도 import하지 않는다 —
// 역할표도 stop 이름도 데이터로 받으므로 엔진(src/lab/palette/)과 어긋날 사본이
// 산출 코드 안에 존재할 수 없다.
// 스펙: docs/superpowers/specs/2026-08-10-palette-color-export-design.md

export interface ExportRole {
  /** CSS 변수·Figma 변수에 쓰는 식별자. 예: "solid", "subtle-bg". */
  readonly id: string;
  /** 사람이 읽는 이름. DESIGN.md 역할표에 쓴다. */
  readonly label: string;
  /** 라이트 테마에서 이 역할이 가리키는 stop 인덱스. */
  readonly lightIndex: number;
  /** 다크 테마 인덱스. lightIndex와 같으면 테마 간에 안 바뀌는 역할이다. */
  readonly darkIndex: number;
}

export interface ExportScale {
  /** CSS·Figma에서 쓰는 식별자. 예: "accent", "error". */
  readonly name: string;
  /** 사람이 읽는 이름. 예: "액센트". DESIGN.md 제목에 쓴다. */
  readonly label: string;
  /** stopKeys와 같은 길이, 같은 순서. */
  readonly hexes: readonly string[];
}

export interface ColorSystem {
  /** stop 이름. 길이가 모든 스케일의 길이를 정의한다. */
  readonly stopKeys: readonly string[];
  /** 출력 순서 그대로. 첫 항목이 파일·문서에서 먼저 나온다. */
  readonly scales: readonly ExportScale[];
  readonly roles: readonly ExportRole[];
}

/** CSS 커스텀 프로퍼티 이름의 일부로 안전한가. */
const CSS_IDENT = /^[a-z][a-z0-9-]*$/;

/** 계약 위반 가드. 사용자 입력에서 도달할 수 없다 — UI가 미완성 상태를 막는다.
 *  조용히 깨진 CSS를 내보내느니 즉시 터진다. */
export function assertColorSystem(system: ColorSystem): void {
  const n = system.stopKeys.length;
  if (n === 0) {
    throw new Error("assertColorSystem: stopKeys must not be empty");
  }

  const seen = new Set<string>();
  for (const scale of system.scales) {
    if (!CSS_IDENT.test(scale.name)) {
      throw new Error(
        `assertColorSystem: scale name "${scale.name}" is not a CSS identifier`,
      );
    }
    if (seen.has(scale.name)) {
      throw new Error(`assertColorSystem: duplicate scale name "${scale.name}"`);
    }
    seen.add(scale.name);
    if (scale.hexes.length !== n) {
      throw new Error(
        `assertColorSystem: scale "${scale.name}" has ${scale.hexes.length} hexes, expected ${n}`,
      );
    }
  }

  for (const role of system.roles) {
    if (!CSS_IDENT.test(role.id)) {
      throw new Error(`assertColorSystem: role id "${role.id}" is not a CSS identifier`);
    }
    const fields: readonly [string, number][] = [
      ["lightIndex", role.lightIndex],
      ["darkIndex", role.darkIndex],
    ];
    for (const [field, idx] of fields) {
      if (!Number.isInteger(idx) || idx < 0 || idx >= n) {
        throw new Error(
          `assertColorSystem: role "${role.id}" ${field} ${idx} is out of range 0..${n - 1}`,
        );
      }
    }
  }
}
