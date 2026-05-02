// tests/generator/elevation-category.test.ts
//
// Validates the elevation-category generator produces the contract described in
// docs/research/elevation-category-proposal.md.

import { describe, it, expect } from "vitest";
import {
  generateElevationCategory,
  countEmittedTokens,
  resolveKnobs,
  buildLevelShadow,
  buildPhilosophy,
} from "../../src/generator/elevation-category.js";
import {
  DEFAULT_ELEVATION_KNOBS,
  DEFAULT_RING_COLOR,
  INTENSITY_OPACITIES,
  LEVEL_NAMES,
} from "../../src/schema/elevation.js";

// ─── Defaults shape — proposal §7 ───────────────────────────────────────────

describe("generateElevationCategory @ all defaults — proposal §7", () => {
  const e = generateElevationCategory();

  it("returns exactly 5 levels", () => {
    expect(e.levels).toHaveLength(5);
  });

  it("level order matches LEVEL_NAMES (none, ring, raised, floating, overlay)", () => {
    expect(e.levels.map((l) => l.name)).toEqual([...LEVEL_NAMES]);
  });

  it("level indices are 0..4", () => {
    expect(e.levels.map((l) => l.level)).toEqual([0, 1, 2, 3, 4]);
  });

  it("knobs reflect resolved defaults", () => {
    expect(e.knobs).toEqual(DEFAULT_ELEVATION_KNOBS);
  });

  it("emits a non-empty philosophy string", () => {
    expect(e.philosophy.length).toBeGreaterThan(0);
  });
});

// ─── `none` is universal — proposal §4 pattern 1 ────────────────────────────

describe("`none` level is 'none' across every (style, intensity) combo", () => {
  it.each([
    ["shadow", "subtle"],
    ["shadow", "dramatic"],
    ["ring", "subtle"],
    ["flat", "whisper"],
  ] as const)("style=%s intensity=%s", (style, intensity) => {
    const e = generateElevationCategory({ style, intensity });
    expect(e.levels[0].name).toBe("none");
    expect(e.levels[0].shadow).toBe("none");
  });
});

// ─── `ring` is identical across all styles — proposal §5 ────────────────────

describe("`ring` level is structural — same value across all 3 styles", () => {
  const shadow = generateElevationCategory({ style: "shadow" }).levels[1];
  const ring = generateElevationCategory({ style: "ring" }).levels[1];
  const flat = generateElevationCategory({ style: "flat" }).levels[1];

  it("name is 'ring' in all 3", () => {
    expect(shadow.name).toBe("ring");
    expect(ring.name).toBe("ring");
    expect(flat.name).toBe("ring");
  });

  it("shadow value is identical across all 3", () => {
    expect(shadow.shadow).toBe(ring.shadow);
    expect(ring.shadow).toBe(flat.shadow);
  });

  it("uses the default ring color when none supplied", () => {
    expect(shadow.shadow).toContain(DEFAULT_RING_COLOR);
    expect(shadow.shadow).toMatch(/0px 0px 0px 1px$/);
  });

  it("uses a custom ring color when supplied", () => {
    const e = generateElevationCategory({}, "#abcdef");
    expect(e.levels[1].shadow).toContain("#abcdef");
  });
});

// ─── style='shadow' — drop shadows at every non-none/non-ring level ─────────

