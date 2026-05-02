// scripts/render-corpus-html.ts
//
// Pure rendering for the corpus bucket showcase. Given an array of
// extracted-record-like objects, returns a complete HTML document
// that visualizes the corpus per design-system dimension, bucketed by
// terciles (numeric) or by value (categorical/boolean).
//
// No mood overlay — this is corpus reference material.

import { converter, formatHex } from "culori";

// ---------- Types ----------

export interface CorpusRecord {
  system: string;
  // numeric / nullable
  btn_radius: number | null;
  is_fully_pill: boolean | null;
  card_radius: number | null;
  heading_weight: number | null;
  body_line_height: number | null;
  heading_letter_spacing: number | null;
  brand_l: number | null;
  brand_c: number | null;
  brand_h: number | null;
  gray_chroma: number | null;
  font_family_count: number | null;
  color_palette_size: number | null;
  spacing_range_ratio: number | null;
  palette_brand_count: number | null;
  palette_neutral_count: number | null;
  palette_semantic_count: number | null;
  text_style_count: number | null;
  distinct_weight_count: number | null;
  weight_min: number | null;
  weight_max: number | null;
  spacing_token_count: number | null;
  spacing_min_px: number | null;
  spacing_max_px: number | null;
  radius_token_count: number | null;
  radius_min_px: number | null;
  radius_max_px: number | null;
  elevation_level_count: number | null;
  component_count: number | null;
  // categorical / boolean
  shadow_intensity: number | null;
  btn_shape: number | null;
  dark_mode_present: boolean | null;
  typography_has_serif: boolean | null;
  multi_layer_shadow: boolean | null;
  shadow_tint: string | null;
  token_layer_depth: number | null;
  token_reference_style: string | null;
  naming_convention: string | null;
  component_presence?: Record<string, boolean> | null;
}

export interface NumericBucket {
  label: string; // e.g. "Q1"
  range: string; // e.g. "0–4"
  min: number;
  max: number;
  mid: number; // midpoint for visualization
  mean: number;
  members: { system: string; value: number }[];
}

export interface CategoricalBucket {
  label: string; // value or label
  range: string;
  members: string[]; // system names
}

// ---------- Quantile bucketing ----------

const lab = converter("oklch");

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtNum(v: number, decimals = 2): string {
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(decimals).replace(/\.?0+$/, "");
}

/**
 * Tercile a numeric subset of records into 3 buckets (Q1/Q2/Q3) by value.
 * Returns null if too few non-null values (< 10) to bucket meaningfully.
 */
export function tercileBuckets(
  records: CorpusRecord[],
  field: keyof CorpusRecord,
  options: { unit?: string; decimals?: number; predicate?: (r: CorpusRecord) => boolean } = {},
): NumericBucket[] | null {
  const unit = options.unit ?? "";
  const decimals = options.decimals ?? 2;
  const predicate = options.predicate ?? (() => true);
  const pairs: { system: string; value: number }[] = [];
  for (const r of records) {
    if (!predicate(r)) continue;
    const v = r[field];
    if (typeof v === "number" && Number.isFinite(v)) {
      pairs.push({ system: r.system, value: v });
    }
  }
  if (pairs.length < 10) return null;
  pairs.sort((a, b) => a.value - b.value);
  const n = pairs.length;
  const t1 = Math.floor(n * 0.33);
  const t2 = Math.floor(n * 0.67);
  const slices: { system: string; value: number }[][] = [
    pairs.slice(0, t1),
    pairs.slice(t1, t2),
    pairs.slice(t2),
  ];
  return slices.map((slice, i) => {
    const values = slice.map((p) => p.value);
    const mn = values[0];
    const mx = values[values.length - 1];
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const mid = (mn + mx) / 2;
    const range = `${fmtNum(mn, decimals)}${unit}–${fmtNum(mx, decimals)}${unit}`;
    return {
      label: `Q${i + 1}`,
      range,
      min: mn,
      max: mx,
      mid,
      mean,
      members: slice,
    };
  });
}

/**
 * Carve out pill systems (is_fully_pill: true) from radius, then tercile the
 * remaining numeric btn_radius values. Returns 4 buckets: Pill / Q1 / Q2 / Q3.
 */
export function radiusBucketsWithPill(records: CorpusRecord[]): {
  pill: { members: string[] };
  numeric: NumericBucket[] | null;
} {
  const pillMembers = records
    .filter((r) => r.is_fully_pill === true)
    .map((r) => r.system);
  const nonPill = records.filter((r) => r.is_fully_pill !== true);
  const numeric = tercileBuckets(nonPill, "btn_radius", {
    unit: "px",
    decimals: 0,
  });
  return { pill: { members: pillMembers }, numeric };
}

