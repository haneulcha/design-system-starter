// 상태 ↔ URL. pin을 옵션 번호가 아니라 hex로 저장하는 이유: 후보 상수는 앞으로
// 바뀔 물건이고, 번호로 저장하면 공유 링크가 가리키는 색이 조용히 달라진다.
//
// 파싱은 절대 던지지 않는다. URL은 사용자 입력이고, 남이 준 링크가 깨졌을 때
// 빈 화면을 주면 안 된다. 항목별로 기본값 폴백한다.

import { TINT_ATTRACTORS } from "@core/color/neutral.js";
import type { RoleOverride } from "@core/color/contrast.js";
import {
  ADJUSTABLE_STOPS, defaultState, type AdjustableStop, type PaletteState,
} from "./paletteState";

const VERSION = "1";
const HEX = /^[0-9a-f]{6}$/i;
const SHIFT_PARAM: Record<"text" | "text-strong", string> = { text: "t", "text-strong": "ts" };

const bare = (hex: string) => hex.replace(/^#/, "").toLowerCase();

export function serialize(state: PaletteState): string {
  const p = new URLSearchParams();
  p.set("v", VERSION);
  p.set("a", bare(state.accentHex));
  for (const i of ADJUSTABLE_STOPS) {
    const hex = state.pins[i];
    if (hex) p.set(`s${i}`, bare(hex));
  }
  if (state.tint) {
    const attractor = TINT_ATTRACTORS.find((a) => a.id === state.tint!.attractorId);
    // 무채색은 강도가 없다 — 붙이면 파싱할 때 무의미한 값이 하나 늘 뿐이다.
    p.set("n", attractor?.hue === null ? state.tint.attractorId : `${state.tint.attractorId}-${state.tint.strength}`);
  }
  for (const roleId of ["text", "text-strong"] as const) {
    const light = state.shifts.find((s) => s.roleId === roleId && s.theme === "light");
    const dark = state.shifts.find((s) => s.roleId === roleId && s.theme === "dark");
    if (!light && !dark) continue;
    p.set(SHIFT_PARAM[roleId], `${light?.to ?? ""}-${dark?.to ?? ""}`);
  }
  return `?${p.toString()}`;
}

const idx = (raw: string | null): number | null => {
  if (raw === null || raw === "") return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n <= 10 ? n : null;
};

function parseShifts(p: URLSearchParams): RoleOverride[] {
  const out: RoleOverride[] = [];
  for (const roleId of ["text", "text-strong"] as const) {
    const raw = p.get(SHIFT_PARAM[roleId]);
    if (!raw) continue;
    const [l, d] = raw.split("-");
    const light = idx(l ?? null);
    const dark = idx(d ?? null);
    // 반쪽이라도 깨졌으면 이 파라미터 전체를 버린다. `t=99-4`에서 다크만 살리면
    // 사용자가 준 적 없는 조합이 만들어진다 — "항목별 기본값 폴백"의 항목은
    // 파라미터 하나다.
    if ((l !== "" && light === null) || (d !== "" && d !== undefined && dark === null)) continue;
    if (light !== null) out.push({ roleId, theme: "light", to: light });
    if (dark !== null) out.push({ roleId, theme: "dark", to: dark });
  }
  return out;
}

export function parse(search: string): PaletteState {
  const fallback = defaultState();
  let p: URLSearchParams;
  try {
    p = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  } catch {
    return fallback;
  }
  if (p.get("v") !== VERSION) return fallback;

  const a = p.get("a");
  const accentHex = a && HEX.test(a) ? `#${a.toLowerCase()}` : fallback.accentHex;

  const pins = { ...fallback.pins } as Record<AdjustableStop, string | undefined>;
  for (const i of ADJUSTABLE_STOPS) {
    const raw = p.get(`s${i}`);
    if (raw && HEX.test(raw)) pins[i] = `#${raw.toLowerCase()}`;
  }

  let tint: PaletteState["tint"] = null;
  const n = p.get("n");
  if (n) {
    const [id, strength] = n.split("-");
    const attractor = TINT_ATTRACTORS.find((x) => x.id === id);
    if (attractor) {
      tint = {
        attractorId: id,
        strength: strength === "strong" ? "strong" : "soft",
      };
    }
  }

  return { accentHex, pins, tint, shifts: parseShifts(p) };
}
