import { describe, it, expect } from "vitest";
import { generate } from "../../src/generator/index.js";
import { getArchetype } from "../../src/schema/archetypes.js";
import {
  renderShowcaseHtml,
  renderIndexHtml,
} from "../../scripts/render-html.js";
import type { PresetName } from "../../src/schema/presets.js";

const ALL_PRESETS: PresetName[] = [
  "clean-minimal",
  "warm-friendly",
  "bold-energetic",
  "professional",
  "playful-creative",
];

const PRIMARY = "#5e6ad2";

function gen(preset: PresetName) {
  const archetype = getArchetype(preset);
  const result = generate(
    {
      brandName: "Acme",
      brandColor: PRIMARY,
      fontFamily: "Inter",
    },
    archetype,
  );
  return { archetype, result };
}

describe("renderShowcaseHtml", () => {
  for (const preset of ALL_PRESETS) {
    it(`renders a non-empty page with key markers for ${preset}`, () => {
      const { archetype, result } = gen(preset);
      const html = renderShowcaseHtml(preset, archetype, result);

      expect(html.length).toBeGreaterThan(5_000);
      expect(html.startsWith("<!doctype html>")).toBe(true);
      // Labels containing '&' are HTML-escaped to '&amp;'
      const escapedLabel = archetype.label.replace(/&/g, "&amp;");
      expect(html).toContain(escapedLabel);
      expect(html).toContain("Acme");
      // Section headings
      expect(html).toContain("Color");
      expect(html).toContain("Typography");
      expect(html).toContain("Components");
      expect(html).toContain("Layout");
      // Includes some semantic-derived hex (presence of # markers)
      expect(html).toMatch(/#[0-9a-f]{6}/i);
    });
  }

  it("does not contain unresolved {{placeholders}}", () => {
    const { archetype, result } = gen("clean-minimal");
    const html = renderShowcaseHtml("clean-minimal", archetype, result);
    expect(html).not.toMatch(/\{\{[^}]+\}\}/);
  });
});

describe("renderIndexHtml", () => {
  it("produces 5 anchor tags linking to each preset page", () => {
    const summaries = ALL_PRESETS.map((preset) => ({
      preset,
      archetype: getArchetype(preset),
      primary: PRIMARY,
    }));
    const html = renderIndexHtml(summaries);
    const anchors = html.match(/<a\b[^>]*\bhref="[^"]+\.html"/g) ?? [];
    expect(anchors.length).toBe(5);
    for (const preset of ALL_PRESETS) {
      expect(html).toContain(`href="${preset}.html"`);
      const escapedLabel = getArchetype(preset).label.replace(/&/g, "&amp;");
      expect(html).toContain(escapedLabel);
    }
  });

  it("includes the primary color chip on each card", () => {
    const summaries = ALL_PRESETS.map((preset) => ({
      preset,
      archetype: getArchetype(preset),
      primary: PRIMARY,
    }));
    const html = renderIndexHtml(summaries);
    expect(html).toContain(PRIMARY);
  });
});
