import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { TypeStyleRow } from "../../scripts/analysis/type-styles/types.js";
import {
  classifyRow,
  classifyAll,
  validateDictionary,
  type RoleDictionary,
} from "../../scripts/analysis/type-styles/dictionary.js";

const MINIMAL_DICT: RoleDictionary = {
  version: 1,
  categories: ["heading", "body", "caption", "card", "badge", "nav", "link", "button", "code"],
  sizeVariants: {
    heading: ["xs", "sm", "md", "lg", "xl", "2xl"],
    body: ["sm", "md", "lg"],
    caption: ["xs", "sm", "md"],
    card: ["sm", "md", "lg"],
    badge: [],
    nav: ["sm", "md", "lg"],
    link: ["sm", "md", "lg"],
    button: ["sm", "md", "lg"],
    code: ["xs", "sm", "md", "lg"],
  },
  rules: [],
  mappings: {
    "display hero": { category: "heading", sizeVariant: "xl" },
    "body": { category: "body", sizeVariant: "md" },
    "body emphasis": { category: "body", sizeVariant: "md", weightVariant: "semibold" },
    "caption tabular": { category: "caption", sizeVariant: "md", modifier: "tabular" },
    "badge": { category: "badge" },
  },
  unmapped: ["weird-unknown-role"],
};

function makeRow(rawRole: string): TypeStyleRow {
  return {
    system: "test",
    rawRole,
    font: null,
    sizePx: null,
    weight: null,
    lineHeight: null,
    letterSpacingPx: null,
    features: [],
    notes: "",
    rowIndex: 0,
  };
}

describe("classifyRow — matched", () => {
  it("matches an exact key and returns matched status", () => {
    const result = classifyRow(makeRow("display hero"), MINIMAL_DICT);
    expect(result.matchStatus).toBe("matched");
    expect(result.standardCategory).toBe("heading");
    expect(result.sizeVariant).toBe("xl");
    expect(result.weightVariant).toBeNull();
    expect(result.modifier).toBeNull();
  });

  it("matches case-insensitively — 'Display Hero' finds 'display hero'", () => {
    const result = classifyRow(makeRow("Display Hero"), MINIMAL_DICT);
    expect(result.matchStatus).toBe("matched");
    expect(result.standardCategory).toBe("heading");
    expect(result.sizeVariant).toBe("xl");
  });

  it("trims whitespace before lookup", () => {
    const result = classifyRow(makeRow("  body  "), MINIMAL_DICT);
    expect(result.matchStatus).toBe("matched");
    expect(result.standardCategory).toBe("body");
  });
});

describe("classifyRow — sub-classification from mapping", () => {
  it("populates weightVariant from the mapping object, not from rawRole string", () => {
    const result = classifyRow(makeRow("body emphasis"), MINIMAL_DICT);
    expect(result.matchStatus).toBe("matched");
    expect(result.standardCategory).toBe("body");
    expect(result.sizeVariant).toBe("md");
    expect(result.weightVariant).toBe("semibold");
    expect(result.modifier).toBeNull();
  });

  it("populates modifier from the mapping object", () => {
    const result = classifyRow(makeRow("caption tabular"), MINIMAL_DICT);
    expect(result.matchStatus).toBe("matched");
    expect(result.modifier).toBe("tabular");
    expect(result.weightVariant).toBeNull();
  });

  it("returns null for missing optional fields when mapping omits them", () => {
    const result = classifyRow(makeRow("badge"), MINIMAL_DICT);
    expect(result.matchStatus).toBe("matched");
    expect(result.sizeVariant).toBeNull();
    expect(result.weightVariant).toBeNull();
    expect(result.modifier).toBeNull();
  });
});

describe("classifyRow — unmapped and unknown", () => {
  it("returns unmapped status for roles listed in dict.unmapped", () => {
    const result = classifyRow(makeRow("weird-unknown-role"), MINIMAL_DICT);
    expect(result.matchStatus).toBe("unmapped");
    expect(result.standardCategory).toBeNull();
    expect(result.sizeVariant).toBeNull();
    expect(result.weightVariant).toBeNull();
    expect(result.modifier).toBeNull();
  });

  it("returns unknown status for roles not in mappings or unmapped", () => {
    const result = classifyRow(makeRow("totally-new-role-xyz"), MINIMAL_DICT);
    expect(result.matchStatus).toBe("unknown");
    expect(result.standardCategory).toBeNull();
    expect(result.sizeVariant).toBeNull();
    expect(result.weightVariant).toBeNull();
    expect(result.modifier).toBeNull();
  });
});

