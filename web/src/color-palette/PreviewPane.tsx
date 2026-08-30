// web/src/color-palette/PreviewPane.tsx
//
// 라이트·다크를 토글이 아니라 동시에 보여준다 — 대비 실패는 다크에서만 나는
// 경우가 흔한데 토글이면 그것을 못 보고 지나간다 (스펙 D8).

import { bgLabel, formatRatio, onSolidColor } from "@core/color/contrast.js";
import type { ContrastCheck, RoleShift } from "@core/color/contrast.js";
import { SCALE_ORDER } from "@core/color/roles.js";
import type { ScaleRole, ScaleSet } from "@core/color/roles.js";
import { roleLabel, triageChecks } from "./contrastTriage";

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
  theme, scales, roles,
}: { theme: "light" | "dark"; scales: ScaleSet; roles: readonly ScaleRole[] }) {
  const at = (hexes: readonly string[], id: string) => hexes[stopIdx(roles, id, theme)];
  const a = scales.accent;
  const n = scales.neutral;
  const err = scales.semantic.error;
  const solid = at(a, "solid");
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
          <div className="text-[11px] font-semibold" style={{ color: at(n, "text-strong") }}>
            주간 활성 사용자
          </div>
          <div className="text-[10px]" style={{ color: at(n, "text") }}>
            지난 5주
          </div>
        </div>

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
            className="rounded px-2.5 py-1 text-[11px] font-medium"
            style={{ background: solid, color: onSolidColor(solid) }}
          >
            보고서 열기
          </span>
          <span
            className="rounded border px-2.5 py-1 text-[11px] font-medium"
            style={{
              background: at(a, "subtle-bg"),
              borderColor: at(a, "border"),
              color: at(a, "text-strong"),
            }}
          >
            공유
          </span>
          <span
            className="ml-auto rounded px-1.5 py-0.5 text-[10px]"
            style={{ background: at(err, "subtle-bg"), color: at(err, "text-strong") }}
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
function ContrastBadge({ check: c }: { readonly check: ContrastCheck }) {
  return (
    <div
      data-testid="contrast-badge"
      // 뱃지 색은 neutral-500이다 — adjustable이 false인 "고정" 뱃지도
      // 400은 2.58:1로 미달이다. 대비 미달 사항을 못 읽으면 알 수 없으므로
      // 장식이 아니다 (스펙 D2).
      className={`ds-type-caption-sm text-neutral-500`}
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
  const { fixable, unfixable } = triageChecks(failing, shifts);

  // 헤드라인 개수는 확정 팔레트(summaryChecks) 기준이어야 한다 — checks는 hover
  // 프리뷰(shownScales)까지 반영해 스와치를 스칠 때마다 바뀌므로, 그대로 쓰면
  // "hover는 미리보기일 뿐 확정이 아니다"라는 이 화면의 계약이 헤드라인에서
  // 깨진다.
  const summaryFailing = summaryChecks.filter((c) => !c.passes);
  const summaryFixableCount = triageChecks(summaryFailing, shifts).fixable.length;
  return (
    <div className="space-y-3">
      {/* 라이트/다크 라벨은 목업 바깥이다 — 안에 넣으면 중립 크롬 텍스트가 사용자
         팔레트 배경(n[0]/n[10]) 위에 앉아 대비를 보장할 수 없고, "크롬은 중립
         고정, 팔레트는 프리뷰 안에서만"의 선이 흐려진다. */}
      <div style={{ display: "grid", gap: "var(--ds-space-xxs)" }}>
        <div className="ds-type-caption-sm text-neutral-500">라이트</div>
        <Mock theme="light" scales={scales} roles={roles} />
      </div>
      <div style={{ display: "grid", gap: "var(--ds-space-xxs)" }}>
        <div className="ds-type-caption-sm text-neutral-500">다크</div>
        <Mock theme="dark" scales={scales} roles={roles} />
      </div>
      {/* 이 패널의 유일한 라이브 리전(DownloadRow에도 role="status"가 하나 더
         있지만 복사 성공/실패 통지용이라 목적이 다르다 — 그건 공존이 정상이고
         지울 대상이 아니다). 헤드라인 자체가 role="status"다 — sr-only 요약을
         따로 두면 스크린리더가 같은 말을 두 번 듣는다(3.3 D8-2 개정).
         개수는 확정 팔레트(summaryChecks) 기준이라 hover에 흔들리지 않는다. */}
      <div role="status" aria-live="polite" className="ds-type-body-sm font-semibold text-neutral-700">
        {`고칠 수 있는 대비 미달 ${summaryFixableCount}건`}
      </div>
      {failing.length > 0 && (
        <div className="space-y-1 rounded-md border border-neutral-200 p-2">
          {fixable.map((c) => (
            <ContrastBadge key={`${c.scaleName}-${c.roleId}-${c.theme}-${c.against}`} check={c} />
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
                {unfixable.map((c) => (
                  <ContrastBadge
                    key={`${c.scaleName}-${c.roleId}-${c.theme}-${c.against}`}
                    check={c}
                  />
                ))}
              </div>
            </details>
          )}
          {shifts.length > 0 && (
            <button
              type="button"
              onClick={onApplyShifts}
              className="mt-1 w-full rounded border border-neutral-800 px-2 py-1 ds-type-caption-sm"
            >
              한 번에 고치기
            </button>
          )}
          {shifts.length === 0 && hasApplied && (
            <button
              type="button"
              onClick={onResetShifts}
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
