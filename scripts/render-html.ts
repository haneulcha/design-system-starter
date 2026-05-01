// scripts/render-html.ts
//
// Pure renderer: takes a generated design system + archetype preset and emits
// a self-contained HTML preview page. No I/O here.

import type {
  ArchetypePreset,
  DesignSystem,
  DesignTokens,
  MoodArchetype,
  Oklch,
  TypeStyle,
} from "../src/schema/types.js";
import type { GenerateResult } from "../src/generator/index.js";
import { oklchToHex } from "../src/generator/color.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ShowcaseSummary {
  mood: MoodArchetype;
  archetype: ArchetypePreset;
  primary: string;
}

// ─── Small helpers ───────────────────────────────────────────────────────────

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const stepHex = (
  tokens: DesignTokens,
  ref: string, // e.g. "gray-100"
): string => {
  const dash = ref.lastIndexOf("-");
  if (dash < 0) return "#000000";
  const hue = ref.slice(0, dash);
  const step = ref.slice(dash + 1);
  const scale = tokens.primitive.colors[hue];
  if (!scale) return "#000000";
  const entry = scale[step];
  if (!entry) return "#000000";
  return oklchToHex(entry.light);
};

const semanticHex = (tokens: DesignTokens, role: string): string => {
  const ref = tokens.semantic[role];
  if (!ref) return "#000000";
  return stepHex(tokens, ref);
};

const componentSemantic = (
  tokens: DesignTokens,
  component: string,
  variant: string,
  prop: string,
): string | null => {
  const c = tokens.component[component]?.[variant];
  if (!c) return null;
  return c[prop] ?? null;
};

const componentHex = (
  tokens: DesignTokens,
  component: string,
  variant: string,
  prop: string,
): string | null => {
  const ref = componentSemantic(tokens, component, variant, prop);
  if (!ref || ref === "transparent") return ref === "transparent" ? "transparent" : null;
  return semanticHex(tokens, ref);
};

const styleSpec = (style: TypeStyle): string =>
  `font-family: ${JSON.stringify(style.font)}, ${JSON.stringify("system-ui")}, sans-serif; ` +
  `font-size: ${style.size}; ` +
  `font-weight: ${style.weight}; ` +
  `line-height: ${style.lineHeight}; ` +
  `letter-spacing: ${style.letterSpacing};`;

const pxFromTokenSpacing = (
  tokens: DesignTokens,
  ref: string, // "spacing.xs"
): number | null => {
  if (!ref.startsWith("spacing.")) return null;
  const key = ref.slice("spacing.".length);
  const v = tokens.spacing[key];
  return typeof v === "number" ? v : null;
};

const pxFromTokenRadius = (
  tokens: DesignTokens,
  ref: string, // "radius.button"
): string | null => {
  if (!ref.startsWith("radius.")) return null;
  const key = ref.slice("radius.".length);
  // borderRadius scale is keyed by kebab-cased name from layout.borderRadius
  // archetype layout uses names like "Button", "Input", "Card", "Pill", "None", "Subtle", "Large", "Circle"
  const v = tokens.borderRadius[key];
  if (typeof v !== "number") return null;
  if (v === -1) return "50%";
  if (v === 9999) return "9999px";
  return `${v}px`;
};

const fontSizeFromTokenStyle = (
  tokens: DesignTokens,
  ref: string, // "typography.button"
): { fontSize: number; fontWeight: number; family: string } | null => {
  if (!ref.startsWith("typography.")) return null;
  const key = ref.slice("typography.".length);
  const s = tokens.typography.styles[key];
  if (!s) return null;
  return {
    fontSize: s.fontSize,
    fontWeight: s.fontWeight,
    family: s.fontFamily,
  };
};

// Map a Google Fonts family name to a CDN href. Best-effort: handles spaces.
const googleFontsHref = (family: string): string => {
  const fam = family.replace(/\s+/g, "+");
  return `https://fonts.googleapis.com/css2?family=${fam}:wght@300;400;500;600;700;800&display=swap`;
};

