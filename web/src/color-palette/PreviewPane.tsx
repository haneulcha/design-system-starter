// web/src/color-palette/PreviewPane.tsx
//
// 라이트·다크를 토글이 아니라 동시에 보여준다 — 대비 실패는 다크에서만 나는
// 경우가 흔한데 토글이면 그것을 못 보고 지나간다 (스펙 D8).

import type { CSSProperties } from "react";
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

function Mock({
  theme, scales, roles,
}: { theme: "light" | "dark"; scales: ScaleSet; roles: readonly ScaleRole[] }) {
  const at = (hexes: readonly string[], id: string) => hexes[stopIdx(roles, id, theme)];
  const a = scales.accent;
  const err = scales.semantic.error;
  const vars = {
    background: theme === "light" ? scales.neutral[0] : scales.neutral[10],
  } as CSSProperties;
  return (
    <div data-testid={`mock-${theme}`} className="rounded-lg p-4 space-y-3" style={vars}>
      <div
        className="rounded-md p-3 space-y-1 border"
        style={{ background: at(a, "subtle-bg"), borderColor: at(a, "border") }}
      >
        <div className="text-[11px] font-semibold" style={{ color: at(a, "text-strong") }}>
          알림 카드 제목
        </div>
        <div className="text-[11px]" style={{ color: at(a, "text") }}>
          링크 텍스트가 이 색으로 보입니다
        </div>
      </div>
      <div className="flex gap-2">
        <span
          className="rounded px-2.5 py-1 text-[11px] font-medium"
          style={{
            background: at(a, "solid"),
            color: onSolidColor(at(a, "solid")),
          }}
        >
          솔리드 버튼
        </span>
        <span
          className="rounded px-2.5 py-1 text-[11px] font-medium"
          style={{ background: at(err, "subtle-bg"), color: at(err, "text-strong") }}
        >
          오류 배지
        </span>
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
      className={`text-[10px] ${c.adjustable ? "text-neutral-500" : "text-neutral-400"}`}
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
              <summary className="cursor-pointer text-[10px] text-neutral-400">
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
              className="mt-1 w-full rounded border border-neutral-800 px-2 py-1 text-[11px]"
            >
              한 번에 고치기
            </button>
          )}
          {shifts.length === 0 && hasApplied && (
            <button
              type="button"
              onClick={onResetShifts}
              className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-[11px] text-neutral-500"
            >
              역할 기본값으로
            </button>
          )}
        </div>
      )}
    </div>
  );
}
