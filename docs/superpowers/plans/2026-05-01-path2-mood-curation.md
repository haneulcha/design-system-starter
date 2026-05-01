# Path 2: Hand-Curated 5-Mood Production Switch

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace `src/schema/archetypes.ts` 4-archetype K-means presets with the 5 README moods (`clean-minimal`, `warm-friendly`, `bold-energetic`, `professional`, `playful-creative`), each backed by a curated token preset and the existing prose richness (atmosphere + characteristics + dos + donts).

**Architecture:** The existing pipeline already takes `ArchetypePreset` as the single source of truth for mood-driven token decisions. Generators read fields like `fontWeights`, `headingLetterSpacing`, `shadowIntensity`, `buttonRadius`, etc. — they do NOT switch on the mood string. So this work is mostly a schema swap: replace the enum values, replace the preset record, and update tests that hardcode mood names. No generator code needs to change beyond imports.

**Tech Stack:** TypeScript + Vitest. No new dependencies.

**Mapping from existing 4 archetypes → new 5 moods** (existing prose reused with token adjustments where README differs):

| Existing archetype | New mood | Reuse strategy |
|---|---|---|
| `precise` | `professional` | Reuse prose (precision/restraint themes). Adjust shadow `subtle` → `medium`, button radius `4px` → `4px` (match). |
| `confident` | `bold-energetic` | Reuse prose (commanding presence themes). Adjust shadow `subtle` → `dramatic`, button radius `6px` → `9999px` (pill). |
| `expressive` | `warm-friendly` | Reuse prose (warmth/organic themes). Adjust button radius `12px` → `8px`. Shadow stays `subtle`. |
| `modern` | `clean-minimal` | Reuse prose (lightness/forward themes). Adjust shadow `medium` → `whisper`, button radius likely already aligned (~6px). |
| (new) | `playful-creative` | Author fresh prose. Reference systems: Figma, Clay. 12px radius, medium shadow, expressive heading weights, multi-color palette. |

---

## Pre-flight

- [ ] Confirm on `feat/path2-mood-curation` branched from current main.
- [ ] `pnpm test` — 240/240 baseline pass.
- [ ] Read [`src/schema/archetypes.ts`](../../src/schema/archetypes.ts) end-to-end. Note the structure of each existing preset (fields, prose tone, suggested fonts).

---

### Task 1: Update `MoodArchetype` enum to 5 README values

**Files:**
- Modify: `src/schema/types.ts`

- [ ] **Step 1: Replace the enum**

Edit `src/schema/types.ts` line 5-9. Replace:

```ts
export type MoodArchetype =
  | "precise"
  | "confident"
  | "expressive"
  | "modern";
```

with:

```ts
export type MoodArchetype =
  | "clean-minimal"
  | "warm-friendly"
  | "bold-energetic"
  | "professional"
  | "playful-creative";
```

- [ ] **Step 2: Verify tsc fails as expected**

Run: `pnpm build`
Expected: many tsc errors — every `case "precise"` / `"confident"` / etc. across generators and tests becomes a type error. Capture the full list; Tasks 2-4 will fix them all.

- [ ] **Step 3: Commit (broken state — fixed in Task 2-3)**

```bash
git add src/schema/types.ts
git commit -m "feat(schema): switch MoodArchetype enum to README's 5 moods"
```

---

### Task 2: Rewrite the ARCHETYPES record with 5 mood presets

**Files:**
- Modify: `src/schema/archetypes.ts`

This task does the bulk of the curation work. Each new mood must have all `ArchetypePreset` fields populated. Strategy: copy the matched existing preset, rename the mood field, adjust the divergent values (radius/shadow), and lightly edit the prose to swap brand-archetype words ("precise" → "professional", etc.).

- [ ] **Step 1: Author `clean-minimal` preset**

Source: existing `modern` archetype. Adjustments per README:
- `shadowIntensity`: `"medium"` → `"whisper"`
- `buttonRadius`: keep at `"6px"` (matches README)
- `cardRadius`: align to ~`"8px"` if currently larger
- Prose: search-replace "modern" → "clean-minimal" / "minimalist" where it reads naturally; keep the rest

- [ ] **Step 2: Author `warm-friendly` preset**

Source: existing `expressive` archetype. Adjustments per README:
- `buttonRadius`: change from current to `"8px"`
- `shadowIntensity`: keep at `"subtle"` (matches README)
- Prose: search-replace "expressive" → "warm-friendly" / "approachable"; keep warmth/organic themes

- [ ] **Step 3: Author `bold-energetic` preset**

