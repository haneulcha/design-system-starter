// scripts/analysis/accent-scale-refs.ts
//
// pnpm accent-scale-refs → data/references/{tailwind-v4,radix-light}.json 재생성.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import {
  parseTailwindTheme,
  radixLightScales,
} from "./accent-scale/extract-references.ts";

const require = createRequire(import.meta.url);

const TW_STOPS = ["50","100","200","300","400","500","600","700","800","900","950"];

function pkgVersion(name: string): string {
  return (require(`${name}/package.json`) as { version: string }).version;
}

mkdirSync("data/references", { recursive: true });

const themeCss = readFileSync(
  require.resolve("tailwindcss/theme.css"),
  "utf8",
);
writeFileSync(
  "data/references/tailwind-v4.json",
  JSON.stringify(
    {
      source: "tailwind",
      version: pkgVersion("tailwindcss"),
      anchorIndex: 5,
      stopKeys: TW_STOPS,
      palettes: parseTailwindTheme(themeCss, TW_STOPS),
    },
    null,
    2,
  ) + "\n",
);

writeFileSync(
  "data/references/radix-light.json",
  JSON.stringify(
    {
      source: "radix",
      version: pkgVersion("@radix-ui/colors"),
      anchorIndex: 8,
      stopKeys: ["1","2","3","4","5","6","7","8","9","10","11","12"],
      palettes: radixLightScales(),
    },
    null,
    2,
  ) + "\n",
);

console.log("wrote data/references/tailwind-v4.json, radix-light.json");
