import { generate } from "../src/generator/index.js";
import { transformToFigma } from "../src/figma/transformer.js";
import { writeFileSync, mkdirSync } from "fs";

const result = generate({
  brandName: "Acme",
  primaryColor: "#5e6ad2",
  mood: "professional",
  fontFamily: "Inter",
});

const figma = transformToFigma(result.tokens);

mkdirSync("output", { recursive: true });
mkdirSync("output/tokens", { recursive: true });
writeFileSync("output/DESIGN.md", result.designMd);
writeFileSync("output/design-tokens.json", JSON.stringify(result.tokens, null, 2));
writeFileSync("output/figma-system.json", JSON.stringify(figma, null, 2));
for (const [filename, content] of Object.entries(result.tokenFiles)) {
  writeFileSync(`output/tokens/${filename}`, content);
}

console.log("Generated:");
console.log(`  DESIGN.md: ${result.designMd.length} chars`);
console.log(`  Primitive colors: ${Object.keys(result.tokens.primitive.colors).length}`);
console.log(`  Semantic keys: ${Object.keys(result.tokens.semantic).length}`);
console.log(`  Component groups: ${Object.keys(result.tokens.component).length}`);
console.log(`  Token files: ${Object.keys(result.tokenFiles).length}`);
console.log(`  Figma collections: ${figma.variableCollections.length}`);
console.log(`  Figma text styles: ${figma.textStyles.length}`);
