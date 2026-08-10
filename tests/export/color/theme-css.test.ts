import { describe, it, expect } from "vitest";
import { compile } from "tailwindcss";
import { generateColorThemeCss } from "../../../src/export/color/theme-css.js";
import { generateColorCss } from "../../../src/export/color/css.js";
import { fixtureSystem } from "./fixture.js";

const decls = (css: string) => [...css.matchAll(/^\s*(--[\w-]+):\s*(.+);$/gm)].map((m) => `${m[1]}: ${m[2]}`);

describe("generateColorThemeCss", () => {
  it("wraps the light layer in @theme, not @theme inline", () => {
    const css = generateColorThemeCss(fixtureSystem());
    expect(css).toContain("@theme {");
    expect(css).not.toContain("@theme inline");
  });

  it("puts .dark outside the @theme block", () => {
    const css = generateColorThemeCss(fixtureSystem());
    const themeEnd = css.indexOf("}", css.indexOf("@theme {"));
    expect(css.indexOf(".dark {")).toBeGreaterThan(themeEnd);
  });

  it("declares exactly the same variables as palette.css", () => {
    const system = fixtureSystem();
    expect(decls(generateColorThemeCss(system))).toEqual(decls(generateColorCss(system)));
  });
});

describe("Tailwind v4가 실제로 이 파일을 어떻게 컴파일하는가", () => {
  async function build(css: string, candidates: string[]) {
    const compiler = await compile(`${css}\n@tailwind utilities;\n`, { base: "/" });
    return compiler.build(candidates);
  }

  it("emits the used theme variables into :root", async () => {
    // Tailwind 4는 쓰이지 않는 @theme 변수를 털어낸다 — candidates가 비면
    // --color-accent-solid는 출력에 없다. 유틸리티를 하나 요구해야 나온다.
    const out = await build(generateColorThemeCss(fixtureSystem()), ["bg-accent-solid"]);
    expect(out).toContain("--color-accent-solid: var(--color-accent-500);");
  });

  it("compiles bg-accent-solid to a var() reference, not an inlined value", async () => {
    // 이게 D5의 핵심. @theme inline이면 var(--color-accent-500)로 치환돼
    // .dark에서 --color-accent-solid를 덮어도 죽은 선언이 된다.
    const out = await build(generateColorThemeCss(fixtureSystem()), ["bg-accent-solid"]);
    expect(out).toContain("background-color: var(--color-accent-solid)");
  });

  it("keeps an overriding role's utility pointing at the role variable, not the light stop", async () => {
    // subtle-bg는 lightIndex 0 / darkIndex 10 — 실제로 자리가 바뀌는 역할이다.
    // solid(5/5)로는 이걸 검증할 수 없다: 라이트와 다크가 같은 stop이라
    // @theme inline이어도 차이가 안 난다.
    const out = await build(generateColorThemeCss(fixtureSystem()), ["bg-accent-subtle-bg"]);
    // (a) 유틸리티가 역할 변수를 거친다 — inline이면 var(--color-accent-50)로 박힌다.
    expect(out).toContain("background-color: var(--color-accent-subtle-bg)");
    // (b) 그래서 .dark 재선언이 살아 있는 선언이 된다.
    const dark = out.slice(out.indexOf(".dark {"));
    expect(dark).toContain("--color-accent-subtle-bg: var(--color-accent-950);");
  });

  it("generates utilities for stop names too", async () => {
    const out = await build(generateColorThemeCss(fixtureSystem()), ["text-neutral-500"]);
    expect(out).toContain("color: var(--color-neutral-500)");
  });
});
