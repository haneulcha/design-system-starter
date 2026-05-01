import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  renderCorpusHtml,
  tercileBuckets,
  radiusBucketsWithPill,
  categoricalBuckets,
  type CorpusRecord,
} from "../../scripts/render-corpus-html.js";

function loadFixture(): CorpusRecord[] {
  const raw = readFileSync(
    resolve(process.cwd(), "data/extracted.json"),
    "utf8",
  );
  return JSON.parse(raw) as CorpusRecord[];
}

function makeRec(overrides: Partial<CorpusRecord> & { system: string }): CorpusRecord {
  return {
    btn_radius: null,
    is_fully_pill: null,
    card_radius: null,
    heading_weight: null,
    body_line_height: null,
    heading_letter_spacing: null,
    brand_l: null,
    brand_c: null,
    brand_h: null,
    gray_chroma: null,
    font_family_count: null,
    color_palette_size: null,
    spacing_range_ratio: null,
    palette_brand_count: null,
    palette_neutral_count: null,
    palette_semantic_count: null,
    text_style_count: null,
    distinct_weight_count: null,
    weight_min: null,
    weight_max: null,
    spacing_token_count: null,
    spacing_min_px: null,
    spacing_max_px: null,
    radius_token_count: null,
    radius_min_px: null,
    radius_max_px: null,
    elevation_level_count: null,
    component_count: null,
    shadow_intensity: null,
    btn_shape: null,
    dark_mode_present: null,
    typography_has_serif: null,
    multi_layer_shadow: null,
    shadow_tint: null,
    token_layer_depth: null,
    token_reference_style: null,
    naming_convention: null,
    ...overrides,
  };
}

describe("tercileBuckets", () => {
  it("splits 12 sequential values into Q1/Q2/Q3 with expected ranges", () => {
    const recs: CorpusRecord[] = Array.from({ length: 12 }, (_, i) =>
      makeRec({ system: `s${i}`, btn_radius: i + 1 }), // 1..12
    );
    const buckets = tercileBuckets(recs, "btn_radius", { unit: "px", decimals: 0 });
    expect(buckets).not.toBeNull();
    expect(buckets!.length).toBe(3);
    expect(buckets![0].label).toBe("Q1");
    // floor(12*0.33)=3, floor(12*0.67)=8 → slices 0-3, 3-8, 8-12
    expect(buckets![0].min).toBe(1);
    expect(buckets![0].max).toBe(3);
    expect(buckets![2].min).toBe(9);
    expect(buckets![2].max).toBe(12);
    expect(buckets![0].range).toContain("px");
  });

  it("returns null when fewer than 10 non-null values", () => {
    const recs: CorpusRecord[] = Array.from({ length: 5 }, (_, i) =>
      makeRec({ system: `s${i}`, btn_radius: i }),
    );
    expect(tercileBuckets(recs, "btn_radius")).toBeNull();
  });
});

describe("radiusBucketsWithPill", () => {
  it("carves pill systems out of the numeric tercile", () => {
    const pillRecs: CorpusRecord[] = Array.from({ length: 3 }, (_, i) =>
      makeRec({ system: `pill${i}`, is_fully_pill: true, btn_radius: null }),
    );
    const numRecs: CorpusRecord[] = Array.from({ length: 12 }, (_, i) =>
      makeRec({ system: `num${i}`, is_fully_pill: false, btn_radius: i + 2 }),
    );
    const out = radiusBucketsWithPill([...pillRecs, ...numRecs]);
    expect(out.pill.members).toHaveLength(3);
    expect(out.pill.members).toContain("pill0");
    expect(out.numeric).not.toBeNull();
    // No pill systems should appear in numeric buckets.
    for (const b of out.numeric!) {
      for (const m of b.members) {
        expect(m.system.startsWith("pill")).toBe(false);
      }
    }
  });
});

describe("categoricalBuckets", () => {
  it("groups by value and respects valueOrder", () => {
    const recs: CorpusRecord[] = [
      makeRec({ system: "a", naming_convention: "t-shirt" }),
      makeRec({ system: "b", naming_convention: "numeric" }),
      makeRec({ system: "c", naming_convention: "t-shirt" }),
    ];
    const buckets = categoricalBuckets(recs, "naming_convention", [
      "t-shirt",
      "numeric",
      "purpose",
      "hybrid",
    ]);
    expect(buckets.length).toBe(2); // purpose/hybrid absent
    expect(buckets[0].label).toBe("t-shirt");
    expect(buckets[0].members.sort()).toEqual(["a", "c"]);
    expect(buckets[1].label).toBe("numeric");
  });
});

describe("renderCorpusHtml", () => {
  const html = renderCorpusHtml(loadFixture());

  it("renders all 8 category sections", () => {
    expect(html).toContain("1. Color");
    expect(html).toContain("2. Typography");
    expect(html).toContain("3. Spacing");
    expect(html).toContain("4. Radius");
    expect(html).toContain("5. Elevation");
    expect(html).toContain("6. Token architecture");
    expect(html).toContain("7. Naming convention");
    expect(html).toContain("8. Components");
  });

  it("contains known system names from the corpus", () => {
    expect(html).toContain("stripe");
    expect(html).toContain("airbnb");
  });

  it("contains a hex color swatch in the Color section", () => {
    expect(html).toMatch(/background:#[0-9a-f]{3,6}/i);
  });

  it("does not mention 'mood' anywhere", () => {
    // Allow only the literal "No mood overlay" disclaimer in the header.
    const cleaned = html.replace("No mood overlay", "").toLowerCase();
    expect(cleaned).not.toContain("mood");
  });
});
