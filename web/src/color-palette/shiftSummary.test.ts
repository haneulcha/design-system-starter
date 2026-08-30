import { describe, expect, it } from "vitest";
import { STOP_KEYS } from "@core/color/scale.js";
import { summarizeShifts, shiftHighlightTargets } from "./shiftSummary";

describe("summarizeShifts", () => {
  it("인덱스가 아니라 stop 이름으로 말한다", () => {
    // RoleShift의 from/to는 인덱스(6→7)다. 사람에게는 STOP_KEYS를 거쳐 600→700으로
    // 보여야 한다 — 화면 어디에도 인덱스는 안 보이기 때문이다.
    const s = summarizeShifts([{ roleId: "text", theme: "light", from: 6, to: 7 }]);
    expect(s).toContain("600");
    expect(s).toContain("700");
    expect(s).not.toContain("6 →");
  });

  it("역할 이름은 엔진 라벨을 쓴다", () => {
    const s = summarizeShifts([{ roleId: "text-strong", theme: "light", from: 7, to: 8 }]);
    expect(s).toContain("진한 텍스트");
  });

  it("빈 배열은 빈 문자열이다", () => {
    expect(summarizeShifts([])).toBe("");
  });

  it("실제로 관측된 이동(text 6→7, text-strong 7→8)을 한 문장으로 잇는다", () => {
    const s = summarizeShifts([
      { roleId: "text", theme: "light", from: 6, to: 7 },
      { roleId: "text-strong", theme: "light", from: 7, to: 8 },
    ]);
    expect(s).toBe("텍스트 (링크)를 600 → 700으로, 진한 텍스트를 700 → 800으로 옮겼습니다");
  });

  it("라이트/다크가 같은 역할에 같은 이동을 내면 한 번만 말한다", () => {
    // suggestRoleShifts는 라이트·다크를 각각의 항목으로 낸다. roleId+from+to가
    // 같으면(우연히 같은 이동이면) "텍스트를 600→700으로, 텍스트를
    // 600→700으로"처럼 반복돼선 안 된다.
    const s = summarizeShifts([
      { roleId: "text", theme: "light", from: 6, to: 7 },
      { roleId: "text", theme: "dark", from: 6, to: 7 },
    ]);
    expect(s).toBe("텍스트 (링크)를 600 → 700으로 옮겼습니다");
  });

  it("같은 역할이라도 테마별 이동 폭이 다르면 각각 말한다", () => {
    const s = summarizeShifts([
      { roleId: "text", theme: "light", from: 6, to: 7 },
      { roleId: "text", theme: "dark", from: 4, to: 3 },
    ]);
    expect(s).toBe("텍스트 (링크)를 600 → 700으로, 텍스트 (링크)를 400 → 300으로 옮겼습니다");
  });

  it("STOP_KEYS 그대로 — 600/700/800 표기가 실제 상수와 어긋나지 않는다", () => {
    expect(STOP_KEYS[6]).toBe("600");
    expect(STOP_KEYS[7]).toBe("700");
    expect(STOP_KEYS[8]).toBe("800");
  });
});

describe("shiftHighlightTargets", () => {
  it("text는 카드 부제(neutral)를 가리킨다 — accent엔 대응 요소가 없다", () => {
    const targets = shiftHighlightTargets([{ roleId: "text", theme: "light", from: 6, to: 7 }]);
    expect(targets).toEqual(["card-subtext"]);
  });

  it("text-strong은 카드 제목(neutral)과 공유 버튼(accent) 둘 다 가리킨다", () => {
    const targets = shiftHighlightTargets([
      { roleId: "text-strong", theme: "light", from: 7, to: 8 },
    ]);
    expect(targets).toEqual(["card-text", "share-btn"]);
  });

  it("빈 배열은 빈 배열이다", () => {
    expect(shiftHighlightTargets([])).toEqual([]);
  });

  it("라이트/다크 중복은 같은 target으로 걸러진다", () => {
    const targets = shiftHighlightTargets([
      { roleId: "text", theme: "light", from: 6, to: 7 },
      { roleId: "text", theme: "dark", from: 4, to: 3 },
    ]);
    expect(targets).toEqual(["card-subtext"]);
  });
});
