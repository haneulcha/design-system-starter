import { describe, it, expect } from "vitest";
import { generate } from "../../src/generator/index.js";
import { getArchetype } from "../../src/schema/archetypes.js";
import {
  renderShowcaseHtml,
  renderIndexHtml,
} from "../../scripts/render-html.js";
import type { MoodArchetype } from "../../src/schema/types.js";

const ALL_MOODS: MoodArchetype[] = [
  "clean-minimal",
  "warm-friendly",
  "bold-energetic",
  "professional",
  "playful-creative",
];

const PRIMARY = "#5e6ad2";

function gen(mood: MoodArchetype) {
  const archetype = getArchetype(mood);
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
  for (const mood of ALL_MOODS) {
    it(`renders a non-empty page with key markers for ${mood}`, () => {
      const { archetype, result } = gen(mood);
      const html = renderShowcaseHtml(mood, archetype, result);

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
  it("produces 5 anchor tags linking to each mood page", () => {
    const summaries = ALL_MOODS.map((mood) => ({
      mood,
      archetype: getArchetype(mood),
      primary: PRIMARY,
    }));
    const html = renderIndexHtml(summaries);
    const anchors = html.match(/<a\b[^>]*\bhref="[^"]+\.html"/g) ?? [];
    expect(anchors.length).toBe(5);
    for (const mood of ALL_MOODS) {
      expect(html).toContain(`href="${mood}.html"`);
      const escapedLabel = getArchetype(mood).label.replace(/&/g, "&amp;");
      expect(html).toContain(escapedLabel);
    }
  });

  it("includes the primary color chip on each card", () => {
    const summaries = ALL_MOODS.map((mood) => ({
      mood,
      archetype: getArchetype(mood),
      primary: PRIMARY,
    }));
    const html = renderIndexHtml(summaries);
    expect(html).toContain(PRIMARY);
  });
});
