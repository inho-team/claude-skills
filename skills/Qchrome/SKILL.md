---
name: Qchrome
description: "Claude-in-Chrome MCP setup and browser automation guide. Use when setting up Chrome browser tools, configuring Claude-in-Chrome extension, or troubleshooting browser automation. Invoke for 'chrome setup', 'browser setup', 'claude chrome', 'chrome mcp', 'browser automation setup'. Distinct from Qagent-browser (which uses agent-browser CLI) — this skill sets up Chrome extension-based browser control via MCP."
keywords: chrome, browser, mcp, extension, automation, claude-in-chrome, setup
---

# Qchrome — Claude-in-Chrome MCP Setup & Usage

## Role Boundary (Absolute Rule)

This skill is a **setup and usage guide only**. It does NOT execute browser operations.

| Request | Action |
|---------|--------|
| "chrome 설정해줘", "browser mcp 연결" | **This skill** — guide setup |
| "웹페이지 열어줘", "스크린샷 찍어줘" | **NOT this skill** — use `mcp__claude-in-chrome__*` tools directly |

### Pre-check: MCP Connection Status

```bash
claude mcp list 2>/dev/null | grep -i chrome
```

- **Connected**: Do NOT re-run setup. Tell user MCP is connected, use tools directly.
- **Not connected + browser request**: "Claude-in-Chrome MCP가 연결되어 있지 않습니다. 먼저 설정이 필요합니다." → proceed with setup.
- **Not connected + setup request**: proceed with setup.

---

## What is Claude-in-Chrome?

Chrome extension that gives Claude Code direct browser control — navigate, click, type, read pages, take screenshots, and record GIFs.

| Feature | Detail |
|---------|--------|
| Type | Chrome Extension + MCP Server |
| Control | Tab management, navigation, form input, JS execution |
| Output | Page text, screenshots, console logs, network requests |
| Recording | GIF capture of multi-step interactions |

---

## Setup

### Step 1: Install Chrome Extension

1. Install the Claude-in-Chrome extension from the Chrome Web Store
2. Pin the extension icon in Chrome toolbar
3. Ensure the extension is enabled and active

### Step 2: Add MCP to Claude Code

```bash
claude mcp add claude-in-chrome -- npx @anthropic/claude-in-chrome-mcp
```

Or edit `~/.claude.json`:
```json
{
  "mcpServers": {
    "claude-in-chrome": {
      "command": "npx",
      "args": ["@anthropic/claude-in-chrome-mcp"]
    }
  }
}
```

### Step 3: Verify Connection

```bash
claude mcp list | grep chrome
```

Restart Claude Code session to activate MCP tools.

### Step 4: Test

In a new Claude Code session, ask Claude to open a tab or read a page to verify the connection works.

---

## Available MCP Tools

### Tab Management
| Tool | Description |
|------|-------------|
| `tabs_context_mcp` | Get info about current browser tabs |
| `tabs_create_mcp` | Create a new tab |

### Navigation & Interaction
| Tool | Description |
|------|-------------|
| `navigate` | Navigate to a URL |
| `computer` | Mouse/keyboard control |
| `find` | Find elements on page |
| `form_input` | Fill form fields |
| `shortcuts_execute` | Execute keyboard shortcuts |
| `shortcuts_list` | List available shortcuts |

### Page Reading
| Tool | Description |
|------|-------------|
| `read_page` | Read page content (HTML/accessibility tree) |
| `get_page_text` | Get plain text from page |
| `read_console_messages` | Read browser console output |
| `read_network_requests` | Monitor network activity |

### Media & Recording
| Tool | Description |
|------|-------------|
| `upload_image` | Upload an image |
| `gif_creator` | Record browser interactions as GIF |
| `resize_window` | Resize browser window |

### Utility
| Tool | Description |
|------|-------------|
| `javascript_tool` | Execute JavaScript in page context |
| `switch_browser` | Switch between browser instances |
| `update_plan` | Update automation plan |

---

## Usage Patterns

### Session Startup
Always call `tabs_context_mcp` first to get current tab state before creating new tabs.

### Page Interaction Flow
```
tabs_context_mcp → navigate (or tabs_create_mcp) → read_page → form_input / computer → verify
```

### GIF Recording
```
gif_creator (start) → capture frames before action → perform action → capture frames after → gif_creator (stop)
```

### Console Debugging
Use `read_console_messages` with `pattern` parameter for filtered output:
```
pattern: "[MyApp]"  → application-specific logs only
```

---

## Important Notes

- **No alerts**: Avoid triggering JavaScript alerts/confirms/prompts — they block the extension
- **Tab IDs**: Never reuse tab IDs from previous sessions — always call `tabs_context_mcp` for fresh IDs
- **Stuck?**: After 2-3 failed attempts, stop and ask the user for guidance

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Extension not responding | Check Chrome extension is enabled and active |
| Tab ID invalid | Call `tabs_context_mcp` to get fresh tab IDs |
| Tools not visible | Restart Claude Code session |
| Dialog blocking | User must manually dismiss alert/confirm dialogs |
| Page not loading | Check URL, network connectivity |

---

## Will
- Guide Claude-in-Chrome extension installation
- Configure MCP server connection
- Explain available tools and usage patterns
- Troubleshoot connection issues

## Will Not
- Execute browser operations directly
- Store credentials or passwords
- Interact with pages without user awareness