Source: existing `confident` archetype. Adjustments per README:
- `buttonRadius`: change from current to `"9999px"` (pill)
- `shadowIntensity`: change from `"subtle"` to `"dramatic"`
- Prose: search-replace "confident" → "bold-energetic" / "commanding"

- [ ] **Step 4: Author `professional` preset**

Source: existing `precise` archetype. Adjustments per README:
- `buttonRadius`: keep at `"4px"` (matches README)
- `shadowIntensity`: change from `"subtle"` to `"medium"`
- Prose: search-replace "precise" → "professional" / "precision"

- [ ] **Step 5: Author `playful-creative` preset (new from scratch)**

Reference systems: Figma, Clay. Per README: 12px radius, medium shadow.

Recommended values:
- `neutralUndertone`: `"warm"`
- `shadowIntensity`: `"medium"`
- `fontWeights`: `{ heading: 600, ui: 500, body: 400 }`
- `headingLetterSpacing`: `"-0.4px"`
- `bodyLineHeight`: `"1.55"`
- `headingLineHeight`: `"1.15"`
- `sectionSpacing`: `"96px"`
- `componentSpacing`: `"24px"`
- `buttonRadius`: `"12px"`
- `cardRadius`: `"16px"`
- `inputRadius`: `"10px"`
- `pillRadius`: `"9999px"`
- `defaultFont`: `"DM Sans"` (or `"Inter"` as conservative default)
- `monoFont`: `"JetBrains Mono"`
- `suggestedFonts`: `["DM Sans", "Sora", "Plus Jakarta Sans", "Manrope"]`

Author 3 paragraphs of `atmosphereTemplate` (mirror the structure of existing presets), 9 `characteristics`, 9 `dos`, 8 `donts`. Reference the playfulness of Figma's color usage and Clay's expressive radius scale. Keep the `{{brandName}}`, `{{primaryHex}}`, `{{fontFamily}}` template tokens.

- [ ] **Step 6: Replace the ARCHETYPES record**

Replace `src/schema/archetypes.ts` lines 8 onwards with a new `Record<MoodArchetype, ArchetypePreset>` that has exactly 5 entries keyed `"clean-minimal"`, `"warm-friendly"`, `"bold-energetic"`, `"professional"`, `"playful-creative"`. Keep `getArchetype` export.

- [ ] **Step 7: Verify tsc**

Run: `pnpm build`
Expected: tsc errors now confined to test files (which still reference old mood names). Generator code compiles clean.

- [ ] **Step 8: Commit**

```bash
git add src/schema/archetypes.ts
git commit -m "feat(schema): replace 4 archetypes with 5 README mood presets"
```

---

### Task 3: Update tests that reference old mood names

**Files:**
- Modify: `tests/schema/archetypes.test.ts`
- Modify: `tests/generator/components.test.ts`
- Modify: `tests/generator/typography.test.ts`
- Modify: `tests/generator/integration.test.ts`

- [ ] **Step 1: Inventory all test references to old mood names**

Run: `grep -n '"precise"\|"confident"\|"expressive"\|"modern"' tests/`

For each match, decide the new mood name based on the mapping table at the top of this plan. If a test asserts behavior that's mood-specific (e.g., "expects shadow=subtle for precise"), update both the mood name AND the expected value to match the new preset.

- [ ] **Step 2: Update `tests/schema/archetypes.test.ts`**

This file likely tests the structure of every preset. Update mood-string assertions to the new 5 names. If it asserts specific token values (e.g., `expect(preset.buttonRadius).toBe("4px")`), verify against the new presets in `src/schema/archetypes.ts` and update assertions.

If the test file iterates `Object.keys(ARCHETYPES)` and asserts count, it should now expect 5 keys, not 4.

- [ ] **Step 3: Update generator tests**

For each of `components.test.ts`, `typography.test.ts`, `integration.test.ts`: update mood string literals using the mapping table. Assertions on derived token values (button radius, shadow intensity) need updating to match the new preset values for the renamed mood.

- [ ] **Step 4: Run tests and iterate**

Run: `pnpm test`
Expected: all pass after the updates. If a test fails due to token-value drift (because Task 2 changed shadow intensity for some moods), update the assertion to reflect the new value.

- [ ] **Step 5: Commit**

```bash
git add tests/
git commit -m "test: update mood references from 4 archetypes to 5 README moods"
```

---

### Task 4: End-to-end CLI verification per mood

**Files:** None modified — exploratory verification.

- [ ] **Step 1: Run the CLI for each mood and inspect output**

For each of the 5 moods, run the CLI with a fixed brand name and color, capturing the generated `output/DESIGN.md`:

