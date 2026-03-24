---
name: Qjs-ts-expert
description: Writes, debugs, and refactors JavaScript and TypeScript code using modern ES2023+ features, advanced type systems, and Node.js/Browser APIs. Use when building JS/TS applications, implementing complex generics, or ensuring end-to-end type safety.
license: MIT
domain: language
triggers: JavaScript, TypeScript, ES2023, async/await, generics, type safety, type guards, discriminated unions, tsconfig, ESM, Node.js, Browser APIs
invocation_trigger: When specialized JavaScript or TypeScript best practices are needed.
recommendedModel: haiku
---

# JS/TS Expert

## When to Use
- Building modern web applications (Frontend/Backend)
- Implementing advanced type systems (generics, mapped types, branded types)
- Optimizing JS/TS performance and memory usage
- Configuring `tsconfig.json` or build systems (Vite, tRPC)

## Core Workflow
1. **Analyze Requirements**: Review `package.json` and `tsconfig.json` for module system and strictness levels.
2. **Design Type Architecture**: (TS only) Plan branded types, generics, and discriminated unions before implementation.
3. **Implement**: Write ES2023+ code with proper async/await patterns and ESM structure.
4. **Validate**: Run `tsc --noEmit` and `eslint --fix`. Resolve all errors before proceeding.
5. **Test**: Ensure 85%+ coverage. Confirm no unhandled Promise rejections.

## Standard Constraints

### MUST DO
- **Strict Mode**: Always enable `strict: true` in TS.
- **Modern Syntax**: Use ES2023+ features (Optional chaining `?.`, Nullish coalescing `??`).
- **ESM**: Prefer `import`/`export` over CommonJS.
- **Type-First**: (TS only) Design types before implementation logic.
- **Explicit Returns**: Always define return types for public APIs.
- **Async Safety**: Always handle async errors explicitly with try/catch.

### MUST NOT DO
- Use `var` (always use `const` or `let`).
- Use `any` without extreme justification.
- Mix CommonJS and ESM in the same module.
- Use `as` assertions without necessity (prefer type guards).
- Use enums (prefer const objects with `as const`).

## Key Patterns

### Branded Types (TS)
```typescript
type Brand<T, B extends string> = T & { readonly __brand: B };
type UserId = Brand<string, "UserId">;
```

### Discriminated Unions & Exhaustive Checks (TS)
```typescript
type State = { status: "success"; data: any } | { status: "error"; err: Error };
function handle(s: State) {
  switch (s.status) {
    case "success": return s.data;
    case "error": return s.err;
    default: const _: never = s; throw new Error(_);
  }
}
```

### Async/Await with Error Handling (JS/TS)
```javascript
async function fetchSafe(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch (e) {
    return null;
  }
}
```
