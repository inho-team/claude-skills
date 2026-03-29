# QE Global MCP Setup

QE Framework can now manage MCP configuration for multiple clients from one global registry.

Supported clients:

- Claude
- Codex
- Gemini

## Why this exists

Before this change, MCP setup lived in scattered docs and client-specific config files.

Now QE provides:

- a global MCP registry
- a sync command that writes client-specific config
- a QE MCP server that exposes QE skills, agents, docs, and prompts
- optional secret-backed launch wrapping so MCP configs do not need plaintext API keys

## Registry

Default global registry path:

```text
~/.qe/mcp/registry.json
```

Initialize it:

```bash
node scripts/qe_mcp.mjs init-registry
```

The default registry contains one server:

- `qeFramework`

That server launches:

```text
node scripts/qe_mcp_server.mjs
```

## Sync

Preview:

```bash
node scripts/qe_mcp.mjs sync --dry-run
```

Apply to all supported clients:

```bash
node scripts/qe_mcp.mjs sync
```

Apply to one client:

```bash
node scripts/qe_mcp.mjs sync --client codex
node scripts/qe_mcp.mjs sync --client gemini
node scripts/qe_mcp.mjs sync --client claude
```

## Client Targets

| Client | Config path |
|--------|-------------|
| Claude | `~/.claude.json` |
| Codex | `~/.codex/config.toml` |
| Gemini | `~/.gemini/settings.json` |

## QE MCP Server

The QE MCP server exposes:

- tools
  - `qe_list_skills`
  - `qe_read_skill`
  - `qe_list_agents`
  - `qe_read_agent`
  - `qe_read_doc`
  - `qe_framework_help`
- resources
  - `qe://skills/catalog`
  - `qe://skills/<name>`
  - `qe://agents/<name>`
  - `qe://docs/usage-guide`
- prompts
  - `qe-use-skill`
  - `qe-use-agent`

This lets non-Claude clients discover QE guidance without depending on the Claude plugin loader.

## Generic MCP Servers

The registry is not limited to `qeFramework`.

You can add any MCP server definition, including:

- native MCP servers
- remote HTTP MCP servers
- CLI-wrapped MCP servers
- `cli-anything` style wrappers that turn an existing CLI into an MCP server

Example conceptual entry:

```json
{
  "version": 1,
  "servers": {
    "myWrappedCli": {
      "description": "Expose an existing CLI through an MCP wrapper",
      "transport": "stdio",
      "command": "npx",
      "args": ["cli-anything", "--", "my-cli", "--mcp"],
      "cwd": "C:/tools/my-cli",
      "trust": false,
      "env": {},
      "envSecrets": {
        "MY_API_KEY": "my_api_key"
      },
      "enabledClients": ["claude", "codex", "gemini"]
    }
  }
}
```

## Secret-backed launch

If a server needs secrets, use `envSecrets` in the registry instead of plaintext values.

QE will wrap the launch through:

```text
node scripts/qe_secret_launch.mjs
```

That wrapper resolves `Qsecret` bindings at runtime and injects them into the child environment without writing the secret into client config files.

This improves one of the earlier `Qsecret` limitations:

- plaintext MCP credentials no longer need to live in `~/.claude.json`, `~/.gemini/settings.json`, or `~/.codex/config.toml`

## Remaining limits

Some limits still depend on the client platform:

- Windows DPAPI protects values at rest, but does not guarantee a second password prompt on every read
- a downstream CLI or MCP server can still leak a secret if it prints its own environment
- prompt support differs by client, so QE exposes tools and resources as the stable baseline

## Recommended behavior guidance

To make clients actively use the QE MCP server:

- Claude: plugin skills remain primary
- Codex: add project or global instructions telling Codex to consult `qeFramework` before ad-hoc planning
- Gemini: enable the server and use QE prompts or QE tools when working inside QE-managed projects

The important point is consistency:

- one registry
- one QE MCP server
- one secret strategy
- multiple clients