// ─── Sections ────────────────────────────────────────────────────────────────

function renderHeader(
  archetype: ArchetypePreset,
  system: DesignSystem,
  primaryHex: string,
  fontFamily: string,
): string {
  const atmosphereParas = system.theme.atmosphere
    .split(/\n\n+/)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("\n");

  return `
<header class="hero">
  <div class="hero-meta">
    <span class="mood-badge">${escapeHtml(archetype.label)}</span>
    <span class="brand">${escapeHtml(system.brandName)}</span>
  </div>
  <h1 class="hero-title">${escapeHtml(archetype.label)}</h1>
  <p class="hero-desc">${escapeHtml(archetype.description)}</p>
  <div class="hero-chips">
    <div class="chip">
      <span class="chip-swatch" style="background:${primaryHex}"></span>
      <span class="chip-label">Primary <code>${primaryHex}</code></span>
    </div>
    <div class="chip">
      <span class="chip-label">Font <strong>${escapeHtml(fontFamily)}</strong></span>
    </div>
  </div>
  <div class="atmosphere">
    ${atmosphereParas}
  </div>
</header>`;
}

function renderColorPalette(tokens: DesignTokens): string {
  // Semantic
  const semanticRows = Object.entries(tokens.semantic)
    .map(([role, ref]) => {
      const hex = stepHex(tokens, ref);
      return `
      <div class="sem-card">
        <div class="sem-swatch" style="background:${hex}"></div>
        <div class="sem-info">
          <div class="sem-role">${escapeHtml(role)}</div>
          <div class="sem-ref">${escapeHtml(ref)}</div>
          <div class="sem-hex"><code>${hex}</code></div>
        </div>
      </div>`;
    })
    .join("\n");

  // Primitive
  const hueRows = Object.entries(tokens.primitive.colors)
    .map(([hue, scale]) => {
      const stepKeys = Object.keys(scale).sort(
        (a, b) => parseInt(a, 10) - parseInt(b, 10),
      );
      const swatches = stepKeys
        .map((step) => {
          const entry = scale[step] as { light: Oklch };
          const hex = oklchToHex(entry.light);
          return `
          <div class="prim-swatch">
            <div class="prim-tile" style="background:${hex}"></div>
            <div class="prim-step">${step}</div>
            <div class="prim-hex"><code>${hex}</code></div>
          </div>`;
        })
        .join("");
      return `
      <div class="prim-row">
        <div class="prim-hue-name">${escapeHtml(hue)}</div>
        <div class="prim-tiles">${swatches}</div>
      </div>`;
    })
    .join("\n");

  return `
<section class="section">
  <h2>Color</h2>
  <h3>Semantic tokens</h3>
  <div class="sem-grid">
    ${semanticRows}
  </div>
  <h3>Primitive scales</h3>
  <div class="prim-grid">
    ${hueRows}
  </div>
</section>`;
}

function renderTypography(system: DesignSystem): string {
  const samples = system.typography.hierarchy
    .map((t) => {
      const sentence = "The quick brown fox jumps over the lazy dog.";
      const spec = `${t.size} / weight ${t.weight} / lh ${t.lineHeight} / ls ${t.letterSpacing}`;
      return `
      <div class="type-row">
        <div class="type-sample" style="${escapeHtml(styleSpec(t))}">${sentence}</div>
        <div class="type-meta">
          <span class="type-role">${escapeHtml(t.role)}</span>
          <span class="type-spec"><code>${escapeHtml(spec)}</code></span>
        </div>
      </div>`;
    })
    .join("\n");

  const principles = system.typography.principles
    .map((p) => `<li>${escapeHtml(p)}</li>`)
    .join("\n");

  return `
<section class="section">
  <h2>Typography</h2>
  <div class="type-list">
    ${samples}
  </div>
  <h3>Principles</h3>
  <ul class="type-principles">
    ${principles}
  </ul>
</section>`;
}