/**
 * Categorical bucketing — groups records by the field value.
 * Optional valueOrder forces a specific bucket order; missing values are skipped.
 */
export function categoricalBuckets(
  records: CorpusRecord[],
  field: keyof CorpusRecord,
  valueOrder?: (string | number | boolean)[],
): CategoricalBucket[] {
  const groups = new Map<string, string[]>();
  for (const r of records) {
    const v = r[field];
    if (v === null || v === undefined) continue;
    const key = String(v);
    const existing = groups.get(key);
    if (existing) existing.push(r.system);
    else groups.set(key, [r.system]);
  }
  const orderedKeys = valueOrder
    ? valueOrder.map((v) => String(v)).filter((k) => groups.has(k))
    : Array.from(groups.keys()).sort();
  return orderedKeys.map((k) => ({
    label: k,
    range: `${groups.get(k)!.length} systems`,
    members: groups.get(k)!,
  }));
}

// ---------- Member list rendering ----------

function renderMemberList(members: string[]): string {
  if (members.length === 0) return `<div class="bucket-systems empty">— none —</div>`;
  const cap = 10;
  const head = members.slice(0, cap).map(escapeHtml).join(", ");
  const tail = members.length > cap ? `, …and ${members.length - cap} more` : "";
  return `<div class="bucket-systems">${head}${tail}</div>`;
}

function renderNumericSystems(members: { system: string; value: number }[]): string {
  return renderMemberList(members.map((m) => m.system));
}

// ---------- Color helpers ----------

function meanOklchSwatch(records: CorpusRecord[], members: string[]): string {
  const set = new Set(members);
  const ls: number[] = [];
  const cs: number[] = [];
  const hs: number[] = [];
  for (const r of records) {
    if (!set.has(r.system)) continue;
    if (typeof r.brand_l === "number") ls.push(r.brand_l);
    if (typeof r.brand_c === "number") cs.push(r.brand_c);
    if (typeof r.brand_h === "number") hs.push(r.brand_h);
  }
  if (!ls.length || !cs.length || !hs.length) return "#cccccc";
  const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  // Hue averaging via vectors to handle wrap-around
  let sx = 0, sy = 0;
  for (const h of hs) {
    sx += Math.cos((h * Math.PI) / 180);
    sy += Math.sin((h * Math.PI) / 180);
  }
  let hMean = (Math.atan2(sy, sx) * 180) / Math.PI;
  if (hMean < 0) hMean += 360;
  const color = lab({ mode: "oklch", l: mean(ls), c: mean(cs), h: hMean });
  return color ? formatHex(color) : "#cccccc";
}

function oklchToHex(l: number, c: number, h: number): string {
  const color = lab({ mode: "oklch", l, c, h });
  return color ? formatHex(color) : "#cccccc";
}

function grayHexFromL(l: number): string {
  // gray scale at brand_l mean (use l, c=0)
  return oklchToHex(l, 0, 0);
}

// ---------- Bucket card rendering ----------

interface CardOptions {
  label: string;
  range: string;
  count: number;
  visual?: string; // raw HTML
  members: string[];
}

function renderCard(opts: CardOptions): string {
  const visual = opts.visual ? `<div class="bucket-visual">${opts.visual}</div>` : "";
  return `<div class="bucket">
  <div class="bucket-label">${escapeHtml(opts.label)}</div>
  <div class="bucket-range">${escapeHtml(opts.range)}</div>
  <div class="bucket-count">${opts.count} systems</div>
  ${visual}
  ${renderMemberList(opts.members)}
</div>`;
}

// ---------- Per-dimension renderers ----------

function dimensionHeading(name: string, sub: string): string {
  return `<h3>${escapeHtml(name)}</h3>
<p class="dim-sub">${escapeHtml(sub)}</p>`;
}

function bucketRow(cards: string[]): string {
  return `<div class="bucket-row">${cards.join("\n")}</div>`;
}

function noteInsufficient(name: string): string {
  return `<p class="note">Insufficient non-null values for "${escapeHtml(name)}" — bucket skipped.</p>`;
}

