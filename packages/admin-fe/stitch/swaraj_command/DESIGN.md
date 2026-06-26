# Design System Documentation: The Administrative Architect

## 1. Overview & Creative North Star
The design system for this portal is guided by a Creative North Star titled **"The Digital Architect."** In a world of cluttered, "out-of-the-box" admin templates, this system prioritizes quiet authority, sophisticated density, and intentional layering. 

We are moving away from the generic "dashboard" look. Instead, we treat the UI as a series of curated, architectural planes. By utilizing a high-density Inter-based typography scale and a strict tonal hierarchy, we provide power users with the data they need without the cognitive load of unnecessary structural lines. The result is an environment that feels bespoke, expensive, and profoundly trustworthy.

---

## 2. Colors & Surface Logic

### The "No-Line" Rule
Standard UI relies on `1px solid` borders to separate content. This design system **prohibits** the use of solid lines for sectioning. Boundaries are defined through background shifts. Use the `surface` tokens to create distinction:
*   **Main Canvas:** `surface` (#f8f9fa).
*   **Secondary Workspaces:** `surface_container_low` (#f3f4f5).
*   **Interactive Cards:** `surface_container_lowest` (#ffffff).

### Surface Hierarchy & Nesting
Think of the interface as stacked sheets of fine cardstock. 
*   **Level 0 (Base):** `surface`.
*   **Level 1 (Sub-section):** `surface_container`.
*   **Level 2 (Active Element):** `surface_container_highest`.
By nesting a `surface_container_highest` element inside a `surface_container` area, you create a natural, "physical" lift that guides the eye without needing a single border.

### The "Glass & Gradient" Rule
To inject a "signature" feel into a professional tool:
*   **Main Actions:** Use a subtle linear gradient for primary CTAs, transitioning from `primary` (#041627) to `primary_container` (#1a2b3c) at a 135-degree angle. This prevents buttons from looking "flat" and adds a premium sheen.
*   **Floating Navigation:** Use **Glassmorphism** for utility bars and floating modals. Apply `surface_container_lowest` at 80% opacity with a `24px` backdrop-blur.

---

## 3. Typography: The Editorial Grid
We use **Inter** exclusively. It is the workhorse of high-density data. Our hierarchy is designed to feel like a high-end financial journal—bold where it matters, whisper-quiet where it doesn't.

*   **Display & Headlines:** Use `headline-lg` (2rem) for page titles. These should have a slight negative letter-spacing (-0.02em) to feel "tight" and authoritative.
*   **Data Titles:** `title-sm` (1rem) in `on_surface_variant` for KPI labels.
*   **The Power-User Body:** `body-md` (0.875rem) is the default for tables. It provides the perfect balance of readability and information density.
*   **SLA & Status Labels:** `label-sm` (0.6875rem) in All-Caps with +0.05em letter-spacing. This ensures high legibility even at tiny scales.

---

## 4. Elevation & Depth

### The Layering Principle
Depth is achieved through **Tonal Layering**. Avoid the temptation to use shadows for everything. A `surface_container_lowest` card sitting on a `surface_container_low` background provides enough contrast for the user to understand the hierarchy.

### Ambient Shadows
When an element must "float" (e.g., a triggered dropdown or a critical SLA modal), use **Ambient Shadows**:
*   **Blur:** 32px to 64px.
*   **Opacity:** 4–8%.
*   **Color:** Use a tinted shadow by pulling from `on_surface` but desaturating it. Avoid pure black shadows; they look "muddy."

### The "Ghost Border" Fallback
If contrast is insufficient for WCAG AA in a specific complex data view, use a **Ghost Border**:
*   **Token:** `outline_variant` (#c4c6cd).
*   **Opacity:** Set to 15% opacity. It should be felt rather than seen.

---

## 5. Components

### High-Density Data Tables
*   **No Dividers:** Forbid horizontal lines between rows. Instead, use a subtle background shift (`surface_container_low`) on hover.
*   **Zebra Striping:** Use `surface_container_lowest` and `surface_container_low` for alternating rows only if the table exceeds 20 columns.

### KPI Cards
*   **Style:** Minimalist. No borders. Use `primary_fixed` for a subtle top-accent bar (2px) to denote category.
*   **Typography:** Large `display-sm` for the primary metric, paired with a `label-md` for the trend indicator.

### SLA Progress Bars
*   **Logic:** Use a thick `4px` height. The background track should be `surface_variant`. 
*   **States:** Use `error` (#ba1a1a) for breached SLAs and `secondary` (#115cb9) for active, healthy tasks. Add a 2px "glow" (soft shadow) of the same color to the progress indicator to make it feel "active."

### Buttons & Inputs
*   **Primary Button:** `primary` background with `on_primary` text. `0.375rem` (md) corner radius.
*   **Inputs:** Use `surface_container_highest` for the input field background with a `Ghost Border` on focus. Do not use white backgrounds for inputs on a white page; it creates "visual holes."

---

## 6. Do’s and Don’ts

### Do:
*   **Do** embrace white space. "High density" does not mean "cramped." Use the `0.5rem` to `1rem` spacing scale to let data breathe.
*   **Do** use asymmetrical layouts. A heavy left-aligned sidebar with a floating, right-aligned action group creates a sophisticated, custom feel.
*   **Do** use color purposefully. Only use `error` or `tertiary` (Amber) when action is required.

### Don't:
*   **Don't** use 100% black. Use `on_surface` (#191c1d) for text to maintain a premium, softened look.
*   **Don't** use standard "Drop Shadows." If it looks like a default Photoshop shadow, it’s wrong. It should look like diffused natural light.
*   **Don't** use dividers to separate content blocks. If you need a divider, you haven't used your `surface` tokens effectively.