function renderButtons(tokens: DesignTokens, system: DesignSystem): string {
  const sizes = ["sm", "md", "lg"] as const;
  const variants = ["primary", "secondary", "ghost"] as const;
  const sizesSpec = system.components.button.sizes;

  const rows = variants
    .map((variant) => {
      const cells = sizes
        .map((size) => {
          const sz = sizesSpec[size];
          const heightPx = pxFromTokenSpacing(tokens, sz.height) ?? 36;
          const padXPx = pxFromTokenSpacing(tokens, sz.paddingX) ?? 12;
          const radius = pxFromTokenRadius(tokens, sz.radius) ?? "6px";
          const fontInfo = fontSizeFromTokenStyle(tokens, sz.fontSize);
          const fontSize = fontInfo ? `${fontInfo.fontSize}px` : "14px";
          const fontWeight = fontInfo ? fontInfo.fontWeight : 500;

          const bgRef = componentSemantic(tokens, "button", variant, "bg");
          const textRef = componentSemantic(tokens, "button", variant, "text");
          const borderRef = componentSemantic(tokens, "button", variant, "border");

          const bg =
            bgRef === "transparent"
              ? "transparent"
              : bgRef
                ? semanticHex(tokens, bgRef)
                : "transparent";
          const color = textRef ? semanticHex(tokens, textRef) : "#000";
          const border = borderRef
            ? `1px solid ${semanticHex(tokens, borderRef)}`
            : variant === "ghost"
              ? "1px solid var(--color-border-default)"
              : "1px solid transparent";

          const style =
            `height:${heightPx}px;` +
            `padding:0 ${padXPx}px;` +
            `border-radius:${radius};` +
            `background:${bg};` +
            `color:${color};` +
            `border:${border};` +
            `font-size:${fontSize};` +
            `font-weight:${fontWeight};` +
            `font-family:inherit;` +
            `cursor:pointer;` +
            `display:inline-flex;align-items:center;justify-content:center;`;
          return `<button class="btn" style="${style}">${variant} ${size}</button>`;
        })
        .join("");
      return `<div class="btn-row"><div class="btn-row-label">${variant}</div><div class="btn-row-cells">${cells}</div></div>`;
    })
    .join("\n");

  return `
<div class="comp-block">
  <h3>Buttons</h3>
  <div class="btn-grid">
    ${rows}
  </div>
</div>`;
}

function renderInputs(tokens: DesignTokens, system: DesignSystem): string {
  const inp = system.components.input;
  const heightPx = pxFromTokenSpacing(tokens, inp.fieldHeight) ?? 40;
  const padXPx = pxFromTokenSpacing(tokens, inp.fieldPaddingX) ?? 12;
  const radius = pxFromTokenRadius(tokens, inp.fieldRadius) ?? "6px";

  const states = [
    {
      label: "Default",
      bg: componentHex(tokens, "input", "default", "bg"),
      border: componentHex(tokens, "input", "default", "border"),
      placeholder: "Type here…",
      disabled: false,
      message: null as string | null,
    },
    {
      label: "Focus",
      bg: componentHex(tokens, "input", "default", "bg"),
      border: componentHex(tokens, "input", "focus", "border"),
      placeholder: "Type here…",
      disabled: false,
      message: null,
    },
    {
      label: "Error",
      bg: componentHex(tokens, "input", "default", "bg"),
      border: componentHex(tokens, "input", "error", "border"),
      placeholder: "Type here…",
      disabled: false,
      message: "This field has an error",
    },
    {
      label: "Disabled",
      bg: componentHex(tokens, "input", "disabled", "bg"),
      border: componentHex(tokens, "input", "disabled", "border"),
      placeholder: "Disabled",
      disabled: true,
      message: null,
    },
  ];

  const cells = states
    .map((s) => {
      const inputStyle =
        `height:${heightPx}px;` +
        `padding:0 ${padXPx}px;` +
        `border-radius:${radius};` +
        `background:${s.bg ?? "var(--color-bg-base)"};` +
        `border:1px solid ${s.border ?? "var(--color-border-default)"};` +
        `color:var(--color-text-primary);` +
        `width:100%;font-family:inherit;font-size:14px;` +
        (s.disabled ? "opacity:0.6;cursor:not-allowed;" : "");
      return `
      <div class="input-cell">
        <label class="input-label">${s.label}</label>
        <input class="input" placeholder="${escapeHtml(s.placeholder)}" ${s.disabled ? "disabled" : ""} style="${inputStyle}" />
        ${s.message ? `<div class="input-helper input-error">${escapeHtml(s.message)}</div>` : ""}
      </div>`;
    })
    .join("\n");

  return `
<div class="comp-block">
  <h3>Inputs</h3>
  <div class="input-grid">${cells}</div>
</div>`;
}

