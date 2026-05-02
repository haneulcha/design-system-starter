import type { TypeStyleRow } from "./types.js";

export type StandardCategory =
  | "heading"
  | "body"
  | "caption"
  | "card"
  | "badge"
  | "nav"
  | "link"
  | "button"
  | "code";

export interface RoleMapping {
  category: StandardCategory;
  sizeVariant?: string;
  weightVariant?: string;
  modifier?: string;
}

export interface RoleDictionary {
  version: number;
  categories: StandardCategory[];
  sizeVariants: Record<StandardCategory, string[]>;
  rules?: string[];
  mappings: Record<string, RoleMapping>;
  unmapped: string[];
}

export type MatchStatus = "matched" | "unmapped" | "unknown";

export interface NormalizedTypeStyleRow extends TypeStyleRow {
  standardCategory: StandardCategory | null;
  sizeVariant: string | null;
  weightVariant: string | null;
  modifier: string | null;
  matchStatus: MatchStatus;
}

export function classifyRow(
  row: TypeStyleRow,
  dict: RoleDictionary
): NormalizedTypeStyleRow {
  const key = row.rawRole.trim().toLowerCase();

  if (Object.prototype.hasOwnProperty.call(dict.mappings, key)) {
    const mapping = dict.mappings[key];
    return {
      ...row,
      standardCategory: mapping.category,
      sizeVariant: mapping.sizeVariant ?? null,
      weightVariant: mapping.weightVariant ?? null,
      modifier: mapping.modifier ?? null,
      matchStatus: "matched",
    };
  }

  if (dict.unmapped.includes(key)) {
    return {
      ...row,
      standardCategory: null,
      sizeVariant: null,
      weightVariant: null,
      modifier: null,
      matchStatus: "unmapped",
    };
  }

  return {
    ...row,
    standardCategory: null,
    sizeVariant: null,
    weightVariant: null,
    modifier: null,
    matchStatus: "unknown",
  };
}

export function classifyAll(
  rows: TypeStyleRow[],
  dict: RoleDictionary
): NormalizedTypeStyleRow[] {
  return rows.map((row) => classifyRow(row, dict));
}

export function validateDictionary(input: unknown): RoleDictionary {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Dictionary must be a non-null object");
  }

  const obj = input as Record<string, unknown>;

  if (typeof obj["version"] !== "number") {
    throw new Error("Dictionary 'version' must be a number");
  }

  if (!Array.isArray(obj["categories"])) {
    throw new Error("Dictionary 'categories' must be an array");
  }

  for (const cat of obj["categories"] as unknown[]) {
    if (typeof cat !== "string") {
      throw new Error("Dictionary 'categories' must be an array of strings");
    }
  }

  const categories = obj["categories"] as string[];

  if (
    obj["mappings"] === null ||
    typeof obj["mappings"] !== "object" ||
    Array.isArray(obj["mappings"])
  ) {
    throw new Error("Dictionary 'mappings' must be a non-null object");
  }

  const mappings = obj["mappings"] as Record<string, unknown>;

  for (const [role, mapping] of Object.entries(mappings)) {
    if (
      mapping === null ||
      typeof mapping !== "object" ||
      Array.isArray(mapping)
    ) {
      throw new Error(`Mapping for '${role}' must be an object`);
    }
    const m = mapping as Record<string, unknown>;
    if (!categories.includes(m["category"] as string)) {
      throw new Error(
        `Mapping for '${role}' has category '${m["category"]}' not in categories list`
      );
    }
  }

  const unmapped = Array.isArray(obj["unmapped"])
    ? (obj["unmapped"] as string[])
    : [];

  const mappingKeys = new Set(Object.keys(mappings));
  for (const role of unmapped) {
    if (mappingKeys.has(role)) {
      throw new Error(
        `Role '${role}' appears in both mappings and unmapped — conflict`
      );
    }
  }

  return obj as unknown as RoleDictionary;
}
