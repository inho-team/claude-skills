#!/usr/bin/env node

import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'fs';
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


export function installClaudeAssets({ repoRoot = REPO_ROOT, homeDir = homedir(), log = console.log } = {}) {
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
