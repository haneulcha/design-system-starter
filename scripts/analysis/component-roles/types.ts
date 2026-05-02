// Row schema for Phase A raw extraction of components.
//
// Each row = one (system, component-instance) pair, source-faithful. A single
// system contributes many rows (one per component declared). Phase B's
// hand-authored dictionary maps `rawRole` → standardized component category.

export type CorpusFormat = "yaml" | "markdown";

export interface RawComponentRow {
  system: string;
  format: CorpusFormat;
  // First hyphen-segment of the YAML key, or sluggified `### Group` heading
  // from markdown. Used as the frequency-ranking column without prejudging
  // Phase B taxonomy.
  group: string;
  // Source-specific name as authored. YAML: the full key (e.g. `button-primary`,
  // `search-orb`). Markdown: `<groupSlug>:<variantSlug>` (e.g. `buttons:primary-purple`)
  // or `<groupSlug>:_default` when a group lists attributes inline without sub-variants.
  rawRole: string;
}
