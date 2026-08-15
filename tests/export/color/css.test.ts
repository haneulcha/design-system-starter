import { describe, it, expect } from "vitest";
import { generateColorCss } from "../../../src/export/color/css.js";
import { primitiveVars, roleVars, darkRoleVars } from "../../../src/export/color/vars.js";
import { fixtureSystem, tinySystem, systemWithOnSolid } from "./fixture.js";

const decls = (css: string) => [...css.matchAll(/^\s*(--[\w-]+):\s*(.+);$/gm)].map((m) => [m[1], m[2]]);

describe("변수 목록", () => {
  it("emits one primitive per scale × stop", () => {
    const s = fixtureSystem();
    expect(primitiveVars(s)).toHaveLength(s.scales.length * s.stopKeys.length);
    expect(primitiveVars(s)[0]).toEqual({ name: "--color-accent-50", value: "#a0a000" });
  });

  it("emits one role alias per scale × role, pointing at the light stop", () => {
    const s = fixtureSystem();
    expect(roleVars(s)).toHaveLength(s.scales.length * s.roles.length);
    expect(roleVars(s)[0]).toEqual({
      name: "--color-accent-subtle-bg",
      value: "var(--color-accent-50)",
    });
  });

  it("emits dark declarations only for roles that actually move", () => {
    const s = fixtureSystem();
    const moving = s.roles.filter((r) => r.lightIndex !== r.darkIndex);
    expect(moving).toHaveLength(5);
    expect(darkRoleVars(s)).toHaveLength(s.scales.length * moving.length);
    expect(darkRoleVars(s).some((d) => d.name.endsWith("-solid"))).toBe(false);
  });
});

describe("generateColorCss", () => {
  it("emits 66 primitives + 36 roles in :root and 30 in .dark for the real shape", () => {
    // 블록 오프너(".dark {")로 자른다 — 헤더 주석에 ".dark에"라는 산문이 있어서
    // ".dark"로 자르면 헤더가 먼저 잡히고 두 슬라이스가 통째로 어긋난다.
    const css = generateColorCss(fixtureSystem());
    const root = css.slice(css.indexOf(":root {"), css.indexOf(".dark {"));
    const dark = css.slice(css.indexOf(".dark {"));
    expect(decls(root)).toHaveLength(66 + 36);
    expect(decls(dark)).toHaveLength(30);
  });

  it("has no dangling var() reference", () => {
    const css = generateColorCss(fixtureSystem());
    const declared = new Set(decls(css).map(([name]) => name));
    for (const m of css.matchAll(/var\((--[\w-]+)\)/g)) {
      expect(declared, m[1]).toContain(m[1]);
    }
  });

  it("never re-declares solid in .dark — the anchor is preserved across themes", () => {
    const css = generateColorCss(fixtureSystem());
    const dark = css.slice(css.indexOf(".dark {"));
    for (const scale of fixtureSystem().scales) {
      expect(dark).not.toContain(`--color-${scale.name}-solid:`);
    }
  });

  it("prefixes every variable with --color- so Tailwind v4 can generate utilities", () => {
    const css = generateColorCss(fixtureSystem());
    for (const [name] of decls(css)) expect(name.startsWith("--color-")).toBe(true);
  });

  it("uses the given selectors, so a scoped preview needs no string surgery", () => {
    const css = generateColorCss(tinySystem(), {
      light: ".palette-preview",
      dark: ".palette-preview.dark",
    });
    expect(css).toContain(".palette-preview {");
    expect(css).toContain(".palette-preview.dark {");
    expect(css).not.toContain(":root");
  });

  it("runs the contract guards", () => {
    const s = tinySystem();
    expect(() => generateColorCss({ ...s, scales: [{ ...s.scales[0], hexes: [] }] })).toThrow();
  });
});

describe("on-solid", () => {
  it("emits a literal colour per scale, not a var() reference", () => {
    const css = generateColorCss(systemWithOnSolid());
    expect(css).toMatch(/--color-accent-on-solid: #(000000|ffffff);/);
  });

  it("does not redeclare on-solid in the dark block", () => {
    const css = generateColorCss(systemWithOnSolid());
    const dark = css.slice(css.indexOf(".dark {"));
    expect(dark).not.toContain("on-solid");
  });

  it("can pick different literals for different scales", () => {
    // 흰 solid(밝음)와 검은 solid(어두움)를 가진 두 스케일
    const system = {
      stopKeys: ["a", "b", "c"],
      scales: [
        { name: "light", label: "밝음", hexes: ["#ffffff", "#eeeeee", "#dddddd"] },
        { name: "dark", label: "어두움", hexes: ["#000000", "#111111", "#222222"] },
      ],
      roles: [
        { kind: "stop" as const, id: "solid", label: "솔리드", lightIndex: 0, darkIndex: 0 },
        { kind: "contrast" as const, id: "on-solid", label: "솔리드 위 글자", against: "solid" },
      ],
    };
    const css = generateColorCss(system);
    expect(css).toContain("--color-light-on-solid: #000000;");
    expect(css).toContain("--color-dark-on-solid: #ffffff;");
  });
});
