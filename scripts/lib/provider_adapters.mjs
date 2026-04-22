#!/usr/bin/env node

import { existsSync } from 'fs';

function roleDirectives(role) {
  const common = [
    'Follow the assigned role strictly.',
    'Use the provided artifacts and input as the only source of truth.',
  ];

  if (role === 'planner') {
    return [
      ...common,
      'Do not ask for permission to write files.',
      'Do not attempt any file writes or tool use.',
      'Do not ask follow-up questions.',
      'If information is missing, make the smallest explicit assumptions needed to proceed.',
      'Return output in stdout only.',
      'Output format:',
      '1. A markdown role spec suitable for role-spec.md.',
      '2. Then a fenced ```json block containing a valid task bundle object suitable for task-bundle.json.',
      'For each task in the task bundle, include a complexity field using low, medium, or high.',
      'For each task in the task bundle, include a delegation_guidance field that explains which model tier should own the work and why.',
      'The json block must be the final section of the response.',
    ];
  }

  if (role === 'implementer') {
    return [
      ...common,
      'You may modify files if needed within your owned scope.',
      'At the end, return a concise markdown implementation report in stdout.',
      'The stdout report should include changed files, checks run, and remaining risks.',
    ];
  }

  if (role === 'reviewer') {
    return [
      ...common,
      'Do not modify files.',
      'Do not ask for file write permission.',
      'Return review findings in stdout only.',
      'Your output must include a verdict line: approve or request_changes.',
      'If you request changes, you must provide concrete remediation instructions.',
      'Concrete remediation instructions must identify target files or artifacts, exact deficiencies, required changes, and verification steps.',
      'Do not give vague feedback such as "improve quality" or "fix issues".',
    ];
  }

  if (role === 'supervisor') {
    return [
      ...common,
      'Do not modify files.',
      'Do not ask for file write permission.',
      'Return the final supervision decision in stdout only.',
      'Your output must include a verdict line: pass, partial, fail, or remediate.',
      'If the outcome is not pass, you must provide a remediation contract.',
      'A remediation contract must contain: 1) what is wrong, 2) where it must be fixed, 3) what acceptable completion looks like, and 4) how the next role should verify it.',
      'Prefer highly specific instructions over broad recommendations.',
    ];
  }

  return common;
}

function buildPolicyLines(policies = {}) {
  const lines = [];
  if (policies.enforce_specific_remediation !== undefined) {
    lines.push(`Specific remediation required: ${policies.enforce_specific_remediation ? 'yes' : 'no'}`);
  }

  if (policies.default_runner_by_complexity) {
    const mapping = policies.default_runner_by_complexity;
    lines.push(`Complexity routing: low=${mapping.low || 'unset'}, medium=${mapping.medium || 'unset'}, high=${mapping.high || 'unset'}`);
  }

  return lines;
}

function buildUserPrompt({ role, roleConfig, runnerName, runnerConfig, inputText, artifacts, policies }) {
  const taskLineByRole = {
    planner: 'Create a planner spec and a task bundle from the provided input. Do not ask follow-up questions. Make minimal explicit assumptions when needed. Always return both the markdown spec and the final fenced json task bundle.',
    implementer: 'Implement the approved work described by the provided input and artifacts. If blocked, explain the blocker precisely.',
    reviewer: 'Review the provided implementation context and return findings plus a clear verdict.',
    supervisor: 'Synthesize the prior role outputs and return the final workflow verdict.',
  };

  return [
    taskLineByRole[role] || `Perform the ${role} role.`,
    `Assigned workflow role: ${role}`,
    `Assigned runner: ${runnerName}`,
    `Execution provider: ${runnerConfig.provider}`,
    `Execution model: ${runnerConfig.model}`,
    `Primary responsibility: ${roleConfig.responsibility}`,
    '',
    ...buildPolicyLines(policies),
    ...(buildPolicyLines(policies).length ? [''] : []),
    ...(role === 'planner'
      ? [
          'Required planner output shape:',
          '## Role Spec',
          '- objective',
          '- scope',
          '- constraints',
          '- acceptance criteria',
          '- execution notes',
          '',
          '```json',
          '{',
          '  "tasks": [',
          '    {',
          '      "id": "T1",',
          '      "title": "short task title",',
          '      "status": "pending",',
          '      "owner": "implementer",',
          '      "complexity": "medium",',
          '      "delegation_guidance": "Use the medium tier runner because this is standard implementation work.",',
          '      "acceptance_criteria": ["..."]',
          '    }',
          '  ]',
          '}',
          '```',
          '',
        ]
      : []),
    ...(role === 'reviewer' || role === 'supervisor'
      ? [
          'Required remediation format when work is not accepted:',
          '## Remediation',
          '- issue',
          '- target files or artifacts',
          '- required changes',
          '- verification steps',
          '',
        ]
      : []),
    'Artifacts in scope:',
    ...artifacts.map(path => `- ${path}`),
    '',
    'Input:',
    inputText,
  ].join('\n');
}

function buildPromptBundle({ role, roleConfig, runnerName, runnerConfig, inputText, artifacts, policies }) {
  return [
    `Role: ${role}`,
    `Runner: ${runnerName}`,
    `Provider: ${runnerConfig.provider}`,
    `Model: ${runnerConfig.model}`,
    `Responsibility: ${roleConfig.responsibility}`,
    '',
    ...(buildPolicyLines(policies).length
      ? [
          'Workflow Policies:',
          ...buildPolicyLines(policies).map(line => `- ${line}`),
          '',
        ]
      : []),
    'Role Directives:',
    ...roleDirectives(role).map(line => `- ${line}`),
    '',
    'Artifacts:',
    ...artifacts.map(path => `- ${path}`),
    '',
    'Input:',
    inputText,
  ].join('\n');
}

function buildCliInvocation({ executable, args = [], prompt }) {
  return {
    executable,
    args,
    stdin: prompt,
  };
}

function resolveWindowsCommand(baseName) {
  if (process.platform !== 'win32') return null;
  const appData = process.env.APPDATA;
  if (!appData) return null;
  const cmdPath = `${appData}\\npm\\${baseName}.cmd`;
  return existsSync(cmdPath) ? cmdPath : null;
}

const registry = {
  claude(context) {
    const prompt = buildUserPrompt(context);
    const systemPrompt = roleDirectives(context.role).join('\n');
    const executable = resolveWindowsCommand('claude') || 'claude';
    return {
      provider: 'claude',
      mode: 'prompt-bundle',
      prompt,
      system_prompt: systemPrompt,
      suggested_cli: buildCliInvocation({
        executable,
        args: [
          '--print',
          '--append-system-prompt',
          '{system_prompt}',
          '--model',
          '{model}',
        ],
        prompt,
      }),
    };
  },
  mock(context) {
    return {
      provider: 'mock',
      mode: 'mock',
      prompt: buildPromptBundle(context),
      suggested_cli: null,
    };
  },
};

export function getProviderAdapter(provider) {
  const adapter = registry[provider];
  if (!adapter) {
    throw new Error(`Unsupported provider adapter: ${provider}`);
  }
  return adapter;
}

export function listSupportedProviders() {
  return Object.keys(registry);
}
