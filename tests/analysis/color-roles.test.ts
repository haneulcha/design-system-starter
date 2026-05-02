import { describe, it, expect } from "vitest";
import { extractFromSystem, extractFromSection } from "../../scripts/analysis/color-roles/extract-items.js";
import { extractFirstKeywords } from "../../scripts/analysis/color-roles/keywords.js";
import { extractCssVar, lastSegment } from "../../scripts/analysis/color-roles/css-var.js";
import {
  frequencyBySectionHeading,
  frequencyByCssVarSegment,
  frequencyByDescriptionKeywords,
} from "../../scripts/analysis/color-roles/frequency.js";

describe("extractFromSection — bullet shapes", () => {
  it("extracts standard stripe-style bullet (label/hex/css_var/description)", () => {
    const section = `### Primary
- **Deep Navy** (\`#061b31\`): \`--hds-color-heading-solid\`. Primary heading color. Not black.`;
    const rows = extractFromSection(section, "stripe");
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.section_heading).toBe("Primary");
    expect(row.item_label).toBe("Deep Navy");
    expect(row.hex).toBe("#061b31");
    expect(row.css_var).toBe("--hds-color-heading-solid");
    expect(row.token_ref).toBeNull();
    expect(row.description).toContain("Primary heading color");
  });

  it("extracts airbnb token-ref bullet (token_ref populated, css_var null)", () => {
    const section = `### Brand & Accent
- **Rausch** (\`{colors.primary}\` — #ff385c): The single brand color used for primary CTA.`;
    const rows = extractFromSection(section, "airbnb");
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.token_ref).toBe("{colors.primary}");
    expect(row.css_var).toBeNull();
    expect(row.hex).toBe("#ff385c");
  });

  it("returns null hex when bullet has no color literal", () => {
    const section = `### Surface
- **Background**: References Gray 100 token.`;
    const rows = extractFromSection(section, "x");
    expect(rows[0].hex).toBeNull();
    expect(rows[0].item_label).toBe("Background");
  });

  it("ignores non-bullet lines (italic notes, prose)", () => {
    const section = `### Primary
*Note: this section is special.*
Some prose paragraph here.
- **Pure Black** (\`#000000\`): All text.`;
    const rows = extractFromSection(section, "figma");
    expect(rows).toHaveLength(1);
    expect(rows[0].item_label).toBe("Pure Black");
  });

  it("groups multiple bullets under the current ### heading", () => {
    const section = `### Surface
- **A** (\`#fff\`): one.
- **B** (\`#eee\`): two.
### Text
- **C** (\`#000\`): three.`;
    const rows = extractFromSection(section, "x");
    expect(rows.map((r) => r.section_heading)).toEqual(["Surface", "Surface", "Text"]);
    expect(rows.map((r) => r.item_label)).toEqual(["A", "B", "C"]);
  });

  it("treats bullets before any subheading as '(no heading)'", () => {
    const section = `- **Solo** (\`#000\`): orphan bullet.`;
    const rows = extractFromSection(section, "x");
    expect(rows[0].section_heading).toBe("(no heading)");
  });

  it("strips leading numbering from subheadings (e.g., ### 2.1 Surface)", () => {
    const section = `### 2.1 Surface
- **A** (\`#fff\`): one.`;
    const rows = extractFromSection(section, "x");
    expect(rows[0].section_heading).toBe("Surface");
  });
});

describe("extractFromSystem — section detection", () => {
  it("finds section regardless of heading style ('## Colors' vs '## 2. Color Palette & Roles')", () => {
    const a = `## Colors\n### Primary\n- **A** (\`#fff\`): one.`;
    const b = `## 2. Color Palette & Roles\n### Primary\n- **B** (\`#000\`): two.`;
    expect(extractFromSystem("a", a).rows).toHaveLength(1);
    expect(extractFromSystem("b", b).rows).toHaveLength(1);
  });

  it("returns has_color_section=false when no color heading exists", () => {
    const md = `## Typography\n- nothing here.`;
    const result = extractFromSystem("nocolor", md);
    expect(result.has_color_section).toBe(false);
    expect(result.rows).toHaveLength(0);
  });
});

describe("extractFirstKeywords", () => {
  it("returns first 3 non-stopword tokens", () => {
    expect(extractFirstKeywords("Primary brand color, CTA backgrounds")).toEqual([
      "primary",
      "brand",
      "color",
    ]);
  });

  it("filters articles and prepositions", () => {
    expect(extractFirstKeywords("The default border tone for cards")).toEqual([
      "default",
      "border",
      "tone",
    ]);
  });

  it("strips backtick code spans before tokenizing", () => {
    expect(extractFirstKeywords("`--cds-text-primary`. Primary heading color.")).toEqual([
      "primary",
      "heading",
      "color",
    ]);
  });

  it("returns empty array for empty input", () => {
    expect(extractFirstKeywords("")).toEqual([]);
  });
});

describe("extractCssVar / lastSegment", () => {
  it("matches a CSS variable name from prose", () => {
    expect(extractCssVar("uses `--hds-color-heading-solid`")).toBe("--hds-color-heading-solid");
  });

  it("returns null when no variable present", () => {
    expect(extractCssVar("just prose with #abc")).toBeNull();
  });

  it("returns last 2 segments of a multi-segment variable", () => {
    expect(lastSegment("--hds-color-heading-solid")).toBe("heading-solid");
    expect(lastSegment("--cds-text-primary")).toBe("text-primary");
  });

  it("handles short single-segment names", () => {
    expect(lastSegment("--brand")).toBe("brand");
  });
});

describe("frequency tallies", () => {
  const rows = [
    { system: "a", section_heading: "Primary", item_label: "x", hex: null, css_var: "--ds-text-primary", token_ref: null, description: "", description_first_keywords: ["primary", "brand"] },
    { system: "a", section_heading: "Primary", item_label: "y", hex: null, css_var: "--ds-text-secondary", token_ref: null, description: "", description_first_keywords: ["secondary", "text"] },
    { system: "b", section_heading: "Primary", item_label: "z", hex: null, css_var: null, token_ref: null, description: "", description_first_keywords: ["primary", "brand"] },
    { system: "c", section_heading: "Surface", item_label: "w", hex: null, css_var: null, token_ref: null, description: "", description_first_keywords: [] },
  ];

  it("frequencyBySectionHeading sorts by count desc", () => {
    const f = frequencyBySectionHeading(rows);
    expect(f[0]).toMatchObject({ key: "Primary", count: 3 });
    expect(f[0].systems).toEqual(["a", "b"]);
  });

  it("frequencyByCssVarSegment counts only rows with css_var", () => {
    const f = frequencyByCssVarSegment(rows);
    const keys = f.map((e) => e.key);
    expect(keys).toContain("text-primary");
    expect(keys).toContain("text-secondary");
    expect(f.every((e) => e.count >= 1)).toBe(true);
  });

  it("frequencyByDescriptionKeywords skips empty keyword rows", () => {
    const f = frequencyByDescriptionKeywords(rows);
    const top = f[0];
    expect(top.key).toBe("primary brand");
    expect(top.count).toBe(2);
    expect(top.systems).toEqual(["a", "b"]);
  });
});
