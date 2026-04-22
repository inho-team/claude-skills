# Contract Manifest

<!-- tests: hooks/scripts/lib/__tests__/contract-lock.test.mjs -->

File-listing and name-validation utilities for `.qe/contracts/`. Acts as the single gateway that turns a contract name into a filesystem path, enforcing name-safety rules.

---

## Signature

```ts
interface ResolvedContract {
  path: string;
  state: 'active' | 'pending';
}

export function isValidContractName(name: string): boolean;

export function assertValidContractName(name: string): void;

export function resolveContractPath(
  name: string,
  baseDir?: string
): ResolvedContract | null;

export function listActive(baseDir?: string): string[];

export function listPending(baseDir?: string): string[];

export function contractExists(name: string, baseDir?: string): boolean;
```

## Purpose

Contract Manifest provides file-listing and name-validation utilities for `.qe/contracts/`.
Acts as the single gateway that turns a contract name into a filesystem path, enforcing name-safety rules (alphanumeric + hyphen + underscore, 64 chars max, non-reserved).

## Constraints

- Name regex: `^[a-zA-Z0-9_-]+$`, length 1–64
- Reserved names (case-insensitive) rejected: `template`, `readme`, `__proto__`, `constructor`, `prototype`
- All listing functions filter out dotfiles, `TEMPLATE.md`, `README.md`, non-`.md` files
- `listActive`/`listPending` return names WITHOUT `.md` extension, sorted alphabetically
- Missing directory → `[]` (not throw)

## Invariants

- `isValidContractName` and `assertValidContractName` agree: valid iff assert does not throw
- `resolveContractPath` searches active/ before pending/ and returns the FIRST match (active wins on duplicate names)
- `contractExists(x)` returns `true` iff `resolveContractPath(x) !== null`
- Reserved names always fail validation regardless of filesystem state
- Name validation is the ONLY authority for name safety — downstream libs rely on it

## Error Modes

```ts
Error("Invalid contract name: <name>")  // any validation failure
```

---

## Notes

- Name validation throws immediately on any invalid input (null, undefined, non-string, length out of range, reserved, non-alphanumeric)
- All functions silently return empty array/null on filesystem errors instead of throwing
- `baseDir` parameter defaults to `process.cwd()` if omitted
