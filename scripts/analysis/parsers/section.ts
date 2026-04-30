/**
 * Find a markdown section whose heading contains `name` (case-insensitive substring,
 * leading numbering stripped). Returns body text from after the heading to before the
 * next heading of equal or higher level. Returns null when not found.
 */
export function findSection(markdown: string, name: string): string | null {
  const lines = markdown.split("\n");
  const target = name.toLowerCase().trim();

  let startIdx = -1;
  let startLevel = 0;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s+(.+?)\s*$/);
    if (!m) continue;
    const headingText = m[2].toLowerCase().replace(/^\d+(\.\d+)*\.\s*/, "").trim();
    if (headingText.includes(target)) {
      startIdx = i + 1;
      startLevel = m[1].length;
      break;
    }
  }
  if (startIdx === -1) return null;

  let endIdx = lines.length;
  for (let i = startIdx; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s+/);
    if (m && m[1].length <= startLevel) {
      endIdx = i;
      break;
    }
  }

  return lines.slice(startIdx, endIdx).join("\n").trim();
}
