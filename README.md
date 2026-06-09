<div align="center">

# ai-act-mcp

**Lint your AI system for EU AI Act compliance — before the regulators do.**

[![CI](https://img.shields.io/github/actions/workflow/status/a2welt/ai-act-mcp/ci.yml?label=tests&logo=github)](https://github.com/a2welt/ai-act-mcp/actions)
[![npm](https://img.shields.io/npm/v/ai-act-mcp?logo=npm&color=crimson)](https://www.npmjs.com/package/ai-act-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node ≥18](https://img.shields.io/badge/node-%3E%3D18-brightgreen?logo=node.js)](package.json)
[![Ruleset](https://img.shields.io/badge/ruleset-2026.06-orange)](rules/ruleset.json)

A local [Model Context Protocol](https://modelcontextprotocol.io) server that classifies any AI system under the EU AI Act, lists the obligations that apply to *you* with article citations, tells you your actual deadline, and scans your repo for missing compliance artifacts.

**Runs entirely on your machine. Supports fully offline classification via a local small model — your system description never leaves your laptop.**

[Quick start](#install) · [Offline with Ollama](#fully-offline-ollama) · [All four tools](#tools) · [Contributing](CONTRIBUTING.md)

</div>

---

<!-- DEMO GIF — generate with: cd demo && vhs demo.tape -->
<!-- Replace this block with the generated demo.gif once recorded -->
> **Recording the demo:** install [VHS](https://github.com/charmbracelet/vhs), run `npm run build`, then `cd demo && vhs demo.tape`. A `demo.gif` will appear — drop it here.

---

## Why this exists

The EU AI Act is live and has teeth:

- **Feb 2025** — prohibited practices enforceable. €35M or 7% of global turnover.
- **Aug 2025** — GPAI model obligations active.
- **Aug 2026** — transparency requirements apply.
- **Dec 2027** — high-risk (Annex III) obligations due.

Most teams have no idea which tier they're in. This gives you a grounded first pass in seconds, inside the agent you already use — with a citation for every claim so you can verify it.

> ⚠️ **Informational triage, not legal advice.** Confirm classifications with qualified counsel.

---

## Tools

Four tools exposed to any MCP-compatible agent (Claude Code, Cursor, Claude Desktop, Windsurf, Cline, …):

| Tool | What it answers |
|------|----------------|
| `classify_risk` | "Is my system prohibited / high-risk / limited / minimal?" — with Annex III category + article citations |
| `check_obligations` | "Given my tier and role (provider or deployer), what must I do?" — obligation by obligation, with the specific deadline |
| `next_deadlines` | "When does this apply to me?" — the staggered 2025–2028 enforcement timeline |
| `scan_repo` | "Which compliance artifacts am I missing?" — pass / warn / fail checklist against your actual repo |

The rules live in a single versioned, citation-backed file: [`rules/ruleset.json`](rules/ruleset.json). It reflects Regulation (EU) 2024/1689 as amended by the May 2026 Digital Omnibus agreement, and is date-stamped so you always know how current it is.

---

## Install

### Option A — npx (zero install, once published to npm)

```json
{
  "mcpServers": {
    "ai-act": {
      "command": "npx",
      "args": ["-y", "ai-act-mcp"]
    }
  }
}
```

### Option B — clone and build

```bash
git clone https://github.com/a2welt/ai-act-mcp
cd ai-act-mcp
npm install && npm run build
```

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

**Client config locations:**

| Client | File |
|--------|------|
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) · `%APPDATA%\Claude\claude_desktop_config.json` (Windows) |
| Claude Code | `.mcp.json` in project root, or `claude mcp add ai-act node /path/to/dist/index.js` |
| Cursor | `.cursor/mcp.json` |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` |

Restart your agent and ask: *"Classify my hiring tool under the EU AI Act."*

---

## Fully offline — Ollama

Your AI-system description is exactly the kind of proprietary text you should not send to a cloud service. Run classification on a small local model instead — nothing leaves your machine:

```bash
# 1. Pull a model (any small instruct model works)
ollama pull llama3.2

# 2. Test it from your terminal (builds a vivid picture of what the tool does)
node demo/test-local.mjs

# 3. Register with your agent using the local backend
```

```json
{
  "mcpServers": {
    "ai-act": {
      "command": "node",
      "args": ["/absolute/path/to/ai-act-mcp/dist/index.js"],
      "env": {
        "AI_ACT_CLASSIFIER": "local",
        "AI_ACT_SLM_MODEL": "llama3.2"
      }
    }
  }
}
```

The model only ever picks among the ruleset's **enumerated, cited categories** — it never invents law. This is what makes a small model reliable: you've constrained its job to classification-against-known-rules, not open-ended legal reasoning. If the model is unreachable for any reason, the server falls back to the deterministic keyword screen automatically.

### Backend options

| `AI_ACT_CLASSIFIER` | Where the description goes | Quality | Notes |
|---------------------|---------------------------|---------|-------|
| `keyword` *(default)* | Nowhere — pure local logic | Good | Instant, zero dependencies, deterministic |
| `local` | Stays on your machine (Ollama) | Better | Privacy-first; requires Ollama running |
| `host` | Your agent's model via MCP sampling | Best | Requires client sampling support |

**Extra env vars for `local` mode:**

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_ACT_SLM_MODEL` | `llama3.2` | Any model name Ollama has pulled |
| `AI_ACT_OLLAMA_URL` | `http://localhost:11434` | Ollama server URL |
| `AI_ACT_SLM_TIMEOUT_MS` | `30000` | Timeout before falling back to keyword |

---

## Example

> **Prompt:** I'm building a tool that screens job applicants' CVs and ranks them. Classify it under the EU AI Act.

```
# AI Act risk classification

**Likely tier: High-risk** (Art. 6 + Annex I / Annex III)

Permitted but subject to the heaviest obligations (risk management, data
governance, logging, human oversight, conformity assessment, registration).

## ⚠️ Possible high-risk categories (Annex III)
- **Employment**: recruitment, screening, filtering applications, evaluating
  candidates, or decisions on promotion/termination/task allocation — Annex III(4)

> Check the Art. 6(3) exemption: system does NOT pose a significant risk of harm
  to health, safety or fundamental rights…

## What to do next
Run `check_obligations` with tier "high" and your role (provider or deployer)
for the full obligation list, and `next_deadlines` for your timeline.

---
Ruleset 2026.06 (current as of 2026-06-09). Informational triage only.
Not legal advice. Verify against the official text and consult qualified counsel.
```

---

## Run the tests

```bash
npm test
```

15 tests covering classification, obligations, deadlines, repo scanning, all three classifier backends, and the offline fallback path.

---

## Roadmap

- [x] Four core tools — classify, obligations, deadlines, repo scan
- [x] Versioned, citation-backed ruleset (`rules/ruleset.json`)
- [x] Pass / warn / fail repo artifact checklist
- [x] Per-tier deadlines in obligation output
- [x] **Pluggable classifier backends — keyword (default), local SLM (fully offline via Ollama), host-model sampling**
- [ ] `npm publish` — zero-install `npx` setup
- [ ] FRIA (fundamental rights impact assessment) scaffold generator
- [ ] GPAI Code of Practice checklist
- [ ] Ruleset auto-update workflow as Omnibus amendments are adopted

---

## Contributing

Corrections to the ruleset — with article citations — are the most valuable contributions. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

**Quick ways to help:**
- 🔍 Found a wrong classification? [Open a ruleset correction issue](https://github.com/a2welt/ai-act-mcp/issues/new?template=ruleset-correction.yml)
- 🐛 Something broken? [Open a bug report](https://github.com/a2welt/ai-act-mcp/issues/new?template=bug-report.yml)
- ⭐ Find it useful? Star the repo — it helps compliance teams discover it

---

## License

MIT — see [LICENSE](LICENSE)