// Numeric tercile dimension with optional visual builder per bucket.
function renderNumericDimension(
  records: CorpusRecord[],
  field: keyof CorpusRecord,
  title: string,
  description: string,
  options: {
    unit?: string;
    decimals?: number;
    visual?: (b: NumericBucket) => string;
  } = {},
): string {
  const buckets = tercileBuckets(records, field, {
    unit: options.unit,
    decimals: options.decimals,
  });
  if (!buckets) return dimensionHeading(title, description) + noteInsufficient(field as string);
  const cards = buckets.map((b) =>
    renderCard({
      label: b.label,
      range: b.range,
      count: b.members.length,
      visual: options.visual ? options.visual(b) : undefined,
      members: b.members.map((m) => m.system),
    }),
  );
  return dimensionHeading(title, description) + bucketRow(cards);
}

function renderCategoricalDimension(
  records: CorpusRecord[],
  field: keyof CorpusRecord,
  title: string,
  description: string,
  options: {
    valueOrder?: (string | number | boolean)[];
    valueLabel?: (key: string) => string;
    visual?: (key: string) => string;
  } = {},
): string {
  const buckets = categoricalBuckets(records, field, options.valueOrder);
  if (buckets.length === 0)
    return dimensionHeading(title, description) + noteInsufficient(field as string);
  const cards = buckets.map((b) =>
    renderCard({
      label: options.valueLabel ? options.valueLabel(b.label) : b.label,
      range: "",
      count: b.members.length,
      visual: options.visual ? options.visual(b.label) : undefined,
      members: b.members,
    }),
  );
  return dimensionHeading(title, description) + bucketRow(cards);
}

// ---------- Section: Color ----------

function renderColorSection(records: CorpusRecord[]): string {
  const parts: string[] = [];
  parts.push(`<section class="category">
<h2>1. Color</h2>
<p class="cat-desc">Brand color statistics in OKLCH space, plus palette composition counts.</p>`);

  // brand_l / brand_c / brand_h with mean swatch
  for (const [field, title, desc, decimals, unit] of [
    ["brand_l", "Brand lightness (OKLCH L)", "0 = black, 1 = white", 3, ""],
    ["brand_c", "Brand chroma (OKLCH C)", "Saturation, 0 = gray, ~0.4 = max", 3, ""],
    ["brand_h", "Brand hue (OKLCH H)", "Hue angle in degrees", 0, "°"],
  ] as const) {
    const buckets = tercileBuckets(records, field as keyof CorpusRecord, {
      unit,
      decimals,
    });
    if (!buckets) {
      parts.push(dimensionHeading(title, desc) + noteInsufficient(field));
      continue;
    }
    const cards = buckets.map((b) => {
      const swatch = meanOklchSwatch(records, b.members.map((m) => m.system));
      const visual = `<div class="swatch" style="background:${swatch}"></div><div class="hex">${swatch}</div>`;
      return renderCard({
        label: b.label,
        range: b.range,
        count: b.members.length,
        visual,
        members: b.members.map((m) => m.system),
      });
    });
    parts.push(dimensionHeading(title, desc) + bucketRow(cards));
  }

  // gray_chroma — show gray-tinted swatch (using mean L of corpus and bucket's gray chroma midpoint at hue 0)
  {
    const buckets = tercileBuckets(records, "gray_chroma", { decimals: 4 });
    const title = "Gray chroma";
    const desc = "Chroma applied to the neutral/gray ramp (0 = pure gray)";
    if (!buckets) {
      parts.push(dimensionHeading(title, desc) + noteInsufficient("gray_chroma"));
    } else {
      const cards = buckets.map((b) => {
        // Use mid lightness and midpoint chroma; hue 250 (cool) for visualization
        const hex = oklchToHex(0.7, b.mid, 250);
        const visual = `<div class="swatch" style="background:${hex}"></div><div class="hex">${hex}</div>`;
        return renderCard({
          label: b.label,
          range: b.range,
          count: b.members.length,
          visual,
          members: b.members.map((m) => m.system),
        });
      });
      parts.push(dimensionHeading(title, desc) + bucketRow(cards));
    }
  }

  // color_palette_size — mini bar visualization
  {
    const buckets = tercileBuckets(records, "color_palette_size", { decimals: 0 });
    const title = "Color palette size";
    const desc = "Total distinct color tokens in the system";
    if (!buckets) {
      parts.push(dimensionHeading(title, desc) + noteInsufficient("color_palette_size"));
    } else {
      const maxMean = Math.max(...buckets.map((b) => b.mean));
      const cards = buckets.map((b) => {
        const pct = Math.round((b.mean / maxMean) * 100);
        const visual = `<div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
<div class="bar-meta">mean ${fmtNum(b.mean, 1)} tokens</div>`;
        return renderCard({
          label: b.label,
          range: b.range,
          count: b.members.length,
          visual,
          members: b.members.map((m) => m.system),
        });
      });
      parts.push(dimensionHeading(title, desc) + bucketRow(cards));
    }
  }

  // palette counts
  for (const [field, title, desc] of [
    ["palette_brand_count", "Brand color count", "Number of brand colors in the palette"],
    ["palette_neutral_count", "Neutral color count", "Number of neutral/gray colors"],
    ["palette_semantic_count", "Semantic color count", "Number of semantic colors (success/error/warning/info)"],
  ] as const) {
    parts.push(
      renderNumericDimension(records, field as keyof CorpusRecord, title, desc, {
        decimals: 0,
      }),
    );
  }

  parts.push(`</section>`);
  return parts.join("\n");
}

