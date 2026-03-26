#!/usr/bin/env node

export function normalizeLineEndings(text) {
  return text.replace(/\r\n/g, '\n');
}

export function cleanupEncodingNoise(text) {
  return text
    .replace(/\?\?/g, ' - ')
    .replace(/([A-Za-z0-9])([^\x00-\x7F]+)([A-Za-z0-9])/g, '$1-$3')
    .replace(/[^\x00-\x7F]/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[ ]{2,}/g, ' ');
}

export function repairCommonPhrases(text) {
  return text
    .replace(/this pass is instruction-layer only/gi, 'this pass is instruction-layer-only')
    .replace(/the correct boundary no native adapters or runtime automation/gi, 'the correct boundary - no native adapters or runtime automation')
    .replace(/Wave ordering \(1 2 3\)/g, 'Wave ordering (1 -> 2 -> 3)')
    .replace(/should stop the remaining work needs to be routed/gi, 'should stop; the remaining work needs to be routed')
    .replace(/All existing single-model behavior must remain unchanged\.\s*Multi-model/gi, 'All existing single-model behavior must remain unchanged. Multi-model')
    .replace(/Any runtime execution engine changes this pass is instruction-layer-only/gi, 'Any runtime execution engine changes; this pass is instruction-layer-only')
    .replace(/the correct boundary - no native adapters or runtime automation\./gi, 'the correct boundary - no native adapters or runtime automation.')
    .replace(/[ ]+\./g, '.');
}

export function stripTrailingBoilerplate(text) {
  return text
    .replace(/\n*Please grant write permission[\s\S]*$/i, '')
    .replace(/\n*The write permission for the artifacts directory is pending[\s\S]*$/i, '')
    .replace(/\n*The verdict is written above[\s\S]*$/i, '')
    .replace(/\n*Both artifacts are ready\.?\s*$/i, '')
    .replace(/\n*I.*attempted to overwrite[\s\S]*$/i, '')
    .trim();
}

export function cleanPromotedMarkdown(text) {
  let cleaned = cleanupEncodingNoise(normalizeLineEndings(text));
  cleaned = cleaned
    .replace(/^\s*The artifacts need write permission[\s\S]*?---\s*/i, '')
    .replace(/^\s*The write permission for the artifacts directory is pending[\s\S]*?---\s*/i, '')
    .replace(/^\s*The verdict is written above\.[\s\S]*?\n\n/i, '')
    .replace(/^\s*Here are both outputs in full:\s*/i, '')
    .replace(/^\s*Here is the final supervisor verdict:\s*/i, '')
    .replace(/^\s*`\.qe\/ai-team\/artifacts\/[^`]+`\s*\n+/im, '')
    .replace(/^\s*\*\*Artifact path\*\*:\s*`[^`]+`\s*\n+/im, '')
    .replace(/\n+\*\*Workflow complete\.[\s\S]*$/i, '')
    .replace(/\n{3,}/g, '\n\n');

  cleaned = stripTrailingBoilerplate(cleaned);
  cleaned = repairCommonPhrases(cleaned);
  return `${cleaned.trim()}\n`;
}

export function extractPlannerArtifacts(plannerOutput) {
  const normalized = cleanPromotedMarkdown(plannerOutput);
  const jsonMatch = normalized.match(/```json\s*([\s\S]*?)```/i);
  let taskBundle = null;
  if (jsonMatch) {
    try {
      taskBundle = JSON.parse(jsonMatch[1].trim());
    } catch {
      taskBundle = null;
    }
  }

  const specAnchor = normalized.search(/(^|\n)#{1,2}\s+Role Spec\b/i);
  let roleSpecContent = specAnchor >= 0
    ? normalized.slice(specAnchor).replace(/```json\s*[\s\S]*?```/i, '').trim()
    : normalized.replace(/```json\s*[\s\S]*?```/i, '').trim();

  roleSpecContent = roleSpecContent
    .replace(/\n## Task Bundle[\s\S]*$/i, '')
    .replace(/\n+Both artifacts are ready\.?\s*$/i, '')
    .trim();

  return {
    roleSpecContent: `${roleSpecContent}\n`,
    taskBundle,
  };
}

export function cleanRoleArtifactOutput(role, rawText) {
  const cleaned = cleanPromotedMarkdown(rawText);

  if (role === 'reviewer') {
    const findingsAnchor = cleaned.search(/(^|\n)(#+\s+)?Review Findings:?/i);
    return `${(findingsAnchor >= 0 ? cleaned.slice(findingsAnchor) : cleaned).trim()}\n`;
  }

  if (role === 'supervisor') {
    const verdictAnchor = cleaned.search(/(^|\n)##?\s+Supervisor Verdict:?/i);
    return `${(verdictAnchor >= 0 ? cleaned.slice(verdictAnchor) : cleaned).trim()}\n`;
  }

  return `${cleaned.trim()}\n`;
}
