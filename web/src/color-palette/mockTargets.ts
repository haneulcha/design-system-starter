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
//   - error: **solid + on-solid** 배지 하나("실패 2"). 진한 배경·밝은 글자다.
//     subtle-bg·text-strong은 이 칩이 안 읽으므로 null이다 — 옛 매핑을 뒤집는다
//     (2026-09-01 스펙 D5).
//   - warning·success·info: subtle-bg 배경 + text-strong 글자 칩 각각 하나
//     ("지연 1" / "완료 12" / "동기화").
//
// **3.1 D2("상태 한 조각… 작게 하나면 충분하다")는 상시 규칙에서 은퇴했다**
// (2026-09-01 스펙의 "뒤집는 판단 1"). 이 파일의 옛 주석은 그 규칙을 근거로
// warning·success·info를 영구 null로 선언했는데, 그 결과 checkContrast가
// 만드는 그 스케일들의 검사는 **가리킬 데가 구조적으로 없었다** — 3.1 D2와
// 직전 스펙 D3의 배선 기준("가리킬 데가 있는가")이 서로를 막고 있던 셈이다.
// 은퇴시키되 새 상시 규칙을 그 자리에 세우지 않는다: 목업은 aside 세로 여유
// 실측과 이 파일의 배선 원칙 둘로 충분히 다스려진다.
//
// 잃은 것도 적는다 — error/text-strong은 이제 가리킬 데가 없다. 칩 하나는
// 배경·글자 쌍을 하나만 쓰기 때문이고, 회피 가능한 실수가 아니라 구조다.
export type MockTarget =
  | "solid-btn"
  | "share-btn"
  // "bars"는 이 사이클이 정한 시그니처의 일부라 유니온에 남긴다 — 하지만 막대는
  // raw stop을 직접 읽어(PreviewPane의 BAR_STOPS 주석 참고) 어떤 역할과도 안
  // 묶이므로 mockTargetFor는 이 값을 절대 반환하지 않는다.
  | "bars"
  | "card-text"
  | "card-subtext"
  | "error-badge"
  | "warning-badge"
  | "success-badge"
  | "info-badge";

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
  // 실패 칩은 solid + on-solid다 — 바로 옆 "보고서 열기"(accent solid +
  // on-solid)와 같은 장치를 쓴다. on-solid은 라이트만 검사되므로(checkContrast)
  // 다크 목업의 이 칩은 어떤 뱃지도 안 가리킨다 — "보고서 열기"가 이미 같은
  // 상태라 새 비대칭이 아니다.
  if (scaleName === "error") {
    if (roleId === "solid" || roleId === "on-solid") return "error-badge";
    return null;
  }
  // 나머지 셋은 subtle-bg 배경 + text-strong 글자다. subtle-bg는 배선해도
  // 뱃지로는 안 뜬다(checkContrast가 text·text-strong·on-solid 셋만 검사를
  // 만든다) — 그래도 "이 칩이 그 역할을 읽는다"는 사실은 같으므로 매핑한다.
  if (scaleName === "warning" || scaleName === "success" || scaleName === "info") {
    if (roleId === "text-strong" || roleId === "subtle-bg") return `${scaleName}-badge`;
    return null;
  }
  return null;
}
