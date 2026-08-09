// src/lab/palette/builder.ts
//
// 가이드드 팔레트 빌더 엔진 (순수 함수만, 렌더 없음).
// 스펙: docs/superpowers/specs/2026-07-27-guided-palette-builder-design.md
//
// 우리 곡선 v0(ours.ts)의 앵커 워프를 고정점 N개로 일반화: 사용자가 확정한
// stop(Pin)이 곡선의 고정점이 되고, 인접 고정점 사이는 OURS_CURVE의 모양
// (L 진행률·cMult 비율)을 유지한 채 보간한다. 고정점이 앵커 하나면 v0와 동치
// (단, 여기는 엔진이 gamut 클램프까지 책임진다 — v0는 표시 계층에서 클램프).
//
// 실험 코드 — 제품 파이프라인에서 import 금지 (웹 #builder 라우트 전용).

import { converter } from "culori";
import type { Oklch } from "../../schema/types.js";
import { OURS_CURVE } from "./ours.js";

export interface Pin {
  /** 0..10 = stop 50..950 */
  index: number;
  color: Oklch;
}

export const SCALE_SIZE = 11;

export const STOP_KEYS = [
  "50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950",
] as const;

const toRgb = converter("rgb");

function displayable({ l, c, h }: Oklch): boolean {
  const rgb = toRgb({ mode: "oklch", l, c, h });
  if (!rgb) return false;
  const eps = 1e-4;
  const ok = (v: number | undefined) =>
    typeof v === "number" && v >= -eps && v <= 1 + eps;
  return ok(rgb.r) && ok(rgb.g) && ok(rgb.b);
}

/** sRGB 밖이면 그 밝기·hue에서 표현 가능한 최대 채도로 잘라 반환 (이진 탐색 20회).
 *  web/src/lib/oklch.ts clampChromaToGamut와 같은 수학 — 엔진은 web을 import할
 *  수 없어(방향 역전) src 쪽에 별도로 둔다. */
export function clampToGamut(color: Oklch): Oklch {
  if (displayable(color)) return color;
  let lo = 0;
  let hi = color.c;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (displayable({ ...color, c: mid })) lo = mid;
    else hi = mid;
  }
  return { ...color, c: lo };
}

/** 원형 최단거리 hue 보간 */
function hueLerp(a: number, b: number, t: number): number {
  const d = ((b - a + 540) % 360) - 180;
  return (a + d * t + 360) % 360;
}

/** 고정점 사이를 OURS_CURVE 모양으로 채운 11-stop 스케일.
 *  - 앵커 pin(index 5) 필수. pin 색은 in-gamut 가정 (UI가 보장) → verbatim 보존.
 *  - 실제 pin이 없는 양 끝은 곡선 끝 L + 최근접 pin에 비례한 채도의 가상 고정점.
 *  - 보간 stop과 가상 끝점은 gamut 클램프 후 반환.
 *  - v0 동치: pins=[{index: 5, color: anchor}] 일 때, 앵커 L ∈ [0.32, 0.93]이면
 *    oursAlgorithm.derive(hex, nativeSpec) + clampToGamut[]와 동일. 범위 밖에서는
 *    fillScale이 true anchor L을 사용해 단조성 보존 (v0의 clamp는 문서화된 한계). */
