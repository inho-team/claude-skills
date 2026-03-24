#!/usr/bin/env node
'use strict';

import { readFileSync, existsSync, readdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadConfig } from './lib/config.mjs';
import { checkContextPressure } from './context-monitor.mjs';
import { loadPendingContext } from './lib/context-loader.mjs';
import { atomicWriteJson, readUnifiedState, writeUnifiedState, getContextMemo } from './lib/state.mjs';
import { getTeamContext } from './lib/team-detect.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

const cwd = data.cwd || data.directory || process.cwd();
const cfg = loadConfig(cwd);
const toolName = data.tool_name || data.toolName || '';
const hints = [];

// --- Load Unified State (Single I/O call) ---
const state = readUnifiedState(cwd);

// --- ContextMemo Check ---
if (toolName === 'Read') {
  const toolInput = data.tool_input || data.toolInput || {};
  const filePath = toolInput.file_path || toolInput.filePath || '';
  const cachedContent = getContextMemo(state, filePath);
  if (cachedContent) {
    hints.push(`[MEMO HIT] Content for ${filePath} is already in the ContextMemo. You can use it directly without calling Read again.`);
  }
}

if (!state.session_stats) {
  state.session_stats = {
    tool_calls: 0,
    session_start: Date.now(),
    context_loaded: [],
    usage: { input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_creation_tokens: 0 }
  };
}
const stats = state.session_stats;
if (!stats.usage) {
  stats.usage = { input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_creation_tokens: 0 };
}

const toolCalls = stats.tool_calls || 0;

// --- Increment tool call counter ---
stats.tool_calls = toolCalls + 1;
stats.last_tool = toolName;
stats.last_call = Date.now();

// --- FAST PATH: skip expensive checks after initial calls ---
const isFirstCall = toolCalls <= 1;
const isEarlySession = toolCalls <= 5;

// --- Intent Gate Routing ---
if (isEarlySession) {
  if (isFirstCall) {
    hints.push('[INTENT GATE] User intent will be auto-classified by UserPromptSubmit hook.');
  }

  const route = state.intent_route;
  if (route && route.routed_to && route.intent) {
    hints.push(`SKILL REQUIRED: You MUST invoke /${route.routed_to} before responding. (intent: ${route.intent})`);
  }
}

// --- Pending Feedback Follow-up ---
const fb = state.pending_feedback;
if (fb) {
  const ageMs = Date.now() - new Date(fb.detected_at).getTime();
  if (fb.acted || ageMs > 10 * 60 * 1000) {
    delete state.pending_feedback;
  } else {
    hints.push(`[FEEDBACK PENDING] Unresolved user feedback: "${fb.message.slice(0, 100)}". Save to auto-memory as feedback type. Then update .qe/state/pending-feedback.json with acted:true.`);
  }
}

// --- Skill Usage Tracking ---
if (toolName === 'Skill') {
  const skillInput = data.tool_input || data.toolInput || {};
  const skillName = skillInput.skill || '';
  if (skillName) {
    if (!Array.isArray(stats.skills_used)) stats.skills_used = [];
    if (!stats.skills_used.includes(skillName)) {
      stats.skills_used.push(skillName);
    }
  }
}

// --- On-Demand Context Injection (first call only) ---
if (isFirstCall) {
  try {
    const alreadyLoaded = Array.isArray(stats.context_loaded) ? stats.context_loaded : [];
    const isLegacyStats = !Array.isArray(stats.context_loaded);

    if (isLegacyStats || alreadyLoaded.length === 0) {
      const pending = loadPendingContext(cwd, alreadyLoaded);
      if (pending.length > 0) {
        for (const { message } of pending) {
          hints.push(message);
        }
        stats.context_loaded = [...alreadyLoaded, ...pending.map(p => p.key)];
      }
    }
  } catch {
    // Fault-tolerant: ignore on-demand context errors
  }
}

