import { describe, expect, it } from "vitest";
import { mockTargetFor } from "./mockTargets";

describe("mockTargetFor (스펙 D3)", () => {
  it("액센트 solid·on-solid은 보고서 열기 버튼이다", () => {
    expect(mockTargetFor("accent", "on-solid")).toBe("solid-btn");
    expect(mockTargetFor("accent", "solid")).toBe("solid-btn");
  });
  it("액센트 text-strong·subtle-bg·border는 공유 버튼이다", () => {
    // Mock의 "공유"가 subtle-bg 배경 + border + text-strong 글자로 그려진다.
    expect(mockTargetFor("accent", "text-strong")).toBe("share-btn");
    expect(mockTargetFor("accent", "border")).toBe("share-btn");
  });
  it("뉴트럴 text·text-strong은 카드 안 두 줄이다", () => {
    expect(mockTargetFor("neutral", "text-strong")).toBe("card-text");
    expect(mockTargetFor("neutral", "text")).toBe("card-subtext");
  });
  it("목업에 없는 스케일은 null이다", () => {
    // warning·success·info는 목업에 아예 없다. 목업을 넓혀 커버리지를 올리는
    // 것은 3.1 D2("작게 하나면 충분하다")의 재개봉이라 하지 않는다 —
    // 대응 요소가 없다는 사실은 D4의 사유 한 줄이 대신 말한다.
    expect(mockTargetFor("warning", "text")).toBeNull();
    expect(mockTargetFor("success", "text-strong")).toBeNull();
  });

  // subtle-bg는 "확인된 사실"에도 있다(D3 브리프) — 공유 버튼의 배경이 그 롤이다.
  it("액센트 subtle-bg도 공유 버튼이다", () => {
    expect(mockTargetFor("accent", "subtle-bg")).toBe("share-btn");
  });

  // 리뷰 반증(C-1): text(텍스트 링크)는 text-strong과 TEXT_ROLES 짝이지만 Mock의
  // 공유 버튼은 text-strong stop만 쓴다 — text는 다른 stop이고 목업에 그 stop을
  // 쓰는 요소가 없다. #00a3a3에서 실측: 액센트 텍스트(링크)만 실패하고 진한
  // 텍스트는 AA를 통과하는데, "같은 축이니 같은 버튼"으로 매핑하면 멀쩡한 공유
  // 버튼이 링을 두른다 — 도구가 거짓을 가리키게 된다. null이 맞다.
  it("액센트 text(텍스트 링크)는 공유 버튼이 아니다 — null", () => {
    expect(mockTargetFor("accent", "text")).toBeNull();
  });

  it("error의 subtle-bg·text-strong은 실패 배지다", () => {
    expect(mockTargetFor("error", "subtle-bg")).toBe("error-badge");
    expect(mockTargetFor("error", "text-strong")).toBe("error-badge");
  });

  it("error에 없는 text·on-solid은 null이다", () => {
    // 목업의 error 배지는 subtle-bg + text-strong 두 롤만 쓴다 — error의 solid은
    // 아예 그리지 않는다(D3 브리프의 "확인된 사실").
    expect(mockTargetFor("error", "text")).toBeNull();
    expect(mockTargetFor("error", "on-solid")).toBeNull();
  });

  it("목업이 그리지 않는 accent hover-bg는 null이다", () => {
    expect(mockTargetFor("accent", "hover-bg")).toBeNull();
  });
});
