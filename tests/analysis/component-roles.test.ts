import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { extractYamlComponents } from "../../scripts/analysis/component-roles/extract-yaml.js";
import { extractMarkdownComponents } from "../../scripts/analysis/component-roles/extract-markdown.js";
import { tallyByGroup, renderCsv } from "../../scripts/analysis/component-roles/render-raw.js";

const FIXT = join(__dirname, "fixtures");

function read(name: string): string {
  return readFileSync(join(FIXT, name), "utf-8");
}

describe("yaml component extraction", () => {
  const rows = extractYamlComponents("yaml-fixt", read("yaml-system.md"));

  it("extracts every top-level components key", () => {
    expect(rows.map((r) => r.rawRole).sort()).toEqual([
      "badge-pill", "button-primary", "button-secondary", "search-orb", "top-nav",
    ]);
  });

  it("derives group from first hyphen-segment", () => {
    const byRole = Object.fromEntries(rows.map((r) => [r.rawRole, r.group]));
    expect(byRole["button-primary"]).toBe("button");
    expect(byRole["button-secondary"]).toBe("button");
    expect(byRole["search-orb"]).toBe("search");
    expect(byRole["top-nav"]).toBe("top");
    expect(byRole["badge-pill"]).toBe("badge");
  });

  it("tags every row as yaml format", () => {
    expect(rows.every((r) => r.format === "yaml")).toBe(true);
  });
});

describe("markdown component extraction", () => {
  const rows = extractMarkdownComponents("md-fixt", read("markdown-system.md"));
  const roles = rows.map((r) => r.rawRole).sort();

  it("captures every bolded variant under a group", () => {
    expect(roles).toContain("buttons:primary-purple");
    expect(roles).toContain("buttons:ghost-outlined");
    expect(roles).toContain("badges-tags-pills:neutral-pill");
    expect(roles).toContain("badges-tags-pills:success-badge");
  });

  it("emits a _default row for groups with no sub-variants", () => {
    expect(roles).toContain("cards-containers:_default");
    expect(roles).toContain("inputs-forms:_default");
  });

  it("does not emit _default for groups that have variants", () => {
    expect(roles).not.toContain("buttons:_default");
    expect(roles).not.toContain("badges-tags-pills:_default");
  });

  it("groups slugify the ### heading", () => {
    const groups = new Set(rows.map((r) => r.group));
    expect(groups).toContain("buttons");
    expect(groups).toContain("cards-containers");
    expect(groups).toContain("badges-tags-pills");
    expect(groups).toContain("inputs-forms");
  });

  it("does not bleed past the next ## heading", () => {
    expect(rows.some((r) => r.group.includes("layout"))).toBe(false);
  });
});

describe("tally + render", () => {
  const rows = [
    ...extractYamlComponents("a", read("yaml-system.md")),
    ...extractMarkdownComponents("b", read("markdown-system.md")),
  ];

  it("tallies group frequency by system-count first, row-count second", () => {
    const t = tallyByGroup(rows);
    expect(t[0].systemCount).toBeGreaterThanOrEqual(t.at(-1)!.systemCount);
    for (const entry of t) expect(entry.systems.length).toBe(entry.systemCount);
  });

  it("csv has header + one line per row", () => {
    const csv = renderCsv(rows);
    const lines = csv.trim().split("\n");
    expect(lines[0]).toBe("system,format,group,rawRole");
    expect(lines.length).toBe(rows.length + 1);
  });
});
