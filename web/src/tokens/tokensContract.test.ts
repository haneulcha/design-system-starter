// web/src/tokens/tokensContract.test.ts
//
// tokensCss.test.ts는 내는 쪽만, 페이지 테스트는 먹는 쪽만 본다 — 둘을 잇는
// 계약이 없으면 `--ds-space-lgg`나 `ds-type-caption-smm` 같은 오타가 나도
// 130개 테스트가 전부 초록으로 남는다. 이 파일은 소스를 직접 스캔해 소비하는
// 토큰 이름이 생성 CSS에 실재하는지 기계적으로 확인한다.
//
// jsdom 환경(vitest.config.ts)이지만 fs는 node 런타임 API라 그대로 접근된다 —
// 별도 environment 지시자가 필요 없다.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { renderTokensCss } from "./tokensCss";

const SRC_DIR = join(__dirname, "..");

function listTsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...listTsxFiles(full));
    else if (entry.endsWith(".tsx")) out.push(full);
  }
  return out;
}

const source = listTsxFiles(SRC_DIR).map((f) => readFileSync(f, "utf-8")).join("\n");
const css = renderTokensCss();

describe("tokensCss 소비 계약", () => {
  it("소스가 참조하는 --ds-* 커스텀 프로퍼티가 전부 생성 CSS에 선언돼 있다", () => {
    const referenced = new Set(source.match(/--ds-[a-z0-9-]+/g) ?? []);
    // 오타를 잡는 것이 목적이라, "값" 위치의 문자열이 아니라 반드시 "선언" 위치
    // (`이름: 값;`)로 있는지를 본다 — 부분 문자열 포함(예: --ds-space-md가
    // --ds-space-mdd의 부분집합)에 속지 않도록 콜론까지 붙여 찾는다.
    const missing = [...referenced].filter((name) => !css.includes(`${name}:`));
    expect(missing).toEqual([]);
  });

  it("소스가 쓰는 ds-type-* 유틸리티 클래스가 전부 생성 CSS에 정의돼 있다", () => {
    const referenced = new Set(source.match(/\bds-type-[a-z0-9-]+/g) ?? []);
    const missing = [...referenced].filter((name) => !css.includes(`@utility ${name} {`));
    expect(missing).toEqual([]);
  });
});