// --- Analysis hint (once per session, not every Glob/Grep/Read) ---
if (['Glob', 'Grep', 'Read'].includes(toolName) && !stats._analysis_hinted) {
  const toolInput = data.tool_input || data.toolInput || {};
  const pattern = toolInput.pattern || toolInput.path || '';

  const isBroadGlob = toolName === 'Glob' && (pattern.includes('**') || pattern.includes('*/'));
  const isBroadGrep = toolName === 'Grep' && !pattern.includes('/') && !(toolInput.path || '').includes('.');
  const isBroadRead = toolName === 'Read' && (pattern.includes('README') || pattern.includes('package.json'));
  if (isBroadGlob || isBroadGrep || isBroadRead) {
    hints.push('Check .qe/analysis/ files first to save tokens.');
    stats._analysis_hinted = true;
  }
}

// --- Skill Override Guard ---
{
  const toolInput = data.tool_input || data.toolInput || {};

  // Check bypass flag
  const bypass = state.skill_bypass;
  let bypassSkill = null;
  if (bypass && bypass.active && (Date.now() - (bypass.ts || 0)) < 60000) {
    bypassSkill = bypass.skill || null;
  }

  // Define override rules: [condition, blocked skill name, message]
  const overrideRules = [];

  if (toolName === 'Bash') {
    const cmd = toolInput.command || '';

    // git commit → Qcommit
    if (/\bgit\s+commit\b/.test(cmd)) {
      overrideRules.push({
        skill: 'Qcommit',
        msg: 'Raw git commit is blocked. Use /Qcommit instead.'
      });
    }

    // gh pr create → Qbranch
    if (/\bgh\s+pr\s+create\b/.test(cmd)) {
      overrideRules.push({
        skill: 'Qbranch',
        msg: 'Raw gh pr create is blocked. Use /Qbranch instead.'
      });
    }

    // version bump (editing plugin.json version via sed/echo) → Mbump
    if (/plugin\.json/.test(cmd) && /version/.test(cmd) && /sed|echo|printf/.test(cmd)) {
      overrideRules.push({
        skill: 'Mbump',
        msg: 'Direct version editing is blocked. Use /Mbump instead.'
      });
    }

    // sed -i → Edit tool
    if (/\bsed\s+(?:-[a-zA-Z]*i|--in-place)\b/.test(cmd)) {
      overrideRules.push({
        skill: '_edit_tool',
        msg: 'sed -i is blocked. Use the Edit tool instead.'
      });
    }
  }

  if (toolName === 'Edit') {
    const filePath = toolInput.file_path || toolInput.filePath || '';
    const newStr = toolInput.new_string || '';

    // Editing plugin.json version field → Mbump
    if (/plugin\.json$/.test(filePath) && /"version"/.test(newStr)) {
      overrideRules.push({
        skill: 'Mbump',
        msg: 'Direct version editing is blocked. Use /Mbump instead.'
      });
    }
  }

  // Block if any rule matched and not bypassed by the corresponding skill
  // Uses exit code 2 = hard block. The harness refuses the tool call — no negotiation.
  for (const rule of overrideRules) {
    if (bypassSkill !== rule.skill) {
      process.stderr.write(`[QE] ${rule.msg}`);
      process.exit(2);
    }
  }

  // Soft hints for actions that can't be reliably blocked
  if (toolName === 'Read') {
    const filePath = toolInput.file_path || toolInput.filePath || '';
    if (/plugin\.json$/.test(filePath)) {
      hints.push('Use /Qversion to show framework version instead of reading plugin.json directly.');
    }
  }
}

