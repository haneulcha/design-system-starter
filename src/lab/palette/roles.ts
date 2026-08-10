// src/lab/palette/roles.ts
//
// 역할 레이어 — 세 종류 스케일(액센트·뉴트럴·시맨틱) 공통.
// 다크 색을 새로 만들지 않고, 완성된 11-stop 안에서 역할만 재배치한다.
// 규칙: 인덱스 미러(i → 10−i), 단 솔리드(앵커)만 예외로 자리 고정 —
// 제품 뉴트럴의 DARK_NEUTRAL_INVERSION과 같은 미러 원리.
// 스펙: docs/superpowers/specs/2026-08-09-palette-generator-color-system-design.md

import { SEMANTIC_ANCHORS, type SemanticId } from "./semantic.js";

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
    note: "솔리드 자리는 테마를 가로질러 값을 유지 — Radix도 다크에서 solid(step 9) 자리를 거의 그대로 둔다. 위에 얹는 텍스트 대비도 테마와 무관하게 동일하다.",
  },
  {
    id: "text",
    label: "텍스트 (링크)",
    lightIndex: 6,
    darkIndex: 4,
    note: "Tailwind의 text-*-600 ↔ dark:text-*-400 패턴과 같은 원리 — 어두운 배경에선 밝은 쪽이 읽힌다.",
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

export interface ScaleDescriptor {
  readonly name: ScaleName;
  /** 산출물과 화면에서 사람에게 보이는 이름. UI 문구는 엔진에 둔다. */
  readonly label: string;
}

/** 산출물에서의 스케일 순서와 표시 이름.
 *  ScaleSet.semantic은 Record라 키 순서에 기대면 출력이 불안정하다 —
 *  순서를 데이터로 고정한다. 시맨틱 라벨은 SEMANTIC_ANCHORS의 것을 그대로 쓴다. */
export const SCALE_ORDER: readonly ScaleDescriptor[] = [
  { name: "accent", label: "액센트" },
  { name: "neutral", label: "뉴트럴" },
  ...SEMANTIC_ANCHORS.map((a) => ({ name: a.id, label: a.label })),
];

/** scaleHasAnchor의 allowlist. */
const ANCHORED_SCALES: readonly ScaleName[] = ["accent", "error", "success", "warning", "info"];

/** 이 스케일 종류가 실제 앵커(사용자 pin 또는 고정 레퍼런스 값)를 갖는가.
 *  액센트는 사용자가 고른 anchor pin, 시맨틱은 SEMANTIC_ANCHORS의 고정값 —
 *  둘 다 index 5가 "정해진 자리"다. 뉴트럴만 앵커가 없다: buildNeutral의 500은
 *  틴트 강도·hue로부터 계산된 대표값일 뿐, pin으로 확정된 적이 없다.
 *  렌더 쪽(RoleChip 등)이 role id로 "이게 solid니까 앵커겠지"라고 되짚지 않고
 *  이 함수로 판별하게 한다 — 판단은 엔진에, web/은 렌더만 한다는 FP 원칙.
 *  allowlist로 쓴다(`!== "neutral"` 같은 부정형 대신) — 나중에 ScaleName이
 *  늘어나면 그 새 스케일 종류는 기본값으로 "앵커 없음" 취급되어야 안전하다. */
export function scaleHasAnchor(name: ScaleName): boolean {
  return ANCHORED_SCALES.includes(name);
}

export interface ScaleSet {
  readonly accent: readonly string[];
  readonly neutral: readonly string[];
  readonly semantic: Readonly<Record<SemanticId, readonly string[]>>;
}
