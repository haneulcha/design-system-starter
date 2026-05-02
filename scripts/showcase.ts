// scripts/showcase.ts
//
// Generates an HTML preview page for each of the 5 archetype presets plus a
// landing index.html. Output goes to output/showcase/ (gitignored).

import { generate } from "../src/generator/index.js";
import { getArchetype } from "../src/schema/archetypes.js";
import { renderShowcaseHtml, renderIndexHtml } from "./render-html.js";
import { writeFileSync, mkdirSync } from "node:fs";
import type { PresetName } from "../src/schema/presets.js";

const PRESET_KEYS: PresetName[] = [
  "clean-minimal",
  "warm-friendly",
  "bold-energetic",
  "professional",
  "playful-creative",
];

mkdirSync("output/showcase", { recursive: true });

const summaries = PRESET_KEYS.map((preset) => {
  const archetype = getArchetype(preset);
  const result = generate(
    {
      brandName: "Acme",
      brandColor: "#5e6ad2",
      fontFamily: "Inter",
    },
    archetype,
  );
  const html = renderShowcaseHtml(preset, archetype, result);
  writeFileSync(`output/showcase/${preset}.html`, html);
  console.log(`  ${preset}: ${html.length.toLocaleString()} chars`);
  return { preset, archetype, primary: "#5e6ad2" };
});

writeFileSync("output/showcase/index.html", renderIndexHtml(summaries));
console.log(`Generated ${PRESET_KEYS.length + 1} showcase pages → output/showcase/`);
