import type { NormalizedTypeStyleRow } from "./dictionary.js";

function tableRow(cells: string[]): string {
  return "| " + cells.join(" | ") + " |";
}

function escapeCell(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function frequencyByCategoryRaw(
  rows: NormalizedTypeStyleRow[]
): Array<{ category: string; count: number; systems: string[] }> {
  const map = new Map<string, { count: number; systems: Set<string> }>();
  for (const row of rows) {
    if (row.standardCategory === null) continue;
    const cat = row.standardCategory;
    if (!map.has(cat)) map.set(cat, { count: 0, systems: new Set() });
    const entry = map.get(cat)!;
    entry.count += 1;
    entry.systems.add(row.system);
  }
  const entries = Array.from(map.entries()).map(([category, { count, systems }]) => ({
    category,
    count,
    systems: Array.from(systems).sort(),
  }));
  entries.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.category.localeCompare(b.category);
  });
  return entries;
}

function renderCategoryFrequencyTable(rows: NormalizedTypeStyleRow[]): string {
  const lines: string[] = [];
  lines.push("## Standard category frequency");
  lines.push("");
  const entries = frequencyByCategoryRaw(rows);
  if (entries.length === 0) {
    lines.push("(none)");
    return lines.join("\n");
  }
  lines.push(tableRow(["standardCategory", "count", "systems_present"]));
  lines.push(tableRow(["---", "---:", "---:"]));
  for (const e of entries) {
    lines.push(tableRow([escapeCell(e.category), String(e.count), String(e.systems.length)]));
  }
  return lines.join("\n");
}

function renderSubclassBreakdown(rows: NormalizedTypeStyleRow[]): string {
  const lines: string[] = [];
  lines.push("## Sub-classification breakdown");
  lines.push("");

  const matched = rows.filter((r) => r.matchStatus === "matched");
  if (matched.length === 0) {
    lines.push("(none)");
    return lines.join("\n");
  }

  const map = new Map<string, number>();
  for (const row of matched) {
    const cat = row.standardCategory ?? "";
    const sv = row.sizeVariant ?? "";
    const key = `${cat}\0${sv}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }

  const parsed = Array.from(map.entries()).map(([key, count]) => {
    const nullIdx = key.indexOf("\0");
    const cat = key.slice(0, nullIdx);
    const svRaw = key.slice(nullIdx + 1);
    return { category: cat, sizeVariant: svRaw === "" ? null : svRaw, count };
  });

  parsed.sort((a, b) => {
    const catCmp = a.category.localeCompare(b.category);
    if (catCmp !== 0) return catCmp;
    const aV = a.sizeVariant ?? "";
    const bV = b.sizeVariant ?? "";
    return aV.localeCompare(bV);
  });

  lines.push(tableRow(["standardCategory", "sizeVariant", "count"]));
  lines.push(tableRow(["---", "---", "---:"]));
  for (const e of parsed) {
    const sv = e.sizeVariant === null ? "—" : e.sizeVariant;
    lines.push(tableRow([escapeCell(e.category), escapeCell(sv), String(e.count)]));
  }
  return lines.join("\n");
}

function renderUnknownRoles(rows: NormalizedTypeStyleRow[]): string {
  const lines: string[] = [];
  lines.push("## Unknown raw roles");
  lines.push("");

  const unknown = rows.filter((r) => r.matchStatus === "unknown");
  if (unknown.length === 0) {
    lines.push("(none)");
    return lines.join("\n");
  }

  const map = new Map<string, Set<string>>();
  for (const row of unknown) {
    const key = row.rawRole.toLowerCase();
    if (!map.has(key)) map.set(key, new Set());
    map.get(key)!.add(row.system);
  }

  const entries = Array.from(map.entries())
    .map(([rawRole, systemSet]) => ({
      rawRole,
      systems: Array.from(systemSet).sort(),
    }))
    .sort((a, b) => a.rawRole.localeCompare(b.rawRole));

  lines.push(tableRow(["rawRole", "systems"]));
  lines.push(tableRow(["---", "---"]));
  for (const e of entries) {
    lines.push(tableRow([escapeCell(e.rawRole), escapeCell(e.systems.join(", "))]));
  }
  return lines.join("\n");
}

export function renderNormalizedReport(rows: NormalizedTypeStyleRow[]): string {
  const total = rows.length;
  const matchedCount = rows.filter((r) => r.matchStatus === "matched").length;
  const unmappedCount = rows.filter((r) => r.matchStatus === "unmapped").length;
  const unknownCount = rows.filter((r) => r.matchStatus === "unknown").length;
  const pct = total === 0 ? 0 : Math.round((matchedCount / total) * 100);

  const sections: string[] = [];
  sections.push("# Typography — Normalized Pass 2");
  sections.push("");
  sections.push(
    `${total} rows total · matched: ${matchedCount} (${pct}%) · unmapped: ${unmappedCount} · unknown: ${unknownCount}`
  );
  sections.push("");
  sections.push(renderCategoryFrequencyTable(rows));
  sections.push("");
  sections.push(renderSubclassBreakdown(rows));
  sections.push("");
  sections.push(renderUnknownRoles(rows));

  return sections.join("\n");
}
