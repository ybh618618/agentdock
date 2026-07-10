---
name: AgentDock
description: A quiet, local-first workbench for coding agents and their terminals.
colors:
  canvas-light: "oklch(1 0 0)"
  canvas-dark: "oklch(0.075 0 0)"
  surface-light: "oklch(0.975 0.003 120)"
  surface-dark: "oklch(0.105 0.003 120)"
  ink-light: "oklch(0.18 0.012 120)"
  ink-dark: "oklch(0.93 0.006 120)"
  signal-olive-light: "oklch(0.43 0.105 120)"
  signal-olive-dark: "oklch(0.76 0.12 120)"
  danger: "oklch(0.51 0.18 27)"
  warning: "oklch(0.57 0.12 75)"
typography:
  display:
    fontFamily: "Inter Variable, Noto Sans SC Variable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "38px"
    fontWeight: 690
    lineHeight: 1.2
    letterSpacing: "-0.04em"
  title:
    fontFamily: "Inter Variable, Noto Sans SC Variable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Inter Variable, Noto Sans SC Variable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter Variable, Noto Sans SC Variable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 650
    lineHeight: 1.4
  mono:
    fontFamily: "JetBrains Mono Variable, ui-monospace, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
rounded:
  sm: "6px"
  md: "9px"
  lg: "14px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "14px"
  lg: "22px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.ink-light}"
    textColor: "{colors.canvas-light}"
    rounded: "{rounded.sm}"
    padding: "7px 13px"
    height: "36px"
  button-secondary:
    backgroundColor: "{colors.canvas-light}"
    textColor: "{colors.ink-light}"
    rounded: "{rounded.sm}"
    padding: "7px 13px"
    height: "36px"
  input:
    backgroundColor: "{colors.canvas-light}"
    textColor: "{colors.ink-light}"
    rounded: "{rounded.sm}"
    padding: "8px 11px"
    height: "40px"
  terminal:
    backgroundColor: "{colors.canvas-dark}"
    textColor: "{colors.ink-dark}"
    rounded: "{rounded.md}"
---

# Design System: AgentDock

## 1. Overview

**Creative North Star: "The Quiet Operator's Bench"**

AgentDock feels like the desk of a developer who switches between focused daytime work and long evening terminal sessions: the surface stays neutral, the tools are exactly where muscle memory expects them, and only live system state asks for attention. White and near-black carry the product; muted olive behaves like a controlled instrument lamp, never like decoration.

The system is compact without becoming cramped. Borders and tonal shifts explain structure, while labels, paths, timestamps, and terminal text form a disciplined information hierarchy. It explicitly rejects purple or neon “AI product” gradients, decorative glassmorphism, excessive rounding, nested cards, fake terminal scenery, and motion without state meaning.

**Key Characteristics:**

- Pure white and near-black canvases with one restrained olive signal.
- Flat, border-led grouping with dense but readable developer-tool rhythm.
- Inter for interface language and JetBrains Mono for paths, commands, and terminal output.
- Familiar side navigation, session tabs, dialogs, fields, and visible focus states.
- Responsive structure that collapses navigation and simplifies toolbars instead of shrinking text.

## 2. Colors

The palette is deliberately achromatic until a state needs to be found quickly.

### Primary

- **Controlled Olive Signal** (`signal-olive-light` / `signal-olive-dark`): reserved for focus, active session rules, readiness, selected controls, and small identity marks. It must occupy less than 10% of a normal screen.

### Neutral

- **Literal Canvas** (`canvas-light` / `canvas-dark`): the page and terminal foundation. These values remain chroma-free so theme switching feels precise rather than tinted.
- **Workbench Surface** (`surface-light` / `surface-dark`): sidebars, toolbars, hover states, and panel separation.
- **Primary Ink** (`ink-light` / `ink-dark`): headings, body copy, controls, and high-value metadata.
- **Warning Amber** (`warning`): configuration caveats, YOLO scope notices, and maintenance attention.
- **Destructive Red** (`danger`): reset, removal, failure, and nothing else.

### Named Rules

**The Instrument Lamp Rule.** Olive is a state signal, not decoration; if it appears in a background flourish or large inactive surface, the screen is wrong.

**The Two Canvases Rule.** Light mode starts from literal white and dark mode from chroma-free near-black. Never warm either canvas into cream, beige, navy, or purple.

## 3. Typography

**Display Font:** Inter Variable with Noto Sans SC Variable for Chinese (with system sans-serif fallback)
**Body Font:** Inter Variable with Noto Sans SC Variable for Chinese (with system sans-serif fallback)
**Label/Mono Font:** JetBrains Mono Variable (with platform monospace fallback)

