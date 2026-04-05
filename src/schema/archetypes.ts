// src/schema/archetypes.ts

import type { MoodArchetype, ArchetypePreset } from "./types.js";

const FONT_FALLBACK = "system-ui, -apple-system, sans-serif";
const MONO_FALLBACK = "ui-monospace, SFMono-Regular, Consolas, monospace";

export const ARCHETYPES: Record<MoodArchetype, ArchetypePreset> = {
  "clean-minimal": {
    mood: "clean-minimal",
    label: "Clean & Minimal",
    description:
      "Restrained, gallery-like emptiness where every element earns its pixel",
    neutralUndertone: "neutral",
    shadowIntensity: "whisper",
    fontWeights: { heading: 600, ui: 500, body: 400 },
    headingLetterSpacing: "-2.4px",
    bodyLineHeight: "1.50",
    headingLineHeight: "1.10",
    sectionSpacing: "80px",
    componentSpacing: "24px",
    buttonRadius: "6px",
    cardRadius: "8px",
    inputRadius: "6px",
    pillRadius: "9999px",
    defaultFont: "Inter",
    defaultFontFallback: FONT_FALLBACK,
    monoFont: "JetBrains Mono",
    monoFontFallback: MONO_FALLBACK,
    suggestedFonts: [
      { name: "Inter", fallback: FONT_FALLBACK },
      { name: "Geist", fallback: FONT_FALLBACK },
      { name: "IBM Plex Sans", fallback: FONT_FALLBACK },
      { name: "Satoshi", fallback: FONT_FALLBACK },
    ],
    atmosphereTemplate: `{{brandName}} lives in a restrained, monochrome world where silence is the primary design material. Every surface is white or near-white, interrupted only by the precise application of {{primaryHex}} — a single chromatic statement that carries all the brand's energy without competing with content.

Typography set in {{fontFamily}} with aggressive negative letter-spacing creates the taut, considered tension of editorial design. Headings compress toward each other; body text breathes with measured restraint. Shadow is used as border: instead of strokes, depth is implied through the faintest whisper of box-shadow — 0 1px 3px rgba(0,0,0,0.06) — so surfaces appear to float rather than sit.

The three-weight system (600/500/400) enforces a strict visual hierarchy without resorting to size alone. Generous whitespace between sections (80px) and precise component spacing (24px) ensure the layout reads as intentional silence rather than emptiness.`,
    characteristics: [
      "Monochrome palette with a single chromatic accent",
      "Aggressive negative letter-spacing on headings (−2.4px)",
      "Shadow-as-border: surfaces float via whisper-level box-shadow",
      "Three-weight type system: 600 heading / 500 UI / 400 body",
      "White and near-white surfaces dominate the canvas",
      "Generous section spacing (80px) that reads as editorial breath",
      "Restrained border-radius (6–8px) for crisp, gallery-like edges",
      "Every element earns its presence — no decorative flourishes",
    ],
    dos: [
      "Use aggressive negative letter-spacing (−2.4px) on all headings",
      "Rely on shadow instead of border for surface separation",
      "Limit the palette to neutral grays plus one precise accent hex",
      "Apply the three-weight system strictly: 600/500/400",
      "Preserve large whitespace zones between sections",
      "Keep border-radius small and consistent (6–8px)",
      "Let typographic scale carry the visual hierarchy",
      "Use {{fontFamily}} or another geometric grotesque for crisp neutrality",
    ],
    donts: [
      "Don't add decorative illustrations or gradients",
      "Don't use more than one accent color family",
      "Don't soften headings with loose or positive letter-spacing",
      "Don't crowd components — respect the 24px component spacing minimum",
      "Don't use heavy drop-shadows that break the floating surface effect",
      "Don't introduce a fourth font weight without a clear semantic role",
      "Don't use rounded pill buttons outside of tag/badge contexts",
    ],
  },

  "warm-friendly": {
    mood: "warm-friendly",
    label: "Warm & Friendly",
    description:
      "Approachable warmth with generous spacing and organic feel",
    neutralUndertone: "warm",
    shadowIntensity: "subtle",
    fontWeights: { heading: 500, ui: 500, body: 400 },
    headingLetterSpacing: "-0.5px",
    bodyLineHeight: "1.60",
    headingLineHeight: "1.20",
    sectionSpacing: "72px",
    componentSpacing: "24px",
    buttonRadius: "8px",
    cardRadius: "12px",
    inputRadius: "8px",
    pillRadius: "9999px",
    defaultFont: "DM Sans",
    defaultFontFallback: FONT_FALLBACK,
    monoFont: "DM Mono",
    monoFontFallback: MONO_FALLBACK,
    suggestedFonts: [
      { name: "DM Sans", fallback: FONT_FALLBACK },
      { name: "Plus Jakarta Sans", fallback: FONT_FALLBACK },
      { name: "Nunito Sans", fallback: FONT_FALLBACK },
      { name: "Source Sans 3", fallback: FONT_FALLBACK },
    ],
    atmosphereTemplate: `{{brandName}} wraps visitors in a warm parchment canvas — neutrals tinted with yellow-brown undertones rather than cool blue-gray. The palette anchors around {{primaryHex}}, chosen to harmonise with amber and ochre tones in the neutral scale, creating a sense of sunlit approachability.

{{fontFamily}} is selected for its rounded terminals and optical friendliness. At weight 500 for both headings and UI and 400 for body, the hierarchy feels collaborative rather than commanding. Generous line-height (1.60 body / 1.20 headings) lets every sentence breathe, inviting readers to slow down and stay.

Rounded corners (8px buttons, 12px cards) echo the softness of the type without tipping into childishness. Subtle shadows — slightly warmer in hue than pure black — ground cards just enough to feel tangible, like objects resting on a warm wooden surface.`,
    characteristics: [
      "Warm parchment canvas: neutrals tinted yellow-brown, never cool gray",
      "Medium font weight (500) for both headings and UI elements",
      "Generous body line-height (1.60) for an inviting reading experience",
      "Slightly rounded corners (8px / 12px) that feel organic, not sharp",
      "Subtle warm-tinted shadows instead of cold black drop-shadows",
      "Accent color chosen to harmonise with amber and ochre undertones",
      "Soft typographic hierarchy — approachable, never commanding",
      "Ample component spacing (24px) and section spacing (72px)",
    ],
    dos: [
      "Use warm-tinted neutrals (yellow-brown undertone) throughout",
      "Set body line-height to 1.60 for maximum readability and warmth",
      "Choose {{fontFamily}} or another humanist sans with rounded terminals",
      "Keep border-radius at 8–12px for an organic but refined feel",
      "Tint shadows very slightly warm — avoid pure black box-shadows",
      "Pair {{primaryHex}} with amber/ochre neutrals for colour harmony",
      "Maintain generous 72px section spacing for an airy layout",
      "Use medium weight (500) headings to feel collaborative, not authoritative",
    ],
    donts: [
      "Don't use cool blue-gray neutrals — they kill the warmth immediately",
      "Don't apply tight line-height (below 1.50) on body text",
      "Don't use sharp 0–4px border-radius on interactive elements",
      "Don't apply heavy or cold shadows that look clinical",
      "Don't use ultra-bold (700+) headings that feel aggressive",
      "Don't crowd white space — preserve the generous, breathing layout",
      "Don't introduce neon or highly saturated accent colors",
    ],
  },

  "bold-energetic": {
    mood: "bold-energetic",
    label: "Bold & Energetic",
    description:
      "High-contrast confidence with dramatic presence and pill-shaped CTAs",
    neutralUndertone: "neutral",
    shadowIntensity: "dramatic",
    fontWeights: { heading: 700, ui: 600, body: 400 },
    headingLetterSpacing: "-1.0px",
    bodyLineHeight: "1.50",
    headingLineHeight: "1.05",
    sectionSpacing: "96px",
    componentSpacing: "24px",
    buttonRadius: "9999px",
    cardRadius: "16px",
    inputRadius: "12px",
    pillRadius: "9999px",
    defaultFont: "Montserrat",
    defaultFontFallback: FONT_FALLBACK,
    monoFont: "Fira Code",
    monoFontFallback: MONO_FALLBACK,
    suggestedFonts: [
      { name: "Montserrat", fallback: FONT_FALLBACK },
      { name: "Sora", fallback: FONT_FALLBACK },
      { name: "Space Grotesk", fallback: FONT_FALLBACK },
      { name: "Outfit", fallback: FONT_FALLBACK },
    ],
    atmosphereTemplate: `{{brandName}} commands attention from the first viewport. A bold dark canvas — deep near-black backgrounds offset against {{primaryHex}} in full saturation — creates cinematic contrast that reads as confident authority. This is design that announces itself.

{{fontFamily}} at weight 700 with −1.0px letter-spacing compresses headings into powerful blocks of text. The ultra-tight heading line-height (1.05) stacks display copy like billboard lettering. Body text at 400/1.50 provides the readable counterpoint that makes the bold moments land harder by contrast.

All primary CTAs use pill radius (9999px), transforming buttons into capsules that pulse with energy. Dramatic drop-shadows — multi-layer and deep — elevate cards off the surface. The overall effect is a design system built for launches, campaigns, and products that need to move people to act.`,
    characteristics: [
      "Bold dark canvas with high-contrast {{primaryHex}} accents",
      "700-weight headings with ultra-tight line-height (1.05)",
      "Pill-radius (9999px) primary CTAs that capsulize energy",
      "Dramatic multi-layer box-shadows for strong card elevation",
      "600-weight UI elements for assertive navigation and labels",
      "Negative letter-spacing (−1.0px) on headings for billboard compression",
      "Large section spacing (96px) creating dramatic scene transitions",
      "16px card radius for modern rounded presence without softness",
    ],
    dos: [
      "Use weight 700 for all headings — never drop below 600",
      "Apply pill-radius (9999px) to all primary call-to-action buttons",
      "Set heading line-height to 1.05 for billboard-style impact",
      "Use dramatic multi-layer shadows on cards and modals",
      "Maximise contrast: pair {{primaryHex}} against deep near-black surfaces",
      "Choose {{fontFamily}} or another geometric sans with strong weight range",
      "Maintain 96px section spacing for cinematic scene separation",
      "Use 600-weight for UI labels, nav items, and secondary actions",
    ],
    donts: [
      "Don't use light (300) or regular (400) font weights for headings",
      "Don't use sharp-cornered (0–4px) buttons — pill radius is the signature",
      "Don't apply whisper-level shadows — they undermine the dramatic presence",
      "Don't use muted or desaturated accent colors that read as timid",
      "Don't crowd section spacing below 80px — the drama needs room",
      "Don't mix too many type weights in a single component",
      "Don't use warm-tinted neutrals — maintain cool-to-neutral base tones",
    ],
  },

  "professional": {
    mood: "professional",
    label: "Professional & Trustworthy",
    description:
      "Precise, premium, and quietly authoritative with cool-tinted depth",
    neutralUndertone: "cool",
    shadowIntensity: "medium",
    fontWeights: { heading: 300, ui: 400, body: 300 },
    headingLetterSpacing: "-1.4px",
    bodyLineHeight: "1.40",
    headingLineHeight: "1.10",
    sectionSpacing: "80px",
    componentSpacing: "16px",
    buttonRadius: "4px",
    cardRadius: "8px",
    inputRadius: "4px",
    pillRadius: "9999px",
    defaultFont: "Source Sans 3",
    defaultFontFallback: FONT_FALLBACK,
    monoFont: "Source Code Pro",
    monoFontFallback: MONO_FALLBACK,
    suggestedFonts: [
      { name: "Source Sans 3", fallback: FONT_FALLBACK },
      { name: "Instrument Sans", fallback: FONT_FALLBACK },
      { name: "General Sans", fallback: FONT_FALLBACK },
      { name: "Switzer", fallback: FONT_FALLBACK },
    ],
    atmosphereTemplate: `{{brandName}} speaks with the quiet authority of a well-prepared brief. Light weight (300) is the luxury signal here — not boldness, but precision. {{fontFamily}} at 300 with −1.4px letter-spacing on headings achieves the taut, premium tension of a financial institution or legal technology platform.

The neutral palette tilts cool: slate-blue-gray tones with a hint of indigo depth. Shadows carry this cool signature — rgba(15,23,42,0.12) rather than warm brown, creating a sense of crisp professional depth. {{primaryHex}} is the single chromatic accent, deployed surgically in active states, CTAs, and data highlights.

Conservative border-radius (4px buttons and inputs, 8px cards) signals precision engineering. The tighter component spacing (16px) creates a dense, information-rich layout appropriate for dashboards, SaaS tools, and enterprise software where efficiency communicates respect for the user's time.`,
    characteristics: [
      "Light weight 300 as the luxury signal — precision over boldness",
      "Cool-tinted neutrals (slate-blue-gray with indigo undertone)",
      "Tight negative letter-spacing (−1.4px) on headings for editorial tension",
      "Conservative border-radius (4px) signaling engineering precision",
      "Cool-hued shadows — slate-blue, not warm brown",
      "Dense component spacing (16px) for information-rich layouts",
      "{{primaryHex}} deployed surgically in active states and CTAs only",
      "UI weight 400 provides clear separation from the 300 content weight",
    ],
    dos: [
      "Use weight 300 for both headings and body — it is the luxury differentiator",
      "Apply −1.4px letter-spacing on all headings for premium tautness",
      "Maintain cool-tinted neutrals throughout — no warm grays",
      "Keep border-radius conservative: 4px for interactive elements, 8px for cards",
      "Use cool-hued shadows that reinforce the professional depth",
      "Deploy {{primaryHex}} sparingly — active states, primary CTAs, key data",
      "Tighten component spacing to 16px for information-dense interfaces",
      "Choose {{fontFamily}} or another optical-size-aware humanist sans",
    ],
    donts: [
      "Don't use bold (600+) headings — weight 300 is the intentional choice",
      "Don't use warm-tinted neutrals or parchment backgrounds",
      "Don't apply generous rounded corners (12px+) — they undermine precision",
      "Don't use warm brown-tinted shadows — keep them cool and precise",
      "Don't over-apply the accent color — restraint signals confidence",
      "Don't use decorative typefaces or italic display fonts",
      "Don't increase component spacing beyond 20px — density conveys competence",
    ],
  },

  "playful-creative": {
    mood: "playful-creative",
    label: "Playful & Creative",
    description:
      "Energetic, colorful, and expressive with generous rounding and personality",
    neutralUndertone: "warm",
    shadowIntensity: "medium",
    fontWeights: { heading: 600, ui: 500, body: 400 },
    headingLetterSpacing: "-0.5px",
    bodyLineHeight: "1.55",
    headingLineHeight: "1.15",
    sectionSpacing: "64px",
    componentSpacing: "20px",
    buttonRadius: "12px",
    cardRadius: "20px",
    inputRadius: "12px",
    pillRadius: "9999px",
    defaultFont: "Nunito Sans",
    defaultFontFallback: FONT_FALLBACK,
    monoFont: "Fira Code",
    monoFontFallback: MONO_FALLBACK,
    suggestedFonts: [
      { name: "Nunito Sans", fallback: FONT_FALLBACK },
      { name: "Poppins", fallback: FONT_FALLBACK },
      { name: "Quicksand", fallback: FONT_FALLBACK },
      { name: "Comfortaa", fallback: FONT_FALLBACK },
    ],
    atmosphereTemplate: `{{brandName}} enters with a burst of creative energy — rounded, colorful, and unapologetically expressive. The design system embraces generous rounding (12px buttons, 20px cards) that echo the playful geometry of illustration and icon design. Every surface has personality.

{{fontFamily}} brings the rounded terminals and optical friendliness that make creative products feel inviting to everyone. At weight 600 for headings with slight negative tracking (−0.5px), the typography is confident but never intimidating. Body at 400/1.55 keeps long-form content accessible and warm.

{{primaryHex}} anchors a colorful accent palette — secondary and tertiary hues are welcome as long as they harmonize. Warm neutrals provide the breathing room between vibrant moments. Medium-depth shadows (warm-tinted) ensure elements feel tangible without losing the light, bouncy energy that defines this archetype.`,
    characteristics: [
      "Generous rounding throughout: 12px buttons, 20px cards",
      "{{fontFamily}} with rounded terminals for maximum approachability",
      "Colorful accent palette — {{primaryHex}} plus complementary hues welcome",
      "Warm neutral backgrounds that provide breathing room between vibrant moments",
      "600-weight headings that are confident but never aggressive",
      "Elevated body line-height (1.55) for an inviting, unhurried reading experience",
      "Medium warm-tinted shadows that keep surfaces tangible and bouncy",
      "Expressive personality — illustration, icon, and color work encouraged",
    ],
    dos: [
      "Use generous border-radius: 12px for buttons/inputs, 20px for cards",
      "Embrace colorful accents — {{primaryHex}} can be paired with complementary hues",
      "Choose {{fontFamily}} or another rounded sans for maximum personality",
      "Keep body line-height at 1.55 for an accessible, warm reading experience",
      "Use warm-tinted neutrals to harmonise with vibrant accents",
      "Apply medium warm-tinted shadows to keep cards tangible and energetic",
      "Integrate illustration, iconography, and color pops as first-class design elements",
      "Use 600-weight headings to project confidence without intimidation",
    ],
    donts: [
      "Don't use sharp corners (0–4px) — they conflict with the playful personality",
      "Don't limit the palette to a single neutral-plus-one-accent scheme",
      "Don't use cool blue-gray neutrals that drain the warmth",
      "Don't apply ultra-tight letter-spacing (below −1px) on headings",
      "Don't use weight 700+ headings that feel aggressive or corporate",
      "Don't apply whisper-level shadows — surfaces need tangible medium depth",
      "Don't strip out personality features (illustration zones, color blocks) in the name of minimalism",
    ],
  },
};

export function getArchetype(mood: MoodArchetype): ArchetypePreset {
  return ARCHETYPES[mood];
}
