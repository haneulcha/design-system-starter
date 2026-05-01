// scripts/showcase.ts
//
// Generates an HTML preview page for each of the 5 mood archetypes plus a
// landing index.html. Output goes to output/showcase/ (gitignored).

import { generate } from "../src/generator/index.js";
import { getArchetype } from "../src/schema/archetypes.js";
import { renderShowcaseHtml, renderIndexHtml } from "./render-html.js";
import { writeFileSync, mkdirSync } from "node:fs";
import type { MoodArchetype } from "../src/schema/types.js";

const MOODS: MoodArchetype[] = [
  "clean-minimal",
  "warm-friendly",
  "bold-energetic",
  "professional",
  "playful-creative",
];

mkdirSync("output/showcase", { recursive: true });

const summaries = MOODS.map((mood) => {
  const archetype = getArchetype(mood);
  const result = generate({
    brandName: "Acme",
    primaryColor: "#5e6ad2",
    mood,
    fontFamily: archetype.defaultFont,
  });
  const html = renderShowcaseHtml(mood, archetype, result);
  writeFileSync(`output/showcase/${mood}.html`, html);
  console.log(`  ${mood}: ${html.length.toLocaleString()} chars`);
  return { mood, archetype, primary: "#5e6ad2" };
});

writeFileSync("output/showcase/index.html", renderIndexHtml(summaries));
console.log(`Generated ${MOODS.length + 1} showcase pages → output/showcase/`);
