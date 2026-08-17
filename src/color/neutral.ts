// src/color/neutral.ts
//
// 뉴트럴 스케일 파생. 액센트와 달리 자체 L 곡선을 쓰고, hue는 액센트에서
// 이산 어트랙터로 스냅한다 (neutral.h = accent.h는 웜에서 갈색으로 붕괴).
// 스펙: docs/superpowers/specs/2026-08-09-palette-generator-color-system-design.md
//
// 상수 출처: scripts/analysis/neutral-curve-stats.ts (tailwind v4.3.3, 2026-08-09).
// 레퍼런스 갱신 시 다시 돌려 비교할 것.

import { SCALE_SIZE, clampToGamut } from "./scale.js";
import type { Candidate } from "./candidates.js";
import type { Oklch } from "../schema/types.js";

/** stop 50..950의 평균 L. tailwind 뉴트럴 5종(slate·gray·zinc·neutral·stone)
 *  의 sd가 0.001~0.008 — 다섯 램프가 같은 사다리를 쓴다. 즉 취향 축이 아니다. */
export const NEUTRAL_CURVE: readonly { l: number }[] = [
  { l: 0.9848 }, { l: 0.9684 }, { l: 0.9244 }, { l: 0.8702 },
  { l: 0.7066 }, { l: 0.5532 }, { l: 0.4434 }, { l: 0.372 },
  { l: 0.2736 }, { l: 0.2098 }, { l: 0.1384 },
];

/** C_max로 정규화한 채도 모양 — 틴트가 옅은 램프(zinc·stone). */
export const C_SHAPE_SOFT: readonly number[] = [
  0.038, 0.068, 0.233, 0.369, 0.826, 0.971, 0.923, 0.767, 0.446, 0.407, 0.301,
];

/** 같은 모양 — 틴트가 진한 램프(slate·gray). 어두운 쪽에서 채도를 유지한다. */
export const C_SHAPE_STRONG: readonly number[] = [
  0.062, 0.12, 0.23, 0.386, 0.758, 0.897, 0.909, 0.978, 0.931, 0.957, 0.868,
];

/** 두 모양 테이블의 기준 C_max (해당 램프들의 평균). */
export const SOFT_REF_CMAX = 0.015;
export const STRONG_REF_CMAX = 0.04;

/** 채도 모양은 독립 축이 아니라 틴트 강도의 종속 변수다 —
 *  진한 램프일수록 어두운 쪽까지 채도를 끌고 간다(C_max와 상관).
 *  두 기준 테이블 사이를 강도로 보간하고, 범위 밖은 외삽 없이 클램프. */
export function cShape(index: number, strength: number): number {
  const t = Math.min(
    1,
    Math.max(0, (strength - SOFT_REF_CMAX) / (STRONG_REF_CMAX - SOFT_REF_CMAX)),
  );
  return C_SHAPE_SOFT[index] + (C_SHAPE_STRONG[index] - C_SHAPE_SOFT[index]) * t;
}

export interface TintAttractor {
  readonly id: "achromatic" | "cool" | "purple" | "green" | "warm";
  readonly label: string;
  /** null = 무채색 (hue 없음 — 스냅 대상이 아니다). */
  readonly hue: number | null;
  readonly note: string;
}

/** hue 값은 tailwind 5종 + radix 6종 실측의 종합.
 *  cool: tw slate 257.4 / gray 259.7 · purple: tw zinc 285.8, radix mauve 292.9 / slate 277.7
 *  green: radix sage 167.6 / olive 136.6 · warm: tw stone 58.1, radix sand 106.7 */
export const TINT_ATTRACTORS: readonly TintAttractor[] = [
  {
    id: "achromatic",
    label: "무채색",
    hue: null,
    note: "순수 회색. tailwind neutral·radix gray가 여기 — 브랜드 기운을 배경에 전혀 섞지 않는 선택.",
  },
  {
    id: "cool",
    label: "쿨 그레이",
    hue: 258,
    note: "파랑 쪽으로 살짝 기운 회색. tailwind slate(257°)·gray(260°)가 쓰는 자리 — 가장 흔한 틴트.",
  },
  {
    id: "purple",
    label: "퍼플 그레이",
    hue: 286,
    note: "보라 쪽 회색. tailwind zinc(286°)·radix mauve(293°) — 보라·남색 브랜드와 어울린다.",
  },
  {
    id: "green",
    label: "그린 그레이",
    hue: 150,
    note: "초록 쪽 회색. radix sage(168°)·olive(137°) — 초록·청록 브랜드의 배경.",
  },
  {
    id: "warm",
    label: "웜 그레이",
    hue: 85,
    note: "따뜻한 회색. 주황 브랜드라도 hue를 그대로 쓰면 갈색이 되므로 노랑·올리브 쪽으로 크게 민다 — tailwind stone(58°)·radix sand(107°)가 그렇게 한다.",
  },
];

const CHROMATIC = TINT_ATTRACTORS.filter(
  (a): a is TintAttractor & { hue: number } => a.hue !== null,
);