// ---------- Section: Typography ----------

function renderTypographySection(records: CorpusRecord[]): string {
  const parts: string[] = [];
  parts.push(`<section class="category">
<h2>2. Typography</h2>
<p class="cat-desc">Heading weights, body line-height, font-family count, and weight diversity.</p>`);

  // heading_weight: sample sentence with weight
  {
    const buckets = tercileBuckets(records, "heading_weight", { decimals: 0 });
    const title = "Heading weight";
    const desc = "Numeric font-weight used for top-level headings";
    if (!buckets) parts.push(dimensionHeading(title, desc) + noteInsufficient("heading_weight"));
    else {
      const cards = buckets.map((b) => {
        const w = Math.round(b.mid);
        const visual = `<div class="type-sample" style="font-weight:${w}">The quick brown fox jumps over the lazy dog.</div>
<div class="bar-meta">weight ${w}</div>`;
        return renderCard({
          label: b.label,
          range: b.range,
          count: b.members.length,
          visual,
          members: b.members.map((m) => m.system),
        });
      });
      parts.push(dimensionHeading(title, desc) + bucketRow(cards));
    }
  }

  // heading_letter_spacing
  {
    const buckets = tercileBuckets(records, "heading_letter_spacing", { decimals: 2, unit: "px" });
    const title = "Heading letter-spacing";
    const desc = "Tracking applied to headings (px)";
    if (!buckets) parts.push(dimensionHeading(title, desc) + noteInsufficient("heading_letter_spacing"));
    else {
      const cards = buckets.map((b) => {
        const visual = `<div class="type-sample heading-sample" style="letter-spacing:${b.mid}px">The quick brown fox jumps over the lazy dog.</div>
<div class="bar-meta">tracking ${fmtNum(b.mid, 2)}px</div>`;
        return renderCard({
          label: b.label,
          range: b.range,
          count: b.members.length,
          visual,
          members: b.members.map((m) => m.system),
        });
      });
      parts.push(dimensionHeading(title, desc) + bucketRow(cards));
    }
  }

  // body_line_height
  {
    const buckets = tercileBuckets(records, "body_line_height", { decimals: 2 });
    const title = "Body line-height";
    const desc = "Unitless line-height multiplier for body text";
    if (!buckets) parts.push(dimensionHeading(title, desc) + noteInsufficient("body_line_height"));
    else {
      const cards = buckets.map((b) => {
        const lh = b.mid.toFixed(2);
        const visual = `<div class="type-sample body-sample" style="line-height:${lh}">The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.</div>
<div class="bar-meta">line-height ${lh}</div>`;
        return renderCard({
          label: b.label,
          range: b.range,
          count: b.members.length,
          visual,
          members: b.members.map((m) => m.system),
        });
      });
      parts.push(dimensionHeading(title, desc) + bucketRow(cards));
    }
  }

  parts.push(
    renderNumericDimension(records, "font_family_count", "Font family count", "Distinct font families used", { decimals: 0 }),
  );
  parts.push(
    renderNumericDimension(records, "text_style_count", "Text style count", "Total typography tokens defined", { decimals: 0 }),
  );
  parts.push(
    renderNumericDimension(
      records,
      "distinct_weight_count",
      "Distinct weight count",
      "How many different font-weights are used",
      { decimals: 0 },
    ),
  );
  parts.push(
    renderNumericDimension(records, "weight_min", "Min weight", "Lightest weight used", { decimals: 0 }),
  );
  parts.push(
    renderNumericDimension(records, "weight_max", "Max weight", "Heaviest weight used", { decimals: 0 }),
  );

  // typography_has_serif (boolean)
  parts.push(
    renderCategoricalDimension(records, "typography_has_serif", "Has serif typography", "Whether the system uses any serif fonts", {
      valueOrder: ["true", "false"],
      valueLabel: (k) => (k === "true" ? "Has serif" : "Sans-only"),
    }),
  );

  parts.push(`</section>`);
  return parts.join("\n");
}

