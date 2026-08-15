//
// WCAG 2.2 대비 판정. APCA가 더 정확하지만 아직 초안이고, 이 도구는 숫자의 의미를
// 설명하지 않기로 했으므로(스펙 D9) 널리 통용되는 쪽을 쓴다.
// 스펙: docs/superpowers/specs/2026-08-15-color-palette-generator-design.md

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
