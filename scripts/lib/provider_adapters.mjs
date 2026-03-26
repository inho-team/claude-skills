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
    ];
  }

  if (role === 'supervisor') {
    return [
      ...common,
      'Do not modify files.',
      'Do not ask for file write permission.',
      'Return the final supervision decision in stdout only.',
      'Your output must include a verdict line: pass, partial, fail, or remediate.',
    ];
  }

  return common;
}

function buildUserPrompt({ role, roleConfig, inputText, artifacts }) {
  const taskLineByRole = {
    planner: 'Create a planner spec and a task bundle from the provided input. Do not ask follow-up questions. Make minimal explicit assumptions when needed. Always return both the markdown spec and the final fenced json task bundle.',
    implementer: 'Implement the approved work described by the provided input and artifacts. If blocked, explain the blocker precisely.',
    reviewer: 'Review the provided implementation context and return findings plus a clear verdict.',
    supervisor: 'Synthesize the prior role outputs and return the final workflow verdict.',
  };

  return [
    taskLineByRole[role] || `Perform the ${role} role.`,
    `Assigned workflow role: ${role}`,
    `Primary responsibility: ${roleConfig.responsibility}`,
    '',
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
          '      "acceptance_criteria": ["..."]',
          '    }',
          '  ]',
          '}',
          '```',
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

function buildPromptBundle({ role, roleConfig, inputText, artifacts }) {
  return [
    `Role: ${role}`,
    `Provider: ${roleConfig.provider}`,
    `Model: ${roleConfig.model}`,
    `Responsibility: ${roleConfig.responsibility}`,
    '',
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

function resolveWindowsCmd(baseName) {
  const appData = process.env.APPDATA;
  if (!appData) return null;
  const cmdPath = `${appData}\\npm\\${baseName}.cmd`;
  return existsSync(cmdPath) ? cmdPath : null;
}

const registry = {
  claude(context) {
    const prompt = buildUserPrompt(context);
    const systemPrompt = roleDirectives(context.role).join('\n');
    const executable = resolveWindowsCmd('claude') || 'claude';
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
  codex(context) {
    const prompt = buildPromptBundle(context);
    const executable = resolveWindowsCmd('codex') || 'codex';
    return {
      provider: 'codex',
      mode: 'prompt-bundle',
      prompt,
      suggested_cli: buildCliInvocation({
        executable,
        args: [
          'exec',
          '--skip-git-repo-check',
          '--cd',
          '{cwd}',
          '--model',
          '{model}',
          '--output-last-message',
          '{output_file}',
          '-',
        ],
        prompt,
      }),
    };
  },
  gemini(context) {
    const prompt = buildPromptBundle(context);
    const executable = resolveWindowsCmd('gemini') || 'gemini';
    return {
      provider: 'gemini',
      mode: 'prompt-bundle',
      prompt,
      suggested_cli: buildCliInvocation({
        executable,
        args: [
          '--prompt',
          '',
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
