import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import type { ExtractedRecord } from "./types.js";
import { parseBtnRadius, parseCardRadius } from "./parsers/numeric.js";
import {
  parseHeadingWeight,
  parseBodyLineHeight,
  parseHeadingLetterSpacing,
} from "./parsers/typography.js";
import { parseShadowIntensity, parseBtnShape } from "./parsers/categorical.js";
import { parseBrandOklch, parseGrayChroma, parseAccentOffset } from "./parsers/color.js";
import { parseDarkModePresent } from "./parsers/modes.js";
import { detectFormat } from "./parsers/format.js";
import { extractFromYaml } from "./parsers/yaml-extract.js";

function extractMarkdown(system: string, md: string): ExtractedRecord {
  const brand = parseBrandOklch(md);
  return {
    system,
    btn_radius: parseBtnRadius(md),
    card_radius: parseCardRadius(md),
    heading_weight: parseHeadingWeight(md),
    body_line_height: parseBodyLineHeight(md),
    heading_letter_spacing: parseHeadingLetterSpacing(md),
    shadow_intensity: parseShadowIntensity(md),
    btn_shape: parseBtnShape(md),
    brand_l: brand?.l ?? null,
    brand_c: brand?.c ?? null,
    brand_h: brand?.h ?? null,
    dark_mode_present: parseDarkModePresent(md),
    gray_chroma: parseGrayChroma(md),
    accent_offset: parseAccentOffset(md),
  };
}

function emptyRecord(system: string): ExtractedRecord {
  return {
    system,
    btn_radius: null, card_radius: null, heading_weight: null,
    body_line_height: null, heading_letter_spacing: null,
    shadow_intensity: null, btn_shape: null,
    brand_l: null, brand_c: null, brand_h: null,
    dark_mode_present: null, gray_chroma: null, accent_offset: null,
  };
}

export function extractOne(system: string, md: string): ExtractedRecord {
  const format = detectFormat(md);
  if (format === "yaml") {
    return extractFromYaml(system, md) ?? emptyRecord(system);
  }
  return extractMarkdown(system, md);
}

export function extractAll(rawDir: string): ExtractedRecord[] {
  const files = readdirSync(rawDir).filter((f) => f.endsWith(".md"));
  return files.map((f) => {
    const md = readFileSync(join(rawDir, f), "utf-8");
    const system = basename(f, ".md");
    return extractOne(system, md);
  });
}

function reportFailureRates(records: ExtractedRecord[]): void {
  const keys = Object.keys(records[0] ?? {}).filter((k) => k !== "system") as Array<keyof ExtractedRecord>;
  console.log(`\nExtraction failure rate per variable (n=${records.length}):`);
  for (const k of keys) {
    const nullCount = records.filter((r) => r[k] === null).length;
    const pct = ((nullCount / records.length) * 100).toFixed(1);
    console.log(`  ${k.padEnd(24)} ${nullCount}/${records.length} (${pct}%)`);
  }
}

function main(): void {
  const RAW = "data/raw";
  const OUT = "data/extracted.json";
  if (!existsSync(RAW)) {
    console.error(`${RAW} not found — run scripts/analysis/fetch.ts first.`);
    process.exit(1);
  }
  const records = extractAll(RAW);
  mkdirSync("data", { recursive: true });
  writeFileSync(OUT, JSON.stringify(records, null, 2));
  console.log(`Wrote ${records.length} records to ${OUT}`);
  reportFailureRates(records);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