describe("classifyRow — passthrough of original row fields", () => {
  it("preserves all original TypeStyleRow fields on the normalized row", () => {
    const row = makeRow("body");
    row.sizePx = 16;
    row.weight = 400;
    row.system = "my-system";
    const result = classifyRow(row, MINIMAL_DICT);
    expect(result.system).toBe("my-system");
    expect(result.sizePx).toBe(16);
    expect(result.weight).toBe(400);
    expect(result.rawRole).toBe("body");
  });
});

describe("classifyAll", () => {
  it("preserves length — every row gets a normalized row", () => {
    const rows = [
      makeRow("display hero"),
      makeRow("body emphasis"),
      makeRow("weird-unknown-role"),
      makeRow("totally-new-role-xyz"),
    ];
    const results = classifyAll(rows, MINIMAL_DICT);
    expect(results).toHaveLength(4);
  });

  it("tags every row with the correct match status", () => {
    const rows = [
      makeRow("display hero"),
      makeRow("weird-unknown-role"),
      makeRow("totally-new-role-xyz"),
    ];
    const results = classifyAll(rows, MINIMAL_DICT);
    expect(results[0].matchStatus).toBe("matched");
    expect(results[1].matchStatus).toBe("unmapped");
    expect(results[2].matchStatus).toBe("unknown");
  });

  it("returns an empty array for empty input", () => {
    expect(classifyAll([], MINIMAL_DICT)).toEqual([]);
  });
});

describe("validateDictionary", () => {
  it("accepts a valid dictionary object", () => {
    expect(() => validateDictionary(MINIMAL_DICT)).not.toThrow();
    const result = validateDictionary(MINIMAL_DICT);
    expect(result.version).toBe(1);
  });

  it("throws when input is not an object", () => {
    expect(() => validateDictionary(null)).toThrow();
    expect(() => validateDictionary("string")).toThrow();
    expect(() => validateDictionary(42)).toThrow();
  });

  it("throws when version is not a number", () => {
    expect(() =>
      validateDictionary({ ...MINIMAL_DICT, version: "1" })
    ).toThrow();
  });

  it("throws when categories is not an array", () => {
    expect(() =>
      validateDictionary({ ...MINIMAL_DICT, categories: "heading,body" })
    ).toThrow();
  });

  it("throws when categories contains non-string elements", () => {
    expect(() =>
      validateDictionary({ ...MINIMAL_DICT, categories: [1, 2, 3] })
    ).toThrow();
  });

  it("throws when mappings is not an object", () => {
    expect(() =>
      validateDictionary({ ...MINIMAL_DICT, mappings: [] })
    ).toThrow();
  });

  it("throws when a mapping's category is not in the categories list", () => {
    const invalidDict = {
      ...MINIMAL_DICT,
      mappings: {
        ...MINIMAL_DICT.mappings,
        "rogue-role": { category: "tooltip" },
      },
    };
    expect(() => validateDictionary(invalidDict)).toThrow();
  });

  it("throws when a raw role appears in both mappings and unmapped", () => {
    const conflictingDict = {
      ...MINIMAL_DICT,
      unmapped: ["display hero"],
    };
    expect(() => validateDictionary(conflictingDict)).toThrow();
  });
});

describe("end-to-end with real dictionary file", () => {
  const dictPath = join(
    import.meta.dirname,
    "../../docs/research/type-style-dictionary.json"
  );

  it("loads and validates the real dictionary without throwing", () => {
    const raw = JSON.parse(readFileSync(dictPath, "utf-8"));
    expect(() => validateDictionary(raw)).not.toThrow();
  });

  it("classifyAll on sample real rawRoles returns expected categories", () => {
    const raw = JSON.parse(readFileSync(dictPath, "utf-8"));
    const dict = validateDictionary(raw);

    const samples: Array<{ rawRole: string; expectedCategory: string }> = [
      { rawRole: "Display Hero", expectedCategory: "heading" },
      { rawRole: "body-md", expectedCategory: "body" },
      { rawRole: "caption-uppercase", expectedCategory: "badge" },
    ];

    const rows = samples.map((s, i) => ({
      ...makeRow(s.rawRole),
      rowIndex: i,
    }));

    const results = classifyAll(rows, dict);
    expect(results).toHaveLength(3);

    for (let i = 0; i < samples.length; i++) {
      expect(results[i].matchStatus).toBe("matched");
      expect(results[i].standardCategory).toBe(samples[i].expectedCategory);
    }
  });
});
