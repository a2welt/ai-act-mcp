#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  ruleset,
  classifyRisk,
  checkObligations,
  nextDeadlines,
  scanRepo,
} from "./engine.js";

const server = new McpServer({
  name: "ai-act-mcp",
  version: ruleset.version,
});

function text(s: string) {
  return { content: [{ type: "text" as const, text: s }] };
}

server.tool(
  "classify_risk",
  "Classify an AI system under the EU AI Act risk tiers (prohibited / high / limited / minimal) from a plain-English description of what it does and who it affects. Returns the likely tier with cited articles and Annex III categories. Informational triage, not legal advice.",
  { description: z.string().describe("What the AI system does, its purpose, and who it affects.") },
  async ({ description }) => text(classifyRisk(description))
);

server.tool(
  "check_obligations",
  "List the concrete EU AI Act obligations for a given risk tier and role (provider or deployer), with article citations. Set is_gpai true if you also provide a general-purpose AI model.",
  {
    tier: z.enum(["prohibited", "high", "limited", "minimal"]),
    role: z.enum(["provider", "deployer"]).default("provider"),
    is_gpai: z.boolean().default(false),
  },
  async ({ tier, role, is_gpai }) => text(checkObligations(tier, role, is_gpai))
);

server.tool(
  "next_deadlines",
  "Return the EU AI Act compliance timeline, optionally highlighting the date relevant to a given risk tier.",
  { tier: z.enum(["prohibited", "high", "limited", "minimal"]).optional() },
  async ({ tier }) => text(nextDeadlines(tier))
);

server.tool(
  "scan_repo",
  "Scan a local repository path for the documentation artifacts the AI Act expects (model card, data governance, risk management, logging, human oversight, transparency notices) and report pass/missing per artifact.",
  { path: z.string().describe("Absolute path to the repository root to scan.") },
  async ({ path }) => {
    const files: string[] = [];
    const walk = (dir: string, depth = 0) => {
      if (depth > 4) return;
      for (const entry of readdirSync(dir)) {
        if (entry.startsWith(".") || entry === "node_modules") continue;
        const full = join(dir, entry);
        try {
          if (statSync(full).isDirectory()) walk(full, depth + 1);
          else files.push(full);
        } catch { /* skip unreadable */ }
      }
    };
    try {
      walk(path);
    } catch (e) {
      return text(`Could not read path "${path}": ${(e as Error).message}`);
    }
    return text(scanRepo(files));
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`ai-act-mcp ${ruleset.version} running on stdio`);
