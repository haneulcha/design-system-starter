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

  // #00a3a3(mockTargets.ts가 D3 리뷰 반증 사례로 이미 인용하는 액센트) 실측 —
  // __probe로 확인: suggestRoleShifts가 정확히 [{text,light,6→7},
  // {text-strong,light,7→8}]을 낸다. 스펙 개정 로그 9번이 이 문구를 실측으로
  // 정정한 값과 같다 — 합성 데이터가 아니라 실제로 재현되는 케이스다.
  it("실제로 관측된 이동(#00a3a3, text 6→7·text-strong 7→8)을 한 테마 문장으로 잇는다", () => {
    const s = summarizeShifts([
      { roleId: "text", theme: "light", from: 6, to: 7 },
      { roleId: "text-strong", theme: "light", from: 7, to: 8 },
    ]);
    expect(s).toBe("라이트: 텍스트 (링크)를 600 → 700으로, 진한 텍스트를 700 → 800으로 옮겼습니다");
  });

  // #990000 실측(__probe): suggestRoleShifts가 다크 전용 이동만 낸다 —
  // [{text,dark,4→3},{text-strong,dark,3→2}], 라이트는 하나도 안 움직인다.
  // 리뷰 스캔(액센트 432개 중 이동이 나온 365개 중 121개, 33%)에서 흔한
  // 패턴이라 다크 전용 케이스를 명시적으로 고정한다 — 테마를 안 밝히면
  // "텍스트를 옮겼다"는 말이 안 바뀐 라이트를 가리키는 거짓 진술이 된다(C-1).
  it("다크 전용 이동은 '다크:'로 밝히고 라이트는 언급하지 않는다 (#990000)", () => {
    const s = summarizeShifts([
      { roleId: "text", theme: "dark", from: 4, to: 3 },
      { roleId: "text-strong", theme: "dark", from: 3, to: 2 },
    ]);
    expect(s).toBe("다크: 텍스트 (링크)를 400 → 300으로, 진한 텍스트를 300 → 200으로 옮겼습니다");
    expect(s).not.toContain("라이트");
  });

  // 라이트·다크가 함께 이동하면(같은 role이라도 from/to는 roles.ts의
  // lightIndex/darkIndex가 달라 항상 다른 값이다 — text는 6/4, text-strong은
  // 7/3) 두 테마 문장을 " / "로 잇는다.
  it("라이트·다크가 함께 이동하면 두 문장을 잇는다", () => {
    const s = summarizeShifts([
      { roleId: "text", theme: "light", from: 6, to: 7 },
      { roleId: "text", theme: "dark", from: 4, to: 3 },
    ]);
    expect(s).toBe("라이트: 텍스트 (링크)를 600 → 700으로 옮겼습니다 / 다크: 텍스트 (링크)를 400 → 300으로 옮겼습니다");
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
    expect(targets.light).toEqual(["card-subtext"]);
    expect(targets.dark).toEqual([]);
  });

  // I-1: text-strong이 옮겨지면 error 배지 글자색도 실제로 따라 움직인다
  // (Mock의 error 배지는 at(err, "text-strong")으로 그린다 — roles가 전역
  // 공유라서다). "대응 요소가 없다"는 이전 주장은 사실이 아니었다 — 셋
  // 다(card-text·share-btn·error-badge) 포함해야 한다.
  it("text-strong은 카드 제목(neutral)·공유 버튼(accent)·실패 배지(error) 셋 다 가리킨다", () => {
    const targets = shiftHighlightTargets([
      { roleId: "text-strong", theme: "light", from: 7, to: 8 },
    ]);
    expect(targets.light).toEqual(["share-btn", "card-text", "error-badge"]);
    expect(targets.dark).toEqual([]);
  });

  it("빈 배열은 라이트·다크 둘 다 빈 배열이다", () => {
    expect(shiftHighlightTargets([])).toEqual({ light: [], dark: [] });
  });

  // C-1: 다크 전용 이동(#990000)은 dark만 채우고 light는 비어야 한다 —
  // 안 그러면 안 바뀐 라이트 목업 요소에 링이 걸리는 거짓 강조가 된다.
  it("다크 전용 이동은 dark만 채운다 (#990000)", () => {
    const targets = shiftHighlightTargets([
      { roleId: "text", theme: "dark", from: 4, to: 3 },
      { roleId: "text-strong", theme: "dark", from: 3, to: 2 },
    ]);
    expect(targets.light).toEqual([]);
    expect(targets.dark).toEqual(["card-subtext", "share-btn", "card-text", "error-badge"]);
  });
});
