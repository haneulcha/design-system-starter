import { useEffect, useMemo, useRef, useState } from "react";
import { checkContrast, suggestRoleShifts } from "@core/color/contrast.js";
import { SEMANTIC_ANCHORS } from "@core/color/semantic.js";
import {
  ADJUSTABLE_STOPS, deriveRoles, deriveScales, withAccent, type PaletteState,
} from "./paletteState";
import { parse, serialize } from "./paletteUrl";
import { AccentInput } from "./AccentInput";
import { AdjustableScale } from "./AdjustableScale";
import { CandidatePopover, previewScale } from "./CandidatePopover";
import { DownloadRow } from "./DownloadRow";
import { NeutralControl } from "./NeutralControl";
import { PreviewPane } from "./PreviewPane";

export function ColorPalettePage() {
  const [state, setState] = useState<PaletteState>(() => parse(window.location.search));
  const [open, setOpen] = useState<number | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  // replaceState다 — 클릭마다 히스토리가 쌓이면 뒤로가기가 조정 하나하나를 되짚는다.
  useEffect(() => {
    window.history.replaceState({}, "", `${window.location.pathname}${serialize(state)}`);
  }, [state]);

  // 되돌리기 버퍼는 페이지 로컬이다 — PaletteState·paletteUrl에 넣을 수 없다
  // (이번 사이클 비-목표: 상태 계약 불변). 그래서 새로고침하면 사라진다.
  // 근본 해법(pin을 절대 hex 대신 선택 정체성으로 저장)은 다음 사이클이다.
  const droppedPins = useRef<PaletteState["pins"] | null>(null);

  // 버퍼가 어느 조정 세대에서 만들어졌는지(리뷰 라운드 2, I-1의 재개정).
  // 1라운드는 "지금 드래그 중인가"(pointerdown~pointerup)로 근사했는데
  // 틀린 축이었다 — pointercancel처럼 짝이 안 맞는 이벤트 한 번이면 영원히
  // 참으로 고착되고(N-1), NumberField의 ArrowUp 넛지(D10이 승격한 공식
  // 키보드 경로)는 애초에 포인터 이벤트가 아니라서 안 잡혔다(N-2). 판정
  // 축을 AccentInput이 매기는 "세대 번호"(sessionGen)로 바꿨다 — 같은
  // 드래그·같은 포커스 안의 연속 커밋은 같은 세대, 새 드래그·새 포커스·
  // hex 칸 커밋은 새 세대(AccentInput.tsx 주석 참고). "끝"을 감지할 필요가
  // 없어 pointercancel류의 실패 모드 자체가 없다.
  const sessionAtDrop = useRef<number | null>(null);

  const onAccentChange = (accentHex: string, session: number) =>
    setState((s) => {
      const had = ADJUSTABLE_STOPS.some((i) => s.pins[i] !== undefined);
      // `session`은 이 클로저가 생성될 때 캡처된 일반 인자이지 매번 새로
      // 읽는 ref가 아니다 — 그래서 React 18 StrictMode가 이 업데이터를 두 번
      // 불러도(개발 모드 순수성 검증) 두 호출 모두 같은 `session`·같은 `s`를
      // 보고 같은 분기를 탄다(N-3 재검증: 1라운드 주석은 "매번 같은 s를 받아
      // 같은 값을 계산"이라고만 적어 dragActive.current처럼 시간에 따라
      // 값이 바뀌는 ref를 읽는 경우까지 멱등을 주장했는데, 그 경우는 실제로
      // 안 성립할 수 있었다 — 지금은 그런 ref를 안 읽으므로 주장이 다시
      // 성립한다). `sessionAtDrop.current`를 이 안에서 읽고 쓰긴 하지만,
      // 같은 dispatch의 두 호출 사이에는 다른 이벤트가 끼어들 수 없어(동기
      // 재호출) 그 read/write도 두 번 다 같은 결과를 낸다.
      if (had) {
        // 이 대입은 무조건 **교체**다 — 버퍼에 이미 옛 드랍이 남아 있어도
        // 지금 살아있는 pins로 덮어쓴다(리뷰 I-1). 지금 막 드랍되는 pin이
        // "가장 최근"이므로 옛 버퍼(예: stop700을 드랍하고 새로 pin한
        // stop300이 다시 드랍되는 경우)는 더 이상 복원 대상이 아니다.
        droppedPins.current = s.pins;
        sessionAtDrop.current = session;
      } else if (droppedPins.current && session !== sessionAtDrop.current) {
        // 버퍼 만료. had가 거짓인데 세대가 드랍 당시와 다르면, 이 액센트
        // 변경은 "그 드랍과 같은 조정의 연속"이 아니라 그 뒤에 벌어진 별개
        // 행동이다(새 드래그, 새 포커스, 또는 hex 칸 커밋 — 셋 다 매번 새
        // 세대를 연다). withAccent는 accentHex가 뭐든 pins를 무조건 새로
        // 비우므로, "직전 드랍"이 아닌 버퍼를 계속 들고 있으면
        // onRestorePins가 그 값을 지금 팔레트에 병합해 색이 섞인 hex를
        // 만든다(사이클 3 D6이 막으려던 것의 재생산 — withAccent 주석
        // 참고). 그래서 곧바로 버린다: 배너는 "복원 클릭" 또는 "다른
        // 세대의 다음 액센트 변경" 중 먼저 오는 쪽에서 걷힌다. onChoose로
        // 새 pin만 찍는 동안은(액센트를 안 바꾸는 한) 안 걷힌다 — 병합
        // 로직(onRestorePins의 `s.pins[i] ?? restored[i]`)이 그 경우엔
        // 이미 안전하기 때문이다.
        droppedPins.current = null;
      }
      return withAccent(s, accentHex);
    });

  // "복원"은 명시적 클릭에서만 부른다 — 사이클 3 D6은 자동 복원은 안 한다고
  // 정했고, 그 판단은 안 뒤집는다(브리프 참고). 클릭 시점엔 pin이 사라진 이유가
  // 이미 화면에 있으니(알림 문구) 원안이 걱정한 "왜 사라졌는지 모른다"가 해소돼
  // 있다.
  //
  // 교체가 아니라 병합이다(리뷰 C-1) — 배너는 "복원" 클릭이나 **다른 세대의**
  // 다음 액센트 변경(리뷰 I-1, onAccentChange의 버퍼 만료 — "세대"의 정의는
  // 그 주석과 AccentInput.tsx의 sessionGen 참고) 중 먼저 오는 쪽에서 걷힌다.
  // "다음 액센트 변경"이 아니라 "다른 세대의"인 이유: 같은 드래그 한 번에
  // 액센트가 여러 번(실측 9번) 바뀌어도 같은 세대인 한 배너는 안 걷힌다 —
  // 세대가 안 바뀌는 한은 그 사이 사용자가 다른 stop을 새로 pin해도 배너는
  // 그대로다. 그 상태에서
  // "복원"이 pins를 통째로 갈아치우면(수정 전 실제 코드: `{ ...s, pins: restored }`)
  // 방금 찍은 새 pin이 조용히 사라진다 — 이 태스크가 고치려는 결함(조용한 pin
  // 소멸)이 복원 버튼 안에서 재생산되는 셈이다. 그래서 stop별로
  // `s.pins[i] ?? restored[i]`: 사용자가 복원 전에 이미 손댄 stop(undefined가
  // 아님)은 그대로 두고, 아직 안 건드린 stop만 버퍼 값으로 채운다.
  //
  // 경계(리뷰 N-2): "복원 이후의 새 선택이 이긴다"는 원칙은 **새로 pin한
  // 경우**에만 성립한다 — "기본으로"(팝오버의 pin 해제)로 명시적으로 비운
  // 경우엔 안 통한다. `??`는 PaletteState.pins[i]의 undefined 하나로 "아직
  // 안 건드림"과 "명시적으로 기본을 골랐음"을 둘 다 표현하기 때문에 구분을
  // 못 한다 — pin stop700 → 액센트 변경(드랍) → stop700에서 "기본으로" → 복원을
  // 하면, s.pins[7]이 여전히 undefined라 restored[7]이 그 자리를 도로 채워
  // 방금 "기본으로"로 지운 선택을 되살린다. 이건 이번 diff가 만든 회귀가
  // 아니다 — 교체 구현이었어도 restored가 그 stop을 덮어썼을 것이므로 똑같이
  // 일어났다. 무음 no-op(같은 stop을 같은 값으로 다시 pin한 뒤 복원하면
  // 아무 변화 없이 배너만 걷힘)도 같은 종류의 한계다. 두 경우 다 "undefined
  // 하나가 두 의미를 진다"는 PaletteState.pins의 표현력 한계이지 이 함수의
  // 버그가 아니다 — 고치려면 "명시적으로 비움"을 별도로 표시하는 타입 변경이
  // 필요해 이번 사이클 범위(엔진·상태 계약 불변) 밖이다.
  const onRestorePins = () => {
    const restored = droppedPins.current;
    if (!restored) return;
    droppedPins.current = null; // 복원했으니 알림도 같이 걷는다
    setState((s) => ({
      ...s,
      pins: Object.fromEntries(
        ADJUSTABLE_STOPS.map((i) => [i, s.pins[i] ?? restored[i]]),
      ) as PaletteState["pins"],
    }));
  };

  const scales = useMemo(() => deriveScales(state), [state]);
  const roles = useMemo(() => deriveRoles(state), [state]);
  const pinned = ADJUSTABLE_STOPS.filter((i) => state.pins[i] !== undefined);
  const droppedPinCount = droppedPins.current
    ? ADJUSTABLE_STOPS.filter((i) => droppedPins.current![i] !== undefined).length
    : 0;
  // 시각 배너·sr-only 리전 둘 다 같은 문구를 쓴다 — 따로 적으면 한쪽만
  // 고치고 잊는 사고가 난다.
  const droppedPinMessage =
    `pin ${droppedPinCount}개를 기본값으로 되돌렸습니다 — 복원은 이 세션에서만 가능해요`;
  const shownScales = useMemo(
    () =>
      open !== null && hover
        ? { ...scales, accent: previewScale(state, open, hover) }
        : scales,
    [scales, open, hover, state],
  );

  // 뱃지는 hover 프리뷰까지 보여준다(shownScales) — 이동 제안은 확정 팔레트만
  // 본다(scales). hover는 미리보기일 뿐 확정이 아니라는 이 화면의 계약이 여기도
  // 적용된다: hover 중에 "한 번에 고치기"를 눌러도 확정 색 기준 이동이 적용돼야
  // 한다(Task 12의 다운로드가 shownScales가 아니라 scales를 쓰는 것과 같은 원칙).
  const checks = useMemo(() => checkContrast(shownScales, roles), [shownScales, roles]);
  // 뱃지는 hover 프리뷰(shownScales)를 보고, 헤드라인(role="status" — 3.3
  // D8-2 개정으로 별도 sr-only 요약을 걷고 헤드라인 자체가 라이브 리전이 됐다)
  // 은 확정 팔레트(scales)를 본다 — hover는 미리보기일 뿐 확정이 아니라는 이
  // 화면의 계약이 통지에도 적용된다.
  const summaryChecks = useMemo(() => checkContrast(scales, roles), [scales, roles]);
  const shifts = useMemo(() => suggestRoleShifts(scales, roles), [scales, roles]);
  const hasApplied = state.shifts.length > 0;
  const onApplyShifts = () =>
    setState((s) => ({
      ...s,
      shifts: shifts.map(({ roleId, theme, to }) => ({ roleId, theme, to })),
    }));
  const onResetShifts = () => setState((s) => ({ ...s, shifts: [] }));

  return (
    <main
      className="mx-auto grid max-w-[1200px] grid-cols-1 items-start
                 lg:grid-cols-[1fr_380px]"
      style={{
        padding: "var(--ds-space-lg)",
        // 걷어낸 스테이지 제목이 지던 "여기부터 다른 단계"를 간격이 진다
        // (스펙 D1). 값은 셋뿐이다 — 12 = 입력과 그 결과 / 16 = 이웃 블록 /
        // 32 = 다른 덩어리. rowGap을 **가장 좁은 12**로 두고 넓히는 자리만
        // 명시적으로 올린다: 넓은 기본값에 좁히는 예외를 다는 것보다 어긋날
        // 자리가 적다. 12가 여기 서는 이유는 이 그리드의 유일한 "좁은" 경계가
        // ① 피커 카드 → ② 액센트 띠(입력과 그 결과)이기 때문이다.
        rowGap: "var(--ds-space-sm)",
        // columnGap 32는 직전 스펙 D1의 분리를 그대로 잇는다 — row와 하나로
        // 합치면 스테이지 사이가 벌어져 세로 예산을 그 자리에서 넘긴다.
        columnGap: "var(--ds-space-xl)",
      }}
    >
      {/* "컬러 팔레트"가 아니라 "생성기"다 — 이 화면은 팔레트가 아니라
          팔레트를 만드는 도구다. 값(heading.sm 24)은 3.3 D5 그대로 두되,
          그 근거 중 하나("16으로 내리면 스테이지 제목과 같아진다")는 시각
          스테이지 제목이 사라지며 소멸했다(스펙 D1). 남은 근거는 "페이지에
          하나뿐인 최상위 제목"뿐이다.
          marginBottom 16 + main rowGap 12 = 28 ≈ "다른 덩어리". 32에 4 모자란
          것은 rowGap이 12로 고정이라 xl(32)을 더하면 44가 되기 때문이다 —
          토큰 밖 값을 만들지 않고 16을 택했다. */}
      <h1
        className="ds-type-heading-sm lg:col-span-2"
        style={{ marginBottom: "var(--ds-space-md)" }}
      >
        컬러 팔레트 생성기
      </h1>

      <section className="lg:col-start-1">
        <h2 className="sr-only">앵커 정하기</h2>
        <AccentInput hex={state.accentHex} onChange={onAccentChange} />
      </section>

      <section
        data-testid="palette-section"
        className="lg:col-start-1"
        style={{ display: "grid", gap: "var(--ds-space-xl)" }}
      >
        <h2 className="sr-only">만들어진 팔레트</h2>

        {/* ⚠️ gap: xl은 sr-only h2와 첫 자식 사이에도 걸린다. sr-only는
            position: absolute라 grid 아이템에서 제외되어 **행을 안 먹는다** —
            직전 스펙이 pin 라이브 리전에서 실측으로 확인한 것과 같은
            성질이다(915 → 911). */}
        <div style={{ display: "grid", gap: "var(--ds-space-xxs)" }}>
          {/* 액센트 띠 바로 위, 한 줄 상한 — main 컬럼 세로 예산에 걸린다.
              truncate로 물리적 줄바꿈 자체를 막는다: 좁은 화면에서 문구가
              길어지는 대신 잘리는 쪽을 택한다(1줄 초과는 예산을 넘긴다).

              시각 배너(아래)와 라이브 리전(그 다음)을 분리했다(리뷰 N-1).
              처음엔 리전 자체를 조건부 렌더 위에 얹었는데, 빈 상태에서도
              grid 행 하나를 차지해 형제 사이 gap(4px)이 하나 더 끼어들어
              세로 예산에 4px를 더 먹었다(실측: 상시 마운트 915px vs
              조건부 911px, 1280×900, scrollHeight). 시각 배너는 원래대로
              조건부 렌더로 되돌려 빈 상태에서 grid 행 자체가 없게 하고,
              I-1이 요구한 "리전 상시 마운트"는 아래의 sr-only 리전이
              대신 진다 — sr-only는 position:absolute라 grid 아이템에서
              제외돼 행을 안 먹는다. */}
          {droppedPins.current && (
            <div
              data-testid="pin-restore-banner"
              className="ds-type-caption-sm text-neutral-500 flex items-center gap-2 min-w-0"
            >
              {/* 부정어(세션 한정 경고)를 문두 쪽으로 뺐다(리뷰 I-2) —
                  이전 문구("…복원할 수 없어요")는 390px에서 "수 없어요"가
                  통째로 잘려 남은 문장이 "복원할"로 끝나며 뜻이 정반대로
                  읽혔다. 지금 문구는 390px 실측(캔버스 measureText로 실제
                  폭 재현, 뷰포트는 window.innerWidth로 390 확인 후 측정)
                  결과 "pin 1개를 기본값으로 되돌렸습니다 — 복원은 이
                  세션에서만 …"까지만 보이고 "가능해요"만 잘린다 — 잘린
                  뒤 남는 문장이 뒤집히지 않고 그냥 말줄임으로 끝난다. */}
              <span className="truncate">{droppedPinMessage}</span>
              <button
                type="button"
                onClick={onRestorePins}
                className="shrink-0 rounded px-2 py-0.5 border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
              >
                복원
              </button>
            </div>
          )}
          {/* 스크린리더 전용 상시 마운트 리전(리뷰 I-1·N-1) — 위 시각 배너와
              달리 항상 DOM에 있고 sr-only라 화면·레이아웃엔 안 잡힌다.
              aria-live는 "이미 존재하는 리전 안에서 내용이 바뀌는 것"을
              감지해 알리는 게 표준 동작이라, 리전 노드 자체가 새로
              삽입되면(=조건부로 통째로 껐다 켰다 하면) 대부분의
              스크린리더가 그 첫 등장을 못 잡는다 — 그래서 이 리전은 항상
              있고 텍스트 내용(빈 문자열 ↔ 메시지)만 바뀐다. 시각 배너에는
              그래서 aria-live를 안 단다 — 둘 다 달면 같은 알림이 두 번
              낭독된다. role="status"를 안 쓴 이유는 그대로다: PreviewPane의
              대비 요약 헤드라인이 이미 role="status"를 쓰고 있어 같은
              role을 더 쓰면 getByRole("status") 단수 조회가 둘을 놓고
              충돌한다. */}
          <div
            aria-live="polite"
            data-testid="pin-restore-live-region"
            className="sr-only"
          >
            {droppedPins.current ? droppedPinMessage : ""}
          </div>
          <AdjustableScale
            hexes={scales.accent}
            adjustable={[...ADJUSTABLE_STOPS]}
            pinned={pinned}
            // stop 50은 거의 흰 칩이라 그림자가 "아래 테두리"로 읽힌다 —
            // 확대 확인 후 테두리만 neutral-400으로 강화(스펙 D9,
            // AdjustableScale의 boundaryEmphasis 주석 참조).
            boundaryEmphasis={[0]}
            onPick={(i) => { setOpen(open === i ? null : i); setHover(null); }}
            preview={open !== null && hover ? previewScale(state, open, hover) : null}
            openIndex={open}
            onClosePopover={() => { setOpen(null); setHover(null); }}
            popoverContent={
              open !== null ? (
                <CandidatePopover
                  stopIndex={open}
                  state={state}
                  onHover={setHover}
                  onChoose={(hex) =>
                    setState((s) => ({ ...s, pins: { ...s.pins, [open]: hex ?? undefined } }))
                  }
                  onClose={() => { setOpen(null); setHover(null); }}
                />
              ) : undefined
            }
          />
        </div>

        <div style={{ display: "grid", gap: "var(--ds-space-sm)" }}>
          <div className="ds-type-caption-sm text-neutral-500">뉴트럴</div>
          <AdjustableScale hexes={scales.neutral} adjustable={[]} pinned={[]} />
          <NeutralControl
            state={state}
            onChange={(tint) => setState((s) => ({ ...s, tint }))}
          />
        </div>

        {/* 상태색은 접지 않는다 — 산출물에 무조건 들어가므로 화면에 없으면
            받아간 파일에 모르는 색이 들어있게 된다 (사이클 3 D7). 라벨을 왼쪽
            열로 빼고 띠를 compact로 낮춰 세로를 아낀다 (스펙 D3).
            2×2 그리드는 사람 승인 4번째 나사(Task 7 후속) — 4줄(~112px)을
            2줄(~56px)로 압축해 900px 세로 예산의 잔여 35.36px 초과분을 덮는다.
            stop 번호가 없고(showCaptions=false) 조정 불가라 히트 타깃도 없어
            절반 폭(스톱당 ~30px)에서도 "산출물에 이 색이 들어간다"는 목적은
            유지된다(사이클 3 D7 "얇게 노출") — CSS 그리드라 DOM 순서·인덱스는
            그대로다. */}
        <div
          data-testid="semantic-section"
          style={{ display: "grid", gap: "var(--ds-space-xxs)" }}
        >
          <div className="ds-type-caption-sm text-neutral-500">상태색</div>
          {/* 2×2는 lg 전용이다 — 390px에서 그대로 두면 스톱당 폭이 ~7px로
              줄어 사이클 3 D7 "얇게 노출"의 목적(그래도 색은 식별된다)이
              깨진다. 좁은 화면은 1열로 쌓아 스톱 폭을 지킨다. */}
          <div
            className="grid grid-cols-1 lg:grid-cols-2"
            style={{ columnGap: "var(--ds-space-md)", rowGap: "var(--ds-space-xxs)" }}
          >
            {SEMANTIC_ANCHORS.map((a) => (
              <div
                key={a.id}
                // 56px 고정 트랙은 라벨이 자라면(예: 더 긴 문구로 바뀌면) 조용히
                // 스와치를 덮는다 — 현 라벨도 12px에서 이미 56px를 살짝 넘겨
                // gap이 흡수 중이었다. minmax(56px, auto)로 트랙이 늘어나게 둔다.
                className="grid grid-cols-[minmax(56px,auto)_1fr] items-center"
                style={{ gap: "var(--ds-space-xs)" }}
              >
                <div
                  // 라벨 색은 neutral-500이다 — 400은 흰 배경에서 2.58:1로 기준
                  // 미달이다. 상태색 이름을 못 읽으면 어느 팔레트인지 알 수
                  // 없으므로 장식이 아니다 (스펙 D2).
                  className="ds-type-caption-sm text-neutral-500 whitespace-nowrap"
                >
                  {a.label}
                </div>
                <AdjustableScale
                  hexes={scales.semantic[a.id]}
                  adjustable={[]}
                  pinned={[]}
                  showCaptions={false}
                  compact
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 좁은 화면에서는 자연 DOM 순서로 ②와 ③ 사이에 온다 — order 불필요
          (order는 형제 컨테이너 경계를 못 넘어 aside를 main의 직계 자식으로
          평탄화하지 않으면 애초에 쓸 수 없었다). lg에서는 2열 첫 행으로 올라가
          세 스테이지 옆에 sticky로 선다. */}
      <aside className="lg:col-start-2 lg:row-start-2 lg:row-span-3 lg:sticky lg:top-8">
        <PreviewPane
          scales={shownScales}
          roles={roles}
          checks={checks}
          shifts={shifts}
          hasApplied={hasApplied}
          onApplyShifts={onApplyShifts}
          onResetShifts={onResetShifts}
          summaryChecks={summaryChecks}
        />
      </aside>

      {/* marginTop 8 + main rowGap 12 = 20. ②의 상태색 띠와 받기 카드 사이는
          "다른 덩어리"지만, 받기 카드는 자체 테두리가 있어 경계를 스스로
          만든다 — 32까지 벌리면 lg에서 카드가 폴드 아래로 밀린다(Task 6
          실측으로 확정). */}
      <section
        data-testid="download-section"
        className="lg:col-start-1"
        style={{ marginTop: "var(--ds-space-xs)" }}
      >
        <h2 className="sr-only">받기</h2>
        <DownloadRow scales={scales} roles={roles} />
      </section>
    </main>
  );
}
