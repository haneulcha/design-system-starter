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
  // 3.1 D2("상태 한 조각… 작게 하나면 충분하다")를 상시 규칙에서 은퇴시킨다
  // (스펙의 "뒤집는 판단 1"). 근거는 미학이 아니라 배선이다: checkContrast는
  // 6개 스케일 전부에 검사를 만드는데 여기가 warning·success·info에 전부
  // null을 내서, **가리킬 데가 구조적으로 없는 경고가 상시 존재**했다.
  it("상태색 4종의 text-strong이 각자의 칩을 가리킨다", () => {
    expect(mockTargetFor("warning", "text-strong")).toBe("warning-badge");
    expect(mockTargetFor("success", "text-strong")).toBe("success-badge");
    expect(mockTargetFor("info", "text-strong")).toBe("info-badge");
  });

  // 실패 칩만 solid + on-solid로 그린다(스펙 D5) — 겉모습(진한 배경·밝은 글자)은
  // 요청한 swap 그대로이고, subtle-bg↔text-strong을 글자 그대로 맞바꾸는 쪽은
  // 배지 문구가 bgLabel에서 나와 "은은한 배경 위 진한 글자"로 읽혀 화면과
  // 방향이 반대가 된다(bgLabel은 src/color/라 엔진 불변에 막혀 못 고친다).
  it("error는 solid·on-solid이 실패 칩이다", () => {
    expect(mockTargetFor("error", "solid")).toBe("error-badge");
    expect(mockTargetFor("error", "on-solid")).toBe("error-badge");
  });

  // 잃는 것을 명시한다(스펙 알려진 한계 1). 칩 하나는 배경·글자 쌍을 하나만
  // 쓴다 — 실패 칩이 solid 쌍을 쓰므로 text-strong은 그 칩이 안 읽는 역할이
  // 됐다. 안 쓰는 역할을 매핑하면 mockTargets가 처음부터 막으려던 것
  // (실제로 안 쓰인 stop의 실패에 엉뚱한 요소가 켜지는 것)이 재생산된다.
  it("error text-strong·text는 이제 null이다 — 칩이 그 역할을 안 쓴다", () => {
    expect(mockTargetFor("error", "text-strong")).toBeNull();
    expect(mockTargetFor("error", "text")).toBeNull();
  });

  // text와 text-strong은 TEXT_ROLES 짝이지만 서로 다른 stop이고, 상태 칩은
  // text-strong stop만 쓴다 — accent에서 text를 뺀 것과 같은 이유다(리뷰
  // 반증: #00a3a3에서 text만 실패·text-strong은 통과인데 공유 버튼이 켜짐).
  it("상태색 text(링크)는 칩이 아니다 — null", () => {
    expect(mockTargetFor("warning", "text")).toBeNull();
    expect(mockTargetFor("success", "text")).toBeNull();
    expect(mockTargetFor("info", "text")).toBeNull();
  });

  // 목업이 안 그리는 역할은 여전히 null이다 — 은퇴시킨 것은 "목업을 넓히지
  // 않는다"는 상시 규칙이지, "가리킬 데가 있는 것만 배선한다"는 원칙이 아니다.
  it("상태색이 안 쓰는 역할은 null이다", () => {
    expect(mockTargetFor("warning", "solid")).toBeNull();
    expect(mockTargetFor("success", "on-solid")).toBeNull();
    expect(mockTargetFor("info", "hover-bg")).toBeNull();
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

  it("목업이 그리지 않는 accent hover-bg는 null이다", () => {
    expect(mockTargetFor("accent", "hover-bg")).toBeNull();
  });
});
