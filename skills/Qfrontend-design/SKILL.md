---
name: Qfrontend-design
description: Creates original, production-grade frontend interfaces from scratch. Use when building new web components, pages, dashboards, React components, HTML/CSS layouts, or decorating UI. Distinct from Qweb-design-guidelines which reviews existing UI — this skill creates new UI with high design quality. Supports `--canvas` flag to render generated UI live via browser MCP and return a screenshot. On re-invocation, automatically picks up inline `<!-- claude: ... -->` directives from existing files and merges them into the brief.
version: "1.2.0"
invocation_trigger: When framework initialization, maintenance, or audit is required.
recommendedModel: haiku
---


This skill creates distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. It implements real, working code with exceptional attention to aesthetic detail and creative choices.

## Step 0: Context Gathering (Required)

Before any design work, gather essential context. Code tells you what was built, not who it's for or what it should feel like.

### 0-0. DESIGN.md Gate (Mandatory)

**Check for `DESIGN.md` in the project root FIRST.**

- **If `DESIGN.md` exists**: Use it as the single source of truth for all design tokens, colors, typography, spacing, and component guidelines. Proceed to Step 0-1.
- **If `DESIGN.md` does NOT exist**: **STOP.** Do not proceed with frontend implementation.
  ```
  ⚠️ DESIGN.md가 없습니다.
  프론트엔드 작업 전에 /Qdesign을 먼저 실행하세요.
  designmd.ai에서 프로젝트에 맞는 디자인 시스템을 찾아볼 수 있습니다.

  Run /Qdesign to create a design system specification first.
  ```
  - If `.impeccable.md` exists but no `DESIGN.md`: still STOP, but note that `/Qdesign` can migrate `.impeccable.md` tokens into the canonical DESIGN.md format.
  - Do NOT fall back to asking the user design questions — `/Qdesign` handles that with full context including designmd.ai references.

### 0-1. Additional Context (after DESIGN.md confirmed)

1. Check current instructions for existing Design Context
2. Review `.impeccable.md` from project root (if exists) — merge any extra tokens not in DESIGN.md
3. **Check for Stitch project** — if the user designed screens in Stitch, run Step 0-S before proceeding

### Step 0-S: Stitch Design Context Extraction (When Stitch project exists)

See references/stitch-extraction.md for the full Stitch extraction procedure and design-context.md template.

## Step 1: Design Foundation

### 1-1. Design Thinking

Commit to a bold aesthetic direction:
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Choose an extreme: ultra-minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy, editorial/magazine, brutalist/raw, Art Deco/geometric, soft/pastel, industrial/utilitarian, etc.
- **Constraints**: Technical requirements (framework, performance, accessibility)
- **Differentiation**: What is the one thing someone will remember?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Both bold maximalism and refined minimalism work — the key is intentionality, not intensity.

### 1-2. Tailwind Config Setup (Required)

Set up `tailwind.config` before writing any code. Design tokens must be defined upfront to maintain consistency across components.

See references/tailwind-config-example.md for the full config example, checklist, and Stitch integration notes.

### 1-3. Component Breakdown (Required)

Do not build the entire page at once. Break it down into components and complete them one by one.

**Process:**
1. **Decompose** — Break the page into independent components
2. **Prioritize** — Start with core components (typically: layout shell > header/nav > main content > sidebar > footer)
3. **Implement individually** — Implement only one component at a time
4. **Verify individually** — Check the component in the browser + Agentation feedback
5. **Next** — Move to the next component after verification is complete

**Decomposition example:**
```
Landing Page
├── Layout Shell          ← Priority 1: overall structure, global styles
├── Header / Navigation   ← Priority 2
├── Hero Section          ← Priority 3: core content
├── Features Grid         ← Priority 4
├── Testimonials          ← Priority 5
├── CTA Section           ← Priority 6
└── Footer                ← Priority 7
```

**Rules:**
- Do not move to the next component before completing the current one
- Each component must work independently (renderable without other components)
- Proceed to the next step only after the user has reviewed and approved the component
- Define common elements (buttons, cards, inputs, etc.) as reusable at the point of first use

## Step 2: Component Implementation

Repeat the following for each component:

### 2-1. Implementation

Write code using tokens from the Tailwind config. Minimize custom values (`[arbitrary]`) — if a value not in the config is needed, add it to the config.

### 2-2. Validation Gates (Required — Every Component)

Must pass before outputting each component:

#### Gate 1: Font Validation

Fonts are a key factor determining design polish.

1. Blacklisted font usage check — Inter, Roboto, Open Sans, Lato, Montserrat, Poppins, Arial = **FAIL**
2. Language coverage — Fonts designated that support all scripts in the content. Not designated = **FAIL**
3. Script-specific requirements — RTL (Arabic), line-height (CJK/Thai/Devanagari), missing shaping = **FAIL**
4. Weight variety — Only Regular with no Bold = **FAIL**
5. Pairing violation — Two similar Sans fonts combined = **FAIL**
6. Fallback chain — No fallback designated for characters the primary font cannot cover = **FAIL**

