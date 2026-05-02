import {
  frequencyByRawRole,
  frequencyBySize,
  frequencyByWeight,
} from "./frequency.js";
import type { FrequencyEntry, SystemResult } from "./types.js";

const FREQ_TOP_N = 50;

function tableRow(cells: string[]): string {
  return "| " + cells.join(" | ") + " |";
}

function escapeCell(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function renderFrequencyTable(title: string, entries: FrequencyEntry[]): string {
  const lines: string[] = [];
  lines.push(`## ${title}`);
  lines.push("");
  if (entries.length === 0) {
    lines.push("(no entries)");
    return lines.join("\n");
  }
  lines.push(tableRow(["key", "count", "systems_present", "example_systems"]));
  lines.push(tableRow(["---", "---:", "---:", "---"]));
  for (const e of entries.slice(0, FREQ_TOP_N)) {
    const examples =
      e.systems.slice(0, 5).join(", ") + (e.systems.length > 5 ? ", …" : "");
    lines.push(
      tableRow([escapeCell(e.key), String(e.count), String(e.systems.length), escapeCell(examples)]),
    );
  }
  if (entries.length > FREQ_TOP_N) {
    lines.push("");
    lines.push(`_…${entries.length - FREQ_TOP_N} more keys truncated. See CSV for full data._`);
  }
  return lines.join("\n");
}

export function renderRawReport(results: SystemResult[]): string {
  const allRows = results.flatMap((r) => r.rows);
  const totalSystems = results.length;
  const withSection = results.filter((r) => r.hasTypographySection).length;
  const missing = results.filter((r) => !r.hasTypographySection).map((r) => r.system);

  const sections: string[] = [];
  sections.push("# Typography — Raw Pass 1");
  sections.push("");
  sections.push(`${totalSystems} systems · ${withSection} with Typography section · ${allRows.length} extracted style rows.`);
  sections.push("");
  if (missing.length > 0) {
    sections.push("**Systems missing a Typography section:** " + missing.join(", "));
    sections.push("");
  }

  sections.push(renderFrequencyTable("Raw role frequency", frequencyByRawRole(allRows)));
  sections.push("");
  sections.push(renderFrequencyTable("Size frequency", frequencyBySize(allRows)));
  sections.push("");
  sections.push(renderFrequencyTable("Weight frequency", frequencyByWeight(allRows)));

  return sections.join("\n");
}

const CSV_HEADERS = [
  "system",
  "rawRole",
  "font",
  "sizePx",
  "weight",
  "weightRange",
  "lineHeight",
  "lineHeightRange",
  "letterSpacingPx",
  "letterSpacingRange",
  "uppercase",
  "features",
  "notes",
  "rowIndex",
];

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = Array.isArray(value)
    ? value.join("|")
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function renderRawCsv(results: SystemResult[]): string {
  const rows: string[] = [CSV_HEADERS.join(",")];
  for (const result of results) {
    for (const r of result.rows) {
      rows.push(
        [
          r.system,
          r.rawRole,
          r.font,
          r.sizePx,
          r.weight,
          r.weightRange ? r.weightRange.join("-") : null,
          r.lineHeight,
          r.lineHeightRange ? r.lineHeightRange.join("-") : null,
          r.letterSpacingPx,
          r.letterSpacingRange ? r.letterSpacingRange.join("-") : null,
          r.uppercase ?? "",
          r.features,
          r.notes,
          r.rowIndex,
        ]
          .map(csvCell)
          .join(","),
      );
    }
  }
  return rows.join("\n");
}