// ---------- Section: Spacing ----------

function renderSpacingSection(records: CorpusRecord[]): string {
  const parts: string[] = [];
  parts.push(`<section class="category">
<h2>3. Spacing</h2>
<p class="cat-desc">Spacing scale extent (range ratio), token count, and min/max values.</p>`);

  parts.push(
    renderNumericDimension(records, "spacing_range_ratio", "Spacing range ratio", "max / min spacing token", { decimals: 1 }),
  );

  // spacing_token_count — stack of N small bars
  {
    const buckets = tercileBuckets(records, "spacing_token_count", { decimals: 0 });
    const title = "Spacing token count";
    const desc = "Number of distinct spacing tokens";
    if (!buckets) parts.push(dimensionHeading(title, desc) + noteInsufficient("spacing_token_count"));
    else {
      const cards = buckets.map((b) => {
        const n = Math.round(b.mid);
        const bars = Array.from({ length: n }, (_, i) => {
          const w = 8 + i * 4;
          return `<div class="stack-bar" style="width:${w}px"></div>`;
        }).join("");
        const visual = `<div class="stack">${bars}</div><div class="bar-meta">midpoint ${n} tokens</div>`;
        return renderCard({
          label: b.label,
          range: b.range,
          count: b.members.length,
          visual,
          members: b.members.map((m) => m.system),
        });
      });
      parts.push(dimensionHeading(title, desc) + bucketRow(cards));
    }
  }

  parts.push(
    renderNumericDimension(records, "spacing_min_px", "Spacing min (px)", "Smallest spacing token in px", { decimals: 0, unit: "px" }),
  );
  parts.push(
    renderNumericDimension(records, "spacing_max_px", "Spacing max (px)", "Largest spacing token in px", { decimals: 0, unit: "px" }),
  );

  parts.push(`</section>`);
  return parts.join("\n");
}

// ---------- Section: Radius ----------

function renderRadiusSection(records: CorpusRecord[]): string {
  const parts: string[] = [];
  parts.push(`<section class="category">
<h2>4. Radius</h2>
<p class="cat-desc">Border radius for buttons (with pill carve-out), cards, and overall token range.</p>`);

  // btn_radius with pill carve-out
  {
    const { pill, numeric } = radiusBucketsWithPill(records);
    const title = "Button radius";
    const desc = "Pill systems carved out, remaining values terciled (px)";
    parts.push(dimensionHeading(title, desc));
    const cards: string[] = [];
    cards.push(
      renderCard({
        label: "Pill",
        range: "border-radius: 9999px",
        count: pill.members.length,
        visual: `<div class="btn-sample" style="border-radius:9999px">Button</div>`,
        members: pill.members,
      }),
    );
    if (numeric) {
      for (const b of numeric) {
        const r = Math.round(b.mid);
        cards.push(
          renderCard({
            label: b.label,
            range: b.range,
            count: b.members.length,
            visual: `<div class="btn-sample" style="border-radius:${r}px">Button</div>`,
            members: b.members.map((m) => m.system),
          }),
        );
      }
    }
    parts.push(bucketRow(cards));
  }

  // card_radius
  {
    const buckets = tercileBuckets(records, "card_radius", { decimals: 0, unit: "px" });
    const title = "Card radius";
    const desc = "Border radius applied to card surfaces";
    if (!buckets) parts.push(dimensionHeading(title, desc) + noteInsufficient("card_radius"));
    else {
      const cards = buckets.map((b) => {
        const r = Math.round(b.mid);
        const visual = `<div class="card-sample" style="border-radius:${r}px"></div>`;
        return renderCard({
          label: b.label,
          range: b.range,
          count: b.members.length,
          visual,
          members: b.members.map((m) => m.system),
        });
      });
      parts.push(dimensionHeading(title, desc) + bucketRow(cards));
    }
  }

  parts.push(
    renderNumericDimension(records, "radius_token_count", "Radius token count", "Distinct radius tokens", { decimals: 0 }),
  );
  parts.push(
    renderNumericDimension(records, "radius_min_px", "Radius min (px)", "Smallest radius token", { decimals: 0, unit: "px" }),
  );
  parts.push(
    renderNumericDimension(records, "radius_max_px", "Radius max (px)", "Largest radius token", { decimals: 0, unit: "px" }),
  );

  parts.push(`</section>`);
  return parts.join("\n");
}