> `reference/typography.md`

#### Gate 2: Layout Integrity

Text overflow, container breakout, and margin collapse are critical failures.

1. Text overflow defense — `overflow-wrap: break-word` or Tailwind `break-words` not applied = **FAIL**
2. `word-break: keep-all` (`break-keep-all`) not applied to CJK content = **FAIL**
3. `min-w-0` not applied to flex/grid children = **FAIL**
4. `max-w-full` not applied to images/media = **FAIL**
5. Fixed width usage — Responsive alternative (`max-w-*` or `w-full max-w-[Xpx]`) not used = **FAIL**
6. Gap vs margin — Spacing handled with margin in flex/grid instead of gap = **FAIL**
7. `truncate` or `line-clamp-*` not applied to dynamic content = **FAIL**

> `reference/typography.md` (Text Overflow), `reference/spatial-design.md` (Layout Integrity)

### 2-3. User Verification

Verify the component in the browser. If modifications are needed, proceed to **Step 3 (Agentation)**.

Once verified, return to the next component and repeat Step 2.

## Step 3: Visual Feedback Loop (Required for Modifications)

When modifying existing UI — **Agentation is mandatory**.

1. **Start Agentation**: User runs `npx agentation` on the target page
2. **User clicks elements**: Each click captures CSS selector, source file path, computed styles, and component tree
3. **Agent receives structured context**: Exact targets with coordinates, not vague descriptions
4. **Implement changes**: Modify only the identified elements

**Why mandatory**: "Fix the header" is ambiguous. A click on the exact element gives selector, file, line number, and current styles — zero guesswork.

If Agentation is not set up, guide the user through `/Qagentation` before proceeding.

**Exception**: Skip when the user provides exact file paths and CSS selectors themselves, or when creating entirely new UI (Step 1-2 flow).

## Reference Docs

| Reference | When to consult |
|-----------|----------------|
| `design-context.md` | Stitch-extracted tokens (colors, fonts, spacing) — use as source of truth when present |
| `reference/typography.md` | Font selection, type scale, overflow defense, multi-script rules |
| `reference/color-and-contrast.md` | Palette design, OKLCH, dark mode, WCAG contrast |
| `reference/spatial-design.md` | Spacing systems, layout integrity, layout grids |
| `reference/motion-design.md` | Timing, easing curves, animation performance |
| `reference/interaction-design.md` | States, focus management, forms, modals |
| `reference/responsive-design.md` | Mobile-first, container queries, input detection |
| `reference/ux-writing.md` | Button labels, error messages, tone, i18n |

## Canvas Preview (--canvas flag)

When the `--canvas` flag is present in the invocation (e.g., `/Qfrontend-design --canvas "pricing page hero section"`), the skill automatically renders the generated UI live and captures a screenshot.

### Sequence

1. **File Generation**: Complete the UI file generation (HTML, TSX, JSX, etc.) normally.
2. **Plan Building**: Import and invoke `buildPlan(generatedFilePath, projectRoot)` from `hooks/scripts/lib/canvas-preview.mjs`.
3. **Framework Check**: 
   - **If `plan.framework !== 'static'` AND `plan.framework !== 'none'`**: Inform the user that the dev server at `plan.port` must be running. Document the expected command (e.g., `npm run dev`) but do NOT auto-start it.
   - **If `plan.framework === 'static'` OR `plan.framework === 'none'`**: Proceed directly to MCP invocation.
4. **MCP Invocation** (first available wins):
   - **Primary**: `mcp__playwright__browser_navigate(plan.url)` → `mcp__playwright__browser_wait_for(plan.waitFor)` → `mcp__playwright__browser_take_screenshot()` → return screenshot path
   - **Fallback 1**: `mcp__claude-in-chrome__navigate()` → `mcp__claude-in-chrome__computer(screenshot)` (adapt waitFor semantics to visible indicators)
   - **Fallback 2**: Neither available — output file path + plan object as metadata (graceful fallback per `plan.fallback === 'file-path-only'`)
5. **Return to User**: Screenshot path (if captured) or file path (if fallback), plus the `plan` object as metadata.

### Usage Examples

**Example 1 — Basic Canvas**
```
/Qfrontend-design --canvas "pricing page hero section"
```
Generates a pricing hero component and automatically captures a live screenshot from the browser.

**Example 2 — Explicit File Target**
```
/Qfrontend-design --canvas src/pages/about.tsx
```
Previews the generated or existing file at `src/pages/about.tsx`, requiring the dev server to be running for framework-based files.

## Inline Claude Comment Pickup

Allow users to annotate source code with `<!-- claude: <instruction> -->` comments that persist in the file. On the next `/Qfrontend-design` invocation targeting the same file, the skill automatically extracts these directives and merges them into the design brief, enabling iterative refinements without re-stating previous requests.

### Purpose

