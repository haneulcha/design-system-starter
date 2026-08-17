import { describe, it, expect } from "vitest";
import { routeHref, appPath } from "./basePath";

const SUB = "/design-system-starter/";

describe("routeHref", () => {
  it("루트 base에서는 경로를 그대로 둔다", () => {
    expect(routeHref("/color-palette", "/")).toBe("/color-palette");
  });

  it("서브패스 base를 앞에 붙인다", () => {
    expect(routeHref("/color-palette", SUB)).toBe("/design-system-starter/color-palette");
  });

  it("슬래시를 겹쳐 쓰지 않는다", () => {
    expect(routeHref("/color-palette", "/")).not.toContain("//");
    expect(routeHref("/color-palette", SUB)).not.toContain("//");
  });
});

describe("appPath", () => {
  it("루트 base에서 경로를 그대로 돌려준다", () => {
    expect(appPath("/color-palette", "/")).toBe("/color-palette");
    expect(appPath("/", "/")).toBe("/");
  });

  it("서브패스 base를 떼어낸다", () => {
    expect(appPath("/design-system-starter/color-palette", SUB)).toBe("/color-palette");
  });

  // GH Pages는 404.html 폴백이라 어떤 깊이의 URL로도 앱이 부팅된다 —
  // 끝 슬래시가 붙은 채 도달하는 경우를 라우팅이 흡수해야 한다.
  it("끝 슬래시를 정규화한다", () => {
    expect(appPath("/color-palette/", "/")).toBe("/color-palette");
    expect(appPath("/design-system-starter/color-palette/", SUB)).toBe("/color-palette");
  });

  it("base 자체는 루트로 접는다", () => {
    expect(appPath("/design-system-starter/", SUB)).toBe("/");
    // GH Pages가 /design-system-starter → /design-system-starter/로 리다이렉트하지만
    // 그 전 상태로 라우팅이 돌 수 있다.
    expect(appPath("/design-system-starter", SUB)).toBe("/");
  });

  // 접두사 일치를 문자열 단순 비교로 하면 여기서 "tuff"가 남는다.
  it("base와 접두사만 같은 경로를 잘라먹지 않는다", () => {
    expect(appPath("/design-system-starter-docs", SUB)).toBe("/design-system-starter-docs");
  });
});
