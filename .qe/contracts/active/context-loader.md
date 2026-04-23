# Contract: context-loader

On-demand context injection loader. Dynamically loads user profile, project memory, failure summaries, and domain knowledge documents from folder-aware `.qe/` subdirectories when requested, with fault tolerance and null fallback.

## Signature

```ts
type LoaderKey = 'profile' | 'memory' | 'failures' | 'docs';

type PendingContextItem = {
  key: LoaderKey;
  message: string;
};

export const LOADER_KEYS: {
  PROFILE: 'profile';
  MEMORY: 'memory';
  FAILURES: 'failures';
  DOCS: 'docs';
};

export function loadProfile(cwd: string): string | null;
export function loadMemory(cwd: string): string | null;
export function loadFailures(cwd: string, limit?: number): string | null;
export function loadDocs(cwd: string): string | null;
export function loadPendingContext(cwd: string, alreadyLoaded: string[]): PendingContextItem[];
```

## Purpose

Provides four lazy-loading functions for session context injection: profile (corrections + command patterns from `.qe/profile/`), memory (project directives from memory module), failures (recent session summaries), and docs (domain knowledge from `.qe/docs/`). Each function returns an injection message string on success or null if nothing is available. `loadPendingContext` orchestrates all four, skipping keys already loaded in the current session.

## Constraints

- Input: `cwd` (project root, assumed to be a string; falsy values handled by called functions)
- Context root: `.qe/` folder and subdirectories (profile, docs, learning/failures implied)
- Registry: no explicit registry; folder structure assumed (`.qe/profile/corrections.md`, `.qe/profile/command-patterns.md`, `.qe/docs/*.md`)
- Priority ordering: profile → memory → failures → docs (via `loadPendingContext` iteration)
- Character limits: corrections 500 chars, patterns 300 chars, rules 300 chars per doc (intentional token budgets)
- Config files: no `.json/.yaml` filtering in this module (caller responsibility)
- Memory formatting: delegated to `formatMemoryForInjection` from memory.mjs
- Failure loading: delegated to `readRecentFailures` from failure-capture.mjs
- No caching, no environment variables, no side effects

## Invariants

- All four loader functions are fault-tolerant: never throw, always return string | null
- Missing `.qe/profile/`, `.qe/docs/`, or subdirectories yield null (no errors)
- `loadProfile` returns null if both corrections.md and command-patterns.md are missing or empty
- `loadDocs` scans up to 10 files, ignores those starting with `_`, returns null if docFiles.length === 0
- `loadFailures` accepts optional limit parameter (default 3)
- `loadPendingContext` returns array of { key, message } pairs for items that produced content only; skips keys in alreadyLoaded set
- Message format: `[Label] content` (e.g., `[User Profile] ...`, `[Domain Knowledge] ...`)
- Line numbers in code: readFileSync UTF-8 only, no binary handling
- LOADER_KEYS object is read-only constant

## Error Modes

```ts
type ContextLoaderError = never;
// All functions are total — never throw
// Missing files → null return
// Invalid cwd → null return via delegated module (memory.mjs, failure-capture.mjs)
// Malformed content (e.g., regex no match) → null return or empty string
// readFileSync I/O failure caught by try/catch → null return
// alreadyLoaded not an array → potential iteration error (caller responsibility)
```

## Notes

- Test file not found at `.qe/contracts/lib/__tests__/context-loader.test.mjs`
- `formatMemoryForInjection` and `readRecentFailures` are external dependencies (memory.mjs, failure-capture.mjs)
- Regex patterns match markdown section headers (e.g., `## Corrections\n` followed by content until next `##` or EOF)
- `loadDocs` extracts YAML frontmatter fields (topic, domain, confirmed) and Core Rules section; summaries capped at 300 chars
- Fault tolerance design mirrors original session-start.mjs behavior (Check 4.5, 5, 5.5, 6)
