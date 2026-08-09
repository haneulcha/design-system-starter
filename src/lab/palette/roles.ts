// src/lab/palette/roles.ts
//
// 역할 레이어 — 세 종류 스케일(액센트·뉴트럴·시맨틱) 공통.
// 다크 색을 새로 만들지 않고, 완성된 11-stop 안에서 역할만 재배치한다.
// 규칙: 인덱스 미러(i → 10−i), 단 솔리드(앵커)만 예외로 자리 고정 —
// 제품 뉴트럴의 DARK_NEUTRAL_INVERSION과 같은 미러 원리.
// 스펙: docs/superpowers/specs/2026-08-09-palette-generator-color-system-design.md

import { SCALE_SIZE, STOP_KEYS } from "./builder.js";
import type { SemanticId } from "./semantic.js";

export interface ScaleRole {
  readonly id:
    | "subtle-bg"
    | "hover-bg"
    | "border"
    | "solid"
    | "text"
    | "text-strong";
  readonly label: string;
  /** 라이트 테마에서 이 역할이 쓰는 stop 인덱스 (0..10). */
  readonly lightIndex: number;
  /** 다크 테마 인덱스 — 미러 규칙: 10 − lightIndex, 솔리드만 5. */
  readonly darkIndex: number;
  /** 왜 이렇게 매핑되는가 — 교보재 설명. */
  readonly note: string;
}

export const SCALE_ROLES: readonly ScaleRole[] = [
  {
    id: "subtle-bg",
    label: "은은한 배경",
    lightIndex: 0,
    darkIndex: 10,
    note: "배지·알림의 바탕. 밝은 tint ↔ 어두운 tint 극성 반전 — Tailwind dark:bg-*-950 관례.",
  },
  {
    id: "hover-bg",
    label: "호버 배경",
    lightIndex: 1,
    darkIndex: 9,
    note: "배경보다 \"한 단계 더\" — 진해지는 방향이 다크에선 밝아지는 방향으로 뒤집힌다.",
  },
  {
    id: "border",
    label: "테두리",
    lightIndex: 2,
    darkIndex: 8,
    note: "핵심은 배경과의 거리 유지 — 절대 밝기가 아니라.",
  },
  {
    id: "solid",
    label: "솔리드 (버튼 배경)",
    lightIndex: 5,
    darkIndex: 5,
    note: "브랜드 색은 테마를 가로질러 보존 — Radix도 다크에서 accent step을 거의 유지한다. 흰 텍스트 대비도 그대로.",
  },
  {
    id: "text",
    label: "텍스트 (링크)",
    lightIndex: 6,
    darkIndex: 4,
    note: "Tailwind의 text-blue-600 ↔ dark:text-blue-400 패턴 — 검은 배경에선 밝은 쪽이 읽힌다.",
  },
  {
    id: "text-strong",
    label: "진한 텍스트",
    lightIndex: 7,
    darkIndex: 3,
    note: "텍스트보다 한 단계 더 — 미러 규칙(i → 10−i)의 자연 귀결.",
  },
];

export type ScaleName = "accent" | "neutral" | SemanticId;

export interface ScaleSet {
  readonly accent: readonly string[];
  readonly neutral: readonly string[];
  readonly semantic: Readonly<Record<SemanticId, readonly string[]>>;
}

/** 스케일 3종 → 2-레이어 CSS 커스텀 프로퍼티 스니펫.
 *  .dark에는 매핑이 실제로 바뀌는 역할만 — 재선언하지 않은 것 = 안 바뀐 것.
 *  세 종류가 같은 역할표·같은 미러 규칙을 쓴다: 다크 규칙이 시스템에 하나뿐이다. */
export function cssSnippet(scales: ScaleSet): string {
  const named: [ScaleName, readonly string[]][] = [
    ["accent", scales.accent],
    ["neutral", scales.neutral],
    ...(Object.entries(scales.semantic) as [SemanticId, readonly string[]][]),
  ];
  for (const [name, hexes] of named) {
    if (hexes.length !== SCALE_SIZE) {
      throw new Error(
        `cssSnippet: ${name} expected ${SCALE_SIZE} hexes, got ${hexes.length}`,
      );
    }
  }

  const lines: string[] = [":root {"];
  for (const [name, hexes] of named) {
    STOP_KEYS.forEach((key, i) => lines.push(`  --${name}-${key}: ${hexes[i]};`));
  }
  lines.push("");
  for (const [name] of named) {
    for (const role of SCALE_ROLES) {
      lines.push(`  --${name}-${role.id}: var(--${name}-${STOP_KEYS[role.lightIndex]});`);
    }
  }
  lines.push("}", "", ".dark {");
  for (const [name] of named) {
    for (const role of SCALE_ROLES) {
      if (role.darkIndex !== role.lightIndex) {
        lines.push(`  --${name}-${role.id}: var(--${name}-${STOP_KEYS[role.darkIndex]});`);
      }
    }
  }
  lines.push("}");
  return lines.join("\n") + "\n";
}
