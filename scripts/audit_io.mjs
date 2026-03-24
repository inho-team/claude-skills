import fs from 'fs';
import { globSync } from 'glob';

const files = globSync('{agents,skills}/**/*.md');
const results = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  const hasRead = content.includes('Read');
  const hasMemo = content.toLowerCase().includes('memo');
  const hasContextMemo = content.includes('ContextMemo');
  
  if (hasRead && !hasMemo && !hasContextMemo) {
    results.push(file);
  }
}

console.log(results.join('\n'));
