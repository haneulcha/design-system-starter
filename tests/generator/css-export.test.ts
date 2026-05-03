import { describe, it, expect } from "vitest";
import { generate } from "../../src/generator/index.js";

const { cssVariables } = generate({
  brandName: "CssTest",
  preset: "professional",
  fontFamily: "Inter",
});

describe("css-export — color primitives (base layer)", () => {
  it("emits all 9 neutral stops", () => {
    for (const stop of ["50", "100", "200", "300", "400", "500", "600", "800", "900"]) {
      expect(cssVariables).toMatch(new RegExp(`--color-neutral-${stop}: oklch\\(`));
    }
  });

  it("emits accent-500", () => {
    expect(cssVariables).toMatch(/--color-accent-500: oklch\(/);
  });

  it("emits 4 status hues × 2 stops each", () => {
    for (const hue of ["red", "green", "amber", "blue"]) {
      expect(cssVariables).toMatch(new RegExp(`--color-${hue}-50: oklch\\(`));
      expect(cssVariables).toMatch(new RegExp(`--color-${hue}-500: oklch\\(`));
    }
  });

  it("does not emit the legacy --color-palette-* primitives", () => {
    expect(cssVariables).not.toMatch(/--color-palette-/);
  });
});

describe("css-export — color semantics (alias layer)", () => {
  it("bg-canvas references a neutral stop", () => {
    expect(cssVariables).toMatch(/--color-bg-canvas: var\(--color-neutral-\d+\);/);
  });

  it("text-ink references a neutral stop", () => {
    expect(cssVariables).toMatch(/--color-text-ink: var\(--color-neutral-\d+\);/);
  });

  it("accent-primary references --color-accent-500", () => {
    expect(cssVariables).toContain("--color-accent-primary: var(--color-accent-500);");
  });

  it("status semantics reference status hue stops", () => {
    expect(cssVariables).toMatch(/--color-status-error-bg:\s*var\(--color-red-50\);/);
    expect(cssVariables).toMatch(/--color-status-error-text:\s*var\(--color-red-500\);/);
    expect(cssVariables).toMatch(/--color-status-success-bg:\s*var\(--color-green-50\);/);
    expect(cssVariables).toMatch(/--color-status-info-text:\s*var\(--color-blue-500\);/);
  });
});

describe("css-export — radius", () => {
  it("emits 9 base radius primitives with sm/md/lg names", () => {
    expect(cssVariables).toContain("--radius-none: 0;");
    expect(cssVariables).toContain("--radius-xs: 2px;");
    expect(cssVariables).toContain("--radius-sm: 4px;");
    expect(cssVariables).toContain("--radius-md: 8px;");
    expect(cssVariables).toContain("--radius-lg: 12px;");
    expect(cssVariables).toContain("--radius-xl: 16px;");
    expect(cssVariables).toContain("--radius-2xl: 24px;");
    expect(cssVariables).toContain("--radius-pill: 9999px;");
    expect(cssVariables).toContain("--radius-circle: 50%;");
  });

  it("does not emit the reserved 6px stop", () => {
    expect(cssVariables).not.toMatch(/--radius-(scale-)?6:/);
  });

  it("does not emit legacy --radius-scale-N primitives", () => {
    expect(cssVariables).not.toMatch(/--radius-scale-/);
  });

  it("semantic radius refs the base layer via var()", () => {
    expect(cssVariables).toMatch(/--radius-button: var\(--radius-(xs|sm|md|lg|xl|2xl|pill)\);/);
    expect(cssVariables).toMatch(/--radius-card: var\(--radius-(sm|md|lg|xl|2xl)\);/);
    expect(cssVariables).toMatch(/--radius-subtle: var\(--radius-sm\);/);
    expect(cssVariables).toMatch(/--radius-large: var\(--radius-2xl\);/);
  });
});

describe("css-export — shadow", () => {
  it("emits 5 base shadow primitives", () => {
    expect(cssVariables).toContain("--shadow-none: none;");
    expect(cssVariables).toMatch(/--shadow-xs: .+;/);
    expect(cssVariables).toMatch(/--shadow-sm: .+;/);
    expect(cssVariables).toMatch(/--shadow-md: .+;/);
    expect(cssVariables).toMatch(/--shadow-lg: .+;/);
  });

  it("emits 4 semantic shadow aliases referencing base", () => {
    expect(cssVariables).toContain("--shadow-hairline: var(--shadow-xs);");
    expect(cssVariables).toContain("--shadow-card: var(--shadow-sm);");
    expect(cssVariables).toContain("--shadow-popover: var(--shadow-md);");
    expect(cssVariables).toContain("--shadow-modal: var(--shadow-lg);");
  });

  it("does not emit the legacy --shadow-{ring,raised,floating,overlay} names", () => {
    expect(cssVariables).not.toMatch(/--shadow-raised:\s/);
    expect(cssVariables).not.toMatch(/--shadow-floating:\s/);
    expect(cssVariables).not.toMatch(/--shadow-overlay:\s/);
    expect(cssVariables).not.toMatch(/--shadow-ring:\s/);
  });
});

describe("css-export — dark mode", () => {
  const darkMatch = cssVariables.match(
    /@media \(prefers-color-scheme: dark\) \{\s*:root \{([\s\S]*?)\}\s*\}/,
  );

  it("emits a dark @media block", () => {
    expect(darkMatch, "dark block missing").toBeTruthy();
  });

  it("dark block contains primitive overrides only (no semantic vars)", () => {
    const darkBody = darkMatch![1];
    // Must contain primitives
    expect(darkBody).toMatch(/--color-neutral-50:/);
    // Must NOT contain semantics
    expect(darkBody).not.toMatch(/--color-bg-canvas:/);
    expect(darkBody).not.toMatch(/--color-text-ink:/);
    expect(darkBody).not.toMatch(/--color-status-error-/);
    expect(darkBody).not.toMatch(/--color-accent-primary:/);
  });

  it("dark block does NOT override accent-500 (same in both modes)", () => {
    const darkBody = darkMatch![1];
    expect(darkBody).not.toMatch(/--color-accent-500:/);
  });
});
