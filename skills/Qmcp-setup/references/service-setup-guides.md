# Service-Specific MCP Setup Guides

## Google Drive (`@piotr-agier/google-drive-mcp`)

**1. Google Cloud Console Setup:**
- Go to https://console.cloud.google.com
- Create a project or use existing
- Enable APIs: Google Drive API, Google Docs API, Google Sheets API, Google Slides API
- Create OAuth 2.0 Client ID (Desktop application type)
- Download the JSON credentials file

**2. Place Credentials:**
```bash
mkdir -p ~/.config/google-drive-mcp
mv ~/Downloads/client_secret_*.json ~/.config/google-drive-mcp/gcp-oauth.keys.json
```

**3. Add to Claude Code:**
```bash
claude mcp add google-drive -- npx @piotr-agier/google-drive-mcp
```

**4. First Run:**
Browser opens for Google OAuth login. Approve permissions. Tokens auto-save to `~/.config/google-drive-mcp/tokens.json`.

**Capabilities:** File CRUD, search, shared drives, folder navigation, Google Docs/Sheets/Slides editing, Calendar management.

---

## GitHub (`@modelcontextprotocol/server-github`)

**1. Create Personal Access Token:**
- Go to https://github.com/settings/tokens
- Generate token with required scopes (repo, read:org, etc.)

**2. Add to Claude Code:**
```bash
claude mcp add github -e GITHUB_PERSONAL_ACCESS_TOKEN=ghp_xxx -- npx @modelcontextprotocol/server-github
```

**Capabilities:** Repo management, issues, PRs, file operations, branch management, search.

---

## Slack (`@anthropics/mcp-server-slack`)

**1. Create Slack App:**
- Go to https://api.slack.com/apps
- Create new app > From scratch
- Add OAuth scopes: channels:history, channels:read, chat:write, users:read
- Install to workspace, copy Bot User OAuth Token

**2. Add to Claude Code:**
```bash
claude mcp add slack -e SLACK_BOT_TOKEN=xoxb-xxx -e SLACK_TEAM_ID=T0xxx -- npx @anthropics/mcp-server-slack
```

**Capabilities:** Read/send messages, list channels, search messages, manage threads.

---

## PostgreSQL (`@modelcontextprotocol/server-postgres`)

```bash
claude mcp add postgres -- npx @modelcontextprotocol/server-postgres postgresql://user:pass@localhost:5432/dbname
```

**Capabilities:** Query execution, schema inspection, read-only by default.

---

## Filesystem (`@modelcontextprotocol/server-filesystem`)

```bash
claude mcp add filesystem -- npx @modelcontextprotocol/server-filesystem /path/to/allowed/directory
```

**Capabilities:** Read/write files, directory listing, search, within allowed paths only.
