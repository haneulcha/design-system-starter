import { describe, it, expect } from "vitest";
import { ACCENT_ROLES, cssSnippet } from "../../src/lab/palette/roles.js";
import {
  fillScale,
  STOP_KEYS,
  type Pin,
} from "../../src/lab/palette/builder.js";
import { oklchToHex, parsePrimary } from "../../src/generator/color.js";

describe("ACCENT_ROLES", () => {
  it("has exactly 6 roles with unique ids", () => {
    expect(ACCENT_ROLES).toHaveLength(6);
    expect(new Set(ACCENT_ROLES.map((r) => r.id)).size).toBe(6);
  });

  it("labels and notes are educational (non-trivial length)", () => {
    for (const r of ACCENT_ROLES) {
      expect(r.label.length, r.id).toBeGreaterThan(0);
      expect(r.note.length, r.id).toBeGreaterThan(10);
    }
  });

  it("indexes are integers in 0..10", () => {
    for (const r of ACCENT_ROLES) {
      for (const idx of [r.lightIndex, r.darkIndex]) {
        expect(Number.isInteger(idx), r.id).toBe(true);
        expect(idx, r.id).toBeGreaterThanOrEqual(0);
        expect(idx, r.id).toBeLessThanOrEqual(10);
      }
    }
  });

  it("dark mapping mirrors the light index (i → 10−i), except solid stays at the anchor", () => {
    for (const r of ACCENT_ROLES) {
      if (r.id === "solid") {
        expect(r.lightIndex).toBe(5);
        expect(r.darkIndex).toBe(5);
      } else {
        expect(r.darkIndex, r.id).toBe(10 - r.lightIndex);
      }
    }
  });
});

describe("cssSnippet", () => {
  // 서로 다른 더미 hex 11개 — 프리미티브가 각자 자기 값에 매였는지 식별 가능
  const HEXES = STOP_KEYS.map(
    (_, i) => `#0000${i.toString(16).padStart(2, "0")}`,
  );

  it("throws unless given exactly 11 hexes", () => {
    expect(() => cssSnippet(HEXES.slice(0, 10))).toThrow(/11/);
    expect(() => cssSnippet([...HEXES, "#ffffff"])).toThrow(/11/);
  });

  it("declares all 11 primitives and 6 semantic roles in :root", () => {
    const css = cssSnippet(HEXES);
    STOP_KEYS.forEach((key, i) => {
      expect(css).toContain(`--accent-${key}: ${HEXES[i]};`);
    });
    for (const r of ACCENT_ROLES) {
      expect(css).toContain(
        `--accent-${r.id}: var(--accent-${STOP_KEYS[r.lightIndex]});`,
      );
    }
  });

  it(".dark re-declares only the roles whose mapping changes — solid is absent", () => {
    const css = cssSnippet(HEXES);
    const dark = css.slice(css.indexOf(".dark {"));
    for (const r of ACCENT_ROLES) {
      if (r.id === "solid") continue;
      expect(dark).toContain(
        `--accent-${r.id}: var(--accent-${STOP_KEYS[r.darkIndex]});`,
      );
    }
    expect(dark).not.toContain("--accent-solid");
    // 선언(콜론 동반)은 바뀌는 역할 수만큼만 — 현재 5개
    expect(dark.match(/--accent-[a-z-]+:/g)).toHaveLength(5);
  });

  it("every var() reference resolves to a declaration in the same snippet", () => {
    const css = cssSnippet(HEXES);
    const declared = new Set(
      [...css.matchAll(/(--accent-[\w-]+)(?=:)/g)].map((m) => m[1]),
    );
    const refs = [...css.matchAll(/var\((--accent-[\w-]+)\)/g)].map((m) => m[1]);
    expect(refs.length).toBeGreaterThan(0);
    for (const name of refs) {
      expect(declared.has(name), name).toBe(true);
    }
  });

  it("works end-to-end with a real fillScale result", () => {
    const pins: Pin[] = [{ index: 5, color: parsePrimary("#3b82f6") }];
    const hexes = fillScale(pins).map(oklchToHex);
    const css = cssSnippet(hexes);
    expect(css.startsWith(":root {")).toBe(true);
    expect(css).toContain(`--accent-500: ${hexes[5]};`);
    expect(css.trimEnd().endsWith("}")).toBe(true);
  });
});
