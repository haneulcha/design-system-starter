import { describe, it, expect } from "vitest";
import { SCALE_ROLES, cssSnippet, type ScaleSet } from "../../src/lab/palette/roles.js";
import { buildNeutral, TINT_STRENGTHS } from "../../src/lab/palette/neutral.js";
import { SEMANTIC_ANCHORS, buildSemantic } from "../../src/lab/palette/semantic.js";
import { fillScale, STOP_KEYS, type Pin } from "../../src/lab/palette/builder.js";
import { oklchToHex, parsePrimary } from "../../src/generator/color.js";

describe("SCALE_ROLES", () => {
  it("has exactly 6 roles with unique ids", () => {
    expect(SCALE_ROLES).toHaveLength(6);
    expect(new Set(SCALE_ROLES.map((r) => r.id)).size).toBe(6);
  });

  it("labels and notes are educational (non-trivial length)", () => {
    for (const r of SCALE_ROLES) {
      expect(r.label.length, r.id).toBeGreaterThan(0);
      expect(r.note.length, r.id).toBeGreaterThan(10);
    }
  });

  it("indexes are integers in 0..10", () => {
    for (const r of SCALE_ROLES) {
      for (const idx of [r.lightIndex, r.darkIndex]) {
        expect(Number.isInteger(idx), r.id).toBe(true);
        expect(idx, r.id).toBeGreaterThanOrEqual(0);
        expect(idx, r.id).toBeLessThanOrEqual(10);
      }
    }
  });

  it("dark mapping mirrors the light index (i → 10−i), except solid stays at the anchor", () => {
    for (const r of SCALE_ROLES) {
      if (r.id === "solid") {
        expect(r.lightIndex).toBe(5);
        expect(r.darkIndex).toBe(5);
      } else {
        expect(r.darkIndex, r.id).toBe(10 - r.lightIndex);
      }
    }
  });
});

function sampleScales(): ScaleSet {
  const pins: Pin[] = [{ index: 5, color: parsePrimary("#3b82f6") }];
  const semantic = Object.fromEntries(
    SEMANTIC_ANCHORS.map((a) => [a.id, buildSemantic(a).map(oklchToHex)]),
  ) as ScaleSet["semantic"];
  return {
    accent: fillScale(pins).map(oklchToHex),
    neutral: buildNeutral({ hue: 258, strength: TINT_STRENGTHS.soft }).map(oklchToHex),
    semantic,
  };
}

describe("cssSnippet", () => {
  const SCALE_NAMES = ["accent", "neutral", "error", "success", "warning", "info"];

  it("emits 11 primitives for each of the 6 scales", () => {
    const css = cssSnippet(sampleScales());
    for (const name of SCALE_NAMES) {
      for (const key of STOP_KEYS) {
        expect(css, `${name}-${key}`).toContain(`--${name}-${key}:`);
      }
    }
  });

  it("emits every role for every scale in :root", () => {
    const css = cssSnippet(sampleScales());
    const root = css.slice(css.indexOf(":root"), css.indexOf(".dark"));
    for (const name of SCALE_NAMES) {
      for (const role of SCALE_ROLES) {
        expect(root, `${name}-${role.id}`).toContain(`--${name}-${role.id}:`);
      }
    }
  });

  it("re-declares only the roles that actually move, for every scale", () => {
    const css = cssSnippet(sampleScales());
    const dark = css.slice(css.indexOf(".dark"));
    const moving = SCALE_ROLES.filter((r) => r.darkIndex !== r.lightIndex);
    expect(moving).toHaveLength(5);
    expect(dark.match(/--[a-z-]+-[a-z-]+:/g) ?? []).toHaveLength(moving.length * 6);
    for (const name of SCALE_NAMES) {
      expect(dark, `${name}-solid`).not.toContain(`--${name}-solid:`);
    }
  });

  it("has no dangling var() references", () => {
    const css = cssSnippet(sampleScales());
    const declared = new Set(
      [...css.matchAll(/^\s*(--[\w-]+):/gm)].map((m) => m[1]),
    );
    for (const m of css.matchAll(/var\((--[\w-]+)\)/g)) {
      expect(declared, m[1]).toContain(m[1]);
    }
  });

  it("throws when any scale is not 11 long", () => {
    const bad = sampleScales();
    expect(() => cssSnippet({ ...bad, neutral: bad.neutral.slice(0, 10) })).toThrow();
    expect(() =>
      cssSnippet({ ...bad, semantic: { ...bad.semantic, error: [] } }),
    ).toThrow();
  });
});

import { SCALE_ORDER } from "../../src/lab/palette/roles.js";

describe("SCALE_ORDER", () => {
  it("is accent → neutral → the four semantic roles, in SEMANTIC_ANCHORS order", () => {
    expect(SCALE_ORDER.map((d) => d.name)).toEqual([
      "accent",
      "neutral",
      ...SEMANTIC_ANCHORS.map((a) => a.id),
    ]);
  });

  it("carries a non-empty Korean label for every scale", () => {
    for (const d of SCALE_ORDER) {
      expect(d.label.length, d.name).toBeGreaterThan(0);
    }
  });

  it("reuses the semantic anchors' own labels rather than restating them", () => {
    for (const a of SEMANTIC_ANCHORS) {
      expect(SCALE_ORDER.find((d) => d.name === a.id)!.label).toBe(a.label);
    }
  });
});
