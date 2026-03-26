#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { cleanRoleArtifactOutput, extractPlannerArtifacts } from './lib/artifact_text_normalizer.mjs';

function artifactPaths(cwd) {
  const base = resolve(cwd, '.qe', 'ai-team', 'artifacts');
  return {
    roleSpec: resolve(base, 'role-spec.md'),
    taskBundle: resolve(base, 'task-bundle.json'),
    implementationReport: resolve(base, 'implementation-report.md'),
    reviewReport: resolve(base, 'review-report.md'),
    verificationReport: resolve(base, 'verification-report.md'),
  };
}

function maybeNormalizeFile(path, transform) {
  if (!existsSync(path)) return false;
  const before = readFileSync(path, 'utf8');
  const after = transform(before);
  if (after !== before) {
    writeFileSync(path, after, 'utf8');
    return true;
  }
  return false;
}

const cwd = process.cwd();
const paths = artifactPaths(cwd);
const changed = [];

if (existsSync(paths.roleSpec)) {
  const raw = readFileSync(paths.roleSpec, 'utf8');
  const { roleSpecContent } = extractPlannerArtifacts(raw);
  if (roleSpecContent !== raw) {
    writeFileSync(paths.roleSpec, roleSpecContent, 'utf8');
    changed.push(paths.roleSpec);
  }
}

if (maybeNormalizeFile(paths.implementationReport, (text) => cleanRoleArtifactOutput('implementer', text))) {
  changed.push(paths.implementationReport);
}

if (maybeNormalizeFile(paths.reviewReport, (text) => cleanRoleArtifactOutput('reviewer', text))) {
  changed.push(paths.reviewReport);
}

if (maybeNormalizeFile(paths.verificationReport, (text) => cleanRoleArtifactOutput('supervisor', text))) {
  changed.push(paths.verificationReport);
}

console.log(JSON.stringify({
  normalized: changed,
  artifact_root: resolve(cwd, '.qe', 'ai-team', 'artifacts'),
}, null, 2));
