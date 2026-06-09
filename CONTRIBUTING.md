# Contributing to ai-act-mcp

Thanks for helping make this more accurate and useful. The most valuable contributions are **ruleset corrections** — the Act is moving, and keeping the citations right is the entire reputation of this tool.

## Table of contents

- [Ruleset corrections (highest impact)](#ruleset-corrections-highest-impact)
- [Adding a new rule](#adding-a-new-rule)
- [Code contributions](#code-contributions)
- [Running the tests](#running-the-tests)
- [PR guidelines](#pr-guidelines)

---

## Ruleset corrections (highest impact)

The rules live in [`rules/ruleset.json`](rules/ruleset.json). This is a single versioned JSON file keyed to articles and Annex categories, with citations back to the official text.

**To report an inaccuracy:** open a [ruleset correction issue](https://github.com/a2welt/ai-act-mcp/issues/new?template=ruleset-correction.yml). Include the rule ID, what's wrong, and the article that contradicts it. You don't need to write any code.

**To fix it yourself:**

1. Open `rules/ruleset.json`
2. Find the relevant entry by ID (e.g. `H3`, `P1`, `A4`, `T2`)
3. Edit the `test`, `obligation`, or `cite` field
4. Update `current_as_of` at the top of the file to today's date
5. Open a PR with a link to the official text (EUR-Lex preferred)

The citation format is `Art. X`, `Art. X(Y)`, `Annex III(N)`, or `Recital N`. Always link to the source — the EUR-Lex consolidated text is at [eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32024R1689](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32024R1689).

> **Important:** every claim in this tool must cite a specific article or annex. PRs that add rules without citations will not be merged.

---

## Adding a new rule

Rules follow the structure in `rules/ruleset.json`. Here's what each section expects:

### Prohibited practice (`prohibited_practices`)

```json
{
  "id": "P9",
  "test": "plain-English description of what triggers this prohibition",
  "cite": "Art. 5(1)(x)"
}
```

You also need to add matching keywords to `PROHIBITED_KEYWORDS` in [`src/engine.ts`](src/engine.ts) so the keyword classifier can catch it:

```ts
const PROHIBITED_KEYWORDS: Record<string, string[]> = {
  // existing entries …
  P9: ["keyword1", "keyword2"],
};
```

### Annex III high-risk category (`annex_iii_categories`)

```json
{
  "id": "A9",
  "domain": "Short domain name",
  "test": "plain-English description of what qualifies as high-risk",
  "cite": "Annex III(N)"
}
```

Add corresponding keywords to `ANNEX_KEYWORDS` in `src/engine.ts`.

### High-risk obligation (`high_risk_obligations.provider` or `.deployer`)

```json
{
  "id": "H11",
  "obligation": "What the provider/deployer must do.",
  "cite": "Art. X"
}
```

### Transparency trigger (`transparency_triggers`)

```json
{
  "id": "T5",
  "test": "what triggers this obligation",
  "obligation": "What must be disclosed.",
  "cite": "Art. 50(X)"
}
```

Add corresponding keywords to `TRANSPARENCY_KEYWORDS` in `src/engine.ts`.

### Repo artifact (`repo_artifacts`)

```json
{
  "id": "R9",
  "artifact": "Human-readable artifact name",
  "severity": "required",
  "looks_for": ["filename-pattern", "another-pattern"],
  "maps_to": ["H3"]
}
```

`severity` is `"required"` (core Art. 9–15 artifacts → FAIL if absent) or `"recommended"` (conditionally required → WARN if absent).

---

## Code contributions

**Before opening a PR, open an issue first** for any non-trivial change. This avoids wasted effort if there's a design disagreement.

Good code contributions:

- New classifier backend (e.g. native Anthropic SDK, OpenAI-compatible endpoints)
- Performance improvement to the keyword engine
- Better degradation / timeout handling in existing backends
- GitHub Actions improvements

Out of scope for now:

- Adding a database or persistent storage
- A web UI — this is intentionally an MCP server
- GDPR / non-EU-AI-Act regulations (separate project scope)

---

## Running the tests

```bash
npm install
npm run build
npm test
```

All 15 tests must pass before a PR can be merged. Add tests for any new behaviour — especially any new rule ID or backend behaviour.

If you add a new rule that the LLM backends must understand, add a test in [`src/engine.test.ts`](src/engine.test.ts) that exercises the keyword path (so CI can verify it without a live model):

```ts
test("my new rule -> correct tier", () => {
  const out = classifyRisk("description that clearly triggers my new rule");
  assert.match(out, /ExpectedTier/);
  assert.match(out, /Art\. X/); // the citation must appear
});
```

---

## PR guidelines

- **One concern per PR.** Ruleset fix + code change = two PRs.
- **Cite everything.** If it's about law, every changed field needs an article reference.
- **Don't change `current_as_of`** unless you're also changing at least one rule value that reflects new text.
- **Keep the disclaimer.** Every output must include the "informational triage only, not legal advice" footer. Do not remove or weaken it.
- **Tests required.** New behaviour without a test will not be merged.
- **Squash your commits** before marking a PR ready for review.

---

## Code of conduct

Be kind. Disagreements about legal text are expected — cite sources, not authority. Everyone here is trying to make compliance more accessible.
