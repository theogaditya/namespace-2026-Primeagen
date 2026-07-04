# Design System Document

## 1. Overview & Creative North Star: "The Civic Architect"

This design system is engineered to bridge the gap between technical sophistication and radical accessibility. Our Creative North Star is **"The Civic Architect."** It represents a platform that is authoritative yet approachable, blending the high-density information clarity of LangChain’s technical aesthetic with the trustworthy, vibrant warmth required for a social-good initiative.

To break the "standard template" look, we move away from rigid, boxed-in grids. Instead, we utilize **intentional asymmetry**—offsetting headers, using varying card heights, and allowing for ample "white space" that isn't just empty, but functional. This system treats the user interface as an editorial layout, where typography and tonal depth guide the eye more effectively than a thousand lines ever could.

---

## 2. Color Strategy: Tonal Authority

The palette is anchored in a deep, sophisticated purple (`primary: #630ed4`) and supported by a robust range of technical surfaces.

### The "No-Line" Rule
**Sectioning must never be defined by 1px solid borders.** To maintain a premium, high-end feel, boundaries are created through background color shifts. A `surface-container-low` section sitting on a `surface` background provides all the separation a user needs without the visual "noise" of outlines.

### Surface Hierarchy & Nesting
Think of the UI as physical layers of fine stationery. 
- **Base Layer:** `surface` (#f9f9ff)
- **Secondary Sectioning:** `surface-container-low` (#f1f3ff)
- **Interactive Cards:** `surface-container-lowest` (#ffffff)
- **High-Impact Modals:** `surface-bright` (#f9f9ff) with ambient shadows.

### Glass & Gradient Transitions
To capture the "startup-focused" energy, main CTAs and Hero sections should utilize a subtle linear gradient moving from `primary` (#630ed4) to `primary_container` (#7c3aed). For floating navigation or action bars, use **Glassmorphism**: a semi-transparent `surface` color with a `backdrop-filter: blur(20px)` to create a sense of lightness and technical polish.

---

## 3. Typography: Editorial Clarity

We utilize two distinct typefaces to balance character with readability.

*   **Display & Headlines (Plus Jakarta Sans):** Used for high-impact moments. Its modern, slightly geometric curves provide an authoritative "Civic Architect" voice.
*   **Body & UI (Inter):** The gold standard for legibility. Used for all functional text to ensure accessibility for every citizen, regardless of literacy level or technical background.

| Level | Token | Font | Size | Intent |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | `display-lg` | Plus Jakarta Sans | 3.5rem | High-impact hero statements |
| **Headline** | `headline-md` | Plus Jakarta Sans | 1.75rem | Major section titles |
| **Title** | `title-lg` | Inter | 1.375rem | Card headers & Navigation |
| **Body** | `body-md` | Inter | 0.875rem | Primary reading & Data |
| **Label** | `label-sm` | Inter | 0.6875rem | Technical metadata & Tags |

---

## 4. Elevation & Depth: Tonal Layering

Traditional box-shadows are often a sign of "off-the-shelf" design. We use **Tonal Layering** to create a more natural sense of hierarchy.

*   **The Layering Principle:** Depth is achieved by "stacking" surface tokens. Place a `surface-container-lowest` card on a `surface-container-low` background. This creates a soft, natural lift that is easier on the eyes and feels more modern.
*   **Ambient Shadows:** Where a shadow is mandatory for focus (e.g., a floating Action Button), use a highly diffused shadow: `box-shadow: 0 10px 40px rgba(22, 28, 39, 0.06)`. Note the tint—the shadow uses a low-opacity version of `on-surface` (#161c27), not pure black.
*   **The Ghost Border:** If accessibility requires a border, it must be a "Ghost Border." Use the `outline-variant` token at 15% opacity. High-contrast, 100% opaque borders are strictly forbidden.

---

## 5. Components

### Buttons & Interaction
*   **Primary Action:** A gradient-fill button (`primary` to `primary_container`) with `rounded-md` (0.75rem) corners. No border.
*   **Secondary Action:** `surface-container-highest` background with `primary` text. Provides contrast without competing with the main action.
*   **Tertiary (Ghost):** No background. `primary` text with a subtle `surface-variant` hover state.

### Civic Status Chips
Inspired by LangChain's technical tags, these use a "Tint-on-Tint" approach.
*   **Positive (Success):** `tertiary_container` background with `on_tertiary_container` text.
*   **Alert (Error):** `error_container` background with `on_error_container` text.
*   **Rounding:** Always use `rounded-full` (9999px) for chips to contrast against the `md` rounding of cards.

### Input Fields
Inputs should feel like part of the surface, not a hole in it.
*   **Base state:** `surface-container-low` fill with a bottom-only `outline-variant` (20% opacity).
*   **Focus state:** 2px solid `primary` bottom border and a subtle `surface-container-highest` fill shift.

### Cards & Lists
*   **Rule:** Forbid divider lines. Use `spacing-6` (1.5rem) of vertical white space or a subtle shift from `surface-container-lowest` to `surface-container-low` to separate items.
*   **The "Verified" Card:** For blockchain-verified records, use a subtle `secondary_fixed` (#d3e4ff) glow/background to denote a "technical" status.

---

## 6. Do’s and Don’ts

### Do:
*   **DO** use whitespace as a functional tool. If in doubt, increase the spacing from `spacing-4` to `spacing-8`.
*   **DO** use `surface-variant` color shifts to highlight "hover" states rather than traditional "glow" effects.
*   **DO** prioritize the "Inter" typeface for all data-heavy sections to ensure the platform remains accessible to users with varying education levels.

### Don’t:
*   **DON'T** use 1px solid black or grey borders to separate content. It fragments the civic experience.
*   **DON'T** use high-saturation shadows. Keep them "ambient" and tinted to the surface color.
*   **DON'T** use more than three colors in a single view. Stick to the Purple/White/Blue hierarchy to maintain a professional "YC-style" startup aesthetic.
*   **DON'T** use "Standard" 4px rounding. Use the scale provided, specifically `md` (0.75rem) for cards and `xl` (1.5rem) for large containers to create a softer, more custom feel.