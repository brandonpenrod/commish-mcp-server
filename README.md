# Commish MCP Server

> Manage sales commissions, comp plans, SPIFFs, and deals through natural language with Claude, Cursor, or any MCP-compatible AI client.

[![npm version](https://img.shields.io/npm/v/commish-mcp-server)](https://www.npmjs.com/package/commish-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-blue)](https://modelcontextprotocol.io)

The **Commish MCP Server** connects [Commish](https://app.getcommish.io) — your sales commission management platform — to AI assistants via the [Model Context Protocol (MCP)](https://modelcontextprotocol.io). Ask your AI to log deals, simulate commissions, build comp plans, and manage SPIFFs entirely through conversation.

---

## ✨ What You Can Do

```
"Show me all pending deals this quarter"
"Create a new comp plan with 10% new business rate and a $500K quarterly quota"
"What would Sarah's commission be if she closes a $75K enterprise deal today?"
"Launch a SPIFF: $500 per new business deal closed in February"
"Approve deal ID abc123 and show me the commission breakdown"
"Show me our top commission earners this month"
```

---

## 🚀 Quick Start

### 1. Get Your API Key

1. Log in to [app.getcommish.io](https://app.getcommish.io)
2. Go to **Admin → Settings → API Keys**
3. Click **Generate New Key**
4. Copy your key — it starts with `cm_live_` or `cm_test_`

### 2. Configure Your AI Client

#### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "commish": {
      "command": "npx",
      "args": ["-y", "commish-mcp-server"],
      "env": {
        "COMMISH_API_KEY": "cm_live_your_key_here"
      }
    }
  }
}
```

#### Claude Code (CLI)

```bash
claude mcp add commish \
  -e COMMISH_API_KEY=cm_live_your_key_here \
  -- npx -y commish-mcp-server
```

Or add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "commish": {
      "command": "npx",
      "args": ["-y", "commish-mcp-server"],
      "env": {
        "COMMISH_API_KEY": "cm_live_your_key_here"
      }
    }
  }
}
```

#### Cursor

Open **Cursor Settings → MCP** and add:

```json
{
  "commish": {
    "command": "npx",
    "args": ["-y", "commish-mcp-server"],
    "env": {
      "COMMISH_API_KEY": "cm_live_your_key_here"
    }
  }
}
```

#### Windsurf / Codeium

```json
{
  "mcpServers": {
    "commish": {
      "command": "npx",
      "args": ["-y", "commish-mcp-server"],
      "env": {
        "COMMISH_API_KEY": "cm_live_your_key_here"
      }
    }
  }
}
```

### 3. Try It Out

Once configured, ask your AI:

- _"What deals are pending approval right now?"_
- _"Create a deal: Acme Corp, $120K ARR, new business, closing today"_
- _"Show me our current comp plans"_
- _"What would my commission be if I close two more $50K deals this quarter?"_
- _"Launch a SPIFF for $1,000 per enterprise deal closed in March"_

---

## 🛠 All 28 Tools

### 📊 Deals (6 tools)

| Tool | Description |
|------|-------------|
| `list_deals` | List and filter deals by status (pending/approved/rejected) or rep |
| `get_deal` | Get full details of a single deal |
| `create_deal` | Log a new deal with ARR, deal type, rep assignment, and notes |
| `update_deal` | Update deal details (ARR, rep, close date, deal type) |
| `approve_deal` | Approve a pending deal and trigger commission calculation |
| `reject_deal` | Reject a pending deal with optional reason |

### 📋 Comp Plans (6 tools)

| Tool | Description |
|------|-------------|
| `list_comp_plans` | List all compensation plans |
| `get_comp_plan` | Get full comp plan details including rates, quota, accelerators |
| `create_comp_plan` | Create a new plan with rates, quota, accelerators, decelerators, and caps |
| `update_comp_plan` | Update any aspect of an existing plan |
| `assign_comp_plan` | Assign a plan to one or more reps with an effective date |
| `clone_comp_plan` | Clone an existing plan with a new name |

### 👥 Users (5 tools)

| Tool | Description |
|------|-------------|
| `list_users` | List all team members with roles and comp plan assignments |
| `get_user` | Get a single user's profile |
| `get_user_commissions` | Get a rep's full commission history |
| `create_user` | Onboard a new rep with role and comp plan |
| `update_user` | Update user info, role, comp plan, or deactivate |

### 💰 Commissions (3 tools)

| Tool | Description |
|------|-------------|
| `list_commissions` | List all commission records across the team |
| `get_commission_summary` | Org-wide summary: totals, by-rep breakdown, by-period breakdown |
| `simulate_commission` | What-if analysis: calculate hypothetical commissions without creating records |

### 🏆 SPIFFs (5 tools)

| Tool | Description |
|------|-------------|
| `list_spiffs` | List all SPIFF programs with status and leaderboards |
| `get_spiff` | Get full SPIFF details and current standings |
| `create_spiff` | Launch a new incentive program (per-deal, flat, tiered, or team pool) |
| `update_spiff` | Update or pause an active SPIFF |
| `delete_spiff` | Delete a draft or paused SPIFF |

### 🔗 Webhooks (3 tools)

| Tool | Description |
|------|-------------|
| `list_webhooks` | List all configured webhook endpoints |
| `create_webhook` | Subscribe an endpoint to deal, commission, or SPIFF events |
| `delete_webhook` | Remove a webhook subscription |

---

## ⚙️ Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `COMMISH_API_KEY` | ✅ Yes | — | Your Commish API key (`cm_live_...` or `cm_test_...`) |
| `COMMISH_API_URL` | ❌ No | `https://app.getcommish.io/api/v1` | Override for self-hosted or staging environments |

---

## 🔄 Rate Limits

The Commish API enforces a limit of **100 requests per minute** per API key. The MCP server handles rate limit responses automatically with exponential backoff — up to 3 retries with delays of 1s, 2s, and 4s.

If you hit the limit, the server will return a friendly message:
> _"Rate limit exceeded (100 requests/min). Please wait."_

---

## 🔒 Security

- API keys are passed via environment variables — never hardcoded
- All requests use HTTPS with Bearer token authentication
- Test keys (`cm_test_`) can be used for development without affecting production data
- Webhook endpoints must use HTTPS

---

## 🏗 Local Development

```bash
# Clone the repo
git clone https://github.com/commish-io/commish-mcp-server
cd commish-mcp-server

# Install dependencies
npm install

# Build
npm run build

# Run locally
COMMISH_API_KEY=cm_test_your_key node dist/index.js

# Watch mode for development
npm run dev
```

---

## 📦 Publishing

```bash
npm run build
npm publish
```

---

## 🤝 Contributing

Pull requests are welcome! Please open an issue first to discuss major changes.

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit your changes: `git commit -m 'feat: add my feature'`
4. Push: `git push origin feat/my-feature`
5. Open a Pull Request

---

## 📄 License

MIT © [Commish](https://app.getcommish.io)

See [LICENSE](./LICENSE) for full text.

---

## 🔗 Links

- [Commish App](https://app.getcommish.io)
- [API Docs](https://docs.getcommish.io/api)
- [MCP Protocol](https://modelcontextprotocol.io)
- [Report Issues](https://github.com/commish-io/commish-mcp-server/issues)