**Character:** Inter keeps high-density controls familiar and neutral, while Noto Sans SC supplies complete Simplified Chinese coverage in minimal Linux and WSL installations. JetBrains Mono distinguishes executable content from interface language without turning the whole product into a terminal costume.

### Hierarchy

- **Display** (690, 38px, 1.2): used only for the home introduction and onboarding milestones; mobile steps down to 27–31px.
- **Headline** (650–690, 25–27px, 1.2): page-level settings and onboarding step titles.
- **Title** (620–650, 16–20px, 1.2): sections, projects, and empty states.
- **Body** (400, 14px, 1.5): interface explanation and normal workflow copy; prose stays below 70 characters per line when possible.
- **Label** (600–650, 10–12px, 1.4): field labels, metadata, status, and navigation.
- **Mono** (400, 13px, 1.45): terminal output; paths and inline commands use 9–12px depending on density.

### Named Rules

**The Executable Content Rule.** Mono identifies something the machine reads or runs. Buttons, navigation, headings, and explanatory prose always remain in Inter.

## 4. Elevation

AgentDock is flat by default. Depth comes from surface tone, one-pixel dividers, and active-state rules. Resting cards and panels never use drop shadows. The only elevated object is a modal over its backdrop, where a broad ambient shadow establishes temporary focus without competing borders.

### Shadow Vocabulary

- **Modal Ambient** (`0 20px 56px oklch(0.04 0 0 / 0.28)`): native dialog surfaces only; never combine it with a decorative border.

### Named Rules

**The Flat Workbench Rule.** If a resting container needs a shadow to be understood, repair its hierarchy, spacing, or surface tone instead.

## 5. Components

### Buttons

- **Shape:** compact, gently squared controls (`6px`) with a minimum height of `36px`.
- **Primary:** near-black on light and near-white on dark, using `7px 13px` padding. The principal action is achromatic, not olive.
- **Hover / Focus:** a small tonal shift in `150ms`; focus uses a solid two-pixel olive outline and a two-pixel offset.
- **Secondary / Ghost / Danger:** secondary uses a single divider border, ghost is borderless until state, and danger uses a quiet red tint with explicit text.

### Chips

- **Style:** agent tokens are small outline pills, the one sanctioned full-pill form. They show enabled identities without competing with actions.
- **State:** selected agent options switch to the olive signal with a check mark; selection is never color-only.

### Cards / Containers

- **Corner Style:** functional containers use `9px`; large composers and modals stop at `14px`.
- **Background:** canvas or one workbench surface step, never translucent glass.
- **Shadow Strategy:** none at rest; modal-only elevation follows the Flat Workbench Rule.
- **Border:** one neutral divider when grouping needs an edge; nested bordered containers are prohibited.
- **Internal Padding:** dense controls use `8–14px`; major dialog and empty-state regions use `20–32px`.

### Inputs / Fields

- **Style:** canvas background, one neutral border, `6px` radius, and explicit labels above the field.
- **Focus:** border shifts to olive and receives the shared focus outline when keyboard-focused.
- **Error / Disabled:** errors use destructive red text plus an explanation; disabled controls reduce emphasis but retain readable labels.

### Navigation

The desktop shell uses a `252px` left sidebar, familiar rows, and project actions revealed on hover or keyboard focus. At `800px` and below it becomes an off-canvas sheet with a real backdrop and a compact top bar. Active state combines tonal fill, stronger text, and semantic current-page markup.

### Terminal

The terminal is the main work surface, not a decorative code block. It fills available height, carries a thin status toolbar, exposes connection and process states, preserves selection/copy behavior, and uses the same literal canvases as the surrounding theme.

## 6. Do's and Don'ts

### Do:

- **Do** keep primary actions achromatic and reserve olive for focus, selection, readiness, and the active session rule.
- **Do** keep body text at or above WCAG 2.2 AA contrast in both themes and provide non-color state labels.
- **Do** use standard sidebars, tabs, dialogs, switches, and fields so the interface disappears into the developer's task.
- **Do** simplify toolbars, collapse the sidebar, and preserve touch targets on narrow screens.
- **Do** show YOLO scope, container status, background apt maintenance, empty states, errors, and stopped sessions honestly.

### Don't:

- **Don't** use purple or neon gradients, decorative glassmorphism, or the generic “AI product” visual language named in PRODUCT.md.
- **Don't** use excessive rounding, nested cards, fake terminal scenery, or borders combined with broad decorative shadows.
- **Don't** hide project settings, Agent selection, or runtime state behind novel gestures or hover-only controls.
- **Don't** use cream, beige, navy, or tinted-black canvases; the product is explicitly white or chroma-free near-black.
- **Don't** animate decoration. Motion exists only for state transition, feedback, responsive navigation, modal entry, and loading.
