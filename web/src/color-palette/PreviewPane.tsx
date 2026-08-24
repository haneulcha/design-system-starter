// web/src/color-palette/PreviewPane.tsx
//
// 라이트·다크를 토글이 아니라 동시에 보여준다 — 대비 실패는 다크에서만 나는
// 경우가 흔한데 토글이면 그것을 못 보고 지나간다 (스펙 D8).

import { bgLabel, formatRatio, onSolidColor } from "@core/color/contrast.js";
import type { ContrastCheck, RoleShift } from "@core/color/contrast.js";
import { SCALE_ORDER } from "@core/color/roles.js";
import type { ScaleRole, ScaleSet } from "@core/color/roles.js";

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
      className={`ds-type-caption-sm ${c.adjustable ? "text-neutral-500" : "text-neutral-400"}`}
    >
      {`⚠ ${LABELS[c.scaleName] ?? c.scaleName} ${c.roleId} (${
        c.theme === "light" ? "라이트" : "다크"
      } · ${bgLabel(c.against)}) ${formatRatio(c.ratio)} / ${c.required}${
        c.adjustable ? "" : " · 고정"
      }`}
    </div>
  );
}

export function PreviewPane({
  scales, roles, checks, shifts, hasApplied, onApplyShifts, onResetShifts,
}: {
  readonly scales: ScaleSet;
  readonly roles: readonly ScaleRole[];
  readonly checks: readonly ContrastCheck[];
  readonly shifts: readonly RoleShift[];
  readonly hasApplied: boolean;
  readonly onApplyShifts: () => void;
  readonly onResetShifts: () => void;
}) {
  const failing = checks.filter((c) => !c.passes);
  // adjustable=true(사용자가 손댈 수 있는 것)를 위에 그대로 두고, adjustable=false
  // (고정값이라 못 고치는 것)는 접어서 위계를 가른다 — 훑어봤을 때 "경고 10개"가
  // 아니라 실제로 손댈 수 있는 게 몇 건인지가 먼저 보여야 한다.
  const adjustableFailing = failing.filter((c) => c.adjustable);
  const fixedFailing = failing.filter((c) => !c.adjustable);
  return (
    <div className="space-y-3">
      <Mock theme="light" scales={scales} roles={roles} />
      <Mock theme="dark" scales={scales} roles={roles} />
      {failing.length > 0 && (
        <div className="space-y-1 rounded-md border border-neutral-200 p-2">
          {adjustableFailing.map((c) => (
            <ContrastBadge key={`${c.scaleName}-${c.roleId}-${c.theme}-${c.against}`} check={c} />
          ))}
          {fixedFailing.length > 0 && (
            <details>
              <summary className="cursor-pointer ds-type-caption-sm text-neutral-400">
                {`고정값 미달 ${fixedFailing.length}건`}
              </summary>
              <div className="mt-1 space-y-1">
                {fixedFailing.map((c) => (
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
