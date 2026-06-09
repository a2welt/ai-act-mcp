#!/usr/bin/env node
/**
 * Test the local Ollama backend against four representative AI systems.
 * Run: node demo/test-local.mjs
 *
 * Requires Ollama running on localhost with at least one model pulled.
 * Set AI_ACT_SLM_MODEL to override the default (llama3.2).
 */

import { OllamaClassifier, KeywordClassifier } from "../dist/classifier.js";
import { renderClassification } from "../dist/engine.js";

const RESET  = "\x1b[0m";
const BOLD   = "\x1b[1m";
const DIM    = "\x1b[2m";
const GREEN  = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED    = "\x1b[31m";
const CYAN   = "\x1b[36m";

const examples = [
  {
    label: "Recruitment CV screener",
    description: "An AI that screens and ranks job applicants' CVs for recruitment and promotion decisions.",
    expected: "High-risk",
  },
  {
    label: "Social scoring system",
    description: "A government system that scores citizens for trustworthiness based on their behaviour and assigns privileges accordingly.",
    expected: "Prohibited",
  },
  {
    label: "Customer support chatbot",
    description: "A conversational AI assistant that handles customer support queries and interacts directly with users.",
    expected: "Limited",
  },
  {
    label: "Recipe recommender",
    description: "A tool that suggests dinner recipes based on pantry items and dietary preferences.",
    expected: "Minimal",
  },
];

const model = process.env.AI_ACT_SLM_MODEL || "llama3.2";
const ollamaUrl = process.env.AI_ACT_OLLAMA_URL || "http://localhost:11434";

console.log(`\n${BOLD}ai-act-mcp — Ollama local backend test${RESET}`);
console.log(`${DIM}Model: ${model}  |  URL: ${ollamaUrl}${RESET}`);

// Probe Ollama before running tests
try {
  const probe = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
  if (!probe.ok) throw new Error(`HTTP ${probe.status}`);
  const data = await probe.json();
  const models = (data.models ?? []).map((m) => m.name);
  if (models.length === 0) {
    console.error(`\n${YELLOW}⚠  Ollama is running but has no models pulled.${RESET}`);
    console.error(`   Run: ollama pull ${model}\n`);
    process.exit(1);
  }
  const exact = models.find((m) => m.startsWith(model));
  if (!exact) {
    console.error(`\n${YELLOW}⚠  Model "${model}" not found. Available: ${models.join(", ")}${RESET}`);
    console.error(`   Run: ollama pull ${model}  — or set AI_ACT_SLM_MODEL to one of the above.\n`);
    process.exit(1);
  }
  console.log(`${GREEN}✓ Ollama OK — using ${exact}${RESET}\n`);
} catch (err) {
  console.error(`\n${RED}✖ Cannot reach Ollama at ${ollamaUrl}${RESET}`);
  console.error(`  Make sure Ollama is running: ${BOLD}ollama serve${RESET}`);
  console.error(`  Error: ${err.message}\n`);
  process.exit(1);
}

const local = new OllamaClassifier(model, ollamaUrl);
const keyword = new KeywordClassifier();

let passed = 0;
let failed = 0;

for (const { label, description, expected } of examples) {
  console.log(`${"─".repeat(72)}`);
  console.log(`${BOLD}${CYAN}${label}${RESET}  ${DIM}(expected: ${expected})${RESET}`);
  console.log(`${DIM}"${description}"${RESET}\n`);

  const [localHits, kwHits] = await Promise.all([
    local.classify(description),
    keyword.classify(description),
  ]);

  // Render the local result
  const rendered = renderClassification(localHits);
  const tierLine = rendered.split("\n").find((l) => l.startsWith("**Likely tier:"));
  console.log(tierLine ?? "(no tier line found)");

  if (localHits.rationale) {
    console.log(`${DIM}Reasoning: ${localHits.rationale}${RESET}`);
  }

  if (localHits.degraded) {
    console.log(`${YELLOW}⚠  Degraded to keyword fallback${RESET}`);
  }

  // Compare local vs keyword
  const localTier = tierLine?.includes(expected) ?? false;
  const kwTier = renderClassification(kwHits).includes(expected);
  const agree = JSON.stringify({
    p: localHits.prohibited.sort(),
    a: localHits.annex.sort(),
    t: localHits.transparency.sort(),
  }) === JSON.stringify({
    p: kwHits.prohibited.sort(),
    a: kwHits.annex.sort(),
    t: kwHits.transparency.sort(),
  });

  if (localTier) { passed++; console.log(`${GREEN}✓ Tier correct${RESET}`); }
  else { failed++; console.log(`${RED}✖ Tier mismatch (expected ${expected})${RESET}`); }

  console.log(`  Local backend:   [${localHits.prohibited.join(",")||"—"}] [${localHits.annex.join(",")||"—"}] [${localHits.transparency.join(",")||"—"}]`);
  console.log(`  Keyword backend: [${kwHits.prohibited.join(",")||"—"}] [${kwHits.annex.join(",")||"—"}] [${kwHits.transparency.join(",")||"—"}]`);
  console.log(agree ? `${DIM}  Backends agree${RESET}` : `${YELLOW}  Backends disagree — review above${RESET}`);
  console.log();
}

console.log(`${"─".repeat(72)}`);
const total = examples.length;
const colour = failed === 0 ? GREEN : YELLOW;
console.log(`${colour}${BOLD}Results: ${passed}/${total} correct${RESET}`);

if (failed > 0) {
  console.log(`\n${DIM}Discrepancies between the local model and the keyword screen are`);
  console.log(`expected for nuanced cases. Review the specific article citations.${RESET}`);
}

console.log(`\n${DIM}Run the full output for any example:${RESET}`);
console.log(`  ${BOLD}AI_ACT_CLASSIFIER=local node -e "
  import('./dist/classifier.js').then(({OllamaClassifier})=>
    new OllamaClassifier().classify('your description here').then(
      h=>import('./dist/engine.js').then(({renderClassification})=>
        console.log(renderClassification(h))
      )
    )
  )"${RESET}\n`);
