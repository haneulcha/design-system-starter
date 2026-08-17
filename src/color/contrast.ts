//
// WCAG 2.2 대비 판정. APCA가 더 정확하지만 아직 초안이고, 이 도구는 숫자의 의미를
// 설명하지 않기로 했으므로(스펙 D9) 널리 통용되는 쪽을 쓴다.
// 스펙: docs/superpowers/specs/2026-08-15-color-palette-generator-design.md

import type { ScaleRole, ScaleSet } from "./roles.js";

/** 본문 크기 AA. 큰 글씨 3:1은 이 사이클에서 판정하지 않는다. */
export const AA_BODY = 4.5;

/** sRGB 채널 → 선형. WCAG 2.x의 상대 휘도 정의 그대로. */
const channel = (v: number): number =>
  v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;

function relativeLuminance(hex: string): number {
  // 잘못된 hex 형식은 반드시 throw해야 한다. 조용한 오답이 최악이다.
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
    throw new Error(`relativeLuminance: not a #rrggbb colour: ${hex}`);
  }
  const n = Number.parseInt(hex.slice(1), 16);
  const r = channel(((n >> 16) & 0xff) / 255);
  const g = channel(((n >> 8) & 0xff) / 255);
  const b = channel((n & 0xff) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** 두 색의 대비비 (1..21). 인자 순서는 결과에 영향을 주지 않는다. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** 흰 글자를 포기하는 바닥. WCAG가 큰 글씨·UI 경계에 요구하는 최저선이고,
 *  이 아래로는 글자를 아무리 키워도 읽히지 않는다. */
export const ON_SOLID_FLOOR = 3.0;

/** 솔리드 위에 올릴 글자색. 스케일 자신의 50/950으로는 양쪽 다 미달인 경우가
 *  흔해(파랑 3.45/4.02, 보라 3.95/3.57) 흑백 리터럴에서 고른다.
 *
 *  "대비가 높은 쪽"을 무조건 고르지 않는 이유: 그러면 파랑·빨강 솔리드 버튼의 글자가
 *  전부 검정이 되는데, Tailwind·Radix·Bootstrap이 모두 그 자리에 흰 글자를 쓴다.
 *  흰색-on-파랑이 AA를 아슬하게 못 넘는 것은 WCAG 2.x의 알려진 성질이라(APCA는 같은
 *  조합에서 흰색을 낸다) 여기서 산술을 엄격히 따르면 사용자가 버그로 읽는다.
 *  값은 관례대로 두고 미달은 뱃지로 드러낸다 — 상태색에 대해 D4가 고른 방식과 같다.
 *  스펙 D5. */
export function onSolidColor(solidHex: string): "#000000" | "#ffffff" {
  const white = contrastRatio("#ffffff", solidHex);
  if (white >= ON_SOLID_FLOOR) return "#ffffff";
  return contrastRatio("#000000", solidHex) > white ? "#000000" : "#ffffff";
}

export interface ContrastCheck {
  readonly scaleName: string;
  readonly roleId: string;
  readonly theme: "light" | "dark";
  /** 무엇을 배경으로 쟀는가. "solid"는 on-solid 검사에서만 나온다. */
  readonly against: "subtle-bg" | "page" | "solid";
  readonly ratio: number;
  readonly required: number;
  readonly passes: boolean;
  /** 사용자가 이 스케일을 바꿀 수 있는가 — 뱃지만 띄울지 고치기를 권할지 가른다. */
  readonly adjustable: boolean;
}

/** 어디로 옮길지. 상태·URL에 저장되는 것은 이쪽이다. */
export interface RoleOverride {
  readonly roleId: "text" | "text-strong";
  readonly theme: "light" | "dark";
  readonly to: number;
}

/** 제안. `from`은 화면에 "6 → 8"을 보여주기 위한 것이고 저장되지 않는다 —
 *  옛 링크가 옛 기본값을 실어 오면 안 되므로 URL에는 `to`만 싣는다. */
export interface RoleShift extends RoleOverride {
  readonly from: number;
}

/** 이동 제안의 입력이 되는 스케일. 상태색은 앵커가 고정이라 사용자가 바꿀 수 없고,
 *  그것 때문에 액센트까지 800번대로 끌어내리지 않는다 — 스펙 D4. */
const ADJUSTABLE: readonly string[] = ["accent", "neutral"];

const TEXT_ROLES: readonly ("text" | "text-strong")[] = ["text", "text-strong"];

function scaleEntries(scales: ScaleSet): [string, readonly string[]][] {
  return [
    ["accent", scales.accent],
    ["neutral", scales.neutral],
    ...Object.entries(scales.semantic),
  ];
}

function stopIndex(roles: readonly ScaleRole[], id: string, theme: "light" | "dark"): number {
  const r = roles.find((x) => x.id === id);
  if (!r || r.kind !== "stop") throw new Error(`stopIndex: no stop role "${id}"`);
  return theme === "light" ? r.lightIndex : r.darkIndex;
}

export function checkContrast(
  scales: ScaleSet,
  roles: readonly ScaleRole[],
): ContrastCheck[] {
  const out: ContrastCheck[] = [];
  for (const [name, hexes] of scaleEntries(scales)) {
    const adjustable = ADJUSTABLE.includes(name);
    for (const theme of ["light", "dark"] as const) {
      const subtleBg = hexes[stopIndex(roles, "subtle-bg", theme)];
      const page = theme === "light" ? scales.neutral[0] : scales.neutral[10];
      for (const roleId of TEXT_ROLES) {
        const fg = hexes[stopIndex(roles, roleId, theme)];
        for (const [against, bg] of [["subtle-bg", subtleBg], ["page", page]] as const) {
          const ratio = contrastRatio(fg, bg);
          out.push({
            scaleName: name, roleId, theme, against,
            ratio, required: AA_BODY, passes: ratio >= AA_BODY, adjustable,
          });
        }
      }
      // on-solid은 통과가 보장되지 않는다. 흰색이 3.0 이상이면 관례대로 흰색을 지키므로
      // 파랑(3.68)·빨강(3.81)은 AA 미달인 채로 나간다 — 그걸 뱃지로 드러내는 것이 이
      // 검사의 존재 이유다 (스펙 D5).
      if (theme === "light") {
        const solid = hexes[stopIndex(roles, "solid", "light")];
        const ratio = contrastRatio(onSolidColor(solid), solid);
        out.push({
          scaleName: name, roleId: "on-solid", theme: "light", against: "solid",
          ratio, required: AA_BODY, passes: ratio >= AA_BODY, adjustable,
        });
      }
    }
  }
  return out;
}

/** 이 인덱스가 조정 가능한 스케일 전부에서 AA를 통과하는가. */
function indexPasses(
  scales: ScaleSet,
  roles: readonly ScaleRole[],
  theme: "light" | "dark",
  index: number,
): boolean {
  const page = theme === "light" ? scales.neutral[0] : scales.neutral[10];
  const subtleIdx = stopIndex(roles, "subtle-bg", theme);
  return scaleEntries(scales)
    .filter(([name]) => ADJUSTABLE.includes(name))
    .every(([, hexes]) =>
      contrastRatio(hexes[index], hexes[subtleIdx]) >= AA_BODY &&
      contrastRatio(hexes[index], page) >= AA_BODY);
}

export function suggestRoleShifts(
  scales: ScaleSet,
  roles: readonly ScaleRole[],
): RoleShift[] {
  const out: RoleShift[] = [];
  for (const theme of ["light", "dark"] as const) {
    // 라이트는 진해지는 방향(인덱스 증가), 다크는 밝아지는 방향(감소).
    const step = theme === "light" ? 1 : -1;
    const last = theme === "light" ? 10 : 0;
    let floor: number | null = null; // text가 확정된 자리 — strong은 그보다 더 가야 한다
    for (const roleId of TEXT_ROLES) {
      const from = stopIndex(roles, roleId, theme);
      const start: number = floor === null ? from : floor + step;
      let found: number | null = null;
      for (let i: number = start; i >= 0 && i <= 10 && i * step <= last * step; i += step) {
        if (indexPasses(scales, roles, theme, i)) { found = i; break; }
      }
      if (found === null) continue;   // 어느 자리도 통과하지 못하면 제안하지 않는다
      floor = found;
      if (found !== from) out.push({ roleId, theme, from, to: found });
    }
  }
  return out;
}

export function applyRoleShifts(
  roles: readonly ScaleRole[],
  shifts: readonly RoleOverride[],
): ScaleRole[] {
  return roles.map((role) => {
    if (role.kind !== "stop") return role;
    const light = shifts.find((s) => s.roleId === role.id && s.theme === "light");
    const dark = shifts.find((s) => s.roleId === role.id && s.theme === "dark");
    if (!light && !dark) return role;
    return {
      ...role,
      lightIndex: light ? light.to : role.lightIndex,
      darkIndex: dark ? dark.to : role.darkIndex,
    };
  });
}

// ── DESIGN.md 경고 문구 ─────────────────────────────────────────────────
//
// 화면 뱃지(PreviewPane)와 다운로드 파일(DownloadRow, ExportPanel)이 같은 문장을
// 써야 한다 — 소비처가 둘이라 화면 폴더(web/)에 두면 나머지 하나가 구조적으로
// 못 쓴다. 엔진(src/color/)이 이미 checkContrast를 갖고 있으니 문구도 여기서
// 만들어 산출 코드(src/export/)에는 여전히 데이터로만 넘긴다 — 산출 코드는
// 이 파일을 import하지 않는다(D5의 계층 규칙).

/** 큰 글씨(WCAG 2.2)의 대비 하한. 본문 하한(AA_BODY=4.5)과 별개로 실측에만 쓴다 —
 *  "여기부터는 큰 글씨로만 쓰라"는 허용을 주지 않기 위해 케이스마다 직접 판정한다. */
const AA_LARGE = 3.0;

/** 화면에 보여줄 비율은 내림한다 — 4.4957을 toFixed(2)로 반올림하면 4.50이 되어
 *  기준(4.5)을 충족한 것처럼 보인다. 뱃지·DESIGN.md가 같은 함수를 써야 두 표현이
 *  갈라지지 않는다. */
export function formatRatio(ratio: number): string {
  return (Math.floor(ratio * 100) / 100).toFixed(2);
}

function themeLabel(theme: ContrastCheck["theme"]): string {
  return theme === "light" ? "라이트" : "다크";
}

/** 무엇을 배경으로 쟀는지 사람이 읽을 말로. 화면 뱃지도 이걸 써야 같은 role·theme의
 *  두 검사(subtle-bg 대·page 대)가 같은 문장으로 겹쳐 보이지 않는다. */
export function bgLabel(against: ContrastCheck["against"]): string {
  if (against === "subtle-bg") return "은은한 배경";
  if (against === "page") return "페이지 배경";
  return "solid";
}

/** 라이트는 진해지는 방향, 다크는 밝아지는 방향으로 옮기면 대비가 오른다 —
 *  suggestRoleShifts와 같은 방향(스펙 D5). 구체적 stop 번호는 곡선·팔레트마다
 *  달라 여기서 단정하지 않는다 — 방향만 안내한다. */
function directionHint(theme: ContrastCheck["theme"]): string {
  return theme === "light" ? "더 진한 stop" : "더 밝은 stop";
}

/** 본문/큰 글씨 두 케이스가 서로 다른 문장 틀을 쓴다 — 같은 틀에 "넘는다"와
 *  "부족하다"를 끼워 넣으면 "A는 물론 B"가 자기모순이 된다. */
function shortfall(ratio: number, required: number): string {
  return ratio >= AA_LARGE
    ? `큰 글씨(3:1)는 넘지만 본문(${required}:1)에는 못 쓴다`
    : `본문(${required}:1)은 물론 큰 글씨(3:1)로도 부족하다`;
}

/** on-solid은 stop을 옮겨 고칠 수 없다 — 흑/백 중 관례상 나은 쪽을 고른 결과라
 *  "직접 다른 stop을 쓰라"는 안내가 맞지 않는다(스펙 D5). 별도 문구를 준다.
 *
 *  변수명 뒤에 조사를 바로 붙이지 않는다 — "text"는 "텍스트"로 읽으면 받침이
 *  없어 "는"이 맞고 "text-strong"은 "스트롱"으로 읽으면 받침이 있어 "은"이 맞는데,
 *  영문 마지막 글자만 보고 고르면(구 eun()) 발음과 반대로 나온다. 임의의 스케일·
 *  역할 이름이 앞으로 늘어도 영원히 맞으려면 조사 자체를 피하는 게 유일한 방법이다
 *  — "— 문장"으로 변수명을 동격 삽입하듯 끊는다. */
function onSolidWarning(c: ContrastCheck): string {
  return (
    `\`--color-${c.scaleName}-on-solid\` — AA 미달: solid 위 ${formatRatio(c.ratio)}이라 ` +
    `${shortfall(c.ratio, c.required)}. 흰/검 중 대비가 나은 쪽을 관례대로 고른 값이라 ` +
    `stop을 옮겨 고칠 수 없다 — 미달을 감수하고 쓰거나 solid 위에는 별도 배경/경계를 더할 것.`
  );
}

function stopWarning(c: ContrastCheck): string {
  return (
    `\`--color-${c.scaleName}-${c.roleId}\` — ${themeLabel(c.theme)} 테마에서 AA 미달: ` +
    `${bgLabel(c.against)} 위 ${formatRatio(c.ratio)}이라 ${shortfall(c.ratio, c.required)}. ` +
    `AA가 필요하면 ${directionHint(c.theme)}을 직접 쓸 것.`
  );
}

/** 경고 문구는 엔진 계산(checkContrast)으로 만들어 산출 코드에 데이터로 넘긴다 —
 *  산출 코드가 대비를 직접 재면 화면 뱃지와 갈라질 수 있다(스펙 D5). 화면 뱃지와
 *  같은 전체 실패 집합(`checks.filter((c) => !c.passes)`, PreviewPane 참고)을 쓴다 —
 *  theme·against로 걸러내는 부분집합화는 재계산과 같은 종류의 갈라짐을 만든다. */
export function buildContrastWarnings(
  scales: ScaleSet,
  roles: readonly ScaleRole[],
): string[] {
  return checkContrast(scales, roles)
    .filter((c) => !c.passes)
    .map((c) => (c.roleId === "on-solid" ? onSolidWarning(c) : stopWarning(c)));
}