function renderCards(tokens: DesignTokens, system: DesignSystem): string {
  const c = system.components.card;
  const radius = pxFromTokenRadius(tokens, c.radius) ?? "8px";
  const padPx = pxFromTokenSpacing(tokens, c.contentPadding) ?? 24;
  const gapPx = pxFromTokenSpacing(tokens, c.contentGap) ?? 12;

  const cardBg = componentHex(tokens, "card", "default", "bg") ?? "var(--color-bg-subtle)";
  const cardBorder = componentHex(tokens, "card", "default", "border") ?? "var(--color-border-subtle)";
  const headerColor = componentHex(tokens, "card", "default", "headerText") ?? "var(--color-text-primary)";
  const bodyColor = componentHex(tokens, "card", "default", "bodyText") ?? "var(--color-text-secondary)";

  const raised = system.elevation.levels.find((l) => l.name === "Raised");
  const shadow = raised && raised.shadow !== "none" ? raised.shadow : "none";

  const buttonHex = semanticHex(tokens, "brand/primary");
  const buttonText = semanticHex(tokens, "white");

  const ctaStyle =
    `height:36px;padding:0 16px;border-radius:${pxFromTokenRadius(tokens, "radius.button") ?? "6px"};` +
    `background:${buttonHex};color:${buttonText};border:none;font-weight:500;font-family:inherit;cursor:pointer;`;

  const cardCommon = (variant: "default" | "compact") => {
    const padOverride = variant === "compact" ? Math.max(12, padPx - 8) : padPx;
    return (
      `background:${cardBg};` +
      `border:1px solid ${cardBorder};` +
      `border-radius:${radius};` +
      `padding:${padOverride}px;` +
      `box-shadow:${shadow};` +
      `display:flex;flex-direction:column;gap:${gapPx}px;`
    );
  };

  return `
<div class="comp-block">
  <h3>Cards</h3>
  <div class="card-grid">
    <div class="card" style="${cardCommon("default")}">
      <div style="color:${headerColor};font-weight:600;font-size:18px;">Default card</div>
      <div style="color:${bodyColor};font-size:14px;line-height:1.5;">A card uses semantic tokens for background, border, and text. The shadow follows the mood's elevation system.</div>
      <div><button style="${ctaStyle}">Action</button></div>
    </div>
    <div class="card card-compact" style="${cardCommon("compact")}">
      <div style="color:${headerColor};font-weight:600;font-size:16px;">Compact card</div>
      <div style="color:${bodyColor};font-size:13px;line-height:1.5;">A compact card has tighter padding for dense layouts.</div>
      <div><button style="${ctaStyle}">Action</button></div>
    </div>
  </div>
</div>`;
}

