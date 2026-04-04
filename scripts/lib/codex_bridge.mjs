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
 * Get codex command for a given stage
 * @param {string} stage - "spec" | "verify" | "supervise"
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
    case 'verify':
      command = '/codex:rescue --write';
      description = 'Delegate implementation to Codex';
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
 * Resolve which engine to use for a given stage
 * @param {string} stage - "spec" | "verify" | "supervise"
 * @param {object} config - parsed svs-config.json object (or empty for defaults)
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
 * Detect if legacy v3.x team-config.json exists
 * @returns {string | null} warning message or null if not found
 */
export function detectLegacyConfig() {
  const legacyConfigPath = join(process.cwd(), '.qe', 'ai-team', 'config', 'team-config.json');

  if (existsSync(legacyConfigPath)) {
    return `⚠️ Legacy v3.x team-config.json detected.
Migration to .qe/svs-config.json is recommended.
Mapping: planner → spec, implementer → verify, reviewer+supervisor → supervise`;
  }

  return null;
}

/**
 * Load .qe/svs-config.json from current working directory
 * @returns {object} parsed config or empty object if file doesn't exist
 */
export function loadSvsConfig() {
  const configPath = join(process.cwd(), '.qe', 'svs-config.json');

  if (!existsSync(configPath)) {
    return {};
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}
