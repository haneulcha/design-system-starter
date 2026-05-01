import { describe, it, expect } from "vitest";
import { extractFromSystem } from "../../scripts/analysis/type-styles/extract-styles.js";

const MINIMAL_MD = `# System

## Typography

### Font Family
- **Primary**: \`Inter\`, with fallback: \`system-ui\`

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Body | Inter | 16px (1.00rem) | 400 | 1.50 | normal | Reading |
`;

describe("extractFromSystem", () => {
  it("extracts a single body row", () => {
    const result = extractFromSystem("test-sys", MINIMAL_MD);
    expect(result.hasTypographySection).toBe(true);
    expect(result.rows).toHaveLength(1);
    const r = result.rows[0];
    expect(r.system).toBe("test-sys");
    expect(r.rawRole).toBe("Body");
    expect(r.font).toBe("Inter");
    expect(r.sizePx).toBe(16);
    expect(r.weight).toBe(400);
    expect(r.lineHeight).toBe(1.5);
    expect(r.letterSpacingPx).toBe(0);
    expect(r.notes).toBe("Reading");
    expect(r.rowIndex).toBe(0);
  });

  it("returns hasTypographySection=false when section missing", () => {
    const result = extractFromSystem("test-sys", "# nothing\n");
    expect(result.hasTypographySection).toBe(false);
    expect(result.rows).toHaveLength(0);
  });
});

const TOKEN_HEADER_MD = `## Typography
| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| \`{typography.body-md}\` | 16px | 400 | 1.5 | 0 | Body |
`;

it("treats 'Token' as Role and 'Use' as Notes", () => {
  const r = extractFromSystem("a", TOKEN_HEADER_MD);
  expect(r.rows).toHaveLength(1);
  expect(r.rows[0].rawRole).toBe("body-md");
  expect(r.rows[0].notes).toBe("Body");
});

const NO_FONT_MD = `## Typography
| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| body | 14px | 500 | 1.43 | 0 | text |
`;

it("returns font=null when Font column is absent", () => {
  const r = extractFromSystem("a", NO_FONT_MD);
  expect(r.rows[0].font).toBeNull();
});

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const CORPUS_DIR = join(process.cwd(), "data", "raw");

it("extracts at least 30 systems from the live corpus without throwing", () => {
  const files = readdirSync(CORPUS_DIR).filter((f) => f.endsWith(".md"));
  let withSection = 0;
  let totalRows = 0;
  for (const f of files) {
    const md = readFileSync(join(CORPUS_DIR, f), "utf-8");
    const r = extractFromSystem(f.replace(/\.md$/, ""), md);
    if (r.hasTypographySection) withSection++;
    totalRows += r.rows.length;
  }
  expect(withSection).toBeGreaterThanOrEqual(30);
  expect(totalRows).toBeGreaterThanOrEqual(300);
});
