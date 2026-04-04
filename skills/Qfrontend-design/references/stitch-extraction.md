# Stitch Design Context Extraction (Step 0-S)

When the user has a Stitch project, extract design tokens before writing any code.

**Flow:**
```
Stitch project -> list_screens -> get_screen (each) -> parse HTML/CSS -> design-context.md
```

**Procedure:**
1. `mcp__stitch__list_projects` -> find the target project
2. `mcp__stitch__list_screens` -> get all screens in the project
3. `mcp__stitch__get_screen` -> fetch each screen's HTML/CSS code
4. **Extract design tokens** from the fetched code:
   - **Colors**: all color values (hex, rgb, oklch, hsl) -> group into brand, surface, semantic
   - **Fonts**: font-family declarations -> map to display, body, mono roles
   - **Spacing**: recurring margin/padding/gap values -> identify base unit (4pt, 8pt, etc.)
   - **Typography scale**: font-size values -> map to display, heading, body, caption
   - **Border radius**: recurring radius values
   - **Shadows**: box-shadow declarations
   - **Breakpoints**: media query values (if present)
5. Write `design-context.md` in the project root:

```markdown
# Design Context (extracted from Stitch)

## Source
- Stitch Project: {project_name} ({project_id})
- Screens: {screen_list}
- Extracted: {date}

## Color Palette
| Role | Value | Usage |
|------|-------|-------|
| brand-primary | {value} | {where used} |
| ... | ... | ... |

## Typography
| Role | Font Family | Weight | Size |
|------|-------------|--------|------|
| display | {font} | {weight} | {size} |
| ... | ... | ... | ... |

## Spacing System
- Base unit: {N}px
- Common values: {list}

## Border Radius
- {values}

## Shadows
- {values}
```

6. Use the extracted tokens in **Step 1-2 (Tailwind Config Setup)** -- map Stitch values directly to Tailwind config tokens instead of inventing new ones.

**Key rule**: Stitch design is the source of truth for visual tokens. Do not override Stitch colors/fonts with defaults unless the user explicitly requests it.
