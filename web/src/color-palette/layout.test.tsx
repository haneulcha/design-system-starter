import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ColorPalettePage } from "./ColorPalettePage";

describe("페이지 그리드 (스펙 D1)", () => {
  it("세 스테이지와 aside가 main의 직계 자식이다", () => {
    render(<ColorPalettePage />);
    const main = screen.getByRole("main");
    const aside = screen.getByRole("complementary");
    // 평탄화의 핵심 — 형제가 아니면 좁은 화면에서 프리뷰를 ②와 ③ 사이에
    // 놓을 수 없다 (order는 컨테이너 경계를 못 넘는다).
    expect(aside.parentElement).toBe(main);
    const sections = Array.from(main.children).filter((c) => c.tagName === "SECTION");
    expect(sections.length).toBe(3);
  });

  it("DOM 순서가 ① → ② → 프리뷰 → ③이다", () => {
    render(<ColorPalettePage />);
    const main = screen.getByRole("main");
    const kids = Array.from(main.children).filter(
      (c) => c.tagName === "SECTION" || c.tagName === "ASIDE",
    );
    // 좁은 화면에서는 이 순서가 그대로 읽는 순서다 — 결과(프리뷰)를 보기 전에
    // 파일(③)부터 받으라고 권하지 않는다.
    expect(kids.map((c) => c.tagName)).toEqual(["SECTION", "SECTION", "ASIDE", "SECTION"]);
  });

  it("main 랜드마크가 살아 있다", () => {
    render(<ColorPalettePage />);
    // display:contents로 풀면 접근성 트리에서 요소가 사라지는 사례가 보고된
    // 패턴이라, main을 그대로 그리드로 만든다.
    expect(screen.getByRole("main")).toBeTruthy();
    expect(screen.getByRole("complementary")).toBeTruthy();
  });

  it("상태색 2×2 그리드가 lg 전용이다", () => {
    render(<ColorPalettePage />);
    const grid = screen.getByTestId("semantic-section").querySelector('[class*="grid-cols"]');
    // 2×2는 3.3 D3의 lg 세로 예산용 나사였다. 390px에서 그대로 두면 스톱당
    // ~7px가 되어 사이클 3 D7의 "얇게 노출"이 그 자리에서 죽는다.
    expect(grid?.className).toContain("lg:grid-cols-2");
    expect(grid?.className).not.toMatch(/(^|\s)grid-cols-2(\s|$)/);
  });
});
