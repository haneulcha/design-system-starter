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
  // 끝나는데, 그림자는 쉬고 있을 때도 항상 떠 있다가 press에서 눌리면서
  // "이건 떠 있어서 누를 수 있다"는 한 언어를 처음부터 끝까지 잇는다
  // (스펙 D3, hover 리프트를 뺀 D4로 개정).
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

  // 앵커 관계를 DOM으로 고정한다 — 패널이 열린 stop의 칸 안에 있어야 위치가
  // 그 칸을 따라간다. 형제로 나가면 absolute의 기준이 사라진다.
  it("패널을 열린 stop의 칸 안에 렌더한다", () => {
    render(
      <AdjustableScale
        hexes={HEXES}
        adjustable={[0, 3, 7, 10]}
        pinned={[]}
        onPick={() => {}}
        openIndex={7}
        onClosePopover={() => {}}
        popoverContent={<span>후보 목록</span>}
      />,
    );
    const panel = screen.getByRole("dialog");
    const swatch = screen.getAllByTestId("swatch")[7];
    // 같은 칸(스와치의 부모) 안에 둘 다 있다
    expect(swatch.parentElement?.contains(panel)).toBe(true);
    expect(screen.getByText("후보 목록")).toBeTruthy();
  });

  // 스크린리더에는 "패널이 그 칸 아래 떴다"는 위치 정보가 없다 — 라벨이
  // 어느 stop인지 말해줘야 한다.
  it("패널 라벨과 트리거 ARIA가 stop을 가리킨다", () => {
    render(
      <AdjustableScale
        hexes={HEXES}
        adjustable={[0, 3, 7, 10]}
        pinned={[]}
        onPick={() => {}}
        openIndex={7}
        onClosePopover={() => {}}
        popoverContent={<span>후보 목록</span>}
      />,
    );
    expect(screen.getByRole("dialog", { name: "700 후보" })).toBeTruthy();
    const trigger = screen.getAllByTestId("swatch")[7];
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
    // 닫힌 stop은 열려 있지 않다고 말한다
    expect(screen.getAllByTestId("swatch")[3].getAttribute("aria-expanded")).toBe("false");
  });

  // 포커스 복귀가 실제로 도는 유일한 구성이다. Popover.test의 하네스는 Popover를
  // 직접 마운트/언마운트하지만, 제품에는 조건부 ref(`ref={i === openIndex ? … :
  // undefined}`)가 하나 더 얹힌다 — 닫히는 커밋에서 React가 그 ref를 먼저 떼므로,
  // 복귀 코드가 트리거를 "열릴 때 캡처"하지 않으면 여기서만 조용히 실패한다.
  it("패널이 사라지면 포커스가 그 stop의 스와치로 돌아온다", () => {
    const props = {
      hexes: HEXES,
      adjustable: [0, 3, 7, 10],
      pinned: [],
      onPick: () => {},
      onClosePopover: () => {},
      popoverContent: <span>후보 목록</span>,
    };
    const { rerender } = render(<AdjustableScale {...props} openIndex={7} />);
    // 열리면 패널에 포커스가 가 있다 — 복귀의 전제 조건이다.
    expect(document.activeElement).toBe(screen.getByRole("dialog"));
    rerender(<AdjustableScale {...props} openIndex={null} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(screen.getAllByTestId("swatch")[7]);
  });

  it("compact면 스와치 높이가 h-6, 기본은 h-9", () => {
    const hexes = Array.from({ length: 11 }, () => "#888888");
    const { rerender } = render(
      <AdjustableScale hexes={hexes} adjustable={[]} pinned={[]} />,
    );
    expect(screen.getAllByTestId("swatch")[0].className).toContain("h-9");

    rerender(<AdjustableScale hexes={hexes} adjustable={[]} pinned={[]} compact />);
    expect(screen.getAllByTestId("swatch")[0].className).toContain("h-6");
  });
});
