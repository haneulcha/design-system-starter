import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { extractFromSystem } from "./type-styles/extract-styles.js";
import { renderRawReport, renderRawCsv } from "./type-styles/render-raw.js";
import type { SystemResult } from "./type-styles/types.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(HERE, "..", "..");
const RAW_DIR = join(PROJECT_ROOT, "data", "raw");
const OUT_DIR = join(PROJECT_ROOT, "docs", "research");

type Pass = "raw";
const PASSES: Pass[] = ["raw"];

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
  }
}

main();
