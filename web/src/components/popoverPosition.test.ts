// web/src/components/popoverPosition.test.ts
//
// 실제 기하로 검증한다: 액센트 띠는 왼쪽 컬럼 608px 안에 있고(max-w-5xl 1024 −
// p-8 64 − 사이드 320 − gap-8 32), 칸 하나는 (608−20)/11 ≈ 53px, 패널은 ~170px다.
// stop 950 칸에 중앙 정렬하면 오른쪽으로 넘친다 — 그때 얼마나 되밀어야 하는지가
// 이 함수가 답해야 하는 질문이다.

import { describe, it, expect } from "vitest";
import { clampOffset } from "./popoverPosition";

const BOUNDARY = { left: 0, right: 608 };

describe("clampOffset", () => {
  it("경계 안에 들어오면 되밀지 않는다", () => {
    expect(clampOffset({ left: 200, right: 370 }, BOUNDARY)).toBe(0);
  });

  it("오른쪽으로 넘치면 음수로 되민다", () => {
    // stop 950 칸 중앙 ≈ 581, 패널 170 → 496..666. 오른쪽으로 58 초과.
    expect(clampOffset({ left: 496, right: 666 }, BOUNDARY)).toBe(-58);
  });

  it("왼쪽으로 넘치면 양수로 되민다", () => {
    // stop 50 칸 중앙 ≈ 27, 패널 170 → -58..112.
    expect(clampOffset({ left: -58, right: 112 }, BOUNDARY)).toBe(58);
  });

  // 되밀 자리가 없다 — 밀면 반대쪽이 그만큼 더 나간다. 아무것도 안 하는 게 낫다.
  it("패널이 경계보다 넓으면 되밀지 않는다", () => {
    expect(clampOffset({ left: -20, right: 700 }, BOUNDARY)).toBe(0);
  });

  // jsdom은 모든 rect가 0이다. 이 경우 오프셋이 0이어야 컴포넌트 테스트가
  // 위치 계산 때문에 깨지지 않는다 — 계획 전체가 이 성질에 기대고 있다.
  it("rect가 전부 0이면(jsdom) 0을 낸다", () => {
    expect(clampOffset({ left: 0, right: 0 }, { left: 0, right: 0 })).toBe(0);
  });
});
