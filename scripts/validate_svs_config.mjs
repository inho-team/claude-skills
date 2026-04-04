#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), '.qe', 'svs-config.json');

const DEFAULTS = {
  spec: { engine: 'claude' },
  verify: { engine: 'claude' },
  supervise: { engine: 'claude' }
};

const ALLOWED_ENGINES = ['claude', 'codex'];
const ALLOWED_EFFORTS = ['low', 'medium', 'high', 'xhigh'];
const ALLOWED_TOP_LEVEL_KEYS = new Set(['spec', 'verify', 'supervise']);
const ALLOWED_STAGE_KEYS = new Set(['engine', 'model', 'effort']);

/**
 * Validate configuration object against SVS schema
 * @returns {{ valid: boolean, config?: object, errors?: string[] }}
 */
function validateConfig(config) {
  const errors = [];

  // Check top-level keys
  for (const key of Object.keys(config)) {
    if (!ALLOWED_TOP_LEVEL_KEYS.has(key)) {
      errors.push(`Invalid top-level key "${key}". Allowed: spec, verify, supervise`);
    }
  }

  // Validate each stage
  for (const stage of ['spec', 'verify', 'supervise']) {
    if (config[stage] !== undefined) {
      const stageConfig = config[stage];

      // Stage must be an object
      if (typeof stageConfig !== 'object' || stageConfig === null || Array.isArray(stageConfig)) {
        errors.push(`${stage} must be an object`);
        continue;
      }

      // Check allowed keys in stage
      for (const key of Object.keys(stageConfig)) {
        if (!ALLOWED_STAGE_KEYS.has(key)) {
          errors.push(`${stage}.${key} is not allowed. Allowed: engine, model, effort`);
        }
      }

      // Validate engine
      if (stageConfig.engine !== undefined) {
        if (!ALLOWED_ENGINES.includes(stageConfig.engine)) {
          errors.push(`${stage}.engine must be "claude" or "codex", got "${stageConfig.engine}"`);
        }
      }

      // Validate model
      if (stageConfig.model !== undefined) {
        if (typeof stageConfig.model !== 'string') {
          errors.push(`${stage}.model must be a string, got ${typeof stageConfig.model}`);
        }
      }

      // Validate effort
      if (stageConfig.effort !== undefined) {
        if (!ALLOWED_EFFORTS.includes(stageConfig.effort)) {
          errors.push(`${stage}.effort must be one of [low, medium, high, xhigh], got "${stageConfig.effort}"`);
        }
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
}

/**
 * Merge user config with defaults
 */
function resolveConfig(config) {
  const resolved = {};
  for (const stage of ['spec', 'verify', 'supervise']) {
    resolved[stage] = {
      engine: config[stage]?.engine ?? DEFAULTS[stage].engine,
      ...(config[stage]?.model && { model: config[stage].model }),
      ...(config[stage]?.effort && { effort: config[stage].effort })
    };
  }
  return resolved;
}

/**
 * Format config for display
 */
function formatConfig(config) {
  const lines = [];
  for (const stage of ['spec', 'verify', 'supervise']) {
    const stageConfig = config[stage];
    let line = `  ${stage.padEnd(10)} ${stageConfig.engine}`;
    const details = [];
    if (stageConfig.model) {
      details.push(`model: ${stageConfig.model}`);
    }
    if (stageConfig.effort) {
      details.push(`effort: ${stageConfig.effort}`);
    }
    if (details.length > 0) {
      line += ` (${details.join(', ')})`;
    }
    lines.push(line);
  }
  return lines.join('\n');
}

/**
 * Main validation logic
 */
function main() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      const resolved = resolveConfig({});
      console.log('[svs-config] No .qe/svs-config.json found. Using defaults:');
      console.log(formatConfig(resolved));
      process.exit(0);
    }

    const fileContent = fs.readFileSync(CONFIG_PATH, 'utf-8');
    let config;

    try {
      config = JSON.parse(fileContent);
    } catch (e) {
      console.error(`[svs-config] Validation error: Invalid JSON in .qe/svs-config.json`);
      process.exit(1);
    }

    // Ensure config is an object
    if (typeof config !== 'object' || config === null || Array.isArray(config)) {
      console.error(`[svs-config] Validation error: Config must be a JSON object`);
      process.exit(1);
    }

    const validation = validateConfig(config);

    if (!validation.valid) {
      for (const error of validation.errors) {
        console.error(`[svs-config] Validation error: ${error}`);
      }
      process.exit(1);
    }

    const resolved = resolveConfig(config);
    console.log('[svs-config] Valid configuration:');
    console.log(formatConfig(resolved));
    process.exit(0);
  } catch (e) {
    console.error(`[svs-config] Unexpected error: ${e.message}`);
    process.exit(1);
  }
}

main();
