import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { extractFromSystem } from "./color-roles/extract-items.js";
import { renderRawReport, renderRawCsv } from "./color-roles/render-raw.js";
import { classifyAll, validateDictionary } from "./color-roles/dictionary.js";
import { renderNormalizedReport } from "./color-roles/render-normalized.js";
import { buildSamples as buildNeutralSamples, profileAll as profileAllNeutrals } from "./color-roles/neutral-baseline.js";
import { renderNeutralBaselineReport } from "./color-roles/render-neutral-baseline.js";
import { buildSamples as buildAccentSamples, profileAll as profileAllAccents } from "./color-roles/accent-baseline.js";
import { renderAccentBaselineReport } from "./color-roles/render-accent-baseline.js";
import { buildAccentProfileMap, buildSemanticSamples } from "./color-roles/semantic-layer.js";
import { renderSemanticLayerReport } from "./color-roles/render-semantic-layer.js";
import type { SystemResult } from "./color-roles/types.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(HERE, "..", "..");
const RAW_DIR = join(PROJECT_ROOT, "data", "raw");
const OUT_DIR = join(PROJECT_ROOT, "docs", "research");

type Pass = "raw" | "normalized" | "neutral-baseline" | "accent-baseline" | "semantic-layer";
const PASSES: Pass[] = ["raw", "normalized", "neutral-baseline", "accent-baseline", "semantic-layer"];

function parsePass(argv: string[]): Pass {
  const arg = argv.find((a) => a.startsWith("--pass="));
  const value = arg?.split("=")[1];
  if (PASSES.includes(value as Pass)) return value as Pass;
  throw new Error(`usage: color-roles --pass=${PASSES.join("|")}`);
}

function readAllSystems(rawDir: string): SystemResult[] {
  const files = readdirSync(rawDir).filter((f) => f.endsWith(".md")).sort();
  return files.map((f) => {
    const md = readFileSync(join(rawDir, f), "utf-8");
    const system = basename(f, ".md");
    return extractFromSystem(system, md);
  });
}

function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

function runRawPass(): void {
  const results = readAllSystems(RAW_DIR);
  ensureDir(OUT_DIR);
  const mdPath = join(OUT_DIR, "color-roles-raw.md");
  const csvPath = join(OUT_DIR, "color-roles-raw.csv");
  writeFileSync(mdPath, renderRawReport(results), "utf-8");
  writeFileSync(csvPath, renderRawCsv(results), "utf-8");
  const totalRows = results.reduce((sum, r) => sum + r.rows.length, 0);
  console.log(`Pass 1 complete:`);
  console.log(`  ${results.length} systems → ${totalRows} bullet rows`);
  console.log(`  wrote ${mdPath}`);
  console.log(`  wrote ${csvPath}`);
}

function runNormalizedPass(): void {
  const dict = loadDictionary();
  const results = readAllSystems(RAW_DIR);
  const allRows = results.flatMap((r) => r.rows);
  const matched = classifyAll(allRows, dict);
  ensureDir(OUT_DIR);
  const mdPath = join(OUT_DIR, "color-roles-normalized.md");
  writeFileSync(mdPath, renderNormalizedReport(results, matched, dict), "utf-8");
  const matchedCount = matched.filter((r) => r.match_kind === "matched").length;
  const excludedCount = matched.filter((r) => r.match_kind === "excluded").length;
  const unmatchedCount = matched.filter((r) => r.match_kind === "unmatched").length;
  console.log(`Pass 2 complete:`);
  console.log(`  ${results.length} systems → ${allRows.length} rows`);
  console.log(`  matched: ${matchedCount}, excluded: ${excludedCount}, unmatched: ${unmatchedCount}`);
  console.log(`  wrote ${mdPath}`);
}

function loadDictionary(): ReturnType<typeof validateDictionary> {
  const dictPath = join(OUT_DIR, "color-role-dictionary.json");
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(dictPath, "utf-8"));
  } catch (e) {
    throw new Error(`failed to read ${dictPath}: ${(e as Error).message}`);
  }
  return validateDictionary(raw);
}

function runNeutralBaselinePass(): void {
  const dict = loadDictionary();
  const results = readAllSystems(RAW_DIR);
  const allRows = results.flatMap((r) => r.rows);
  const matched = classifyAll(allRows, dict);
  const samplesBySystem = buildNeutralSamples(matched);
  const profiles = profileAllNeutrals(samplesBySystem, results.map((r) => r.system));
  ensureDir(OUT_DIR);
  const mdPath = join(OUT_DIR, "neutral-baseline.md");
  writeFileSync(mdPath, renderNeutralBaselineReport(profiles), "utf-8");
  const explicit = profiles.filter((p) => p.source === "explicit").length;
  const implicit = profiles.filter((p) => p.source === "implicit").length;
  const none = profiles.filter((p) => p.source === "none").length;
  console.log(`Track B (neutral baseline) complete:`);
  console.log(`  ${profiles.length} systems → explicit: ${explicit}, implicit: ${implicit}, none: ${none}`);
  console.log(`  wrote ${mdPath}`);
}

function runAccentBaselinePass(): void {
  const dict = loadDictionary();
  const results = readAllSystems(RAW_DIR);
  const allRows = results.flatMap((r) => r.rows);
  const matched = classifyAll(allRows, dict);
  const samplesBySystem = buildAccentSamples(matched);
  const profiles = profileAllAccents(samplesBySystem, results.map((r) => r.system));
  ensureDir(OUT_DIR);
  const mdPath = join(OUT_DIR, "accent-baseline.md");
  writeFileSync(mdPath, renderAccentBaselineReport(profiles), "utf-8");
  const single = profiles.filter((p) => p.primary && !p.multi_hue).length;
  const multi = profiles.filter((p) => p.multi_hue).length;
  const mono = profiles.filter((p) => p.has_no_chromatic_samples).length;
  console.log(`Track A (accent baseline) complete:`);
  console.log(`  ${profiles.length} systems → single-hue: ${single}, multi-hue: ${multi}, monochrome: ${mono}`);
  console.log(`  wrote ${mdPath}`);
}

function runSemanticLayerPass(): void {
  const dict = loadDictionary();
  const results = readAllSystems(RAW_DIR);
  const allRows = results.flatMap((r) => r.rows);
  const matched = classifyAll(allRows, dict);
  const accentMap = buildAccentProfileMap(matched, results.map((r) => r.system));
  const samples = buildSemanticSamples(matched, accentMap);
  ensureDir(OUT_DIR);
  const mdPath = join(OUT_DIR, "semantic-layer.md");
  writeFileSync(mdPath, renderSemanticLayerReport(samples), "utf-8");
  const counts = { surface: 0, text: 0, semantic: 0 };
  for (const s of samples) counts[s.role] += 1;
  console.log(`Track S (semantic layer) complete:`);
  console.log(`  surface: ${counts.surface} rows, text: ${counts.text} rows, semantic: ${counts.semantic} rows`);
  console.log(`  wrote ${mdPath}`);
}

const pass = parsePass(process.argv.slice(2));
if (pass === "raw") runRawPass();
else if (pass === "normalized") runNormalizedPass();
else if (pass === "neutral-baseline") runNeutralBaselinePass();
else if (pass === "accent-baseline") runAccentBaselinePass();
else runSemanticLayerPass();
