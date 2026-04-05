---
name: Qweb-design-guidelines-vercel
description: 'Review UI code for Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices".'
metadata: 
author: vercel
version: 2.0.0
argument-hint: <file-or-pattern>
invocation_trigger: When specialized language or framework best practices are needed.
recommendedModel: haiku
---

# Web Interface Guidelines

Review files for compliance with Web Interface Guidelines and quality standards.

## How It Works

1. Fetch the latest guidelines from the source URL below
2. Read the specified files (or prompt user for files/pattern)
3. Check against all rules in the fetched guidelines
4. Apply lint, a11y, security, and anti-pattern checks
5. Output findings in the terse `file:line` format

## Guidelines Source

Fetch fresh guidelines before each review:

```
https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md
```

## Code Patterns

Use design-system-aligned component patterns:

### Basic: Accessible Button
```jsx
/**
 * Button component with ARIA attributes.
 * @param {string} variant - 'primary' | 'secondary' | 'ghost'
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {boolean} disabled - Disables interaction and updates aria-disabled
 */
export const Button = ({ variant = 'primary', size = 'md', disabled, ...props }) => (
  <button className={`btn btn--${variant} btn--${size}`} aria-disabled={disabled} {...props} />
);
```

### Error Handling: Error State UI
```jsx
export const Input = ({ error, ...props }) => (
  <div className="input-wrapper">
    <input aria-invalid={!!error} aria-describedby={error ? 'error-msg' : undefined} {...props} />
    {error && <span id="error-msg" className="error" role="alert">{error}</span>}
  </div>
);
```

### Advanced: Responsive Layout with CSS Custom Properties
```css
:root {
  --spacing-unit: clamp(0.5rem, 2vw, 1rem);
  --container-width: clamp(20rem, 90vw, 70rem);
  --text-size: clamp(1rem, 2.5vw, 1.25rem);
}

.container { width: var(--container-width); margin: 0 auto; }
@supports (display: grid) {
  .grid { display: grid; gap: var(--spacing-unit); grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); }
}
```

## Comment Template

Use JSDoc for design-system components:

```jsx
/**
 * {Component description}
 * @component
 * @param {Object} props
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Component size variant
 * @param {string} [props.variant='primary'] - Design system variant
 * @param {'light'|'dark'} [props.theme] - Color scheme (respects prefers-color-scheme)
 * @param {string} [props.className] - Additional CSS classes
 * @param {boolean} [props.disabled] - Disables and sets aria-disabled
 * @param {string} [props.ariaLabel] - Accessible name (required if no visible label)
 * @returns {JSX.Element}
 * @example
 * <Button variant="primary" size="lg" onClick={handleClick}>Submit</Button>
 */
```

## Lint Rules

Apply these linters in CI/CD:

- **eslint** with `eslint-plugin-react` and `eslint-plugin-react-hooks`
- **eslint-plugin-jsx-a11y**: enforces ARIA attributes, heading hierarchy, img alt text
- **stylelint**: validates CSS custom properties, rem units, color contrast via `stylelint-no-unknown`
- **axe-core**: run automated a11y audits on rendered components
- **prettier**: enforce consistent formatting (2-space indents, trailing commas)

## Security Checklist

Verify these headers and patterns:

1. **Content-Security-Policy (CSP)**: Block `unsafe-inline` styles/scripts; use nonces for dynamic content
2. **Script Injection via CSS**: Never dynamically concatenate class names; use enumerated variants only
3. **Clickjacking Protection**: Set `X-Frame-Options: DENY` (unless intentional iframe usage)
4. **Cookie Security Flags**: Mark session cookies with `Secure`, `HttpOnly`, `SameSite=Strict`
5. **Subresource Integrity**: Add `integrity` attribute to external scripts and stylesheets

## Anti-Patterns (Wrong → Correct)

| Issue | Wrong | Correct |
|-------|-------|---------|
| **Inaccessible Button** | `<div onClick={...}>Click</div>` | `<button onClick={...}>Click</button>` with `aria-label` if needed |
| **Fixed px Sizes** | `font-size: 16px; padding: 16px;` | `font-size: 1rem; padding: 1rem;` (respects user zoom) |
| **z-index Wars** | `z-index: 9999; z-index: 10000;` | Use CSS `@layer` for predictable stacking: `@layer base, theme, utils` |
| **!important Abuse** | `.error { color: red !important; }` | Use specificity or BEM: `.error__text { color: red; }` |
| **Color Contrast Fails** | Light gray text on white | Use `contrast-ratio ≥ 4.5:1` (WCAG AA); test with Axe or WAVE |

## Usage

When a user provides a file or pattern argument:
1. Fetch guidelines from the source URL above
2. Read the specified files
3. Apply lint rules, a11y, security, and anti-pattern checks
4. Output findings using the format specified in the guidelines

If no files specified, ask the user which files to review.