/** 원형 최단거리 (0..180) */
function hueDistance(a: number, b: number): number {
  return Math.abs(((a - b + 540) % 360) - 180);
}

/** 액센트 hue → 최근접 유채색 어트랙터.
 *  무채색은 hue가 없어 거리 계산 대상이 아니다 — 사용자가 후보에서 직접 고른다. */
export function snapTint(accentHue: number): TintAttractor {
  const h = ((accentHue % 360) + 360) % 360;
  let best = CHROMATIC[0];
  for (const a of CHROMATIC) {
    if (hueDistance(h, a.hue) < hueDistance(h, best.hue)) best = a;
  }
  return best;
}

/** 확정된 틴트가 어느 어트랙터에서 왔는지 — UI가 hue로 되짚지 않게 엔진이 알려준다.
 *  neutralCandidates가 만든 tint만 들어온다는 계약 — hue는 항상 TINT_ATTRACTORS
 *  중 하나와 정확히 일치한다 (snapTint가 그 값을 그대로 실어 보내므로). */
export function tintAttractor(tint: NeutralTint): TintAttractor {
  const found = TINT_ATTRACTORS.find((a) => a.hue === tint.hue);
  if (!found) {
    throw new Error(
      `tintAttractor: no attractor matches hue ${tint.hue} (engine contract violation)`,
    );
  }
  return found;
}

export interface NeutralTint {
  /** null = 무채색. */
  readonly hue: number | null;
  /** 스케일 최대 채도 (실측 범위 0.010–0.046). */
  readonly strength: number;
}

/** 후보로 쓰는 두 강도. 실측 범위 안에서 "은은/뚜렷"을 대표한다. */
export const TINT_STRENGTHS = { soft: 0.017, strong: 0.04 } as const;

/** 확정된 틴트 → 11-stop 뉴트럴. L은 상수 곡선, C는 강도×모양, hue는 고정. */
export function buildNeutral(tint: NeutralTint): Oklch[] {
  if (!(tint.strength >= 0)) {
    throw new Error(`buildNeutral: strength must be >= 0, got ${tint.strength}`);
  }
  if (tint.hue === null || tint.strength === 0) {
    return NEUTRAL_CURVE.map((s) => ({ l: s.l, c: 0, h: 0 }));
  }
  const h = ((tint.hue % 360) + 360) % 360;
  return NEUTRAL_CURVE.map((s, i) =>
    clampToGamut({ l: s.l, c: tint.strength * cShape(i, tint.strength), h }),
  );
}

export interface NeutralCandidate extends Candidate {
  /** 이 후보를 고르면 확정될 틴트 — UI가 순서로 되짚지 않게 엔진이 들려 보낸다. */
  readonly tint: NeutralTint;
}

/** 대표색(스케일의 500 자리)으로 칩을 그린다 — 액센트 후보와 같은 형태.
 *  candidate가 실제로 들고 갈 tint를 그대로 받아 색을 뽑는다 — color와 tint가
 *  서로 다른 값에서 따로 만들어져 어긋날 수 없게. */
function representative(tint: NeutralTint): Oklch {
  return buildNeutral(tint)[5];
}

/** 후보 3개: 무채색 / 자동 틴트(스냅, 은은) / 뚜렷한 틴트(같은 hue, 진하게).
 *  스냅된 어트랙터 이름을 note에 노출해 "왜 이 hue인가"가 화면에서 읽히게 한다.
 *  각 후보는 자신을 만든 tint를 들고 다닌다 — UI가 라벨·순서로 tint를 되짚지 않게. */
export function neutralCandidates(accentHue: number): NeutralCandidate[] {
  const snapped = snapTint(accentHue);
  const achromatic: NeutralTint = { hue: null, strength: 0 };
  const soft: NeutralTint = { hue: snapped.hue, strength: TINT_STRENGTHS.soft };
  const strong: NeutralTint = { hue: snapped.hue, strength: TINT_STRENGTHS.strong };
  return [
    {
      color: representative(achromatic),
      label: "무채색",
      note: "브랜드 기운을 배경에 섞지 않는 선택 — tailwind neutral·radix gray의 자리. 콘텐츠가 주인공일 때.",
      tint: achromatic,
    },
    {
      color: representative(soft),
      label: `${snapped.label} (은은)`,
      note: `당신의 액센트에서 가장 가까운 "${snapped.label}" 자리로 붙였습니다 — ${snapped.note}`,
      tint: soft,
    },
    {
      color: representative(strong),
      label: `${snapped.label} (뚜렷)`,
      note: "같은 hue를 더 진하게. 어두운 쪽까지 색끼가 남아 배경 전체에 인격이 생긴다 — 그래도 액센트 채도의 1/5 수준.",
      tint: strong,
    },
  ];
}

// SCALE_SIZE 계약 확인 — 곡선 테이블이 스케일 길이와 어긋나면 즉시 터진다.
if (NEUTRAL_CURVE.length !== SCALE_SIZE) {
  throw new Error("neutral.ts: NEUTRAL_CURVE length must equal SCALE_SIZE");
}
