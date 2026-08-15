import { describe, it, expect } from "vitest";
import { SCALE_ROLES, SCALE_ORDER } from "../../src/color/roles.js";
import { SEMANTIC_ANCHORS } from "../../src/color/semantic.js";

const STOP_ROLES = SCALE_ROLES.filter((r) => r.kind === "stop");

describe("SCALE_ROLES", () => {
  it("has six stop roles and one contrast role", () => {
    expect(STOP_ROLES).toHaveLength(6);
    expect(SCALE_ROLES).toHaveLength(7);
  });

  it("has unique ids", () => {
    expect(new Set(SCALE_ROLES.map((r) => r.id)).size).toBe(7);
  });

  it("pins on-solid to the solid role", () => {
    const onSolid = SCALE_ROLES.find((r) => r.id === "on-solid")!;
    expect(onSolid.kind).toBe("contrast");
    if (onSolid.kind !== "contrast") throw new Error("unreachable");
    expect(onSolid.against).toBe("solid");
  });

  it("labels and notes are educational (non-trivial length)", () => {
    for (const r of SCALE_ROLES) {
      expect(r.label.length, r.id).toBeGreaterThan(0);
      expect(r.note.length, r.id).toBeGreaterThan(10);
    }
  });

  it("indexes are integers in 0..10", () => {
    for (const r of STOP_ROLES) {
      for (const idx of [r.lightIndex, r.darkIndex]) {
        expect(Number.isInteger(idx), r.id).toBe(true);
        expect(idx, r.id).toBeGreaterThanOrEqual(0);
        expect(idx, r.id).toBeLessThanOrEqual(10);
      }
    }
  });

  it("dark mapping mirrors the light index (i → 10−i), except solid stays at the anchor", () => {
    for (const r of STOP_ROLES) {
      if (r.id === "solid") {
        expect(r.lightIndex).toBe(5);
        expect(r.darkIndex).toBe(5);
      } else {
        expect(r.darkIndex, r.id).toBe(10 - r.lightIndex);
      }
    }
  });
});

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
