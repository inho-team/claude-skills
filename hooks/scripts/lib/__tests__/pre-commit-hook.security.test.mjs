import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// Regression test for Phase 4 Critical finding:
// pre-commit hook must NOT invoke the shell (execSync/exec). Only execFileSync
// with argv arrays is safe — a staged filename like ".qe/contracts/active/a;touch EVIL.md"
// (legal under git) would otherwise execute injected commands at commit time.

const HOOK_PATH = path.resolve(process.cwd(), 'hooks/git/pre-commit-contract-check.mjs');

test('pre-commit hook does not import shell-invoking execSync', () => {
  const source = readFileSync(HOOK_PATH, 'utf8');

  // The hook source must not import execSync. execFileSync is the safe alternative
  // (argv array, no shell, no metacharacter expansion).
  assert.ok(
    !/\bexecSync\b/.test(source),
    'Hook source should not reference execSync (shell injection risk). Use execFileSync with argv array.'
  );
});

test('pre-commit hook imports execFileSync', () => {
  const source = readFileSync(HOOK_PATH, 'utf8');

  assert.ok(
    /import\s*\{[^}]*\bexecFileSync\b[^}]*\}\s*from\s*['"]node:child_process['"]/.test(source),
    'Hook source must import execFileSync from node:child_process.'
  );
});

test('pre-commit hook uses argv-array form for git invocations', () => {
  const source = readFileSync(HOOK_PATH, 'utf8');

  // Every git spawn must go through execFileSync('git', [...]) — never a single string.
  const stringGitCall = /execFileSync\s*\(\s*['"`]git\s/;
  assert.ok(
    !stringGitCall.test(source),
    "Hook must call execFileSync('git', [...]) not execFileSync('git ...'). String form re-enables shell parsing on some platforms."
  );

  // At least one execFileSync('git', [...]) call must exist (positive assertion).
  const argvForm = /execFileSync\s*\(\s*['"]git['"]\s*,\s*\[/;
  assert.ok(argvForm.test(source), 'Hook must use execFileSync with argv array for git commands.');
});
