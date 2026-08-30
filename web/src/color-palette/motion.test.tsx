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
  const cssPath = path.resolve(process.cwd(), "src/global.css");

  it("reduced-motion 블록이 존재한다", () => {
    expect(readFileSync(cssPath, "utf8")).toMatch(/prefers-reduced-motion/);
  });

  it("변위를 끄지 않는다", () => {
    const block = readFileSync(cssPath, "utf8")
      .split("prefers-reduced-motion")[1] ?? "";
    expect(block).not.toMatch(/transform:\s*none/);
    expect(block).not.toMatch(/transition:\s*none/);
  });
});
