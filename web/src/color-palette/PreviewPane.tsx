// web/src/color-palette/PreviewPane.tsx
//
// 라이트·다크를 토글이 아니라 동시에 보여준다 — 대비 실패는 다크에서만 나는
// 경우가 흔한데 토글이면 그것을 못 보고 지나간다 (스펙 D8).

import { useEffect, useRef, useState } from "react";
import { bgLabel, formatRatio, onSolidColor } from "@core/color/contrast.js";
import type { ContrastCheck, RoleShift } from "@core/color/contrast.js";
import { SCALE_ORDER } from "@core/color/roles.js";
import type { ScaleRole, ScaleSet } from "@core/color/roles.js";
import { roleLabel, triageChecks } from "./contrastTriage";
import { mockTargetFor } from "./mockTargets";
import type { MockTarget } from "./mockTargets";
import { shiftHighlightTargets, summarizeShifts } from "./shiftSummary";

// "잠깐 짚는다"의 길이. DownloadRow의 복사 피드백(2000ms)보다 살짝 길다 —
// 여긴 색 칩 하나가 아니라 문장을 읽어야 해서다. 이 타이머는 강조 링만
// 끈다 — 요약 문장(appliedShifts)은 별개 상태라 여기서 안 건드린다(M-1:
// 같이 걷으면 aria-live가 "새 정보 없이" 한 번 더 낭독한다).
const APPLIED_HIGHLIGHT_MS = 3000;
const EMPTY_HIGHLIGHT: readonly MockTarget[] = [];

// 강조 아웃라인 — 목업 배경·전경은 전부 사용자 팔레트라 어떤 단일 고정색도
// 대비를 보장하지 못한다(전역 제약: 팔레트 색을 쓰지 않는다). 흰/검 이중
// 링이면 배경이 무엇이든 최소 한쪽 링은 반드시 도드라진다 — 크롬 중립색.
const HIGHLIGHT_RING = { boxShadow: "0 0 0 2px #ffffff, 0 0 0 4px #171717" } as const;

function highlightStyle(active: boolean) {
  return active ? HIGHLIGHT_RING : undefined;
}

const LABELS: Record<string, string> = Object.fromEntries(
  SCALE_ORDER.map((d) => [d.name, d.label]),
);

function stopIdx(roles: readonly ScaleRole[], id: string, theme: "light" | "dark"): number {
  const r = roles.find((x) => x.id === id);
  if (!r || r.kind !== "stop") throw new Error(`PreviewPane: no stop role "${id}"`);
  return theme === "light" ? r.lightIndex : r.darkIndex;
}

/** 막대가 쓰는 stop. 사다리 가운데 구간이라 인접 stop이 구분되는지가 가장 잘
 *  드러난다. 높이는 팔레트와 무관한 고정값 — 높이가 색에 따라 달라지면 무엇을
 *  보는 것인지 흐려진다 (스펙 D2).
 *
 *  주의 — 막대만 다른 요소들과 달리 `at()`(roles의 lightIndex/darkIndex를 거치는
 *  다크 미러)을 쓰지 않고 `a[s]`로 원시 인덱스를 직접 읽는다. 지금은 그래도 다크에서
 *  색이 맞는데, 그건 [3,4,5,6,7]의 다크 미러가 [7,6,5,4,3] — 정확히 같은 집합을
 *  뒤집은 것뿐이라 우연히 맞는 것이다. 이 배열을 비대칭 구간(예: [2,3,4,5,6])으로
 *  바꾸면 다크 카드가 라이트 사다리를 그리는 버그가 조용히 생긴다. */
const BAR_STOPS = [3, 4, 5, 6, 7] as const;
const BAR_HEIGHTS = [26, 42, 34, 48, 38] as const;

