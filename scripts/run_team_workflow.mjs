#!/usr/bin/env node

import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { randomUUID } from 'crypto';
import { ensureDirectory, loadAiTeamConfig, validateAiTeamConfig, writeJsonFile } from './lib/ai_team_config.mjs';
import { cleanRoleArtifactOutput, extractPlannerArtifacts } from './lib/artifact_text_normalizer.mjs';
import { runRoleCommand } from './lib/run_role_core.mjs';

const ROLE_ORDER = ['planner', 'implementer', 'reviewer', 'supervisor'];

function parseArgs(argv) {
  const args = {
    artifacts: [],
    clearArtifacts: [],
    execute: false,
    dryRun: false,
    continueOnError: false,
    fromRole: 'planner',
    reuseApprovedPlan: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--input') args.input = argv[++i];
    else if (arg === '--artifact') args.artifacts.push(argv[++i]);
    else if (arg === '--clear-artifact') args.clearArtifacts.push(argv[++i]);
    else if (arg === '--config') args.config = argv[++i];
    else if (arg === '--workflow-id') args.workflowId = argv[++i];
    else if (arg === '--from-role') args.fromRole = argv[++i];
    else if (arg === '--timeout-ms') args.timeoutMs = Number(argv[++i]);
    else if (arg === '--execute') args.execute = true;
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--continue-on-error') args.continueOnError = true;
    else if (arg === '--reuse-approved-plan') args.reuseApprovedPlan = true;
    else if (arg === '--help') args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function usage() {
  console.log([
    'Usage:',
    '  node scripts/run_team_workflow.mjs [options]',
    '',
    'Options:',
    '  --input <path>             Initial workflow input file',
    '  --artifact <path>          Shared artifact path to pass through (repeatable)',
    '  --clear-artifact <name>    Clear snapshot artifact: role-spec|task-bundle|implementation-report|review-report|verification-report',
    '  --config <path>            Override config path',
    '  --workflow-id <id>         Override generated workflow id',
    '  --from-role <role>         Start at planner|implementer|reviewer|supervisor',
    '  --reuse-approved-plan      Skip planner when role-spec.md + task-bundle.json already exist',
    '  --timeout-ms <ms>          Timeout forwarded to each role run',
    '  --execute                  Attempt provider CLI execution for each role',
    '  --dry-run                  Prepare role packets without execution',
    '  --continue-on-error        Continue to later roles after a failed role',
  ].join('\n'));
}

function defaultPlannerInput(cwd) {
  const candidates = [
    '.qe/planning/STATE.md',
    '.qe/planning/ROADMAP.md',
    '.qe/planning/PROJECT.md',
    'core/MULTI_MODEL_ORCHESTRATION.md',
    'docs/MULTI_MODEL_SETUP.md',
    'README.md',
    'package.json',
  ];

  for (const candidate of candidates) {
    const fullPath = resolve(cwd, candidate);
    if (existsSync(fullPath)) return fullPath;
  }

  return null;
}

function existingPaths(paths) {
  return paths.filter(path => existsSync(path));
}

function unique(paths) {
  return [...new Set(paths)];
}

function readTextIfExists(path) {
  if (!path || !existsSync(path)) return null;
  return readFileSync(path, 'utf8');
}

function renderDocumentSection(label, path, content) {
  if (!path || !content) return [];
  return [
    `## ${label}`,
    `Path: ${path}`,
    '```',
    content.trimEnd(),
    '```',
    '',
  ];
}

function canonicalArtifacts(cwd) {
  return {
    roleSpec: resolve(cwd, '.qe/ai-team/artifacts/role-spec.md'),
    taskBundle: resolve(cwd, '.qe/ai-team/artifacts/task-bundle.json'),
    implementationReport: resolve(cwd, '.qe/ai-team/artifacts/implementation-report.md'),
    reviewReport: resolve(cwd, '.qe/ai-team/artifacts/review-report.md'),
    verificationReport: resolve(cwd, '.qe/ai-team/artifacts/verification-report.md'),
  };
}

function workflowArtifacts(workflowDir) {
  return {
    roleSpec: join(workflowDir, 'artifacts', 'role-spec.md'),
    taskBundle: join(workflowDir, 'artifacts', 'task-bundle.json'),
    implementationReport: join(workflowDir, 'artifacts', 'implementation-report.md'),
    reviewReport: join(workflowDir, 'artifacts', 'review-report.md'),
    verificationReport: join(workflowDir, 'artifacts', 'verification-report.md'),
  };
}

function artifactKeyByCliName(name) {
  const map = {
    'role-spec': 'roleSpec',
    'task-bundle': 'taskBundle',
    'implementation-report': 'implementationReport',
    'review-report': 'reviewReport',
    'verification-report': 'verificationReport',
  };
  return map[name] || null;
}

function cloneCanonicalArtifacts(cwd, workflowDir) {
  const source = canonicalArtifacts(cwd);
  const target = workflowArtifacts(workflowDir);
  ensureDirectory(join(workflowDir, 'artifacts'));

  for (const key of Object.keys(target)) {
    if (existsSync(source[key])) {
      copyFileSync(source[key], target[key]);
    }
  }

  return target;
}

function clearWorkflowArtifacts(workflowArtifactPaths, clearArtifacts) {
  for (const name of clearArtifacts) {
    const key = artifactKeyByCliName(name);
    if (!key) {
      throw new Error(`Invalid --clear-artifact value: ${name}`);
    }

    const target = workflowArtifactPaths[key];
    ensureDirectory(dirname(target));
    const emptyContent = key === 'taskBundle' ? '{\n  "tasks": []\n}\n' : '';
    writeFileSync(target, emptyContent, 'utf8');
  }
}

function validatedStartRole(requestedRole, reuseApprovedPlan, cwd) {
  if (!ROLE_ORDER.includes(requestedRole)) {
    throw new Error(`Invalid --from-role value: ${requestedRole}`);
  }

  if (!reuseApprovedPlan) return requestedRole;

  const artifacts = canonicalArtifacts(cwd);
  const hasApprovedPlan = existsSync(artifacts.roleSpec) && existsSync(artifacts.taskBundle);
  if (requestedRole === 'planner' && hasApprovedPlan) {
    return 'implementer';
  }

  return requestedRole;
}

function failureArtifactPath(artifacts, role) {
  return {
    planner: artifacts.roleSpec,
    implementer: artifacts.implementationReport,
    reviewer: artifacts.reviewReport,
    supervisor: artifacts.verificationReport,
  }[role] || null;
}

function defaultArtifactsForRole(cwd, role, sharedArtifacts, aiArtifacts) {
  const planningArtifacts = [
    resolve(cwd, '.qe/planning/PROJECT.md'),
    resolve(cwd, '.qe/planning/ROADMAP.md'),
    resolve(cwd, '.qe/planning/REQUIREMENTS.md'),
    resolve(cwd, '.qe/planning/DECISION_LOG.md'),
    resolve(cwd, '.qe/planning/STATE.md'),
  ];

  const byRole = {
    planner: [...planningArtifacts, aiArtifacts.roleSpec, aiArtifacts.taskBundle],
    implementer: [aiArtifacts.roleSpec, aiArtifacts.taskBundle],
    reviewer: [aiArtifacts.roleSpec, aiArtifacts.taskBundle, aiArtifacts.implementationReport],
    supervisor: [aiArtifacts.roleSpec, aiArtifacts.taskBundle, aiArtifacts.implementationReport, aiArtifacts.reviewReport, aiArtifacts.verificationReport],
  };

  return unique(existingPaths([...sharedArtifacts, ...(byRole[role] || [])]));
}

function syncWorkflowArtifactToCanonical(workflowArtifactPath, canonicalPath) {
  if (!workflowArtifactPath || !canonicalPath || !existsSync(workflowArtifactPath)) return;
  ensureDirectory(dirname(canonicalPath));
  copyFileSync(workflowArtifactPath, canonicalPath);
}

function promoteRoleArtifacts({ cwd, workflowId, role, outputPath, runLedgerPath, initialInputPath, workflowArtifactPaths }) {
  const canonical = canonicalArtifacts(cwd);
  const targetByRole = {
    planner: workflowArtifactPaths.roleSpec,
    implementer: workflowArtifactPaths.implementationReport,
    reviewer: workflowArtifactPaths.reviewReport,
    supervisor: workflowArtifactPaths.verificationReport,
  };

  const target = targetByRole[role];
  const promoted = [];

  if (role === 'planner') {
    let taskBundle = null;
    let roleSpecContent = null;
    if (outputPath && existsSync(outputPath)) {
      const plannerOutput = readFileSync(outputPath, 'utf8');
      ({ roleSpecContent, taskBundle } = extractPlannerArtifacts(plannerOutput));
    }

    if (target) {
      ensureDirectory(dirname(target));
      writeFileSync(target, `${(roleSpecContent || '').trim()}\n`, 'utf8');
      promoted.push(target);
    }

    if (taskBundle) {
      writeJsonFile(workflowArtifactPaths.taskBundle, taskBundle);
      if (!promoted.includes(workflowArtifactPaths.taskBundle)) promoted.push(workflowArtifactPaths.taskBundle);
    } else if (!existsSync(workflowArtifactPaths.taskBundle)) {
      writeJsonFile(workflowArtifactPaths.taskBundle, {
        workflow_id: workflowId,
        created_at: new Date().toISOString(),
        source_input_path: initialInputPath,
        planner_output_path: outputPath,
        planner_run_ledger_path: runLedgerPath,
        note: 'Placeholder task bundle created by run_team_workflow.mjs. Replace with planner-generated structured task data when available.',
      });
      promoted.push(workflowArtifactPaths.taskBundle);
    }

    syncWorkflowArtifactToCanonical(workflowArtifactPaths.roleSpec, canonical.roleSpec);
    syncWorkflowArtifactToCanonical(workflowArtifactPaths.taskBundle, canonical.taskBundle);
    return promoted;
  }

  if (target && outputPath && existsSync(outputPath)) {
    ensureDirectory(dirname(target));
    const rawOutput = readFileSync(outputPath, 'utf8');
    writeFileSync(target, cleanRoleArtifactOutput(role, rawOutput), 'utf8');
    promoted.push(target);

    const canonicalTarget = {
      implementer: canonical.implementationReport,
      reviewer: canonical.reviewReport,
      supervisor: canonical.verificationReport,
    }[role];
    syncWorkflowArtifactToCanonical(target, canonicalTarget);
  }

  return promoted;
}

function makeRoleInput({ role, initialInputPath, previousResult, roleArtifacts }) {
  const lines = [
    `Workflow role: ${role}`,
    '',
    'Workflow context:',
  ];

  if (initialInputPath) {
    lines.push(`- Initial input: ${initialInputPath}`);
  }

  if (previousResult?.outputPath) {
    lines.push(`- Previous role output: ${previousResult.outputPath}`);
  }

  if (previousResult?.runLedgerPath) {
    lines.push(`- Previous role ledger: ${previousResult.runLedgerPath}`);
  }

  lines.push('', 'Artifacts in scope:');
  for (const artifact of roleArtifacts) {
    lines.push(`- ${artifact}`);
  }

  const initialInputText = readTextIfExists(initialInputPath);
  const previousOutputText = readTextIfExists(previousResult?.outputPath);
  const previousLedgerText = readTextIfExists(previousResult?.runLedgerPath);

  lines.push(
    '',
    'Instruction:',
    'Work only within your assigned role. Use the embedded document contents below as the primary working context. Do not ask follow-up questions unless the input is logically incomplete.',
    ''
  );

  if (role === 'planner') {
    lines.push(...renderDocumentSection('Initial Input', initialInputPath, initialInputText));
  }

  if (role === 'reviewer' || role === 'supervisor') {
    lines.push(...renderDocumentSection('Previous Role Output', previousResult?.outputPath, previousOutputText));
  }

  if (role === 'supervisor') {
    lines.push(...renderDocumentSection('Previous Role Ledger', previousResult?.runLedgerPath, previousLedgerText));
  }

  for (const artifact of roleArtifacts) {
    lines.push(...renderDocumentSection('Artifact', artifact, readTextIfExists(artifact)));
  }

  return lines.join('\n');
}

function writeFailureArtifact({ role, parsed, workflowArtifactPaths }) {
  const target = failureArtifactPath(workflowArtifactPaths, role);
  if (!target) return null;

  const content = [
    `# ${role[0].toUpperCase()}${role.slice(1)} Artifact`,
    '',
    'Status: execution_failed',
    `Run ledger: ${parsed?.run_ledger_path || 'unavailable'}`,
    `Output path: ${parsed?.output_path || 'unavailable'}`,
    `Error: ${parsed?.execution_error || 'unknown error'}`,
    '',
    'This artifact was synthesized by run_team_workflow.mjs because the role did not complete successfully.',
    '',
  ].join('\n');

  ensureDirectory(dirname(target));
  writeFileSync(target, content, 'utf8');
  return target;
}

function runRole({ cwd, workflowDir, role, configPath, inputFile, artifacts, execute, dryRun, timeoutMs }) {
  const runId = `${basenameSafe(workflowDir)}-${role}`;
  const args = {
    role,
    config: configPath,
    input: inputFile,
    runId,
    artifacts: [...artifacts],
    execute,
    dryRun,
    timeoutMs,
  };

  let parsed = null;
  let error = null;
  try {
    parsed = runRoleCommand(args, cwd);
  } catch (err) {
    error = err.message;
  }

  return {
    role,
    exitCode: error ? 1 : 0,
    error,
    stdout: parsed ? JSON.stringify(parsed, null, 2) : '',
    stderr: error || '',
    parsed,
  };
}

function basenameSafe(path) {
  return path.split(/[\\/]/).pop();
}

const cwd = process.cwd();
const args = parseArgs(process.argv.slice(2));

if (args.help) {
  usage();
  process.exit(0);
}

const { path: configPath, config } = loadAiTeamConfig(cwd, args.config);
const errors = validateAiTeamConfig(config);
if (errors.length > 0) {
  console.error(`Invalid AI team config: ${configPath}`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const workflowId = args.workflowId || randomUUID().slice(0, 8);
const workflowDir = join(cwd, '.qe', 'ai-team', 'workflows', workflowId);
ensureDirectory(workflowDir);

const initialInputPath = args.input ? resolve(cwd, args.input) : defaultPlannerInput(cwd);
const sharedArtifacts = args.artifacts.map(path => resolve(cwd, path));
const workflowArtifactPaths = cloneCanonicalArtifacts(cwd, workflowDir);
clearWorkflowArtifacts(workflowArtifactPaths, args.clearArtifacts);
const startRole = validatedStartRole(args.fromRole, args.reuseApprovedPlan, cwd);
const rolesToRun = ROLE_ORDER.slice(ROLE_ORDER.indexOf(startRole));

let previousResult = null;
const steps = [];
let halted = false;

for (const role of rolesToRun) {
  const roleArtifacts = defaultArtifactsForRole(cwd, role, sharedArtifacts, workflowArtifactPaths);
  const roleInputContent = makeRoleInput({
    role,
    initialInputPath,
    previousResult,
    roleArtifacts,
  });

  const roleInputPath = join(workflowDir, `${role}-input.md`);
  writeFileSync(roleInputPath, `${roleInputContent}\n`, 'utf8');

  const result = runRole({
    cwd,
    workflowDir,
    role,
    configPath,
    inputFile: roleInputPath,
    artifacts: roleArtifacts,
    execute: args.execute,
    dryRun: args.dryRun,
    timeoutMs: args.timeoutMs,
  });

  const step = {
    role,
    input_path: roleInputPath,
    artifact_paths: roleArtifacts,
    exit_code: result.exitCode,
    error: result.error,
    parsed: result.parsed,
    stderr_preview: result.stderr.slice(0, 1000),
  };
  steps.push(step);

  if (!args.dryRun && result.parsed?.output_path) {
    step.promoted_artifacts = promoteRoleArtifacts({
      cwd,
      workflowId,
      role,
      outputPath: result.parsed.output_path,
      runLedgerPath: result.parsed.run_ledger_path,
      initialInputPath,
      workflowArtifactPaths,
    });
  } else {
    step.promoted_artifacts = [];
  }

  if (!args.dryRun && result.parsed?.execution_error) {
    const failureArtifact = writeFailureArtifact({ role, parsed: result.parsed, workflowArtifactPaths });
    if (failureArtifact && !step.promoted_artifacts.includes(failureArtifact)) {
      step.promoted_artifacts.push(failureArtifact);
    }
  }

  if (!result.parsed || result.exitCode !== 0 || result.parsed.execution_error) {
    if (!args.continueOnError) {
      halted = true;
      break;
    }
  }

  previousResult = result.parsed
    ? {
        outputPath: result.parsed.output_path,
        runLedgerPath: result.parsed.run_ledger_path,
      }
    : null;
}

const workflowLedgerPath = join(workflowDir, 'workflow.json');
writeJsonFile(workflowLedgerPath, {
  workflow_id: workflowId,
  created_at: new Date().toISOString(),
  config_path: configPath,
  initial_input_path: initialInputPath,
  execute: args.execute,
  dry_run: args.dryRun,
  continue_on_error: args.continueOnError,
  requested_from_role: args.fromRole,
  effective_from_role: startRole,
  reuse_approved_plan: args.reuseApprovedPlan,
  cleared_artifacts: args.clearArtifacts,
  workflow_artifact_paths: workflowArtifactPaths,
  halted,
  steps,
});

console.log(JSON.stringify({
  workflow_id: workflowId,
  workflow_ledger_path: workflowLedgerPath,
  halted,
  steps: steps.map(step => ({
    role: step.role,
    exit_code: step.exit_code,
    run_ledger_path: step.parsed?.run_ledger_path || null,
    output_path: step.parsed?.output_path || null,
    execution_error: step.parsed?.execution_error || step.error,
  })),
}, null, 2));