function renderBadges(tokens: DesignTokens, system: DesignSystem): string {
  const variants = ["default", "success", "error", "warning", "info"] as const;
  const sizes = system.components.badge.sizes;
  const sizeKeys = Object.keys(sizes);

  const rows = variants
    .map((variant) => {
      const cells = sizeKeys
        .map((sizeKey) => {
          const sz = sizes[sizeKey];
          const heightPx = pxFromTokenSpacing(tokens, sz.height) ?? 20;
          const padXPx = pxFromTokenSpacing(tokens, sz.paddingX) ?? 8;
          const radius = pxFromTokenRadius(tokens, sz.radius) ?? "9999px";
          const bg = componentHex(tokens, "badge", variant, "bg") ?? "var(--color-bg-muted)";
          const color = componentHex(tokens, "badge", variant, "text") ?? "var(--color-text-secondary)";
          const style =
            `height:${heightPx}px;padding:0 ${padXPx}px;border-radius:${radius};` +
            `background:${bg};color:${color};` +
            `display:inline-flex;align-items:center;font-size:11px;font-weight:500;letter-spacing:0.04em;text-transform:uppercase;`;
          return `<span class="badge" style="${style}">${variant}</span>`;
        })
        .join(" ");
      return `<div class="badge-row">${cells}</div>`;
    })
    .join("\n");

  return `
<div class="comp-block">
  <h3>Badges</h3>
  <div class="badge-grid">${rows}</div>
</div>`;
}

function renderDivider(tokens: DesignTokens): string {
  const line = semanticHex(tokens, "border/subtle");
  const labelColor = semanticHex(tokens, "text/muted");
  return `
<div class="comp-block">
  <h3>Divider</h3>
  <div class="divider" style="display:flex;align-items:center;gap:12px;">
    <div style="flex:1;height:1px;background:${line};"></div>
    <span style="color:${labelColor};font-size:12px;letter-spacing:0.04em;text-transform:uppercase;">Section break</span>
    <div style="flex:1;height:1px;background:${line};"></div>
  </div>
</div>`;
}

function renderComponents(tokens: DesignTokens, system: DesignSystem): string {
  return `
<section class="section">
  <h2>Components</h2>
  ${renderButtons(tokens, system)}
  ${renderInputs(tokens, system)}
  ${renderCards(tokens, system)}
  ${renderBadges(tokens, system)}
  ${renderDivider(tokens)}
</section>`;
}

function renderLayoutAndElevation(
  tokens: DesignTokens,
  system: DesignSystem,
): string {
  // Spacing visualizer
  const spacingItems = system.layout.spacing
    .map((s) => {
      const px = parseFloat(s.value) || 0;
      const width = Math.max(2, px);
      return `
      <div class="space-row">
        <div class="space-label"><code>spacing.${s.name}</code> = ${s.value}</div>
        <div class="space-bar" style="width:${width}px"></div>
      </div>`;
    })
    .join("\n");

  // Radius visualizer
  const radiusItems = system.layout.borderRadius
    .map((r) => {
      const value = r.value;
      return `
      <div class="radius-cell">
        <div class="radius-tile" style="border-radius:${value}"></div>
        <div class="radius-label">${escapeHtml(r.name)}</div>
        <div class="radius-value"><code>${escapeHtml(value)}</code></div>
      </div>`;
    })
    .join("\n");

  // Elevation
  const elevationCards = system.elevation.levels
    .map((lvl) => {
      const shadow = lvl.shadow === "none" ? "none" : lvl.shadow;
      return `
      <div class="elev-card" style="box-shadow:${shadow};">
        <div class="elev-name">${escapeHtml(lvl.name)} (level ${lvl.level})</div>
        <div class="elev-use">${escapeHtml(lvl.use)}</div>
      </div>`;
    })
    .join("\n");

  return `
<section class="section">
  <h2>Layout &amp; Elevation</h2>
  <h3>Spacing</h3>
  <div class="space-list">${spacingItems}</div>
  <h3>Border radius</h3>
  <div class="radius-grid">${radiusItems}</div>
  <h3>Elevation</h3>
  <div class="elev-list">${elevationCards}</div>
  <p class="elev-philosophy">${escapeHtml(system.elevation.philosophy)}</p>
</section>`;
}

