// web/src/components/OklchPicker.test.tsx
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OklchPicker } from "./OklchPicker";
import { hexToOklch } from "../lib/oklch";

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

  // finding 1 회귀 테스트 — L 칸에 keystroke마다 커밋되는 값을 연달아 흘려서
  // clampChromaToGamut이 래칫처럼 채도를 죽이지 않는지 본다. 단발
  // fireEvent.change 하나로는 이 버그가 절대 안 잡힌다: "0" → "0.7" → "0.75"를
  // 순서대로 쳐야 매 커밋이 직전 커밋에서 이미 잘린 채도를 기준으로 다시
  // 클램프하는 래칫이 재현된다.
  it("L 칸에 연속으로 타이핑해도 채도가 래칫처럼 죽지 않는다", () => {
    render(<Harness />);
    const before = hexToOklch(screen.getByTestId("hex").textContent!)!;
    expect(before.c).toBeGreaterThan(0.1); // #3b82f6은 채도가 있는 파랑이어야 시작점이 유효

    const l = screen.getByLabelText("L") as HTMLInputElement;
    fireEvent.change(l, { target: { value: "0" } });
    fireEvent.change(l, { target: { value: "0.7" } });
    fireEvent.change(l, { target: { value: "0.75" } });

    const after = hexToOklch(screen.getByTestId("hex").textContent!)!;
    expect(after.l).toBeCloseTo(0.75, 1);
    // 래칫 버그가 있으면 이 시점의 채도는 ~0.022(회색에 가까움)까지 떨어진다.
    // 그 자리(L=0.75)에서 가능한 최대 채도 근처로 회복돼야 한다.
    expect(after.c).toBeGreaterThan(0.1);
  });

  // 같은 래칫이 H 칸에도 있었다 — H onCommit이 desiredC가 아니라 이미 잘린
  // lch.c를 클램프 기준으로 썼다. #3b82f6(L≈0.623, C≈0.188)에서 h=200은 그
  // L에서 최대 채도가 ~0.106으로 좁다 — 거길 거쳐 h=320(최대 채도 0.188이
  // 그대로 들어가는 폭넓은 자리)으로 돌아왔을 때 채도가 desiredC(0.188) 기준
  // 회복이 아니라 h=200에서 잘린 0.106에 눌러앉으면 래칫이 재현된 것이다.
  it("H 칸에 연속으로 타이핑해도 채도가 래칫처럼 죽지 않는다", () => {
    render(<Harness />);
    const h = screen.getByLabelText("H") as HTMLInputElement;
    fireEvent.change(h, { target: { value: "10" } });
    fireEvent.change(h, { target: { value: "200" } });
    fireEvent.change(h, { target: { value: "320" } });

    const after = hexToOklch(screen.getByTestId("hex").textContent!)!;
    expect(after.h).toBeCloseTo(320, -1);
    // 래칫 버그가 있으면 h=200에서 잘린 채도(~0.106)에 눌러앉아 0.15를 못 넘는다.
    expect(after.c).toBeGreaterThan(0.15);
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
