import { describe, it, expect } from "vitest";
import { renderNormalizedReport } from "../../scripts/analysis/type-styles/render-normalized.js";
import type { NormalizedTypeStyleRow } from "../../scripts/analysis/type-styles/dictionary.js";

function makeRow(
  overrides: Partial<NormalizedTypeStyleRow> & Pick<NormalizedTypeStyleRow, "matchStatus">
): NormalizedTypeStyleRow {
  return {
    system: "SystemA",
    rawRole: "body",
    font: null,
    sizePx: null,
    weight: null,
    lineHeight: null,
    letterSpacingPx: null,
    features: [],
    notes: "",
    rowIndex: 0,
    standardCategory: null,
    sizeVariant: null,
    weightVariant: null,
    modifier: null,
    ...overrides,
  };
}

const mixedRows: NormalizedTypeStyleRow[] = [
  makeRow({
    system: "SystemA",
    rawRole: "heading large",
    standardCategory: "heading",
    sizeVariant: "lg",
    weightVariant: null,
    modifier: null,
    matchStatus: "matched",
    rowIndex: 0,
  }),
  makeRow({
    system: "SystemB",
    rawRole: "heading large",
    standardCategory: "heading",
    sizeVariant: "lg",
    weightVariant: null,
    modifier: null,
    matchStatus: "matched",
    rowIndex: 1,
  }),
  makeRow({
    system: "SystemA",
    rawRole: "obsolete-ui",
    standardCategory: null,
    sizeVariant: null,
    weightVariant: null,
    modifier: null,
    matchStatus: "unmapped",
    rowIndex: 2,
  }),
  makeRow({
    system: "SystemC",
    rawRole: "mystery role",
    standardCategory: null,
    sizeVariant: null,
    weightVariant: null,
    modifier: null,
    matchStatus: "unknown",
    rowIndex: 3,
  }),
];