function renderDosDonts(system: DesignSystem): string {
  const dos = system.dos
    .slice(0, 5)
    .map((d) => `<li><span class="check">✓</span> ${escapeHtml(d)}</li>`)
    .join("\n");
  const donts = system.donts
    .slice(0, 5)
    .map((d) => `<li><span class="cross">✕</span> ${escapeHtml(d)}</li>`)
    .join("\n");
  return `
<section class="section">
  <h2>Dos and Don'ts</h2>
  <div class="dos-grid">
    <div class="dos-col">
      <h3>Do</h3>
      <ul class="dos-list">${dos}</ul>
    </div>
    <div class="donts-col">
      <h3>Don't</h3>
      <ul class="donts-list">${donts}</ul>
    </div>
  </div>
</section>`;
}

// ─── CSS ─────────────────────────────────────────────────────────────────────

function buildCssVariables(tokens: DesignTokens): string {
  const semKeys = [
    ["bg/base", "--color-bg-base"],
    ["bg/subtle", "--color-bg-subtle"],
    ["bg/muted", "--color-bg-muted"],
    ["text/primary", "--color-text-primary"],
    ["text/secondary", "--color-text-secondary"],
    ["text/muted", "--color-text-muted"],
    ["border/default", "--color-border-default"],
    ["border/subtle", "--color-border-subtle"],
    ["brand/primary", "--color-brand-primary"],
    ["brand/secondary", "--color-brand-secondary"],
  ];
  const lines = semKeys
    .map(([role, varName]) => `  ${varName}: ${semanticHex(tokens, role)};`)
    .join("\n");
  return `:root {\n${lines}\n}`;
}

