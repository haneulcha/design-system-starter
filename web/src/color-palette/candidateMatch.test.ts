import { describe, expect, it } from "vitest";
import { isCurrent, pickCurrent, resolveCurrent } from "./candidateMatch";

describe("isCurrent (스펙 D7-1)", () => {
  it("같은 색은 참이다", () => {
    expect(isCurrent("#2f2900", "#2f2900")).toBe(true);
  });

  it("왕복 오차(채널당 1)를 견딘다", () => {
    // 웜톤 stop 950의 "기본" 후보는 ref를 그대로 쓰지 않고 고정 L(0.278)에서
    // 색을 다시 만들어, 곡선 기본값과 hex 마지막 자리가 1 어긋난다
    // (#2f2800 vs #2f2900 — 실측 24조합 중 2건). 정확 비교로 구현하면
    // 이 둘에서 체크 0개가 그대로 남아 고치려던 버그가 살아남는다.
    expect(isCurrent("#2f2900", "#2f2800")).toBe(true);
  });

  it("인접 후보끼리는 구별한다", () => {
    // stop 950의 "기본"(#2f2900)과 "더 깊게"(#201b00)의 실측 거리는 15 —
    // TOLERANCE(2) 안에 안 들어와 확실히 다르다. (이 낱개 비교는 여전히
    // 참이지만, "모든 후보 쌍이 15 이상 떨어져 있다"는 일반화는 거짓이다 —
    // 아래 pickCurrent 쪽 주석·리뷰 참조. isCurrent를 후보 목록 전체에
    // 반복 적용하면 그 반증 사례에서 중복 매치가 난다.)
    expect(isCurrent("#2f2900", "#201b00")).toBe(false);
  });
});

// 2026-08-30 리뷰(C-1): "인접 후보 간 거리 15 이상"은 반증됐다 — 실측(6 액센트 ×
// stop [0,3,7,10], candidatesFor 직접 호출, 체비셰프 거리)하면 파랑·보라 stop 50은
// 거리 1, 주황 stop 50은 2, 초록 stop 50은 3까지 좁아진다. 그 좁은 자리에서 고정
// TOLERANCE 창으로 판정하면 실제로 다른 두 후보가 같은 창에 걸려 동시에 "현재"로
// 잡힌다. pickCurrent(argmin)는 창이 아니라 순위라 이 실패 모드가 구조적으로 없다.
describe("pickCurrent (argmin, D7-1 C-1 수정)", () => {
  it("정확히 일치하는 후보를 고른다", () => {
    expect(pickCurrent(["#101010", "#202020"], "#101010")).toBe("#101010");
  });

  it("가장 가까운 후보 하나만 고른다 — 동률이 아니면 다른 후보를 절대 겹쳐 고르지 않는다", () => {
    // 실측: 이 세 값은 임의가 아니라 blue stop 50의 실제 커브 기본값(#f3f8ff)과
    // 두 후보(#f4f8fe "중립적", #f3f8ff "균형")다. 고정 TOLERANCE=2였다면 둘 다
    // "충분히 같다"(거리 1과 0)로 잡혀 동시 checked가 났던 바로 그 조합이다.
    expect(pickCurrent(["#f4f8fe", "#f3f8ff"], "#f3f8ff")).toBe("#f3f8ff");
  });

  it("실측 왕복 오차 폴백: 정확 일치가 없어도 가장 가까운 후보를 고른다", () => {
    // 노랑(#f5d90a) stop 950 실측: 곡선 기본값(#2f2800)이 후보 목록
    // (#2f2900 "기본", #201b00 "더 깊게", #392301 "골드로 틀기") 어디에도
    // 정확히는 없다(왕복 오차). 셋 중 "기본"이 유일하게 가깝다(거리 1) —
    // 나머지 둘은 10 이상 떨어져 있어 오판할 여지가 없다.
    expect(pickCurrent(["#2f2900", "#201b00", "#392301"], "#2f2800")).toBe("#2f2900");
  });

  it("빈 목록이면 null", () => {
    expect(pickCurrent([], "#000000")).toBeNull();
  });

  it("동률이면 배열에서 먼저 오는 후보 — candidatesFor의 순서를 안 섞는다", () => {
    // target=#101010에서 #0a0a0a(−6)과 #161616(+6)은 체비셰프 거리가 똑같이 6.
    expect(pickCurrent(["#0a0a0a", "#161616"], "#101010")).toBe("#0a0a0a");
  });

  it("체비셰프 거리다 — 한 채널만 크게 벌어져도 그쪽을 더 멀다고 본다", () => {
    // target=#151515. #101010은 세 채널 모두 5 차이(최대 5). #202020은 세
    // 채널 모두 11 차이(최대 11). #101010이 더 가깝다.
    expect(pickCurrent(["#101010", "#202020"], "#151515")).toBe("#101010");
  });
});

describe("resolveCurrent (checked 판정에 실제로 쓰이는 조합)", () => {
  const candidates = ["#f4f8fe", "#f3f8ff"];

  it("pin이 있으면 pin을 target으로 쓴다", () => {
    expect(resolveCurrent(candidates, "#f4f8fe", "#f3f8ff")).toBe("#f4f8fe");
  });

  it("pin이 없으면 곡선 기본값을 target으로 쓴다", () => {
    expect(resolveCurrent(candidates, undefined, "#f3f8ff")).toBe("#f3f8ff");
  });
});
