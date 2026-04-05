#!/usr/bin/env node
import { input, select } from "@inquirer/prompts";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { generate } from "../generator/index.js";
import { getArchetype, ARCHETYPES } from "../schema/archetypes.js";
import { transformToFigma } from "../figma/transformer.js";
import type { MoodArchetype } from "../schema/types.js";

async function main() {
  console.log("\n  Design System Starter\n");
  console.log("  Answer 4 questions to generate a complete design system.\n");

  const brandName = await input({
    message: "Brand name:",
    validate: (v) => v.trim().length > 0 || "Brand name is required",
  });

  const primaryColor = await input({
    message: "Primary brand color (hex):",
    default: "#5e6ad2",
    validate: (v) =>
      /^#[0-9a-fA-F]{6}$/.test(v.trim()) || "Enter a valid hex (e.g. #5e6ad2)",
  });

  const mood = await select<MoodArchetype>({
    message: "Design mood:",
    choices: (Object.values(ARCHETYPES) as { mood: MoodArchetype; label: string; description: string }[]).map((a) => ({
      value: a.mood,
      name: `${a.label} — ${a.description}`,
    })),
  });

  const archetype = getArchetype(mood);
  const fontChoice = await select({
    message: "Primary font:",
    choices: [
      ...archetype.suggestedFonts.map((f) => ({
        value: f.name,
        name: `${f.name} (${f.fallback})`,
      })),
      { value: "__custom__", name: "Custom (type your own)" },
    ],
  });

  const resolvedFont =
    fontChoice === "__custom__"
      ? await input({ message: "Font family name:" })
      : fontChoice;

  console.log("\n  Generating...\n");

  const result = generate({
    brandName: brandName.trim(),
    primaryColor: primaryColor.trim(),
    mood,
    fontFamily: resolvedFont,
  });

  const figmaData = transformToFigma(result.tokens);

  const outDir = join(process.cwd(), "output");
  mkdirSync(outDir, { recursive: true });

  writeFileSync(join(outDir, "DESIGN.md"), result.designMd, "utf-8");
  writeFileSync(
    join(outDir, "design-tokens.json"),
    JSON.stringify(result.tokens, null, 2),
    "utf-8"
  );
  writeFileSync(
    join(outDir, "figma-system.json"),
    JSON.stringify(figmaData, null, 2),
    "utf-8"
  );

  console.log("  Generated:");
  console.log("    output/DESIGN.md            Design system definition");
  console.log("    output/design-tokens.json   Universal design tokens");
  console.log("    output/figma-system.json    Figma MCP-ready structure");
  console.log("");
  console.log("  Next steps:");
  console.log("    1. Review and customize output/DESIGN.md");
  console.log("    2. Use figma-system.json with Figma MCP to create Figma variables");
  console.log("    3. Copy DESIGN.md into your project for AI-assisted development");
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
