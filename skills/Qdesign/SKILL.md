---
name: Qdesign
description: "Creates a DESIGN.md specification that defines the visual identity, design system, and component guidelines for a project. All frontend skills (Qfrontend-design, Qstitch-apply, coding-experts) reference this file as the single source of truth. Distinct from Qfrontend-design which implements UI code — this skill defines the design spec before any code is written."
metadata:
  author: qe-framework
  version: "1.0.0"
invocation_trigger: "When a project needs a design system defined before frontend work begins. Trigger phrases: 'create design system', 'define design spec', 'set up DESIGN.md', 'design foundation', 'visual identity'."
recommendedModel: sonnet
---

# Design System Specification Generator

Creates `DESIGN.md` — the single source of truth for all frontend implementation in the project.

## When to Use

- Starting a new frontend project or major UI overhaul
- Before running `/Qfrontend-design` for the first time
- When multiple developers/agents need consistent design decisions
- When the project has no `.impeccable.md` or existing design documentation

## When NOT to Use

- Implementing actual UI code (use `/Qfrontend-design`)
- Reviewing existing UI (use `/Qdesign-audit`)
- Extracting design from Stitch mockups only (use `/Qfrontend-design` Step 0-S)

---

## Step 0: Gather Context

Before defining any design decisions, understand the project.

### 0-1. Scan Existing Assets

1. Check for existing design files: `DESIGN.md`, `.impeccable.md`, `tailwind.config.*`, `theme.*`
2. Check for Stitch project — if found, extract design tokens via Qfrontend-design's Step 0-S
3. Check `package.json` for UI framework (React, Vue, Svelte, etc.) and CSS approach (Tailwind, CSS Modules, styled-components)
4. Scan existing components for implicit design patterns already in use

**If `DESIGN.md` already exists**: Do NOT proceed to Step 1. Instead:
- Read the existing DESIGN.md and summarize its current state to the user
- Ask whether they want to **update** specific sections or **keep it as-is**
- If updating, apply changes only to the requested sections — preserve everything else
- Skip Step 0-2 and 0-3 entirely

**If `.impeccable.md` exists but no `DESIGN.md`**: Suggest migrating to DESIGN.md format — `.impeccable.md` contains useful tokens but DESIGN.md is the canonical format used by all QE frontend skills.

### 0-2. Ask the User (if no existing DESIGN.md found)

Ask these questions — skip any already answered by existing assets:

1. **What is this product?** — One sentence describing the product and its users
2. **Brand personality** — Choose 3 adjectives (e.g., "professional, warm, approachable")
3. **Reference sites** — 1-3 websites whose visual style you admire
4. **Target platforms** — Desktop-first, mobile-first, or both equally
5. **Dark mode** — Required, optional, or not needed
6. **Accessibility level** — WCAG AA (default) or AAA

### 0-3. Browse designmd.ai (if no existing DESIGN.md found)

Before defining tokens from scratch, check if a community design system fits the project:

1. Use **WebFetch** to browse `https://designmd.ai` — a community library of 100+ curated DESIGN.md files
2. Search by relevant tags matching the project (e.g., `SaaS`, `dashboard`, `clean`, `dark`, `landing`, `portfolio`, `e-commerce`)
3. Present 3-5 matching design systems to the user with their names and descriptions
4. If the user selects one:
   - Fetch the full DESIGN.md content from designmd.ai
   - Use it as a **base template** — customize colors, fonts, and brand identity for the user's project
   - Proceed to Step 1 to review and adjust each token section
5. If the user declines or prefers a custom design: proceed to Step 1 normally

**Rules:**
- designmd.ai is a reference, not a copy-paste source — always customize to the project
- Never use a community design system without adapting brand colors and typography
- If WebFetch fails (network issue), skip gracefully and proceed to Step 1

---

## Step 1: Define Design Tokens

### 1-1. Color System

Define the complete color palette:

```markdown
## Colors

### Brand Colors
- Primary: [color] — used for CTAs, key actions, brand identity
- Secondary: [color] — used for supporting elements
- Accent: [color] — used for highlights, notifications, badges

### Neutral Scale
- 50 through 950 — background, surface, border, text hierarchy

### Semantic Colors
- Success / Warning / Error / Info — with light and dark variants

### Dark Mode (if applicable)
- Surface mapping: which neutrals invert, which stay
- Brand color adjustments for dark backgrounds
```

**Rules:**
- Use OKLCH for perceptual uniformity
- Primary must have sufficient contrast (4.5:1 min) against both light and dark surfaces
- No more than 2 accent colors — restraint over variety

### 1-2. Typography

Define the type system:

```markdown
## Typography

### Font Stack
- Headings: [font-family] — [why this font]
- Body: [font-family] — [why this font]
- Mono: [font-family] — for code blocks

### Type Scale
- xs / sm / base / lg / xl / 2xl / 3xl / 4xl / 5xl
- Line heights per scale step
- Letter spacing adjustments

### Multi-script Support (if needed)
- CJK font: [font] with word-break: keep-all
- RTL considerations
```

**Rules:**
- Blacklisted: Inter, Roboto, Open Sans, Lato, Montserrat, Poppins, Arial
- Minimum 2 weights (Regular + Bold); 3 recommended (Regular + Medium + Bold)
- Fallback chain required for every font stack

### 1-3. Spacing & Layout

