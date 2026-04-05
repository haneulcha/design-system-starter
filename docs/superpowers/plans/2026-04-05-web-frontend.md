# Web Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React + Vite SPA with 3-step wizard (color → archetype → font), progressive previews, and a result page with live editing + file downloads.

**Architecture:** `web/` directory with React 19 + Vite. Imports `../src/generator` and `../src/schema` directly via Vite alias `@core`. No changes to generator core. `useGenerator` hook wraps `generate()` with `useMemo`. Preview components render generated tokens as inline CSS custom properties.

**Tech Stack:** React 19, Vite 6, Tailwind CSS 4, TypeScript, JSZip

**Spec:** `docs/superpowers/specs/2026-04-05-web-frontend-design.md`

---

## File Structure

```
web/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
└── src/
    ├── main.tsx              # ReactDOM.createRoot entry
    ├── App.tsx               # Wizard state machine + routing
    ├── global.css            # Tailwind + base styles
    ├── hooks/
    │   └── useGenerator.ts   # generate() wrapper with useMemo
    ├── steps/
    │   ├── StepColor.tsx     # Color picker + scale preview
    │   ├── StepArchetype.tsx # 4 archetype cards + component preview
    │   └── StepFont.tsx      # Font selector + typography preview
    ├── result/
    │   ├── ResultPage.tsx    # Sidebar controls + preview layout
    │   ├── ColorPreview.tsx  # 6 hue × 10 step swatch grid
    │   ├── ComponentPreview.tsx # Live button/input/card/badge/divider
    │   ├── TypePreview.tsx   # 14 type specimens
    │   └── DownloadPanel.tsx # 4 download buttons + brand name input
    └── components/
        └── ProgressBar.tsx   # 3-step progress indicator
```

---

### Task 1: Scaffold web/ project

**Files:**
- Create: `web/package.json`
- Create: `web/vite.config.ts`
- Create: `web/tsconfig.json`
- Create: `web/index.html`
- Create: `web/src/main.tsx`
- Create: `web/src/global.css`

- [ ] **Step 1: Create web/package.json**

```json
{
  "name": "design-system-starter-web",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "culori": "^4.0.0",
    "jszip": "^3.10.1"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.4.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0"
  }
}
```

- [ ] **Step 2: Create web/vite.config.ts**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@core": path.resolve(__dirname, "../src"),
    },
  },
});
```

- [ ] **Step 3: Create web/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "paths": {
      "@core/*": ["../src/*"]
    }
  },
  "include": ["src", "../src"]
}
```

- [ ] **Step 4: Create web/index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Design System Starter</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create web/src/main.tsx**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./global.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 6: Create web/src/global.css**

```css
@import "tailwindcss";
```

- [ ] **Step 7: Install dependencies and verify**

```bash
cd /Users/haneul/Projects/design-system-starter/web && npm install
```

- [ ] **Step 8: Create minimal App.tsx to verify dev server**

```tsx
export function App() {
  return <div className="p-8 text-lg">Design System Starter</div>;
}
```

- [ ] **Step 9: Verify dev server starts**

```bash
cd /Users/haneul/Projects/design-system-starter/web && npx vite --host 2>&1 | head -5
```

Expected: dev server starts, shows URL.

- [ ] **Step 10: Commit**

```bash
cd /Users/haneul/Projects/design-system-starter
echo ".superpowers/" >> .gitignore
git add web/ .gitignore
git commit -m "feat(web): scaffold React + Vite SPA"
```

---

### Task 2: useGenerator hook

**Files:**
- Create: `web/src/hooks/useGenerator.ts`

- [ ] **Step 1: Implement useGenerator**

```ts
import { useMemo } from "react";
import { generate } from "@core/generator/index.js";
import type { GenerateResult } from "@core/generator/index.js";
import { generateScales } from "@core/generator/color.js";
import type { ColorScales } from "@core/schema/types.js";
import { getArchetype, ARCHETYPES } from "@core/schema/archetypes.js";
import { transformToFigma } from "@core/figma/transformer.js";
import type { MoodArchetype } from "@core/schema/types.js";

export interface WizardState {
  primaryColor: string;
  mood: MoodArchetype;
  fontFamily: string;
  brandName: string;
}

export const DEFAULT_STATE: WizardState = {
  primaryColor: "#5e6ad2",
  mood: "precise",
  fontFamily: "Inter",
  brandName: "Untitled",
};

export function useColorScales(primaryColor: string) {
  return useMemo(() => {
    try {
      return generateScales(primaryColor, "neutral");
    } catch {
      return generateScales("#5e6ad2", "neutral");
    }
  }, [primaryColor]);
}

export function useGenerateResult(state: WizardState) {
  return useMemo(() => {
    try {
      const result = generate({
        brandName: state.brandName,
        primaryColor: state.primaryColor,
        mood: state.mood,
        fontFamily: state.fontFamily,
      });
      const figma = transformToFigma(result.tokens);
      return { ...result, figma };
    } catch {
      return null;
    }
  }, [state.brandName, state.primaryColor, state.mood, state.fontFamily]);
}

export { ARCHETYPES, getArchetype };
export type { MoodArchetype, ColorScales, GenerateResult };
```