// ---------- Section: Elevation ----------

const SHADOW_BY_INTENSITY: Record<string, string> = {
  "0": "none",
  "1": "0 1px 2px rgba(0,0,0,0.04)",
  "2": "0 2px 6px rgba(0,0,0,0.08)",
  "3": "0 4px 12px rgba(0,0,0,0.12)",
  "4": "0 12px 32px rgba(0,0,0,0.20)",
};

const SHADOW_INTENSITY_LABEL: Record<string, string> = {
  "0": "none",
  "1": "whisper",
  "2": "subtle",
  "3": "medium",
  "4": "dramatic",
};

function shadowWithTint(intensity: number, tint: string): string {
  const mapping: Record<string, [number, number, number]> = {
    neutral: [0, 0, 0],
    warm: [60, 40, 20],
    cool: [20, 40, 60],
  };
  const [r, g, bl] = mapping[tint] ?? [0, 0, 0];
  // Use intensity-3 strength as the canonical demo for tint cards
  const alpha = 0.18;
  return `0 4px 14px rgba(${r},${g},${bl},${alpha})`;
}

function renderElevationSection(records: CorpusRecord[]): string {
  const parts: string[] = [];
  parts.push(`<section class="category">
<h2>5. Elevation</h2>
<p class="cat-desc">Shadow intensity, tint, layering, and elevation-token counts.</p>`);

  // shadow_intensity — categorical 0-4
  parts.push(
    renderCategoricalDimension(records, "shadow_intensity", "Shadow intensity", "Discrete intensity 0 (none) → 4 (dramatic)", {
      valueOrder: ["0", "1", "2", "3", "4"],
      valueLabel: (k) => `${k} · ${SHADOW_INTENSITY_LABEL[k] ?? "?"}`,
      visual: (k) => {
        const sh = SHADOW_BY_INTENSITY[k] ?? "none";
        const style = sh === "none" ? "box-shadow:none" : `box-shadow:${sh}`;
        return `<div class="shadow-sample" style="${style}"></div>`;
      },
    }),
  );

  // elevation_level_count — tercile
  parts.push(
    renderNumericDimension(records, "elevation_level_count", "Elevation level count", "Distinct elevation tokens", { decimals: 0 }),
  );

  // multi_layer_shadow — boolean
  parts.push(
    renderCategoricalDimension(records, "multi_layer_shadow", "Multi-layer shadow", "Whether shadows are composed of multiple stacked layers", {
      valueOrder: ["true", "false"],
      valueLabel: (k) => (k === "true" ? "Multi-layer" : "Single layer"),
      visual: (k) =>
        k === "true"
          ? `<div class="shadow-sample" style="box-shadow:0 1px 2px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.10), 0 12px 32px rgba(0,0,0,0.12)"></div>`
          : `<div class="shadow-sample" style="box-shadow:0 4px 12px rgba(0,0,0,0.12)"></div>`,
    }),
  );

  // shadow_tint — categorical
  parts.push(
    renderCategoricalDimension(records, "shadow_tint", "Shadow tint", "Color cast applied to shadows", {
      valueOrder: ["neutral", "warm", "cool"],
      visual: (k) => `<div class="shadow-sample" style="box-shadow:${shadowWithTint(3, k)}"></div>`,
    }),
  );

  // dark_mode_present — boolean
  parts.push(
    renderCategoricalDimension(records, "dark_mode_present", "Dark mode support", "Whether a dark mode is documented", {
      valueOrder: ["true", "false"],
      valueLabel: (k) => (k === "true" ? "Dark mode" : "Light only"),
    }),
  );

  parts.push(`</section>`);
  return parts.join("\n");
}

// ---------- Section: Token architecture ----------

function renderTokenArchitectureSection(records: CorpusRecord[]): string {
  const parts: string[] = [];
  parts.push(`<section class="category">
<h2>6. Token architecture</h2>
<p class="cat-desc">Token-layer depth and reference style. No visuals — corpus prevalence only.</p>`);

  parts.push(
    renderCategoricalDimension(records, "token_layer_depth", "Token layer depth", "1 = flat, 2 = primitive→semantic, 3 = primitive→semantic→component", {
      valueOrder: ["1", "2", "3"],
      valueLabel: (k) => `Depth ${k}`,
    }),
  );

  parts.push(
    renderCategoricalDimension(records, "token_reference_style", "Token reference style", "How tokens reference each other", {
      valueOrder: ["string-template", "dot-path", "css-var", "mixed", "none"],
    }),
  );

  parts.push(`</section>`);
  return parts.join("\n");
}

