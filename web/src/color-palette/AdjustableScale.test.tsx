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
  // 어포던스는 depth로 준다 — 크기·표식은 정적 표시라 "누를 수 있다"만 말하고
  // 끝나는데, 그림자는 hover에서 뜨고 press에서 눌리면서 상호작용 전체를 한
  // 언어로 잇는다 (스펙 D3).
  it("조정 가능한 stop만 그림자를 갖는다", () => {
    render(
      <AdjustableScale
        hexes={HEXES}
        adjustable={[0, 3, 7, 10]}
        pinned={[]}
        onPick={() => {}}
      />,
    );
    const swatches = screen.getAllByTestId("swatch");
    const raised = swatches.filter((s) => s.className.includes("shadow"));
    expect(raised.length).toBe(4);
    for (const i of [0, 3, 7, 10]) {
      expect(swatches[i].className).toContain("shadow");
    }
  });

  it("조정 가능한 stop이 포인터 커서와 포커스 링을 갖는다", () => {
    render(
      <AdjustableScale
        hexes={HEXES}
        adjustable={[0, 3, 7, 10]}
        pinned={[]}
        onPick={() => {}}
      />,
    );
    const s = screen.getAllByTestId("swatch")[3];
    expect(s.className).toContain("cursor-pointer");
    expect(s.className).toContain("focus-visible:ring");
  });

  // 신호가 둘이면 캡션이 소음이 된다 — depth가 그 일을 한다.
  it("캡션은 더 이상 굵기로 가르지 않는다", () => {
    render(
      <AdjustableScale
        hexes={HEXES}
        adjustable={[0, 3, 7, 10]}
        pinned={[]}
        onPick={() => {}}
      />,
    );
    const classes = new Set(
      screen.getAllByTestId("stop-caption").map((c) => c.className),
    );
    expect(classes.size).toBe(1);
  });

  // D9: 설명 문장을 붙이지 않는다 — 캡션은 여전히 stop 번호(짧은 라벨)만이어야 한다.
  it("keeps the caption text itself unchanged — no explanatory sentence added", () => {
    render(
      <AdjustableScale hexes={HEXES} adjustable={[0, 3, 7, 10]} pinned={[]} onPick={() => {}} />,
    );
    const captions = screen.getAllByTestId("stop-caption").map((el) => el.textContent);
    expect(captions).toEqual(["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"]);
  });

  // D4: 팔레트는 색을 나란히 놓고 비교하는 표면이라 마우스가 띠 위를 자주
  // 가로지른다 — hover 리프트는 "지나가는 것"과 "고르려는 것"을 구별하지 못한다.
  // 더 결정적으로, 누르는 순간은 항상 hover 중이라 4px 그림자에서 2px만 내려가
  // "그림자 자리에 정확히 내려앉는다"는 이 파일의 물리 계약이 깨져 있었다.
  it("조정 가능한 stop에 hover 그림자가 없다 — 기본 깊이와 press는 남는다", () => {
    render(
      <AdjustableScale
        hexes={HEXES}
        adjustable={[0, 3, 7, 10]}
        pinned={[]}
        onPick={() => {}}
      />,
    );
    const s = screen.getAllByTestId("swatch")[3];
    expect(s.className).not.toContain("hover:shadow");
    expect(s.className).toContain("shadow-[0_2px");   // 기본 깊이는 남는다
    expect(s.className).toContain("active:shadow-none"); // press도 남는다
  });
});
