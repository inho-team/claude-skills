#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

/**
 * Check if codex-plugin-cc is installed
 * @returns {boolean} true if plugin directory exists, false otherwise
 */
export function isCodexPluginAvailable() {
  const pluginDir = join(homedir(), '.claude', 'plugins');

  // Check for exact codex directory
  const codexPath = join(pluginDir, 'codex');
  if (existsSync(codexPath)) {
    return true;
  }

  // Check if plugins directory exists and look for codex in subdirectories
  if (existsSync(pluginDir)) {
    try {
      const entries = readdirSync(pluginDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.toLowerCase().includes('codex')) {
          return true;
        }
      }
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Get codex command for a given SIVS stage
 * @param {string} stage - "spec" | "implement" | "verify" | "supervise"
 * @param {object} options - { model?: string, effort?: string, background?: boolean }
 * @returns {object} { command: string, description: string }
 */
export function getCodexCommand(stage, options = {}) {
  let command = '';
  let description = '';

  switch (stage) {
    case 'spec':
      command = '/codex:rescue';
      description = 'Delegate spec generation to Codex';
      break;
    case 'implement':
      command = '/codex:rescue --write';
      description = 'Delegate implementation to Codex';
      break;
    case 'verify':
      command = '/codex:rescue --verify';
      description = 'Delegate verification to Codex';
      break;
    case 'supervise':
      command = '/codex:review';
      description = 'Delegate code review to Codex';
      break;
    default:
      throw new Error(`Unknown stage: ${stage}`);
  }

  // Add optional flags
  if (options.model) {
    command += ` --model ${options.model}`;
  }
  if (options.effort) {
    command += ` --effort ${options.effort}`;
  }
  if (options.background) {
    command += ' --background';
  }

  return { command, description };
}

/**
 * Resolve which engine to use for a given SIVS stage
 * @param {string} stage - "spec" | "implement" | "verify" | "supervise"
 * @param {object} config - parsed sivs-config.json object (or empty for defaults)
 * @returns {object} { engine: string, warning?: string, command?: object }
 */
export function resolveEngine(stage, config = {}) {
  const stageConfig = config[stage] || { engine: 'claude' };
  const engine = stageConfig.engine || 'claude';

  if (engine === 'claude') {
    return { engine: 'claude' };
  }

  if (engine === 'codex') {
    if (isCodexPluginAvailable()) {
      return {
        engine: 'codex',
        command: getCodexCommand(stage, stageConfig)
      };
    } else {
      return {
        engine: 'claude',
        warning: 'codex-plugin-cc not installed. Falling back to Claude. Install: /plugin install codex@openai-codex'
      };
    }
  }

  return { engine: 'claude' };
}

/**
 * Detect if legacy v3.x team-config.json or v4.x svs-config.json exists
 * @returns {string | null} warning message or null if not found
 */
export function detectLegacyConfig() {
  const legacyTeamConfigPath = join(process.cwd(), '.qe', 'ai-team', 'config', 'team-config.json');
  const legacySvsConfigPath = join(process.cwd(), '.qe', 'svs-config.json');

  if (existsSync(legacyTeamConfigPath)) {
    return `\u26a0\ufe0f Legacy v3.x team-config.json detected.
Migration to .qe/sivs-config.json is recommended.
Mapping: planner \u2192 spec, implementer \u2192 implement, reviewer \u2192 verify, supervisor \u2192 supervise`;
  }

  if (existsSync(legacySvsConfigPath)) {
    return `\u26a0\ufe0f Legacy v4.x svs-config.json detected.
Migration to .qe/sivs-config.json is recommended.
The "verify" stage has been split into "implement" (coding) and "verify" (validation).`;
  }

  return null;
}

/**
 * Load .qe/sivs-config.json from current working directory
 * Falls back to legacy .qe/svs-config.json for backward compatibility
 * @returns {object} parsed config or empty object if file doesn't exist
 */
export function loadSivsConfig() {
  const configPath = join(process.cwd(), '.qe', 'sivs-config.json');
  const legacyPath = join(process.cwd(), '.qe', 'svs-config.json');

  const pathToLoad = existsSync(configPath) ? configPath : (existsSync(legacyPath) ? legacyPath : null);

  if (!pathToLoad) {
    return {};
  }

  try {
    const content = readFileSync(pathToLoad, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

// Backward compatibility alias
export const loadSvsConfig = loadSivsConfig;

/**
 * Get codex-plugin-cc version info from installed_plugins.json
 * @returns {{ installed: boolean, version?: string, installPath?: string, installedAt?: string, gitCommitSha?: string } }
 */
export function getCodexPluginInfo() {
  const registryPath = join(homedir(), '.claude', 'plugins', 'installed_plugins.json');

  if (!existsSync(registryPath)) {
    return { installed: false };
  }

  try {
    const content = readFileSync(registryPath, 'utf-8');
    const registry = JSON.parse(content);
    const codexEntries = registry?.plugins?.['codex@openai-codex'];

    if (!codexEntries || codexEntries.length === 0) {
      return { installed: false };
    }

    // Use the first (most recent) entry
    const entry = codexEntries[0];
    return {
      installed: true,
      version: entry.version || 'unknown',
      installPath: entry.installPath || null,
      installedAt: entry.installedAt || null,
      gitCommitSha: entry.gitCommitSha || null,
    };
  } catch {
    return { installed: false };
  }
}
