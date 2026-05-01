import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { extractOne } from "../../scripts/analysis/extract.js";

describe("extractOne — fixtures", () => {
  it.each(["stripe", "airbnb", "vercel", "linear.app", "apple"])(
    "%s yields ≥ 8 non-null variables",
    (system) => {
      const md = readFileSync(`tests/analysis/fixtures/${system}.md`, "utf-8");
      const rec = extractOne(system, md);
      const nonNull = Object.entries(rec).filter(([k, v]) => k !== "system" && v !== null);
      expect(nonNull.length, `${system}: ${JSON.stringify(rec, null, 2)}`).toBeGreaterThanOrEqual(8);
    },
  );
});
