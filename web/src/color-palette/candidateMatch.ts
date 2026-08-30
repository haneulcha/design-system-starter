// web/src/color-palette/candidateMatch.ts
//
// 후보 hex와 "지금 적용 중인" hex를 잇는 순수 함수.
//
// 첫 구현은 채널당 고정 허용치(TOLERANCE)로 "충분히 같다"를 판정했는데, 이게
// 틀렸다 — 실측(6 액센트 × stop [0,3,7,10], candidatesFor를 직접 호출, 체비셰프
// 거리)해 보면 인접 후보 간 채널 거리가 stop마다 널을 뛴다: 파랑·보라 stop 50은
// **1**, 주황 stop 50은 2, 초록 stop 50은 3, 노랑 stop 950은 10 — 그리고
// 24조합 전체의 최솟값도 1이다. "15 이상"은 처음 브리프가 준 수치였는데
// 반증됐다: 어두운/중간 stop 일부에서만 참이고, 문제가 되는 stop 50 대다수에서
// 거짓이다. 고정 창은 stop 50 근처에서 서로 다른 두 후보를 동시에 "충분히
// 같다"로 잡는다 — 그 상태로 같은 name의 라디오 그룹에 둘 다 checked를 주면
// 네이티브 라디오가 서로를 밀어내며 클릭이 씹힌다(리뷰에서 실제 컴포넌트로
// 재현됨: 액센트 #de297b에서 stop 300 pin → stop 50 pin → stop 300 재열기).
//
// 그래서 "현재 선택"은 창(threshold) 판정이 아니라 **argmin**(pickCurrent)이다:
// target에 가장 가까운 후보 정확히 하나를 고른다. dedupeByHex가 이미 후보
// hex를 유일하게 만들어 두므로, 거리가 가장 작은 항목은 항상 하나뿐이고(동률은
// 배열 순서로 결정) "두 후보가 같은 창 안에 든다"는 실패 모드 자체가 없다.
// TOLERANCE·isCurrent는 낱개 비교(예: 왕복 오차를 흡수한 "같다" 판정)가 필요한
// 자리를 위해 남겨 둔다 — checked 판정에는 더 이상 쓰지 않는다.

function hexToRgb(hex: string): readonly [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

/** 두 hex 사이의 채널 거리 — 세 채널 중 가장 크게 벌어진 값(체비셰프 거리).
 *  순서 비교에만 쓴다 — 절대값 자체는 지각적 거리가 아니다. 합(맨해튼)이
 *  아니라 최댓값을 쓰는 이유: isCurrent의 TOLERANCE가 "채널마다 독립적으로
 *  이 안이면 같다"는 체비셰프 판정이라, argmin도 같은 기하를 써야 두 판정이
 *  같은 이야기를 한다. 아래 실측(6 액센트 × stop [0,3,7,10], candidatesFor
 *  직접 호출, 최인접 후보쌍 기준)도 이 metric으로 잰 값이다. */
function channelDistance(a: string, b: string): number {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return Math.max(Math.abs(r1 - r2), Math.abs(g1 - g2), Math.abs(b1 - b2));
}

/** 채널당 허용 오차. 왕복 오차(실측 최대 1)를 흡수한다 — 다만 이것만으로
 *  "유일성"을 보장하진 않는다(그 보장은 pickCurrent의 argmin이 진다). */
const TOLERANCE = 2;

/** 후보 hex가 현재 색과 "충분히 같다"고 볼 수 있는지 — 채널당 TOLERANCE 이내면
 *  동일 취급. 두 색을 독립적으로 비교하는 자리에서만 쓴다 — 후보 목록 전체에서
 *  "현재 선택 하나"를 뽑아야 하면 pickCurrent를 쓴다(이 함수를 반복 호출하면
 *  둘 이상이 동시에 참이 될 수 있다). */
export function isCurrent(candidateHex: string, currentHex: string): boolean {
  const [r1, g1, b1] = hexToRgb(candidateHex);
  const [r2, g2, b2] = hexToRgb(currentHex);
  return (
    Math.abs(r1 - r2) <= TOLERANCE &&
    Math.abs(g1 - g2) <= TOLERANCE &&
    Math.abs(b1 - b2) <= TOLERANCE
  );
}

/** target에 가장 가까운 후보 hex 하나(argmin). candidates가 비었으면 null.
 *  동률이면 배열에서 먼저 오는 쪽 — candidatesFor의 순서(중립적→균형→색이
 *  드러나는, 차분한→균형→쨍한)가 이미 의미 있는 순서라 임의로 안 섞는다.
 *  candidates의 hex가 서로 달라야(dedupeByHex 이후) "정확히 하나"가 보장된다 —
 *  중복 hex가 남아 있으면 그중 배열상 먼저 오는 것이 뽑힌다. */
export function pickCurrent(candidates: readonly string[], target: string): string | null {
  let best: string | null = null;
  let bestDistance = Infinity;
  for (const hex of candidates) {
    const distance = channelDistance(hex, target);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = hex;
    }
  }
  return best;
}

/** 팝오버가 열릴 때 "지금 적용 중"으로 표시할 후보 하나. pin이 있으면 pin,
 *  없으면 곡선 기본값을 target으로 삼아 argmin으로 후보 중 하나를 고른다.
 *  로직을 렌더 밖으로 뺀 이유: 이 판정(어떤 값을 target으로 볼지 + argmin)이
 *  이 화면에서 가장 미묘한 부분이라 컴포넌트 본문보다 단위 테스트가 직접
 *  닿는 자리에 있어야 한다. */
export function resolveCurrent(
  candidateHexes: readonly string[],
  current: string | undefined,
  curveDefaultHex: string,
): string | null {
  return pickCurrent(candidateHexes, current ?? curveDefaultHex);
}
