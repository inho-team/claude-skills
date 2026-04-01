import fs from 'fs';
import path from 'path';

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

// Audit Skills
const skillFiles = getFiles('skills', 'SKILL.md');
for (const file of skillFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const { frontmatter, body } = parseMarkdown(content);

  auditResults.skills.push({
    path: file,
    name: frontmatter.name || 'MISSING',
    invocation_trigger: frontmatter.invocation_trigger || null,
    recommendedModel: frontmatter.recommendedModel || null,
    hasContextMemo: body.includes('ContextMemo') || body.includes('Minimal I/O Rule'),
    hasInstructionArtifact: body.includes('CLAUDE.md') || body.includes('AGENTS.md') || body.includes('instruction file')
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
mdReport += '| Skill | Invocation Trigger | Recommended Model | ContextMemo | Instruction Artifact |\n';
mdReport += '|-------|--------------------|-------------------|-------------|----------------------|\n';
auditResults.skills.forEach(s => {
  mdReport += `| ${s.path.replace('skills/', '')} | ${s.invocation_trigger ? '✅' : '❌'} | ${s.recommendedModel || '❌'} | ${s.hasContextMemo ? '✅' : '❌'} | ${s.hasInstructionArtifact ? '✅' : '❌'} |\n`;
});

mdReport += '\n## Agents Audit Summary\n\n';
mdReport += '| Agent | Model | Expected Tier | Aligned? | ContextMemo | Instruction Artifact |\n';
mdReport += '|-------|-------|---------------|----------|-------------|----------------------|\n';
auditResults.agents.forEach(a => {
  mdReport += `| ${a.name} | ${a.recommendedModel || '❌'} | ${a.expectedTier} | ${a.isAligned ? '✅' : '❌'} | ${a.hasContextMemo ? '✅' : '❌'} | ${a.hasInstructionArtifact ? '✅' : '❌'} |\n`;
});

fs.writeFileSync('audit_report.md', mdReport);
console.log('Audit complete. Results in audit_report.json and audit_report.md');
