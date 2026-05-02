import type { RawComponentRow } from "./types.js";

const COMPONENT_SECTION_RE = /^##\s+(?:\d+\.\s*)?component(?:s|\s+stylings?)\b/i;
const NEXT_SECTION_RE = /^##\s+/;
const SUBSECTION_RE = /^###\s+(.+?)\s*$/;
const VARIANT_RE = /^\*\*\s*`?([^`*]+?)`?\s*\*\*\s*$/;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[`*]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function findComponentSection(lines: string[]): { start: number; end: number } | null {
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (COMPONENT_SECTION_RE.test(lines[i])) {
      start = i + 1;
      break;
    }
  }
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start; i < lines.length; i++) {
    if (NEXT_SECTION_RE.test(lines[i])) {
      end = i;
      break;
    }
  }
  return { start, end };
}

export function extractMarkdownComponents(system: string, md: string): RawComponentRow[] {
  const lines = md.split("\n");
  const section = findComponentSection(lines);
  if (!section) return [];

  const rows: RawComponentRow[] = [];
  const seen = new Set<string>();
  let currentGroup: string | null = null;
  let groupHadVariant = false;
  let groupLineIdx = -1;

  const pushDefaultIfBare = (): void => {
    if (currentGroup && !groupHadVariant && groupLineIdx !== -1) {
      const rawRole = `${currentGroup}:_default`;
      if (!seen.has(rawRole)) {
        seen.add(rawRole);
        rows.push({ system, format: "markdown", group: currentGroup, rawRole });
      }
    }
  };

  for (let i = section.start; i < section.end; i++) {
    const line = lines[i];
    const sub = line.match(SUBSECTION_RE);
    if (sub) {
      pushDefaultIfBare();
      currentGroup = slugify(sub[1]);
      groupHadVariant = false;
      groupLineIdx = i;
      continue;
    }
    if (!currentGroup) continue;
    const variant = line.match(VARIANT_RE);
    if (variant) {
      const variantSlug = slugify(variant[1]);
      if (!variantSlug) continue;
      const rawRole = `${currentGroup}:${variantSlug}`;
      if (!seen.has(rawRole)) {
        seen.add(rawRole);
        rows.push({ system, format: "markdown", group: currentGroup, rawRole });
      }
      groupHadVariant = true;
    }
  }
  pushDefaultIfBare();
  return rows;
}
