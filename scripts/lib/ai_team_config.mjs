#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

export const REQUIRED_ROLES = ['planner', 'implementer', 'reviewer', 'supervisor'];
export const WORKFLOW_MODES = ['single-model', 'multi-model', 'hybrid'];
const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = resolve(MODULE_DIR, '..', '..');
const DEFAULT_SCHEMA_PATH = resolve(PLUGIN_ROOT, 'core', 'schemas', 'team-config.schema.json');

const schemaCache = new Map();

export function getAiTeamConfigPath(cwd, fileArg = '.qe/ai-team/config/team-config.json') {
  return resolve(cwd, fileArg);
}

export function getTeamConfigSchemaPath(cwd, schemaArg = DEFAULT_SCHEMA_PATH) {
  if (/^[A-Za-z]:[\\/]|^\\\\|^\//.test(schemaArg)) {
    return schemaArg;
  }
  return resolve(cwd, schemaArg);
}

export function hasAiTeamConfig(cwd, fileArg = '.qe/ai-team/config/team-config.json') {
  const path = getAiTeamConfigPath(cwd, fileArg);
  return existsSync(path);
}

export function readJsonFile(path) {
  const raw = readFileSync(path, 'utf8');
  const normalized = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  return JSON.parse(normalized);
}

function toRunnerName(role, provider) {
  return `${provider || 'custom'}_${role}`;
}

function normalizeLegacyConfig(config) {
  if (config.runners) return config;

  const normalized = {
    ...config,
    roles: { ...(config.roles || {}) },
    runners: {},
  };

  for (const role of REQUIRED_ROLES) {
    const roleConfig = normalized.roles[role];
    if (!roleConfig) continue;

    if (roleConfig.runner) continue;

    const runnerName = toRunnerName(role, roleConfig.provider);
    const providerOverride = config.providers?.[roleConfig.provider] || {};

    normalized.runners[runnerName] = {
      provider: roleConfig.provider,
      model: roleConfig.model,
      ...(providerOverride.timeout_ms ? { timeout_ms: providerOverride.timeout_ms } : {}),
      ...(providerOverride.command ? { command: providerOverride.command } : {}),
    };

    normalized.roles[role] = {
      runner: runnerName,
      responsibility: roleConfig.responsibility,
    };
  }

  delete normalized.providers;
  return normalized;
}

export function normalizeAiTeamConfig(config) {
  return normalizeLegacyConfig(config);
}

export function loadAiTeamConfig(cwd, fileArg) {
  const path = getAiTeamConfigPath(cwd, fileArg);
  if (!existsSync(path)) {
    throw new Error(`Missing AI team config: ${path}`);
  }

  const rawConfig = readJsonFile(path);
  const config = normalizeAiTeamConfig(rawConfig);
  return { path, config, rawConfig };
}

function loadSchema(schemaPath) {
  if (!existsSync(schemaPath)) {
    throw new Error(`Missing AI team config schema: ${schemaPath}`);
  }

  if (!schemaCache.has(schemaPath)) {
    schemaCache.set(schemaPath, readJsonFile(schemaPath));
  }

  return schemaCache.get(schemaPath);
}

function resolveRef(rootSchema, ref) {
  if (!ref.startsWith('#/')) {
    throw new Error(`Unsupported $ref format: ${ref}`);
  }

  const parts = ref
    .slice(2)
    .split('/')
    .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'));

  let node = rootSchema;
  for (const part of parts) {
    node = node?.[part];
    if (node === undefined) {
      throw new Error(`Failed to resolve $ref: ${ref}`);
    }
  }

  return node;
}

function typeMatches(expectedType, value) {
  switch (expectedType) {
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    case 'array':
      return Array.isArray(value);
    case 'string':
      return typeof value === 'string';
    case 'integer':
      return Number.isInteger(value);
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    default:
      return true;
  }
}

function formatPath(path) {
  return path === '' ? '(root)' : path;
}

