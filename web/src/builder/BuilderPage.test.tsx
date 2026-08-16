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

    // 주입된 CSS의 모든 셀렉터가 .palette-preview로 시작해야 한다.
    // ".palette-preview를 포함한다"만으로는 부족하다 — 라이트 블록 하나로 충족되어
    // 다크 블록이 문서 전체로 새도 통과한다.
    // [^{] 대신 [^\n{]를 쓴다 — 줄바꿈을 허용하면 헤더 주석 3줄(둘 다 "{"가 없다)이
    // 첫 셀렉터 매치에 통째로 빨려 들어가고, 닫는 "}"가 다음 셀렉터 매치에 섞여
    // ".palette-preview.dark"가 아니라 "}\n\n.palette-preview.dark"가 잡힌다.
    const selectors = [...injected!.matchAll(/^(\S[^\n{]*)\{/gm)].map((m) => m[1].trim());
    expect(selectors.length).toBeGreaterThan(0);
    for (const sel of selectors) {
      expect(sel.startsWith(".palette-preview"), sel).toBe(true);
    }
  });

  it("toggles the preview between light and dark", () => {
    render(<BuilderPage />);
    completeSixSteps();
    const toggle = screen.getByRole("button", { name: "다크로" });
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "라이트로" })).toBeTruthy();
    expect(document.querySelector(".palette-preview.dark")).toBeTruthy();
  });

  // #builder는 renderColorDesignMd를 경고 없이 불렀었다 — 같은 액센트인데
  // /color-palette가 만든 DESIGN.md에는 경고 10줄, #builder가 만든 파일에는
  // 0줄인 갈라짐이 있었다. 기본 확정 흐름(1단계는 기본 액센트 그대로 확정)이
  // 정확히 그 기본 파랑 액센트를 쓰므로, 최소 하나(경고 앰버 텍스트)는 뜬다.
  it("includes contrast warnings in DESIGN.md, matching /color-palette's default accent", () => {
    const blobs: string[] = [];
    URL.createObjectURL = ((blob: Blob) => {
      blobs.push((blob as unknown as { __text?: string }).__text ?? "");
      return "blob:x";
    }) as typeof URL.createObjectURL;
    URL.revokeObjectURL = (() => {}) as typeof URL.revokeObjectURL;

    render(<BuilderPage />);
    completeSixSteps();
    fireEvent.click(screen.getByRole("button", { name: "DESIGN.md" }));

    expect(blobs[0]).toContain("AA에 미달한다");
    expect(blobs[0]).toContain("on-solid");
  });
});