export function fillScale(
  pins: readonly Pin[],
  /** stop별 Δh (11개). 클램프 직전에 적용된다 — 시맨틱 스케일용. */
  hueRamp?: readonly number[],
): Oklch[] {
  if (!pins.some((p) => p.index === 5)) {
    throw new Error("fillScale: anchor pin (index 5) is required");
  }
  const ramped = (c: Oklch, i: number): Oklch =>
    hueRamp ? { ...c, h: (((c.h + hueRamp[i]) % 360) + 360) % 360 } : c;
  const sorted = [...pins].sort((a, b) => a.index - b.index);
  const eff: { index: number; color: Oklch; virtual: boolean }[] = sorted.map(
    (p) => ({ ...p, virtual: false }),
  );
  // eps-guard: anchor.l이 곡선 범위 [0.2777, 0.9772] 밖이면 같은 쪽 stop들이
  // anchor.l에 붕괴 (headroom 없음 — v1 spec에서 근-white/근-black 앵커 범위 밖).
  const eps = 1e-7;
  const first = sorted[0];
  if (first.index !== 0) {
    // 가상 끝점 L(밝은 쪽): OURS_CURVE[0] 또는 (anchor.l + eps) 중 더 밝은 쪽 사용.
    // anchor.l > 0.9772이면 eps-guard 발동: candidate = anchor.l + eps,
    // 그러면 stop 0..4가 anchor 근처로 붕괴 (선택지 부족).
    const candidate = Math.max(OURS_CURVE[0].l, first.color.l + eps);
    eff.unshift({
      index: 0,
      virtual: true,
      color: {
        l: candidate,
        c: first.color.c * (OURS_CURVE[0].cMult / OURS_CURVE[first.index].cMult),
        h: first.color.h,
      },
    });
  }
  const last = sorted[sorted.length - 1];
  if (last.index !== SCALE_SIZE - 1) {
    // 가상 끝점 L(어두운 쪽): OURS_CURVE[10] 또는 (anchor.l - eps) 중 더 어두운 쪽 사용.
    // anchor.l < 0.2777이면 eps-guard 발동: candidate = anchor.l - eps,
    // 그러면 stop 6..10이 anchor 근처로 붕괴 (선택지 부족).
    const candidate = Math.min(OURS_CURVE[SCALE_SIZE - 1].l, last.color.l - eps);
    eff.push({
      index: SCALE_SIZE - 1,
      virtual: true,
      color: {
        l: candidate,
        c: last.color.c * (OURS_CURVE[SCALE_SIZE - 1].cMult / OURS_CURVE[last.index].cMult),
        h: last.color.h,
      },
    });
  }

  const out: Oklch[] = new Array(SCALE_SIZE);
  for (const p of eff) {
    out[p.index] = p.virtual ? clampToGamut(ramped(p.color, p.index)) : { ...p.color };
  }
  for (let s = 0; s < eff.length - 1; s++) {
    const a = eff[s];
    const b = eff[s + 1];
    const li = OURS_CURVE[a.index].l;
    const lj = OURS_CURVE[b.index].l;
    const ra = a.color.c / OURS_CURVE[a.index].cMult;
    const rb = b.color.c / OURS_CURVE[b.index].cMult;
    for (let k = a.index + 1; k < b.index; k++) {
      const t = (li - OURS_CURVE[k].l) / (li - lj);
      out[k] = clampToGamut(
        ramped(
          {
            l: a.color.l - t * (a.color.l - b.color.l),
            c: OURS_CURVE[k].cMult * (ra + (rb - ra) * t),
            h: hueLerp(a.color.h, b.color.h, t),
          },
          k,
        ),
      );
    }
  }
  return out;
}

export interface Candidate {
  color: Oklch;
  label: string;
  note: string;
}

/** RUI 선택 순서: 500 → 50 → 950 → 300 → 700 */
export const BUILDER_STEPS = [5, 0, 10, 3, 7] as const;

/** 빌더 단계. stop 인덱스 배열로는 뉴트럴 단계를 표현할 수 없어 판별 유니온을 쓴다. */
export type BuilderStep =
  | { readonly kind: "accent-anchor" }
  | { readonly kind: "accent-stop"; readonly stopIndex: number }
  | { readonly kind: "neutral-tint" };

/** RUI 순서(500 → 50 → 950 → 300 → 700) 뒤에 뉴트럴 틴트 한 단계. */
export const BUILDER_FLOW: readonly BuilderStep[] = [
  { kind: "accent-anchor" },
  { kind: "accent-stop", stopIndex: 0 },
  { kind: "accent-stop", stopIndex: 10 },
  { kind: "accent-stop", stopIndex: 3 },
  { kind: "accent-stop", stopIndex: 7 },
  { kind: "neutral-tint" },
];

/** 단계별 안내 카피 (교보재) — 렌더는 web/BuilderPage가 담당 */
export const STEP_META: Record<number | "neutral", { title: string; description: string }> = {
  5: {
    title: "액센트 (500)",
    description:
      "팔레트의 기준이 되는 브랜드 컬러. 나머지 10개 stop이 전부 이 색에서 파생된다 — Refactoring UI가 '가장 먼저 정하라'고 권하는 그 색.",
  },
  0: {
    title: "가장 밝은 색 (50)",
    description:
      "배경으로 깔 수 있는 가장 옅은 색. 여기서 브랜드 기운(색끼)을 얼마나 남길지가 첫 취향 갈림길이다.",
  },
  10: {
    title: "가장 어두운 색 (950)",
    description:
      "스케일의 바닥. 얼마나 깊이 누를지, 웜톤이라면 hue를 틀어 탁함을 피할지를 정한다.",
  },
  3: {
    title: "중간 밝음 (300)",
    description:
      "호버 배경·강조 태그가 사는 구간. 밝은 쪽 절반의 채도 성격이 여기서 정해진다.",
  },
  7: {
    title: "중간 어두움 (700)",
    description:
      "본문 위 텍스트·진한 버튼이 사는 구간. 채도가 높으면 화려하지만 오래 보면 피로하다.",
  },
  neutral: {
    title: "배경 회색 (뉴트럴)",
    description:
      "화면 면적의 대부분을 차지하는 회색. 액센트 hue를 그대로 쓰지 않고 그레이가 자연스러운 몇 자리 중 가장 가까운 곳으로 붙인다 — 주황을 그대로 쓰면 갈색이 되기 때문이다.",
  },
};

const WARM_HUE_MIN = 30;
const WARM_HUE_MAX = 110;

