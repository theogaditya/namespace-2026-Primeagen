# Design System Strategy: The Sovereign Ledger

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Sovereign Ledger."** 

In the world of government and NGO data, trust is not earned through decoration, but through clarity, weight, and architectural intent. We are moving away from the "disposable" feel of standard SaaS dashboards toward a high-end editorial experience. This design system treats data not just as numbers, but as a formal record. 

To achieve this, we reject the rigid, line-heavy grids of the past decade. Instead, we utilize **Intentional Asymmetry** and **Tonal Depth**. By using oversized typography scales and overlapping surface layers, we create a layout that feels spacious, breathable, and authoritative. We prioritize white space as a functional element that guides the eye through complex survey structures and dense analytical reports.

## 2. Colors & Surface Architecture
The palette is anchored in deep, institutional blues and professional teals, providing a sense of permanence and reliability.

### The "No-Line" Rule
Standard 1px borders are prohibited for sectioning. They create visual noise that distracts from the data. Boundaries must be defined through:
*   **Background Color Shifts:** Distinguish a sidebar or header by moving from `surface` (#f3faff) to `surface_container_low` (#e6f6ff).
*   **Tonal Transitions:** Use subtle shifts in the surface hierarchy to define content blocks.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—like stacked sheets of heavy-weight vellum.
*   **Base:** `surface` (#f3faff).
*   **Primary Containers:** Use `surface_container_lowest` (#ffffff) for the main content cards to make them "pop" against the background.
*   **Sub-sections:** Nested elements within a card should use `surface_container` (#dbf1fe) or `surface_container_high` (#d5ecf8) to denote a deeper level of information without adding a border.

### The "Glass & Gradient" Rule
To elevate the system beyond a "template" look:
*   **CTAs:** Main action buttons and Hero accents should use a subtle linear gradient from `primary` (#003358) to `primary_container` (#004a7c). This adds "soul" and a tactile, premium finish.
*   **Floating Elements:** Use Glassmorphism for overlays (e.g., filter panels, tooltips). Apply `surface_container_lowest` at 80% opacity with a `12px` backdrop-blur to allow the data beneath to subtly bleed through.

## 3. Typography: Editorial Authority
We use a high-contrast pairing to balance institutional weight with modern precision.

*   **Display & Headlines (Manrope):** This geometric sans-serif provides a "bespoke" feel. Use `display-lg` (3.5rem) for high-level dashboard metrics to give them an unmissable, authoritative presence.
*   **Body & Labels (Inter):** Chosen for its exceptional readability in data-heavy contexts. Inter is the "workhorse" of the system, ensuring that survey questions and analytical labels remain crisp and legible at all sizes.
*   **Hierarchy as Navigation:** Bold `title-lg` (1.375rem) in `primary` color should be used to anchor sections, replacing the need for horizontal rules.

## 4. Elevation & Depth: Tonal Layering
Depth is achieved through the physics of light, not the artifice of lines.

*   **The Layering Principle:** Always stack from darkest/lowest to lightest/highest. A `surface_container_lowest` card sitting on a `surface` background creates a natural lift.
*   **Ambient Shadows:** For floating modals or dropdowns, use a "Sovereign Shadow": 
    *   `X: 0, Y: 12, Blur: 32, Spread: -4`.
    *   **Color:** `on_surface` (#071e27) at 6% opacity. 
    *   This mimics natural light, preventing the "muddy" look of standard grey shadows.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility (e.g., in high-contrast modes), use a `1px` stroke of `outline_variant` (#c1c7d0) at 15% opacity. Never use 100% opaque lines.

## 5. Components

### Buttons & Interaction
*   **Primary:** Gradient from `primary` (#003358) to `primary_container` (#004a7c). Roundedness: `md` (0.375rem).
*   **Secondary:** Ghost-style with a `primary` label and a `surface_container_high` background on hover.
*   **Status Badges:** 
    *   **Draft:** `tertiary_container` (#663f00) background with `on_tertiary_fixed` (#2a1700) text.
    *   **Published:** `secondary_container` (#94f0df) background with `on_secondary_container` (#006f62) text.
    *   **Closed:** `surface_dim` (#c7dde9) background with `outline` (#727780) text.

### Structured Forms
*   **Input Fields:** Use `surface_container_lowest` for the fill. The bottom-only border is forbidden; use a fully enclosed container with `md` (0.375rem) rounding. On focus, the border should transition to a `2px` `secondary` (#006b5e) "Ghost Border" at 40% opacity.
*   **Checkboxes/Radios:** Use `secondary` for the active state to provide a professional "Teal" pop against the "Deep Blue" primary palette.

### Data Visualizations
*   **Charts:** Avoid the "Rainbow Effect." Use a monochromatic scale of `primary` and `secondary` for 80% of the data. Use `tertiary_fixed_dim` (#ffb95f) only to highlight a specific "Insight" or "Anomalous Data Point."
*   **Grid Lines:** Use `outline_variant` at 10% opacity.

### Cards & Lists
*   **The Separation Rule:** Forbid divider lines. Separate list items using `8px` of vertical white space and a subtle background shift to `surface_container_low` on hover.
*   **Containers:** Use `xl` (0.75rem) corner radius for main dashboard cards to soften the institutional feel and make the interface feel modern.

## 6. Do's and Don'ts

### Do:
*   **Use Whitespace as a Divider:** If elements feel cluttered, add space, don't add lines.
*   **Tint Your Neutrals:** Use the blue-tinted neutrals provided (like `surface_variant`) to maintain the "Sovereign" atmosphere. Avoid pure #000000 or neutral #808080.
*   **Layer Intentionally:** Ensure every card and panel follows the `surface` -> `surface_container_low` -> `surface_container_lowest` progression.

### Don't:
*   **Don't Use 1px Solid Borders:** It breaks the "Sovereign Ledger" aesthetic and makes the platform feel like a legacy tool.
*   **Don't Overuse the Secondary Color:** The teals are for action and accents. If a page is 50% teal, it loses its professional authority.
*   **Don't Use Default Shadows:** Avoid the "fuzzy black" shadow. Use the ambient, tinted shadows described in Section 4.