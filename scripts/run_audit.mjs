import fs from 'fs';
import path from 'path';

/**
 * Recursively finds all files in a directory matching a pattern.
 * @param {string} dir - The directory path to search
 * @param {string} pattern - The file suffix/pattern to match (e.g., '.md', 'SKILL.md')
 * @returns {string[]} Array of file paths matching the pattern
 */
function getFiles(dir, pattern) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(file, pattern));
    } else {
      if (file.endsWith(pattern)) {
        results.push(file);
      }
    }
  });
  return results;
}

/**
 * Parses a markdown file into frontmatter and body sections.
 * @param {string} content - The markdown file content
 * @returns {{frontmatter: Object, body: string}} Object with parsed frontmatter and body
 */
function parseMarkdown(content) {
  const lines = content.split('\n');
  const frontmatter = {};
  let inFrontmatter = false;
  let bodyLines = [];
  let fmFound = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '---') {
      if (!fmFound) {
        inFrontmatter = true;
        fmFound = true;
        continue;
      } else if (inFrontmatter) {
        inFrontmatter = false;
        bodyLines = lines.slice(i + 1);
        continue;
      }
    }
    if (inFrontmatter) {
      const parts = line.split(':');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join(':').trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
        frontmatter[key] = value;
      }
    } else if (!fmFound) {
      // Content before any frontmatter (shouldn't happen in standard skills)
    } else {
      bodyLines.push(line);
    }
  }
  
  const body = bodyLines.join('\n');
  return { frontmatter, body };
}

// Load Agent Tiers
const agentTiersContent = fs.readFileSync('core/AGENT_TIERS.md', 'utf-8');
const agentToTierMap = {};
const tierRows = agentTiersContent.match(/\| ([^|]+) \| ([^|]+) \| ([^|]+) \|/g);
if (tierRows) {
  tierRows.forEach(row => {
    const parts = row.split('|').map(p => p.trim());
    if (parts.length >= 4 && parts[1] !== 'Agent' && parts[1] !== '---') {
      agentToTierMap[parts[1]] = parts[2];
    }
  });
}

const auditResults = {
  skills: [],
  agents: []
};

// Validation helper functions for skills

/**
 * Validates that skills with plan/spec/execute triggers include Next Command handoff.
 * @param {string} invocationTrigger - The skill's invocation_trigger frontmatter field
 * @param {string} body - The skill body content
 * @returns {{valid: boolean, warning: string|null}} Validation result with optional warning message
 */
function validateHandoffCheck(invocationTrigger, body) {
  const triggerLower = (invocationTrigger || '').toLowerCase();
  const hasKeyword = /\b(plan|spec|execute)\b/.test(triggerLower);
  const hasNextCommand = /next\s*command:|next:|next\s+command/i.test(body);

  if (hasKeyword && !hasNextCommand) {
    return { valid: false, warning: 'WARN: Skill has plan/spec/execute trigger but missing Next Command: or Next:' };
  }
  return { valid: true, warning: null };
}

/**
 * Validates that Step N headings are in monotonically increasing order.
 * @param {string} body - The skill body content
 * @returns {{valid: boolean, warning: string|null}} Validation result with optional warning message
 */
function validateStepOrder(body) {
  const stepPattern = /^#{1,3}\s+Step\s+(\d+)/gm;
  const steps = [];
  let match;
  while ((match = stepPattern.exec(body)) !== null) {
    steps.push(parseInt(match[1], 10));
  }

  if (steps.length === 0) return { valid: true, warning: null };

  for (let i = 1; i < steps.length; i++) {
    if (steps[i] <= steps[i - 1]) {
      return { valid: false, warning: `WARN: Steps not in order: ${steps.join(', ')}` };
    }
  }
  return { valid: true, warning: null };
}

/**
 * Detects code blocks without language tags (bare ``` without language specifier).
 * @param {string} body - The skill body content
 * @returns {{valid: boolean, warning: string|null}} Validation result with count of untagged blocks
 */
function validateCodeBlockLanguageTags(body) {
  const lines = body.split('\n');
  const untaggedCount = lines.filter(line => line.trim() === '```').length;

  if (untaggedCount > 0) {
    return { valid: false, warning: `WARN: Found ${untaggedCount} code blocks without language tag` };
  }
  return { valid: true, warning: null };
}

/**
 * Validates that recommendedModel is one of: haiku, sonnet, opus.
 * @param {string} recommendedModel - The recommendedModel frontmatter field
 * @returns {{valid: boolean, warning: string|null}} Validation result with optional warning message
 */
function validateRecommendedModel(recommendedModel) {
  if (!recommendedModel) {
    return { valid: true, warning: null };
  }

  const validModels = ['haiku', 'sonnet', 'opus'];
  const modelLower = recommendedModel.toLowerCase();

  if (!validModels.includes(modelLower)) {
    return { valid: false, warning: `WARN: Invalid recommendedModel '${recommendedModel}'. Must be one of: ${validModels.join(', ')}` };
  }
  return { valid: true, warning: null };
}