// ---------- Section: Naming convention ----------

const NAMING_SAMPLES: Record<string, string> = {
  "t-shirt": "xs · sm · md · lg · xl",
  numeric: "100 · 200 · 300 · 400",
  purpose: "button-padding · card-gap · section-spacing",
  hybrid: "space-2 · md · lg-padding",
};

function renderNamingConventionSection(records: CorpusRecord[]): string {
  const parts: string[] = [];
  parts.push(`<section class="category">
<h2>7. Naming convention</h2>
<p class="cat-desc">How design-token identifiers are named.</p>`);

  parts.push(
    renderCategoricalDimension(records, "naming_convention", "Naming convention", "t-shirt / numeric / purpose / hybrid", {
      valueOrder: ["t-shirt", "numeric", "purpose", "hybrid"],
      visual: (k) =>
        `<div class="mono-sample">${escapeHtml(NAMING_SAMPLES[k] ?? "—")}</div>`,
    }),
  );

  parts.push(`</section>`);
  return parts.join("\n");
}

// ---------- Section: Components ----------

const CANONICAL_COMPONENTS = [
  "button",
  "input",
  "textarea",
  "select",
  "checkbox",
  "radio",
  "switch",
  "card",
  "badge",
  "avatar",
  "tabs",
  "modal",
  "tooltip",
  "alert",
  "table",
];

function renderComponentsSection(records: CorpusRecord[]): string {
  const parts: string[] = [];
  parts.push(`<section class="category">
<h2>8. Components</h2>
<p class="cat-desc">Total component count and canonical-component coverage across the corpus.</p>`);

  // component_count
  {
    const buckets = tercileBuckets(records, "component_count", { decimals: 0 });
    const title = "Component count";
    const desc = "Total documented components per system";
    if (!buckets) parts.push(dimensionHeading(title, desc) + noteInsufficient("component_count"));
    else {
      const maxMean = Math.max(...buckets.map((b) => b.mean));
      const cards = buckets.map((b) => {
        const pct = Math.round((b.mean / maxMean) * 100);
        const visual = `<div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
<div class="bar-meta">mean ${fmtNum(b.mean, 1)} components</div>`;
        return renderCard({
          label: b.label,
          range: b.range,
          count: b.members.length,
          visual,
          members: b.members.map((m) => m.system),
        });
      });
      parts.push(dimensionHeading(title, desc) + bucketRow(cards));
    }
  }

  // Canonical component coverage
  {
    const counts = new Map<string, number>();
    for (const c of CANONICAL_COMPONENTS) counts.set(c, 0);
    for (const r of records) {
      const cp = r.component_presence;
      if (!cp) continue;
      for (const c of CANONICAL_COMPONENTS) {
        if (cp[c]) counts.set(c, (counts.get(c) ?? 0) + 1);
      }
    }
    const total = records.length;
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    const maxCount = sorted[0] ? sorted[0][1] : 1;
    const rows = sorted
      .map(([name, count]) => {
        const pct = Math.round((count / Math.max(maxCount, 1)) * 100);
        const ofTotalPct = ((count / total) * 100).toFixed(0);
        return `<div class="cov-row">
  <div class="cov-name">${escapeHtml(name)}</div>
  <div class="cov-track"><div class="cov-fill" style="width:${pct}%"></div></div>
  <div class="cov-count">${count} / ${total} (${ofTotalPct}%)</div>
</div>`;
      })
      .join("\n");
    parts.push(`<h3>Canonical component coverage</h3>
<p class="dim-sub">How many of the ${total} systems include each canonical component.</p>
<div class="coverage">${rows}</div>`);
  }

  parts.push(`</section>`);
  return parts.join("\n");
}

// ---------- Top-level renderer ----------

