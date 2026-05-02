// src/schema/archetypes.ts

import type { MoodArchetype, ArchetypePreset } from "./types.js";

export const ARCHETYPES: Record<MoodArchetype, ArchetypePreset> = {
  "clean-minimal": {
    mood: "clean-minimal",
    label: "Clean & Minimal",
    description: "Restrained rounding, whisper shadow, contemporary lightness",
    neutralUndertone: "neutral",
    shadowIntensity: "whisper",
    sectionSpacing: "80px",
    componentSpacing: "24px",
    buttonRadius: "6px",
    cardRadius: "8px",
    inputRadius: "6px",
    pillRadius: "9999px",
    atmosphereTemplate: `{{brandName}} pursues clarity through subtraction. Light weight headings (400), neutral gray surfaces, and a whisper-level shadow system create an interface that feels almost weightless — the Vercel and Linear register where every removed pixel makes the remaining ones count more. Restraint is the entire design move.

Buttons sit at a tight 6px radius — near-rectangular, intentionally undecorated. {{fontFamily}} at weight 400 with −1.1px letter-spacing on headings gives display copy contemporary lightness without any editorial heaviness. Cards at 8px rounding match the buttons' restraint, and inputs share the same 6px radius for a consistent, quiet geometry.

Surfaces are nearly flat, separated only by whisper shadows that suggest hierarchy without dramatizing it. {{primaryHex}} carries particular impact precisely because nothing else competes — no warm tinting, no decorative depth, no excess rounding. {{brandName}} on this archetype communicates: we said exactly what was needed, and nothing more.`,
    characteristics: [
      "6px button radius for restrained, near-rectangular interactive precision",
      "Whisper-level shadow: surfaces are nearly flat, existing in light rather than space",
      "Compact card rounding (8px) that mirrors the button's quiet geometry",
      "Weight 400 headings with −1.1px letter-spacing for contemporary lightness",
      "Neutral undertone palette: clean, unbiased gray that refuses to tint",
      "500-weight UI elements providing interactive affordance without heaviness",
      "80px section spacing creating the airy, startup-product layout rhythm",
      "{{primaryHex}} landing with maximum impact on flat, shadow-free surfaces",
      "Consistent 6px input/button radius signaling system-wide geometric discipline",
    ],
    dos: [
      "Use 6px radius on buttons and inputs — restrained near-rectangular geometry is the signature",
      "Apply whisper-level shadows only: rgba(0,0,0,0.04) or lighter on elevated surfaces",
      "Set card radius to 8px — keep rounding quiet and proportional to the buttons",
      "Use weight 400 for headings — contemporary lightness over editorial compression",
      "Apply −1.1px letter-spacing on display headings for modern, considered character",
      "Choose {{fontFamily}} or another clean grotesque that reads well at 400 weight",
      "Maintain neutral gray undertones throughout — no warm or cool bias",
      "Keep component spacing generous at 24px to let the flat surfaces breathe",
      "Rely on {{primaryHex}} contrast against flat surfaces as the primary accent signal",
    ],
    donts: [
      "Don't use generous (12px+) button rounding — it undermines the restrained signature",
      "Don't use medium or dramatic shadows — flat surfaces are the aesthetic foundation",
      "Don't use warm or cool-tinted neutrals — stay on pure neutral gray",
      "Don't apply weight 700 headings that feel heavy against the light surface treatment",
      "Don't crowd section spacing below 64px — the lightness needs room",
      "Don't introduce decorative borders or dividers that break the flat surface aesthetic",
      "Don't over-apply the accent color — restraint is the signal",
      "Don't add gradient fills, illustration, or atmospheric depth effects",
    ],
  },

  "warm-friendly": {
    mood: "warm-friendly",
    label: "Warm & Friendly",
    description: "Subtle warm depth, generous rounding, atmospheric presence",
    neutralUndertone: "warm",
    shadowIntensity: "subtle",
    sectionSpacing: "72px",
    componentSpacing: "24px",
    buttonRadius: "8px",
    cardRadius: "12px",
    inputRadius: "8px",
    pillRadius: "9999px",
    atmosphereTemplate: `{{brandName}} creates an atmosphere before it communicates a message. The warm neutral undertone wraps the interface in a quality that feels considered and human — the Airbnb and Claude register where every surface invites rather than instructs. Subtle, warm-tinted shadows give cards and panels gentle lift without theatrical depth, keeping the system grounded in approachability.

{{fontFamily}} at weight 500 with −1.0px letter-spacing on headings achieves the balance between confident and approachable — present without overpowering. Generous rounding (8px buttons, 12px cards) softens every interaction without tipping into childishness. The 1.15 heading line-height allows display text to breathe slightly, giving it room to feel expressive rather than compressed.

{{primaryHex}} lands against the warm neutral canvas with particular resonance — the warmth in the background harmonizes with the brand color's undertones. The 72px section spacing creates a comfortable rhythm that feels neither rushed nor empty. {{brandName}} on this archetype communicates: we care about how this feels, not just how it works.`,
    characteristics: [
      "Subtle, warm-tinted shadow system creating gentle lift and human surface presence",
      "Warm neutral undertone: backgrounds tinted slightly warm, never cool blue-gray",
      "Generous rounding (8px buttons, 12px cards) that softens without becoming playful",
      "500-weight headings and UI: confident yet never aggressive or commanding",
      "Negative letter-spacing (−1.0px) giving headings considered, editorial presence",
      "Slightly open heading line-height (1.15) allowing display text room to breathe",
      "72px section spacing creating a comfortable, atmospheric layout rhythm",
      "{{primaryHex}} resonating warmly against the neutral canvas for brand cohesion",
      "Generous component spacing (24px) preventing crowding and allowing depth to read",
    ],
    dos: [
      "Use subtle, warm-tinted shadows that lift surfaces without dramatizing depth",
      "Apply warm-tinted neutrals throughout — this is the atmospheric foundation",
      "Set heading weight to 500 for confident presence without aggression",
      "Apply −1.0px letter-spacing on all headings for considered editorial character",
      "Keep border-radius generous but refined: 8px for interactions, 12px for cards",
      "Choose {{fontFamily}} or another humanist sans with rounded, approachable terminals",
      "Maintain 72px section spacing for a comfortable, layered layout rhythm",
      "Use warm shadow tints (rgba with slight orange/brown bias) over neutral grays",
      "Let {{primaryHex}} harmonize with warm neutral undertones for atmospheric cohesion",
    ],
    donts: [
      "Don't use cool blue-gray neutrals — they destroy the warm atmospheric quality",
      "Don't use medium or dramatic shadows — keep them subtle and warm-tinted",
      "Don't apply sharp corners (0–4px) — generous rounding is the signature",
      "Don't use weight 700+ headings — the system is friendly, not aggressive",
      "Don't crowd section spacing below 60px — the atmosphere needs room to breathe",
      "Don't use overly tight body line-height (below 1.45) — the system values readability",
      "Don't strip warmth in favor of neutral grays — warmth is a first-class design element here",
      "Don't use neon or highly saturated accents that clash with the warm palette",
    ],
  },

  "bold-energetic": {
    mood: "bold-energetic",
    label: "Bold & Energetic",
    description: "Bold typography, pill geometry, dramatic depth, commanding presence",
    neutralUndertone: "neutral",
    shadowIntensity: "dramatic",
    sectionSpacing: "80px",
    componentSpacing: "24px",
    buttonRadius: "9999px",
    cardRadius: "12px",
    inputRadius: "9999px",
    pillRadius: "9999px",
    atmosphereTemplate: `{{brandName}} makes its presence known through typographic authority. Bold headings at weight 700 with aggressive −2.0px letter-spacing compress display copy into powerful, commanding blocks — the kind of type that stops the eye and demands attention. This is the Spotify and Coinbase register: a system that has nothing to prove and everything to say.

{{fontFamily}} carries the weight with authority. The neutral palette — neither warm nor cool — refuses to distract from the typographic statement. Whitespace is not decoration; it is the frame that makes the bold moments land harder by contrast. Eighty-pixel section breaks create the breathing room that lets each statement resonate.

Dramatic shadows and pill-radius confidence (9999px buttons and inputs, 12px cards) signal that this system is unafraid of presence. Surfaces lift boldly off the canvas, and capsule interactions read as kinetic, ready-for-action moments. {{primaryHex}} anchors the single chromatic accent, appearing precisely where action is required. {{brandName}} built on this archetype says: we know exactly what we are doing.`,
    characteristics: [
      "700-weight headings with aggressive −2.0px letter-spacing for commanding display type",
      "Neutral undertone palette: neither warm nor cool, refusing to compete with typography",
      "Tight heading line-height (1.10) stacks display copy like editorial billboard lettering",
      "Pill-radius (9999px) primary buttons and inputs as kinetic, action-ready interactions",
      "Dramatic shadow system: surfaces lift boldly off the canvas with confident depth",
      "500-weight UI elements for assertive navigation and interactive labels",
      "80px section spacing that frames each typographic statement as its own moment",
      "{{primaryHex}} reserved strictly for primary actions and key interactive states",
      "12px card rounding harmonizing with pill interactions while keeping containers grounded",
    ],
    dos: [
      "Use weight 700 for all display headings — the bold weight is the signature",
      "Apply −2.0px letter-spacing on all headings for compressed, authoritative display",
      "Set heading line-height to 1.10 for tight, billboard-style typographic impact",
      "Use 500-weight for UI labels, nav items, and secondary actions",
      "Choose {{fontFamily}} or another high-quality grotesque with a strong weight range",
      "Maintain 80px section spacing to give each typographic moment room to breathe",
      "Use pill radius (9999px) on buttons and inputs — capsule geometry is the kinetic signal",
      "Apply dramatic shadows that lift surfaces boldly: rgba(15,23,42,0.18–0.24) range",
      "Deploy {{primaryHex}} exclusively for primary CTAs and active states",
    ],
    donts: [
      "Don't use light (300) or regular (400) font weights for headings",
      "Don't use warm or dramatically cool-tinted neutrals — stay neutral gray",
      "Don't apply loose or positive letter-spacing to headings",
      "Don't use whisper or subtle shadows — dramatic depth is the correct register",
      "Don't crowd section spacing below 64px — authority needs breathing room",
      "Don't mix sharp-cornered (0–4px) buttons with the system — pill radius is the signature",
      "Don't over-apply the accent color — it should appear precisely where action is needed",
      "Don't use decorative illustration or heavy visual ornamentation",
    ],
  },

  "professional": {
    mood: "professional",
    label: "Professional",
    description: "Sharp edges, light typography, structured restraint, anchored depth",
    neutralUndertone: "cool",
    shadowIntensity: "medium",
    sectionSpacing: "80px",
    componentSpacing: "16px",
    buttonRadius: "4px",
    cardRadius: "6px",
    inputRadius: "4px",
    pillRadius: "9999px",
    atmosphereTemplate: `{{brandName}} operates in the register of precision engineering — every decision deliberate, every pixel justified. Light weight (400 headings, 300 body) is the primary signal: here, restraint communicates confidence rather than boldness. The canvas is cool and calm, with {{primaryHex}} deployed surgically as the single chromatic statement. This is the Stripe and IBM register, where institutional trust is built through structural exactitude.

{{fontFamily}} at weight 400 with −0.7px letter-spacing on headings achieves the taut, considered tension of infrastructure design. Where other systems shout with weight, this one whispers with exactitude. Sharp corners (4px buttons, 6px cards) signal that nothing here is accidental — every edge is intentional.

Structured spacing — 16px component grid, 80px section intervals — creates a layout that reads like a well-organized data table. The medium shadow system anchors surfaces with confident depth, lifting them into a clear hierarchy without theatricality. {{brandName}} built on this archetype communicates: we have thought about everything so you don't have to.`,
    characteristics: [
      "Light weight (400/300) as the primary confidence signal — precision over boldness",
      "Cool-tinted neutrals: slate and cool gray throughout, never warm",
      "Sharp corners (4px buttons, 6px cards) signaling engineering exactitude",
      "Tight negative letter-spacing (−0.7px) on headings for editorial tension",
      "Dense component spacing (16px) for information-rich, structured layouts",
      "Medium shadow system: surfaces are anchored with confident, hierarchical depth",
      "{{primaryHex}} deployed surgically — active states, primary CTAs, key data highlights",
      "Compact body line-height (1.45) for a crisp, document-like reading experience",
      "Structural whitespace: 80px section breaks that read as intentional breath",
    ],
    dos: [
      "Use weight 400 for headings and weight 300 for body — restraint is the statement",
      "Apply −0.7px letter-spacing on all display headings for editorial tautness",
      "Maintain cool-tinted neutrals throughout — no warm grays or parchment tones",
      "Keep border-radius conservative: 4px for interactive elements, 6px for cards",
      "Use medium shadows that anchor surfaces with confident depth: rgba(15,23,42,0.10–0.14) range",
      "Deploy {{primaryHex}} sparingly — active states, primary CTAs, and data highlights only",
      "Tighten component spacing to 16px for information-dense, structured interfaces",
      "Choose {{fontFamily}} or another optical-size-aware grotesque for precision neutrality",
      "Let the type scale and spatial rhythm carry all hierarchy — no decorative additions",
    ],
    donts: [
      "Don't use bold (600+) headings — light weight is the intentional luxury differentiator",
      "Don't use warm-tinted neutrals or parchment backgrounds",
      "Don't apply generous rounded corners (12px+) — they undermine the precision signal",
      "Don't use whisper or dramatic shadows — medium depth is the correct, anchored register",
      "Don't over-apply the accent color — restraint signals confidence here",
      "Don't use decorative typefaces or italic display fonts",
      "Don't increase component spacing beyond 20px — density conveys structural competence",
      "Don't add decorative illustrations or gradient overlays",
    ],
  },

  "playful-creative": {
    mood: "playful-creative",
    label: "Playful & Creative",
    description: "Generous rounding, tactile depth, expressive multi-color rhythm",
    neutralUndertone: "warm",
    shadowIntensity: "medium",
    sectionSpacing: "96px",
    componentSpacing: "24px",
    buttonRadius: "12px",
    cardRadius: "16px",
    inputRadius: "10px",
    pillRadius: "9999px",
    atmosphereTemplate: `{{brandName}} treats the interface as a place to play. Generous 12px button rounding feels human and inviting — corners soft enough to read as friendly, restrained enough to stay grown-up. Cards lean further into the language at 16px, and inputs at 10px keep the rounded rhythm consistent across every interactive surface. This is the Figma and Clay register, where expressiveness is the entire point and design itself becomes part of the experience.

{{fontFamily}} at weight 600 with a mild −0.4px letter-spacing gives headings a confident, approachable presence — present and warm, never aggressive. The 1.15 heading line-height and 1.55 body line-height create unhurried, readable rhythm. Medium shadows give cards a tactile, slightly toy-like presence — surfaces feel like objects you could pick up, without ever tipping into cartoonish territory.

{{primaryHex}} lands boldly here, and the system invites vibrant accent moments alongside it — color is part of the voice, not a single restrained statement. Generous spacing (24px components, 96px sections) creates an unhurried, expressive layout rhythm where every element has space to express itself. {{brandName}} on this archetype says: we want you to enjoy being here.`,
    characteristics: [
      "Generous 12px button rounding that reads as human, inviting, and expressive",
      "Medium shadow system giving surfaces a tactile, slightly toy-like physical presence",
      "Warm neutral undertone supporting bold, multi-color accent moments",
      "600-weight headings with mild −0.4px letter-spacing — confident but never aggressive",
      "16px card rounding leaning further into the soft, hand-friendly geometry",
      "10px input rounding maintaining the rounded rhythm without competing with buttons",
      "Generous 24px component spacing and 96px section spacing for unhurried, expressive rhythm",
      "Open body line-height (1.55) giving text room to breathe and feel inviting",
      "{{primaryHex}} used boldly alongside vibrant accent moments — multi-color expression is welcome",
    ],
    dos: [
      "Use 12px button radius — generous rounding is the friendly, expressive signature",
      "Set card radius to 16px to deepen the soft, tactile geometry across containers",
      "Apply medium shadows that give surfaces tactile, slightly toy-like physical presence",
      "Use weight 600 headings with −0.4px letter-spacing — confident yet approachable",
      "Maintain warm-tinted neutrals throughout to ground the multi-color expression",
      "Choose {{fontFamily}} or another humanist sans with rounded, friendly terminals",
      "Use 96px section spacing for an unhurried, expressive page rhythm",
      "Embrace vibrant accent colors alongside {{primaryHex}} — color is part of the voice",
      "Set body line-height to 1.55 for open, inviting reading rhythm",
    ],
    donts: [
      "Don't use sharp corners (0–6px) on buttons — generous rounding is the human signal",
      "Don't use whisper or subtle shadows — surfaces need tactile medium depth to feel alive",
      "Don't use cool blue-gray neutrals — they sterilize the warm, expressive atmosphere",
      "Don't apply weight 700+ headings — the system is playful, not aggressive",
      "Don't crowd section spacing below 80px — expressiveness needs generous breath",
      "Don't restrict color to a single accent — multi-color expression is part of the voice",
      "Don't tighten body line-height below 1.50 — readability and warmth depend on the openness",
      "Don't strip ornament so aggressively that the system reads as institutional — playfulness is the point",
    ],
  },
};

export function getArchetype(mood: MoodArchetype): ArchetypePreset {
  return ARCHETYPES[mood];
}

/**
 * Fixed archetype used to drive typography/components/layout/elevation while
 * those categories await per-category inductive analysis (per the pivot
 * captured in docs/research/color-analysis-notes.md §1). Once each category
 * has its own functional-knob spec, the corresponding subsystem will move
 * off ARCHETYPES entirely.
 */
export const DEFAULT_ARCHETYPE: ArchetypePreset = ARCHETYPES.professional;