Users can embed refinement instructions directly in the code as HTML comments (e.g., `<!-- claude: make CTA button larger and more prominent -->`). These directives survive code generation because the parser identifies and extracts them before reading, and they are marked for removal after being applied. This creates a conversation history within the file itself, reducing context loss across skill invocations.

### Detection & Parsing

Uses `extractDirectives(filePath)` from `hooks/scripts/lib/inline-comment-parser.mjs`. The parser:
- Identifies all `<!-- claude: <text> -->` comments in the file
- Returns an array of objects: `{ directive, targetLine, file }`
- Each object contains the instruction text, the 1-indexed line number of the code it annotates, and the file path
- Returns an empty array if the file does not exist or if no directives are found
- Never throws — errors are handled gracefully

### Integration Flow

1. **Before generation**, if the target file exists and is being re-processed, call `extractDirectives(targetFilePath)`
2. **Collect directives** into a list with their line numbers
3. **Prepend to system brief**: Add a section like:
   ```
   Apply these inline edits from the file:
   - Line 12: make CTA button larger and more prominent
   - Line 45: use primary color instead of secondary
   ```
   The user's original request takes precedence; directives provide additional context.
4. **Proceed with generation** — Claude now sees both the user request and the inline constraints
5. **Remove directives from output** — After generation, strip all `<!-- claude: ... -->` comments from the updated file. These comments have been consumed and should not accumulate.

### Edge Cases & Behavior

- **File does not exist** (new file) → `extractDirectives` returns empty array; proceed with normal generation
- **No directives found** → empty array; normal flow unchanged
- **Directives conflict with user prompt** → AI reconciles, prioritizing the explicit user request in this invocation
- **Multiple directives on same line** → All are collected and listed in the brief
- **Directive targets no code** → Parser defaults to the comment line itself as the target
- **File is not HTML/TSX/etc.** → Parser still works if file is text-readable (can apply to Markdown, CSS files, etc.)

### Example Scenario

**Source file `src/Hero.tsx` (existing from previous iteration):**
```tsx
<!-- claude: make CTA button larger and more prominent -->
<button className="px-4 py-2">Sign up</button>

<h1 className="text-2xl">Welcome</h1>
<!-- claude: add subtle gradient background -->
```

**User invokes:** `/Qfrontend-design src/Hero.tsx "minor polish"`

**Skill execution:**
1. Calls `extractDirectives("src/Hero.tsx")`
2. Returns: `[{directive: "make CTA button larger and more prominent", targetLine: 2, file: "src/Hero.tsx"}, {directive: "add subtle gradient background", targetLine: 5, file: "src/Hero.tsx"}]`
3. Prepends to brief: "Apply these inline edits from the file:\n- Line 2: make CTA button larger and more prominent\n- Line 5: add subtle gradient background"
4. Generates updated component with larger button and gradient background
5. Removes both `<!-- claude: ... -->` comments from the output file

**Result**: Claude applies both "minor polish" and the two inline directives in a single pass. The file is cleaner for the next iteration (no stale comments).

## Diagrams: Mermaid → Image Pipeline

When the design includes flowcharts, architecture diagrams, ERDs, or any visual diagram:

1. **Write Mermaid code** — use `/Qmermaid-diagrams` for syntax reference
2. **Render to image**:
   ```bash
   mmdc -i diagram.mmd -o diagram.png -t neutral -b transparent -s 2
   mmdc -i diagram.mmd -o diagram.svg -t neutral -b transparent
   ```
3. **Embed in HTML**: `<img src="diagram.svg" alt="..." />`
4. **Iterate with Agentation** — user clicks the diagram to adjust size, position, caption

## Aesthetic Guidelines (Quick Reference)

- **Typography**: Must refer to `reference/typography.md`. Blacklisted fonts prohibited. Dedicated fonts for all scripts + appropriate line-height + fallback chain required.
- **Color**: OKLCH for perceptual uniformity. Defined in Tailwind config. Dominant color + sharp accent > evenly distributed palette.
- **Motion**: 100/300/500ms rule. Use `transitionTimingFunction` from config. Only animate `transform` and `opacity`.
- **Spatial**: 4pt base unit. Use spacing tokens from config. Prefer gap over margin.
- **Backgrounds**: Gradient meshes, noise textures, geometric patterns — match the aesthetic.

## Never Use

- Overused fonts (Inter, Roboto, Arial, system fonts for design-heavy work)
- Cliched color schemes (purple gradients, cyan-on-dark, neon-on-dark)
- Predictable layouts and cookie-cutter component patterns
- Glassmorphism, generic shadows, sparklines as mere decoration
- Bounce/elastic easing (feels dated)
- Tailwind arbitrary values(`[...]`) when a config token should exist instead

No two designs should look the same. Vary themes, fonts, aesthetics across generations.

## Quality Test

Would someone immediately recognize this as AI-generated? If yes, rethink. Distinctive design makes people ask "how was this made?" not "which AI made this?"

**Match implementation complexity to the aesthetic vision.** Maximalist = sophisticated code with extensive animations. Minimalist = restraint, precision, careful spacing and typography.