function buildPageCss(fontFamily: string): string {
  const safeFamily = JSON.stringify(fontFamily);
  return `
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #ffffff; color: var(--color-text-primary); }
body {
  font-family: ${safeFamily}, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  line-height: 1.5;
}
a { color: var(--color-brand-primary); }
code { font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.85em; background: var(--color-bg-subtle); padding: 1px 5px; border-radius: 3px; }

.container { max-width: 1200px; margin: 0 auto; padding: 48px 32px 96px; }

/* Hero */
.hero { padding: 32px 0 48px; border-bottom: 1px solid var(--color-border-subtle); margin-bottom: 48px; }
.hero-meta { display: flex; gap: 16px; align-items: center; margin-bottom: 16px; font-size: 13px; }
.mood-badge { background: var(--color-brand-primary); color: #fff; padding: 4px 10px; border-radius: 9999px; font-weight: 500; letter-spacing: 0.02em; }
.brand { color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.08em; }
.hero-title { font-size: 56px; font-weight: 700; letter-spacing: -1.5px; margin: 0 0 12px; line-height: 1.1; }
.hero-desc { font-size: 18px; color: var(--color-text-secondary); margin: 0 0 24px; max-width: 720px; }
.hero-chips { display: flex; gap: 16px; margin-bottom: 32px; flex-wrap: wrap; }
.chip { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; border: 1px solid var(--color-border-subtle); border-radius: 9999px; background: var(--color-bg-subtle); }
.chip-swatch { width: 16px; height: 16px; border-radius: 50%; border: 1px solid rgba(0,0,0,0.08); }
.chip-label { font-size: 13px; color: var(--color-text-secondary); }
.atmosphere p { color: var(--color-text-secondary); max-width: 820px; line-height: 1.65; margin: 0 0 16px; }

/* Sections */
.section { margin-top: 64px; }
.section h2 { font-size: 32px; font-weight: 700; letter-spacing: -0.8px; margin: 0 0 24px; padding-bottom: 12px; border-bottom: 1px solid var(--color-border-subtle); }
.section h3 { font-size: 18px; font-weight: 600; margin: 32px 0 16px; color: var(--color-text-primary); }

/* Semantic tokens */
.sem-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
.sem-card { display: flex; gap: 12px; padding: 12px; border: 1px solid var(--color-border-subtle); border-radius: 8px; background: #fff; }
.sem-swatch { width: 56px; height: 56px; border-radius: 6px; border: 1px solid rgba(0,0,0,0.08); flex-shrink: 0; }
.sem-info { font-size: 12px; min-width: 0; }
.sem-role { font-weight: 600; color: var(--color-text-primary); }
.sem-ref { color: var(--color-text-muted); margin-top: 2px; }
.sem-hex { margin-top: 4px; }

/* Primitive scales */
.prim-grid { display: flex; flex-direction: column; gap: 16px; }
.prim-row { }
.prim-hue-name { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted); margin-bottom: 8px; }
.prim-tiles { display: grid; grid-template-columns: repeat(10, 1fr); gap: 6px; }
.prim-swatch { display: flex; flex-direction: column; align-items: stretch; }
.prim-tile { height: 56px; border-radius: 4px; border: 1px solid rgba(0,0,0,0.08); }
.prim-step { font-size: 11px; color: var(--color-text-muted); margin-top: 4px; text-align: center; }
.prim-hex { font-size: 10px; text-align: center; }
.prim-hex code { background: transparent; padding: 0; }

/* Typography */
.type-list { display: flex; flex-direction: column; gap: 28px; }
.type-row { padding-bottom: 20px; border-bottom: 1px dashed var(--color-border-subtle); }
.type-sample { color: var(--color-text-primary); margin-bottom: 8px; }
.type-meta { display: flex; gap: 12px; font-size: 12px; color: var(--color-text-muted); flex-wrap: wrap; }
.type-role { font-weight: 600; color: var(--color-text-secondary); }
.type-principles { color: var(--color-text-secondary); padding-left: 20px; line-height: 1.7; }

/* Components */
.comp-block { margin-bottom: 40px; }
.btn-grid { display: flex; flex-direction: column; gap: 16px; }
.btn-row { display: flex; align-items: center; gap: 16px; }
.btn-row-label { width: 80px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-text-muted); }
.btn-row-cells { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.input-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
.input-cell { display: flex; flex-direction: column; gap: 6px; }
.input-label { font-size: 12px; font-weight: 500; color: var(--color-text-secondary); }
.input-helper { font-size: 11px; }
.input-error { color: #b42318; }
.card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; max-width: 720px; }
.badge-grid { display: flex; flex-direction: column; gap: 12px; }
.badge-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

/* Spacing */
.space-list { display: flex; flex-direction: column; gap: 8px; }
.space-row { display: flex; align-items: center; gap: 16px; }
.space-label { width: 220px; font-size: 12px; color: var(--color-text-secondary); }
.space-bar { height: 14px; background: var(--color-brand-primary); border-radius: 2px; }

/* Radius */
.radius-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 16px; }
.radius-cell { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px; border: 1px solid var(--color-border-subtle); border-radius: 8px; background: #fff; }
.radius-tile { width: 50px; height: 50px; background: var(--color-brand-primary); }
.radius-label { font-size: 12px; font-weight: 600; color: var(--color-text-primary); }
.radius-value { font-size: 11px; color: var(--color-text-muted); }

/* Elevation */
.elev-list { display: flex; flex-direction: column; gap: 24px; max-width: 480px; }
.elev-card { padding: 20px; background: #fff; border-radius: 8px; }
.elev-name { font-weight: 600; }
.elev-use { color: var(--color-text-muted); font-size: 13px; margin-top: 4px; }
.elev-philosophy { color: var(--color-text-muted); font-style: italic; margin-top: 16px; }

/* Dos & Donts */
.dos-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
.dos-list, .donts-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; font-size: 14px; }
.dos-list li, .donts-list li { display: flex; gap: 8px; align-items: flex-start; line-height: 1.5; }
.check { color: #059669; font-weight: 700; }
.cross { color: #dc2626; font-weight: 700; }
@media (max-width: 720px) {
  .dos-grid { grid-template-columns: 1fr; }
  .prim-tiles { grid-template-columns: repeat(5, 1fr); }
}
`;
}

