#!/usr/bin/env node

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(MODULE_DIR, '..', '..');

const QE_CODEX_CONFIG_BEGIN = '# QE Framework Agent Configuration — managed by qe-framework installer';
const QE_CODEX_CONFIG_END = '# End QE Framework Agent Configuration';

function quoteToml(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function copyRecursive(src, dest) {
  const stat = statSync(src);
  if (stat.isDirectory()) {
    ensureDir(dest);
    for (const entry of readdirSync(src)) {
      copyRecursive(join(src, entry), join(dest, entry));
    }
    return;
  }

  ensureDir(dirname(dest));
  copyFileSync(src, dest);
}

function removeRecursiveIfExists(path) {
  if (existsSync(path)) {
    rmSync(path, { recursive: true, force: true });
  }
}

function parseAgentFrontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    return { metadata: {}, body: markdown.trim() };
  }

  const metadata = {};
  for (const rawLine of match[1].split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    metadata[key] = rawValue.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
  }

  return {
    metadata,
    body: markdown.slice(match[0].length).trim(),
  };
}

function renderCodexAgentToml({ name, description, instructions }) {
  return [
    `name = ${quoteToml(name)}`,
    `description = ${quoteToml(description)}`,
    'sandbox_mode = "workspace-write"',
    "developer_instructions = '''",
    instructions.replace(/\r\n/g, '\n'),
    "'''",
    '',
  ].join('\n');
}

function renderCodexAgentConfigBlock(agentsDir, entries) {
  const lines = [QE_CODEX_CONFIG_BEGIN, ''];
  for (const entry of entries) {
    lines.push(`[agents.${quoteToml(entry.name)}]`);
    lines.push(`description = ${quoteToml(entry.description)}`);
    lines.push(`config_file = ${quoteToml(join(agentsDir, `${entry.name}.toml`))}`);
    lines.push('');
  }
  lines.push(QE_CODEX_CONFIG_END, '');
  return lines.join('\n');
}

function stripManagedCodexConfig(text) {
  const start = text.indexOf(QE_CODEX_CONFIG_BEGIN);
  if (start === -1) return text.replace(/\s+$/, '');
  const end = text.indexOf(QE_CODEX_CONFIG_END, start);
  if (end === -1) return text.slice(0, start).replace(/\s+$/, '');
  const after = text.slice(end + QE_CODEX_CONFIG_END.length);
  return `${text.slice(0, start)}${after}`.replace(/\n{3,}/g, '\n\n').trimEnd();
}

export function installClaudeAssets({ repoRoot = REPO_ROOT, homeDir = homedir(), log = console.log } = {}) {
  const targets = [
    { src: 'skills', dest: join(homeDir, '.claude', 'commands'), label: 'skill' },
    { src: 'agents', dest: join(homeDir, '.claude', 'agents'), label: 'agent' },
  ];

  for (const { src, dest, label } of targets) {
    const srcDir = join(repoRoot, src);
    if (!existsSync(srcDir)) {
      log(`${src}/ not found. Skipping ${label}s.`);
      continue;
    }
    ensureDir(dest);
    const entries = readdirSync(srcDir);
    for (const entry of entries) {
      copyRecursive(join(srcDir, entry), join(dest, entry));
      log(`Installed ${label}: ${entry} -> ${dest}`);
    }
    log(`${entries.length} ${label}(s) installed for Claude.\n`);
  }
}

export function uninstallClaudeAssets({ repoRoot = REPO_ROOT, homeDir = homedir(), log = console.log } = {}) {
  const targets = [
    { src: 'skills', dest: join(homeDir, '.claude', 'commands'), label: 'skill' },
    { src: 'agents', dest: join(homeDir, '.claude', 'agents'), label: 'agent' },
  ];

  for (const { src, dest, label } of targets) {
    const srcDir = join(repoRoot, src);
    if (!existsSync(srcDir)) {
      log(`${src}/ not found. Skipping ${label}s.`);
      continue;
    }
    const entries = readdirSync(srcDir);
    let removed = 0;
    for (const entry of entries) {
      const target = join(dest, entry);
      if (existsSync(target)) {
        rmSync(target, { recursive: true, force: true });
        log(`Removed ${label}: ${target}`);
        removed++;
      }
    }
    log(`${removed} ${label}(s) removed for Claude.\n`);
  }
}

