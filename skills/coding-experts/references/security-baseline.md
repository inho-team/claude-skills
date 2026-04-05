# Security Baseline — OWASP Top 10 Prevention Patterns

Cross-language reference for identifying and preventing OWASP Top 10 (2021) vulnerabilities.

---

## A01: Broken Access Control
**Risk**: Users can act as others or access unauthorized resources.
**Detection Keywords**: `isAdmin`, `userId`, `role`, `permission`, `canAccess`, no guards on endpoints.
**Prevention**: Enforce role-based access control (RBAC) on every protected resource. Validate user identity on every request.
**Code Pattern**:
```
❌ Wrong:  function getUser(id) { return db.query("SELECT * FROM users WHERE id=" + id) }
✓ Correct: function getUser(id) { 
              assertAuthorized(currentUser, 'read', 'user')
              return db.query("SELECT * FROM users WHERE id=?", [id])
            }
```

## A02: Cryptographic Failures
**Risk**: Sensitive data exposed via weak or missing encryption.
**Detection Keywords**: `password`, `token`, `secret`, `encrypted`, `md5`, `sha1`, `hardcoded_key`.
**Prevention**: Use TLS for transit, AES-256 (or equivalent) at rest. Never log/store plaintext secrets.
**Code Pattern**:
```
❌ Wrong:  hash = md5(password); encKey = "hardcoded"
✓ Correct: hash = bcrypt(password, 12); encKey = envSecret('ENCRYPTION_KEY')
```

## A03: Injection
**Risk**: Attacker-supplied input interpreted as code (SQL, command, template).
**Detection Keywords**: `eval`, `exec`, `query(user_input)`, string concatenation in SQL/shell, `innerHTML`, `${}` in shell.
**Prevention**: Use parameterized queries, prepared statements, and escape/sanitize all user input.
**Code Pattern**:
```
❌ Wrong:  db.query("SELECT * FROM users WHERE email='" + email + "'")
✓ Correct: db.query("SELECT * FROM users WHERE email = ?", [email])
```

## A04: Insecure Design
**Risk**: Missing security controls baked into architecture (no auth flow, no rate limiting design).
**Detection Keywords**: No threat model, missing input validation layer, no rate limiting, no CORS policy.
**Prevention**: Model security threats upfront. Require authentication/authorization by default.
**Code Pattern**:
```
❌ Wrong:  app.get('/api/data', (req, res) => res.json(allData))
✓ Correct: app.get('/api/data', authenticate, rateLimit(10/min), authorize('data:read'), (req, res) => {...})
```

## A05: Security Misconfiguration
**Risk**: Debug mode on in production, default credentials, missing security headers.
**Detection Keywords**: `DEBUG=true`, default passwords, no CSP headers, CORS `*`, verbose error logs.
**Prevention**: Harden defaults. Use environment-specific configs. Enable security headers (CSP, HSTS, X-Frame-Options).
**Code Pattern**:
```
❌ Wrong:  app.use(cors()); app.set('debug', true)
✓ Correct: app.use(cors({origin: process.env.ALLOWED_ORIGINS})); securityHeaders(app)
```

## A06: Vulnerable Components
**Risk**: Dependencies with known CVEs or outdated packages.
**Detection Keywords**: `npm audit`, `outdated`, `vulnerable`, pinned to old versions.
**Prevention**: Keep dependencies updated. Run regular audits. Use lock files. Monitor CVE feeds.
**Code Pattern**:
```
❌ Wrong:  "lodash": "3.0.0" (2-year-old version with known vulns)
✓ Correct: "lodash": "^4.17.21" (latest stable) + npm audit fix
```

## A07: Authentication Failures
**Risk**: Weak password validation, session fixation, credential stuffing not mitigated.
**Detection Keywords**: `password < 8 chars`, no MFA, session no `httpOnly`, JWT stored in localStorage.
**Prevention**: Enforce strong passwords. Implement MFA. Use httpOnly cookies. Add rate limiting on login.
**Code Pattern**:
```
❌ Wrong:  setCookie('sessionId', token); // accessible to JS
✓ Correct: setCookie('sessionId', token, {httpOnly: true, secure: true, sameSite: 'Strict'})
```

## A08: Data Integrity Failures
**Risk**: Data modified without detection (MITM, race conditions, unsigned updates).
**Detection Keywords**: No signatures on API responses, unsigned JWTs, race conditions in DB writes.
**Prevention**: Sign critical data. Use HMAC for integrity checks. Version rows for audit.
**Code Pattern**:
```
❌ Wrong:  resp = {data: user, timestamp: now}
✓ Correct: resp = {data: user, signature: hmac(data, secret), timestamp: now}
```

## A09: Logging Failures
**Risk**: No audit trail; security events not logged; sensitive data in logs.
**Detection Keywords**: No logging, logs without timestamps, passwords/tokens logged, no centralized logging.
**Prevention**: Log security events (login, access denied, config changes). Exclude secrets. Centralize + retain.
**Code Pattern**:
```
❌ Wrong:  console.log("User login:", email, password)
✓ Correct: audit.log({event: 'login', email, timestamp, ip}, {exclude: ['password']})
```

## A10: SSRF
**Risk**: App makes requests to attacker-specified URLs (internal services, cloud metadata).
**Detection Keywords**: `fetch(userUrl)`, `curl` from user input, no URL allowlist.
**Prevention**: Validate URLs against allowlist. Disable cloud metadata endpoints. Use DNS rebinding protection.
**Code Pattern**:
```
❌ Wrong:  fetch(req.query.url)
✓ Correct: if (!SAFE_DOMAINS.includes(new URL(req.query.url).hostname)) throw Error('Invalid domain')
```

---

## Framework-Specific Extension Points

| Category | Framework | Specific Risk | Prevention |
|----------|-----------|---------------|-----------|
| Web Frontend | React, Vue, Angular | XSS via `dangerouslySetInnerHTML` / `v-html` / `innerHTML` | Use `.textContent`, sanitize HTML with `DOMPurify` |
| REST API | FastAPI, Express, Spring | Input validation, rate limiting, CORS misconfiguration | Use schema validators (Pydantic, Joi, Jakarta), apply middleware |
| Database | Django ORM, JPA, Prisma | Raw SQL queries, mass assignment | Always use parameterized queries, define allowed fields |
| Auth | JWT, OAuth, Session | Token storage, CSRF, session fixation | httpOnly cookies, SameSite, token rotation |
| Infra | Docker, K8s, Terraform | Secret exposure in images, privilege escalation | Use secret vaults, non-root containers, RBAC |

---

## Scanning Hints for QE Hooks

- **Priority 1** (Critical): A03 (Injection), A02 (weak crypto), A07 (auth)
- **Priority 2** (High): A01 (access control), A05 (misconfig), A10 (SSRF)
- **Priority 3** (Medium): A04 (design), A06 (vulnerable components), A08/A09 (integrity/logging)

See `skills/coding-experts/hooks/` for automated detection rules.
