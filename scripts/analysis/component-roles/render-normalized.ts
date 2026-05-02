import type { ClassifiedRow } from "./dictionary.js";

interface CategoryReport {
  category: string;
  rowCount: number;
  systemCount: number;
  variants: Record<string, number>;
  states: Record<string, number>;
  sizes: Record<string, number>;
  modifiers: Record<string, number>;
}

function bumpCount(map: Record<string, number>, key: string | undefined): void {
  if (!key) return;
  map[key] = (map[key] ?? 0) + 1;
}

function reportFor(rows: ClassifiedRow[], category: string): CategoryReport {
  const sub = rows.filter((r) => r.category === category);
  const systems = new Set(sub.map((r) => r.system));
  const r: CategoryReport = {
    category,
    rowCount: sub.length,
    systemCount: systems.size,
    variants: {},
    states: {},
    sizes: {},
    modifiers: {},
  };
  for (const row of sub) {
    bumpCount(r.variants, row.variant);
    bumpCount(r.states, row.state);
    bumpCount(r.sizes, row.sizeVariant);
    bumpCount(r.modifiers, row.modifier);
  }
  return r;
}

export interface NormalizedSummary {
  totalRows: number;
  totalSystems: number;
  matched: number;
  excluded: number;
  unmapped: number;
  matchRate: number;
  byCategory: CategoryReport[];
  unmappedRoles: string[];
}

export function summarize(rows: ClassifiedRow[], scope: string[]): NormalizedSummary {
  const totalSystems = new Set(rows.map((r) => r.system)).size;
  const matched = rows.filter((r) => r.source === "mapping").length;
  const excluded = rows.filter((r) => r.source === "excluded").length;
  const unmapped = rows.filter((r) => r.source === "unmapped").length;
  const inScopeEligible = matched + unmapped;
  const matchRate = inScopeEligible === 0 ? 1 : matched / inScopeEligible;
  const unmappedRoles = [...new Set(rows.filter((r) => r.source === "unmapped").map((r) => r.rawRole))].sort();
  return {
    totalRows: rows.length,
    totalSystems,
    matched,
    excluded,
    unmapped,
    matchRate,
    byCategory: scope.map((c) => reportFor(rows, c)),
    unmappedRoles,
  };
}

function fmtCounts(m: Record<string, number>): string {
  const entries = Object.entries(m).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return "_(none)_";
  return entries.map(([k, n]) => `${k}=${n}`).join(", ");
}

export function renderNormalized(s: NormalizedSummary): string {
  const lines: string[] = [];
  lines.push("# Component Roles — Normalized (Phase B Pass 2)");
  lines.push("");
  lines.push(`_${s.totalRows} rows, ${s.totalSystems} systems, ${s.matched} mapped, ${s.excluded} excluded, ${s.unmapped} unmapped._`);
  lines.push(`_Match rate: ${(s.matchRate * 100).toFixed(1)}% (mapped / (mapped + unmapped))._`);
  lines.push("");
  lines.push("## Per-category report");
  lines.push("");
  for (const r of s.byCategory) {
    lines.push(`### ${r.category} (${r.systemCount} systems, ${r.rowCount} rows)`);
    lines.push("");
    lines.push(`- Variants — ${fmtCounts(r.variants)}`);
    lines.push(`- States — ${fmtCounts(r.states)}`);
    lines.push(`- Sizes — ${fmtCounts(r.sizes)}`);
    lines.push(`- Modifiers — ${fmtCounts(r.modifiers)}`);
    lines.push("");
  }
  if (s.unmappedRoles.length > 0) {
    lines.push("## Unmapped rawRoles (require dictionary entry or `excluded` listing)");
    lines.push("");
    for (const r of s.unmappedRoles) lines.push(`- \`${r}\``);
    lines.push("");
  }
  return lines.join("\n");
}
