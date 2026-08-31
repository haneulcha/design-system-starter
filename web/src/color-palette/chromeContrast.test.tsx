import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ColorPalettePage } from "./ColorPalettePage";

// 이 화면의 일은 대비를 재는 것이다. 자기 크롬이 그 기준에 미달하면 도구가
// 자기 주장을 배반한다 — neutral-400(2.58:1)이 아니라 neutral-500(4.73:1)이
// 크롬 텍스트의 하한이다. 목업(Mock) 내부는 예외: 거기 색은 사용자 팔레트이고
// 그 미달을 드러내는 것이 이 화면의 목적이다.
describe("크롬 텍스트 대비 (스펙 D2)", () => {
  it("목업 밖 크롬에 text-neutral-400이 남아 있지 않다", () => {
    const { container } = render(<ColorPalettePage />);
    const light = screen.getByTestId("mock-light");
    const dark = screen.getByTestId("mock-dark");
    const offenders = Array.from(container.querySelectorAll(".text-neutral-400"))
      .filter((el) => !light.contains(el) && !dark.contains(el))
      .map((el) => el.textContent?.slice(0, 24) ?? "(빈 요소)");
    expect(offenders).toEqual([]);
  });

  it("stop 캡션이 neutral-500이다", () => {
    render(<ColorPalettePage />);
    expect(screen.getAllByTestId("stop-caption")[0].className).toContain("text-neutral-500");
  });

  it("자동 스냅 점 표식이 neutral-500이다", () => {
    render(<ColorPalettePage />);
    // NeutralControl 헤더 주석이 "자동으로 붙은 자리는 점(•) 표식으로만 알린다"고
    // 선언한다 — 시각 채널이 이것 하나뿐이라 정확히 "의미를 지닌" 자리다.
    const dot = screen.getByText("•");
    expect(dot.className).toContain("text-neutral-500");
  });
});
