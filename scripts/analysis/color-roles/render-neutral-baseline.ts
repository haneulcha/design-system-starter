import {
  corpusStats,
  corpusStatsBySource,
  IMPLICIT_CHROMA_MAX,
  type CorpusNeutralStats,
  type CorpusStat,
  type SystemNeutralProfile,
  type Tint,
} from "./neutral-baseline.js";

function fmt(n: number, decimals = 3): string {
  return n.toFixed(decimals);
}

function fmtStat(s: CorpusStat, decimals = 3): string {
  return `median=${fmt(s.median, decimals)}, IQR=[${fmt(s.q1, decimals)}, ${fmt(s.q3, decimals)}], range=[${fmt(s.min, decimals)}, ${fmt(s.max, decimals)}]`;
}

function tableRow(cells: string[]): string {
  return "| " + cells.join(" | ") + " |";
}

function escapeCell(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function renderSummary(profiles: SystemNeutralProfile[]): string {
  const stats = corpusStats(profiles);
  const tintBlocks: string[] = [];
  const tintOrder: Tint[] = ["achromatic", "warm", "cool", "green", "purple"];
  for (const t of tintOrder) {
    const count = stats.tint_distribution[t];
    tintBlocks.push(`${t}: ${count}`);
  }
  const lines: string[] = [];
  lines.push("## Corpus Summary");
  lines.push(`- ${stats.systems_total} systems total`);
  lines.push(`- explicit neutral section: ${stats.systems_with_explicit}`);
  lines.push(`- implicit reconstruction (low-chroma surface/text, c ≤ ${IMPLICIT_CHROMA_MAX}): ${stats.systems_with_implicit_only}`);
  lines.push(`- no neutrals derivable: ${stats.systems_with_none}`);
  lines.push("");
  lines.push(`**Stop count** — ${fmtStat(stats.stop_count, 0)}`);
  lines.push(`**L_min** — ${fmtStat(stats.l_min)}`);
  lines.push(`**L_max** — ${fmtStat(stats.l_max)}`);
  lines.push(`**L range (max−min)** — ${fmtStat(stats.l_range)}`);
  lines.push(`**C_max** — ${fmtStat(stats.c_max, 4)}`);
  lines.push(`**Tint distribution** — ${tintBlocks.join(", ")}`);
  return lines.join("\n");
}

function renderSourceComparison(profiles: SystemNeutralProfile[]): string {
  const explicit = corpusStatsBySource(profiles, "explicit");
  const implicit = corpusStatsBySource(profiles, "implicit");
  const lines: string[] = [];
  lines.push("## Explicit vs Implicit (sanity check)");
  lines.push("_If these distributions diverge wildly, the implicit reconstruction is unreliable and the corpus signal for the 39 implicit systems should be discounted._");
  lines.push("");
  lines.push(tableRow(["metric", `explicit (n=${explicit.systems_total})`, `implicit (n=${implicit.systems_total})`]));
  lines.push(tableRow(["---", "---", "---"]));
  lines.push(tableRow(["stop count", fmtStat(explicit.stop_count, 0), fmtStat(implicit.stop_count, 0)]));
  lines.push(tableRow(["L_min", fmtStat(explicit.l_min), fmtStat(implicit.l_min)]));
  lines.push(tableRow(["L_max", fmtStat(explicit.l_max), fmtStat(implicit.l_max)]));
  lines.push(tableRow(["L range", fmtStat(explicit.l_range), fmtStat(implicit.l_range)]));
  lines.push(tableRow(["C_max", fmtStat(explicit.c_max, 4), fmtStat(implicit.c_max, 4)]));
  return lines.join("\n");
}

function renderPerSystemTable(profiles: SystemNeutralProfile[]): string {
  const lines: string[] = [];
  lines.push("## Per-System Profiles");
  lines.push("");
  lines.push(tableRow(["system", "source", "stops", "L_min", "L_max", "L_range", "C_max", "tint", "H@C_max"]));
  lines.push(tableRow(["---", "---", "---:", "---:", "---:", "---:", "---:", "---", "---:"]));
  const sorted = [...profiles].sort((a, b) => {
    if (a.source === b.source) return a.system.localeCompare(b.system);
    const order: Record<string, number> = { explicit: 0, implicit: 1, none: 2 };
    return order[a.source] - order[b.source];
  });
  for (const p of sorted) {
    if (p.source === "none") {
      lines.push(tableRow([escapeCell(p.system), p.source, "0", "—", "—", "—", "—", "—", "—"]));
      continue;
    }
    lines.push(tableRow([
      escapeCell(p.system),
      p.source,
      String(p.stop_count),
      fmt(p.l_min),
      fmt(p.l_max),
      fmt(p.l_max - p.l_min),
      fmt(p.c_max, 4),
      p.tint,
      p.h_at_c_max === null ? "—" : fmt(p.h_at_c_max, 0),
    ]));
  }
  return lines.join("\n");
}

function renderRecommendation(profiles: SystemNeutralProfile[]): string {
  const stats = corpusStats(profiles);
  const lines: string[] = [];
  lines.push("## Suggested Starter Baseline");
  lines.push("_A reading of the corpus medians, not a final decision. Each line below is a knob the user can lock or expose._");
  lines.push("");
  lines.push(`- **Stop count**: median ${fmt(stats.stop_count.median, 0)} (IQR ${fmt(stats.stop_count.q1, 0)}–${fmt(stats.stop_count.q3, 0)})`);
  lines.push(`  - Functional knob candidates: \`few\` (~${fmt(stats.stop_count.q1, 0)}), \`standard\` (~${fmt(stats.stop_count.median, 0)}), \`rich\` (~${fmt(stats.stop_count.q3, 0)})`);
  lines.push(`- **L floor (darkest)**: median ${fmt(stats.l_min.median)} (IQR ${fmt(stats.l_min.q1)}–${fmt(stats.l_min.q3)})`);
  lines.push(`- **L ceiling (lightest)**: median ${fmt(stats.l_max.median)} (IQR ${fmt(stats.l_max.q1)}–${fmt(stats.l_max.q3)})`);
  lines.push(`- **Chroma**: C_max median ${fmt(stats.c_max.median, 4)} → starter default = pure achromatic (C=0). Tint variants (warm/cool) are an opt-in knob.`);
  const tintTotal = Object.values(stats.tint_distribution).reduce((a, b) => a + b, 0);
  if (tintTotal > 0) {
    const ach = stats.tint_distribution.achromatic;
    lines.push(`- **Tint share**: achromatic ${ach}/${tintTotal} = ${Math.round((ach / tintTotal) * 100)}% — pure gray is the modal choice.`);
  }
  return lines.join("\n");
}

export function renderNeutralBaselineReport(profiles: SystemNeutralProfile[]): string {
  const sections: string[] = [];
  sections.push("# Neutral Baseline (Track B)");
  sections.push("_Generated by `pnpm color-roles --pass=neutral-baseline`. Source: rows tagged `neutral` in Pass 2 (explicit), or low-chroma `surface`/`text` rows reconstructed for systems without an explicit neutral section (implicit)._");
  sections.push(renderSummary(profiles));
  sections.push(renderSourceComparison(profiles));
  sections.push(renderRecommendation(profiles));
  sections.push(renderPerSystemTable(profiles));
  return sections.join("\n\n").trim() + "\n";
}
