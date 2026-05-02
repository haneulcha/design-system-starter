import type { MatchedRow, RoleDictionary } from "./dictionary.js";
import type { SystemResult } from "./types.js";

const SAMPLE_ROWS_PER_ROLE = 6;
const UNMATCHED_TABLE_LIMIT = 80;

function tableRow(cells: string[]): string {
  return "| " + cells.join(" | ") + " |";
}

function escapeCell(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function pct(n: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((n / total) * 100)}%`;
}

function renderDictionarySection(dict: RoleDictionary): string {
  const lines: string[] = [];
  lines.push("## Dictionary in Use");
  lines.push(`_axis: \`${dict.axis}\` · matching: \`${dict.matching}\` · version: ${dict.version}_`);
  lines.push("");
  for (const [role, headings] of Object.entries(dict.groups)) {
    lines.push(`**\`${role}\`** ← ${headings.map((h) => `\`${h}\``).join(", ")}`);
    lines.push("");
  }
  lines.push("**excluded headings (intentionally not a color role):** " +
    dict.exclude.map((h) => `\`${h}\``).join(", "));
  if (dict.notes && Object.keys(dict.notes).length > 0) {
    lines.push("");
    lines.push("**notes:**");
    for (const [heading, note] of Object.entries(dict.notes)) {
      lines.push(`- \`${heading}\`: ${note}`);
    }
  }
  return lines.join("\n");
}

function renderCoverage(matched: MatchedRow[], systemCount: number): string {
  const lines: string[] = [];
  const total = matched.length;
  const matchedCount = matched.filter((r) => r.match_kind === "matched").length;
  const excludedCount = matched.filter((r) => r.match_kind === "excluded").length;
  const unmatchedCount = matched.filter((r) => r.match_kind === "unmatched").length;
  lines.push("## Coverage");
  lines.push(`- ${systemCount} systems scanned, ${total} bullet rows`);
  lines.push(`- matched: ${matchedCount} (${pct(matchedCount, total)})`);
  lines.push(`- excluded (shadow/gradient/system-specific): ${excludedCount} (${pct(excludedCount, total)})`);
  lines.push(`- unmatched: ${unmatchedCount} (${pct(unmatchedCount, total)})`);
  return lines.join("\n");
}

function renderRoleFrequency(matched: MatchedRow[]): string {
  const byRole = new Map<string, { count: number; systems: Set<string> }>();
  for (const r of matched) {
    if (r.match_kind !== "matched" || !r.matched_role) continue;
    const slot = byRole.get(r.matched_role) ?? { count: 0, systems: new Set() };
    slot.count += 1;
    slot.systems.add(r.system);
    byRole.set(r.matched_role, slot);
  }
  const entries = [...byRole.entries()].sort((a, b) => b[1].count - a[1].count);
  const lines: string[] = [];
  lines.push("## Normalized Frequency");
  lines.push("");
  lines.push(tableRow(["role", "rows", "systems_present"]));
  lines.push(tableRow(["---", "---:", "---:"]));
  for (const [role, { count, systems }] of entries) {
    lines.push(tableRow([`\`${role}\``, String(count), `${systems.size}/58`]));
  }
  return lines.join("\n");
}