/** 중간 stop 채도 변주 공통 라벨 (300·700) */
const MID_LABELS: readonly [string, string, string] = ["차분한", "균형", "쨍한"];

const colorKey = (o: Oklch) =>
  `${o.l.toFixed(3)}/${o.c.toFixed(3)}/${(((o.h % 360) + 360) % 360).toFixed(1)}`;

/** stopIndex 자리의 후보 3개. 색은 전부 gamut 클램프 후 반환.
 *  클램프로 후보가 겹치면 숨기지 않고 note에 표시한다 — "이 앵커에서는 이 축의
 *  선택지가 좁다"는 것 자체가 교보재 정보. */
export function candidatesFor(
  stopIndex: number,
  pins: readonly Pin[],
): Candidate[] {
  const anchor = pins.find((p) => p.index === 5);
  if (!anchor) throw new Error("candidatesFor: anchor pin (index 5) is required");
  const base = fillScale(pins);
  const ref = base[stopIndex];
  const ac = anchor.color.c;
  const ah = anchor.color.h;

  let list: Candidate[];
  switch (stopIndex) {
    case 0:
      list = [
        {
          color: { l: ref.l, c: ac * 0.05, h: ref.h },
          label: "중립적",
          note: "브랜드 기운을 거의 뺀, 회백에 가까운 배경 — 콘텐츠가 주인공일 때",
        },
        {
          color: { l: ref.l, c: ac * 0.092, h: ref.h },
          label: "균형",
          note: "tailwind 손튜닝 평균값 — 배경인 걸 알지만 브랜드 기운이 은은히 비친다",
        },
        {
          color: { l: ref.l, c: ac * 0.18, h: ref.h },
          label: "색이 드러나는",
          note: "배경부터 브랜드를 말하는 선택 — 마케팅 페이지의 톤",
        },
      ];
      break;
    case 10: {
      const warm = ah >= WARM_HUE_MIN && ah <= WARM_HUE_MAX;
      // 어두운 앵커에서 950 후보가 앵커보다 밝아져 스케일이 역전되는 것 방지 — 최종 리뷰 발견
      const capL = (l: number) => Math.min(l, anchor.color.l - 0.01);
      list = [
        {
          color: { l: capL(0.278), c: ref.c, h: ah },
          label: "기본",
          note: "tailwind 950 평균 깊이 — 무난하게 깊은 바닥",
        },
        {
          color: { l: capL(0.22), c: ref.c, h: ah },
          label: "더 깊게",
          note: "거의 검정에 가까운 바닥 — 대비가 최대, 무게감 있는 인상",
        },
        warm
          ? {
              color: { l: capL(0.278), c: ref.c, h: ah - 25 },
              label: "골드로 틀기",
              note: "어두운 노랑·주황은 hue를 틀지 않으면 올리브(탁색)가 된다 — tailwind의 웜톤 손튜닝 기법",
            }
          : {
              color: { l: capL(0.32), c: ref.c, h: ah },
              label: "얕게",
              note: "바닥을 덜 눌러 부드러운 인상 — 대신 어두운 쪽 대비 폭은 줄어든다",
            },
      ];
      break;
    }
    case 3:
      list = [0.55, 0.689, 0.83].map((m, i) => ({
        color: { l: ref.l, c: ac * m, h: ref.h },
        label: MID_LABELS[i],
        note:
          i === 1
            ? "tailwind 평균 곡선값 — 표준적인 선택"
            : i === 0
              ? "밝은 쪽 절반을 차분하게 — 배경·태그가 점잖아진다"
              : "밝은 쪽 절반을 화사하게 — 호버·강조가 또렷해진다",
      }));
      break;
    case 7:
      list = [0.75, 0.872, 0.97].map((m, i) => ({
        color: { l: ref.l, c: ac * m, h: ref.h },
        label: MID_LABELS[i],
        note:
          i === 1
            ? "tailwind 평균 곡선값 — 표준적인 선택"
            : i === 0
              ? "텍스트·진한 버튼을 차분하게 — 오래 봐도 피로가 적다"
              : "어두운 쪽을 선명하게 — 강조는 세지만 텍스트로는 피로할 수 있다",
      }));
      break;
    default:
      throw new Error(`candidatesFor: unsupported stop index ${stopIndex}`);
  }

  const clamped = list.map((cd) => ({ ...cd, color: clampToGamut(cd.color) }));
  const seen = new Map<string, number>();
  for (const cd of clamped) {
    seen.set(colorKey(cd.color), (seen.get(colorKey(cd.color)) ?? 0) + 1);
  }
  return clamped.map((cd) =>
    (seen.get(colorKey(cd.color)) ?? 0) > 1
      ? { ...cd, note: `${cd.note} · 이 앵커에서는 클램프로 후보 폭이 좁아 다른 후보와 겹칩니다` }
      : cd,
  );
}
