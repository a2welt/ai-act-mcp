# ai-act-mcp

**Lint your AI system for EU AI Act compliance — before the regulators do.**

A local [MCP](https://modelcontextprotocol.io) server that classifies any AI system under the EU AI Act, lists the obligations that apply to *you*, tells you your actual deadline, and scans your repo for the documentation the Act expects.

Runs entirely on your machine. Your code and model details never leave your laptop — which matters, because you shouldn't be pasting proprietary system descriptions into a cloud compliance SaaS.

> ⚠️ **Informational triage, not legal advice.** Every output cites the relevant article so you can verify it. Confirm classifications with qualified counsel.

---

## Why

The EU AI Act is live and has teeth. Prohibited practices have been enforceable since Feb 2025, GPAI obligations since Aug 2025, and penalties reach **€35M or 7% of global turnover**. Most teams have no idea which tier they fall in or what they actually have to do. This gives you a grounded first pass in seconds, inside the agent you already use.

## What it does

Four tools, exposed to any MCP-compatible agent (Claude Code, Cursor, Claude Desktop, …):

| Tool | What it answers |
|------|-----------------|
| `classify_risk` | "Is my system prohibited / high-risk / limited / minimal?" — with Annex III category + citations |
| `check_obligations` | "Given my tier and whether I'm a provider or deployer, what must I do?" — article by article |
| `next_deadlines` | "When does this apply to me?" — the staggered 2025–2028 timeline |
| `scan_repo` | "Which compliance artifacts (model card, data governance, logging, oversight, transparency notices) am I missing?" |

The rules live in a single versioned, citation-backed file: [`rules/ruleset.json`](rules/ruleset.json). It reflects Regulation (EU) 2024/1689 as amended by the May 2026 Digital Omnibus agreement, and is date-stamped so you always know how current it is.

## Install

```bash
npm install
npm run build
```

Then register it with your agent. **Claude Desktop / Claude Code** (`claude_desktop_config.json` or `.mcp.json`):

```json
{
  "mcpServers": {
    "ai-act": {
      "command": "node",
      "args": ["/absolute/path/to/ai-act-mcp/dist/index.js"]
    }
  }
}
```

**Cursor** — add the same block to `.cursor/mcp.json`.

Restart your agent and ask it: *"Classify my hiring tool under the EU AI Act."*

## Example

> **You:** I'm building a tool that screens job applicants' CVs and ranks them. Classify it.
>
> **Agent (via `classify_risk`):** Likely tier: **High-risk** — Employment (Annex III(4)). Check the Art. 6(3) exemption… Run `check_obligations` with tier "high"…

## Run the tests

```bash
npm test
```

## Roadmap

- [ ] Optional local-SLM classification (fully offline semantic tiering, no host model needed)
- [ ] FRIA (fundamental rights impact assessment) scaffold generator
- [ ] GPAI Code of Practice checklist
- [ ] Ruleset auto-update workflow as Omnibus amendments are adopted

Contributions welcome — especially corrections to the ruleset with article citations.

## License

MIT