describe("renderNormalizedReport", () => {
  describe("title and summary line", () => {
    it("renders the correct title", () => {
      const output = renderNormalizedReport(mixedRows);
      expect(output).toContain("# Typography — Normalized Pass 2");
    });

    it("renders summary line with correct counts for mixed rows (2 matched, 1 unmapped, 1 unknown)", () => {
      const output = renderNormalizedReport(mixedRows);
      expect(output).toContain(
        "4 rows total · matched: 2 (50%) · unmapped: 1 · unknown: 1"
      );
    });
  });

  describe("standard category frequency table", () => {
    it("renders the section heading", () => {
      const output = renderNormalizedReport(mixedRows);
      expect(output).toContain("## Standard category frequency");
    });

    it("contains the matched category name in the table", () => {
      const output = renderNormalizedReport(mixedRows);
      expect(output).toContain("heading");
    });

    it("table includes standardCategory, count, and systems_present columns", () => {
      const output = renderNormalizedReport(mixedRows);
      const lines = output.split("\n");
      const headerIdx = lines.findIndex((l) =>
        l.includes("standardCategory") && l.includes("count") && l.includes("systems_present")
      );
      expect(headerIdx).toBeGreaterThan(-1);
    });

    it("skips rows with null standardCategory", () => {
      const output = renderNormalizedReport(mixedRows);
      // null categories should not produce a row in the frequency table
      // The only category with a non-null standardCategory is "heading"
      // unmapped and unknown rows should not create category rows
      const lines = output.split("\n");
      const sectionStart = lines.findIndex((l) =>
        l.includes("## Standard category frequency")
      );
      const nextSection = lines.findIndex(
        (l, i) => i > sectionStart && l.startsWith("## ")
      );
      const sectionLines = lines.slice(sectionStart, nextSection);
      // Should have heading but not null entries
      const hasNullEntry = sectionLines.some((l) => l.includes("| null |") || l.includes("| — |"));
      expect(hasNullEntry).toBe(false);
    });

    it("sorts by count descending when multiple categories", () => {
      const rows: NormalizedTypeStyleRow[] = [
        makeRow({ system: "S1", rawRole: "body", standardCategory: "body", sizeVariant: null, matchStatus: "matched", rowIndex: 0 }),
        makeRow({ system: "S2", rawRole: "body", standardCategory: "body", sizeVariant: null, matchStatus: "matched", rowIndex: 1 }),
        makeRow({ system: "S3", rawRole: "body", standardCategory: "body", sizeVariant: null, matchStatus: "matched", rowIndex: 2 }),
        makeRow({ system: "S1", rawRole: "caption", standardCategory: "caption", sizeVariant: null, matchStatus: "matched", rowIndex: 3 }),
      ];
      const output = renderNormalizedReport(rows);
      const bodyIdx = output.indexOf("| body |");
      const captionIdx = output.indexOf("| caption |");
      expect(bodyIdx).toBeLessThan(captionIdx);
    });
  });

  describe("sub-classification breakdown", () => {
    it("renders the section heading", () => {
      const output = renderNormalizedReport(mixedRows);
      expect(output).toContain("## Sub-classification breakdown");
    });

    it("shows heading + lg grouping", () => {
      const output = renderNormalizedReport(mixedRows);
      expect(output).toContain("heading");
      expect(output).toContain("lg");
    });

    it("shows — for null sizeVariant", () => {
      const rows: NormalizedTypeStyleRow[] = [
        makeRow({
          system: "S1",
          rawRole: "body default",
          standardCategory: "body",
          sizeVariant: null,
          matchStatus: "matched",
          rowIndex: 0,
        }),
      ];
      const output = renderNormalizedReport(rows);
      expect(output).toContain("—");
    });

    it("table includes standardCategory, sizeVariant, and count columns", () => {
      const output = renderNormalizedReport(mixedRows);
      const lines = output.split("\n");
      const headerIdx = lines.findIndex(
        (l) =>
          l.includes("standardCategory") &&
          l.includes("sizeVariant") &&
          l.includes("count")
      );
      expect(headerIdx).toBeGreaterThan(-1);
    });
  });

  describe("unknown raw roles", () => {
    it("renders the section heading", () => {
      const output = renderNormalizedReport(mixedRows);
      expect(output).toContain("## Unknown raw roles");
    });

    it("lists the unknown rawRole", () => {
      const output = renderNormalizedReport(mixedRows);
      expect(output).toContain("mystery role");
    });

    it("shows the system that has the unknown role", () => {
      const output = renderNormalizedReport(mixedRows);
      expect(output).toContain("SystemC");
    });

    it("writes (none) when there are no unknown rows", () => {
      const rows: NormalizedTypeStyleRow[] = [
        makeRow({ matchStatus: "matched", standardCategory: "body", sizeVariant: null, rowIndex: 0 }),
        makeRow({ matchStatus: "unmapped", rowIndex: 1 }),
      ];
      const output = renderNormalizedReport(rows);
      const lines = output.split("\n");
      const sectionStart = lines.findIndex((l) =>
        l.includes("## Unknown raw roles")
      );
      expect(sectionStart).toBeGreaterThan(-1);
      const sectionContent = lines.slice(sectionStart + 1).join("\n");
      expect(sectionContent).toContain("(none)");
    });

    it("groups same rawRole (case-folded) from multiple systems", () => {
      const rows: NormalizedTypeStyleRow[] = [
        makeRow({ system: "S1", rawRole: "Mystery Role", matchStatus: "unknown", rowIndex: 0 }),
        makeRow({ system: "S2", rawRole: "mystery role", matchStatus: "unknown", rowIndex: 1 }),
      ];
      const output = renderNormalizedReport(rows);
      // Both should be collapsed to the same row
      const unknownSection = output.split("## Unknown raw roles")[1];
      const occurrences = (unknownSection.match(/mystery role/gi) ?? []).length;
      // Should appear once in a data row (header separator doesn't contain it)
      expect(occurrences).toBe(1);
      expect(unknownSection).toContain("S1");
      expect(unknownSection).toContain("S2");
    });
  });

  describe("empty rows array", () => {
    it("renders without throwing", () => {
      expect(() => renderNormalizedReport([])).not.toThrow();
    });

    it("shows zero counts in summary line", () => {
      const output = renderNormalizedReport([]);
      expect(output).toContain(
        "0 rows total · matched: 0 (0%) · unmapped: 0 · unknown: 0"
      );
    });

    it("renders the title", () => {
      const output = renderNormalizedReport([]);
      expect(output).toContain("# Typography — Normalized Pass 2");
    });

    it("renders all section headers", () => {
      const output = renderNormalizedReport([]);
      expect(output).toContain("## Standard category frequency");
      expect(output).toContain("## Sub-classification breakdown");
      expect(output).toContain("## Unknown raw roles");
    });
  });

  describe("pipe character escaping", () => {
    it("escapes pipe characters in rawRole cells", () => {
      const rows: NormalizedTypeStyleRow[] = [
        makeRow({
          system: "S1",
          rawRole: "code | body",
          matchStatus: "unknown",
          rowIndex: 0,
        }),
      ];
      const output = renderNormalizedReport(rows);
      expect(output).toContain("code \\| body");
    });

    it("does not break table structure when rawRole contains a pipe", () => {
      const rows: NormalizedTypeStyleRow[] = [
        makeRow({
          system: "S1",
          rawRole: "code | body",
          matchStatus: "unknown",
          rowIndex: 0,
        }),
      ];
      const output = renderNormalizedReport(rows);
      const unknownSection = output.split("## Unknown raw roles")[1];
      // Each data row should start and end with |
      const dataRows = unknownSection
        .split("\n")
        .filter((l) => l.startsWith("|") && !l.includes("---"));
      expect(dataRows.length).toBeGreaterThan(0);
      for (const row of dataRows) {
        expect(row.endsWith("|")).toBe(true);
      }
    });
  });

  describe("section ordering", () => {
    it("renders sections in required order", () => {
      const output = renderNormalizedReport(mixedRows);
      const titleIdx = output.indexOf("# Typography — Normalized Pass 2");
      const categoryFreqIdx = output.indexOf("## Standard category frequency");
      const subclassIdx = output.indexOf("## Sub-classification breakdown");
      const unknownIdx = output.indexOf("## Unknown raw roles");
      expect(titleIdx).toBeLessThan(categoryFreqIdx);
      expect(categoryFreqIdx).toBeLessThan(subclassIdx);
      expect(subclassIdx).toBeLessThan(unknownIdx);
    });
  });
});