describe("style='shadow' renders multi-layer drop shadows", () => {
  const e = generateElevationCategory({ style: "shadow", intensity: "subtle" });

  it.each(["raised", "floating", "overlay"] as const)(
    "%s level uses an rgba(0,0,0,...) shadow",
    (levelName) => {
      const level = e.levels.find((l) => l.name === levelName)!;
      expect(level.shadow).toMatch(/rgba\(0,0,0,/);
    },
  );

  it("raised shadow includes the subtle.raised opacity (0.06)", () => {
    const raised = e.levels.find((l) => l.name === "raised")!;
    expect(raised.shadow).toContain("0.06");
  });

  it("overlay shadow includes the subtle.overlay opacity (0.12)", () => {
    const overlay = e.levels.find((l) => l.name === "overlay")!;
    expect(overlay.shadow).toContain("0.12");
  });

  it("each shadow uses 2 layers (one comma-separated split)", () => {
    for (const name of ["raised", "floating", "overlay"] as const) {
      const level = e.levels.find((l) => l.name === name)!;
      // One comma between the 2 rgba(...) layers
      const rgbaCount = (level.shadow.match(/rgba\(0,0,0,/g) ?? []).length;
      expect(rgbaCount, `${name} should have 2 rgba layers`).toBe(2);
    }
  });
});

// ─── style='ring' — ring borders, no drop shadows except overlay ────────────

describe("style='ring' uses ring borders for depth", () => {
  const e = generateElevationCategory({ style: "ring" });

  it("raised level uses an inset ring", () => {
    expect(e.levels.find((l) => l.name === "raised")!.shadow).toMatch(/inset/);
  });

  it("floating level uses a 2px ring", () => {
    expect(e.levels.find((l) => l.name === "floating")!.shadow).toMatch(/0px 0px 0px 2px/);
  });

  it("overlay level adds a minimal drop shadow on top of the ring", () => {
    expect(e.levels.find((l) => l.name === "overlay")!.shadow).toMatch(/rgba\(0,0,0,/);
  });

  it("intensity is honored in knobs but ignored in shadow output", () => {
    const e1 = generateElevationCategory({ style: "ring", intensity: "whisper" });
    const e2 = generateElevationCategory({ style: "ring", intensity: "dramatic" });
    expect(e1.knobs.intensity).toBe("whisper");
    expect(e2.knobs.intensity).toBe("dramatic");
    // The ring outputs are intensity-invariant
    for (const idx of [0, 1, 2, 3, 4]) {
      expect(e1.levels[idx].shadow).toBe(e2.levels[idx].shadow);
    }
  });
});

// ─── style='flat' — minimal lift for overlay only ───────────────────────────

describe("style='flat' is shadow-free except overlay", () => {
  const e = generateElevationCategory({ style: "flat" });

  it.each(["raised", "floating"] as const)(
    "%s is 'none'",
    (levelName) => {
      expect(e.levels.find((l) => l.name === levelName)!.shadow).toBe("none");
    },
  );

  it("ring level still has its hairline ring (proposal §5 — ring is structural)", () => {
    expect(e.levels.find((l) => l.name === "ring")!.shadow).not.toBe("none");
  });

  it("overlay level always lifts (proposal §4 pattern 2)", () => {
    const overlay = e.levels.find((l) => l.name === "overlay")!;
    expect(overlay.shadow).not.toBe("none");
    expect(overlay.shadow).toMatch(/rgba\(0,0,0,/);
  });
});

// ─── intensity knob — opacity scales monotonically (style=shadow) ───────────

describe("intensity knob (style=shadow) — opacities scale monotonically", () => {
  const opacities = (intensity: "whisper" | "subtle" | "medium" | "dramatic") => {
    const e = generateElevationCategory({ style: "shadow", intensity });
    const raised = e.levels.find((l) => l.name === "raised")!.shadow;
    return parseFloat(raised.match(/rgba\(0,0,0,([0-9.]+)\)/)![1]);
  };

  it("whisper < subtle < medium < dramatic at the raised level", () => {
    expect(opacities("whisper")).toBeLessThan(opacities("subtle"));
    expect(opacities("subtle")).toBeLessThan(opacities("medium"));
    expect(opacities("medium")).toBeLessThan(opacities("dramatic"));
  });

  it("whisper raised opacity matches INTENSITY_OPACITIES table", () => {
    expect(opacities("whisper")).toBe(INTENSITY_OPACITIES.whisper.raised);
  });
});

// ─── resolveKnobs ────────────────────────────────────────────────────────────

describe("resolveKnobs", () => {
  it("undefined → defaults", () => {
    expect(resolveKnobs(undefined)).toEqual(DEFAULT_ELEVATION_KNOBS);
  });

  it("empty object → defaults", () => {
    expect(resolveKnobs({})).toEqual(DEFAULT_ELEVATION_KNOBS);
  });

  it("partial: only style", () => {
    expect(resolveKnobs({ style: "ring" })).toEqual({
      style: "ring",
      intensity: "subtle",
    });
  });

  it("partial: only intensity", () => {
    expect(resolveKnobs({ intensity: "dramatic" })).toEqual({
      style: "shadow",
      intensity: "dramatic",
    });
  });

  it("invalid style → falls back to default 'shadow'", () => {
    expect(resolveKnobs({ style: "deep" as never }).style).toBe("shadow");
  });

  it("invalid intensity → falls back to default 'subtle'", () => {
    expect(resolveKnobs({ intensity: "extreme" as never }).intensity).toBe("subtle");
  });
});

// ─── buildLevelShadow direct ────────────────────────────────────────────────

describe("buildLevelShadow direct", () => {
  it("none always returns 'none' regardless of style/intensity", () => {
    for (const style of ["shadow", "ring", "flat"] as const) {
      for (const intensity of ["whisper", "subtle", "medium", "dramatic"] as const) {
        expect(buildLevelShadow("none", style, intensity, "#fff")).toBe("none");
      }
    }
  });

  it("ring always uses the supplied ring color", () => {
    expect(buildLevelShadow("ring", "shadow", "subtle", "#abc")).toContain("#abc");
    expect(buildLevelShadow("ring", "ring", "subtle", "#abc")).toContain("#abc");
    expect(buildLevelShadow("ring", "flat", "subtle", "#abc")).toContain("#abc");
  });
});

// ─── buildPhilosophy ────────────────────────────────────────────────────────

describe("buildPhilosophy", () => {
  it("shadow style appends intensity fragment", () => {
    const sub = buildPhilosophy("shadow", "subtle");
    const drm = buildPhilosophy("shadow", "dramatic");
    expect(sub).not.toBe(drm);
  });

  it("ring style is intensity-independent", () => {
    expect(buildPhilosophy("ring", "subtle")).toBe(buildPhilosophy("ring", "dramatic"));
  });

  it("flat style is intensity-independent", () => {
    expect(buildPhilosophy("flat", "subtle")).toBe(buildPhilosophy("flat", "dramatic"));
  });
});

// ─── countEmittedTokens ──────────────────────────────────────────────────────

describe("countEmittedTokens — proposal §7", () => {
  it("returns 5 at default", () => {
    expect(countEmittedTokens(generateElevationCategory())).toBe(5);
  });

  it("returns 5 across every style", () => {
    for (const style of ["shadow", "ring", "flat"] as const) {
      expect(countEmittedTokens(generateElevationCategory({ style }))).toBe(5);
    }
  });
});
