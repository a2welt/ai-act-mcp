import { test } from "node:test";
import assert from "node:assert";
import { classifyRisk, checkObligations, nextDeadlines, scanRepo } from "./engine.js";

test("recruitment screener -> high risk Annex III A4", () => {
  const out = classifyRisk("An AI that screens and ranks job candidates' CVs for recruitment");
  assert.match(out, /High-risk/);
  assert.match(out, /Employment/);
  assert.match(out, /Annex III\(4\)/);
});

test("social scoring -> prohibited", () => {
  const out = classifyRisk("A social scoring system that rates citizens for trustworthiness");
  assert.match(out, /Prohibited/);
  assert.match(out, /Art\. 5/);
});

test("plain chatbot -> limited risk transparency", () => {
  const out = classifyRisk("A customer support chatbot that interacts with users");
  assert.match(out, /Limited risk|Transparency/);
  assert.match(out, /Art\. 50/);
});

test("recipe generator -> minimal", () => {
  const out = classifyRisk("A tool that suggests dinner recipes from pantry items");
  assert.match(out, /Minimal risk/);
});

test("high-risk provider obligations include risk management + logging", () => {
  const out = checkObligations("high", "provider");
  assert.match(out, /Art\. 9/);
  assert.match(out, /Art\. 12/);
});

test("gpai flag adds Art. 53 obligations", () => {
  const out = checkObligations("limited", "deployer", true);
  assert.match(out, /Art\. 53/);
});

test("deadlines mention deferred Annex III date", () => {
  assert.match(nextDeadlines("high"), /2027-12-02/);
});

test("scan FAILs a missing required artifact (model card)", () => {
  const out = scanRepo(["/repo/src/index.ts", "/repo/README.md"]);
  assert.match(out, /FAIL.*Model card/);
});

test("scan passes when model card present", () => {
  const out = scanRepo(["/repo/MODEL_CARD.md", "/repo/src/index.ts"]);
  assert.match(out, /PASS.*Model card/);
});

test("scan WARNs (not fails) a missing recommended artifact", () => {
  const out = scanRepo(["/repo/src/index.ts"]);
  assert.match(out, /WARN.*Conformity/);
  assert.match(out, /Summary:.*pass.*warn.*fail/);
});

test("check_obligations states the specific deadline per tier", () => {
  assert.match(checkObligations("high", "provider"), /Deadline.*2027-12-02/s);
  assert.match(checkObligations("limited", "deployer"), /Deadline.*2026-08-02/s);
  assert.match(checkObligations("prohibited", "provider"), /Deadline.*2025-02-02/s);
});
