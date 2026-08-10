import { describe, it, expect } from "vitest";
import { renderColorDesignMd } from "../../../src/export/color/design-md.js";
import { fixtureSystem } from "./fixture.js";

describe("renderColorDesignMd", () => {
  it("has a section per scale titled with the display label AND the identifier", () => {
    const md = renderColorDesignMd(fixtureSystem());
    for (const scale of fixtureSystem().scales) {
      expect(md).toContain(`### ${scale.label} (${scale.name})`);
    }
    expect(md).toContain("### 액센트 (accent)");
  });

  it("names every role's identifier and the --color-{스케일}-{id} convention in the role table", () => {
    const system = fixtureSystem();
    const md = renderColorDesignMd(system);
    for (const role of system.roles) {
      expect(md, role.id).toContain(`--color-{스케일}-${role.id}`);
    }
  });

  it("states the variable-naming convention in 쓰는 법, with a concrete example", () => {
    const md = renderColorDesignMd(fixtureSystem());
    expect(md).toContain("--color-{스케일}-stop");
    expect(md).toContain("--color-{스케일}-{역할 id}");
    // 구체적 예시 — 자리표시자만 있고 실제로 채워 넣은 예가 없으면 여전히 막연하다.
    expect(md).toContain("--color-accent-500");
    expect(md).toContain("--color-accent-subtle-bg");
  });

  it("lists every hex — 6 scales × 11 stops", () => {
    const system = fixtureSystem();
    const md = renderColorDesignMd(system);
    const all = system.scales.flatMap((s) => s.hexes);
    expect(all).toHaveLength(66);
    for (const hex of all) expect(md).toContain(hex);
  });

  it("has one role-table row per role, with the variable name and the light and dark stop names", () => {
    // 변수 컬럼이 추가되면서 행 모양이 바뀌었다 — 옛 3열 형식은 더는 나오지 않는다.
    const system = fixtureSystem();
    const md = renderColorDesignMd(system);
    for (const role of system.roles) {
      const light = system.stopKeys[role.lightIndex];
      const dark = system.stopKeys[role.darkIndex];
      expect(md).toContain(
        `| ${role.label} | --color-{스케일}-${role.id} | ${light} | ${dark} |`,
      );
    }
  });

  it("carries the usage rules a consumer needs to not misuse the palette", () => {
    const md = renderColorDesignMd(fixtureSystem());
    expect(md).toContain("상태색은 브랜드 색이 아니다");
    expect(md).toContain(".dark");
  });

  it("carries no derivation rationale and no builder journey", () => {
    // 설계 결정을 테스트로 고정한다 (스펙 "근거와 여정은 넣지 않는다").
    // 교보재는 결정하는 순간에만 행동을 바꾼다 — 확정된 팔레트를 받는 소비자에겐
    // 행동을 바꾸지 않는 읽을거리다.
    const md = renderColorDesignMd(fixtureSystem());
    for (const banned of ["어트랙터", "갈색", "내가 고른", "여정", "코퍼스", "tailwind stone"]) {
      expect(md, banned).not.toContain(banned);
    }
  });

  it("describes the mirror rule without hardcoding an 11-stop scale", () => {
    const md = renderColorDesignMd(fixtureSystem());
    expect(md).not.toContain("10−i");
    expect(md).not.toContain("10-i");
  });

  it("runs the contract guards", () => {
    const s = fixtureSystem();
    expect(() => renderColorDesignMd({ ...s, stopKeys: [] })).toThrow();
  });
});
