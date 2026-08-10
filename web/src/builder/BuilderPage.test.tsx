import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BuilderPage } from "./BuilderPage";

/** 6단계를 완주한다. 1단계는 기본 액센트를 그대로 확정하고,
 *  2~6단계는 매번 두 번째 후보를 고른다. */
function completeSixSteps() {
  const confirm = () => fireEvent.click(screen.getByRole("button", { name: /이 색으로 확정/ }));
  confirm();
  for (let step = 0; step < 5; step++) {
    const radios = screen.getAllByRole("radio");
    expect(radios.length, `step ${step + 2}`).toBeGreaterThanOrEqual(2);
    fireEvent.click(radios[1]);
    confirm();
  }
}

describe("BuilderPage 6단계 완주", () => {
  it("renders all six scales and the four downloads on the completion screen", () => {
    render(<BuilderPage />);
    completeSixSteps();

    // 스케일 6종이 화면에 있는가 — 액센트/뉴트럴은 섹션 제목으로, 시맨틱은 라벨로.
    expect(screen.getByText("완성된 스케일")).toBeTruthy();
    expect(screen.getByText("뉴트럴 — 배경 회색")).toBeTruthy();
    for (const label of ["오류 (빨강)", "경고 (앰버)", "성공 (초록)", "정보 (파랑)"]) {
      expect(screen.getAllByText(label).length, label).toBeGreaterThan(0);
    }

    // 산출물 4종
    for (const name of ["palette.css", "palette.theme.css", "palette.figma.json", "DESIGN.md"]) {
      expect(screen.getByRole("button", { name }), name).toBeTruthy();
    }
  });

  it("keeps the preview scoped — the injected CSS never targets :root", () => {
    render(<BuilderPage />);
    completeSixSteps();
    const styles = [...document.querySelectorAll("style")].map((s) => s.textContent ?? "");
    const injected = styles.find((s) => s.includes("--color-accent-500"));
    expect(injected, "미리보기 CSS가 주입되지 않았다").toBeTruthy();
    expect(injected!).toContain(".palette-preview");
    expect(injected!).not.toContain(":root");
  });

  it("toggles the preview between light and dark", () => {
    render(<BuilderPage />);
    completeSixSteps();
    const toggle = screen.getByRole("button", { name: "다크로" });
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "라이트로" })).toBeTruthy();
    expect(document.querySelector(".palette-preview.dark")).toBeTruthy();
  });
});
