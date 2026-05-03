import { describe, it, expect } from "vitest";
import { generate } from "../../src/generator/index.js";

const { tailwindConfig } = generate({
  brandName: "TwTest",
  preset: "professional",
  fontFamily: "Inter",
});

describe("tailwind-export — colors", () => {
  it("emits neutral as nested object with all 9 stops", () => {
    expect(tailwindConfig).toMatch(/neutral:\s*\{/);
    for (const stop of ["50", "100", "200", "300", "400", "500", "600", "800", "900"]) {
      expect(tailwindConfig).toMatch(
        new RegExp(`"${stop}":\\s*"var\\(--color-neutral-${stop}\\)"`),
      );
    }
  });

  it("emits accent with -500", () => {
    expect(tailwindConfig).toMatch(/accent:\s*\{/);
    expect(tailwindConfig).toMatch(/"500":\s*"var\(--color-accent-500\)"/);
  });

  it("emits status hues red/green/amber/blue with 50 + 500", () => {
    for (const hue of ["red", "green", "amber", "blue"]) {
      expect(tailwindConfig).toMatch(new RegExp(`${hue}:\\s*\\{`));
      expect(tailwindConfig).toMatch(new RegExp(`"50":\\s*"var\\(--color-${hue}-50\\)"`));
      expect(tailwindConfig).toMatch(new RegExp(`"500":\\s*"var\\(--color-${hue}-500\\)"`));
    }
  });

  it("emits semantic flat kebab keys", () => {
    expect(tailwindConfig).toMatch(/"bg-canvas":\s*"var\(--color-bg-canvas\)"/);
    expect(tailwindConfig).toMatch(/"text-ink":\s*"var\(--color-text-ink\)"/);
    expect(tailwindConfig).toMatch(/"accent-primary":\s*"var\(--color-accent-primary\)"/);
    expect(tailwindConfig).toMatch(/"status-error-bg":\s*"var\(--color-status-error-bg\)"/);
  });
});

describe("tailwind-export — radius", () => {
  it("borderRadius has both base and semantic keys", () => {
    for (const k of ["none", "xs", "sm", "md", "lg", "xl", "2xl", "pill", "circle"]) {
      expect(tailwindConfig).toMatch(
        new RegExp(`"?${k}"?:\\s*"var\\(--radius-${k}\\)"`),
      );
    }
    for (const k of ["button", "input", "card", "subtle", "large"]) {
      expect(tailwindConfig).toMatch(
        new RegExp(`${k}:\\s*"var\\(--radius-${k}\\)"`),
      );
    }
  });
});

describe("tailwind-export — shadow", () => {
  it("boxShadow has 5 base + 4 semantic keys", () => {
    for (const k of ["none", "xs", "sm", "md", "lg"]) {
      expect(tailwindConfig).toMatch(
        new RegExp(`"?${k}"?:\\s*"var\\(--shadow-${k}\\)"`),
      );
    }
    for (const k of ["hairline", "card", "popover", "modal"]) {
      expect(tailwindConfig).toMatch(
        new RegExp(`${k}:\\s*"var\\(--shadow-${k}\\)"`),
      );
    }
  });
});

describe("tailwind-export — module shape", () => {
  it("emits a CommonJS module export", () => {
    expect(tailwindConfig).toContain("module.exports = {");
    expect(tailwindConfig).toContain("theme:");
    expect(tailwindConfig).toContain("extend:");
  });
});
