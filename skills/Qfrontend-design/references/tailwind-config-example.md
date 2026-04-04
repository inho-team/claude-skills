# Tailwind Config Setup Example

> **Stitch integration**: If `design-context.md` exists (from Step 0-S), map its extracted values directly into the config below. Stitch tokens take precedence over example defaults.

```js
// tailwind.config.js
export default {
  theme: {
    extend: {
      // 1. Fonts -- Blacklisted fonts prohibited, refer to reference/typography.md
      fontFamily: {
        display: ['"Outfit"', 'sans-serif'],
        body: ['"Instrument Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        // Korean project example
        // display: ['"Gmarket Sans"', 'sans-serif'],
        // body: ['"Pretendard"', 'sans-serif'],
      },

      // 2. Colors -- OKLCH-based, brand neutral tinting
      colors: {
        brand: {
          50:  'oklch(0.95 0.02 250)',
          100: 'oklch(0.90 0.04 250)',
          500: 'oklch(0.60 0.20 250)',  // primary
          900: 'oklch(0.20 0.05 250)',
        },
        surface: {
          0: 'oklch(0.98 0.005 250)',   // page background
          1: 'oklch(0.95 0.008 250)',   // card
          2: 'oklch(0.92 0.01 250)',    // elevated
        },
      },

      // 3. Spacing -- 4pt system
      spacing: {
        '4.5': '1.125rem',  // 18px -- 4pt grid extension
      },

      // 4. Type scale -- modular scale
      fontSize: {
        'display': ['clamp(2.5rem, 5vw + 1rem, 4.5rem)', { lineHeight: '1.1' }],
        'heading': ['clamp(1.5rem, 3vw + 0.5rem, 2.5rem)', { lineHeight: '1.2' }],
      },

      // 5. Animation -- 100/300/500 rule
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-expo': 'cubic-bezier(0.7, 0, 0.84, 0)',
      },
      transitionDuration: {
        'instant': '100ms',
        'state': '300ms',
        'modal': '500ms',
      },

      // 6. Responsive -- container queries
      containers: {
        'card': '400px',
        'sidebar': '300px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/container-queries'),
  ],
}
```

**Checklist** (verify after setup):
- [ ] `fontFamily` -- No blacklisted fonts used, language-specific fonts designated
- [ ] `colors` -- Brand palette + neutral tinting + semantic (success/error/warning)
- [ ] `spacing` -- Based on 4pt grid
- [ ] `fontSize` -- `clamp()` applied to display/heading
- [ ] `transitionTimingFunction` -- Exponential easing defined
- [ ] dark mode -- `darkMode: 'class'` or `'media'` configured

**For non-Tailwind projects**: Define the same tokens as CSS custom properties in `:root`. The key principle is **tokens before code**.
