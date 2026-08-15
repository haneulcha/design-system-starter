// src/color/curve.ts
//
// 액센트·시맨틱 스케일이 공유하는 곡선 모양. stop 50..950 (11개, 앵커=인덱스 5).
// l = 평균 L, cMult = 평균 C_i/C_anchor.
//
// 출처: scripts/analysis/ours-curve-stats.ts (tailwind-v4.json 17종, 2026-07-26).
// 레퍼런스 갱신 시 재생성해 비교할 것.
//
// 이 파일이 src/lab/에서 나온 이유: 산출물의 모든 색이 이 표에서 파생된다.
// src/lab/palette/ours.ts(연구용 알고리즘 비교)는 이제 여기서 import한다.

export const OURS_CURVE: readonly { l: number; cMult: number }[] = [
  { l: 0.9772, cMult: 0.092 },
  { l: 0.9503, cMult: 0.221 },
  { l: 0.9052, cMult: 0.425 },
  { l: 0.8393, cMult: 0.689 },
  { l: 0.7533, cMult: 0.908 },
  { l: 0.6838, cMult: 1.0 },
  { l: 0.6014, cMult: 0.985 },
  { l: 0.518, cMult: 0.872 },
  { l: 0.4469, cMult: 0.732 },
  { l: 0.3948, cMult: 0.593 },
  { l: 0.2777, cMult: 0.42 },
];
