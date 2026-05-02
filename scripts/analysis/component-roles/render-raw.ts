import type { RawComponentRow } from "./types.js";

export interface GroupTally {
  group: string;
  rowCount: number;
  systemCount: number;
  systems: string[];
}

export function tallyByGroup(rows: RawComponentRow[]): GroupTally[] {
  const map = new Map<string, { rows: number; systems: Set<string> }>();
  for (const r of rows) {
    const cur = map.get(r.group) ?? { rows: 0, systems: new Set<string>() };
    cur.rows += 1;
    cur.systems.add(r.system);
    map.set(r.group, cur);
  }
  return [...map.entries()]
    .map(([group, v]) => ({
      group,
      rowCount: v.rows,
      systemCount: v.systems.size,
      systems: [...v.systems].sort(),
    }))
    .sort((a, b) => b.systemCount - a.systemCount || b.rowCount - a.rowCount);
}

export function renderMarkdown(rows: RawComponentRow[]): string {
  const tallies = tallyByGroup(rows);
  const totalSystems = new Set(rows.map((r) => r.system)).size;
  const lines: string[] = [];
  lines.push("# Component Roles — Raw Extraction (Phase A)");
  lines.push("");
  lines.push(`_${rows.length} component instances across ${totalSystems} systems._`);
  lines.push("");
  lines.push("Group = first hyphen-segment (YAML) or sluggified `### heading` (markdown).");
  lines.push("Frequency table is sorted by system-count, then row-count.");
  lines.push("");
  lines.push("## Frequency table");
  lines.push("");
  lines.push("| Group | Systems (n) | Rows (n) | Coverage |");
  lines.push("|---|---:|---:|---:|");
  for (const t of tallies) {
    const pct = ((t.systemCount / totalSystems) * 100).toFixed(0);
    lines.push(`| \`${t.group}\` | ${t.systemCount} | ${t.rowCount} | ${pct}% |`);
  }
  lines.push("");
  lines.push("## Per-system listing");
  lines.push("");
  const bySystem = new Map<string, RawComponentRow[]>();
  for (const r of rows) {
    const cur = bySystem.get(r.system) ?? [];
    cur.push(r);
    bySystem.set(r.system, cur);
  }
  for (const system of [...bySystem.keys()].sort()) {
    const sysRows = bySystem.get(system) ?? [];
    lines.push(`### ${system} (${sysRows[0]?.format}, ${sysRows.length} rows)`);
    lines.push("");
    for (const r of sysRows) lines.push(`- \`${r.rawRole}\` _(group: ${r.group})_`);
    lines.push("");
  }
  return lines.join("\n");
}

export function renderCsv(rows: RawComponentRow[]): string {
  const head = "system,format,group,rawRole";
  const body = rows.map((r) => {
    const esc = (s: string): string => (s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s);
    return [esc(r.system), r.format, esc(r.group), esc(r.rawRole)].join(",");
  });
  return [head, ...body].join("\n") + "\n";
}
