const CSS_VAR_RE = /--[a-z][a-z0-9-]*/i;

export function extractCssVar(text: string): string | null {
  const m = text.match(CSS_VAR_RE);
  return m ? m[0] : null;
}

export function lastSegment(cssVar: string): string {
  const stripped = cssVar.replace(/^--/, "");
  const parts = stripped.split("-");
  if (parts.length === 0) return stripped;
  if (parts.length === 1) return parts[0];
  return parts.slice(-2).join("-");
}
