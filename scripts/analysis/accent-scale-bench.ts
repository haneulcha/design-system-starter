// scripts/analysis/accent-scale-bench.ts
//
// pnpm accent-scale-bench → docs/research/accent-scale-bench-report.md 재생성.

import { readFileSync, writeFileSync } from "node:fs";
import {
  benchAll,
  renderReport,
  type ReferenceSet,
} from "../../src/lab/palette/bench.js";
import { ALGORITHMS } from "../../src/lab/palette/index.js";

const refSets: ReferenceSet[] = [
  JSON.parse(readFileSync("data/references/tailwind-v4.json", "utf8")),
  JSON.parse(readFileSync("data/references/radix-light.json", "utf8")),
];

const results = benchAll(ALGORITHMS, refSets);
const md = renderReport(results, ALGORITHMS, refSets);
writeFileSync("docs/research/accent-scale-bench-report.md", md);
console.log(
  `wrote docs/research/accent-scale-bench-report.md (${results.length} palette runs, ${ALGORITHMS.length} algorithms)`,
);
