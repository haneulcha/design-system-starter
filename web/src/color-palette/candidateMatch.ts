// web/src/color-palette/candidateMatch.ts
//
// 후보 hex와 "지금 적용 중인" hex의 근사 일치 판정. 정확 비교(===)로는 안 된다 —
// stop 950(웜톤)의 "기본" 후보는 곡선 기본값(ref)을 그대로 쓰지 않고 고정 L(0.278)
// 에서 색을 다시 만든다(candidatesFor의 case 10 참조). 그 왕복 계산이 실측 24조합
// (액센트 6종 × stop 4자리) 중 2건(`#f97316`, `#f5d90a`의 stop 950)에서 hex 마지막
// 자리를 1 어긋나게 만든다 — 정확 비교면 그 두 조합에서 체크가 계속 0개로 남는다.

/** 채널당 허용 오차. 왕복 오차(실측 최대 1)보다 크고, 인접 후보 간 거리(실측
 *  최소 15 이상, 채널 최대 차 기준)보다 훨씬 작다 — 이 창 안에 다른 후보가
 *  들어올 수 없다. */
const TOLERANCE = 2;

function hexToRgb(hex: string): readonly [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

/** 후보 hex가 현재 색과 "같다"고 볼 수 있는지 — 채널당 TOLERANCE 이내면 동일 취급. */
export function isCurrent(candidateHex: string, currentHex: string): boolean {
  const [r1, g1, b1] = hexToRgb(candidateHex);
  const [r2, g2, b2] = hexToRgb(currentHex);
  return (
    Math.abs(r1 - r2) <= TOLERANCE &&
    Math.abs(g1 - g2) <= TOLERANCE &&
    Math.abs(b1 - b2) <= TOLERANCE
  );
}