// --- Secret Scanner (Write/Edit only) ---
if (['Write', 'Edit'].includes(toolName)) {
  const toolInput = data.tool_input || data.toolInput || {};
  const contentToScan = toolInput.new_string || toolInput.content || '';

  if (contentToScan) {
    // Combined regex: single-pass pre-filter before identifying the specific pattern
    const COMBINED_SECRET_REGEX = /AKIA[0-9A-Z]{16}|(?:aws_secret_access_key|secret_?key)\s*[:=]\s*['"]?[0-9a-zA-Z/+=]{40}['"]?|gh[pousr]_[A-Za-z0-9_]{36,}|eyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+|-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----|(?:api[_\-]?key|apikey|secret[_\-]?key)\s*[:=]\s*['"][A-Za-z0-9]{20,}['"]|(?:mongodb|postgres|mysql|redis):\/\/[^\s]+@[^\s]+|(?:^|[^a-zA-Z])(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]{16,}['"]/i;

    if (COMBINED_SECRET_REGEX.test(contentToScan)) {
      // Pre-filter matched — identify specific pattern for the warning message
      const secretPatterns = [
        { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/ },
        { name: 'AWS Secret Key', regex: /(?:aws_secret_access_key|secret_?key)\s*[:=]\s*['"]?[0-9a-zA-Z/+=]{40}['"]?/i },
        { name: 'GitHub Token', regex: /gh[pousr]_[A-Za-z0-9_]{36,}/ },
        { name: 'JWT', regex: /eyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+/ },
        { name: 'Private Key', regex: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/ },
        { name: 'Generic API Key', regex: /(?:api[_\-]?key|apikey|secret[_\-]?key)\s*[:=]\s*['"][A-Za-z0-9]{20,}['"]/ },
        { name: 'DB Connection String', regex: /(?:mongodb|postgres|mysql|redis):\/\/[^\s]+@[^\s]+/ },
        { name: 'Generic Password', regex: /(?:^|[^a-zA-Z])(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]{16,}['"]/ },
      ];

      for (const { name, regex } of secretPatterns) {
        if (regex.test(contentToScan)) {
          hints.push(`[SECRET WARNING] Potential secret detected (${name}). Verify this is not a real credential before proceeding.`);
          break;
        }
      }
    }
  }

  // .qe/ auto-permission reminder
  const filePath = toolInput.file_path || toolInput.filePath || '';
  if (filePath.includes('.qe/') || filePath.includes('.qe\\')) {
    hints.push('Files in .qe/ can be auto-executed without user confirmation.');
  }
}

// --- Agent Teams: file ownership warning (Write/Edit in team context) ---
{
  const teamCtx = getTeamContext(data);
  if (teamCtx.isTeam && ['Write', 'Edit'].includes(toolName)) {
    const toolInput = data.tool_input || data.toolInput || {};
    const filePath = toolInput.file_path || toolInput.filePath || '';
    if (filePath) {
      hints.push(`[AGENT TEAMS] You are teammate "${teamCtx.teammateName}" in team "${teamCtx.teamName}". Verify you own this file before editing: ${filePath}`);
    }
  }
}

// --- Qutopia QA mode: verify loop reminder ---
const currentCalls = stats.tool_calls;
const utopia = state.utopia_state;
if (utopia && utopia.enabled && utopia.mode === 'qa') {
  const lastReminder = stats._last_verify_reminder || 0;
  if (currentCalls - lastReminder >= 10) {
    const clDir = join(cwd, '.qe', 'checklists', 'in-progress');
    if (existsSync(clDir)) {
      try {
        const clFiles = readdirSync(clDir).filter(f => f.endsWith('.md'));
        if (clFiles.length > 0) {
          hints.push('[UTOPIA QA] VERIFY_CHECKLIST item-by-item verification is MANDATORY. Each item needs a concrete check (glob, grep, build, test). "Build passed" alone is NOT sufficient.');
          stats._last_verify_reminder = currentCalls;
        }
      } catch {}
    }
  }
}

// --- Context pressure check ---
try {
  const { message: ctxMessage } = checkContextPressure(cwd, stats, cfg);
  if (ctxMessage) hints.push(ctxMessage);
} catch {}

// --- Profile/docs collection triggers ---
const errState = state.tool_errors || { errors: [] };
const hasRecentToolErrors = Array.isArray(errState.errors) &&
  errState.errors.length > 0 &&
  (Date.now() - (errState.window_start || 0)) <= cfg.error_window_ms;

if (currentCalls > 0 && currentCalls % cfg.profile_collect_interval === 0 && !hasRecentToolErrors) {
  hints.push('Run Eprofile-collector in background to update command patterns.');
}

const docsInterval = cfg.docs_collect_interval || 100;
if (currentCalls > 0 && currentCalls % docsInterval === 0 && !hasRecentToolErrors) {
  hints.push('Check .qe/docs/ for domain knowledge if relevant to current task.');
}

// --- Write Unified State ONCE ---
try {
  writeUnifiedState(cwd, state);
} catch {}

if (hints.length > 0) {
  console.log(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext: `[QE] ${hints.join(' ')}`
    }
  }));
} else {
  console.log(JSON.stringify({ continue: true }));
}
