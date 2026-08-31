// web/src/color-palette/mockTargets.ts
//
// 대비 경고(scaleName·roleId)를 PreviewPane의 Mock이 실제로 그리는 요소에
// 잇는다. on-solid이 뭔지는 이미 화면에 있다 — 라이트 목업의 "보고서 열기"가
// 그 solid + on-solid 쌍이다. 어휘를 설명하는 대신 가리켜서 가르친다(스펙 D3).
//
// 이 파일은 순수 매핑만 담는다 — 그리기는 PreviewPane의 Mock이 한다(로직/렌더
// 분리, CLAUDE.md 하드 규칙). 배선 기준은 "고칠 수 있는가"(fixable)가 아니라
// "가리킬 데가 있는가"(이 함수가 null이 아닌가)다 — 2026-08-30 스펙 개정
// (docs/superpowers/specs/2026-08-30-color-palette-ux-repair-design.md D3의
// "판단 변경" 블록). accent/on-solid이 그 개정의 이유다: 절대 못 고치는
// 경고(triageChecks가 구조적으로 unfixable로 보낸다)인데 목업엔 대응 요소
// (보고서 열기)가 있다 — fixable로 가르면 이 대표 사례가 영원히 안 가리켜진다.
//
// Mock을 열어 실제로 "역할별로" 그리는 요소만 아래처럼 확인했다. 주의: Mock이
// 그 색을 화면에 쓴다고 해서 곧바로 매핑 대상이 되는 건 아니다 — checkContrast는
// text·text-strong·on-solid 세 roleId에 대해서만 검사를 만들고(border·subtle-bg는
// 절대 뱃지로 뜨지 않는다), 그래서 실질적으로 이 함수를 움직이는 것도 이 셋뿐이다.
//   - 뉴트럴: text-strong("주간 활성 사용자"), text("지난 5주"). border도 카드
//     테두리로 그려지지만 대응하는 MockTarget이 없다 — border 대비를 재는
//     UI 개념(텍스트 대비) 자체가 없어서다.
//   - 액센트: solid·on-solid → 보고서 열기(solid + on-solid 쌍).
//     subtle-bg·border·text-strong → 공유 버튼(배경·테두리·글자). "text"(텍스트
//     (링크), lightIndex 6)는 공유 버튼과 다른 stop이고 목업에 그 stop을 쓰는
//     요소가 없다 — text-strong의 TEXT_ROLES 짝이라는 것만으로 같은 버튼을
//     가리키게 하면 실제로 안 쓰인 stop의 실패에 엉뚱한 요소가 켜진다(리뷰
//     반증: #00a3a3에서 text만 실패·text-strong은 통과인데 공유 버튼이 켜짐).
//     막대(bars)는 raw index(a[3..7])로 그려서 역할과 아예 무관 — 이 함수는
//     bars를 결코 반환하지 않는다("MockTarget" 유니온에는 남아 있다, 아래 참고).
//   - error: subtle-bg + text-strong 배지 하나("실패 2"). error의 solid·text는
//     목업에 없다.
// warning·success·info는 목업에 아예 없다 — 목업을 넓혀 커버리지를 올리지
// 않는다(3.1 D2 재개봉 금지). 그런 조합은 null.
export type MockTarget =
  | "solid-btn"
  | "share-btn"
  // "bars"는 이 사이클이 정한 시그니처의 일부라 유니온에 남긴다 — 하지만 막대는
  // raw stop을 직접 읽어(PreviewPane의 BAR_STOPS 주석 참고) 어떤 역할과도 안
  // 묶이므로 mockTargetFor는 이 값을 절대 반환하지 않는다.
  | "bars"
  | "card-text"
  | "card-subtext"
  | "error-badge";

export function mockTargetFor(scaleName: string, roleId: string): MockTarget | null {
  if (scaleName === "accent") {
    if (roleId === "solid" || roleId === "on-solid") return "solid-btn";
    if (roleId === "text-strong" || roleId === "subtle-bg" || roleId === "border") {
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
