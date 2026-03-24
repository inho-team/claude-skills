#!/usr/bin/env node

/**
 * Gemini QE Bridge (Universal Adapter)
 * 이 스크립트는 Gemini가 QE 프레임워크의 에이전트 파일을 해석하여 
 * 자신의 시스템 프롬프트로 활용하도록 돕는 역할을 합니다.
 */

import fs from 'fs';
import path from 'path';

const QE_ROOT = process.env.QE_FRAMEWORK_ROOT || process.cwd();

function loadAgent(agentName) {
  const agentPath = path.join(QE_ROOT, 'agents', `${agentName}.md`);
  if (!fs.existsSync(agentPath)) {
    console.error(`Agent ${agentName} not found at ${agentPath}`);
    return null;
  }
  return fs.readFileSync(agentPath, 'utf8');
}

function bridgeToGemini(agentContent) {
  // QE 마크다운 형식을 Gemini 시스템 프롬프트 형식으로 변환 (YAML 헤더 제거 및 지침 강조)
  const content = agentContent.replace(/^---[\s\S]*?---/, '');
  return `
[QE_SYSTEM_ROLE_ACTIVATE]
당신은 QE 프레임워크의 전문 에이전트입니다. 
아래 마크다운 지침을 엄격히 준수하십시오.
작업 시 도구(Tools)의 이름은 Gemini-native 형식을 쓰되, 출력 결과물(예: TASK_REQUEST.md)은 QE 규격을 따라야 합니다.

---
${content.trim()}
---
  `;
}

// 예시 실행: Epm-planner를 로드함
const agentName = process.argv[2] || 'Epm-planner';
const content = loadAgent(agentName);
if (content) {
  console.log(bridgeToGemini(content));
}
