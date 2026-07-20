#!/usr/bin/env node
import { input, select } from "@inquirer/prompts";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { generate } from "../generator/index.js";
import { transformToFigma } from "../figma/transformer.js";
import type { HeadingStyle } from "../schema/typography.js";
import { PRESET_NAMES, type PresetName } from "../schema/presets.js";

async function main() {
  console.log("\n  Design System Starter\n");
  console.log(
    "  Answer a few questions to generate a complete design system.\n",
  );

  const brandName = await input({
    message: "Brand name:",
    validate: (v) => v.trim().length > 0 || "Brand name is required",
  });

  const preset = await select<PresetName>({
    message: "Archetype (anchors the color palette):",
    choices: PRESET_NAMES.map((name) => ({ value: name, name })),
    default: "professional",
  });

  const sansRaw = await input({
    message: "Sans font (optional, leave blank for default):",
    default: "",
  });

  const monoRaw = await input({
    message: "Mono font (optional, leave blank for default):",
    default: "",
  });

  const headingStyle = await select<HeadingStyle>({
    message: "Heading style:",
    choices: [
      { value: "default", name: "Default (medium weight)" },
      { value: "flat", name: "Flat (regular weight, editorial)" },
      { value: "bold", name: "Bold (heavy weight, impactful)" },
    ],
    default: "default",
  });

  const sans = sansRaw.trim() || undefined;
  const mono = monoRaw.trim() || undefined;

  console.log("\n  Generating...\n");

  const result = generate({
    brandName: brandName.trim(),
    preset,
    fontFamily: sans ?? "Inter",
    typographyKnobs: {
      fontFamily: { sans, mono },
      headingStyle,
    },
  });

  const figmaData = transformToFigma(result.tokens);

  const outDir = join(process.cwd(), "output");
  mkdirSync(outDir, { recursive: true });

  writeFileSync(join(outDir, "DESIGN.md"), result.designMd, "utf-8");
  writeFileSync(join(outDir, "design-tokens.css"), result.cssVariables, "utf-8");
  writeFileSync(join(outDir, "tailwind.config.js"), result.tailwindConfig, "utf-8");
  writeFileSync(
    join(outDir, "figma-system.json"),
    JSON.stringify(figmaData, null, 2),
    "utf-8"
  );

  console.log("  Generated:");
  console.log("    output/DESIGN.md            Design system definition (AI-ready spec)");
  console.log("    output/design-tokens.css    CSS variables (light + dark)");
  console.log("    output/tailwind.config.js   Tailwind preset (references the CSS vars)");
  console.log("    output/figma-system.json    Figma MCP-ready variable + style payload");
  console.log("");
  console.log("  Next steps:");
  console.log("    1. Review and customize output/DESIGN.md");
  console.log("    2. Import design-tokens.css into your global stylesheet");
  console.log("    3. Apply tailwind.config.js as a preset (Tailwind users)");
  console.log("    4. Use figma-system.json with Figma MCP to create variables/styles");
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
