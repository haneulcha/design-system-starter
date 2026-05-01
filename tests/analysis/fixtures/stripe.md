## 1. Visual Theme & Atmosphere

Stripe's website is the gold standard of fintech design -- a system that manages to feel simultaneously technical and luxurious, precise and warm. The page opens on a clean white canvas (`#ffffff`) with deep navy headings (`#061b31`) and a signature purple (`#533afd`) that functions as both brand anchor and interactive accent. This isn't the cold, clinical purple of enterprise software; it's a rich, saturated violet that reads as confident and premium. The overall impression is of a financial institution redesigned by a world-class type foundry.

**Key Characteristics:**
- sohne-var with OpenType `"ss01"` on all text -- a custom stylistic set that defines the brand's letterforms
- Weight 300 as the signature headline weight -- light, confident, anti-convention
- Negative letter-spacing at display sizes (-1.4px at 56px, progressive relaxation downward)
- Blue-tinted multi-layer shadows using `rgba(50,50,93,0.25)` -- elevation that feels brand-colored
- Deep navy (`#061b31`) headings instead of black -- warm, premium, financial-grade
- Conservative border-radius (4px-8px) -- nothing pill-shaped, nothing harsh

## 2. Color Palette & Roles

### Primary
- **Stripe Purple** (`#533afd`): Primary brand color, CTA backgrounds, link text, interactive highlights. A saturated blue-violet that anchors the entire system.
- **Deep Navy** (`#061b31`): `--hds-color-heading-solid`. Primary heading color. Not black, not gray -- a very dark blue that adds warmth and depth to text.
- **Pure White** (`#ffffff`): Page background, card surfaces, button text on dark backgrounds.

### Brand & Dark
- **Brand Dark** (`#1c1e54`): `--hds-color-util-brand-900`. Deep indigo for dark sections, footer backgrounds, and immersive brand moments.
- **Dark Navy** (`#0d253d`): `--hds-color-core-neutral-975`. The darkest neutral -- almost-black with a blue undertone for maximum depth without harshness.

### Accent Colors
- **Ruby** (`#ea2261`): `--hds-color-accentColorMode-ruby-icon-solid`. Warm red-pink for icons, alerts, and accent elements.
- **Magenta** (`#f96bee`): `--hds-color-accentColorMode-magenta-icon-gradientMiddle`. Vivid pink-purple for gradients and decorative highlights.

### Neutral Scale
- **Heading** (`#061b31`): Primary headings, nav text, strong labels.
- **Label** (`#273951`): `--hds-color-input-text-label`. Form labels, secondary headings.
- **Body** (`#64748d`): Secondary text, descriptions, captions.

### Shadow Colors
- **Shadow Blue** (`rgba(50,50,93,0.25)`): The signature -- blue-tinted primary shadow color.
- **Shadow Dark Blue** (`rgba(3,3,39,0.25)`): Deeper blue shadow for elevated elements.
- **Shadow Black** (`rgba(0,0,0,0.1)`): Secondary shadow layer for depth reinforcement.
- **Shadow Ambient** (`rgba(23,23,23,0.08)`): Soft ambient shadow for subtle elevation.
- **Shadow Soft** (`rgba(23,23,23,0.06)`): Minimal ambient shadow for light lift.

## 3. Typography Rules

### Font Family
- **Primary**: `sohne-var`, with fallback: `SF Pro Display`
- **Monospace**: `SourceCodePro`, with fallback: `SFMono-Regular`

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Features | Notes |
|------|------|------|--------|-------------|----------------|----------|-------|
| Display Hero | sohne-var | 56px (3.50rem) | 300 | 1.03 (tight) | -1.4px | ss01 | Maximum size, whisper-weight authority |
| Display Large | sohne-var | 48px (3.00rem) | 300 | 1.15 (tight) | -0.96px | ss01 | Secondary hero headlines |
| Section Heading | sohne-var | 32px (2.00rem) | 300 | 1.10 (tight) | -0.64px | ss01 | Feature section titles |
| Sub-heading Large | sohne-var | 26px (1.63rem) | 300 | 1.12 (tight) | -0.26px | ss01 | Card headings, sub-sections |
| Body Large | sohne-var | 18px (1.13rem) | 300 | 1.40 | normal | ss01 | Feature descriptions, intro text |
| Body | sohne-var | 16px (1.00rem) | 300-400 | 1.40 | normal | ss01 | Standard reading text |
| Button | sohne-var | 16px (1.00rem) | 400 | 1.00 (tight) | normal | ss01 | Primary button text |

## 4. Component Stylings

### Buttons

**Primary Purple**
- Background: `#533afd`
- Text: `#ffffff`
- Padding: 8px 16px
- Radius: 4px
- Font: 16px sohne-var weight 400, `"ss01"`
- Hover: `#4434d4` background
- Use: Primary CTA ("Start now", "Contact sales")

**Ghost / Outlined**
- Background: transparent
- Text: `#533afd`
- Padding: 8px 16px
- Radius: 4px
- Border: `1px solid #b9b9f9`
- Font: 16px sohne-var weight 400, `"ss01"`
- Use: Secondary actions

### Cards & Containers
- Background: `#ffffff`
- Border: `1px solid #e5edf5` (standard) or `1px solid #061b31` (dark accent)
- Radius: 4px (tight), 5px (standard), 6px (comfortable), 8px (featured)
- Shadow (standard): `rgba(50,50,93,0.25) 0px 30px 45px -30px, rgba(0,0,0,0.1) 0px 18px 36px -18px`
- Shadow (ambient): `rgba(23,23,23,0.08) 0px 15px 35px 0px`
- Hover: shadow intensifies, often adding the blue-tinted layer

## 5. Layout Principles

### Border Radius Scale
- Micro (1px): Fine-grained elements, subtle rounding
- Standard (4px): Buttons, inputs, badges, cards -- the workhorse
- Comfortable (5px): Standard card containers
- Relaxed (6px): Navigation, larger interactive elements
- Large (8px): Featured cards, hero elements

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat (Level 0) | No shadow | Page background, inline text |
| Ambient (Level 1) | `rgba(23,23,23,0.06) 0px 3px 6px` | Subtle card lift, hover hints |
| Standard (Level 2) | `rgba(23,23,23,0.08) 0px 15px 35px` | Standard cards, content panels |
| Elevated (Level 3) | `rgba(50,50,93,0.25) 0px 30px 45px -30px, rgba(0,0,0,0.1) 0px 18px 36px -18px` | Featured cards, dropdowns, popovers |
| Deep (Level 4) | `rgba(3,3,39,0.25) 0px 14px 21px -14px, rgba(0,0,0,0.1) 0px 8px 17px -8px` | Modals, floating panels |

**Shadow Philosophy**: Stripe's shadow system is built on a principle of chromatic depth. Where most design systems use neutral gray or black shadows, Stripe's primary shadow color (`rgba(50,50,93,0.25)`) is a deep blue-gray that echoes the brand's navy palette. This creates shadows that don't just add depth -- they add brand atmosphere. The multi-layer approach pairs this blue-tinted shadow with a pure black secondary layer (`rgba(0,0,0,0.1)`) at a different offset.
