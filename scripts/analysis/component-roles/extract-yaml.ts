import { parse as parseYaml } from "yaml";
import { extractYamlFrontmatter } from "../parsers/format.js";
import type { RawComponentRow } from "./types.js";

interface YamlDoc {
  components?: Record<string, unknown>;
}

function deriveGroup(key: string): string {
  const idx = key.indexOf("-");
  return idx === -1 ? key : key.slice(0, idx);
}

// Fallback when the wider YAML doc fails to parse (e.g. unquoted colons in
// description fields). Locates `components:` and reads its 2-space-indented
// keys until the block ends.
function extractKeysByScan(yaml: string): string[] {
  const lines = yaml.split("\n");
  const start = lines.findIndex((l) => /^components:\s*$/.test(l));
  if (start === -1) return [];
  const keys: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "") continue;
    if (!/^\s/.test(line)) break; // dedent → block ended
    const m = line.match(/^ {2}([A-Za-z][A-Za-z0-9-]*)\s*:\s*$/);
    if (m) keys.push(m[1]);
  }
  return keys;
}

function rowsFromKeys(system: string, keys: string[]): RawComponentRow[] {
  return keys.map((rawRole) => ({
    system,
    format: "yaml" as const,
    group: deriveGroup(rawRole),
    rawRole,
  }));
}

export function extractYamlComponents(system: string, md: string): RawComponentRow[] {
  const yaml = extractYamlFrontmatter(md);
  if (!yaml) return [];
  try {
    const doc = parseYaml(yaml) as YamlDoc;
    const components = doc?.components;
    if (components && typeof components === "object") {
      return rowsFromKeys(system, Object.keys(components));
    }
  } catch {
    // fall through to scan
  }
  return rowsFromKeys(system, extractKeysByScan(yaml));
}