// Audit Skills
const skillFiles = getFiles('skills', 'SKILL.md');
for (const file of skillFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const { frontmatter, body } = parseMarkdown(content);

  // Run validation checks
  const validations = {
    handoff: validateHandoffCheck(frontmatter.invocation_trigger, body),
    stepOrder: validateStepOrder(body),
    codeBlockLanguage: validateCodeBlockLanguageTags(body),
    recommendedModel: validateRecommendedModel(frontmatter.recommendedModel)
  };

  const warnings = Object.values(validations)
    .filter(v => v.warning)
    .map(v => v.warning);

  auditResults.skills.push({
    path: file,
    name: frontmatter.name || 'MISSING',
    invocation_trigger: frontmatter.invocation_trigger || null,
    recommendedModel: frontmatter.recommendedModel || null,
    hasContextMemo: body.includes('ContextMemo') || body.includes('Minimal I/O Rule'),
    hasInstructionArtifact: body.includes('CLAUDE.md') || body.includes('AGENTS.md') || body.includes('instruction file'),
    validations: validations,
    warnings: warnings
  });
}

// Audit Agents
const agentFiles = getFiles('agents', '.md');
for (const file of agentFiles) {
  const agentName = path.basename(file, '.md');
  if (agentName === 'AGENT_BASE' || agentName === 'AGENT_TEAMS' || agentName === 'AGENT_TIERS') continue;

  const content = fs.readFileSync(file, 'utf-8');
  const { frontmatter, body } = parseMarkdown(content);

  const recommendedModel = frontmatter.recommendedModel || null;
  const expectedTier = agentToTierMap[agentName] || 'UNKNOWN';
  
  let isAligned = false;
  if (recommendedModel && expectedTier !== 'UNKNOWN') {
    if (recommendedModel.toLowerCase() === 'haiku' && expectedTier === 'LOW') isAligned = true;
    if (recommendedModel.toLowerCase() === 'sonnet' && expectedTier === 'MEDIUM') isAligned = true;
    if (recommendedModel.toLowerCase() === 'opus' && expectedTier === 'HIGH') isAligned = true;
  }

  auditResults.agents.push({
    path: file,
    name: agentName,
    recommendedModel,
    expectedTier,
    isAligned,
    hasContextMemo: body.includes('ContextMemo') || body.includes('Minimal I/O Rule'),
    hasInstructionArtifact: body.includes('CLAUDE.md') || body.includes('AGENTS.md') || body.includes('instruction file')
  });
}

fs.writeFileSync('audit_report.json', JSON.stringify(auditResults, null, 2));

// Generate Markdown Report
let mdReport = '# Framework Metadata Audit Report\n\n';

mdReport += '## Skills Audit Summary\n\n';
mdReport += '| Skill | Invocation Trigger | Recommended Model | ContextMemo | Instruction Artifact | Warnings |\n';
mdReport += '|-------|-------------------|-------------------|-------------|----------------------|----------|\n';
auditResults.skills.forEach(s => {
  const warnings = s.warnings.length > 0 ? `⚠️ ${s.warnings.length}` : '✅';
  mdReport += `| ${s.path.replace('skills/', '')} | ${s.invocation_trigger ? '✅' : '❌'} | ${s.recommendedModel || '❌'} | ${s.hasContextMemo ? '✅' : '❌'} | ${s.hasInstructionArtifact ? '✅' : '❌'} | ${warnings} |\n`;
});

// Add detailed warnings section
const skillsWithWarnings = auditResults.skills.filter(s => s.warnings.length > 0);
if (skillsWithWarnings.length > 0) {
  mdReport += '\n## Validation Warnings\n\n';
  skillsWithWarnings.forEach(s => {
    mdReport += `### ${s.path.replace('skills/', '')}\n`;
    s.warnings.forEach(w => {
      mdReport += `- ${w}\n`;
    });
    mdReport += '\n';
  });
}

mdReport += '\n## Agents Audit Summary\n\n';
mdReport += '| Agent | Model | Expected Tier | Aligned? | ContextMemo | Instruction Artifact |\n';
mdReport += '|-------|-------|---------------|----------|-------------|----------------------|\n';
auditResults.agents.forEach(a => {
  mdReport += `| ${a.name} | ${a.recommendedModel || '❌'} | ${a.expectedTier} | ${a.isAligned ? '✅' : '❌'} | ${a.hasContextMemo ? '✅' : '❌'} | ${a.hasInstructionArtifact ? '✅' : '❌'} |\n`;
});

fs.writeFileSync('audit_report.md', mdReport);
console.log('Audit complete. Results in audit_report.json and audit_report.md');