export function installCodexAssets({ repoRoot = REPO_ROOT, homeDir = homedir(), log = console.log } = {}) {
  const skillsSrcDir = join(repoRoot, 'skills');
  const agentsSrcDir = join(repoRoot, 'agents');
  const codexSkillsDir = join(homeDir, '.codex', 'skills');
  const codexAgentsDir = join(homeDir, '.codex', 'agents');
  const codexConfigPath = join(homeDir, '.codex', 'config.toml');

  if (existsSync(skillsSrcDir)) {
    ensureDir(codexSkillsDir);
    const skills = readdirSync(skillsSrcDir);
    for (const entry of skills) {
      copyRecursive(join(skillsSrcDir, entry), join(codexSkillsDir, entry));
      log(`Installed skill: ${entry} -> ${codexSkillsDir}`);
    }
    log(`${skills.length} skill(s) installed for Codex.\n`);
  } else {
    log('skills/ not found. Skipping Codex skills.');
  }

  const agentEntries = [];
  if (existsSync(agentsSrcDir)) {
    ensureDir(codexAgentsDir);
    const agents = readdirSync(agentsSrcDir).filter((entry) => entry.endsWith('.md'));
    for (const entry of agents) {
      const srcPath = join(agentsSrcDir, entry);
      const destPath = join(codexAgentsDir, entry);
      copyRecursive(srcPath, destPath);

      const markdown = readFileSync(srcPath, 'utf8');
      const { metadata, body } = parseAgentFrontmatter(markdown);
      const name = metadata.name || entry.replace(/\.md$/i, '');
      const description = metadata.description || `${name} agent installed by QE Framework.`;
      writeFileSync(
        join(codexAgentsDir, `${name}.toml`),
        renderCodexAgentToml({ name, description, instructions: body }),
        'utf8'
      );
      agentEntries.push({ name, description });
      log(`Installed agent: ${entry} -> ${codexAgentsDir}`);
    }

    ensureDir(dirname(codexConfigPath));
    const currentConfig = existsSync(codexConfigPath) ? readFileSync(codexConfigPath, 'utf8') : '';
    const cleanedConfig = stripManagedCodexConfig(currentConfig);
    const managedBlock = renderCodexAgentConfigBlock(codexAgentsDir, agentEntries);
    const nextConfig = [cleanedConfig, managedBlock].filter(Boolean).join('\n\n').replace(/\n{3,}/g, '\n\n').trimEnd();
    writeFileSync(codexConfigPath, `${nextConfig}\n`, 'utf8');
    log(`${agentEntries.length} agent(s) installed for Codex.\n`);
  } else {
    log('agents/ not found. Skipping Codex agents.');
  }
}

export function uninstallCodexAssets({ repoRoot = REPO_ROOT, homeDir = homedir(), log = console.log } = {}) {
  const skillsSrcDir = join(repoRoot, 'skills');
  const agentsSrcDir = join(repoRoot, 'agents');
  const codexSkillsDir = join(homeDir, '.codex', 'skills');
  const codexAgentsDir = join(homeDir, '.codex', 'agents');
  const codexConfigPath = join(homeDir, '.codex', 'config.toml');

  if (existsSync(skillsSrcDir)) {
    const skills = readdirSync(skillsSrcDir);
    let removed = 0;
    for (const entry of skills) {
      const target = join(codexSkillsDir, entry);
      if (existsSync(target)) {
        removeRecursiveIfExists(target);
        log(`Removed skill: ${target}`);
        removed++;
      }
    }
    log(`${removed} skill(s) removed for Codex.\n`);
  }

  if (existsSync(agentsSrcDir)) {
    const agents = readdirSync(agentsSrcDir).filter((entry) => entry.endsWith('.md'));
    let removed = 0;
    for (const entry of agents) {
      const markdown = readFileSync(join(agentsSrcDir, entry), 'utf8');
      const { metadata } = parseAgentFrontmatter(markdown);
      const name = metadata.name || entry.replace(/\.md$/i, '');
      removeRecursiveIfExists(join(codexAgentsDir, entry));
      removeRecursiveIfExists(join(codexAgentsDir, `${name}.toml`));
      log(`Removed agent: ${name}`);
      removed++;
    }
    log(`${removed} agent(s) removed for Codex.\n`);
  }

  if (existsSync(codexConfigPath)) {
    const currentConfig = readFileSync(codexConfigPath, 'utf8');
    const cleanedConfig = stripManagedCodexConfig(currentConfig);
    writeFileSync(codexConfigPath, `${cleanedConfig.trimEnd()}\n`, 'utf8');
    log(`Updated Codex config: ${codexConfigPath}`);
  }
}
