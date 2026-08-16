// web/src/color-palette/AdjustableScale.test.tsx
//
// 조정 가능한 stop이 칩(1px 테두리 차이)이 아니라 캡션 줄에서 구분되는지 고정한다.
// 스펙 D3: "눌러보면 뭔가 나온다"는 발견에 기대지 않는다 — hover 전에도 11개 중
// 4개가 시각적으로 달라야 한다.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdjustableScale } from "./AdjustableScale";

const HEXES: readonly string[] = Array(11).fill("#808080") as string[];

describe("AdjustableScale", () => {
  it("gives adjustable captions a different class than fixed ones", () => {
    render(
      <AdjustableScale hexes={HEXES} adjustable={[0, 3, 7, 10]} pinned={[]} onPick={() => {}} />,
    );
    const captions = screen.getAllByTestId("stop-caption");
    expect(captions.length).toBe(11);

    const adjustableIdx = new Set([0, 3, 7, 10]);
    captions.forEach((el, i) => {
      if (adjustableIdx.has(i)) {
        expect(el.className, `stop ${i}`).not.toBe(captions[1].className);
      }
    });

    // 조정 가능한 4개는 서로 같은 클래스, 나머지 7개와는 다른 클래스.
    const adjustableClasses = new Set([...adjustableIdx].map((i) => captions[i].className));
    const fixedClasses = new Set(
      captions.map((el, i) => (adjustableIdx.has(i) ? null : el.className)).filter(Boolean),
    );
    expect(adjustableClasses.size).toBe(1);
    expect(fixedClasses.size).toBe(1);
    expect([...adjustableClasses][0]).not.toBe([...fixedClasses][0]);
  });

  // D9: 설명 문장을 붙이지 않는다 — 캡션은 여전히 stop 번호(짧은 라벨)만이어야 한다.
  it("keeps the caption text itself unchanged — no explanatory sentence added", () => {
    render(
      <AdjustableScale hexes={HEXES} adjustable={[0, 3, 7, 10]} pinned={[]} onPick={() => {}} />,
    );
    const captions = screen.getAllByTestId("stop-caption").map((el) => el.textContent);
    expect(captions).toEqual(["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"]);
  });
});
