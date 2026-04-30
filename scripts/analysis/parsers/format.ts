export type DesignFormat = "yaml" | "markdown";

export function detectFormat(md: string): DesignFormat {
  return md.trimStart().startsWith("---") ? "yaml" : "markdown";
}

export function extractYamlFrontmatter(md: string): string | null {
  const trimmed = md.trimStart();
  if (!trimmed.startsWith("---")) return null;
  const rest = trimmed.slice(3).replace(/^\n/, "");
  const closeIdx = rest.indexOf("\n---");
  if (closeIdx === -1) return null;
  return rest.slice(0, closeIdx);
}
