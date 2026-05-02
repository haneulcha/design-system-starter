const STOPWORDS = new Set([
  "the", "a", "an",
  "and", "or", "but",
  "of", "for", "on", "in", "to", "with", "from", "by", "at", "as", "into",
  "is", "are", "was", "were", "be", "been", "being",
  "will", "would", "can", "could", "may", "might",
  "it", "its", "this", "that", "these", "those",
  "all", "any", "both", "every", "each",
  "not", "no",
]);

function stripMarkdownDecorations(s: string): string {
  return s
    .replace(/`[^`]*`/g, " ")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1");
}

function firstSentence(s: string): string {
  const trimmed = s.replace(/^[^a-zA-Z]+/, "").trim();
  const dot = trimmed.search(/[.!?](\s|$)/);
  return dot === -1 ? trimmed : trimmed.slice(0, dot);
}

export function extractFirstKeywords(description: string, n = 3): string[] {
  const stripped = stripMarkdownDecorations(description);
  const sentence = firstSentence(stripped);
  const tokens = sentence
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0 && !STOPWORDS.has(t));
  return tokens.slice(0, n);
}
