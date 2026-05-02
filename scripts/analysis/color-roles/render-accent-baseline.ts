import {
  corpusStats,
  type CorpusAccentStats,
  type CorpusStat,
  type HueFamily,
  type SystemAccentProfile,
} from "./accent-baseline.js";

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

const FAMILY_ORDER: HueFamily[] = [
  "red", "orange", "yellow", "green", "cyan", "blue", "purple", "magenta", "achromatic",
];

function renderSummary(stats: CorpusAccentStats): string {
  const lines: string[] = [];
  lines.push("## Corpus Summary");
  lines.push(`- ${stats.systems_total} systems total`);
  lines.push(`- single-hue accents: ${stats.systems_single_hue}`);
  lines.push(`- multi-hue accents: ${stats.systems_multi_hue}`);
  lines.push(`- no chromatic accent (monochrome): ${stats.systems_no_chromatic}`);
  lines.push("");
  lines.push(`**Total stops per system** — ${fmtStat(stats.total_stops, 0)}`);
  lines.push(`**Primary hue C_max** — ${fmtStat(stats.primary_c_max, 4)}`);
  lines.push(`**Primary hue L_min** — ${fmtStat(stats.primary_l_min)}`);
  lines.push(`**Primary hue L_max** — ${fmtStat(stats.primary_l_max)}`);
  return lines.join("\n");
}

function renderHueFamilyTable(stats: CorpusAccentStats): string {
  const total = Object.values(stats.hue_family_distribution).reduce((a, b) => a + b, 0);
  const lines: string[] = [];
  lines.push("## Primary Hue Family Distribution");
  lines.push("_Each system contributes its primary (largest) hue cluster to one bucket._");
  lines.push("");
  lines.push(tableRow(["family", "systems", "share", "h-range"]));
  lines.push(tableRow(["---", "---:", "---:", "---"]));
  const ranges: Record<HueFamily, string> = {
    red: "350–20°", orange: "20–50°", yellow: "50–80°", green: "80–160°",
    cyan: "160–200°", blue: "200–260°", purple: "260–310°", magenta: "310–350°",
    achromatic: "—",
  };
  for (const family of FAMILY_ORDER) {
    const count = stats.hue_family_distribution[family];
    if (count === 0 && family === "achromatic") continue;
    const share = total > 0 ? `${Math.round((count / total) * 100)}%` : "—";
    lines.push(tableRow([family, String(count), share, ranges[family]]));
  }
  return lines.join("\n");
}

function renderRecommendation(stats: CorpusAccentStats): string {
  const lines: string[] = [];
  lines.push("## Suggested Starter Baseline");
  lines.push("_A reading of the corpus, not a final decision._");
  lines.push("");
  lines.push(`- **Stop count per accent**: median ${fmt(stats.total_stops.median, 0)} (IQR ${fmt(stats.total_stops.q1, 0)}–${fmt(stats.total_stops.q3, 0)})`);
  lines.push(`  - Functional knob candidates: \`few\` (~${fmt(stats.total_stops.q1, 0)}), \`standard\` (~${fmt(stats.total_stops.median, 0)}), \`rich\` (~${fmt(stats.total_stops.q3, 0)})`);
  lines.push(`- **Saturation (C_max)**: median ${fmt(stats.primary_c_max.median, 4)} — corpus accents are ${stats.primary_c_max.median > 0.15 ? "strongly saturated" : stats.primary_c_max.median > 0.08 ? "moderately saturated" : "muted"}`);
  lines.push(`- **L spread of primary hue**: ${fmt(stats.primary_l_min.median)} → ${fmt(stats.primary_l_max.median)} — typical accent palette covers a range from dark to light tints around the brand hue`);
  const total = stats.systems_single_hue + stats.systems_multi_hue;
  if (total > 0) {
    const single = stats.systems_single_hue;
    lines.push(`- **Single vs multi-hue**: ${single}/${total} = ${Math.round((single / total) * 100)}% are single-hue → starter default = single brand hue + scale; multi-hue (sub-brands, accent-secondary) is a knob for advanced users.`);
  }
  return lines.join("\n");
}

function renderPerSystemTable(profiles: SystemAccentProfile[]): string {
  const lines: string[] = [];
  lines.push("## Per-System Profiles");
  lines.push("");
  lines.push(tableRow(["system", "stops", "primary_h", "family", "primary_c_max", "primary_l_range", "multi_hue?", "secondary_count"]));
  lines.push(tableRow(["---", "---:", "---:", "---", "---:", "---", "---", "---:"]));
  const sorted = [...profiles].sort((a, b) => a.system.localeCompare(b.system));
  for (const p of sorted) {
    if (!p.primary) {
      lines.push(tableRow([
        escapeCell(p.system),
        String(p.total_stops),
        "—", "—", "—", "—",
        p.has_no_chromatic_samples ? "(monochrome)" : "—",
        "—",
      ]));
      continue;
    }
    const c = p.primary;
    lines.push(tableRow([
      escapeCell(p.system),
      String(p.total_stops),
      fmt(c.primary_h, 0),
      c.family,
      fmt(c.c_max, 4),
      `${fmt(c.l_min)}–${fmt(c.l_max)}`,
      p.multi_hue ? "yes" : "no",
      String(p.secondary_clusters.length),
    ]));
  }
  return lines.join("\n");
}

function renderMultiHueDetail(profiles: SystemAccentProfile[]): string {
  const multi = profiles.filter((p) => p.multi_hue);
  if (multi.length === 0) return "";
  const lines: string[] = [];
  lines.push("## Multi-Hue Systems (detail)");
  lines.push(`_${multi.length} systems have ≥2 distinct accent hue clusters. Inspecting these helps decide if the starter should expose a 'secondary accent' knob._`);
  lines.push("");
  for (const p of multi) {
    if (!p.primary) continue;
    const all = [p.primary, ...p.secondary_clusters];
    const desc = all
      .map((c) => `${c.family}@h${fmt(c.primary_h, 0)} (×${c.stop_count})`)
      .join(", ");
    lines.push(`- **${p.system}**: ${desc}`);
  }
  return lines.join("\n");
}

export function renderAccentBaselineReport(profiles: SystemAccentProfile[]): string {
  const stats = corpusStats(profiles);
  const sections: string[] = [];
  sections.push("# Accent Baseline (Track A)");
  sections.push("_Generated by `pnpm color-roles --pass=accent-baseline`. Source: rows tagged `accent` in Pass 2 across all 58 systems._");
  sections.push(renderSummary(stats));
  sections.push(renderHueFamilyTable(stats));
  sections.push(renderRecommendation(stats));
  const multi = renderMultiHueDetail(profiles);
  if (multi) sections.push(multi);
  sections.push(renderPerSystemTable(profiles));
  return sections.join("\n\n").trim() + "\n";
}
