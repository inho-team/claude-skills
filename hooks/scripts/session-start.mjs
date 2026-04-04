#!/usr/bin/env node
'use strict';

import { readFileSync, existsSync, statSync, unlinkSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { loadConfig } from './lib/config.mjs';
import { atomicWriteJson, readUnifiedState, writeUnifiedState } from './lib/state.mjs';
import { pruneExpired, formatMemoryContext } from './lib/project-memory.mjs';

// Read stdin (Claude Code provides JSON with cwd, session_id, etc.)
let input = '';
try {
  input = readFileSync('/dev/stdin', 'utf8');
} catch {
  process.exit(0);
}

let data;
try {
  data = JSON.parse(input);
} catch {
  // If no valid input, pass through
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

const cwd = data.cwd || data.directory || process.cwd();
const cfg = loadConfig(cwd);
const messages = [];

// --- ALWAYS TIER ---
// These items are injected every session start regardless of context_loaded state.

// Check 1: project instruction artifact existence (Qinit check)
const instructionCandidates = [
  join(cwd, 'CLAUDE.md'),
  join(cwd, 'AGENTS.md')
];
const hasInstructionArtifact = instructionCandidates.some(filePath => existsSync(filePath));
if (!hasInstructionArtifact) {
  messages.push('QE framework not initialized. Run `/Qinit` first.');
}

// --- STALE-CHECK TIER ---
// Freshness / snapshot checks that are cheap to run and always relevant.

// Check 2: .qe/analysis/ freshness
const analysisDir = join(cwd, '.qe', 'analysis');
if (existsSync(analysisDir)) {
  const analysisFiles = ['project-structure.md', 'tech-stack.md', 'entry-points.md', 'architecture.md'];
  const staleThreshold = cfg.analysis_freshness_ms;
  const now = Date.now();

  let staleCount = 0;
  for (const file of analysisFiles) {
    const filePath = join(analysisDir, file);
    if (existsSync(filePath)) {
      const stat = statSync(filePath);
      if (now - stat.mtimeMs > staleThreshold) {
        staleCount++;
      }
    } else {
      staleCount++;
    }
  }

  if (staleCount >= 1) {
    messages.push('[QE] Project analysis looks stale — /Qrefresh would give you fresher context to work from.');
  }
}

// Check 3: .qe/context/snapshot.md existence (resume hint)
const snapshotPath = join(cwd, '.qe', 'context', 'snapshot.md');
if (existsSync(snapshotPath)) {
  const stat = statSync(snapshotPath);
  const ageHours = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60);
  if (ageHours < 24) {
    messages.push('Previous session context saved. Restore with `/Qresume`.');
  }
}

// --- ALWAYS TIER (continued) ---

// Hint: Surface QE toolkit shortcuts — framed as craft advantages, not mandates
const conventionsPath = join(cwd, 'QE_CONVENTIONS.md');
if (existsSync(conventionsPath)) {
  messages.push(
    '[QE] Specialized tools are loaded for common workflows. ' +
    'They tend to produce cleaner outcomes than doing things manually: ' +
    'git commit → /Qcommit (human-style, no AI traces), ' +
    'version bump → /Mbump (updates all manifests atomically), ' +
    'context handoff → /Qcompact (structured snapshot, not ad-hoc notes). ' +
    'Worth reaching for when these patterns come up.'
  );
}

const aiTeamConfigPath = join(cwd, '.qe', 'ai-team', 'config', 'team-config.json');
if (existsSync(aiTeamConfigPath)) {
  messages.push('[AI Team] Multi-model role config detected. Respect role boundaries: planner owns spec artifacts, implementer owns code changes, reviewer performs independent review, supervisor makes the final gate decision.');
}

// Check 4: User language context (language.md)
const languagePath = join(cwd, '.qe', 'profile', 'language.md');
if (existsSync(languagePath)) {
  const langContent = readFileSync(languagePath, 'utf8');
  const langMatch = langContent.match(/Primary language:\s*(\w+)/);
  const userLang = langMatch ? langMatch[1] : null;
  if (userLang && userLang !== 'en') {
    messages.push(`[Language] User language: ${userLang}. Respond in the user's language.`);
  }
}

// Check 5: Git branch and uncommitted changes
try {
  const gitParts = [];

  try {
    const branch = execSync('git branch --show-current', { cwd, encoding: 'utf8', timeout: 3000 }).trim();
    if (branch) gitParts.push(`Branch: ${branch}`);
  } catch {}

  try {
    const diffStat = execSync('git diff --stat', { cwd, encoding: 'utf8', timeout: 3000 }).trim();
    if (diffStat) {
      const changedFiles = diffStat.split('\n').length - 1; // last line is summary
      if (changedFiles > 0) gitParts.push(`${changedFiles} uncommitted change${changedFiles > 1 ? 's' : ''}`);
    }
  } catch {}

  if (gitParts.length > 0) {
    messages.push(`[Git] ${gitParts.join(', ')}`);
  }
} catch {
  // Fault tolerance — ignore git detection errors
}

// --- Project Memory: prune expired and inject active memories ---
try {
  const pruned = pruneExpired(cwd);
  if (pruned > 0) {
    messages.push(`[Memory] Pruned ${pruned} expired project memor${pruned === 1 ? 'y' : 'ies'}.`);
  }
  const memoryCtx = formatMemoryContext(cwd);
  if (memoryCtx) {
    messages.push(memoryCtx);
  }
} catch {
  // Fault tolerance — ignore project memory errors
}

// Cleanup: Remove stale intent-route.json for clean session start
try {
  const intentRoutePath = join(cwd, '.qe', 'state', 'intent-route.json');
  if (existsSync(intentRoutePath)) {
    unlinkSync(intentRoutePath);
  }
} catch {
  // Fault tolerance — ignore cleanup errors
}

// Reset or initialize unified-state for fresh session tracking
try {
  const state = readUnifiedState(cwd);
  if (!state.session_stats) {
    state.session_stats = {
      tool_calls: 0,
      session_start: Date.now(),
      last_warning_at: 0,
      warning_severity: 'none',
      context_loaded: [],
      usage: { input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_creation_tokens: 0 }
    };
  } else {
    // Session persistent stats - keep usage, but reset session-specific flags if needed
    state.session_stats.session_start = Date.now();
  }
  writeUnifiedState(cwd, state);
} catch {
  // Fault tolerance — ignore reset errors
}

if (messages.length > 0) {
  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: `[QE Framework] ${messages.join(' | ')}`
    }
  }) + '\n');
} else {
  process.stdout.write(JSON.stringify({ continue: true }) + '\n');
}
