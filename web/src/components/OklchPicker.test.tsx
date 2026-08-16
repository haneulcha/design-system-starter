// web/src/components/OklchPicker.test.tsx
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OklchPicker } from "./OklchPicker";

/** 제어 컴포넌트라 부모가 hex를 되먹여야 실제 사용과 같아진다. */
function Harness({ initial = "#3b82f6" }: { initial?: string }) {
  const [hex, setHex] = React.useState(initial);
  return (
    <>
      <OklchPicker hex={hex} onChange={setHex} />
      <output data-testid="hex">{hex}</output>
    </>
  );
}

describe("OklchPicker 숫자 칸", () => {
  it("L·C·H 세 칸을 그린다", () => {
    render(<Harness />);
    expect(screen.getByLabelText("L")).toBeTruthy();
    expect(screen.getByLabelText("C")).toBeTruthy();
    expect(screen.getByLabelText("H")).toBeTruthy();
  });

  // 미세조정이 이 태스크의 존재 이유다 — 스텝이 굵으면 의미가 없다.
  it("L 칸의 스텝이 0.001이다", () => {
    render(<Harness />);
    expect(screen.getByLabelText("L").getAttribute("step")).toBe("0.001");
  });

  it("L을 치면 hex가 따라온다", () => {
    render(<Harness />);
    const before = screen.getByTestId("hex").textContent;
    fireEvent.change(screen.getByLabelText("L"), { target: { value: "0.700" } });
    expect(screen.getByTestId("hex").textContent).not.toBe(before);
  });

  // gamut 밖 조합을 조용히 자르면 "왜 안 들어가지"가 된다 (스펙 D1).
  it("gamut 밖 채도를 치면 잘린 값이 칸에 되돌아온다", () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("L"), { target: { value: "0.950" } });
    const c = screen.getByLabelText("C") as HTMLInputElement;
    fireEvent.change(c, { target: { value: "0.300" } });
    expect(Number(c.value)).toBeLessThan(0.3);
    expect(Number(c.value)).toBeGreaterThan(0);
  });

  // 타이핑 중 초안을 덮어쓰면 한 글자씩 못 친다 — AccentInput에서 같은 버그를
  // 이미 한 번 고쳤다. 숫자 칸에서는 toFixed 정규화 때문에 같은 함정이 다시 생긴다.
  //
  // 주의: `"0."` 같은 중간 문자열로는 이걸 검증할 수 없다. <input type="number">는
  // HTML 새니타이즈 규칙상 유효한 부동소수 문자열이 아니면 value를 ""로 만들고,
  // jsdom도 그대로 따른다 — 컴포넌트에 도달하기 전에 값이 버려진다.
  it("타이핑한 값을 정규화된 표기로 덮어쓰지 않는다", () => {
    render(<Harness />);
    const l = screen.getByLabelText("L") as HTMLInputElement;
    fireEvent.change(l, { target: { value: "0.7" } });
    expect(l.value).toBe("0.7"); // "0.700"으로 바뀌면 안 된다
  });

  it("빈 입력은 커밋하지 않는다", () => {
    render(<Harness />);
    const before = screen.getByTestId("hex").textContent;
    fireEvent.change(screen.getByLabelText("L"), { target: { value: "" } });
    expect(screen.getByTestId("hex").textContent).toBe(before);
  });

  it("blur 시 무효 입력을 마지막 유효값으로 되돌린다", () => {
    render(<Harness />);
    const l = screen.getByLabelText("L") as HTMLInputElement;
    const valid = l.value;
    fireEvent.change(l, { target: { value: "" } });
    fireEvent.blur(l);
    expect(l.value).toBe(valid);
  });
});
