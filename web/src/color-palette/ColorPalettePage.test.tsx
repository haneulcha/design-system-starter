import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act, within } from "@testing-library/react";
import { onSolidColor } from "@core/color/contrast.js";
import { ColorPalettePage } from "./ColorPalettePage";
import { roleLabel } from "./contrastTriage";
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
  // 선택지가 하나뿐이라는 사실 자체가 "여기는 고를 게 없다"는 정보다.
  // 2026-08-30 D7-2로 사이클 3 D9를 부분 개정: "왜 고를 게 없나"(조작 사실)는
  // 이제 문구로도 싣는다 — 라디오 1개만 남는 화면은 정보가 아니라 고장으로
  // 읽혔다(실측).
  it("collapses all three candidates at stop 3 into one, with a reason", () => {
    render(<ColorPalettePage />);
    fireEvent.click(screen.getAllByRole("button", { name: /조정/ })[1]); // stop 3
    expect(screen.getAllByRole("radio").length).toBe(1);
    expect(screen.getByText("이 앵커에서는 클램프로 후보 폭이 좁아 선택지가 겹칩니다")).toBeTruthy();
  });

  // stop 7(700)은 pin을 고른 적이 없어도 곡선이 이미 어떤 색을 그리고 있다 —
  // 그 자리를 아무도 체크하지 않으면 "지금 뭐가 적용 중인지" 알 수 없다(D7-1
  // 수정 전 실측: 0/3). getAllByTestId("swatch")[7]은 accent 11-stop 띠의
  // stop-index 7과 DOM 순서가 그대로 일치한다(다른 "swatch[7]" 단언들과 동일 — 이
  // 파일의 line 154 참고로 실측).
  it("pin이 없어도 현재 적용 중인 후보가 체크된다", () => {
    render(<ColorPalettePage />);
    fireEvent.click(screen.getAllByTestId("swatch")[7]); // stop 700
    const checked = screen.getAllByRole("radio").filter((r) => (r as HTMLInputElement).checked);
    expect(checked.length).toBe(1);
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

  // I-3 리뷰 수정 확인: radio[1]("균형")은 D7-1 수정 이후 곡선 기본값과 정확히
  // 일치해 열 때부터 이미 checked다. checked가 change로만 커밋되면 이미
  // checked인 라디오를 다시 눌러도 아무 일도 안 일어나는 죽은 클릭이 된다 —
  // "곡선 기본값을 명시적으로 pin해서 고정"할 방법도 사라진다. click에도
  // 커밋을 걸어(CandidatePopover 참조) 이미 checked인 라디오도 확정·닫힘이
  // 일어나야 한다.
  it("commits even when clicking the already-checked (curve default) radio", () => {
    render(<ColorPalettePage />);
    fireEvent.click(screen.getAllByRole("button", { name: /조정/ })[0]);
    const radios = screen.getAllByRole("radio") as HTMLInputElement[];
    expect(radios[1].checked).toBe(true); // 열 때부터 이미 checked
    fireEvent.click(radios[1]);
    expect(window.location.search).toContain("s0="); // 명시적으로 pin됐다
    expect(screen.queryByRole("dialog")).toBeNull(); // 팝오버도 닫혔다
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
  // 뱃지는 roleId를 생으로 안 찍고 엔진(SCALE_ROLES)의 라벨을 쓴다.
  it("shows the on-solid miss for the default blue accent", () => {
    render(<ColorPalettePage />);
    const badges = screen.getAllByTestId("contrast-badge").map((el) => el.textContent ?? "");
    expect(badges.some((t) => t.includes("솔리드 위 글자") && t.includes("3.6"))).toBe(true);
  });

  // 경고 스케일의 text/라이트 검사는 subtle-bg 대·page 대 두 번 뜬다 — against가
  // 안 찍히면 숫자만 다른 채로 겹쳐 보여 사용자가 버그로 읽는다(Finding 2a).
  it("labels which background each duplicate-looking badge was measured against", () => {
    render(<ColorPalettePage />);
    const badges = screen.getAllByTestId("contrast-badge").map((el) => el.textContent ?? "");
    // roleId "text"는 이제 엔진 라벨 "텍스트 (링크)"로 찍힌다 — "진한 텍스트"(text-strong)와
    // 겹치지 않는 유일한 부분 문자열이라 이걸로 골라야 role이 섞이지 않는다.
    const warningTextLight = badges.filter(
      (t) => t.includes("경고") && t.includes("텍스트 (링크)") && t.includes("라이트"),
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
    const accentOnSolid = badges.find((t) => t.includes("솔리드 위 글자"))!;
    expect(warningBadge).toContain("고정");
    expect(accentOnSolid).not.toContain("고정");
  });

  // 기본 파랑에서 success/text-strong/라이트/page는 4.495681로 AA(4.5) 미달인데
  // toFixed(2)로 반올림하면 4.50이 되어 기준을 충족한 것처럼 보인다(Finding 2c).
  it("never rounds a failing ratio up to the passing threshold", () => {
    render(<ColorPalettePage />);
    const badges = screen.getAllByTestId("contrast-badge").map((el) => el.textContent ?? "");
    const successStrong = badges.find(
      (t) => t.includes("성공") && t.includes("진한 텍스트") && t.includes("페이지 배경"),
    );
    expect(successStrong).toBeDefined();
    expect(successStrong).toContain("4.49");
    expect(badges.every((t) => !t.includes("4.50"))).toBe(true);
  });

  // "고칠 수 있는가"(triageChecks)로 가른다 — "스케일을 손댈 수 있는가"(adjustable)가
  // 아니다 (스펙 D4). accent on-solid는 스케일이 accent라 adjustable=true이지만
  // 엔진의 onSolidWarning이 "stop을 옮겨 고칠 수 없다"고 못 박아서 suggestRoleShifts가
  // 절대 이걸 제안하지 않는다 — 그래서 기본 팔레트는 10건 전부가 "고칠 수 없는 것"이다
  // (실행해서 확인한 값: fixable 0, unfixable 10).
  const UNFIXABLE_SUMMARY =
    "고칠 수 없는 미달 10건 — 상태색은 고정 앵커, 솔리드 위 글자는 관례값이라 이 화면에서 못 바꿉니다";

  it("collapses the unfixable-failure badges behind a summary with the right count", () => {
    render(<ColorPalettePage />);
    const summary = screen.getByText(UNFIXABLE_SUMMARY);
    expect(summary.tagName).toBe("SUMMARY");
    expect(summary.closest("details")?.hasAttribute("open")).toBe(false);
  });

  // 10건 모두 "고칠 수 없는 것"에 들어가지만, "고정"(adjustable=false) 꼬리표는
  // 스케일 소유권 별개 축이라 여전히 9건에만 붙는다 — accent/on-solid만 스케일이
  // accent(adjustable=true)라 꼬리표가 없다.
  it("lists all ten unfixable badges inside the collapsed group, nine of them tagged fixed", () => {
    render(<ColorPalettePage />);
    const summary = screen.getByText(UNFIXABLE_SUMMARY);
    const details = summary.closest("details")!;
    const badgesInside = Array.from(details.querySelectorAll('[data-testid="contrast-badge"]'));
    expect(badgesInside.length).toBe(10);
    const tagged = badgesInside.filter((el) => (el.textContent ?? "").includes("고정"));
    expect(tagged.length).toBe(9);
    // 개수만 9/10이면 엉뚱한 뱃지가 꼬리표를 잃어도 통과한다 — 꼬리표 없는
    // 그 한 건이 정확히 accent on-solid임을 지목해야 원래 단언 강도(옛
    // every(includes("고정")))가 잡던 걸 되찾는다(리뷰 M-7). accent on-solid만
    // 스케일이 accent라 adjustable=true라서 "고정" 꼬리표가 안 붙는다 — 나머지
    // 9건은 상태색(warning·success·error·info) 스케일이라 adjustable=false.
    const untagged = badgesInside.filter((el) => !(el.textContent ?? "").includes("고정"));
    expect(untagged.length).toBe(1);
    expect(untagged[0].textContent).toContain("솔리드 위 글자");
  });

  // 기본 팔레트는 고칠 수 있는 게 0건이므로 접힌 그룹 밖에는 아무 뱃지도 남지 않는다 —
  // 예전엔 accent on-solid가 "조정 가능"으로 분류돼 밖에 남았지만, 그건 못 고치는데
  // 대책 없이 맨 위에 뜨는 위계 오류였다(스펙 D4의 핵심 문제).
  it("leaves no badges outside the collapsed group when nothing is fixable", () => {
    render(<ColorPalettePage />);
    const summary = screen.getByText(UNFIXABLE_SUMMARY);
    const details = summary.closest("details")!;
    const allBadges = screen.getAllByTestId("contrast-badge");
    const outside = allBadges.filter((el) => !details.contains(el));
    expect(outside.length).toBe(0);
  });

  // 기본 파랑은 fixable이 항상 0이라 `fixable.map(...)` 렌더 경로(접힘 밖 뱃지
  // 목록)를 한 번도 실행 안 하고도 스위트가 전부 통과할 수 있었다(리뷰 I-1) —
  // 그 슬롯을 fixable을 아예 <details> 안에 넣어버리거나 헤드라인이 항상 0을
  // 찍는 배선 버그가 나도 안 잡힌다는 뜻이다. eab308은 고칠 수 있는 게 있는
  // 상태라 이 경로를 실제로 태운다 — 아래 개수·문구는 실행해서 확인한 값이다.
  it("renders the fixable badges outside the collapsed group for an accent with a real fix", () => {
    window.history.replaceState({}, "", "/color-palette?v=1&a=eab308");
    render(<ColorPalettePage />);
    expect(screen.getByRole("status").textContent).toBe("고칠 수 있는 대비 미달 4건");

    const allBadges = screen.getAllByTestId("contrast-badge");
    expect(allBadges.length).toBe(13);

    const details = document.querySelector("details")!;
    const outside = allBadges.filter((el) => !details.contains(el));
    const outsideText = outside.map((el) => el.textContent ?? "");
    expect(outsideText).toEqual([
      "⚠ 액센트 텍스트 (링크) (라이트 · 은은한 배경) 2.61 / 4.5",
      "⚠ 액센트 텍스트 (링크) (라이트 · 페이지 배경) 2.67 / 4.5",
      "⚠ 액센트 진한 텍스트 (라이트 · 은은한 배경) 3.98 / 4.5",
      "⚠ 액센트 진한 텍스트 (라이트 · 페이지 배경) 4.07 / 4.5",
    ]);
    // fixable 뱃지는 "고정" 꼬리표가 없다 — accent 스케일이라 adjustable=true.
    expect(outsideText.every((t) => !t.includes("고정"))).toBe(true);

    const inside = allBadges.filter((el) => details.contains(el));
    expect(inside.length).toBe(9);
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

// 2026-08-30 리뷰(C-1): checked가 argmin이 아니라 "정확 일치 있으면 정확 일치,
// 없으면 TOLERANCE 근사"라는 2단 판정이었을 때, pin이 다른 stop의 문맥 변화로
// 후보 집합 밖으로 밀려나면(=정확 일치가 사라지면) 근사 폴백이 발동했고, 그
// 폴백은 "허용치 안의 후보 전부"를 참으로 만들어 같은 name의 라디오 그룹에
// checked가 둘 이상 생겼다. 실측 스윕(2-pick 시퀀스 42,300건): multi-checked
// 144건(0.34%), zero-checked 4,449건(10.5%) — 검증에 쓴 6액센트×4stop=24조합만
// 보면 0건이라 그 스윕 없이는 못 잡는다. pickCurrent를 argmin으로 바꿔 구조적으로
// 막았다(candidateMatch.ts 참조) — 아래는 그 반증 시퀀스를 그대로 고정한 회귀
// 테스트와, "checked는 항상 0개 또는 1개"라는 불변식 자체를 박은 테스트다.
describe("후보 팝오버 — checked 유일성 (리뷰 C-1)", () => {
  function openStop(stopIndex: 0 | 1 | 2 | 3) {
    fireEvent.click(screen.getAllByRole("button", { name: /조정/ })[stopIndex]);
  }
  function checkedRadios() {
    return screen
      .getAllByRole("radio")
      .filter((r) => (r as HTMLInputElement).checked);
  }

  // 리뷰어가 실제 컴포넌트로 재현한 그 시퀀스. 고치기 전엔 재열기 시점에
  // radio 2개가 동시에 checked였고, 둘 다 클릭해도 URL이 안 바뀌고 팝오버도
  // 안 닫히는 완전히 죽은 팝오버였다.
  it("stop 300 pin → stop 50 pin → stop 300 재열기에서도 checked는 하나뿐이다", () => {
    render(<ColorPalettePage />);
    fireEvent.change(screen.getByLabelText("액센트 hex"), { target: { value: "#de297b" } });

    openStop(1); // stop 3(300)
    fireEvent.click(screen.getAllByRole("radio")[0]); // "차분한" — 팝오버 자동으로 닫힘

    openStop(0); // stop 0(50)
    fireEvent.click(screen.getAllByRole("radio")[0]); // "중립적"

    openStop(1); // stop 3(300) 재열기 — 문맥(stop 50 pin)이 바뀐 채 다시 계산됨
    expect(checkedRadios().length).toBeLessThanOrEqual(1);

    // 죽은 팝오버가 아니라는 것도 함께 확인한다: 아무 라디오나 눌러도 커밋되고 닫힌다.
    fireEvent.click(screen.getAllByRole("radio")[0]);
    expect(window.location.search).toContain("s3=");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  // 위 시퀀스 하나로는 "우연히 안 걸린 조합"과 "구조적으로 안 걸리는 조합"을
  // 구별 못 한다 — 여러 액센트 × pin 순서 조합을 훑어 불변식 자체를 확인한다.
  // 전수 스윕(리뷰의 42,300건)은 여기서 재현하지 않는다 — argmin의 유일성은
  // candidateMatch.test.ts에서 순수 함수로 이미 증명돼 있고, 여기서는 실제
  // 컴포넌트 배선이 그 보장을 깨지 않는지만 표본으로 확인한다.
  it("checked는 액센트·pin 조합을 바꿔도 항상 0개 또는 1개다", () => {
    const accents = ["#3b82f6", "#de297b", "#f5d90a"];
    const stopButtonIndex = [0, 1, 2, 3] as const; // stop 0, 3, 7, 10
    // 순서쌍 전체(4×3=12)가 아니라 짝없는 쌍(6개)만 — pinFirst/pinSecond를
    // 맞바꾼 두 순서는 "문맥이 바뀐 채 재계산된다"는 같은 실패 모드를 검사하므로
    // 표본 하나면 충분하고, 전부 돌리면 렌더 60회로 테스트가 무거워진다.
    const pairs: readonly [0 | 1 | 2 | 3, 0 | 1 | 2 | 3][] = [
      [0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3],
    ];

    for (const accentHex of accents) {
      for (const [pinFirst, pinSecond] of pairs) {
        const { unmount } = render(<ColorPalettePage />);
        fireEvent.change(screen.getByLabelText("액센트 hex"), { target: { value: accentHex } });

        openStop(pinFirst);
        fireEvent.click(screen.getAllByRole("radio")[0]);

        openStop(pinSecond);
        fireEvent.click(screen.getAllByRole("radio")[0]);

        // pin 두 개를 심은 뒤 조정 가능한 stop 전부를 다시 열어 checked를 잰다.
        for (const reopen of stopButtonIndex) {
          openStop(reopen);
          expect(checkedRadios().length).toBeLessThanOrEqual(1);
          fireEvent.click(screen.getAllByRole("button", { name: /조정/ })[reopen]); // 닫기(토글)
        }
        unmount();
      }
    }
  }, 20000);
});

// 2026-08-30 재리뷰(R-2): argmin은 후보가 있기만 하면 무조건 승자를 낸다 —
// target(pin)이 문맥 변화로 후보 집합에서 아주 멀리 밀려나도 "가장 덜 먼" 후보를
// "지금 적용 중"으로 표시했다. 실측(액센트 180종 스윕)에서 승자 거리가 최대
// 55(체비셰프)까지 벌어졌다 — 색 도구가 눈에 띄게 다른 색을 "적용 중"이라고
// 가리키면 안 된다. 아래는 그 실제 사례를 그대로 재현한다: 액센트 #e2e236,
// stop 3(300)에 URL로 직접 pin(#f4f23c)을 심으면 이 문맥에서 재계산되는 후보
// 셋(#edefa2·#eff18c·#f0f174) 전부가 이 pin과 56 이상 떨어져 있다(직접 확인).
describe("후보 팝오버 — 후보 밖 (리뷰 R-2)", () => {
  it("target이 모든 후보와 MAX_DISTANCE보다 멀면 체크 없이 '후보 밖'을 말한다", () => {
    window.history.replaceState({}, "", "/color-palette?v=1&a=e2e236&s3=f4f23c");
    render(<ColorPalettePage />);
    fireEvent.click(screen.getAllByRole("button", { name: /조정/ })[1]); // stop 3

    const radios = screen.getAllByRole("radio") as HTMLInputElement[];
    expect(radios.length).toBeGreaterThan(0); // 후보 자체는 있다
    expect(radios.some((r) => r.checked)).toBe(false); // 그중 어느 것도 "이거다"는 아니다
    expect(screen.getByText("지금 색은 이 앵커의 후보에 없습니다")).toBeTruthy();
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
      // text-2xs도 잡는다 — global.css의 --text-2xs는 10px이고 다른 화면 34곳에서
      // 쓰이는 흔한 이름이라, arbitrary value만 보면 이 클래스가 들어와도 초록이다.
      return /text-\[(9|10|11)px\]|\btext-2xs\b/.test(el.getAttribute("class") ?? "");
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
  // 3.3 D3의 "번호 붙은 스테이지 제목"을 뒤집는다 — 걷는 것은 **시각 노출과
  // 번호**뿐이고 h2 셋의 존재·순서는 유지한다(스펙 D1). 이 화면은 나가는
  // 링크가 0인 막다른 골목이라(직전 스펙 비-목표) 구조 신호를 더 잃으면
  // 스크린리더에 평면만 남는다. 순서가 곧 사용 순서라는 3.3 D3의 주장은
  // 제목이 아니라 간격 위계(아래 테스트)가 계속 진다.
  it("h1은 생성기이고, h2 셋은 sr-only로 남는다", () => {
    render(<ColorPalettePage />);
    const h1 = screen.getAllByRole("heading", { level: 1 });
    expect(h1.length).toBe(1);
    expect(h1[0].textContent).toBe("컬러 팔레트 생성기");

    const h2 = screen.getAllByRole("heading", { level: 2 });
    expect(h2.length).toBe(3);
    // 번호(①②③)는 시각에서 사라지므로 sr-only 문구에서도 뗀다 — 스크린리더
    // 사용자만 "①"을 듣는 비대칭을 만들지 않는다.
    expect(h2.map((h) => h.textContent)).toEqual([
      "앵커 정하기",
      "만들어진 팔레트",
      "받기",
    ]);
    for (const h of h2) expect(h.className).toContain("sr-only");
  });

  // "액센트"만 걷고 "뉴트럴"·"상태색"은 남긴다 — 첫 띠가 액센트라는 것은
  // 위(피커 카드)와 아래(뉴트럴 라벨)로 결정되지만, 뒤의 둘은 위치만으로
  // 안 갈린다(스펙 D1).
  it("액센트 라벨은 없고 뉴트럴·상태색 라벨은 남는다", () => {
    render(<ColorPalettePage />);
    expect(screen.queryByText("액센트")).toBeNull();
    expect(screen.getByText("뉴트럴")).toBeTruthy();
    expect(screen.getByText("상태색")).toBeTruthy();
  });

  // 걷어낸 제목이 지던 "여기부터 다른 단계"를 간격이 진다. 값 셋만 쓴다:
  // 12 = 입력과 그 결과 / 16 = 이웃 블록 / 32 = 다른 덩어리 (스펙 D1).
  // main의 기본 rowGap을 **가장 좁은 값**으로 두고 넓히는 자리만 명시적으로
  // 올린다 — 넓은 기본값에 좁히는 예외를 다는 것보다 어긋날 자리가 적다.
  it("간격 위계가 12/16/32다 (스펙 D1)", () => {
    render(<ColorPalettePage />);
    const main = screen.getByRole("main") as HTMLElement;
    expect(main.style.rowGap).toBe("var(--ds-space-sm)");
    expect(main.style.columnGap).toBe("var(--ds-space-xl)");
    // h1 → 피커 카드는 "다른 덩어리"라 좁은 기본값을 덮는다.
    expect((screen.getAllByRole("heading", { level: 1 })[0] as HTMLElement).style.marginBottom)
      .toBe("var(--ds-space-md)");
    // ② 안: 액센트 띠 ↔ 뉴트럴 블록 = 다른 덩어리.
    expect((screen.getByTestId("palette-section") as HTMLElement).style.gap)
      .toBe("var(--ds-space-xl)");
    // ② → ③ 받기도 다른 덩어리 — main의 12에 20을 더해 32를 만든다.
    expect((screen.getByTestId("download-section") as HTMLElement).style.marginTop)
      .toBe("var(--ds-space-xs)");
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
    expect(swatches[22].className).toContain("h-5");
    expect(swatches[65].className).toContain("h-5");
  });

  // 사람이 승인한 4번째 나사(D3) — 세로 예산 성공(887.36px)이 전적으로 이
  // grid-cols-2에 걸려 있는데, 지금까지는 지워도 아무것도 안 깨졌다.
  // D1(사이클 4)에서 lg 전용으로 좁혔다 — 390px에서 2×2를 그대로 두면 스톱당
  // 폭이 ~7px가 되어 사이클 3 D7 "얇게 노출"의 목적이 그 자리에서 죽는다.
  it("상태색 4벌이 lg에서 2×2 그리드로 감싸여 있다", () => {
    render(<ColorPalettePage />);
    const section = screen.getByTestId("semantic-section");
    const grid = section.querySelector('[class*="lg:grid-cols-2"]');
    expect(grid).toBeTruthy();
  });

  // 스펙 D9 — stop 50(index 0)은 칩 자체에 색 신호가 없어 테두리만 한 단계
  // 올린다. boundaryEmphasis=[0] 배선이 실제로 그 인덱스에만 적용되는지 고정한다.
  it("액센트 stop 0만 테두리가 neutral-400으로 강화돼 있다", () => {
    render(<ColorPalettePage />);
    const swatches = screen.getAllByTestId("swatch");
    expect(swatches[0].className).toContain("border-neutral-400");
    expect(swatches[1].className).not.toContain("border-neutral-400");
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

  // 현행은 opacity 40%로 죽어만 있고 이유가 없다
  // (`DownloadRow`의 CSS 복사 버튼, `disabled:opacity-40` 클래스).
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

describe("복사 피드백 (스펙 D8)", () => {
  const original = Object.getOwnPropertyDescriptor(navigator, "clipboard");
  const stub = (writeText: () => Promise<void>) =>
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });

  afterEach(() => {
    // jsdom에서 navigator.clipboard는 own/inherited 프로퍼티로 원래 존재하지 않는다.
    // Object.getOwnPropertyDescriptor는 항상 undefined를 반환하므로, original도
    // undefined다. 따라서 if (original)은 거짓이 되어 defineProperty 경로는 작동하지
    // 않는다 — original이 있을 때만 복원하는 로직은 원상태(프로퍼티 부재)를 영구히 못
    // 복원한다. 스텁이 남으면 나중 테스트가 조용히 깨지는 시한폭탄이다. 원래 상태를
    // 정확히 복원하려면 original이 없을 때는 deleteProperty로 제거해야 한다.
    if (original) {
      Object.defineProperty(navigator, "clipboard", original);
    } else {
      delete (navigator as unknown as Record<string, unknown>).clipboard;
    }
  });

  it("CSS 복사 성공이 통지된다", async () => {
    stub(() => Promise.resolve());
    render(<ColorPalettePage />);
    fireEvent.click(screen.getByRole("button", { name: /CSS 복사/ }));
    // 라이브 리전(role="status")에서 성공 문구를 찾는다 — 버튼 라벨과 구분.
    await waitFor(() => {
      const statusElements = screen.queryAllByRole("status");
      const found = statusElements.some(el => el.textContent?.includes("복사되었습니다"));
      expect(found).toBe(true);
    });
  });

  it("CSS 복사 실패도 통지된다", async () => {
    // 성공만 처리하면 실패가 조용해져서 지금(void로 버리는 것)과 같아진다.
    stub(() => Promise.reject(new Error("denied")));
    render(<ColorPalettePage />);
    fireEvent.click(screen.getByRole("button", { name: /CSS 복사/ }));
    // 라이브 리전(role="status")에서 실패 문구를 찾는다.
    await waitFor(() => {
      const statusElements = screen.queryAllByRole("status");
      const found = statusElements.some(el => el.textContent?.includes("복사하지 못했습니다"));
      expect(found).toBe(true);
    });
  });

  // 원복이 실제로 되는지 검증 — 스텁이 영구히 남아서 나중 테스트가 깨지는 사태를 막는다.
  it("afterEach가 navigator.clipboard를 원래 상태(undefined)로 복원한다", async () => {
    stub(() => Promise.resolve());
    render(<ColorPalettePage />);
    // 이 시점에서 clipboard는 stub { writeText: [Function] }
    expect(typeof navigator.clipboard).toBe("object");
  });
  // 위 테스트가 afterEach를 지나 아래에 도달했다면, clipboard가 원복되었다는 뜻.
  it("afterEach 후 clipboard가 삭제됐음을 확인한다", () => {
    expect(navigator.clipboard).toBeUndefined();
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

  // 액센트는 피커(위) → 띠(아래)인데 뉴트럴만 반대였다 — 같은 화면에서 같은
  // 관계가 두 방향으로 그려졌다. 둘 다 "입력 → 결과"로 맞춘다(스펙 D2).
  it("뉴트럴 컨트롤이 뉴트럴 띠보다 앞에 온다 (스펙 D2)", () => {
    render(<ColorPalettePage />);
    const block = screen.getByTestId("neutral-section");
    const control = block.querySelector('[role="group"][aria-label="뉴트럴 색조"]')!;
    const strip = block.querySelector('[data-testid="swatch"]')!;
    expect(control).toBeTruthy();
    expect(strip).toBeTruthy();
    // DOCUMENT_POSITION_FOLLOWING = strip이 control 뒤에 온다.
    expect(control.compareDocumentPosition(strip) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy();
  });

  // 라벨은 각각 두 글자인데 칩 위에 한 줄씩 앉아 세로 2행을 먹고 있었다.
  // 같은 행으로 내리면 그 2행이 통째로 사라진다(스펙 D2).
  it("색조·강도 라벨이 칩과 같은 행에 있다 (스펙 D2)", () => {
    render(<ColorPalettePage />);
    for (const [label, groupName] of [["색조", "뉴트럴 색조"], ["강도", "강도"]] as const) {
      const group = screen.getByRole("group", { name: groupName });
      const row = group.parentElement!;
      expect(row.className).toContain("flex");
      expect(row.textContent).toContain(label);
    }
  });

  // "자동으로"(되돌리기) 버튼은 두 자리 중 하나에 산다: 보통은 강도 행 안에,
  // 무채색 틴트에서는 강도 행 자체가 사라지므로 따로 한 줄로. 무채색 분기를
  // 지우면(예: "중복 버튼 정리" 리팩터) 강도 행이 없는 상태에서 되돌릴 길이
  // 통째로 사라져 자동 스냅으로 못 돌아가는 함정이 된다 — 이 테스트는 그
  // 분기 하나만 지워도 실패한다. state.tint는 칩을 눌러야 채워지므로(자동
  // 스냅 중엔 null) 실제 UI로 칩을 눌러 도달한다.
  it("자동으로 버튼은 무채색이든 아니든 항상 갈 곳이 있다", () => {
    render(<ColorPalettePage />);

    // 무채색: 강도 행이 없고, "자동으로"는 독립된 줄로 뜬다.
    fireEvent.click(screen.getByRole("button", { name: /무채색/ }));
    expect(screen.queryByRole("group", { name: "강도" })).toBeNull();
    expect(screen.getByRole("button", { name: "자동으로" })).toBeTruthy();

    // 비무채색: 강도 행이 있고, "자동으로"는 그 행 안에 있다.
    fireEvent.click(screen.getByRole("button", { name: /웜 그레이/ }));
    const strengthGroup = screen.getByRole("group", { name: "강도" });
    const strengthRow = strengthGroup.parentElement!;
    expect(strengthRow.contains(screen.getByRole("button", { name: "자동으로" }))).toBe(true);
  });

  // 뱃지는 hover 프리뷰(shownScales)까지 반영해 스와치를 스칠 때마다 바뀐다.
  // 헤드라인은 그 뱃지 목록과 별개로 확정 팔레트(scales) 기준으로 낸다 —
  // "hover는 미리보기일 뿐 확정이 아니다"라는 이 화면의 계약을 헤드라인 자체의
  // role="status"에도 적용한다(별도 sr-only 요약은 없다, 3.3 D8-2 개정).
  //
  // 기본 파랑(shifts=[])을 쓰면 fixable count가 무엇을 넣어도 구조적으로 항상
  // 0이라 "always 0으로 무너지는 회귀"를 못 잡는다(리뷰 I-2) — eab308(고칠 수
  // 있는 게 4건, 실행해서 확인한 값)을 써서 헤드라인이 비영(非零)임을 먼저
  // 고정한다.
  it("대비 요약이 status이고 hover 프리뷰에 흔들리지 않는다", () => {
    window.history.replaceState({}, "", "/color-palette?v=1&a=eab308");
    render(<ColorPalettePage />);
    const status = screen.getByRole("status");
    const before = status.textContent;
    expect(before).toBe("고칠 수 있는 대비 미달 4건");

    fireEvent.click(screen.getAllByTestId("swatch")[3]);
    const candidate = screen.getAllByTestId("candidate")[0];
    fireEvent.mouseEnter(candidate);
    expect(screen.getByRole("status").textContent).toBe(before);
  });

  // 위 테스트는 eab308에서 hover 가능한 모든 후보를 실행해서 확인한 결과 실제
  // 대비 판정이 바뀌는 후보가 하나도 없다 — 그래서 "요약이 checks(hover 반영)
  // 기준으로 되돌아가는" 회귀는 위 테스트만으로는 못 잡는다. #22c55e·stop
  // 10("더 깊게" 후보, "applies the fix from the confirmed palette" 테스트가
  // 이미 이 조합으로 hover가 실제 판정을 바꾼다는 걸 증명해 둔 자리다)는 그
  // 회귀에 이빨이 있는 걸 실행해서 확인했다: 헤드라인 계산을 summaryChecks
  // 대신 checks로 바꾸면 이 hover에서 "4건" → "2건"으로 실제로 움직인다.
  it("고칠 수 있는 개수가 실제로 요동칠 수 있는 후보를 hover해도 헤드라인은 확정 값에 고정된다", () => {
    window.history.replaceState({}, "", "/color-palette?v=1&a=22c55e");
    render(<ColorPalettePage />);
    const before = screen.getByRole("status").textContent;
    expect(before).toBe("고칠 수 있는 대비 미달 4건");

    fireEvent.click(screen.getAllByRole("button", { name: /조정/ })[3]); // stop 10
    fireEvent.mouseEnter(screen.getAllByRole("radio")[1]); // "더 깊게"
    expect(screen.getByRole("status").textContent).toBe(before);
  });

  it("프리뷰 라이트/다크 라벨이 목업 바깥에 있다", () => {
    render(<ColorPalettePage />);
    const light = screen.getByText("라이트");
    expect(screen.getByTestId("mock-light").contains(light)).toBe(false);
  });
});

describe("경고 ↔ 목업 강조 (스펙 D3, 2026-08-30 개정)", () => {
  // 리뷰 C-1로 /텍스트/ → /진한 텍스트/로 좁혔다. "액센트 텍스트 (링크)"와
  // "액센트 진한 텍스트" 둘 다 "텍스트"를 부분 문자열로 포함하는데, text(링크)는
  // 공유 버튼의 어떤 stop과도 안 겹쳐 mockTargetFor가 null을 낸다(#00a3a3
  // 반증: 텍스트(링크)만 실패·진한 텍스트는 통과인데 공유 버튼이 켜지면 거짓을
  // 가리키는 셈이다). "진한 텍스트"만 골라야 실제로 배선된 뱃지를 잡는다.
  it("고칠 수 있는 경고에 hover하면 목업 요소가 강조된다", () => {
    render(<ColorPalettePage />);
    // hex 입력으로 노란 액센트를 만든다 — 기본 파랑은 fixable이 0건이라
    // 강조할 대상 자체가 없다.
    fireEvent.change(screen.getByLabelText("액센트 hex"), { target: { value: "#f5d90a" } });

    const badges = screen.getAllByTestId("contrast-badge");
    const fixable = badges.find((b) => /진한 텍스트/.test(b.textContent ?? ""));
    expect(fixable).toBeTruthy();

    fireEvent.mouseEnter(fixable!);
    const share = screen.getByTestId("mock-light").querySelector('[data-mock-target="share-btn"]');
    expect(share?.getAttribute("data-highlighted")).toBe("true");

    fireEvent.mouseLeave(fixable!);
    expect(share?.getAttribute("data-highlighted")).toBeNull();
  });

  // S-1: 배선 기준이 fixable → target != null로 바뀌었다. accent/on-solid은
  // triageChecks가 구조적으로 항상 unfixable로 보내는데(suggestRoleShifts가
  // TEXT_ROLES에만 제안한다) 목업엔 대응 요소(보고서 열기)가 있다 — D3의
  // 대표 사례가 기본 팔레트(#3b82f6)에서 바로 이 케이스다. "고정" 꼬리표가
  // 안 붙은 걸로 accent 소유(다른 상태색의 on-solid과 구분)를 확인한다.
  it("고칠 수 없어도 대응 요소가 있으면 강조된다 — 액센트 on-solid → 보고서 열기", () => {
    render(<ColorPalettePage />);
    const badges = screen.getAllByTestId("contrast-badge");
    const onSolid = badges.find(
      (b) => /솔리드 위 글자/.test(b.textContent ?? "") && !/고정/.test(b.textContent ?? ""),
    );
    expect(onSolid).toBeTruthy();

    fireEvent.mouseEnter(onSolid!);
    const solidBtn = screen.getByTestId("mock-light").querySelector('[data-mock-target="solid-btn"]');
    expect(solidBtn?.getAttribute("data-highlighted")).toBe("true");

    fireEvent.mouseLeave(onSolid!);
    expect(solidBtn?.getAttribute("data-highlighted")).toBeNull();
  });

  // M-4: onFocus/onBlur(키보드 경로)도 onMouseEnter/onMouseLeave와 같은
  // 상태를 올려야 한다 — 마우스로만 테스트하면 tabIndex를 단 이유가 검증
  // 안 된 채로 남는다.
  it("키보드 포커스로도 강조된다 (onFocus/onBlur)", () => {
    render(<ColorPalettePage />);
    const badges = screen.getAllByTestId("contrast-badge");
    const onSolid = badges.find(
      (b) => /솔리드 위 글자/.test(b.textContent ?? "") && !/고정/.test(b.textContent ?? ""),
    )!;

    fireEvent.focus(onSolid);
    const solidBtn = screen.getByTestId("mock-light").querySelector('[data-mock-target="solid-btn"]');
    expect(solidBtn?.getAttribute("data-highlighted")).toBe("true");

    fireEvent.blur(onSolid);
    expect(solidBtn?.getAttribute("data-highlighted")).toBeNull();
  });

  // M-3: "안 붙는다"를 data-highlights 부재만으로 보이면 실제 hover 시 아무
  // 것도 안 켜지는지는 증명하지 못한다. target === null인 뱃지(상태색
  // text 등)를 실제로 hover해서 두 목업 어디에도 강조가 안 뜨는지 확인한다.
  //
  // unwired 집합은 배선(data-highlights 유무)이 아니라 라벨로 고른다 — 배선
  // 자체로 고르면 "wired가 아닌 것 == data-highlights가 없는 것"이 되어
  // 이 테스트가 증명하려는 바(그 집합이 실제로 켜지지 않는다)를 이미 선택
  // 기준 안에 넣는 순환 논증이 된다(리뷰 fix-round-1 #1) — 그러면
  // adjustable 조건이 잘못 좁아져 있어야 할 뱃지가 unwired로 새는 회귀를
  // 이 테스트가 원리적으로 못 잡는다. roleLabel("text")("텍스트 (링크)")는
  // 매핑과 독립적으로 참인 사실이다 — mockTargetFor는 어떤 스케일의 text
  // 역할도 절대 배선하지 않는다(mockTargets.ts: text-strong의 TEXT_ROLES
  // 짝이지만 다른 stop이라 목업에 그 stop을 쓰는 요소가 없다).
  it("대응 요소가 없는 경고는 실제로 hover해도 아무 것도 안 켜진다", () => {
    render(<ColorPalettePage />);
    const details = screen.getByText(/고칠 수 없는 미달/).closest("details")!;
    const inside = Array.from(details.querySelectorAll('[data-testid="contrast-badge"]'));
    const unwired = inside.filter((b) => (b.textContent ?? "").includes(roleLabel("text")));
    expect(unwired.length).toBeGreaterThan(0);

    unwired.forEach((b) => {
      expect(b.getAttribute("data-highlights")).toBeNull();
      fireEvent.mouseEnter(b);
      const anyHighlighted = document.querySelectorAll('[data-highlighted="true"]');
      expect(anyHighlighted.length).toBe(0);
      fireEvent.mouseLeave(b);
    });
  });

  // 라이트 목업에서 켠 강조가 다크 목업에도 뜨는지 — hoveredTarget이 두 Mock
  // 인스턴스에 공유된 하나의 상태임을 실제로 검증한다.
  it("한쪽 목업에서 켠 강조가 다른 쪽 목업에도 뜬다", () => {
    render(<ColorPalettePage />);
    fireEvent.change(screen.getByLabelText("액센트 hex"), { target: { value: "#f5d90a" } });
    const badges = screen.getAllByTestId("contrast-badge");
    const fixable = badges.find((b) => /진한 텍스트/.test(b.textContent ?? ""));

    fireEvent.mouseEnter(fixable!);
    const shareDark = screen.getByTestId("mock-dark").querySelector('[data-mock-target="share-btn"]');
    expect(shareDark?.getAttribute("data-highlighted")).toBe("true");
  });

  // S-2 (스펙 개정): 역방향(목업 → 뱃지)이 이제 상태만 공유하는 게 아니라
  // 대응 뱃지도 실제로 강조한다 — 목업 요소를 직접 hover했을 때 같은 target을
  // 가리키는 뱃지에 data-highlighted="true"가 붙는지를 본다("가리켜서
  // 가르친다"가 양방향으로 성립하려면 뱃지 쪽에도 시각 변화가 있어야 한다).
  it("목업 요소를 직접 hover하면 대응 뱃지가 강조된다 (역방향)", () => {
    render(<ColorPalettePage />);
    const badges = screen.getAllByTestId("contrast-badge");
    const onSolid = badges.find(
      (b) => /솔리드 위 글자/.test(b.textContent ?? "") && !/고정/.test(b.textContent ?? ""),
    )!;
    expect(onSolid.getAttribute("data-highlighted")).toBeNull();

    const solidLight = screen.getByTestId("mock-light").querySelector('[data-mock-target="solid-btn"]')!;
    fireEvent.mouseEnter(solidLight);
    expect(onSolid.getAttribute("data-highlighted")).toBe("true");

    fireEvent.mouseLeave(solidLight);
    expect(onSolid.getAttribute("data-highlighted")).toBeNull();
  });

  // 역방향이 다른 목업 인스턴스에도 같은 상태를 올리는지(단일 hoveredTarget
  // state 공유)는 별개로 계속 고정해 둔다.
  it("목업 요소를 직접 hover해도 같은 상태가 오른다 (역방향, 목업↔목업)", () => {
    render(<ColorPalettePage />);
    const solidLight = screen.getByTestId("mock-light").querySelector('[data-mock-target="solid-btn"]')!;
    fireEvent.mouseEnter(solidLight);
    const solidDark = screen.getByTestId("mock-dark").querySelector('[data-mock-target="solid-btn"]');
    expect(solidDark?.getAttribute("data-highlighted")).toBe("true");

    fireEvent.mouseLeave(solidLight);
    expect(solidDark?.getAttribute("data-highlighted")).toBeNull();
  });
});

describe("한 번에 고치기가 무엇을 바꿨는지 말한다 (Task 7, D5)", () => {
  afterEach(() => vi.useRealTimers());

  // #eab308에서 실제로 나오는 이동: text 6→8(600→800), text-strong 7→9
  // (700→900), 둘 다 라이트 — __probe로 확인한 실측값. suggestRoleShifts가
  // 다음 렌더에서 빈 배열을 내므로(고쳐졌으니 더 제안할 게 없다) 이 문장은
  // 클릭 시점의 스냅샷이어야만 만들어질 수 있다. 라이트 전용이라도 "라이트:"
  // 접두는 붙는다 — 조건부로 생략하지 않는 게 더 단순하고 일관적이다(C-1).
  it("같은 라이브 리전에 옮긴 역할·stop을 테마와 함께 이어 붙인다", () => {
    window.history.replaceState({}, "", "/color-palette?v=1&a=eab308");
    render(<ColorPalettePage />);
    fireEvent.click(screen.getByRole("button", { name: "한 번에 고치기" }));
    expect(screen.getByRole("status").textContent).toBe(
      "고칠 수 있는 대비 미달 0건 — 라이트: 텍스트 (링크)를 600 → 800으로, 진한 텍스트를 700 → 900으로 옮겼습니다",
    );
  });

  // C-1: #990000은 다크 전용 이동만 낸다(__probe 실측: text 4→3, text-strong
  // 3→2, 둘 다 dark). "텍스트를 400 → 300으로 옮겼습니다"라고만 말하면 어느
  // 테마 얘기인지 알 수 없고, 사용자의 라이트 텍스트는 그대로 600인데 옮긴
  // 것처럼 읽힌다 — "다크:"를 반드시 밝혀야 한다.
  it("다크 전용 이동은 '다크:'를 밝히고 라이트는 언급하지 않는다 (#990000)", () => {
    window.history.replaceState({}, "", "/color-palette?v=1&a=990000");
    render(<ColorPalettePage />);
    fireEvent.click(screen.getByRole("button", { name: "한 번에 고치기" }));
    const status = screen.getByRole("status").textContent ?? "";
    expect(status).toBe(
      "고칠 수 있는 대비 미달 0건 — 다크: 텍스트 (링크)를 400 → 300으로, 진한 텍스트를 300 → 200으로 옮겼습니다",
    );
    expect(status).not.toContain("라이트");
  });

  // M-2: 이전 버전은 페이지 전체에서 role="status"를 셌다 — DownloadRow가
  // idle일 때 자기 리전을 안 그려서 우연히 통과했다. PreviewPane 서브트리로
  // 좁혀야 "PreviewPane 안에 하나뿐"이라는 주장을 실제로 검증한다.
  it("PreviewPane 서브트리 안 라이브 리전은 하나뿐이다", () => {
    window.history.replaceState({}, "", "/color-palette?v=1&a=eab308");
    render(<ColorPalettePage />);
    fireEvent.click(screen.getByRole("button", { name: "한 번에 고치기" }));
    const pane = screen.getByTestId("preview-pane");
    expect(within(pane).getAllByRole("status").length).toBe(1);
  });

  // I-1: text-strong이 옮겨지면 그 role을 실제로 읽는 목업 요소가 따라
  // 움직인다(Mock이 at(sc, "text-strong")으로 그린다 — roles가 전역 공유라서다,
  // applyRoleShifts 참고). "대응 요소가 없다"던 이전 주장은 사실이 아니었다.
  //
  // 뒤집는다: 이전 버전은 이 셋에 error-badge를 넣었다 — 그때는 실패 칩이
  // subtle-bg + text-strong으로 그려져 text-strong 이동에 실제로 반응했기
  // 때문이다. 2026-09-01 스펙 D5로 실패 칩이 solid + on-solid로 바뀌면서
  // error-badge는 text-strong을 더 이상 안 읽는다(알려진 한계 1) — 대신
  // text-strong을 읽는 상태 칩 셋(warning·success·info)이 들어온다.
  //
  // C-1: #eab308의 이동은 라이트 전용이므로 다크 목업 셋은 전부 안 켜져야
  // 한다 — 안 그러면 안 바뀐 다크 요소에 거짓 강조가 걸린다.
  it("이동한 역할들의 목업 요소를 해당 테마에서만 잠깐 짚는다", () => {
    window.history.replaceState({}, "", "/color-palette?v=1&a=eab308");
    render(<ColorPalettePage />);
    fireEvent.click(screen.getByRole("button", { name: "한 번에 고치기" }));

    const light = screen.getByTestId("mock-light");
    for (const target of [
      "card-text", "card-subtext", "share-btn",
      // error-badge는 빠진다 — 실패 칩이 solid+on-solid로 바뀌어 text-strong
      // 이동에 안 움직인다(스펙 D5, 알려진 한계 1). 대신 text-strong을 실제로
      // 읽는 상태 칩 셋이 들어온다.
      "warning-badge", "success-badge", "info-badge",
    ] as const) {
      expect(
        light.querySelector(`[data-mock-target="${target}"]`)?.getAttribute("data-highlighted"),
      ).toBe("true");
    }
    // 알려진 한계 1을 프로즈가 아니라 단언으로 고정한다 — 실패 칩은
    // solid+on-solid로 그려서 text-strong 이동에 안 움직인다. 위 루프에서
    // error-badge를 뺀 것과 정확히 짝을 이루는 부정 단언이 없으면 "안 움직인다"는
    // 주석으로만 존재하고, error-badge가 실수로 다시 켜져도 이 테스트는 못 잡는다.
    expect(
      light.querySelector('[data-mock-target="error-badge"]')?.getAttribute("data-highlighted"),
    ).toBeNull();

    const dark = screen.getByTestId("mock-dark");
    for (const target of [
      "card-text", "card-subtext", "share-btn",
      "warning-badge", "success-badge", "info-badge",
    ] as const) {
      expect(
        dark.querySelector(`[data-mock-target="${target}"]`)?.getAttribute("data-highlighted"),
      ).toBeNull();
    }
  });

  // C-1 역방향: #990000은 다크 전용이므로 라이트 목업은 하나도 안 켜져야
  // 한다.
  it("다크 전용 이동(#990000)은 라이트 목업을 건드리지 않는다", () => {
    window.history.replaceState({}, "", "/color-palette?v=1&a=990000");
    render(<ColorPalettePage />);
    fireEvent.click(screen.getByRole("button", { name: "한 번에 고치기" }));

    const light = screen.getByTestId("mock-light");
    for (const target of ["card-text", "card-subtext", "share-btn", "error-badge"] as const) {
      expect(
        light.querySelector(`[data-mock-target="${target}"]`)?.getAttribute("data-highlighted"),
      ).toBeNull();
    }

    const dark = screen.getByTestId("mock-dark");
    expect(
      dark.querySelector('[data-mock-target="card-subtext"]')?.getAttribute("data-highlighted"),
    ).toBe("true");
  });

  // M-1: 강조 링은 잠깐(3초)이지만 요약 문장은 그대로 남는다 — 둘을 같이
  // 지우면 role="status"의 텍스트가 바뀌어 스크린리더가 새 정보 없이 한 번
  // 더 낭독한다. 링만 꺼지고 문장은 남는 것으로 그 재낭독을 피한다.
  it("강조 링은 3초 뒤 꺼지지만 요약 문장은 남는다 (M-1)", () => {
    vi.useFakeTimers();
    window.history.replaceState({}, "", "/color-palette?v=1&a=eab308");
    render(<ColorPalettePage />);
    fireEvent.click(screen.getByRole("button", { name: "한 번에 고치기" }));

    const cardText = screen
      .getByTestId("mock-light")
      .querySelector('[data-mock-target="card-text"]')!;
    expect(cardText.getAttribute("data-highlighted")).toBe("true");
    const statusBefore = screen.getByRole("status").textContent;

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(cardText.getAttribute("data-highlighted")).toBeNull();
    expect(screen.getByRole("status").textContent).toBe(statusBefore);
    expect(screen.getByRole("status").textContent).toContain("옮겼습니다");
  });

  // B-1(재리뷰): 3초 타이머는 강조 링만 껐지 문장은 안 지웠다 — 그 상태로
  // 이 shift와 무관한 팔레트 변화(액센트 교체)가 오면 stale한 "옮겼습니다"가
  // aria-live로 재낭독되고, 새 제안이 생기면 "역할 기본값으로" 버튼도
  // 사라져 회수 수단이 없어졌다(재리뷰어 실측: #00a3a3 적용 → #990000 교체
  // → "…2건 — 라이트: 텍스트 (링크)를 600 → 700으로…"가 그대로 남음).
  //
  // M-1이 요구한 "3초 뒤 중복 없음"과 B-1이 요구한 "무관한 변화 시 걷힘"을
  // 한 생애주기 안에서 같이 단언한다: 3초가 지나도(M-1) 무관한 변화가 없는
  // 동안은 문장이 남고, 그 뒤 액센트를 바꾸면(B-1) 걷힌다.
  it("3초 뒤에는 링만 꺼지고(M-1), 이후 액센트를 바꾸면 문장까지 걷힌다(B-1)", () => {
    vi.useFakeTimers();
    window.history.replaceState({}, "", "/color-palette?v=1&a=00a3a3");
    render(<ColorPalettePage />);
    fireEvent.click(screen.getByRole("button", { name: "한 번에 고치기" }));
    expect(screen.getByRole("status").textContent).toContain("옮겼습니다");

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    // M-1: 3초가 지나도 무관한 변화가 없으면 문장은 그대로다.
    expect(screen.getByRole("status").textContent).toContain("옮겼습니다");

    act(() => {
      fireEvent.change(screen.getByLabelText("액센트 hex"), { target: { value: "#990000" } });
    });

    // B-1: 무관한 팔레트 변화(액센트 교체)가 오면 stale한 요약이 걷힌다.
    expect(screen.getByRole("status").textContent).not.toContain("옮겼습니다");
    const light = screen.getByTestId("mock-light");
    expect(
      light.querySelector('[data-mock-target="card-text"]')?.getAttribute("data-highlighted"),
    ).toBeNull();
  });

  // M-3: "역할 기본값으로"로 되돌리면 방금 옮겼다는 서술이 되돌린 팔레트
  // 위에 남아선 안 된다 — 요약·강조를 함께 걷는다.
  it("역할 기본값으로 되돌리면 요약 문장과 강조가 함께 사라진다 (M-3)", () => {
    window.history.replaceState({}, "", "/color-palette?v=1&a=eab308");
    render(<ColorPalettePage />);
    fireEvent.click(screen.getByRole("button", { name: "한 번에 고치기" }));
    expect(screen.getByRole("status").textContent).toContain("옮겼습니다");

    fireEvent.click(screen.getByRole("button", { name: "역할 기본값으로" }));

    expect(screen.getByRole("status").textContent).not.toContain("옮겼습니다");
    const light = screen.getByTestId("mock-light");
    expect(
      light.querySelector('[data-mock-target="card-text"]')?.getAttribute("data-highlighted"),
    ).toBeNull();
  });
});

// Task 10 (D6): withAccent가 pins를 전부 버리는 폐기 자체는 유지한다 — 근거
// (paletteState.ts의 withAccent 주석: hue 보간으로 중간 구간이 섞이고, 남은
// pin은 어떤 후보와도 안 맞으면서 값은 계속 적용된다)가 여전히 유효하다.
// 이 스위트는 "조용히 사라진다"만 "알리고 되돌릴 수 있다"로 부분 개정한다.
describe("pin 소멸 알림과 복원 (D6)", () => {
  it("액센트 변경으로 pin이 사라지면 알리고 되돌릴 수 있다", () => {
    render(<ColorPalettePage />);
    fireEvent.click(screen.getAllByTestId("swatch")[7]); // stop 700
    fireEvent.click(screen.getAllByRole("radio")[0]); // stop 700 pin — #295bac
    expect(window.location.search).toContain("s7=295bac");
    const pinned = screen.getAllByTestId("swatch")[7].getAttribute("aria-label");

    // 기본 액센트(#3b82f6)의 H는 실측 259.81 — 262는 hue 스트립 1px 드래그
    // 수준의 미세 조정이다.
    fireEvent.change(screen.getByLabelText("색상"), { target: { value: "262" } });
    // 이 태스크의 전제 확인: pin이 URL에서 실제로 사라진다(replaceState라
    // 뒤로가기로도 못 돌아온다는 배경 그대로).
    expect(window.location.search).not.toContain("s7=");

    // 드래그 첫 픽셀에 조용히 사라지던 자리다. replaceState라 뒤로가기로도
    // 못 살리므로 화면이 유일한 복구 경로다. 시각 배너로 좁힌다 — sr-only
    // 리전도 같은 문구를 담고 있어(리뷰 I-1) 전역 getByText는 두 곳이 잡혀
    // "여러 요소" 에러를 낸다.
    expect(within(screen.getByTestId("pin-restore-banner")).getByText(/되돌렸습니다/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "복원" }));
    expect(screen.getAllByTestId("swatch")[7].getAttribute("aria-label")).toBe(pinned);
    // 리뷰 M-3: 스와치 aria-label뿐 아니라 URL도 실제로 돌아오는지 — 이 결함의
    // 전제가 "URL이 안 돌아온다"였으므로 URL 회복 자체를 단언해야 한다.
    expect(window.location.search).toContain("s7=295bac");
  });

  it("pin이 없었으면 알림이 안 뜬다", () => {
    render(<ColorPalettePage />);
    fireEvent.change(screen.getByLabelText("색상"), { target: { value: "262" } });
    // 전이(있다 → 없다)에서만 뜬다. pointermove마다 뜨면 드래그 내내 깜빡인다.
    expect(screen.queryByText(/되돌렸습니다/)).toBeNull();
  });

  // 드래그 두 번째 픽셀 이상 — pins가 이미 비어 있는 채로 또 withAccent가
  // 불리면 "전이" 조건(had)이 거짓이라 버퍼를 덮지 않는다. 덮었다면 복원해도
  // 빈 pins가 나와 원래 pin을 영영 잃는다.
  //
  // 리뷰 라운드 2로 pointerdown을 "accent-picker" 서브트리에 쏘는 이유:
  // 버퍼 만료가 이제 세대 번호(AccentInput의 sessionGen)를 본다 — 새
  // pointerdown이 그 서브트리 안에서 뜨면 새 세대가 열리고, 그 세대 동안의
  // 연속 커밋(pointermove 여러 번을 흉내 낸 이 fireEvent.change 세 번)은
  // 전부 같은 세대라 안 만료된다. 1라운드는 window에 쏴서 dragActive를
  // 봤는데, 이제 그 메커니즘 자체가 없다 — window에 쏘면 이 서브트리
  // 리스너가 못 듣는다(피커 서브트리로 정확히 좁혔기 때문). 아무 pointerdown도
  // 없으면 세대가 기본값(0)에 머물러 있어 사실 이 테스트는 굳이 안 쏴도
  // 통과하지만, "같은 드래그 세션"이라는 전제를 실제로 성립시키려면 진짜
  // 세대 전환 이벤트를 쏴야 그 전제를 검증하는 테스트가 된다.
  it("연속 조정(드래그 여러 픽셀)에서도 첫 전이의 pin만 복원 버퍼에 남는다", () => {
    render(<ColorPalettePage />);
    fireEvent.click(screen.getAllByTestId("swatch")[7]); // stop 700
    fireEvent.click(screen.getAllByRole("radio")[0]); // #295bac
    const pinned = screen.getAllByTestId("swatch")[7].getAttribute("aria-label");

    fireEvent.pointerDown(screen.getByTestId("accent-picker")); // 드래그 시작 — 새 세대를 연다
    fireEvent.change(screen.getByLabelText("색상"), { target: { value: "262" } }); // 전이 — 기록
    fireEvent.change(screen.getByLabelText("색상"), { target: { value: "264" } }); // 같은 세대 — 안 덮음
    fireEvent.change(screen.getByLabelText("색상"), { target: { value: "266" } }); // 역시 같은 세대

    fireEvent.click(screen.getByRole("button", { name: "복원" }));
    expect(screen.getAllByTestId("swatch")[7].getAttribute("aria-label")).toBe(pinned);
    expect(window.location.search).toContain("s7=295bac"); // 리뷰 M-3: URL 회복도 단언
  });

  // 리뷰 라운드 2, N-2: NumberField(D10이 승격한 공식 키보드 접근 경로)에
  // 포커스가 유지된 채 값을 두 번 바꿔도(예: ArrowUp 두 번과 동등한 커밋
  // 두 번) 배너가 살아있어야 한다 — 1라운드는 포인터만 보고 있어서 이
  // 경로가 안 걸렸다(NumberField 넛지는 pointerdown이 아니다).
  it("NumberField에 포커스가 유지된 채 값을 두 번 바꿔도(키보드 넛지) 배너가 유지된다", () => {
    render(<ColorPalettePage />);
    fireEvent.click(screen.getAllByTestId("swatch")[7]); // stop 700
    fireEvent.click(screen.getAllByRole("radio")[0]); // #295bac
    const pinned = screen.getAllByTestId("swatch")[7].getAttribute("aria-label");

    const hueField = screen.getByLabelText("색상");
    fireEvent.focusIn(hueField); // 포커스 진입 — 새 세대를 연다
    fireEvent.change(hueField, { target: { value: "262" } }); // 전이 — 기록
    fireEvent.change(hueField, { target: { value: "264" } }); // 포커스 안 떠남 — 같은 세대
    fireEvent.change(hueField, { target: { value: "266" } }); // 역시 같은 세대

    expect(screen.getByTestId("pin-restore-banner")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "복원" }));
    expect(screen.getAllByTestId("swatch")[7].getAttribute("aria-label")).toBe(pinned);
    expect(window.location.search).toContain("s7=295bac");
  });

  // 리뷰 라운드 2, N-1: pointercancel처럼 pointerup 없이 끝나는 포인터
  // 시퀀스 뒤에도 오염이 재현되면 안 된다. 세대 기반 설계는 "끝"을 안 보므로
  // (시작만 본다) 이 시나리오 자체가 구조적으로 안전하다 — pointercancel을
  // 쐈든 안 쐈든 다음 액센트 변경이 새 세대(hex 칸은 항상 새 세대)라 버퍼가
  // 만료된다.
  it("pointerup 없이 pointercancel로 끝나도 다음 액센트 변경들에서 버퍼가 만료돼 오염이 없다", () => {
    render(<ColorPalettePage />);
    fireEvent.click(screen.getAllByTestId("swatch")[7]); // stop 700
    fireEvent.click(screen.getAllByRole("radio")[0]); // #295bac — "파랑" pin

    const picker = screen.getByTestId("accent-picker");
    fireEvent.pointerDown(picker);
    fireEvent.change(screen.getByLabelText("색상"), { target: { value: "262" } }); // 드랍
    fireEvent.pointerCancel(picker); // pointerup 없이 취소 — 세대 설계는 "끝"을 안 본다

    fireEvent.change(screen.getByLabelText("액센트 hex"), { target: { value: "#ef4444" } });
    fireEvent.change(screen.getByLabelText("액센트 hex"), { target: { value: "#8b5cf6" } });

    expect(screen.queryByRole("button", { name: "복원" })).toBeNull();
    expect(window.location.search).toContain("a=8b5cf6");
    expect(window.location.search).not.toContain("s7=295bac"); // 파랑 시절 pin이 안 섞인다
  });

  // 리뷰 라운드 3, F-1: 위 테스트는 pointercancel 뒤 hex 칸(항상 새 세대)만
  // 썼다 — OklchPicker의 실제 결함(HueStrip의 draggingRef가 pointerup에서만
  // 내려가고 pointercancel을 안 들어, 취소 뒤에도 버튼을 뗀 채 마우스만
  // 움직이면 pick()이 계속 나온다)은 안 건드렸다. 이 테스트는 그 실제
  // 결함 경로를 그대로 태운다 — 진짜 HueStrip DOM에 pointerdown하고,
  // pointercancel 뒤 window에 pointermove를 여러 번 쏴서 OklchPicker가
  // 정말로 계속 커밋을 내는지(브라우저 실측과 동일 패턴), 그런데도
  // AccentInput의 pointercancel→새 세대 방어 덕에 오염이 안 나는지 본다.
  it("pointercancel 뒤 OklchPicker의 draggingRef가 고착돼 계속 커밋해도 오염이 없다", () => {
    const { container } = render(<ColorPalettePage />);
    fireEvent.click(screen.getAllByTestId("swatch")[7]); // stop 700
    fireEvent.click(screen.getAllByRole("radio")[0]); // #295bac — "파랑" pin

    const hueStrip = container.querySelector(".cursor-crosshair.rounded-full")!;
    fireEvent.pointerDown(hueStrip, { clientX: 100, clientY: 6 }); // 드랍
    expect(window.location.search).not.toContain("s7=");
    expect(screen.getByTestId("pin-restore-banner")).toBeTruthy();

    fireEvent.pointerCancel(hueStrip, { clientX: 100, clientY: 6 }); // pointerup 없이 취소
    // OklchPicker는 pointercancel을 안 들으므로 draggingRef가 참으로
    // 남는다 — 버튼 없이 이동해도(jsdom엔 buttons 상태가 없어 그대로
    // pointermove) HueStrip의 window 리스너가 여전히 pick()을 부른다.
    fireEvent.pointerMove(window, { clientX: 120, clientY: 6 });
    fireEvent.pointerMove(window, { clientX: 140, clientY: 6 });
    fireEvent.pointerMove(window, { clientX: 160, clientY: 6 });

    // AccentInput의 pointercancel 리스너가 이미 새 세대를 열어 놨으므로,
    // 그 뒤에 고착된 draggingRef가 만들어낸 커밋들은 전부 "다른 세대"로
    // 판정돼 첫 커밋에서 곧바로 만료된다.
    expect(screen.queryByTestId("pin-restore-banner")).toBeNull();
    expect(screen.queryByRole("button", { name: "복원" })).toBeNull();
    expect(window.location.search).not.toContain("s7=295bac"); // 파랑 시절 pin이 안 섞인다
  });

  // 리뷰 라운드 3, F-2: L→C→H 사이의 Tab 이동은 새 세대가 아니다. 명도에서
  // 드랍한 뒤 Tab으로 채도로 넘어가 넛지해도 배너·복원 버튼이 살아있어야
  // 한다 — 그렇지 않으면 파란 채널 1/255 같은 눈에 안 띄는 변화로 복원
  // 수단이 영구히 사라진다(D10이 NumberField 셋을 공식 접근 경로로 묶은
  // 이상 N-2와 같은 계열의 결함).
  it("L에서 드랍 후 Tab으로 C로 넘어가 넛지해도 배너가 유지된다", () => {
    render(<ColorPalettePage />);
    fireEvent.click(screen.getAllByTestId("swatch")[7]); // stop 700
    fireEvent.click(screen.getAllByRole("radio")[0]); // #295bac
    const pinned = screen.getAllByTestId("swatch")[7].getAttribute("aria-label");

    const lField = screen.getByLabelText("명도");
    const cField = screen.getByLabelText("채도");

    fireEvent.focusIn(lField); // 명도로 포커스 진입 — 새 세대
    fireEvent.change(lField, { target: { value: "0.63" } }); // 드랍
    expect(screen.getByTestId("pin-restore-banner")).toBeTruthy();

    // Tab: 명도 → 채도. relatedTarget이 wrapper 안(=lField)이므로 세대가
    // 안 바뀐다.
    fireEvent.focusOut(lField, { relatedTarget: cField });
    fireEvent.focusIn(cField, { relatedTarget: lField });
    fireEvent.change(cField, { target: { value: "0.2" } }); // 채도 넛지 — 같은 세대

    expect(screen.getByTestId("pin-restore-banner")).toBeTruthy(); // 유지
    fireEvent.click(screen.getByRole("button", { name: "복원" }));
    expect(screen.getAllByTestId("swatch")[7].getAttribute("aria-label")).toBe(pinned);
    expect(window.location.search).toContain("s7=295bac");
  });

  // 리뷰 C-1: 배너는 복원을 누르기 전까지 안 걷힌다 — 그 사이 사용자가 다른
  // stop을 새로 pin하면, 교체(replace) 구현은 그 새 pin을 "복원" 클릭이
  // 조용히 덮어썼다. 리뷰어 실측 재현 시퀀스 그대로: pin stop700 → H 변경(드랍)
  // → pin stop300(새 선택) → 복원 클릭 → 둘 다 살아있어야 한다.
  it("복원이 그 사이에 새로 찍은 다른 stop의 pin을 덮어쓰지 않는다", () => {
    render(<ColorPalettePage />);
    fireEvent.click(screen.getAllByTestId("swatch")[7]); // stop 700
    fireEvent.click(screen.getAllByRole("radio")[0]); // #295bac
    expect(window.location.search).toContain("s7=295bac");

    fireEvent.change(screen.getByLabelText("색상"), { target: { value: "262" } }); // 드랍
    expect(window.location.search).not.toContain("s7=");

    fireEvent.click(screen.getAllByTestId("swatch")[3]); // stop 300 — 배너가 뜬 채로 새로 pin
    fireEvent.click(screen.getAllByRole("radio")[0]);
    expect(window.location.search).toMatch(/s3=/);

    fireEvent.click(screen.getByRole("button", { name: "복원" }));
    // 병합이라 둘 다 살아있다 — 교체였다면 s3가 사라졌을 것이다.
    expect(window.location.search).toContain("s7=295bac");
    expect(window.location.search).toMatch(/s3=/);
  });

  // Task 9가 만들어 둔 "후보 밖" 경로(candidateMatch.ts의 MAX_DISTANCE·
  // pickCurrent, CandidatePopover의 "지금 색은 이 앵커의 후보에 없습니다")를
  // 그대로 탄다 — 새로 구현하지 않고 이미 동작하는 경로를 여기서 고정한다.
  //
  // radio[2]("쨍한", 태스크 배경의 예시 URL과 같은 #0e56c2)를 쓴다 — 실측하면
  // radio[0]("중립적")은 이 hue 폭(259.81°→262°)에서 새 후보와 최소 체비셰프
  // 거리 6으로, MAX_DISTANCE(10) 안에 남아 "후보 밖"을 안 탄다. radio[2]만
  // 최소 거리 15로 상한을 넘어 이 시나리오에서 실제로 null 경로를 밟는다
  // (직접 실행해 확인: candidatesFor(7, …)와 pickCurrent를 오프라인으로 돌려
  // [6,13,23]/[18,9,10]/[33,24,15]를 얻었다 — radio[2]행의 최솟값 15만 10 초과).
  it("복원된 pin이 새 액센트 후보 밖이면 팝오버가 '후보 밖'을 말한다 (Task 9 경로 재사용)", () => {
    render(<ColorPalettePage />);
    fireEvent.click(screen.getAllByTestId("swatch")[7]); // stop 700
    fireEvent.click(screen.getAllByRole("radio")[2]); // "쨍한" — #0e56c2, 태스크 배경 예시와 동일

    fireEvent.change(screen.getByLabelText("색상"), { target: { value: "262" } });
    fireEvent.click(screen.getByRole("button", { name: "복원" }));
    expect(window.location.search).toContain("s7=0e56c2"); // 리뷰 M-3: URL 회복 단언

    fireEvent.click(screen.getAllByTestId("swatch")[7]); // 복원된 pin으로 재오픈
    const radios = screen.getAllByRole("radio") as HTMLInputElement[];
    expect(radios.length).toBeGreaterThan(0); // 후보 자체는 있다
    expect(radios.some((r) => r.checked)).toBe(false);
    expect(screen.getByText("지금 색은 이 앵커의 후보에 없습니다")).toBeTruthy();
  });

  // 리뷰 I-1: aria-live 리전은 항상 마운트돼 있어야 한다 — 리전 자체가 새로
  // 삽입되면 대부분의 스크린리더가 그 등장을 못 잡는다. data-testid로 정확히
  // 이 리전만 골랐다(리뷰 N-1) — 범용 `[aria-live="polite"]` 셀렉터는
  // PreviewPane의 role="status" 헤드라인도 aria-live="polite"라 함께 잡혀,
  // "먼저 나온 걸 우연히 골랐을 뿐" 상태로 통과할 위험이 있었다.
  it("배너의 sr-only 리전은 pin 유무와 무관하게 항상 마운트돼 있다", () => {
    render(<ColorPalettePage />);
    const regionBefore = screen.getByTestId("pin-restore-live-region");
    expect(regionBefore.textContent).toBe(""); // 내용은 비어 있다
    // 시각 배너(리뷰 N-1로 분리)는 pin이 없으면 DOM에 아예 없다 — grid 행을
    // 안 먹어야 세로 예산에 안 걸린다.
    expect(screen.queryByTestId("pin-restore-banner")).toBeNull();

    fireEvent.click(screen.getAllByTestId("swatch")[7]);
    fireEvent.click(screen.getAllByRole("radio")[0]);
    fireEvent.change(screen.getByLabelText("색상"), { target: { value: "262" } });

    const regionAfter = screen.getByTestId("pin-restore-live-region");
    expect(regionAfter.isSameNode(regionBefore)).toBe(true); // 같은 노드 — 새로 삽입되지 않았다
    expect(regionAfter.textContent).toContain("되돌렸습니다");
    expect(screen.getByTestId("pin-restore-banner")).toBeTruthy(); // 시각 배너는 이제 있다
  });

  // 리뷰 N-2 참고 — 무음 no-op: 드랍된 stop을 복원 전에 "같은 값으로" 다시
  // pin한 뒤 복원을 누르면, `s.pins[i] ?? restored[i]`가 이미 채워진
  // s.pins[i]를 그대로 쓰므로 팔레트는 전혀 안 바뀌고 배너만 걷힌다 —
  // 방어적이지만 어디에도 안 적혀 있던 동작이라 여기 고정해 둔다.
  it("드랍된 stop을 같은 값으로 재pin한 뒤 복원하면 값은 그대로, 배너만 걷힌다", () => {
    render(<ColorPalettePage />);
    fireEvent.click(screen.getAllByTestId("swatch")[7]);
    fireEvent.click(screen.getAllByRole("radio")[0]); // #295bac
    fireEvent.change(screen.getByLabelText("색상"), { target: { value: "262" } }); // 드랍

    fireEvent.click(screen.getAllByTestId("swatch")[7]); // 같은 stop을 다시
    fireEvent.click(screen.getAllByRole("radio")[0]); // 같은 값으로 재pin
    const beforeRestore = window.location.search;

    fireEvent.click(screen.getByRole("button", { name: "복원" }));
    expect(window.location.search).toBe(beforeRestore); // 값은 안 바뀜
    expect(screen.queryByTestId("pin-restore-banner")).toBeNull(); // 배너만 걷힘
  });
});

// 최종 브랜치 리뷰 I-1: 되돌리기 버퍼(droppedPins)에 만료가 없었다 — pin이
// 사라졌다는 배너가 새 pin이나 추가 액센트 변경을 거쳐도 세션 내내 안 걷혔고,
// 그 상태에서 "복원"을 누르면 이미 무관해진 색(예: 파랑 시절 pin)이 지금
// 팔레트(예: 초록)에 병합돼 들어갔다. 고른 만료 방식은 onAccentChange에서
// `had`가 거짓일 때(=이번 액센트 변경 이전에 이미 pins가 비어 있었을 때, 즉
// 지금 바꾸는 액센트가 버퍼가 기억하는 "직전 드랍"의 그다음이라는 뜻) 버퍼를
// 버리는 쪽이다 — onChoose(새 pin 커밋)에서 버리는 대안도 있었지만, 이 버그의
// 핵심 위험(사이클 3 D6이 막으려던 "다른 색끼리 섞인 pin")은 액센트를 반복해
// 바꿀 때 생기지 새 pin을 찍을 때는 안 생긴다 — 병합 로직(`s.pins[i] ??
// restored[i]`)이 새 pin 자체는 이미 안전하게 지킨다(바로 위 "복원이 그 사이에
// 새로 찍은 다른 stop의 pin을 덮어쓰지 않는다" 테스트). 그래서 위험이 실제로
// 나는 지점(액센트 재변경)에 만료를 건다. `had`가 참이면(그 시점에 살아있는
// pin이 있으면) 만료가 아니라 **교체**다 — 그 pin이 지금 막 드랍되는 것이므로
// 버퍼는 그 최신 드랍을 담아야 한다(첫 번째 테스트가 이 경로를 고정한다).
// 아래 세 테스트는 최종 리뷰가 재현한 표의 세 시퀀스를 그대로 고정한다.
describe("pin 소멸 배너 만료 (최종 리뷰 I-1)", () => {
  it("드랍 후 다른 stop을 새로 pin하면, 그 pin이 다시 드랍될 때 버퍼가 최신 값으로 교체된다", () => {
    render(<ColorPalettePage />);
    fireEvent.click(screen.getAllByTestId("swatch")[7]); // stop 700
    fireEvent.click(screen.getAllByRole("radio")[0]); // #295bac
    fireEvent.change(screen.getByLabelText("색상"), { target: { value: "262" } }); // 드랍
    expect(screen.getByTestId("pin-restore-banner")).toBeTruthy();

    fireEvent.click(screen.getAllByTestId("swatch")[3]); // stop 300 — 배너가 뜬 채로 새로 pin
    fireEvent.click(screen.getAllByRole("radio")[0]);
    // 새 pin만으로는 안 걷힌다 — 액센트를 안 바꿨으니 만료 조건(다음 액센트
    // 변경) 자체가 아직 안 왔다.
    expect(screen.getByTestId("pin-restore-banner")).toBeTruthy();

    // 액센트를 바꾸면 이번엔 stop300 pin이 막 드랍되는 참이라 had=true —
    // 버퍼가 "폐기"가 아니라 stop300의 값으로 **교체**된다. stop700의 옛
    // 값(#295bac)은 이제 버퍼 어디에도 없다.
    fireEvent.change(screen.getByLabelText("액센트 hex"), { target: { value: "#ef4444" } });
    expect(screen.getByTestId("pin-restore-banner")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "복원" }));
    expect(window.location.search).not.toContain("s7="); // stop700의 옛 pin은 안 돌아온다
    expect(window.location.search).toMatch(/s3=/); // stop300만 복원된다
  });

  it("드랍 후 액센트를 두 번 더 바꾸면 배너는 두 번째 변경에서 이미 걷힌다", () => {
    render(<ColorPalettePage />);
    fireEvent.click(screen.getAllByTestId("swatch")[7]); // stop 700
    fireEvent.click(screen.getAllByRole("radio")[0]); // #295bac
    expect(window.location.search).toContain("s7=295bac");

    fireEvent.change(screen.getByLabelText("색상"), { target: { value: "262" } }); // 드랍(1차 변경)
    expect(screen.getByTestId("pin-restore-banner")).toBeTruthy();
    expect(within(screen.getByTestId("pin-restore-banner")).getByText(/pin 1개/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText("액센트 hex"), { target: { value: "#ef4444" } }); // 2차 변경 — had=false, 버퍼 폐기
    expect(screen.queryByTestId("pin-restore-banner")).toBeNull();

    fireEvent.change(screen.getByLabelText("액센트 hex"), { target: { value: "#22c55e" } }); // 3차 변경 — 이미 null이라 그대로
    expect(screen.queryByTestId("pin-restore-banner")).toBeNull();
  });

  it("배너가 걷힌 뒤에는 복원 버튼이 없어 다른 색의 pin이 섞여 들어갈 수 없다", () => {
    render(<ColorPalettePage />);
    fireEvent.click(screen.getAllByTestId("swatch")[7]); // stop 700
    fireEvent.click(screen.getAllByRole("radio")[0]); // #295bac — "파랑"에서 고른 pin

    fireEvent.change(screen.getByLabelText("색상"), { target: { value: "262" } }); // 드랍
    fireEvent.change(screen.getByLabelText("액센트 hex"), { target: { value: "#ef4444" } }); // 빨강
    fireEvent.change(screen.getByLabelText("액센트 hex"), { target: { value: "#22c55e" } }); // 초록

    // 복원 버튼 자체가 없다 — 눌러서 파랑 시절 pin(#295bac)이 초록 팔레트에
    // 섞여 들어가는 경로(리뷰가 재현한 `?a=22c55e&s7=295bac`)가 UI에서 막힌다.
    expect(screen.queryByRole("button", { name: "복원" })).toBeNull();
    expect(window.location.search).toContain("a=22c55e");
    expect(window.location.search).not.toContain("s7=295bac");
  });
});

// 직전 사이클이 같은 종류의 판정에서 두 라운드를 썼다(최종 리뷰 I-1 라운드
// 2·3): "지금 드래그 중인가"를 pointerdown~pointerup으로 근사했더니
// pointercancel 한 번에 영원히 참으로 고착되고, 키보드 넛지는 포인터 이벤트가
// 아니라 아예 안 잡혔다. 그 교훈을 되풀이하지 않는다 — 판정 축이 데드라인이라
// **끄는 이벤트가 없고**, 그래서 못 받아서 고착될 이벤트도 없다(스펙 D3).
describe("피커 조작 중 accent-500 강조 (스펙 D3)", () => {
  const anchorSwatch = () =>
    screen.getByTestId("palette-section").querySelectorAll('[data-testid="swatch"]')[5];

  afterEach(() => {
    vi.useRealTimers();
  });

  it("기본 상태에서는 강조가 없다", () => {
    render(<ColorPalettePage />);
    expect(anchorSwatch().getAttribute("data-emphasized")).toBeNull();
  });

  it("피커 pointerdown이 강조를 켠다", () => {
    vi.useFakeTimers();
    render(<ColorPalettePage />);
    act(() => {
      fireEvent.pointerDown(screen.getByTestId("accent-picker"));
    });
    expect(anchorSwatch().getAttribute("data-emphasized")).toBe("true");
  });

  // 핵심 단언 — pointerup/pointercancel/lostpointercapture를 **하나도 안 보내도**
  // 풀린다. 끝을 감지하지 않는다는 것이 방어 코드가 아니라 판정 축의 성질임을
  // 고정한다.
  it("끝 이벤트를 하나도 안 받아도 600ms 뒤 풀린다 (고착 불가)", () => {
    vi.useFakeTimers();
    render(<ColorPalettePage />);
    act(() => {
      fireEvent.pointerDown(screen.getByTestId("accent-picker"));
    });
    expect(anchorSwatch().getAttribute("data-emphasized")).toBe("true");
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(anchorSwatch().getAttribute("data-emphasized")).toBeNull();
  });

  // 데드라인은 활동마다 **갱신**된다 — 드래그가 길어도 중간에 안 꺼진다.
  it("활동이 이어지면 만료가 미뤄진다", () => {
    vi.useFakeTimers();
    render(<ColorPalettePage />);
    act(() => {
      fireEvent.pointerDown(screen.getByTestId("accent-picker"));
    });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(anchorSwatch().getAttribute("data-emphasized")).toBe("true");
    act(() => {
      fireEvent.pointerDown(screen.getByTestId("accent-picker"));
    });
    act(() => {
      vi.advanceTimersByTime(400); // 첫 활동 기준으로는 800ms — 갱신 안 되면 꺼진다
    });
    expect(anchorSwatch().getAttribute("data-emphasized")).toBe("true");
  });

  // hex 칸은 "피커 위"가 아니다 — 완결된 값 하나를 통째로 정하는 별개 행동이고,
  // AccentInput의 sessionGen이 이미 같은 축으로 둘을 가른다(스펙 D3).
  it("hex 칸 커밋은 강조를 안 켠다", () => {
    vi.useFakeTimers();
    render(<ColorPalettePage />);
    act(() => {
      fireEvent.change(screen.getByLabelText("액센트 hex"), { target: { value: "#00a3a3" } });
    });
    expect(anchorSwatch().getAttribute("data-emphasized")).toBeNull();
  });
});

describe("목업 (스펙 D4·D5)", () => {
  it("상태색 4종이 라이트·다크 목업에 각각 하나씩 있다", () => {
    render(<ColorPalettePage />);
    for (const theme of ["light", "dark"] as const) {
      const mock = screen.getByTestId(`mock-${theme}`);
      for (const t of ["error-badge", "warning-badge", "success-badge", "info-badge"]) {
        expect(mock.querySelectorAll(`[data-mock-target="${t}"]`).length).toBe(1);
      }
    }
  });

  // jsdom(cssstyle)은 style을 rgb()로 직렬화한다 — hex 문자열로는 절대
  // 매치되지 않는다(위 "솔리드 버튼 글자색…" 테스트와 같은 사정). onSolidColor는
  // "#ffffff"|"#000000" 둘뿐이라 그 자리는 그대로 매핑하면 되지만, solid
  // 배경은 임의의 hex라 실제로 hex→rgb 변환이 필요하다.
  const hexToRgb = (hex: string): string => {
    const n = parseInt(hex.slice(1), 16);
    return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
  };

  // 실패 칩만 solid + on-solid다(스펙 D5) — 배경이 solid stop이고 글자가
  // onSolidColor(solid)임을 실제 스타일로 고정한다. 나머지 셋과 다른 장치를
  // 쓴다는 사실이 조용히 뒤집히지 않게 한다.
  it("실패 칩은 solid 배경에 on-solid 글자다", () => {
    render(<ColorPalettePage />);
    const scales = deriveScales(defaultState(DEFAULT_ACCENT));
    const solid = scales.semantic.error[5]; // roles.ts: solid는 light·dark 모두 index 5
    const chip = screen
      .getByTestId("mock-light")
      .querySelector('[data-mock-target="error-badge"]') as HTMLElement;
    expect(chip.style.background).toBe(hexToRgb(solid));
    expect(chip.style.color).toBe(
      onSolidColor(solid) === "#ffffff" ? "rgb(255, 255, 255)" : "rgb(0, 0, 0)",
    );
  });

  // 카드 제목과 지표 수치가 같은 역할(neutral text-strong)을 쓴다 — 뱃지 하나가
  // 둘을 함께 밝히는 것이 정확하다("이 역할은 여기 두 곳에 쓰인다", 스펙 D4).
  it("card-text를 쓰는 요소가 둘이다 — 제목과 지표 수치", () => {
    render(<ColorPalettePage />);
    expect(
      screen.getByTestId("mock-light").querySelectorAll('[data-mock-target="card-text"]').length,
    ).toBe(2);
  });

  // 11px/10px는 "만든 색이 실제로 어떻게 보이는가"를 거의 못 답한다.
  // 목업 안 텍스트는 크롬이 아니라 색칠 대상인 샘플 UI라 3.3 D4의 크롬 12px
  // 하한이 적용 안 되던 자리였다(스펙 D4).
  it("카드 제목·서브텍스트가 ds-type 토큰을 쓴다", () => {
    render(<ColorPalettePage />);
    const mock = screen.getByTestId("mock-light");
    expect(mock.querySelector('[data-mock-target="card-text"]')!.className)
      .toContain("ds-type-heading-xxs");
    expect(mock.querySelector('[data-mock-target="card-subtext"]')!.className)
      .toContain("ds-type-caption-sm");
  });

  // 막대는 안 건드린다 — BAR_STOPS의 비대칭 구간 함정(PreviewPane 주석)을
  // 이번에 열지 않는다.
  it("막대 다섯은 그대로다", () => {
    render(<ColorPalettePage />);
    expect(screen.getAllByTestId("mock-bar").length).toBe(10); // 라이트 5 + 다크 5
  });
});
