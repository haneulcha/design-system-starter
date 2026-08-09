// src/lab/palette/semantic.ts
//
// 시맨틱(상태색) 스케일 파생. 액센트와 달리 사용자 입력이 없다 —
// 빨강=위험/초록=성공은 문화적으로 고정된 자리이고, 코퍼스가 관측한 밴드 폭도
// 좁다(blue 8°). 곡선은 OURS_CURVE를 그대로 재사용한다: tailwind red/green/blue가
// 그 곡선에서 벗어나는 정도가 mean|ΔL| 0.018~0.029뿐이다.
// 스펙: docs/superpowers/specs/2026-08-09-palette-generator-color-system-design.md
//
// 앵커·hueRamp 출처: tailwind v4.3.3의 red/green/amber/blue 실측 (2026-08-09).
// 규칙을 발명하지 않고 레퍼런스 실측을 그대로 싣는다.

import { SCALE_SIZE, fillScale } from "./builder.js";
import type { Oklch } from "../../schema/types.js";

export type SemanticId = "error" | "success" | "warning" | "info";

export interface SemanticAnchor {
  readonly id: SemanticId;
  readonly label: string;
  /** tailwind 500 실측 — 코퍼스 관측 밴드 안에 든다. */
  readonly anchor: Oklch;
  /** stop별 Δh (앵커 기준, 11개). 규칙이 아니라 레퍼런스 실측. */
  readonly hueRamp: readonly number[];
  readonly note: string;
}

export const SEMANTIC_ANCHORS: readonly SemanticAnchor[] = [
  {
    id: "error",
    label: "오류 (빨강)",
    anchor: { l: 0.637, c: 0.237, h: 25.3 },
    hueRamp: [-8.0, -7.6, -7.0, -5.8, -3.1, 0, 2.0, 2.2, 1.6, 0.4, 0.7],
    note: "검증 실패·파괴적 동작. 코퍼스 58종의 빨강이 11~34°에 모여 있다 — 브랜드가 무엇이든 이 자리를 지킨다.",
  },
  {
    id: "warning",
    label: "경고 (앰버)",
    anchor: { l: 0.769, c: 0.188, h: 70.1 },
    hueRamp: [25.2, 25.5, 25.7, 21.5, 14.3, 0, -11.8, -21.1, -23.9, -24.2, -24.4],
    note: "주의 환기. 웜톤이라 밝은 쪽은 노랑(+25°), 어두운 쪽은 주황(−24°)으로 튼다 — 안 틀면 어두운 노랑이 올리브(탁색)가 된다.",
  },
  {
    id: "success",
    label: "성공 (초록)",
    anchor: { l: 0.723, c: 0.219, h: 149.6 },
    hueRamp: [6.2, 7.2, 6.4, 4.9, 2.1, 0, -0.4, 0.5, 1.7, 3.0, 3.4],
    note: "확인·완료. 순수 초록(120°)보다 청록 쪽인 150° 근처가 코퍼스의 합의점이다.",
  },
  {
    id: "info",
    label: "정보 (파랑)",
    anchor: { l: 0.623, c: 0.214, h: 259.8 },
    hueRamp: [-5.2, -4.2, -5.7, -8.0, -5.2, 0, 3.1, 4.6, 5.8, 5.7, 8.1],
    note: "안내. 코퍼스에서 밴드 폭이 8°로 가장 좁다 — \"파랑\"에 대한 합의가 가장 강하다. 파랑 브랜드와 겹치는 건 감수한다.",
  },
];

const ANCHOR_INDEX = 5;

/** 앵커 + 실측 hue 램프 → 11-stop.
 *  L·C 워프는 fillScale이 이미 하는 일이다 (앵커 하나짜리 고정점 = 우리 곡선 v0와
 *  동치, 양 끝은 곡선 자체 값에 고정되고 구간별 아핀 리매핑이 단조를 보장한다).
 *  hue 램프는 fillScale에 넘겨 **클램프 이전에** 적용시킨다 — 순서가 계약이다
 *  (Step 0 참조). 워프를 다시 구현하지 않는다. */
export function buildSemantic(anchor: SemanticAnchor): Oklch[] {
  return fillScale([{ index: ANCHOR_INDEX, color: anchor.anchor }], anchor.hueRamp);
}

// 램프 길이 계약 — 스케일 길이와 어긋나면 즉시 터진다.
for (const a of SEMANTIC_ANCHORS) {
  if (a.hueRamp.length !== SCALE_SIZE) {
    throw new Error(`semantic.ts: ${a.id} hueRamp must have ${SCALE_SIZE} entries`);
  }
}
