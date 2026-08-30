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

  // 위 목록엔 없지만 실제로 배선을 완성시키는 조합 — noSubtle-bg는 "확인된
  // 사실"에도 있고(D3 브리프), 액센트 text(text-strong의 짝, TEXT_ROLES의
  // 나머지 절반)도 같은 공유 버튼을 가리켜야 한다. 실측(#f5d90a)에서 고칠 수
  // 있는 실패 4건 중 DOM에 가장 먼저 뜨는 것이 정확히 accent/text다 — 이게
  // null이면 그 뱃지에 아무리 hover해도 공유 버튼이 안 켜진다.
  it("액센트 subtle-bg·text도 공유 버튼이다", () => {
    expect(mockTargetFor("accent", "subtle-bg")).toBe("share-btn");
    expect(mockTargetFor("accent", "text")).toBe("share-btn");
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
