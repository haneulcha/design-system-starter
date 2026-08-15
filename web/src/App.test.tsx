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

  it("responds to popstate", () => {
    goTo("/color-palette");
    const { container } = render(<App />);
    goTo("/");
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(container.textContent).not.toContain("Guided Palette Builder");
  });
});