function validateAgainstSchema(schemaNode, data, context) {
  const { path, rootSchema } = context;
  if (schemaNode.$ref) {
    const targetSchema = resolveRef(rootSchema, schemaNode.$ref);
    return validateAgainstSchema(targetSchema, data, context);
  }

  const errors = [];
  if (schemaNode.type) {
    const types = Array.isArray(schemaNode.type) ? schemaNode.type : [schemaNode.type];
    const matches = types.some((type) => typeMatches(type, data));
    if (!matches) {
      errors.push(`${formatPath(path)} must be of type ${types.join(' or ')}`);
      return errors;
    }
  }

  if (schemaNode.const !== undefined && data !== schemaNode.const) {
    errors.push(`${formatPath(path)} must equal ${JSON.stringify(schemaNode.const)}`);
  }

  if (schemaNode.enum && !schemaNode.enum.includes(data)) {
    errors.push(`${formatPath(path)} must be one of: ${schemaNode.enum.join(', ')}`);
  }

  if (schemaNode.pattern && typeof data === 'string') {
    const regex = new RegExp(schemaNode.pattern);
    if (!regex.test(data)) {
      errors.push(`${formatPath(path)} must match pattern ${schemaNode.pattern}`);
    }
  }

  if (typeof data === 'number') {
    if (schemaNode.minimum !== undefined && data < schemaNode.minimum) {
      errors.push(`${formatPath(path)} must be >= ${schemaNode.minimum}`);
    }
    if (schemaNode.maximum !== undefined && data > schemaNode.maximum) {
      errors.push(`${formatPath(path)} must be <= ${schemaNode.maximum}`);
    }
  }

  if (Array.isArray(data) && schemaNode.items) {
    data.forEach((item, index) => {
      errors.push(
        ...validateAgainstSchema(schemaNode.items, item, {
          path: `${path}[${index}]`,
          rootSchema,
        })
      );
    });
  }

  const isObject = typeof data === 'object' && data !== null && !Array.isArray(data);
  if (isObject) {
    if (Array.isArray(schemaNode.required)) {
      for (const requiredKey of schemaNode.required) {
        if (!Object.prototype.hasOwnProperty.call(data, requiredKey)) {
          const targetPath = path ? `${path}.${requiredKey}` : requiredKey;
          errors.push(`${formatPath(targetPath)} is required`);
        }
      }
    }

    const propertySchemas = schemaNode.properties ?? {};
    const patternSchemas = Object.entries(schemaNode.patternProperties ?? {}).map(
      ([pattern, schema]) => ({ regex: new RegExp(pattern), schema })
    );
    const additionalSchema = schemaNode.additionalProperties;

    for (const [key, value] of Object.entries(data)) {
      const propertyPath = path ? `${path}.${key}` : key;
      if (propertySchemas[key]) {
        errors.push(
          ...validateAgainstSchema(propertySchemas[key], value, {
            path: propertyPath,
            rootSchema,
          })
        );
        continue;
      }

      let matchedPattern = false;
      for (const { regex, schema } of patternSchemas) {
        if (regex.test(key)) {
          matchedPattern = true;
          errors.push(
            ...validateAgainstSchema(schema, value, {
              path: propertyPath,
              rootSchema,
            })
          );
        }
      }

      if (!matchedPattern) {
        if (additionalSchema === false) {
          errors.push(`${formatPath(propertyPath)} is not allowed`);
        } else if (typeof additionalSchema === 'object') {
          errors.push(
            ...validateAgainstSchema(additionalSchema, value, {
              path: propertyPath,
              rootSchema,
            })
          );
        }
      }
    }
  }

  return errors;
}

export function validateAiTeamConfig(config, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const schemaPath = options.schemaPath ?? getTeamConfigSchemaPath(cwd);
  const schema = loadSchema(schemaPath);
  const normalizedConfig = normalizeAiTeamConfig(config);
  const errors = validateAgainstSchema(schema, normalizedConfig, { path: '', rootSchema: schema });

  for (const role of REQUIRED_ROLES) {
    const roleConfig = normalizedConfig.roles?.[role];
    if (!roleConfig?.runner) {
      errors.push(`roles.${role}.runner is required`);
      continue;
    }
    if (!normalizedConfig.runners?.[roleConfig.runner]) {
      errors.push(`roles.${role}.runner references missing runner ${roleConfig.runner}`);
    }
  }

  return [...new Set(errors)];
}

export function getWorkflowMode(config, fallback = 'single-model') {
  const mode = config?.mode;
  if (typeof mode !== 'string') {
    return fallback;
  }
  return WORKFLOW_MODES.includes(mode) ? mode : fallback;
}

export function isMultiModelMode(config) {
  const mode = getWorkflowMode(config);
  return mode === 'multi-model' || mode === 'hybrid';
}

export function detectWorkflowMode(cwd, fileArg = '.qe/ai-team/config/team-config.json') {
  if (!hasAiTeamConfig(cwd, fileArg)) {
    return 'single-model';
  }
  const { config } = loadAiTeamConfig(cwd, fileArg);
  return getWorkflowMode(config);
}

export function ensureDirectory(path) {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

export function writeJsonFile(path, data) {
  ensureDirectory(dirname(path));
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}
