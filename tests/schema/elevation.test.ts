// tests/schema/elevation.test.ts
//
// Validates that the elevation category schema (src/schema/elevation.ts)
// faithfully encodes docs/research/elevation-category-proposal.md.

import { describe, it, expect } from "vitest";
import {
  LEVEL_NAMES,
  LEVEL_META,
  ELEVATION_STYLE_OPTIONS,
  ELEVATION_INTENSITY_OPTIONS,
  INTENSITY_OPACITIES,
  DEFAULT_ELEVATION_KNOBS,
  DEFAULT_RING_COLOR,
} from "../../src/schema/elevation.js";

// ─── Levels — proposal §2 ───────────────────────────────────────────────────

describe("LEVEL_NAMES — proposal §2", () => {
  it("has exactly 5 levels in canonical order", () => {
    expect([...LEVEL_NAMES]).toEqual(["none", "ring", "raised", "floating", "overlay"]);
  });

  it("LEVEL_META has an entry for every level", () => {
    for (const name of LEVEL_NAMES) {
      expect(LEVEL_META[name], `LEVEL_META.${name}`).toBeDefined();
      expect(LEVEL_META[name].semanticRole.length).toBeGreaterThan(0);
      expect(LEVEL_META[name].use.length).toBeGreaterThan(0);
    }
  });

  it("none is documented as 'flat surface'", () => {
    expect(LEVEL_META.none.semanticRole).toContain("flat");
  });

  it("overlay is documented as 'high elevation'", () => {
    expect(LEVEL_META.overlay.semanticRole).toContain("high");
  });
});

// ─── Style knob — proposal §5 ───────────────────────────────────────────────

describe("ElevationStyle — proposal §5", () => {
  it("has exactly 3 options: shadow, ring, flat", () => {
    expect([...ELEVATION_STYLE_OPTIONS].sort()).toEqual(["flat", "ring", "shadow"]);
  });

  it("default style is 'shadow'", () => {
    expect(DEFAULT_ELEVATION_KNOBS.style).toBe("shadow");
  });
});

// ─── Intensity knob — proposal §5 ───────────────────────────────────────────

describe("ElevationIntensity — proposal §5", () => {
  it("has exactly 4 options: whisper, subtle, medium, dramatic", () => {
    expect([...ELEVATION_INTENSITY_OPTIONS]).toEqual([
      "whisper", "subtle", "medium", "dramatic",
    ]);
  });

  it("default intensity is 'subtle'", () => {
    expect(DEFAULT_ELEVATION_KNOBS.intensity).toBe("subtle");
  });
});

// ─── Intensity opacities table — proposal §5 ───────────────────────────────

describe("INTENSITY_OPACITIES — proposal §5", () => {
  it("has an entry for every intensity option", () => {
    for (const intensity of ELEVATION_INTENSITY_OPTIONS) {
      expect(INTENSITY_OPACITIES[intensity]).toBeDefined();
    }
  });

  it("each entry has raised/floating/overlay numeric opacities in (0,1)", () => {
    for (const [intensity, triple] of Object.entries(INTENSITY_OPACITIES)) {
      for (const level of ["raised", "floating", "overlay"] as const) {
        const v = triple[level];
        expect(typeof v, `${intensity}.${level} type`).toBe("number");
        expect(v, `${intensity}.${level} > 0`).toBeGreaterThan(0);
        expect(v, `${intensity}.${level} < 1`).toBeLessThan(1);
      }
    }
  });

  it("opacities increase monotonically by intensity (whisper < subtle < medium < dramatic)", () => {
    for (const level of ["raised", "floating", "overlay"] as const) {
      const seq = ELEVATION_INTENSITY_OPTIONS.map((i) => INTENSITY_OPACITIES[i][level]);
      for (let k = 1; k < seq.length; k++) {
        expect(seq[k], `${level}: ${ELEVATION_INTENSITY_OPTIONS[k]} > ${ELEVATION_INTENSITY_OPTIONS[k - 1]}`)
          .toBeGreaterThan(seq[k - 1]);
      }
    }
  });

  it("opacities increase monotonically by depth (raised < floating < overlay) within each intensity", () => {
    for (const intensity of ELEVATION_INTENSITY_OPTIONS) {
      const t = INTENSITY_OPACITIES[intensity];
      expect(t.raised, `${intensity}: raised < floating`).toBeLessThan(t.floating);
      expect(t.floating, `${intensity}: floating < overlay`).toBeLessThan(t.overlay);
    }
  });

  it("matches proposal §5 table exactly", () => {
    expect(INTENSITY_OPACITIES).toEqual({
      whisper:  { raised: 0.04, floating: 0.05, overlay: 0.08 },
      subtle:   { raised: 0.06, floating: 0.08, overlay: 0.12 },
      medium:   { raised: 0.08, floating: 0.12, overlay: 0.18 },
      dramatic: { raised: 0.12, floating: 0.18, overlay: 0.30 },
    });
  });
});

// ─── Default ring color — proposal §8 ───────────────────────────────────────

describe("DEFAULT_RING_COLOR — proposal §8", () => {
  it("is a valid hex string fallback", () => {
    expect(DEFAULT_RING_COLOR).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
