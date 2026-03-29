# QE Secret Management

QE Framework can manage API keys and tokens without storing plaintext values in the project.

## Design

QE splits secret handling into two layers:

- metadata registry
- secure value backend

Registry files store references only:

- project metadata: `.qe/secrets/registry.json`
- global metadata: `~/.qe/secrets/registry.json`

Secret values are stored outside the repository through the active backend.

## Supported Backends

| OS | Backend | Notes |
|----|---------|-------|
| Windows | `dpapi-file` | Uses a DPAPI-protected user store under the user profile. Encrypted at rest, but Windows may not force a second password prompt on every read. |
| macOS | `keychain` | Uses Keychain through the `security` CLI. |
| Linux | `libsecret` | Uses `secret-tool` when libsecret is available. |

## Security Properties

- QE does not write secret values to the registry file.
- QE does not print secret values during `set`, `list`, `delete`, or `exec`.
- QE can inject a secret into a child process environment for one run.
- Direct reveal is intentionally unsupported through the QE CLI.

## Commands

Check the backend and registry paths:

```bash
node scripts/qe_secret.mjs doctor
```

Store a secret interactively:

```bash
node scripts/qe_secret.mjs set openai_api_key --scope global --env OPENAI_API_KEY
```

Store a secret from stdin:

```bash
printf 'sk-example' | node scripts/qe_secret.mjs set openai_api_key --scope global --env OPENAI_API_KEY --stdin
```

List metadata:

```bash
node scripts/qe_secret.mjs list
```

Delete a secret:

```bash
node scripts/qe_secret.mjs delete openai_api_key --scope global
```

Run a command with injected secrets:

```bash
node scripts/qe_secret.mjs exec --env-secret OPENAI_API_KEY=openai_api_key -- node app.js
```

Project secrets override global secrets with the same name when the binding omits an explicit scope.

Example:

```bash
node scripts/qe_secret.mjs exec --env-secret OPENAI_API_KEY=project:openai_api_key -- node app.js
```

## Limitations

### Windows re-auth

Windows does not provide a simple stock CLI that both stores and retrieves generic secrets from Credential Manager in a way QE can rely on everywhere. For that reason, QE uses a DPAPI-protected user store by default on Windows.

This means:

- the value is encrypted at rest
- the value stays outside the project tree
- QE can safely inject it into child processes
- Windows may not prompt for the account password every time the value is read

That behavior is different from browsers or GUI password managers, which can impose their own re-auth flows.

### Child process logging

QE hides secrets from its own normal output, but it cannot stop a child process from printing the value after injection if that process itself logs the environment or echoes the token.

## Recommended Practice

- Use project scope for service credentials tied to one repository.
- Use global scope for personal tokens reused across projects.
- Prefer `exec` over writing `.env` files.
- For MCP servers, prefer `envSecrets` in the QE MCP registry over plaintext env entries in client config files.
- Rotate the value if you ever suspect it was echoed by a child process.
