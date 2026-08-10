import { describe, it, expect } from "vitest";
import { renderColorDesignMd } from "../../../src/export/color/design-md.js";
import { fixtureSystem } from "./fixture.js";

describe("renderColorDesignMd", () => {
  it("has a section per scale titled with the display label, not the identifier", () => {
    const md = renderColorDesignMd(fixtureSystem());
    for (const scale of fixtureSystem().scales) {
      expect(md).toContain(`### ${scale.label}`);
    }
    expect(md).toContain("### 액센트");
    expect(md).not.toContain("### accent");
  });

  it("lists every hex — 6 scales × 11 stops", () => {
    const system = fixtureSystem();
    const md = renderColorDesignMd(system);
    const all = system.scales.flatMap((s) => s.hexes);
    expect(all).toHaveLength(66);
    for (const hex of all) expect(md).toContain(hex);
  });

  it("has one role-table row per role, with the light and dark stop names", () => {
    const system = fixtureSystem();
    const md = renderColorDesignMd(system);
    for (const role of system.roles) {
      const light = system.stopKeys[role.lightIndex];
      const dark = system.stopKeys[role.darkIndex];
      expect(md).toContain(`| ${role.label} | ${light} | ${dark} |`);
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