```bash
# Pseudo — adapt to actual CLI invocation. If CLI is interactive, write a small script
# that calls the generator function directly with each mood.
for mood in clean-minimal warm-friendly bold-energetic professional playful-creative; do
  echo "=== Generating for mood=$mood ==="
  npx tsx scripts/verify-mood.ts "$mood"  # see Step 2
done
```

- [ ] **Step 2: Author `scripts/verify-mood.ts` (verification script)**

Create a small script that calls the generator's main entry (likely `generateDesignSystem` from `src/generator/index.ts`) with `{ brandName: "Acme", primaryColor: "#5e6ad2", mood, fontFamily: "Inter" }` and writes the result to `tmp/verify-$mood/`. Inspect each output's button radius, shadow, and atmosphere paragraph to confirm the mood reads correctly.

This script is a one-shot — do NOT add it to package.json or commit it long-term. Add `scripts/verify-mood.ts` and `tmp/` to `.gitignore` if not already.

- [ ] **Step 3: Eyeball each generated DESIGN.md**

Open each of the 5 generated DESIGN.md files. For each, check:
- The atmosphere paragraph reads coherently for that mood (no leftover "precise" / "confident" / etc. references)
- Button radius matches expectation per README
- Shadow intensity matches expectation per README
- Suggested fonts make sense for the mood

If anything reads wrong, return to Task 2 and refine the offending preset's prose or values.

- [ ] **Step 4: Commit any refinements**

If Step 3 surfaces preset issues: fix in `src/schema/archetypes.ts`, re-run, commit:

```bash
git add src/schema/archetypes.ts
git commit -m "refine(schema): polish prose/tokens for $mood preset"
```

---

### Task 5: Update README mood examples and final verification

**Files:**
- Modify: `README.md` (only if the kebab-case mood strings or `mood:` example need touching)

- [ ] **Step 1: Verify README mood references match implementation**

Run: `grep -n 'mood:\|"clean-minimal"\|"warm-friendly"\|"bold-energetic"\|"professional"\|"playful-creative"' README.md`

The README already documents `mood: "clean-minimal"` in the web-integration example. Confirm all moods referenced there match the 5 new enum values. Update any leftover archetype-era strings (`"precise"`, etc.).

- [ ] **Step 2: Run the full test suite + build**

```bash
pnpm test
pnpm build
```

Expected: all tests pass, clean tsc.

- [ ] **Step 3: Commit any README updates**

```bash
git add README.md
git commit -m "docs: align README mood examples with implementation"
```

---

### Task 6: Optional — bring `mood_labels.csv` into the repo for future curation work

**Files:**
- Create: `docs/research/mood_labels.csv` (cherry-pick from `feat/archetype-phase-b`)

This is bookkeeping. The 58-system hand-labeling from Phase B is useful research material — keep it accessible.

- [ ] **Step 1: Cherry-pick the file**

```bash
git checkout feat/archetype-phase-b -- docs/research/notebooks/mood_labels.csv
git mv docs/research/notebooks/mood_labels.csv docs/research/mood_labels.csv
```

If the file is already on main (because PR #2 merged), skip this task.

- [ ] **Step 2: Commit**

```bash
git add docs/research/mood_labels.csv
git commit -m "docs(research): preserve hand-labeled mood data from Phase B"
```

---

## Files changed summary

| Path | Type |
|---|---|
| `src/schema/types.ts` | modified — enum swap |
| `src/schema/archetypes.ts` | modified — 4 → 5 presets |
| `tests/schema/archetypes.test.ts` | modified — mood names + count |
| `tests/generator/components.test.ts` | modified — mood references |
| `tests/generator/typography.test.ts` | modified — mood references |
| `tests/generator/integration.test.ts` | modified — mood references |
| `README.md` | possibly modified — mood example sync |
| `docs/research/mood_labels.csv` | new (optional, from Phase B) |

## Out of scope (deferred)

- Renaming `MoodArchetype` → `Mood` symbol (and `ArchetypePreset` → `MoodPreset`). Symbol renaming is bikeshed work; defer until a separate cleanup pass if desired.
- Web integration consumer changes beyond the mood string. The web exports take `mood` as part of `UserInputs`; consumers passing the old strings will get a TypeScript error and update naturally.
- Adding new generator behaviors per mood (e.g., motion presets, new color guidance). The current generator architecture takes preset fields as inputs — nothing prevents adding new fields later in a follow-up plan.
- Refining `playful-creative` prose beyond the v1 written in Task 2 Step 5. Subjective polish work that doesn't block the structural switch.