const STYLES = `
:root {
  color-scheme: light;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #111;
  background: #fff;
  line-height: 1.5;
}
.container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 48px 32px 96px;
}
header.page-header {
  border-bottom: 1px solid #e5e5e5;
  padding-bottom: 24px;
  margin-bottom: 48px;
}
header.page-header h1 {
  margin: 0 0 8px;
  font-size: 32px;
  letter-spacing: -0.01em;
}
header.page-header .sub {
  margin: 0 0 4px;
  color: #444;
  font-size: 15px;
}
header.page-header .source {
  margin: 8px 0 0;
  font-size: 12px;
  color: #6c6c6c;
}
section.category {
  margin: 80px 0 0;
}
section.category:first-of-type {
  margin-top: 0;
}
section.category h2 {
  margin: 0 0 8px;
  font-size: 24px;
  letter-spacing: -0.01em;
}
section.category .cat-desc {
  margin: 0 0 32px;
  color: #555;
  font-size: 14px;
}
section.category h3 {
  margin: 32px 0 4px;
  font-size: 16px;
  font-weight: 600;
}
.dim-sub {
  margin: 0 0 12px;
  color: #6c6c6c;
  font-size: 13px;
}
.note {
  margin: 0 0 16px;
  padding: 8px 12px;
  background: #fafafa;
  border-left: 3px solid #ccc;
  color: #555;
  font-size: 13px;
}
.bucket-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 16px;
}
.bucket {
  width: 240px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  padding: 14px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.bucket-label {
  font-size: 13px;
  font-weight: 600;
  color: #111;
}
.bucket-range {
  font-size: 12px;
  color: #444;
  font-variant-numeric: tabular-nums;
}
.bucket-count {
  font-size: 11px;
  color: #6c6c6c;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.bucket-visual {
  margin: 4px 0;
  min-height: 40px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}
.bucket-systems {
  font-size: 11px;
  font-style: italic;
  color: #6c6c6c;
  line-height: 1.45;
}
.bucket-systems.empty {
  color: #aaa;
}
/* Color swatch */
.swatch {
  width: 100%;
  height: 56px;
  border-radius: 6px;
  border: 1px solid rgba(0,0,0,0.08);
}
.hex {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  color: #444;
}
/* Bar */
.bar-track {
  width: 100%;
  height: 10px;
  background: #f0f0f0;
  border-radius: 5px;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  background: #2a2a2a;
}
.bar-meta {
  font-size: 11px;
  color: #555;
}
/* Stack of bars */
.stack {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: flex-start;
}
.stack-bar {
  height: 4px;
  background: #2a2a2a;
  border-radius: 2px;
}
/* Typography samples */
.type-sample {
  font-family: "Inter", system-ui, sans-serif;
  font-size: 14px;
  color: #222;
  width: 100%;
}
.heading-sample {
  font-size: 16px;
  font-weight: 600;
}
.body-sample {
  font-size: 13px;
}
/* Button sample */
.btn-sample {
  width: 100px;
  height: 36px;
  background: #2a2a2a;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 500;
}
/* Card sample */
.card-sample {
  width: 120px;
  height: 80px;
  background: #f4f4f4;
  border: 1px solid #e0e0e0;
}
/* Shadow sample */
.shadow-sample {
  width: 120px;
  height: 80px;
  background: #ffffff;
  border-radius: 6px;
  border: 1px solid rgba(0,0,0,0.04);
  margin: 4px 4px 14px 4px;
}
/* Mono sample for naming */
.mono-sample {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  color: #222;
  background: #fafafa;
  padding: 8px 10px;
  border-radius: 4px;
  border: 1px solid #ececec;
  width: 100%;
}
/* Coverage */
.coverage {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 12px;
}
.cov-row {
  display: grid;
  grid-template-columns: 100px 1fr 120px;
  gap: 12px;
  align-items: center;
  font-size: 12px;
}
.cov-name {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #222;
}
.cov-track {
  height: 12px;
  background: #f0f0f0;
  border-radius: 6px;
  overflow: hidden;
}
.cov-fill {
  height: 100%;
  background: #2a2a2a;
}
.cov-count {
  font-variant-numeric: tabular-nums;
  color: #555;
  text-align: right;
}
`;

export function renderCorpusHtml(records: CorpusRecord[]): string {
  const sections = [
    renderColorSection(records),
    renderTypographySection(records),
    renderSpacingSection(records),
    renderRadiusSection(records),
    renderElevationSection(records),
    renderTokenArchitectureSection(records),
    renderNamingConventionSection(records),
    renderComponentsSection(records),
  ].join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Corpus Bucket Showcase</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${STYLES}</style>
</head>
<body>
<div class="container">
<header class="page-header">
  <h1>Corpus Bucket Showcase</h1>
  <p class="sub">n=${records.length} design systems from awesome-design-md, bucketed per dimension. No mood overlay.</p>
  <p class="source">Source: docs/research/notebooks/extracted-2026-05-01.json</p>
</header>
${sections}
</div>
</body>
</html>`;
}
