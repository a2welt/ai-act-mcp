import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ruleset, keywordHits, type ClassificationHits } from "./engine.js";

/**
 * A classifier decides which EU AI Act rule IDs apply to a plain-English
 * system description. Three interchangeable backends implement this:
 *
 *   - KeywordClassifier   deterministic, offline, zero-dependency (default)
 *   - OllamaClassifier    a small LLM on localhost — nothing leaves the machine
 *   - SamplingClassifier  the host agent's model, via MCP sampling
 *
 * Every backend returns the same {@link ClassificationHits} shape, and every
 * LLM backend degrades to the keyword screen on any failure. Article citations
 * are attached later by the renderer, so legal accuracy never depends on the
 * model — the model only narrows the choice among enumerated, cited categories.
 */
export interface Classifier {
  readonly name: string;
  classify(description: string): Promise<ClassificationHits>;
}

// --- Shared LLM scaffolding ---------------------------------------------------

/** The enumerated, cited categories the model must choose among. Constraining
 *  the model to known IDs is what lets a *small* model stay accurate. */
function catalog(): string {
  const lines: string[] = [];
  lines.push("PROHIBITED practices (Art. 5):");
  for (const p of ruleset.prohibited_practices) lines.push(`  ${p.id}: ${p.test}`);
  lines.push("HIGH-RISK categories (Annex III):");
  for (const a of ruleset.annex_iii_categories) lines.push(`  ${a.id}: ${a.domain} — ${a.test}`);
  lines.push("LIMITED-RISK transparency triggers (Art. 50):");
  for (const t of ruleset.transparency_triggers) lines.push(`  ${t.id}: ${t.test}`);
  return lines.join("\n");
}

const SYSTEM_PROMPT =
  "You are a EU AI Act classification assistant. Given a description of an AI system, " +
  "identify which of the enumerated category IDs apply. Use ONLY IDs from the catalog. " +
  "IMPORTANT RULES: " +
  "(1) A false positive on a prohibited practice is a serious legal error — only flag P-IDs when the description EXPLICITLY describes that practice, not merely a superficially similar one. " +
  "(2) A code tool, recommendation engine, or decision-support tool is NOT prohibited unless it literally matches the prohibition text. " +
  "(3) If no category clearly applies, return empty arrays — minimal risk is a valid and common result. " +
  "(4) Never include an ID just because the description mentions a related domain. The system must actually perform the categorised function. " +
  'Respond with ONLY a JSON object: ' +
  '{"prohibited":["P?"],"annex":["A?"],"transparency":["T?"],"rationale":"one short sentence explaining the key classification decision"}.';

function userPrompt(description: string): string {
  return `Catalog:\n${catalog()}\n\nSystem description:\n"""${description.slice(0, 4000)}"""\n\nReturn the matching IDs as JSON.`;
}

/** Pull the first JSON object out of a model response (handles code fences,
 *  preamble, etc.) and parse it. Throws if no JSON is present. */
function extractJson(textBody: string): unknown {
  const match = textBody.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : textBody);
}

/** Coerce a raw model response into validated hits — only IDs that exist in
 *  the ruleset survive, so the model can never invent a category. */
function validate(raw: unknown, backend: string): ClassificationHits {
  const r = (raw ?? {}) as Record<string, unknown>;
  const known = (ids: ReadonlySet<string>, value: unknown): string[] =>
    Array.isArray(value) ? (value as unknown[]).filter((x): x is string => typeof x === "string" && ids.has(x)) : [];

  const P = new Set(ruleset.prohibited_practices.map((p) => p.id));
  const A = new Set(ruleset.annex_iii_categories.map((a) => a.id));
  const T = new Set(ruleset.transparency_triggers.map((t) => t.id));

  return {
    prohibited: known(P, r.prohibited),
    annex: known(A, r.annex),
    transparency: known(T, r.transparency),
    rationale: typeof r.rationale === "string" ? r.rationale.trim() : undefined,
    backend,
  };
}

function degrade(description: string, backend: string, err: unknown): ClassificationHits {
  return {
    ...keywordHits(description),
    backend,
    degraded: true,
    rationale: `LLM backend unavailable (${(err as Error).message}); used the deterministic keyword screen instead.`,
  };
}

// --- Backends -----------------------------------------------------------------

/** Deterministic keyword screen. Always available, always offline. */
export class KeywordClassifier implements Classifier {
  readonly name = "keyword";
  async classify(description: string): Promise<ClassificationHits> {
    return keywordHits(description);
  }
}

/** Local small-LM via the Ollama HTTP API. Fully offline — the system
 *  description never leaves the machine. This is the privacy-first path. */
export class OllamaClassifier implements Classifier {
  readonly name = "local";
  constructor(
    private readonly model = process.env.AI_ACT_SLM_MODEL || "llama3.2",
    private readonly url = (process.env.AI_ACT_OLLAMA_URL || "http://localhost:11434").replace(/\/$/, ""),
    private readonly timeoutMs = Number(process.env.AI_ACT_SLM_TIMEOUT_MS || 30000),
  ) {}

  async classify(description: string): Promise<ClassificationHits> {
    const backend = `local:${this.model}`;
    try {
      const res = await fetch(`${this.url}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          stream: false,
          format: "json",
          options: { temperature: 0 },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt(description) },
          ],
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
      const data = (await res.json()) as { message?: { content?: string } };
      const content = data.message?.content ?? "";
      return validate(extractJson(content), backend);
    } catch (err) {
      return degrade(description, backend, err);
    }
  }
}

/** The host agent's own model, via MCP sampling (createMessage). Best quality
 *  when the client supports sampling; degrades to keyword when it doesn't. */
export class SamplingClassifier implements Classifier {
  readonly name = "host";
  constructor(private readonly server: Server) {}

  async classify(description: string): Promise<ClassificationHits> {
    try {
      const result = await this.server.createMessage({
        systemPrompt: SYSTEM_PROMPT,
        maxTokens: 500,
        temperature: 0,
        messages: [{ role: "user", content: { type: "text", text: userPrompt(description) } }],
      });
      const content = result.content;
      const body = content.type === "text" ? content.text : "";
      return validate(extractJson(body), "host");
    } catch (err) {
      return degrade(description, "host", err);
    }
  }
}

/**
 * Select the backend from the AI_ACT_CLASSIFIER env var:
 *   keyword (default) | local | host
 * Unknown values fall back to keyword so the server always starts.
 */
export function getClassifier(server: Server): Classifier {
  const mode = (process.env.AI_ACT_CLASSIFIER || "keyword").toLowerCase();
  switch (mode) {
    case "local":
    case "slm":
    case "ollama":
      return new OllamaClassifier();
    case "host":
    case "sampling":
      return new SamplingClassifier(server);
    case "keyword":
    default:
      return new KeywordClassifier();
  }
}
