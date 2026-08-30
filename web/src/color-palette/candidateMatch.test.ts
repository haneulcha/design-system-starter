import { describe, expect, it } from "vitest";
import { isCurrent } from "./candidateMatch";

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
    // 허용치는 왕복 오차보다 크고 인접 후보 간 거리보다 작아야 한다.
    // stop 950의 "기본"(#2f2900)과 "더 깊게"(#201b00)는 확실히 달라야 한다.
    expect(isCurrent("#2f2900", "#201b00")).toBe(false);
  });
});
