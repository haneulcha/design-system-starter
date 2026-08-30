// web/src/color-palette/mockTargets.ts
//
// 대비 경고(scaleName·roleId)를 PreviewPane의 Mock이 실제로 그리는 요소에
// 잇는다. on-solid이 뭔지는 이미 화면에 있다 — 라이트 목업의 "보고서 열기"가
// 그 solid + on-solid 쌍이다. 어휘를 설명하는 대신 가리켜서 가르친다(스펙 D3).
//
// 이 파일은 순수 매핑만 담는다 — 그리기는 PreviewPane의 Mock이 한다(로직/렌더
// 분리, CLAUDE.md 하드 규칙). Mock을 열어 실제로 그리는 요소만 다음처럼 확인했다:
//   - 뉴트럴: 페이지·카드·테두리, 텍스트 2종(text-strong·text)
//   - 액센트: 막대(bars, raw index라 역할과 무관), solid·on-solid(보고서 열기),
//     subtle-bg·border·text-strong(공유 버튼의 배경·테두리·글자)
//   - error: subtle-bg + text-strong 배지 하나
// warning·success·info, error의 solid/on-solid/text는 목업에 아예 없다 —
// 목업을 넓혀 커버리지를 올리지 않는다(3.1 D2 재개봉 금지). 그런 조합은 null.
export type MockTarget =
  | "solid-btn"
  | "share-btn"
  | "bars"
  | "card-text"
  | "card-subtext"
  | "error-badge";

export function mockTargetFor(scaleName: string, roleId: string): MockTarget | null {
  if (scaleName === "accent") {
    if (roleId === "solid" || roleId === "on-solid") return "solid-btn";
    // 공유 버튼은 subtle-bg 배경 + border 테두리 + text-strong 글자로 그려진다.
    // "text"는 그 버튼에 별도 글자로 그려지진 않지만, text-strong과 같은 축
    // (엔진 TEXT_ROLES)의 실패라 같은 버튼을 가리켜야 한다 — 실측(#f5d90a)에서
    // 고칠 수 있는 실패 4건이 이 두 역할(text·text-strong)뿐이고, DOM에 먼저
    // 뜨는 게 text쪽이라 여기 안 걸면 그 뱃지는 hover해도 아무것도 안 켜진다.
    if (
      roleId === "text" ||
      roleId === "text-strong" ||
      roleId === "subtle-bg" ||
      roleId === "border"
    ) {
      return "share-btn";
    }
    return null;
  }
  if (scaleName === "neutral") {
    if (roleId === "text-strong") return "card-text";
    if (roleId === "text") return "card-subtext";
    return null;
  }
  if (scaleName === "error") {
    if (roleId === "subtle-bg" || roleId === "text-strong") return "error-badge";
    return null;
  }
  // warning·success·info: 목업에 아예 없다.
  return null;
}
