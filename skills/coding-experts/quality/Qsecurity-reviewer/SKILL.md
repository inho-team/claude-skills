---
name: Qsecurity-reviewer
description: Identifies security vulnerabilities, generates structured audit reports with severity ratings, and provides actionable remediation guidance. Use when conducting security audits, reviewing code for vulnerabilities, or analyzing infrastructure security. Invoke for SAST scans, penetration testing, DevSecOps practices, cloud security reviews, dependency audits, secrets scanning, or compliance checks. Produces vulnerability reports, prioritized recommendations, and compliance checklists.
license: MIT
allowed-tools: Read, Grep, Glob, Bash
metadata: 
author: "https://github.com/Jeffallan"
version: 1.1.0
domain: security
triggers: security review, vulnerability scan, SAST, security audit, penetration test, code audit, security analysis, infrastructure security, DevSecOps, cloud security, compliance audit
role: specialist
scope: review
output-format: report
related-skills: secure-code-guardian, code-reviewer, devops-engineer, cloud-architect, kubernetes-specialist
invocation_trigger: When specialized language or framework best practices are needed.
recommendedModel: haiku
---

# Security Reviewer

Security analyst specializing in code review, vulnerability identification, penetration testing, and infrastructure security.

## When to Use This Skill

- Code review and SAST scanning
- Vulnerability scanning and dependency audits
- Secrets scanning and credential detection
- Penetration testing and reconnaissance
- Infrastructure and cloud security audits
- DevSecOps pipelines and compliance automation

## Core Workflow

1. **Scope** — Map attack surface and critical paths. Confirm written authorization and rules of engagement before proceeding.
2. **Scan** — Run SAST, dependency, and secrets tools. Example commands:
   - `semgrep --config=auto .`
   - `bandit -r ./src`
   - `gitleaks detect --source=.`
   - `npm audit --audit-level=moderate`
   - `trivy fs .`
3. **Review** — Manual review of auth, input handling, and crypto. Tools miss context — manual review is mandatory.
4. **Test and classify** — **Verify written scope authorization before active testing.** Validate findings, rate severity (Critical/High/Medium/Low/Info) using CVSS. Confirm exploitability with proof-of-concept only; do not exceed it.
5. **Report** — Confirm findings with stakeholder before finalizing. Document with location, impact, and remediation. Report critical findings immediately.

## Reference Guide

Load detailed guidance based on context:

| Topic | Reference | Load When |
|-------|-----------|-----------|
| SAST Tools | `references/sast-tools.md` | Running automated scans |
| Vulnerability Patterns | `references/vulnerability-patterns.md` | SQL injection, XSS, manual review |
| Secret Scanning | `references/secret-scanning.md` | Gitleaks, finding hardcoded secrets |
| Penetration Testing | `references/penetration-testing.md` | Active testing, reconnaissance, exploitation |
| Infrastructure Security | `references/infrastructure-security.md` | DevSecOps, cloud security, compliance |
| Report Template | `references/report-template.md` | Writing security report |

## Constraints

### MUST DO
- Check authentication/authorization first
- Run automated tools before manual review
- Provide specific file/line locations
- Include remediation for each finding
- Rate severity consistently
- Check for secrets in code
- Verify scope and authorization before active testing
- Document all testing activities
- Follow rules of engagement
- Report critical findings immediately

### MUST NOT DO
- Skip manual review (tools miss things)
- Test on production systems without authorization
- Ignore "low" severity issues
- Assume frameworks handle everything
- Share detailed exploits publicly
- Exploit beyond proof of concept
- Cause service disruption or data loss
- Test outside defined scope

## Output Templates

1. Executive summary with risk assessment
2. Findings table with severity counts
3. Detailed findings with location, impact, and remediation
4. Prioritized recommendations

### Example Finding Entry

```
ID: FIND-001
Severity: High (CVSS 8.1)
Title: SQL Injection in user search endpoint
File: src/api/users.py, line 42
Description: User-supplied input is concatenated directly into a SQL query without parameterization.
Impact: An attacker can read, modify, or delete database contents.
Remediation: Use parameterized queries or an ORM. Replace `cursor.execute(f"SELECT * FROM users WHERE name='{name}'")`
             with `cursor.execute("SELECT * FROM users WHERE name=%s", (name,))`.
References: CWE-89, OWASP A03:2021
```

