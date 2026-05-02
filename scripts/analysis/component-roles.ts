import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { detectFormat } from "./parsers/format.js";
import { extractYamlComponents } from "./component-roles/extract-yaml.js";
import { extractMarkdownComponents } from "./component-roles/extract-markdown.js";
import { renderMarkdown, renderCsv, tallyByGroup } from "./component-roles/render-raw.js";
import type { RawComponentRow } from "./component-roles/types.js";

export function extractAllComponentRows(rawDir: string): RawComponentRow[] {
  const files = readdirSync(rawDir).filter((f) => f.endsWith(".md"));
  const rows: RawComponentRow[] = [];
  for (const f of files) {
    const md = readFileSync(join(rawDir, f), "utf-8");
    const system = basename(f, ".md");
    const format = detectFormat(md);
    const sysRows = format === "yaml"
      ? extractYamlComponents(system, md)
      : extractMarkdownComponents(system, md);
    rows.push(...sysRows);
  }
  return rows;
}

function main(): void {
  const args = process.argv.slice(2);
  const passArg = args.find((a) => a.startsWith("--pass="));
  const pass = passArg ? passArg.slice("--pass=".length) : "raw";
  if (pass !== "raw") {
    console.error(`Phase B (--pass=normalized) not yet implemented.`);
    process.exit(1);
  }
  const RAW = "data/raw";
  const OUT_DIR = "docs/research";
  if (!existsSync(RAW)) {
    console.error(`${RAW} not found.`);
    process.exit(1);
  }
  const rows = extractAllComponentRows(RAW);
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, "component-roles-raw.md"), renderMarkdown(rows));
  writeFileSync(join(OUT_DIR, "component-roles-raw.csv"), renderCsv(rows));
  const tallies = tallyByGroup(rows);
  const totalSystems = new Set(rows.map((r) => r.system)).size;
  console.log(`Wrote ${rows.length} component rows across ${totalSystems} systems.`);
  console.log(`Top groups by system-count:`);
  for (const t of tallies.slice(0, 15)) {
    console.log(`  ${t.group.padEnd(24)} systems=${t.systemCount}  rows=${t.rowCount}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
