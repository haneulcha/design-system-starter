// src/export/color/types.ts
//
// 색 산출물의 입력 계약. 이 파일은 아무것도 import하지 않는다 —
// 역할표도 stop 이름도 데이터로 받으므로 엔진(src/lab/palette/)과 어긋날 사본이
// 산출 코드 안에 존재할 수 없다.
// 스펙: docs/superpowers/specs/2026-08-10-palette-color-export-design.md

export interface StopRole {
  readonly kind: "stop";
  readonly id: string;
  readonly label: string;
  readonly lightIndex: number;
  readonly darkIndex: number;
}

/** 값이 stop 인덱스로 표현되지 않는 역할. 산출 시점에 스케일별로 계산된다.
 *  on-solid이 그렇다: 같은 팔레트 안에서도 뉴트럴은 흰 글자, 액센트는 검은 글자다
 *  (스펙 D5). 이 역할이 있어도 roles 배열은 평평하게 남는다. */
export interface ContrastRole {
  readonly kind: "contrast";
  readonly id: string;
  readonly label: string;
  /** 같은 스케일의 `kind: "stop"` 역할 id. 그 색과 대비되는 색을 고른다. */
  readonly against: string;
}

export type ExportRole = StopRole | ContrastRole;

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

  const roleIds = new Set<string>();
  const themeFixedStopIds = new Set(
    system.roles
      .filter((r): r is StopRole => r.kind === "stop" && r.lightIndex === r.darkIndex)
      .map((r) => r.id),
  );
  const stopRoleIds = new Set(
    system.roles.filter((r): r is StopRole => r.kind === "stop").map((r) => r.id),
  );
  for (const role of system.roles) {
    if (!CSS_IDENT.test(role.id)) {
      throw new Error(`assertColorSystem: role id "${role.id}" is not a CSS identifier`);
    }
    if (roleIds.has(role.id)) {
      throw new Error(`assertColorSystem: duplicate role id "${role.id}"`);
    }
    roleIds.add(role.id);

    if (role.kind === "contrast") {
      if (!stopRoleIds.has(role.against)) {
        throw new Error(
          `assertColorSystem: role "${role.id}" against "${role.against}" is not a stop role`,
        );
      }
      // darkRoleVars가 대비 역할을 통째로 건너뛰는 것은 "참조 대상이 테마 간 고정"이라는
      // 전제 위에 서 있다. against가 테마마다 자리를 옮기는 역할이면 다크에서 틀린 값이
      // 소리 없이 나간다.
      if (!themeFixedStopIds.has(role.against)) {
        throw new Error(
          `assertColorSystem: role "${role.id}" against "${role.against}" is not theme-fixed`,
        );
      }
      continue;
    }

    if (role.kind !== "stop") {
      // 판별자 없는 판별 유니온은 조용히 잘못된 분기를 탄다. 암묵적 기본값을 두지 않는다.
      throw new Error(
        `assertColorSystem: role "${(role as { id?: string }).id}" has no valid kind`,
      );
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
