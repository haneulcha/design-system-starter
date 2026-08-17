// src/lab/palette/guided.ts
//
// 가이드드 빌더(#builder)의 5-pick 학습 플로우. Refactoring UI가 권하는 선택
// 순서와 단계별 안내 카피다. 엔진(src/color/)이 아니라 여기 있는 이유:
// 이 순서는 학습 장치이지 스케일 생성의 제약이 아니다. /color-palette는
// 같은 엔진을 쓰면서 이 파일을 읽지 않는다.
// 스펙: docs/superpowers/specs/2026-07-27-guided-palette-builder-design.md

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
