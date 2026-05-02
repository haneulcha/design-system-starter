// scripts/corpus-showcase.ts
//
// Entry point: reads the extracted corpus JSON, renders the bucket
// showcase HTML, and writes a single self-contained file to
// output/showcase/corpus.html.
//
// Run: pnpm tsx scripts/corpus-showcase.ts

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { renderCorpusHtml, type CorpusRecord } from "./render-corpus-html.js";

// The spec references docs/research/notebooks/extracted-2026-05-01.json,
// but the actual extracted corpus lives at data/extracted.json. Try both.
const CANDIDATE_PATHS = [
  "docs/research/notebooks/extracted-2026-05-01.json",
  "data/extracted.json",
];

function loadCorpus(): CorpusRecord[] {
  for (const rel of CANDIDATE_PATHS) {
    const abs = resolve(process.cwd(), rel);
    if (existsSync(abs)) {
      const raw = readFileSync(abs, "utf8");
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        throw new Error(`Expected an array at ${rel}, got ${typeof parsed}`);
      }
      console.log(`Loaded ${parsed.length} records from ${rel}`);
      return parsed as CorpusRecord[];
    }
  }
  throw new Error(
    `No corpus file found. Looked at:\n  - ${CANDIDATE_PATHS.join("\n  - ")}`,
  );
}

function main(): void {
  const records = loadCorpus();
  const html = renderCorpusHtml(records);
  mkdirSync("output/showcase", { recursive: true });
  const outPath = "output/showcase/corpus.html";
  writeFileSync(outPath, html);
  const sizeKb = (html.length / 1024).toFixed(1);
  console.log(`Wrote ${outPath} (size: ${sizeKb} KB)`);
}

main();