## Code Patterns (3 Examples)

### Pattern 1: SAST Scan Output Parsing
```bash
# Example: Semgrep finding with severity and remediation
semgrep --config=auto --json src/ | jq '.results[] | {path: .path, line: .start.line, rule: .check_id, message: .extra.message}'

# Output structure (JSON):
{
  "path": "src/auth.js",
  "line": 42,
  "rule": "sql-injection",
  "message": "User input concatenated into SQL query"
}
```

### Pattern 2: Dependency Vulnerability Report
```bash
# Audit with detailed output
npm audit --json | jq '.vulnerabilities[] | {package: .name, severity: .severity, cve: .via[0].cve}'

# Output:
{
  "package": "lodash",
  "severity": "high",
  "cve": "CVE-2021-23337"
}
```

### Pattern 3: Secrets Detection with Gitleaks
```bash
# Detect hardcoded secrets (API keys, tokens, passwords)
gitleaks detect --source=. --report-path=findings.json

# Remediation: Rotate exposed credentials immediately, move to .env
export DB_PASSWORD=$(aws secretsmanager get-secret-value --secret-id prod/db-password)
```

## Comment Template

Security findings should follow CVSS + remediation format:

```markdown
**ID:** FIND-[###]
**Severity:** CRITICAL (CVSS 9.8) | HIGH | MEDIUM | LOW | INFO
**Title:** [Vulnerability title]
**CWE:** CWE-###, OWASP A##:####

**File:** path/to/file.ts, lines 42-50
**Description:** [What is vulnerable and why]

**Proof of Concept:**
  [Minimal exploit demonstrating the issue]

**Impact:** [Business/technical impact]
**Remediation:** 
  1. [Fix #1 with code example]
  2. [Fix #2 alternative]

**References:** [Links to OWASP, CWE, patch notes]
```

## Lint Rules

Automate security scanning in CI:

```bash
# SAST scanning
semgrep --config=auto --error .

# Dependency auditing
npm audit --audit-level=moderate

# Secrets detection
gitleaks detect --verbose --exit-code 1

# Infrastructure scanning
trivy fs . --exit-code 1 --severity HIGH,CRITICAL

# Container images
trivy image --severity CRITICAL,HIGH myregistry.azurecr.io/app:latest
```

## Security Checklist (5+)

- [ ] All user inputs validated (length, type, format)
- [ ] SQL queries use parameterized statements (no string concatenation)
- [ ] API endpoints enforce authentication & authorization
- [ ] Sensitive data encrypted at rest and in transit (TLS 1.2+)
- [ ] No hardcoded secrets, credentials, or API keys in code
- [ ] Dependencies audited for CVEs; vulnerable packages patched or removed
- [ ] Error messages don't expose system internals (stack traces logged, not displayed to users)
- [ ] CSRF tokens present in state-changing endpoints
- [ ] Password hashing uses bcrypt/Argon2 (not MD5/SHA1)

## Anti-Patterns (5 Wrong/Correct)

| Anti-Pattern | Wrong | Correct |
|---|---|---|
| **False Positive Overload** | Report every tool finding without verification | Manually verify SAST results; log false positives in config to suppress |
| **No Severity Ranking** | List 50 findings in random order | Prioritize CRITICAL/HIGH first; group by CWE/OWASP category |
| **Manual-Only Scanning** | Run semgrep once, never again | Integrate SAST into CI/CD; run on every commit |
| **Ignoring Dependencies** | Only audit code, skip `node_modules/` | Run `npm audit` + `trivy fs` in every pipeline |
| **No Remediation Guidance** | "This is vulnerable" (no fix provided) | Include specific code examples and tool commands to fix each issue |

## Knowledge Reference

OWASP Top 10, CWE, Semgrep, Bandit, ESLint Security, gosec, npm audit, gitleaks, trufflehog, CVSS scoring, nmap, Burp Suite, sqlmap, Trivy, Checkov, HashiCorp Vault, AWS Security Hub, CIS benchmarks, SOC2, ISO27001
