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

  // 막대가 여러 stop을 나란히 놓는 것이 이 목업의 존재 이유다 — 카드+버튼+배지는
  // 액센트를 500 하나와 극단값 몇 개로만 써서 사다리를 안 보여준다 (스펙 D2).
  it("목업에 액센트 stop이 다른 막대 5개가 있다", () => {
    render(<ColorPalettePage />);
    const bars = screen.getAllByTestId("mock-bar");
    expect(bars.length).toBe(10); // 라이트 5 + 다크 5
    // style 속성 전체를 비교하면 안 된다 — BAR_HEIGHTS가 전부 달라서 색이 다섯 개
    // 다 같아도 통과한다. 배경만 꺼내 비교해야 색 회귀를 잡는다.
    const light = bars.slice(0, 5).map((b) => (b as HTMLElement).style.background);
    expect(new Set(light).size).toBe(5);
  });

  it("솔리드 버튼 글자색이 엔진의 onSolidColor와 같다", () => {
    render(<ColorPalettePage />);
    const scales = deriveScales(defaultState());
    const onSolid = onSolidColor(scales.accent[5]);
    const btn = screen.getAllByTestId("mock-solid-btn")[0] as HTMLElement;
    // jsdom(cssstyle)은 style을 rgb()로 직렬화한다 — hex 문자열로는 절대 매치되지 않는다.
    expect(btn.style.color).toBe(
      onSolid === "#ffffff" ? "rgb(255, 255, 255)" : "rgb(0, 0, 0)",
    );
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

  // 고정값 미달은 접혀서 개수만 보이고, 조정 가능한 것(accent on-solid)은 접히지
  // 않은 채 위에 남는다 — 10건 중 9건이 고정, 1건이 on-solid(스펙 위 확인값).
  it("collapses the fixed-failure badges behind a summary with the right count", () => {
    render(<ColorPalettePage />);
    const summary = screen.getByText("고정값 미달 9건");
    expect(summary.tagName).toBe("SUMMARY");
    expect(summary.closest("details")?.hasAttribute("open")).toBe(false);
  });

  it("lists all nine fixed badges inside the collapsed group", () => {
    render(<ColorPalettePage />);
    const summary = screen.getByText("고정값 미달 9건");
    const details = summary.closest("details")!;
    const badgesInside = Array.from(details.querySelectorAll('[data-testid="contrast-badge"]'));
    expect(badgesInside.length).toBe(9);
    expect(badgesInside.every((el) => (el.textContent ?? "").includes("고정"))).toBe(true);
  });

  it("keeps the adjustable badge outside the collapsed group", () => {
    render(<ColorPalettePage />);
    const summary = screen.getByText("고정값 미달 9건");
    const details = summary.closest("details")!;
    const allBadges = screen.getAllByTestId("contrast-badge");
    const outside = allBadges.filter((el) => !details.contains(el));
    expect(outside.length).toBe(1);
    expect(outside[0].textContent).toContain("on-solid");
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

  // 열린 채 다른 스와치를 누르면 실브라우저에서는 pointerdown(바깥 닫기) →
  // click(토글 열기)의 2-이벤트 시퀀스가 된다. 트리거를 "바깥"에서 빼두지 않으면
  // 같은 칸을 누를 때 "닫힘 → 즉시 재열림"이 되고, 다른 칸을 누를 때는 순서가
  // 어긋나 패널이 안 열린다. 페이지 스위트에서 pointerDown을 쓰는 유일한 곳이다.
  it("열린 채 다른 스와치를 누르면 그 stop의 패널로 옮겨간다", () => {
    render(<ColorPalettePage />);
    const stops = screen.getAllByRole("button", { name: /조정/ });
    fireEvent.click(stops[0]);                 // stop 0 — 후보 2개
    expect(screen.getAllByRole("radio").length).toBe(2);
    fireEvent.pointerDown(stops[2]);           // stop 7 — 바깥 판정으로 먼저 닫힘
    fireEvent.click(stops[2]);                 // 이어서 토글이 연다
    expect(screen.getAllByRole("radio").length).toBe(3);  // stop 7은 후보 3개
  });

  // hover의 키보드 대응물(D5): 마우스 없이 Tab만으로 라디오에 포커스가 들어와도
  // "고르기 전에 결과를 본다"가 성립해야 한다 — 화면이 프리뷰를 보여주되, 화살표
  // 키와 달리 Tab 진입 자체는 선택을 바꾸지 않으므로 확정(URL)까지 가면 안 된다.
  it("previews the focused candidate on the palette without committing (D5 키보드 대응)", () => {
    render(<ColorPalettePage />);
    fireEvent.click(screen.getAllByRole("button", { name: /조정/ })[2]); // stop 7 — 안 겹침
    const before = screen.getAllByTestId("swatch")[7].getAttribute("style");
    fireEvent.focus(screen.getAllByRole("radio")[0]);
    expect(screen.getAllByTestId("swatch")[7].getAttribute("style")).not.toBe(before);
    expect(window.location.search).not.toContain("s7=");
  });
});

describe("크롬 타이포 — 하한 12px", () => {
  // 목업(Mock)은 명시적 예외다. 사용자 팔레트로 그리는 축소 UI라 하한을 적용하면
  // 380px 카드가 부풀어 "커지면 정작 색이 안 보인다"(3.1 D2)를 거스른다.
  it("목업 바깥 크롬에 10~11px 손값이 없다", () => {
    const { container } = render(<ColorPalettePage />);
    const mocks = [screen.getByTestId("mock-light"), screen.getByTestId("mock-dark")];
    const offenders = Array.from(container.querySelectorAll("[class]")).filter((el) => {
      if (mocks.some((m) => m.contains(el))) return false;
      // SVG 요소의 className은 문자열이 아니라 SVGAnimatedString이다 — 정규식에
      // 그대로 태우면 "[object SVGAnimatedString]"으로 강제변환돼 조용히 안 걸리거나
      // 예외가 난다. 이 페이지는 SVG를 그리는 색 피커를 품고 있어 실제로 부딪힌다.
      return /text-\[(9|10|11)px\]/.test(el.getAttribute("class") ?? "");
    });
    expect(offenders.map((el) => el.getAttribute("class") ?? "")).toEqual([]);
  });

  it("stop 캡션이 code.sm을 쓴다", () => {
    render(<ColorPalettePage />);
    const caption = screen.getAllByTestId("stop-caption")[0];
    expect(caption.className).toContain("ds-type-code-sm");
  });

  it("대비 뱃지가 caption.sm을 쓴다", () => {
    render(<ColorPalettePage />);
    const badges = screen.getAllByTestId("contrast-badge");
    expect(badges.length).toBeGreaterThan(0);
    expect(badges[0].className).toContain("ds-type-caption-sm");
  });
});

describe("3단 스테이지 골격", () => {
  it("h1 하나에 h2 셋이 ①②③ 순서로 있다", () => {
    render(<ColorPalettePage />);
    expect(screen.getAllByRole("heading", { level: 1 }).length).toBe(1);
    const h2 = screen.getAllByRole("heading", { level: 2 });
    expect(h2.length).toBe(3);
    expect(h2.map((h) => h.textContent)).toEqual([
      expect.stringContaining("앵커"),
      expect.stringContaining("팔레트"),
      expect.stringContaining("받기"),
    ]);
  });

  // 사이클 3 D7로의 회귀 — 접힌 details는 "얇게 노출"이 아니라 "노출 안 함"이었다.
  // PreviewPane 안에도 "고정값 미달 N건" details가 따로 있어(사이클 3 의도적 설계,
  // 유지 대상) 페이지 전체에서 details 부재를 단언할 수 없다 — 상태색 섹션으로 좁힌다.
  it("상태색이 details 없이 첫 화면에 있다", () => {
    render(<ColorPalettePage />);
    const section = screen.getByTestId("semantic-section");
    expect(section.querySelector("details")).toBeNull();
    expect(section.querySelectorAll("[data-testid='swatch']").length).toBe(44);
    expect(screen.getAllByTestId("swatch").length).toBe(66);
  });

  it("상태색 띠만 compact다 — 액센트·뉴트럴은 아니다", () => {
    render(<ColorPalettePage />);
    const swatches = screen.getAllByTestId("swatch");
    // 0-10 액센트, 11-21 뉴트럴, 22-65 상태색 4벌
    expect(swatches[0].className).toContain("h-9");
    expect(swatches[11].className).toContain("h-9");
    expect(swatches[22].className).toContain("h-6");
    expect(swatches[65].className).toContain("h-6");
  });

  it("사이드바가 aside이고 프리뷰를 담는다", () => {
    render(<ColorPalettePage />);
    const aside = screen.getByRole("complementary");
    expect(aside.contains(screen.getByTestId("mock-light"))).toBe(true);
  });
});

describe("받기 카드", () => {
  it("받기 블록이 카드 표면 토큰을 쓴다", () => {
    render(<ColorPalettePage />);
    const card = screen.getByTestId("download-card");
    // 실측: 이 프로젝트의 jsdom(29.1.1)은 style.borderRadius/boxShadow 둘 다
    // var()를 그대로 되돌린다 — 빈 문자열 위험은 이 버전엔 없었다. 그래도 raw
    // style 속성으로 단언한다: 타입드 접근자의 버전별 동작에 기대지 않고,
    // 토큰 없이는 통과할 수 없다는 조건은 두 형태가 동등하게 강하다.
    expect(card.getAttribute("style")).toContain("var(--ds-radius-card)");
    expect(card.getAttribute("style")).toContain("var(--ds-shadow-raised)");
  });

  it("copy CSS가 테두리 있는 보조 버튼이다", () => {
    render(<ColorPalettePage />);
    const copy = screen.getByRole("button", { name: /CSS 복사/ });
    expect(copy.className).toContain("border");
    expect(copy.className).toContain("ds-type-caption-sm");
  });

  // 현행은 opacity 40%로 죽어만 있고 이유가 없다 (DownloadRow.tsx:47-48).
  it("클립보드를 못 쓰면 disabled에 사유가 붙는다", () => {
    const original = navigator.clipboard;
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    render(<ColorPalettePage />);
    const copy = screen.getByRole("button", { name: /CSS 복사/ }) as HTMLButtonElement;
    expect(copy.disabled).toBe(true);
    const reason = screen.getByText(/클립보드를 쓸 수 없는 환경/);
    expect(reason).toBeTruthy();
    // 사유가 형제 <div>로만 있으면 포커스가 가도 함께 읽히지 않는다 — aria-describedby로
    // 버튼과 프로그램적으로 연결한다(disabled라 포커스 자체는 못 받지만, 관계 명시는
    // 브라우즈 모드에서 유효하다).
    expect(copy.getAttribute("aria-describedby")).toBe(reason.id);
    expect(reason.id).toBeTruthy();
    Object.defineProperty(navigator, "clipboard", { value: original, configurable: true });
  });
});

describe("접근성", () => {
  it("뉴트럴 색조/강도가 aria-pressed와 그룹 라벨을 갖는다", () => {
    render(<ColorPalettePage />);
    const tintGroup = screen.getByRole("group", { name: "뉴트럴 색조" });
    const pressed = Array.from(tintGroup.querySelectorAll("[aria-pressed]"))
      .filter((b) => b.getAttribute("aria-pressed") === "true");
    expect(pressed.length).toBe(1);
    expect(screen.getByRole("group", { name: "강도" })).toBeTruthy();
  });

  // 뱃지는 hover 프리뷰까지 반영해 스와치를 스칠 때마다 바뀐다. 그대로 live면
  // 스크린리더 스팸이 되므로, 요약은 확정 팔레트(scales) 기준으로 따로 낸다 —
  // "hover는 미리보기일 뿐 확정이 아니다"라는 이 화면의 계약을 통지에도 적용한다.
  it("대비 요약이 status이고 hover 프리뷰에 흔들리지 않는다", () => {
    render(<ColorPalettePage />);
    const status = screen.getByRole("status");
    const before = status.textContent;
    expect(before).toMatch(/대비 미달/);

    fireEvent.click(screen.getAllByTestId("swatch")[3]);
    const candidate = screen.getAllByTestId("candidate")[0];
    fireEvent.mouseEnter(candidate);
    expect(screen.getByRole("status").textContent).toBe(before);
  });

  it("프리뷰 라이트/다크 라벨이 목업 바깥에 있다", () => {
    render(<ColorPalettePage />);
    const light = screen.getByText("라이트");
    expect(screen.getByTestId("mock-light").contains(light)).toBe(false);
  });
});
