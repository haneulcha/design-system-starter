import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { extractFromSystem } from "./type-styles/extract-styles.js";
import { renderRawReport, renderRawCsv } from "./type-styles/render-raw.js";
import { validateDictionary, classifyAll } from "./type-styles/dictionary.js";
import { renderNormalizedReport } from "./type-styles/render-normalized.js";
import type { SystemResult } from "./type-styles/types.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(HERE, "..", "..");
const RAW_DIR = join(PROJECT_ROOT, "data", "raw");
const OUT_DIR = join(PROJECT_ROOT, "docs", "research");
const DICT_PATH = join(OUT_DIR, "type-style-dictionary.json");

type Pass = "raw" | "normalized";
const PASSES: Pass[] = ["raw", "normalized"];

function parsePass(argv: string[]): Pass {
  const arg = argv.find((a) => a.startsWith("--pass="));
  const value = arg?.split("=")[1];
  if (PASSES.includes(value as Pass)) return value as Pass;
  throw new Error(`usage: type-styles --pass=${PASSES.join("|")}`);
}

function loadAllSystems(): SystemResult[] {
  const files = readdirSync(RAW_DIR).filter((f) => f.endsWith(".md"));
  return files.map((f) => {
    const md = readFileSync(join(RAW_DIR, f), "utf-8");
    return extractFromSystem(f.replace(/\.md$/, ""), md);
  });
}

function main(): void {
  const pass = parsePass(process.argv.slice(2));
  mkdirSync(OUT_DIR, { recursive: true });
  const results = loadAllSystems();

  if (pass === "raw") {
    writeFileSync(join(OUT_DIR, "type-styles-raw.md"), renderRawReport(results));
    writeFileSync(join(OUT_DIR, "type-styles-raw.csv"), renderRawCsv(results));
    const totalRows = results.reduce((n, r) => n + r.rows.length, 0);
    console.log(`type-styles --pass=raw: ${results.length} systems, ${totalRows} rows extracted`);
  } else if (pass === "normalized") {
    const dictRaw = JSON.parse(readFileSync(DICT_PATH, "utf-8"));
    const dict = validateDictionary(dictRaw);
    const allRows = results.flatMap((r) => r.rows);
    const normalized = classifyAll(allRows, dict);
    writeFileSync(join(OUT_DIR, "type-styles-normalized.md"), renderNormalizedReport(normalized));
    const matched = normalized.filter((r) => r.matchStatus === "matched").length;
    const total = normalized.length;
    const pct = Math.round((matched / total) * 100);
    console.log(`type-styles --pass=normalized: ${matched}/${total} matched (${pct}%)`);
  }
}

main();
