#!/usr/bin/env node
'use strict';

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { readUnifiedState, writeUnifiedState, updateContextMemo, invalidateContextMemo, getCwd } from './lib/state.mjs';
import { loadConfig } from './lib/config.mjs';

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

const cwd = getCwd(data);
const cfg = loadConfig(cwd);
const toolName = data.tool_name || data.toolName || '';
const isError = data.tool_response?.includes?.('error') ||
                data.tool_response?.includes?.('Error') ||
                data.tool_response?.includes?.('FAILED') ||
                (data.exit_code !== undefined && data.exit_code !== 0);

const hints = [];

// --- Load Unified State ---
const state = readUnifiedState(cwd);

// --- ContextMemo Maintenance ---
if (!isError && toolName === 'Read') {
  const toolInput = data.tool_input || data.toolInput || {};
  const filePath = toolInput.file_path || toolInput.filePath || '';
  if (filePath && data.tool_response) {
    updateContextMemo(state, filePath, data.tool_response);
  }
} else if (['Write', 'Edit'].includes(toolName)) {
  const toolInput = data.tool_input || data.toolInput || {};
  const filePath = toolInput.file_path || toolInput.filePath || '';
  if (filePath) {
    invalidateContextMemo(state, filePath);
  }
}

// --- Real-time Token Tracking ---
if (!state.session_stats) {
  state.session_stats = { tool_calls: 0, session_start: Date.now(), context_loaded: [], usage: { input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_creation_tokens: 0 } };
}
const stats = state.session_stats;
if (!stats.usage) {
  stats.usage = { input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_creation_tokens: 0 };
}

// Extract usage from Claude Code payload
const usage = data.usage || data.metadata?.usage || {};
if (Object.keys(usage).length > 0) {
  stats.usage.input_tokens += usage.input_tokens || 0;
  stats.usage.output_tokens += usage.output_tokens || 0;
  stats.usage.cache_read_tokens += usage.cache_read_input_tokens || 0;
  stats.usage.cache_creation_tokens += usage.cache_creation_input_tokens || 0;
} else {
  // Fallback: Estimate tokens based on payload size (chars / 4)
  const estimatedInput = Math.ceil(JSON.stringify(data.tool_input || {}).length / 4);
  const estimatedOutput = Math.ceil(String(data.tool_response || '').length / 4);
  stats.usage.input_tokens += estimatedInput;
  stats.usage.output_tokens += estimatedOutput;
}

// --- Error tracking ---
if (isError) {
  if (!state.tool_errors) {
    state.tool_errors = { errors: [], window_start: Date.now() };
  }
  const errorState = state.tool_errors;

  // Reset window if older than configured threshold
  if (Date.now() - errorState.window_start > cfg.error_window_ms) {
    errorState.errors = [];
    errorState.window_start = Date.now();
  }

  errorState.errors.push({
    tool: toolName,
    timestamp: Date.now(),
    preview: String(data.tool_response || '').slice(0, 200)
  });

  const recentCount = errorState.errors.filter(e => e.tool === toolName).length;

  if (recentCount >= cfg.error_delegate_count) {
    hints.push(`${toolName} tool failed ${recentCount}+ times in error window. Delegate to Ecode-debugger agent for root cause analysis, or try a completely different approach.`);
  } else if (recentCount >= cfg.error_escalate_count) {
    hints.push(`${toolName} tool failed ${recentCount} times in error window. Consider using /Qsystematic-debugging to find the root cause before retrying.`);
  }
} else if (state.tool_errors) {
  // Success - clear error tracking for this tool
  const errorState = state.tool_errors;
  const filtered = errorState.errors.filter(e => e.tool !== toolName);
  if (filtered.length !== errorState.errors.length) {
    errorState.errors = filtered;
  }
}

// --- Quality Check Hints (Write/Edit only — matcher ensures this) ---
if (['Write', 'Edit'].includes(toolName)) {
  const toolInput = data.tool_input || data.toolInput || {};
  const filePath = toolInput.file_path || toolInput.filePath || '';

  if (filePath) {
    if (/\.tsx?$/.test(filePath)) {
      hints.push('Consider running type check after TypeScript changes.');
    }
    if (/\.(test|spec)\./.test(filePath)) {
      hints.push('Test file modified. Run tests to verify.');
    }
    if (/\.(css|scss|sass|less)$/.test(filePath)) {
      hints.push('Style file changed. Check for visual regression.');
    }

    // Agentation hint for .tsx files (once per session)
    if (/\.tsx$/.test(filePath) && !isError) {
      if (!state.session_stats) {
        state.session_stats = { tool_calls: 0, session_start: Date.now(), context_loaded: [] };
      }
      const s = state.session_stats;

      if (!s._agentation_hinted) {
        hints.push('Frontend file modified. Use /Qagentation or /Qvisual-qa for visual verification.');
        s._agentation_hinted = true;
      }
    }
  }

  // Security keyword hint
  const secContent = toolInput.new_string || toolInput.content || '';
  if (secContent && /\b(auth|jwt|password|secret|token|credential|bcrypt|encrypt|decrypt)\b/i.test(secContent)) {
    hints.push('Security-sensitive code detected. Run Esecurity-officer before completing.');
  }
}

// --- Final Unified State Write ---
try {
  writeUnifiedState(cwd, state);
} catch {}

if (hints.length > 0) {
  console.log(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: `[QE] ${hints.join(' ')}`
    }
  }));
} else {
  console.log(JSON.stringify({ continue: true }));
}