```markdown
## Spacing

### Base Unit
- 4px (0.25rem) base unit

### Scale
- 0 / 1 / 2 / 3 / 4 / 5 / 6 / 8 / 10 / 12 / 16 / 20 / 24

### Layout
- Max content width: [value]
- Grid: [columns] columns with [gap] gap
- Container padding: [mobile] / [tablet] / [desktop]

### Breakpoints
- sm: 640px / md: 768px / lg: 1024px / xl: 1280px / 2xl: 1536px
- (or custom values matching the project's needs)
```

### 1-4. Motion & Animation

```markdown
## Motion

### Duration Scale
- fast: 100ms — micro-interactions (hover, focus)
- normal: 200-300ms — transitions (expand, slide)
- slow: 400-500ms — entrance animations

### Easing
- default: cubic-bezier(0.4, 0, 0.2, 1)
- enter: cubic-bezier(0, 0, 0.2, 1)
- exit: cubic-bezier(0.4, 0, 1, 1)

### Rules
- Only animate transform and opacity (GPU-composited)
- Respect prefers-reduced-motion
```

### 1-5. Component Patterns

```markdown
## Components

### Border Radius
- none / sm / md / lg / xl / full
- Default for cards: [value]
- Default for buttons: [value]
- Default for inputs: [value]

### Shadows
- sm / md / lg / xl — defined per elevation level
- Dark mode shadow strategy

### States
- Hover: [approach — opacity, color shift, scale]
- Active/Pressed: [approach]
- Focus: [ring style, color, offset]
- Disabled: [opacity, cursor]
```

---

## Step 2: Define Component Guidelines

### 2-1. Core Components

For each core component, define visual specifications:

| Component | Variants | Default Size | Notes |
|-----------|----------|-------------|-------|
| Button | primary, secondary, ghost, danger | md (h-10 px-4) | Icon-only variant available |
| Input | text, select, textarea, checkbox | md (h-10) | Error state with red border |
| Card | default, elevated, outlined | — | Consistent padding and radius |
| Badge | status, count, label | sm | Color matches semantic colors |
| Modal | sm, md, lg | md (max-w-lg) | Backdrop blur optional |
| Toast | success, error, warning, info | — | Auto-dismiss timing |

### 2-2. Layout Components

Define page-level structures:
- **Sidebar**: width, collapse behavior, mobile treatment
- **Header**: height, sticky behavior, content alignment
- **Footer**: layout, link structure
- **Page Shell**: how sidebar + header + content compose

---

## Step 3: Write DESIGN.md

Compile all decisions into a single `DESIGN.md` at the project root.

**Structure:**

```markdown
# Design System — [Project Name]

> [One-line design philosophy]

## 1. Brand Identity
[Product description, personality, tone]

## 2. Colors
[Full palette from Step 1-1]

## 3. Typography
[Font stack and type scale from Step 1-2]

## 4. Spacing & Layout
[Spacing scale and layout rules from Step 1-3]

## 5. Motion
[Animation rules from Step 1-4]

## 6. Component Tokens
[Border radius, shadows, states from Step 1-5]

## 7. Component Guidelines
[Core and layout components from Step 2]

## 8. Accessibility
[WCAG level, contrast requirements, focus management]

## 9. Do / Don't
[Project-specific rules — what to always do, what to never do]
```

**Validation before writing:**
1. Every color has OKLCH value defined — **FAIL** if hex-only
2. No blacklisted fonts used — **FAIL**
3. Contrast ratios documented for text on primary surfaces — **FAIL** if missing
4. Dark mode mapping defined (if dark mode required) — **FAIL** if missing
5. At least 6 core components specified — **FAIL** if fewer

---

## Step 4: Integration Check

After creating DESIGN.md, verify it works with the ecosystem:

1. **Tailwind config alignment** — If `tailwind.config.*` exists, verify tokens match. If not, note that `/Qfrontend-design` Step 1-2 should generate config from DESIGN.md
2. **Existing components** — Flag any existing components that deviate from the new spec
3. **Print summary** to the user:
   - Design philosophy (1 line)
   - Font choices
   - Primary + accent colors
   - Key differentiator

---

## Handoff

After DESIGN.md is created, output:

```
DESIGN.md created at [path].

All frontend skills will now reference this file:
- /Qfrontend-design — reads DESIGN.md for tokens and guidelines
- Coding experts — follow component patterns defined here
- /Qdesign-audit — validates implementation against this spec

Next steps:
- Run /Qfrontend-design to start implementing components
- Run /Qdesign-audit after implementation to verify compliance
```

## Quick Reference

| Token | Where Defined | Used By |
|-------|--------------|---------|
| Colors | DESIGN.md > Colors | tailwind.config, component styles |
| Fonts | DESIGN.md > Typography | tailwind.config, global CSS |
| Spacing | DESIGN.md > Spacing | tailwind.config, layout components |
| Motion | DESIGN.md > Motion | tailwind.config, transition utilities |
| Components | DESIGN.md > Components | all UI implementation |

## Never Use

- Generic design systems copied from Material/Ant/Chakra without customization
- Hex-only color definitions (use OKLCH)
- Blacklisted fonts (Inter, Roboto, Open Sans, Lato, Montserrat, Poppins, Arial)
- Undefined magic numbers — every value must trace to a token
- "TBD" or placeholder values — decide now or ask the user
