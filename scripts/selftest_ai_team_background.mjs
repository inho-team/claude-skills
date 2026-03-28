#!/usr/bin/env node

import { existsSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { spawnSync } from 'child_process';

const repoRoot = process.cwd();
const testRoot = resolve(repoRoot, '.tmp-ai-team-selftest');
const qeRoot = join(testRoot, '.qe');
const configDir = join(qeRoot, 'ai-team', 'config');
const artifactsDir = join(qeRoot, 'ai-team', 'artifacts');
const planningDir = join(qeRoot, 'planning');

function resetDir(path) {
  if (existsSync(path)) rmSync(path, { recursive: true, force: true });
  mkdirSync(path, { recursive: true });
}

function write(path, content) {
  mkdirSync(resolve(path, '..'), { recursive: true });
  writeFileSync(path, content, 'utf8');
}

resetDir(testRoot);
mkdirSync(configDir, { recursive: true });
mkdirSync(artifactsDir, { recursive: true });
mkdirSync(planningDir, { recursive: true });

const successCommand = process.platform === 'win32'
  ? { executable: process.execPath, args: ['-e', 'console.log("ok")'] }
  : { executable: process.execPath, args: ['-e', 'console.log("ok")'] };

write(join(configDir, 'team-config.json'), JSON.stringify({
  version: 1,
  mode: 'multi-model',
  roles: {
    planner: { runner: 'planner_runner', responsibility: 'plan' },
    implementer: { runner: 'impl_runner', responsibility: 'implement' },
    reviewer: { runner: 'review_runner', responsibility: 'review' },
    supervisor: { runner: 'super_runner', responsibility: 'supervise' },
  },
  runners: {
    planner_runner: { provider: 'claude', model: 'test', command: successCommand },
    impl_runner: { provider: 'codex', model: 'test', command: successCommand },
    review_runner: { provider: 'gemini', model: 'test', command: successCommand },
    super_runner: { provider: 'claude', model: 'test', command: successCommand },
  },
  policies: {
    max_remediation_rounds: 2,
    reviewer_can_edit: false,
    implementer_can_modify_spec: false,
  },
}, null, 2));

write(join(artifactsDir, 'role-spec.md'), '# Role Spec\n');
write(join(artifactsDir, 'task-bundle.json'), '{\n  "tasks": []\n}\n');
write(join(artifactsDir, 'implementation-report.md'), '');
write(join(artifactsDir, 'review-report.md'), '');
write(join(artifactsDir, 'verification-report.md'), '');
write(join(planningDir, 'STATE.md'), 'state\n');

const roleResult = spawnSync(process.execPath, [
  join(repoRoot, 'scripts', 'run_role.mjs'),
  '--role', 'implementer',
  '--config', '.qe/ai-team/config/team-config.json',
  '--input', '.qe/planning/STATE.md',
  '--artifact', '.qe/ai-team/artifacts/role-spec.md',
  '--artifact', '.qe/ai-team/artifacts/task-bundle.json',
  '--background',
], {
  cwd: testRoot,
  encoding: 'utf8',
});

const workflowResult = spawnSync(process.execPath, [
  join(repoRoot, 'scripts', 'run_team_workflow.mjs'),
  '--config', '.qe/ai-team/config/team-config.json',
  '--from-role', 'implementer',
  '--input', '.qe/planning/STATE.md',
  '--execute',
], {
  cwd: testRoot,
  encoding: 'utf8',
});

const report = {
  platform: process.platform,
  role_background_exit_code: roleResult.status,
  role_background_stdout: (roleResult.stdout || '').trim(),
  role_background_stderr: (roleResult.stderr || '').trim(),
  workflow_exit_code: workflowResult.status,
  workflow_stdout: (workflowResult.stdout || '').trim(),
  workflow_stderr: (workflowResult.stderr || '').trim(),
};

console.log(JSON.stringify(report, null, 2));
