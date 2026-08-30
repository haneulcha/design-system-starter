import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import path from "path";

// ⚠️ 이것은 동작 테스트가 아니다 — 의도적으로 소스 텍스트를 단언한다.
// jsdom은 @media (prefers-reduced-motion)을 평가하지 않아 진짜 동작 검증이
// 불가능하고, 실제 동작 확인은 Step 4의 브라우저 실측이 맡는다.
//
// 이 테스트의 일은 하나뿐이다: **기록된 판단의 회귀 가드.** 스펙 D9가
// "끄는 것은 트윈이지 변위가 아니다"를 못 박았는데, 나중에 누가 선의로
// `transform: none`을 추가하면 3.1 D3 / 3.2 D4가 세운 press 착지 어포던스
// ("이동 2px = 깊이 2px, 칩이 그림자가 있던 자리에 정확히 내려앉는다")가
// 조용히 죽는다. 그 회귀를 잡는 것이 이 단언의 존재 이유다.
// (2026-08-30 사람 판단으로 유지 결정 — 취약한 테스트라는 지적은 맞지만
//  가드로서의 값이 그 비용보다 크다고 봤다.)
describe("reduced-motion 경계 (스펙 D9)", () => {
  // import.meta.dirname을 쓰는 이유: import.meta.url은 vitest+jsdom에서 non-file
  // scheme으로 변환돼 fileURLToPath가 TypeError로 깬다. process.cwd()는 CLI
  // runner가 저장소 루트로 둬도 vitest의 root 설정을 무시해서 의도와 다른
  // 경로를 찾는다. import.meta.dirname은 그 둘 다 피하고 vitest 환경에서도
  // 정상 작동한다 (Node 20.11+).
  const cssPath = path.join(import.meta.dirname, "../global.css");

  it("reduced-motion 블록이 존재한다", () => {
    expect(readFileSync(cssPath, "utf8")).toMatch(/prefers-reduced-motion/);
  });

  it("변위를 끄지 않는다", () => {
    // 중괄호 깊이를 세기 전에 CSS 주석을 먼저 지운다 — 이 레포는 한국어
    // 장문 주석이 기본이고(예: 이 파일 바로 위, global.css의 reduced-motion
    // 블록 설명), 주석 안에 예시로 셀렉터를 적다 보면 `}`가 섞이기 쉽다.
    // 주석을 안 지우면 그 `}`에서 depth가 조기에 0이 되어 블록이 실제
    // 닫히는 자리보다 먼저 잘리고, 그 뒤에 진짜 `transform: none`이 와도
    // 스캔 범위 밖이라 못 잡는다 — 가드가 있는데 회귀를 못 잡는 거짓
    // 통과다(리뷰 I-3, 실제로 주석 안 `}` 주입 후 구주석 버전이 놓치는 것과
    // 새 버전이 잡는 것을 둘 다 확인했다). `[\s\S]*?`는 개행을 포함한
    // 비탐욕 매치라 여러 줄 주석도 한 번에 지운다.
    const css = readFileSync(cssPath, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    // 닫는 중괄호까지 범위를 좁혀라 — 뒤에 무관한 CSS가 붙고 그 안에
    // 우연히 transform: none이 있으면 오탐한다. 중첩 구조({...{...}...})를
    // 제대로 처리하려면 중괄호 깊이를 추적한다.
    const start = css.indexOf("prefers-reduced-motion");
    if (start === -1) {
      throw new Error("prefers-reduced-motion not found");
    }
    const firstBrace = css.indexOf("{", start);
    let depth = 0;
    let block = "";
    for (let i = firstBrace; i < css.length; i++) {
      block += css[i];
      if (css[i] === "{") depth++;
      if (css[i] === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    expect(block).not.toMatch(/transform:\s*none/);
    expect(block).not.toMatch(/transition:\s*none/);
  });
});
