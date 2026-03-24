# Phase Research: Hook Performance Optimization

**Researched:** 2025-05-24
**Domain:** Node.js Performance, LLM Latency, File I/O Optimization
**Confidence:** HIGH

## Summary

This research identifies critical performance bottlenecks in the QE Framework's lifecycle hooks and proposes strategies to reduce latency and overhead.

**Primary recommendation:** Implement persistent file-based caching for CJK translations in `prompt-check.mjs` and consolidate fragmented state files into a single unified `state.json` to minimize redundant I/O in tool-use hooks.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js | v18+ | Runtime | Native `fetch` (v18+) and `fs` (v20+ `recursive:true`) |
| Claude API | Haiku 3.5 | Keyword Extraction | Lowest latency and highest cost-efficiency for classification tasks. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|--------------|
| `lru-cache` | 10.x | Memory Caching | When per-process in-memory caching is needed (unlikely for short-lived hooks). |
| `better-sqlite3` | 11.x | State Management | If JSON state grows beyond 100KB or I/O contention occurs. |

## Architecture Patterns

### Pattern 1: Persistent File-Based LRU Cache
Since Node.js hooks are short-lived processes (spawned per event), in-memory caching is lost between calls. A persistent cache (JSON or SQLite) is required.

**Recommended Structure:**
```json
// .qe/cache/cjk-translations.json
{
  "f7d8c9...": {
    "original": "도움말 보여줘",
    "keywords": "help info usage",
    "at": "2024-05-24T12:00:00Z"
  }
}
```

### Pattern 2: Unified State Single-IO
Reduce I/O operations by merging fragmented files into a single state object.

**Before (Current):**
- Read `session-stats.json`
- Read `intent-route.json`
- Read `pending-feedback.json`
- Write `session-stats.json`

**After (Proposed):**
- Read `state.json` (contains all keys)
- Modify in-memory object
- Write `state.json` (once per hook execution)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic Writes | Custom `renameSync` logic | `write-file-atomic` | Handles cross-device renames, EPERM retries, and permissions correctly. |
| LRU Caching | Manual object size management | `lru-cache` | Complex logic for expiration and size limits. |

## Common Pitfalls

### Pitfall 1: Synchronous Network I/O in Blocking Hooks
**What goes wrong:** Calling `fetch` with a 3s timeout in a `UserPromptSubmit` hook blocks the user UI.
**How to avoid:** Use a shorter timeout (e.g., 800ms) and fallback to local CJK substring matching if the API is slow.

### Pitfall 2: Atomic Write Overhead
**What goes wrong:** `atomicWriteJson` (write + rename) is 2-3x slower than a raw `writeFileSync`.
**How to avoid:** Only use atomic writes for critical data. For stats (e.g., `tool_calls`), a regular write or throttled update is sufficient.

## Code Examples

### Optimized CJK Cache Pattern
```javascript
// Source: Project recommendation based on local caching patterns
async function getTranslatedKeywords(message, routeKeys) {
  const hash = crypto.createHash('md5').update(message).digest('hex');
  const cachePath = join(cwd, '.qe', 'cache', 'cjk-keywords.json');
  
  // 1. Check local cache first
  if (existsSync(cachePath)) {
    const cache = JSON.parse(readFileSync(cachePath, 'utf8'));
    if (cache[hash]) return cache[hash].keywords;
  }

  // 2. Fallback to API with short timeout
  try {
    const keywords = await translateToKeywords(message, routeKeys, { timeout: 800 });
    // 3. Update cache
    updateCache(cachePath, hash, keywords);
    return keywords;
  } catch {
    return ''; // Silent fallback to local matching
  }
}
```

## Open Questions

1. **Does the `claude-haiku-4-5-20251001` model ID exist?**
   - What we know: The current script uses this ID.
   - What's unclear: This ID format looks like a placeholder or a very recent preview.
   - Recommendation: Verify the model ID against the `~/.claude/.credentials.json` capabilities or use `claude-3-5-haiku` as the stable target.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All hooks | ✓ | 23.6.0 | — |
| sqlite3 | State mgmt | ✓ | 3.43.2 | JSON-based state |
| fetch | API calls | ✓ | Native | — |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.x |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run hooks/scripts/` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command |
|--------|----------|-----------|-------------------|
| PERF-01 | CJK Cache hit skips API call | Unit | `npx vitest -t "CJK cache"` |
| PERF-02 | Single I/O for multiple states | Unit | `npx vitest -t "state consolidation"` |
| PERF-03 | API timeout <= 1s | Unit | `npx vitest -t "api timeout"` |

### Sources
- [Anthropic Official Docs] - Prompt Caching and Haiku latency.
- [Node.js File System Docs] - Atomic rename vs write performance.

## Bottleneck Analysis (Identified Lines)

### `hooks/scripts/prompt-check.mjs`
- **Line 127:** `translatedTerms = await translateToKeywords(userMessage, routeKeys);`
  - *Pattern:* Synchronous `await` on network fetch within a blocking hook.

### `hooks/scripts/pre-tool-use.mjs`
- **Lines 42, 60, 75, 139, 239, 266:** Redundant `readFileSync` for fragmented JSON files.
- **Line 301:** `atomicWriteJson(statsFile, stats);`
  - *Pattern:* Fragmented state reads and heavy atomic write on *every* tool call.

### `hooks/scripts/post-tool-use.mjs`
- **Lines 38, 60, 83:** Repeated reads of `tool-errors.json` and `session-stats.json`.
- **Lines 52, 91:** Redundant atomic writes.