function renderPerRoleSamples(matched: MatchedRow[]): string {
  const byRole = new Map<string, MatchedRow[]>();
  for (const r of matched) {
    if (r.match_kind !== "matched" || !r.matched_role) continue;
    const arr = byRole.get(r.matched_role) ?? [];
    arr.push(r);
    byRole.set(r.matched_role, arr);
  }
  const lines: string[] = [];
  lines.push("## Per-Role Sample Rows");
  lines.push(`_Up to ${SAMPLE_ROWS_PER_ROLE} samples per role; pulled from distinct systems where possible._`);
  lines.push("");
  const sortedRoles = [...byRole.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [role, rows] of sortedRoles) {
    const systems = new Set<string>();
    const samples: MatchedRow[] = [];
    for (const row of rows) {
      if (samples.length >= SAMPLE_ROWS_PER_ROLE) break;
      if (systems.has(row.system)) continue;
      systems.add(row.system);
      samples.push(row);
    }
    lines.push(`### \`${role}\` (${rows.length} rows, ${new Set(rows.map((r) => r.system)).size} systems)`);
    for (const s of samples) {
      const parts: string[] = [`**${s.system}**`, `[${s.section_heading}]`, `label="${s.item_label}"`];
      if (s.hex) parts.push(`hex=${s.hex}`);
      parts.push(`keywords=[${s.description_first_keywords.join(", ")}]`);
      lines.push(`- ${parts.join(" · ")}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

function renderUnmatched(matched: MatchedRow[]): string {
  const unmatched = matched.filter((r) => r.match_kind === "unmatched");
  const byHeading = new Map<string, { count: number; systems: Set<string>; sample: MatchedRow }>();
  for (const r of unmatched) {
    const slot = byHeading.get(r.section_heading);
    if (slot) {
      slot.count += 1;
      slot.systems.add(r.system);
    } else {
      byHeading.set(r.section_heading, { count: 1, systems: new Set([r.system]), sample: r });
    }
  }
  const entries = [...byHeading.entries()].sort((a, b) => b[1].count - a[1].count);
  const lines: string[] = [];
  lines.push("## Unmatched Headings");
  lines.push(`_${unmatched.length} rows under headings the dictionary doesn't cover (neither matched nor excluded). If any of these should be promoted into a group or excluded, edit \`color-role-dictionary.json\` and re-run._`);
  lines.push("");
  if (entries.length === 0) {
    lines.push("(none — every heading was either matched or explicitly excluded)");
    return lines.join("\n");
  }
  lines.push(tableRow(["heading", "rows", "systems", "example_sample"]));
  lines.push(tableRow(["---", "---:", "---:", "---"]));
  for (const [heading, { count, systems, sample }] of entries.slice(0, UNMATCHED_TABLE_LIMIT)) {
    const ex = `${sample.system}: "${sample.item_label}" — ${sample.description_first_keywords.join(", ") || "(no keywords)"}`;
    lines.push(tableRow([escapeCell(heading), String(count), `${systems.size}`, escapeCell(ex)]));
  }
  if (entries.length > UNMATCHED_TABLE_LIMIT) {
    lines.push("");
    lines.push(`_…${entries.length - UNMATCHED_TABLE_LIMIT} more headings truncated._`);
  }
  return lines.join("\n");
}

function renderExcluded(matched: MatchedRow[]): string {
  const excluded = matched.filter((r) => r.match_kind === "excluded");
  const byHeading = new Map<string, { count: number; systems: Set<string> }>();
  for (const r of excluded) {
    const slot = byHeading.get(r.section_heading) ?? { count: 0, systems: new Set() };
    slot.count += 1;
    slot.systems.add(r.system);
    byHeading.set(r.section_heading, slot);
  }
  const entries = [...byHeading.entries()].sort((a, b) => b[1].count - a[1].count);
  const lines: string[] = [];
  lines.push("## Excluded Headings (recap)");
  lines.push(`_Headings the dictionary intentionally drops from the color role taxonomy._`);
  lines.push("");
  lines.push(tableRow(["heading", "rows", "systems"]));
  lines.push(tableRow(["---", "---:", "---:"]));
  for (const [heading, { count, systems }] of entries) {
    lines.push(tableRow([escapeCell(heading), String(count), `${systems.size}`]));
  }
  return lines.join("\n");
}

export function renderNormalizedReport(
  results: SystemResult[],
  matched: MatchedRow[],
  dict: RoleDictionary,
): string {
  const sections: string[] = [];
  sections.push("# Color Roles — Normalized Frequency (Pass 2)");
  sections.push("_Generated by `pnpm color-roles --pass=normalized`. Dictionary lives at `docs/research/color-role-dictionary.json` — edit and re-run to iterate._");
  sections.push(renderCoverage(matched, results.length));
  sections.push(renderDictionarySection(dict));
  sections.push(renderRoleFrequency(matched));
  sections.push(renderPerRoleSamples(matched));
  sections.push(renderUnmatched(matched));
  sections.push(renderExcluded(matched));
  return sections.join("\n\n").trim() + "\n";
}
