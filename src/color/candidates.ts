// src/color/candidates.ts
//
// stop별 취향 후보 생성. fillScale이 만든 기준 스케일 위에서 한 stop만 바꿔보는
// 3개 후보(대개 "차분/균형/쨍한" 축)를 낸다 — 교보재 note가 "왜 이 후보인가"를
// 설명한다.

import { clampToGamut, fillScale, type Pin } from "./scale.js";
import type { Oklch } from "../schema/types.js";

export interface Candidate {
  color: Oklch;
  label: string;
  note: string;
}

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
