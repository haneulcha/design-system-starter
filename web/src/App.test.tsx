import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "./App";

function goTo(path: string) {
  window.history.pushState({}, "", path);
}

describe("App 라우팅", () => {
  beforeEach(() => goTo("/"));

  it("renders the colour tool at /color-palette", () => {
    goTo("/color-palette");
    render(<App />);
    expect(screen.getByRole("heading", { name: /팔레트/ })).toBeTruthy();
  });

  it("still renders the guided builder at #builder", () => {
    goTo("/#builder");
    render(<App />);
    expect(screen.getByText("Guided Palette Builder")).toBeTruthy();
  });

  // 위저드·빌더에서 <a href="/color-palette">를 넣는 순간 끝 슬래시가 실제
  // 위험이 된다 — 브라우저가 상대 링크를 정규화하지 않는 한 그대로 이동한다.
  it("renders the colour tool at /color-palette/ (trailing slash)", () => {
    goTo("/color-palette/");
    render(<App />);
    expect(screen.getByRole("heading", { name: /팔레트/ })).toBeTruthy();
  });

  // /color-palette가 위저드·빌더 어디서도 링크로 안 닿으면 URL을 직접 타이핑
  // 해야만 도달한다 — 이 사이클의 목적("누구나 쓰는 공개 도구")과 어긋난다.
  it("links to /color-palette from the legacy wizard", () => {
    goTo("/");
    render(<App />);
    const link = screen.getByRole("link", { name: /컬러 팔레트 도구/ });
    expect(link.getAttribute("href")).toBe("/color-palette");
  });

  it("links to /color-palette from the guided builder", () => {
    goTo("/#builder");
    render(<App />);
    const link = screen.getByRole("link", { name: /컬러 팔레트 도구/ });
    expect(link.getAttribute("href")).toBe("/color-palette");
  });

  it("responds to popstate", () => {
    goTo("/color-palette");
    const { container } = render(<App />);
    goTo("/");
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(container.textContent).not.toContain("Guided Palette Builder");
  });
});