function Mock({
  theme, scales, roles, highlight, autoHighlight, onHover,
}: {
  theme: "light" | "dark";
  scales: ScaleSet;
  roles: readonly ScaleRole[];
  /** 뱃지 hover가 올린 강조 대상. Mock은 이걸 받아 그리기만 한다 — 무엇을
   *  강조할지 결정하는 매핑(mockTargetFor)은 이 컴포넌트 밖(순수 함수)에 있다. */
  highlight: MockTarget | null;
  /** "한 번에 고치기" 직후 잠깐 짚을 대상들(Task 7). hover와 발생원이 다를 뿐
   *  같은 링 장치를 쓴다 — 새로 만들지 않는다. **이 테마의 몫만** 들어온다 —
   *  PreviewPane이 shiftHighlightTargets의 light/dark를 갈라 각 Mock에
   *  넘긴다(라이트만 움직였는데 다크 목업까지 켜지면 거짓 강조가 된다).
   *  text-strong처럼 한 역할이 여러 스케일(neutral·accent·error …)에 동시에
   *  대응 요소를 가질 수 있어 복수형이다. */
  autoHighlight: ReadonlySet<MockTarget>;
  /** 역방향(목업 → 뱃지)도 같은 상태를 공유한다 — 목업 요소를 직접 hover해도
   *  같은 hoveredTarget이 오른다(스펙 D3 Step 5). */
  onHover: (t: MockTarget | null) => void;
}) {
  const at = (hexes: readonly string[], id: string) => hexes[stopIdx(roles, id, theme)];
  const a = scales.accent;
  const n = scales.neutral;
  const err = scales.semantic.error;
  const solid = at(a, "solid");
  // hover든 "한 번에 고치기" 직후 자동 강조든 같은 링을 켠다 — 소스가
  // 두 개이지 장치는 하나다.
  const isActive = (t: MockTarget) => highlight === t || autoHighlight.has(t);
  return (
    <div
      data-testid={`mock-${theme}`}
      className="rounded-lg p-3"
      // 바깥(페이지)은 뉴트럴 50/950. src/color/contrast.ts의 checkContrast가
      // "페이지 배경"을 정확히 이 값으로 정의하므로, 화면과 뱃지의 "페이지 배경"이
      // 같은 것을 가리켜야 한다.
      style={{ background: theme === "light" ? n[0] : n[10] }}
    >
      <div
        // 카드는 hover-bg(라이트 1 / 다크 9) — 라이트에선 페이지보다 살짝 어둡고
        // 다크에선 살짝 밝다. 뜬 표면일수록 밝다는 다크 관례와 맞는다.
        className="rounded-md border p-3 space-y-3"
        style={{ background: at(n, "hover-bg"), borderColor: at(n, "border") }}
      >
        <div>
          <div
            data-mock-target="card-text"
            data-highlighted={isActive("card-text") ? "true" : undefined}
            className="text-[11px] font-semibold"
            style={{ color: at(n, "text-strong"), ...highlightStyle(isActive("card-text")) }}
            onMouseEnter={() => onHover("card-text")}
            onMouseLeave={() => onHover(null)}
          >
            주간 활성 사용자
          </div>
          <div
            data-mock-target="card-subtext"
            data-highlighted={isActive("card-subtext") ? "true" : undefined}
            className="text-[10px]"
            style={{ color: at(n, "text"), ...highlightStyle(isActive("card-subtext")) }}
            onMouseEnter={() => onHover("card-subtext")}
            onMouseLeave={() => onHover(null)}
          >
            지난 5주
          </div>
        </div>

        {/* 막대는 data-mock-target을 달지 않는다 — a[3..7] 원시 인덱스로 그려서
           어떤 역할과도 안 묶이므로 mockTargetFor가 "bars"를 반환할 일이 없다
           (mockTargets.ts 참고). 강조·hover 배선을 달면 아무 뱃지도 못 켜는
           죽은 핸들러만 남는다 — 리뷰 M-6. */}
        <div className="flex items-end gap-1.5" style={{ height: 48 }}>
          {BAR_STOPS.map((s, i) => (
            <div
              key={s}
              data-testid="mock-bar"
              className="flex-1 rounded-sm"
              style={{ background: a[s], height: BAR_HEIGHTS[i] }}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span
            data-testid="mock-solid-btn"
            data-mock-target="solid-btn"
            data-highlighted={isActive("solid-btn") ? "true" : undefined}
            className="rounded px-2.5 py-1 text-[11px] font-medium"
            style={{
              background: solid, color: onSolidColor(solid), ...highlightStyle(isActive("solid-btn")),
            }}
            onMouseEnter={() => onHover("solid-btn")}
            onMouseLeave={() => onHover(null)}
          >
            보고서 열기
          </span>
          <span
            data-mock-target="share-btn"
            data-highlighted={isActive("share-btn") ? "true" : undefined}
            className="rounded border px-2.5 py-1 text-[11px] font-medium"
            style={{
              background: at(a, "subtle-bg"),
              borderColor: at(a, "border"),
              color: at(a, "text-strong"),
              ...highlightStyle(isActive("share-btn")),
            }}
            onMouseEnter={() => onHover("share-btn")}
            onMouseLeave={() => onHover(null)}
          >
            공유
          </span>
          <span
            data-mock-target="error-badge"
            data-highlighted={isActive("error-badge") ? "true" : undefined}
            className="ml-auto rounded px-1.5 py-0.5 text-[10px]"
            style={{
              background: at(err, "subtle-bg"), color: at(err, "text-strong"),
              ...highlightStyle(isActive("error-badge")),
            }}
            onMouseEnter={() => onHover("error-badge")}
            onMouseLeave={() => onHover(null)}
          >
            실패 2
          </span>
        </div>
      </div>
    </div>
  );
}

// 텍스트를 span으로 쪼개지 말 것 — getByText는 요소의 직접 텍스트 노드만
// 이어붙여 매칭하므로, 수치를 자식 span에 넣으면 "경고 … 2.96" 형태의
// 질의가 영원히 실패한다. against·"고정" 꼬리표도 같은 이유로 문자열
// 결합으로만 넣는다 — 자식 요소를 두지 않는다.
function ContrastBadge({
  check: c, target, hoveredTarget, onHover,
}: {
  readonly check: ContrastCheck;
  /** 이 뱃지가 가리키는 목업 요소. 배선 기준은 "고칠 수 있는가"(fixable)가
   *  아니라 이 값이 null이 아닌가다(2026-08-30 스펙 개정, D3) — accent/on-solid은
   *  절대 못 고치는(unfixable) 경고인데 목업엔 대응 요소(보고서 열기)가 있어서,
   *  fixable로 가르면 이 대표 사례가 영원히 안 가리켜졌다. */
  readonly target: MockTarget | null;
  /** 역방향(목업 → 뱃지) 강조 판정용 — 이 뱃지의 target과 같으면 자기 자신을
   *  강조한다. */
  readonly hoveredTarget: MockTarget | null;
  readonly onHover: (t: MockTarget | null) => void;
}) {
  const wired = target != null;
  const isHighlighted = wired && hoveredTarget === target;
  // tabIndex는 onFocus/onBlur(키보드 hover 등가)가 실제로 발화하려면 이 요소가
  // 포커스를 받을 수 있어야 해서 단다 — div는 기본이 비포커스다. wired인
  // 뱃지에만 붙이므로(target === null인 뱃지는 tabIndex 자체가 없다) 탭
  // 순서가 뱃지마다 비대칭이다: 가리킬 데가 있는 뱃지만 탭으로 들르고, 없는
  // 뱃지는 건너뛴다 — 가리킬 게 없는데 포커스만 받아 아무 반응 없는 정지
  // 지점을 만들지 않기 위함이다(고장으로 읽히는 것을 피한다는 D3의 같은 원칙).
  const hoverProps = wired
    ? {
        "data-highlights": target,
        tabIndex: 0,
        onMouseEnter: () => onHover(target),
        onMouseLeave: () => onHover(null),
        onFocus: () => onHover(target),
        onBlur: () => onHover(null),
      }
    : {};
  return (
    <div
      data-testid="contrast-badge"
      data-highlighted={isHighlighted ? "true" : undefined}
      // 뱃지 색은 neutral-500이다 — adjustable이 false인 "고정" 뱃지도
      // 400은 2.58:1로 미달이다. 대비 미달 사항을 못 읽으면 알 수 없으므로
      // 장식이 아니다 (스펙 D2). 강조는 Mock과 같은 크롬 중립 링을 재사용한다
      // (스펙 D3 개정 "역방향도 완성한다" — 목업 hover가 대응 뱃지도 밝혀야
      // 양방향 교육이 성립한다).
      className="ds-type-caption-sm text-neutral-500"
      style={isHighlighted ? HIGHLIGHT_RING : undefined}
      {...hoverProps}
    >
      {`⚠ ${LABELS[c.scaleName] ?? c.scaleName} ${roleLabel(c.roleId)} (${
        c.theme === "light" ? "라이트" : "다크"
      } · ${bgLabel(c.against)}) ${formatRatio(c.ratio)} / ${c.required}${
        c.adjustable ? "" : " · 고정"
      }`}
    </div>
  );
}

export function PreviewPane({
  scales, roles, checks, shifts, hasApplied, onApplyShifts, onResetShifts, summaryChecks,
}: {
  readonly scales: ScaleSet;
  readonly roles: readonly ScaleRole[];
  readonly checks: readonly ContrastCheck[];
  readonly shifts: readonly RoleShift[];
  readonly hasApplied: boolean;
  readonly onApplyShifts: () => void;
  readonly onResetShifts: () => void;
  readonly summaryChecks: readonly ContrastCheck[];
}) {
  const failing = checks.filter((c) => !c.passes);
  // "스케일을 손댈 수 있는가"(adjustable)가 아니라 "이 실패를 고칠 수 있는가"로
  // 가른다 (스펙 D4) — on-solid은 accent 스케일이라 adjustable=true여도
  // suggestRoleShifts가 절대 이동을 제안하지 않으므로(엔진의 onSolidWarning:
  // 관례값이라 stop을 옮겨 고칠 수 없다) triageChecks가 구조적으로 이걸
  // "고칠 수 없는 것"에 남긴다. shifts는 확정 팔레트(scales) 기준으로 이미
  // 계산돼 들어오므로 여기서 hover를 타지 않는다.
  //
  // 이 fixable/unfixable 나눔은 "화면 어디에(접힌 목록 안/밖) 배치할지"만
  // 정한다 — 목업 강조 배선(아래 두 .map)은 이 축을 보지 않는다. D3가 처음엔
  // fixable에만 배선했다가 개정됐다: accent/on-solid은 구조적으로 항상
  // unfixable인데 목업에 대응 요소(보고서 열기)가 있어서, fixable로 배선을
  // 가르면 그 대표 사례가 unfixable 목록 안에 갇혀 영원히 안 가리켜졌다.
  const { fixable, unfixable } = triageChecks(failing, shifts);

  // 헤드라인 개수는 확정 팔레트(summaryChecks) 기준이어야 한다 — checks는 hover
  // 프리뷰(shownScales)까지 반영해 스와치를 스칠 때마다 바뀌므로, 그대로 쓰면
  // "hover는 미리보기일 뿐 확정이 아니다"라는 이 화면의 계약이 헤드라인에서
  // 깨진다.
  const summaryFailing = summaryChecks.filter((c) => !c.passes);
  const summaryFixableCount = triageChecks(summaryFailing, shifts).fixable.length;

  // 뱃지 → 목업, 목업 → 뱃지 양방향이 이 상태 하나를 공유한다(스펙 D3 Step 5).
  // 라이트·다크 두 Mock이 같은 상태를 보므로 한쪽에서 켠 강조가 양쪽에 다 뜬다 —
  // "같은 역할"이라는 게 테마를 가로지르는 개념임을 그대로 보여준다.
  const [hoveredTarget, setHoveredTarget] = useState<MockTarget | null>(null);

  // "한 번에 고치기"가 방금 무엇을 옮겼는지(D5). onApplyShifts가 호출되면
  // 부모가 팔레트를 다시 계산하고, 그 결과 이 컴포넌트가 받는 `shifts` prop은
  // 대개 다음 렌더에서 비어버린다 — 실패가 고쳐졌으니 suggestRoleShifts가 더
  // 이상 낼 제안이 없어서다. 그래서 "무엇을 옮겼는가"는 클릭하는 그 순간의
  // `shifts` 값을 여기서 붙잡아 두지 않으면 영영 못 보여준다. RoleShift.from은
  // 애초에 상태/URL에 저장되지 않으므로(엔진 주석 참고, shiftSummary.ts) 이
  // 스냅샷이 유일한 기회다.
  //
  // 강조 링과 요약 문장을 서로 다른 상태로 나눈다 — 링은 "잠깐"(타이머로
  // 꺼짐)이어야 하지만, 문장까지 같이 지우면 role="status"의 텍스트가
  // 바뀌어 스크린리더가 새 정보 없이 한 번 더 낭독한다(M-1). 문장은 다음
  // 적용이나 "역할 기본값으로"로 명시적으로 걷힐 때까지 남는다.
  const [appliedShifts, setAppliedShifts] = useState<readonly RoleShift[] | null>(null);
  const [highlightActive, setHighlightActive] = useState(false);
  const clearTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (clearTimerRef.current !== null) window.clearTimeout(clearTimerRef.current);
    };
  }, []);

  const handleApply = () => {
    setAppliedShifts(shifts); // 사라지기 전에 스냅샷
    setHighlightActive(true);
    onApplyShifts();
    if (clearTimerRef.current !== null) window.clearTimeout(clearTimerRef.current);
    // 목업 강조만 "잠깐" 짚는다 — 계속 켜두면 다음 조작과 헷갈린다. 문장은
    // 안 건드린다(위 상태 분리 이유 참고).
    clearTimerRef.current = window.setTimeout(() => {
      setHighlightActive(false);
      clearTimerRef.current = null;
    }, APPLIED_HIGHLIGHT_MS);
  };

  // "역할 기본값으로"는 방금 적용한 이동 자체를 되돌린다 — 그 순간 "옮겼습니다"
  // 문장이 남아 있으면 되돌린 팔레트 위에 안 맞는 서술이 얹힌다(M-3). 되돌리는
  // 동작도 요약·강조를 같이 걷는다.
  const handleReset = () => {
    setAppliedShifts(null);
    setHighlightActive(false);
    if (clearTimerRef.current !== null) {
      window.clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }
    onResetShifts();
  };

  const appliedSummary = appliedShifts ? summarizeShifts(appliedShifts) : "";
  const themeTargets =
    appliedShifts && highlightActive ? shiftHighlightTargets(appliedShifts) : null;
  const lightAutoHighlight = new Set(themeTargets?.light ?? EMPTY_HIGHLIGHT);
  const darkAutoHighlight = new Set(themeTargets?.dark ?? EMPTY_HIGHLIGHT);

  return (
    <div className="space-y-3" data-testid="preview-pane">
      {/* 라이트/다크 라벨은 목업 바깥이다 — 안에 넣으면 중립 크롬 텍스트가 사용자
         팔레트 배경(n[0]/n[10]) 위에 앉아 대비를 보장할 수 없고, "크롬은 중립
         고정, 팔레트는 프리뷰 안에서만"의 선이 흐려진다. */}
      <div style={{ display: "grid", gap: "var(--ds-space-xxs)" }}>
        <div className="ds-type-caption-sm text-neutral-500">라이트</div>
        <Mock
          theme="light" scales={scales} roles={roles}
          highlight={hoveredTarget} autoHighlight={lightAutoHighlight} onHover={setHoveredTarget}
        />
      </div>
      <div style={{ display: "grid", gap: "var(--ds-space-xxs)" }}>
        <div className="ds-type-caption-sm text-neutral-500">다크</div>
        <Mock
          theme="dark" scales={scales} roles={roles}
          highlight={hoveredTarget} autoHighlight={darkAutoHighlight} onHover={setHoveredTarget}
        />
      </div>
      {/* 이 패널의 유일한 라이브 리전(DownloadRow에도 role="status"가 하나 더
         있지만 복사 성공/실패 통지용이라 목적이 다르다 — 그건 공존이 정상이고
         지울 대상이 아니다). 헤드라인 자체가 role="status"다 — sr-only 요약을
         따로 두면 스크린리더가 같은 말을 두 번 듣는다(3.3 D8-2 개정).
         개수는 확정 팔레트(summaryChecks) 기준이라 hover에 흔들리지 않는다.

         "한 번에 고치기" 직후에는 같은 리전에 무엇을 옮겼는지를 이어 붙인다
         (Task 7, D5) — 두 번째 role="status"를 새로 만들지 않는다. 별도
         리전을 두면 헤드라인과 이 문장이 거의 동시에 바뀌어 스크린리더가
         두 번 끼어들며 읽는다; 하나로 합치면 "무엇이 몇 건 남았고 방금
         무엇을 옮겼는지"가 한 번에 낭독된다. */}
      <div role="status" aria-live="polite" className="ds-type-body-sm font-semibold text-neutral-700">
        {`고칠 수 있는 대비 미달 ${summaryFixableCount}건`}
        {appliedSummary && ` — ${appliedSummary}`}
      </div>
      {failing.length > 0 && (
        <div className="space-y-1 rounded-md border border-neutral-200 p-2">
          {fixable.map((c) => (
            <ContrastBadge
              key={`${c.scaleName}-${c.roleId}-${c.theme}-${c.against}`}
              check={c}
              target={mockTargetFor(c.scaleName, c.roleId)}
              hoveredTarget={hoveredTarget}
              onHover={setHoveredTarget}
            />
          ))}
          {unfixable.length > 0 && (
            <details>
              {/* 개수는 접힌 상태에서도 남는다 — 사이클 3 D7("산출물에 무조건
                 들어가므로 화면에 없으면 받아간 파일에 모르는 것이 들어있게
                 된다")이 여기에도 걸린다. 접는 것은 목록이지 사실이 아니다. */}
              <summary
                // 요약 텍스트는 neutral-500이다 — 400은 2.58:1로 미달이다.
                // 고칠 수 없는 건수와 사유를 못 읽으면 왜 접혀 있는지 알 수
                // 없으므로 장식이 아니다 (스펙 D2).
                //
                // 아래 사유 문구는 unfixable의 실제 구성(상태색 앵커 고정 +
                // on-solid 관례값 2종)에 의존한다 — 하드코딩이다. 지금은 이
                // 두 사유가 unfixable의 전부지만(triageChecks가 왜 두 종류뿐인지는
                // suggestRoleShifts가 TEXT_ROLES에만 제안을 내는 구조 때문),
                // suggestRoleShifts가 accent/neutral의 text 실패에도 제안을 못
                // 내는 경우(clamp 실패로 found === null)가 생기면 세 번째 사유가
                // 필요해진다. 그런 상태는 현재 도달 불가로 확인됐다(리뷰에서
                // 무작위 액센트 2400개 + 적용 후 410개로 검증) — 그래도 이 문구를
                // 고칠 때는 unfixable의 실제 구성부터 다시 확인해야 한다.
                className="cursor-pointer ds-type-caption-sm text-neutral-500"
              >
                {`고칠 수 없는 미달 ${unfixable.length}건 — 상태색은 고정 앵커, 솔리드 위 글자는 관례값이라 이 화면에서 못 바꿉니다`}
              </summary>
              <div className="mt-1 space-y-1">
                {/* unfixable도 target != null이면 배선한다 — accent/on-solid이
                   바로 그 경우다("한 번에 고치기"로는 못 고치지만 목업의
                   "보고서 열기"를 가리킬 수는 있다). 나머지(상태색 text·
                   text-strong 등)는 mockTargetFor가 null을 내므로 그대로
                   비배선이다. */}
                {unfixable.map((c) => (
                  <ContrastBadge
                    key={`${c.scaleName}-${c.roleId}-${c.theme}-${c.against}`}
                    check={c}
                    target={mockTargetFor(c.scaleName, c.roleId)}
                    hoveredTarget={hoveredTarget}
                    onHover={setHoveredTarget}
                  />
                ))}
              </div>
            </details>
          )}
          {shifts.length > 0 && (
            <button
              type="button"
              onClick={handleApply}
              className="mt-1 w-full rounded border border-neutral-800 px-2 py-1 ds-type-caption-sm"
            >
              한 번에 고치기
            </button>
          )}
          {shifts.length === 0 && hasApplied && (
            <button
              type="button"
              onClick={handleReset}
              className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 ds-type-caption-sm text-neutral-500"
            >
              역할 기본값으로
            </button>
          )}
        </div>
      )}
    </div>
  );
}