// ─── Page renderers ──────────────────────────────────────────────────────────

export function renderShowcaseHtml(
  mood: MoodArchetype,
  archetype: ArchetypePreset,
  result: GenerateResult,
): string {
  const { system, tokens } = result;
  const fontFamily = system.typography.families.primary;
  const primaryHex = semanticHex(tokens, "brand/primary");

  const cssVars = buildCssVariables(tokens);
  const pageCss = buildPageCss(fontFamily);
  const fontHref = googleFontsHref(fontFamily);
  const monoHref = googleFontsHref("JetBrains Mono");

  const body = [
    renderHeader(archetype, system, primaryHex, fontFamily),
    renderColorPalette(tokens),
    renderTypography(system),
    renderComponents(tokens, system),
    renderLayoutAndElevation(tokens, system),
    renderDosDonts(system),
  ].join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(archetype.label)} — ${escapeHtml(system.brandName)} Mood Showcase</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${fontHref}">
<link rel="stylesheet" href="${monoHref}">
<style>
${cssVars}
${pageCss}
</style>
</head>
<body>
<div class="container">
${body}
<footer style="margin-top:80px;padding-top:24px;border-top:1px solid var(--color-border-subtle);font-size:12px;color:var(--color-text-muted);">
  <a href="index.html">← Back to all moods</a>
</footer>
</div>
</body>
</html>`;
}

export function renderIndexHtml(summaries: ShowcaseSummary[]): string {
  const cards = summaries
    .map(
      (s) => `
    <a class="mood-card" href="${escapeHtml(s.mood)}.html">
      <div class="mood-card-head">
        <span class="mood-card-swatch" style="background:${escapeHtml(s.primary)}"></span>
        <span class="mood-card-title">${escapeHtml(s.archetype.label)}</span>
      </div>
      <p class="mood-card-desc">${escapeHtml(s.archetype.description)}</p>
      <div class="mood-card-meta">
        <span><strong>Font:</strong> ${escapeHtml(s.archetype.defaultFont)}</span>
        <span><strong>Primary:</strong> <code>${escapeHtml(s.primary)}</code></span>
      </div>
    </a>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Design System Mood Showcase</title>
<style>
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fafafa; color: #111; font-family: "Inter", system-ui, -apple-system, sans-serif; }
.container { max-width: 1100px; margin: 0 auto; padding: 64px 32px; }
h1 { font-size: 48px; font-weight: 700; letter-spacing: -1.4px; margin: 0 0 12px; }
.subtitle { font-size: 18px; color: #555; margin: 0 0 48px; max-width: 640px; }
code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.85em; background: #eee; padding: 1px 5px; border-radius: 3px; }
.mood-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
.mood-card { display: flex; flex-direction: column; gap: 10px; padding: 24px; background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; text-decoration: none; color: inherit; transition: transform 0.15s ease, box-shadow 0.15s ease; }
.mood-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.mood-card-head { display: flex; align-items: center; gap: 12px; }
.mood-card-swatch { width: 24px; height: 24px; border-radius: 50%; border: 1px solid rgba(0,0,0,0.08); }
.mood-card-title { font-size: 18px; font-weight: 600; }
.mood-card-desc { font-size: 14px; color: #555; margin: 0; line-height: 1.5; }
.mood-card-meta { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #777; margin-top: 8px; }
</style>
</head>
<body>
<div class="container">
  <h1>Design System Mood Showcase</h1>
  <p class="subtitle">Five moods, one brand. Each card links to a fully rendered preview generated from the same primary color and brand name.</p>
  <div class="mood-grid">
${cards}
  </div>
</div>
</body>
</html>`;
}