- [ ] **Step 2: Verify compilation**

```bash
cd /Users/haneul/Projects/design-system-starter/web && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add web/src/hooks/
git commit -m "feat(web): useGenerator hook wrapping core generate()"
```

---

### Task 3: Progress bar + App shell with wizard routing

**Files:**
- Create: `web/src/components/ProgressBar.tsx`
- Modify: `web/src/App.tsx`

- [ ] **Step 1: Create ProgressBar**

```tsx
const STEPS = ["Color", "Archetype", "Font"];

export function ProgressBar({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 py-6">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              i < current
                ? "bg-neutral-900 text-white"
                : i === current
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-200 text-neutral-500"
            }`}
          >
            {i + 1}
          </div>
          <span
            className={`text-sm ${
              i <= current ? "text-neutral-900" : "text-neutral-400"
            }`}
          >
            {label}
          </span>
          {i < STEPS.length - 1 && (
            <div className="w-8 h-px bg-neutral-300 mx-1" />
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Rewrite App.tsx with wizard state machine**

```tsx
import { useState } from "react";
import { ProgressBar } from "./components/ProgressBar";
import { StepColor } from "./steps/StepColor";
import { StepArchetype } from "./steps/StepArchetype";
import { StepFont } from "./steps/StepFont";
import { ResultPage } from "./result/ResultPage";
import { DEFAULT_STATE, type WizardState, type MoodArchetype } from "./hooks/useGenerator";

type Screen = "wizard" | "result";

export function App() {
  const [screen, setScreen] = useState<Screen>("wizard");
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(DEFAULT_STATE);

  const update = (partial: Partial<WizardState>) =>
    setState((prev) => ({ ...prev, ...partial }));

  if (screen === "result") {
    return (
      <ResultPage
        state={state}
        onChange={update}
        onBack={() => setScreen("wizard")}
      />
    );
  }

  const next = () => {
    if (step < 2) setStep(step + 1);
    else setScreen("result");
  };
  const back = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4">
        <ProgressBar current={step} />
        <div className="py-8">
          {step === 0 && (
            <StepColor
              value={state.primaryColor}
              onChange={(c) => update({ primaryColor: c })}
            />
          )}
          {step === 1 && (
            <StepArchetype
              value={state.mood}
              primaryColor={state.primaryColor}
              onChange={(m) => update({ mood: m })}
            />
          )}
          {step === 2 && (
            <StepFont
              value={state.fontFamily}
              mood={state.mood}
              onChange={(f) => update({ fontFamily: f })}
            />
          )}
        </div>
        <div className="flex justify-between pb-12">
          <button
            onClick={back}
            className={`px-6 py-2 rounded text-sm ${
              step === 0
                ? "invisible"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            }`}
          >
            Back
          </button>
          <button
            onClick={next}
            className="px-6 py-2 rounded bg-neutral-900 text-white text-sm hover:bg-neutral-800"
          >
            {step === 2 ? "Generate" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create stub step components so App compiles**

Create `web/src/steps/StepColor.tsx`:
```tsx
export function StepColor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <div>StepColor: {value}</div>;
}
```

Create `web/src/steps/StepArchetype.tsx`:
```tsx
import type { MoodArchetype } from "../hooks/useGenerator";
export function StepArchetype({ value, primaryColor, onChange }: { value: MoodArchetype; primaryColor: string; onChange: (v: MoodArchetype) => void }) {
  return <div>StepArchetype: {value}</div>;
}
```

Create `web/src/steps/StepFont.tsx`:
```tsx
import type { MoodArchetype } from "../hooks/useGenerator";
export function StepFont({ value, mood, onChange }: { value: string; mood: MoodArchetype; onChange: (v: string) => void }) {
  return <div>StepFont: {value}</div>;
}
```

Create `web/src/result/ResultPage.tsx`:
```tsx
import type { WizardState } from "../hooks/useGenerator";
export function ResultPage({ state, onChange, onBack }: { state: WizardState; onChange: (p: Partial<WizardState>) => void; onBack: () => void }) {
  return <div>ResultPage</div>;
}
```

- [ ] **Step 4: Verify dev server shows wizard shell**

```bash
cd /Users/haneul/Projects/design-system-starter/web && npx vite --host
```

Open browser, verify progress bar + step navigation works.

- [ ] **Step 5: Commit**

```bash
git add web/src/
git commit -m "feat(web): wizard shell with 3-step routing + progress bar"
```

---

### Task 4: StepColor — color picker + scale preview

**Files:**
- Modify: `web/src/steps/StepColor.tsx`

- [ ] **Step 1: Implement StepColor**

```tsx
import { useColorScales } from "../hooks/useGenerator";

export function StepColor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const scales = useColorScales(value);

  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight mb-2">
        Pick your primary color
      </h2>
      <p className="text-neutral-500 mb-8">
        Everything else is derived from this single color.
      </p>

      <div className="flex items-center gap-4 mb-10">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-12 rounded cursor-pointer border-0 p-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v);
          }}
          className="font-mono text-sm px-3 py-2 border border-neutral-300 rounded w-28"
          placeholder="#5e6ad2"
        />
      </div>

      <div className="space-y-4">
        {Object.entries(scales).map(([hue, scale]) => (
          <div key={hue}>
            <div className="text-xs font-medium text-neutral-500 mb-1 capitalize">
              {hue}
            </div>
            <div className="flex gap-0.5">
              {Object.entries(scale)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([step, { light }]) => (
                  <div
                    key={step}
                    className="flex-1 h-8 first:rounded-l last:rounded-r"
                    style={{ backgroundColor: light }}
                    title={`${hue}-${step}: ${light}`}
                  />
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Color picker changes → scale strips update instantly.

- [ ] **Step 3: Commit**

```bash
git add web/src/steps/StepColor.tsx
git commit -m "feat(web): StepColor with color picker + live scale preview"
```

---

### Task 5: StepArchetype — archetype cards + component preview

**Files:**
- Modify: `web/src/steps/StepArchetype.tsx`

- [ ] **Step 1: Implement StepArchetype**

Show 4 cards (Precise, Confident, Expressive, Modern). Each card shows:
- Label + description from archetype preset
- Representative companies from research
- Mini button preview with actual radius/shadow applied

When selected, show a component preview below: 3 buttons + a card + an input using the selected archetype's radius/shadow + the primaryColor from the previous step.

Import `ARCHETYPES` and `getArchetype` from `@core/schema/archetypes.js`. Use `generateScales` to get brand color for the preview.

The component preview should render actual DOM elements styled with the archetype's values:
- Button with `borderRadius: archetype.buttonRadius`, `backgroundColor` from primary color scale step 700
- Card with `borderRadius: archetype.cardRadius`, box-shadow based on archetype.shadowIntensity
- Input with `borderRadius: archetype.inputRadius`

Reference companies to show per archetype:
- precise: "Stripe, IBM, X.ai"
- confident: "Vercel, Notion, Airbnb"
- expressive: "Linear, Apple, Claude"
- modern: "Supabase, Resend, Coinbase"

- [ ] **Step 2: Verify in browser**

Click each archetype card → component preview updates with correct radius/shadow.

- [ ] **Step 3: Commit**

```bash
git add web/src/steps/StepArchetype.tsx
git commit -m "feat(web): StepArchetype with cards + live component preview"
```

---

### Task 6: StepFont — font selector + typography preview

**Files:**
- Modify: `web/src/steps/StepFont.tsx`

- [ ] **Step 1: Implement StepFont**

Show archetype's `suggestedFonts` as radio buttons + "Custom" option with text input.

Load selected Google Font dynamically:
```ts
function loadGoogleFont(family: string) {
  const id = `google-font-${family.replace(/\s+/g, "-")}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@300;400;500;600;700&display=swap`;
  document.head.appendChild(link);
}
```

Call `loadGoogleFont` on font change. Show typography preview: render the first 6 hierarchy entries (Display Hero through Body) with actual font-family, font-size, font-weight, letter-spacing, line-height from `generateTypography(archetype, fontFamily)`.

- [ ] **Step 2: Verify in browser**

Select different fonts → specimen text updates with correct font + sizing.

- [ ] **Step 3: Commit**

```bash
git add web/src/steps/StepFont.tsx
git commit -m "feat(web): StepFont with Google Fonts loading + typography preview"
```

---

### Task 7: Result page — layout + controls sidebar

**Files:**
- Modify: `web/src/result/ResultPage.tsx`
- Create: `web/src/result/DownloadPanel.tsx`

- [ ] **Step 1: Implement ResultPage layout**

Two-column layout: left sidebar (controls + download), right main (preview).

Sidebar:
- Color picker (same as StepColor but compact)
- Archetype radio group (4 compact options)
- Font dropdown (suggestedFonts + custom)
- Brand name text input
- DownloadPanel component

Main area:
- ColorPreview, ComponentPreview, TypePreview (stacked, scrollable)

Use `useGenerateResult(state)` hook to generate everything. Pass generated data to preview components.

Mobile: sidebar collapses to horizontal controls at top.

- [ ] **Step 2: Implement DownloadPanel**

```tsx
import JSZip from "jszip";

function downloadFile(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadTokensZip(tokenFiles: Record<string, string>) {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(tokenFiles)) {
    zip.file(name, content);
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "tokens.zip";
  a.click();
  URL.revokeObjectURL(url);
}
```

4 download buttons:
- DESIGN.md → `downloadFile("DESIGN.md", result.designMd)`
- design-tokens.json → `downloadFile("design-tokens.json", JSON.stringify(result.tokens, null, 2))`
- tokens.zip → `downloadTokensZip(result.tokenFiles)`
- figma-system.json → `downloadFile("figma-system.json", JSON.stringify(result.figma, null, 2))`

- [ ] **Step 3: Verify — sidebar controls change preview, downloads work**

- [ ] **Step 4: Commit**

```bash
git add web/src/result/
git commit -m "feat(web): result page with controls sidebar + downloads"
```

---

### Task 8: Preview components (Color, Component, Typography)

**Files:**
- Create: `web/src/result/ColorPreview.tsx`
- Create: `web/src/result/ComponentPreview.tsx`
- Create: `web/src/result/TypePreview.tsx`

- [ ] **Step 1: Implement ColorPreview**

Same layout as StepColor's scale strips, but with hex labels on hover. Takes `ColorScales` as prop.

- [ ] **Step 2: Implement ComponentPreview**

Render live DOM elements styled with generated tokens:

- **Buttons** (3 variants): resolve component token → semantic token → primitive scale step → actual hex. Apply as inline styles. Use archetype's radius.
- **Input** (4 states side by side): default, focus (brand border), error (red border), disabled (muted bg)
- **Card**: with placeholder image area, title, body text
- **Badge** (5 colors): default, success, error, warning, info
- **Divider**: with label

All colors resolved from `result.tokens`: `component.button.primary.bg → semantic["brand/primary"] → "blue-700" → primitive.colors.blue["700"].light`

Helper function to resolve the full chain:
```ts
function resolveColor(
  tokens: DesignTokens,
  componentRef: string
): string {
  const semanticKey = componentRef;
  const primitiveRef = tokens.semantic[semanticKey];
  if (!primitiveRef) return "#cccccc";
  const [hue, step] = primitiveRef.split("-");
  return tokens.primitive.colors[hue]?.[step]?.light ?? "#cccccc";
}
```

- [ ] **Step 3: Implement TypePreview**

Render 14 type specimens from `result.system.typography.hierarchy`. Each row: role name (small label) + specimen text in actual font/size/weight/letter-spacing.

Load the selected font via Google Fonts link tag.

- [ ] **Step 4: Wire preview components into ResultPage**

- [ ] **Step 5: Verify in browser — full flow works end to end**

Wizard → pick color → pick archetype → pick font → Generate → result page shows live preview → change any control → preview updates → download buttons produce correct files.

- [ ] **Step 6: Commit**

```bash
git add web/src/result/
git commit -m "feat(web): color, component, typography preview components"
```

---

### Task 9: Polish + build verification

**Files:**
- Modify: various web/ files

- [ ] **Step 1: Add responsive mobile layout**

ResultPage sidebar: on `md:` breakpoint, switch from side-by-side to stacked. Sidebar becomes a collapsible panel at top.

- [ ] **Step 2: Verify production build**

```bash
cd /Users/haneul/Projects/design-system-starter/web && npm run build
```

Check `web/dist/` output — should be static files deployable to any CDN.

- [ ] **Step 3: Verify build serves correctly**

```bash
npx vite preview
```

Open in browser, full flow works.

- [ ] **Step 4: Commit**

```bash
git add web/
git commit -m "feat(web): responsive layout + production build"
```

---

## Verification

1. `cd web && npm run dev` — dev server starts
2. Wizard: pick color → scales appear → pick archetype → components appear → pick font → typography appears
3. Generate → result page with full preview
4. Change any control in result sidebar → preview updates instantly
5. All 4 download buttons produce correct files
6. `npm run build` succeeds → `dist/` contains static deployable files
7. Mobile: sidebar collapses, all content accessible
