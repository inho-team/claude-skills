import fs from 'fs';
import path from 'path';

const skills = process.argv.slice(2);
const results = [];

for (const skillPath of skills) {
  try {
    const content = fs.readFileSync(skillPath, 'utf-8');
    const lines = content.split('\n');
    const frontmatterLines = [];
    let inFrontmatter = false;
    
    for (const line of lines) {
      if (line.trim() === '---') {
        if (!inFrontmatter) {
          inFrontmatter = true;
          continue;
        } else {
          break;
        }
      }
      if (inFrontmatter) {
        frontmatterLines.push(line);
      }
    }

    const frontmatter = {};
    frontmatterLines.forEach(line => {
      const parts = line.split(':');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join(':').trim();
        frontmatter[key] = value;
      }
    });

    const hasInvocationTrigger = !!frontmatter.invocation_trigger;
    const hasName = !!frontmatter.name;
    const hasDescription = !!frontmatter.description;
    const hasRecommendedModel = !!frontmatter.recommendedModel;

    results.push({
      path: skillPath,
      name: frontmatter.name || 'MISSING',
      hasInvocationTrigger,
      hasName,
      hasDescription,
      hasRecommendedModel,
      recommendedModel: frontmatter.recommendedModel || 'MISSING'
    });
  } catch (err) {
    results.push({
      path: skillPath,
      error: err.message
    });
  }
}

console.log(JSON.stringify(results, null, 2));
