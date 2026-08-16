import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { onSolidColor } from "@core/color/contrast.js";
import { ColorPalettePage } from "./ColorPalettePage";
import { DEFAULT_ACCENT, defaultState, deriveScales } from "./paletteState";

beforeEach(() => window.history.replaceState({}, "", "/color-palette"));

describe("ColorPalettePage", () => {
  it("renders a complete palette from the default accent alone", () => {
    render(<ColorPalettePage />);
    // 11 stop × (액센트 + 뉴트럴 + 상태색 4) = 66 스와치
    expect(screen.getAllByTestId("swatch").length).toBe(66);
  });

  it("shows both light and dark mockups at once", () => {
    render(<ColorPalettePage />);
    expect(screen.getByTestId("mock-light")).toBeTruthy();
    expect(screen.getByTestId("mock-dark")).toBeTruthy();
  });

  it("marks exactly four accent stops as adjustable", () => {
    render(<ColorPalettePage />);
    expect(screen.getAllByRole("button", { name: /조정/ }).length).toBe(4);
  });

  it("writes the accent into the URL", () => {
    render(<ColorPalettePage />);
    fireEvent.change(screen.getByLabelText("액센트 hex"), { target: { value: "#eab308" } });
    expect(window.location.search).toContain("a=eab308");
  });

  // 제어 컴포넌트가 "유효할 때만 상태 갱신"이면 React가 매 keystroke마다 값을
  // 되돌려 전체 선택 후 붙여넣기밖에 못 한다 — 이 도구의 유일한 필수 입력이라
  // 심각하다. 한 글자씩 타이핑해 완성할 수 있어야 한다.
  it("accepts a hex value typed one character at a time", () => {
    render(<ColorPalettePage />);
    const input = screen.getByLabelText("액센트 hex") as HTMLInputElement;
    const partials = ["#", "#e", "#ea", "#eab", "#eab3", "#eab30", "#eab308"];
    for (const v of partials) {
      fireEvent.change(input, { target: { value: v } });
      expect(input.value, `after typing "${v}"`).toBe(v);
    }
    expect(window.location.search).toContain("a=eab308");
  });

  it("restores state from the URL on mount", () => {
    window.history.replaceState({}, "", "/color-palette?v=1&a=eab308");
    render(<ColorPalettePage />);
    expect((screen.getByLabelText("액센트 hex") as HTMLInputElement).value).toBe("#eab308");
  });

  // stop 7(700)은 기본 파랑 액센트에서 세 후보가 서로 다른 색으로 갈린다 —
  // gamut 클램프 충돌이 없는 자리라 "겹치지 않으면 여전히 3개"의 기준으로 쓴다.
  it("opens three candidates at a stop where none collapse", () => {
    render(<ColorPalettePage />);
    fireEvent.click(screen.getAllByRole("button", { name: /조정/ })[2]); // stop 7
    expect(screen.getAllByRole("radio").length).toBe(3);
  });

  // stop 0(50)은 기본 파랑 액센트에서 "균형"과 "색이 드러나는" 후보가 같은 gamut
  // 경계로 클램프돼 겹친다 — 겹치는 후보는 접어서 하나만 보여준다(사람 판정).
  it("collapses duplicate candidates at stop 0 into two", () => {
    render(<ColorPalettePage />);
    fireEvent.click(screen.getAllByRole("button", { name: /조정/ })[0]); // stop 0
    const radios = screen.getAllByRole("radio");
    expect(radios.length).toBe(2);
  });

  // stop 3(300)은 세 후보 전부가 같은 경계로 클램프돼 커브 기본값과도 같다 —
  // 선택지가 하나뿐이라는 사실 자체가 "여기는 고를 게 없다"는 정보다(D9).
  it("collapses all three candidates at stop 3 into one", () => {
    render(<ColorPalettePage />);
    fireEvent.click(screen.getAllByRole("button", { name: /조정/ })[1]); // stop 3
    expect(screen.getAllByRole("radio").length).toBe(1);
  });

  it("changes the palette in place when a candidate is chosen", () => {
    render(<ColorPalettePage />);
    const before = screen.getAllByTestId("swatch")[0].getAttribute("style");
    fireEvent.click(screen.getAllByRole("button", { name: /조정/ })[0]);
    // radio[0]("중립적")은 stop 0의 두 유일 후보 중 하나이고 gamut 경계 아래라
    // 항상 실제로 다른 색을 낸다 (dedup 후에도 첫 순서라 인덱스가 그대로다).
    fireEvent.click(screen.getAllByRole("radio")[0]);
    expect(screen.getAllByTestId("swatch")[0].getAttribute("style")).not.toBe(before);
  });

  it("records the chosen stop in the URL", () => {
    render(<ColorPalettePage />);
    fireEvent.click(screen.getAllByRole("button", { name: /조정/ })[0]);
    // dedup 후 stop 0은 라디오가 2개뿐이라 radio[1]을 쓴다.
    fireEvent.click(screen.getAllByRole("radio")[1]);
    expect(window.location.search).toContain("s0=");
  });

  it("reverts to the curve default", () => {
    render(<ColorPalettePage />);
    fireEvent.click(screen.getAllByRole("button", { name: /조정/ })[0]);
    fireEvent.click(screen.getAllByRole("radio")[1]);
    fireEvent.click(screen.getAllByRole("button", { name: /조정/ })[0]);
    fireEvent.click(screen.getByRole("button", { name: "기본으로" }));
    expect(window.location.search).not.toContain("s0=");
  });

  // 파랑에서 고른 pin이 빨강 액센트에 남으면 중간 구간이 두 색이 섞인 색이 된다.
  it("discards stop pins when the accent changes", () => {
    render(<ColorPalettePage />);
    fireEvent.click(screen.getAllByRole("button", { name: /조정/ })[0]);
    fireEvent.click(screen.getAllByRole("radio")[1]);
    expect(window.location.search).toContain("s0=");
    fireEvent.change(screen.getByLabelText("액센트 hex"), { target: { value: "#ef4444" } });
    expect(window.location.search).not.toContain("s0=");
  });

  // hover는 확정이 아니다 — 팔레트/목업은 다시 그려지지만 상태(URL)는 안 바뀐다.
  it("does not commit a stop pin when merely hovering a candidate", () => {
    render(<ColorPalettePage />);
    fireEvent.click(screen.getAllByRole("button", { name: /조정/ })[2]); // stop 7 — 안 겹침
    fireEvent.mouseEnter(screen.getAllByRole("radio")[0]);
    expect(window.location.search).not.toContain("s7=");
  });

  // hover는 프리뷰는 진짜로 그린다 — 확정만 안 될 뿐이다.
  it("previews the hovered candidate on the palette without committing", () => {
    render(<ColorPalettePage />);
    fireEvent.click(screen.getAllByRole("button", { name: /조정/ })[2]); // stop 7 — 안 겹침
    const before = screen.getAllByTestId("swatch")[7].getAttribute("style");
    fireEvent.mouseEnter(screen.getAllByRole("radio")[0]);
    expect(screen.getAllByTestId("swatch")[7].getAttribute("style")).not.toBe(before);
    expect(window.location.search).not.toContain("s7=");
  });

  it("offers all five tint attractors and marks the snapped one", () => {
    render(<ColorPalettePage />);
    expect(screen.getAllByRole("button", { name: /그레이|무채색/ }).length).toBe(5);
    // 기본 파랑 액센트는 "쿨"로 스냅된다 — 그 칩에만 표식(•)이 붙는다.
    expect(screen.getByRole("button", { name: /쿨 그레이/ }).textContent).toContain("•");
  });

  it("records a chosen tint in the URL", () => {
    render(<ColorPalettePage />);
    fireEvent.click(screen.getByRole("button", { name: /웜 그레이/ }));
    expect(window.location.search).toContain("n=warm");
  });

  it("drops the strength for the achromatic tint", () => {
    render(<ColorPalettePage />);
    fireEvent.click(screen.getByRole("button", { name: /무채색/ }));
    expect(window.location.search).toContain("n=achromatic");
    expect(window.location.search).not.toContain("achromatic-");
  });

  // 강도만 눌러도 어트랙터 선택이 확정된다 — 되돌릴 길이 있어야 함정이 아니다.
  it("offers a way back to auto-snap after touching strength alone", () => {
    render(<ColorPalettePage />);
    fireEvent.click(screen.getByRole("button", { name: "뚜렷" }));
    expect(screen.getByRole("button", { name: "자동으로" })).toBeTruthy();
  });

  it("returns to auto-snap and drops n= from the URL", () => {
    render(<ColorPalettePage />);
    fireEvent.click(screen.getByRole("button", { name: "뚜렷" }));
    fireEvent.click(screen.getByRole("button", { name: "자동으로" }));
    expect(window.location.search).not.toContain("n=");
  });

  // 뱃지 한 줄이 단일 텍스트 노드라는 전제 — PreviewPane에서 span으로 쪼개면 실패한다.
  it("shows the known warning failure as a badge", () => {
    render(<ColorPalettePage />);
    const badges = screen.getAllByTestId("contrast-badge").map((el) => el.textContent ?? "");
    expect(badges.some((t) => t.includes("경고") && t.includes("2.96"))).toBe(true);
  });

  // 파랑 액센트는 흰 글자를 지키므로 on-solid이 3.68로 미달 표시된다 (스펙 D5).
  it("shows the on-solid miss for the default blue accent", () => {
    render(<ColorPalettePage />);
    const badges = screen.getAllByTestId("contrast-badge").map((el) => el.textContent ?? "");
    expect(badges.some((t) => t.includes("on-solid") && t.includes("3.6"))).toBe(true);
  });

  // 경고 스케일의 text/라이트 검사는 subtle-bg 대·page 대 두 번 뜬다 — against가
  // 안 찍히면 숫자만 다른 채로 겹쳐 보여 사용자가 버그로 읽는다(Finding 2a).
  it("labels which background each duplicate-looking badge was measured against", () => {
    render(<ColorPalettePage />);
    const badges = screen.getAllByTestId("contrast-badge").map((el) => el.textContent ?? "");
    const warningTextLight = badges.filter(
      (t) => t.includes("경고") && t.includes("text") && t.includes("라이트"),
    );
    expect(warningTextLight.length).toBeGreaterThanOrEqual(2);
    expect(warningTextLight.every((t, _, all) => all.indexOf(t) === all.lastIndexOf(t)))
      .toBe(true); // 두 줄의 전체 텍스트가 서로 겹치지 않는다
    expect(warningTextLight.some((t) => t.includes("은은한 배경"))).toBe(true);
    expect(warningTextLight.some((t) => t.includes("페이지 배경"))).toBe(true);
  });

  // 상태색(warning 등)은 adjustable=false — 사용자가 손댈 수 없다. 손댈 수 있는
  // accent와 시각적으로 구분돼야 한다(Finding 2b). 설명 문장이 아니라 짧은 꼬리표.
  it("tags non-adjustable badges as fixed and leaves adjustable ones untagged", () => {
    render(<ColorPalettePage />);
    const badges = screen.getAllByTestId("contrast-badge").map((el) => el.textContent ?? "");
    const warningBadge = badges.find((t) => t.includes("경고"))!;
    const accentOnSolid = badges.find((t) => t.includes("on-solid"))!;
    expect(warningBadge).toContain("고정");
    expect(accentOnSolid).not.toContain("고정");
  });

  // 기본 파랑에서 success/text-strong/라이트/page는 4.495681로 AA(4.5) 미달인데
  // toFixed(2)로 반올림하면 4.50이 되어 기준을 충족한 것처럼 보인다(Finding 2c).
  it("never rounds a failing ratio up to the passing threshold", () => {
    render(<ColorPalettePage />);
    const badges = screen.getAllByTestId("contrast-badge").map((el) => el.textContent ?? "");
    const successStrong = badges.find(
      (t) => t.includes("성공") && t.includes("text-strong") && t.includes("페이지 배경"),
    );
    expect(successStrong).toBeDefined();
    expect(successStrong).toContain("4.49");
    expect(badges.every((t) => !t.includes("4.50"))).toBe(true);
  });

  it("offers no fix for a blue accent", () => {
    window.history.replaceState({}, "", "/color-palette?v=1&a=3b82f6");
    render(<ColorPalettePage />);
    expect(screen.queryByRole("button", { name: "한 번에 고치기" })).toBeNull();
  });

  it("offers and applies a fix for a yellow accent", () => {
    window.history.replaceState({}, "", "/color-palette?v=1&a=eab308");
    render(<ColorPalettePage />);
    fireEvent.click(screen.getByRole("button", { name: "한 번에 고치기" }));
    expect(window.location.search).toMatch(/t=8-/);
  });

  it("keeps the applied shift after the accent changes", () => {
    window.history.replaceState({}, "", "/color-palette?v=1&a=eab308");
    render(<ColorPalettePage />);
    fireEvent.click(screen.getByRole("button", { name: "한 번에 고치기" }));
    fireEvent.change(screen.getByLabelText("액센트 hex"), { target: { value: "#3b82f6" } });
    expect(window.location.search).toMatch(/t=8-/);
  });

  // 초록 액센트 stop 10에서 "더 깊게" 후보로 hover하면 — shifts가 shownScales(hover
  // 프리뷰 포함)로 계산될 때는 제안이 to=8/9에서 to=7/8로 바뀐다. 적용은 항상 확정
  // 팔레트(scales) 기준이어야 한다 — hover는 미리보기일 뿐 확정이 아니다.
  it("applies the fix from the confirmed palette, not the hover preview", () => {
    window.history.replaceState({}, "", "/color-palette?v=1&a=22c55e");
    render(<ColorPalettePage />);
    fireEvent.click(screen.getAllByRole("button", { name: /조정/ })[3]); // stop 10
    fireEvent.mouseEnter(screen.getAllByRole("radio")[1]); // "더 깊게"
    fireEvent.click(screen.getByRole("button", { name: "한 번에 고치기" }));
    expect(window.location.search).toMatch(/t=8-/);
  });

  it("offers a way back to role defaults after applying a fix", () => {
    window.history.replaceState({}, "", "/color-palette?v=1&a=eab308");
    render(<ColorPalettePage />);
    fireEvent.click(screen.getByRole("button", { name: "한 번에 고치기" }));
    expect(screen.getByRole("button", { name: "역할 기본값으로" })).toBeTruthy();
  });

  it("resets applied shifts and drops t= from the URL", () => {
    window.history.replaceState({}, "", "/color-palette?v=1&a=eab308");
    render(<ColorPalettePage />);
    fireEvent.click(screen.getByRole("button", { name: "한 번에 고치기" }));
    fireEvent.click(screen.getByRole("button", { name: "역할 기본값으로" }));
    expect(window.location.search).not.toContain("t=");
  });

  it("puts the real palette into the downloaded file", () => {
    const blobs: string[] = [];
    URL.createObjectURL = ((blob: Blob) => {
      // jsdom의 Blob은 text()가 Promise라 동기로 못 읽는다 — 생성 인자를 가로챈다.
      blobs.push((blob as unknown as { __text?: string }).__text ?? "");
      return "blob:x";
    }) as typeof URL.createObjectURL;
    // jsdom 29는 revokeObjectURL도 구현하지 않는다. downloadFile이 다음 틱에 부르므로
    // 스텁을 걸어두지 않으면 테스트가 끝난 뒤 unhandled TypeError로 파일이 실패한다.
    // 원복하지 않는다 — 원복하면 예약된 타이머가 undefined를 부른다.
    URL.revokeObjectURL = (() => {}) as typeof URL.revokeObjectURL;

    render(<ColorPalettePage />);
    fireEvent.click(screen.getByRole("button", { name: "palette.css" }));

    // 변수 "이름"만 맞는 회귀는 안 잡힌다 — deriveScales로 독립 계산한 실제 hex와
    // 대조해 화면이 그린 팔레트가 파일에 그대로 실렸는지를 본다.
    const scales = deriveScales(defaultState());
    expect(scales.accent[5]).toBe(DEFAULT_ACCENT); // 500 자리 = 기본 액센트 그대로
    expect(blobs[0]).toContain(`--color-accent-500: ${scales.accent[5]};`);

    const onSolid = onSolidColor(scales.accent[5]);
    expect(["#000000", "#ffffff"]).toContain(onSolid);
    expect(blobs[0]).toContain(`--color-accent-on-solid: ${onSolid};`);
  });
});
