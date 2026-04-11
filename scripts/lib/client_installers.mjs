#!/usr/bin/env node

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'fs';
import { homedir } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(MODULE_DIR, '..', '..');

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


/**
 * Check if qe-framework is installed as a Claude Code plugin.
 * Returns the plugin installPath if found, null otherwise.
 */
function getPluginInstallPath(homeDir) {
  const registryPath = join(homeDir, '.claude', 'plugins', 'installed_plugins.json');
  if (!existsSync(registryPath)) return null;
  try {
    const registry = JSON.parse(readFileSync(registryPath, 'utf-8'));
    const entries = registry?.plugins?.['qe-framework@inho-team-qe-framework'];
    if (Array.isArray(entries) && entries.length > 0) {
      const installPath = entries[0].installPath;
      if (installPath && existsSync(installPath)) return installPath;
    }
    return null;
  } catch {
    return null;
  }
}

export function installClaudeAssets({ repoRoot = REPO_ROOT, homeDir = homedir(), log = console.log } = {}) {
  const pluginPath = getPluginInstallPath(homeDir);

  if (pluginPath) {
    log(`Plugin mode: syncing patches to ${pluginPath}\n`);
    const pluginTargets = [
      { src: 'skills', dest: join(pluginPath, 'skills'), label: 'skill' },
      { src: 'agents', dest: join(pluginPath, 'agents'), label: 'agent' },
      { src: 'core',   dest: join(pluginPath, 'core'),   label: 'core' },
      { src: 'hooks',  dest: join(pluginPath, 'hooks'),  label: 'hook' },
      { src: 'scripts', dest: join(pluginPath, 'scripts'), label: 'script' },
    ];
    let totalSynced = 0;
    for (const { src, dest, label } of pluginTargets) {
      const srcDir = join(repoRoot, src);
      if (!existsSync(srcDir)) continue;
      ensureDir(dest);
      const entries = readdirSync(srcDir);
      for (const entry of entries) {
        copyRecursive(join(srcDir, entry), join(dest, entry));
      }
      totalSynced += entries.length;
      log(`Synced ${entries.length} ${label}(s) -> ${dest}`);
    }
    log(`\n${totalSynced} asset(s) synced to plugin cache. Restart Claude Code to apply.\n`);
    return;
  }

  const targets = [
    { src: 'skills', dest: join(homeDir, '.claude', 'commands'), label: 'skill' },
    { src: 'agents', dest: join(homeDir, '.claude', 'agents'), label: 'agent' },
    { src: 'core', dest: join(homeDir, '.claude', 'core'), label: 'core' },
    { src: 'hooks', dest: join(homeDir, '.claude', 'hooks'), label: 'hook' },
    { src: 'scripts', dest: join(homeDir, '.claude', 'scripts'), label: 'script' },
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
    { src: 'core', dest: join(homeDir, '.claude', 'core'), label: 'core' },
    { src: 'hooks', dest: join(homeDir, '.claude', 'hooks'), label: 'hook' },
    { src: 'scripts', dest: join(homeDir, '.claude', 'scripts'), label: 'script' },
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
