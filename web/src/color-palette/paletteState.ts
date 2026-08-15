// 화면 상태와 그로부터의 유도. 유도는 전부 src/color/의 순수 함수에 위임하고
// 여기서는 조립만 한다 — 판단은 엔진에, web/은 렌더만.

import { fillScale, type Pin } from "@core/color/scale.js";
import {
  buildNeutral, snapTint, TINT_ATTRACTORS, TINT_STRENGTHS, type NeutralTint,
} from "@core/color/neutral.js";
import { SEMANTIC_ANCHORS, buildSemantic } from "@core/color/semantic.js";
import { SCALE_ROLES, type ScaleRole, type ScaleSet } from "@core/color/roles.js";
import { applyRoleShifts, type RoleOverride } from "@core/color/contrast.js";
import { oklchToHex, parsePrimary } from "@core/generator/color.js";

/** 사용자가 조정할 수 있는 stop. RUI의 5-pick 중 앵커를 뺀 넷이다. */
export const ADJUSTABLE_STOPS = [0, 3, 7, 10] as const;
export type AdjustableStop = (typeof ADJUSTABLE_STOPS)[number];

export const DEFAULT_ACCENT = "#3b82f6";

export interface PaletteState {
  readonly accentHex: string;
  /** 조정한 stop의 hex. undefined = 곡선이 정한 기본값 그대로. */
  readonly pins: Readonly<Record<AdjustableStop, string | undefined>>;
  /** null = 액센트에서 자동 스냅. */
  readonly tint: { readonly attractorId: string; readonly strength: "soft" | "strong" } | null;
  /** 적용된 역할 이동. 제안(RoleShift)이 아니라 확정값(RoleOverride)을 담는다. */
  readonly shifts: readonly RoleOverride[];
}

export function defaultState(accentHex = DEFAULT_ACCENT): PaletteState {
  return { accentHex, pins: { 0: undefined, 3: undefined, 7: undefined, 10: undefined }, tint: null, shifts: [] };
}

/** 액센트 교체. **조정한 pin을 전부 버린다** — fillScale이 고정점 사이를 hue까지
 *  보간하므로 파랑에서 고른 pin이 남으면 중간 구간이 파랑과 새 색이 섞인 색이 되고,
 *  그 pin은 어떤 후보와도 일치하지 않아 화면에서 "선택 없음"으로 보이면서 값은 계속
 *  적용된다. #builder의 redo()가 세운 원칙(앞 단계를 바꾸면 뒤 선택은 무효)을 계승한다.
 *
 *  틴트와 역할 이동은 유지한다: 틴트는 사용자가 명시적으로 고른 축이고(안 골랐으면
 *  애초에 null이라 새 액센트에서 다시 스냅된다), 역할 이동은 특정 색이 아니라
 *  "이 시스템은 텍스트를 몇 번째 자리에 둔다"는 시스템 전체의 진술이다. */
export function withAccent(state: PaletteState, accentHex: string): PaletteState {
  return {
    ...state,
    accentHex,
    pins: { 0: undefined, 3: undefined, 7: undefined, 10: undefined },
  };
}

function pinsOf(state: PaletteState): Pin[] {
  const anchor: Pin = { index: 5, color: parsePrimary(state.accentHex) };
  const rest = ADJUSTABLE_STOPS.flatMap((i) => {
    const hex = state.pins[i];
    return hex ? [{ index: i, color: parsePrimary(hex) }] : [];
  });
  return [anchor, ...rest];
}

/** 확정된 틴트. 사용자가 안 골랐으면 액센트 hue에서 스냅하고 강도는 은은. */
export function resolveTint(state: PaletteState): NeutralTint {
  if (!state.tint) {
    return { hue: snapTint(parsePrimary(state.accentHex).h).hue, strength: TINT_STRENGTHS.soft };
  }
  const attractor = TINT_ATTRACTORS.find((a) => a.id === state.tint!.attractorId);
  if (!attractor) {
    return { hue: snapTint(parsePrimary(state.accentHex).h).hue, strength: TINT_STRENGTHS.soft };
  }
  if (attractor.hue === null) return { hue: null, strength: 0 };
  return { hue: attractor.hue, strength: TINT_STRENGTHS[state.tint.strength] };
}

export function deriveScales(state: PaletteState): ScaleSet {
  return {
    accent: fillScale(pinsOf(state)).map(oklchToHex),
    neutral: buildNeutral(resolveTint(state)).map(oklchToHex),
    // Object.fromEntries는 결과를 항상 인덱스 시그니처로 반환해 SemanticId
    // 키 집합과 "충분히 겹치지 않는다"는 tsc 판정을 받는다 — unknown을 경유해
    // 명시적으로 캐스트한다(런타임 동작은 그대로다).
    semantic: Object.fromEntries(
      SEMANTIC_ANCHORS.map((a) => [a.id, buildSemantic(a).map(oklchToHex)]),
    ) as unknown as ScaleSet["semantic"],
  };
}

export function deriveRoles(state: PaletteState): ScaleRole[] {
  return applyRoleShifts(SCALE_ROLES, state.shifts);
}
