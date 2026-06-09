import { test } from "node:test";
import assert from "node:assert";
import {
  KeywordClassifier,
  OllamaClassifier,
  getClassifier,
} from "./classifier.js";
import { renderClassification } from "./engine.js";

test("KeywordClassifier flags recruitment as Annex III A4", async () => {
  const hits = await new KeywordClassifier().classify(
    "An AI that screens and ranks job candidates' CVs for recruitment",
  );
  assert.deepEqual(hits.annex, ["A4"]);
  assert.equal(hits.backend, "keyword");
});

test("OllamaClassifier degrades to the keyword screen when no model is reachable", async () => {
  // Point at a dead port so fetch fails fast — verifies the offline fallback.
  const c = new OllamaClassifier("nonexistent-model", "http://127.0.0.1:9", 1000);
  const hits = await c.classify("A social scoring system that rates citizens");
  assert.equal(hits.degraded, true);
  assert.match(hits.backend ?? "", /^local:/);
  assert.deepEqual(hits.prohibited, ["P3"]); // keyword fallback still classifies
});

test("getClassifier honours AI_ACT_CLASSIFIER", () => {
  const fakeServer = {} as never;
  const prev = process.env.AI_ACT_CLASSIFIER;
  try {
    process.env.AI_ACT_CLASSIFIER = "local";
    assert.equal(getClassifier(fakeServer).name, "local");
    process.env.AI_ACT_CLASSIFIER = "host";
    assert.equal(getClassifier(fakeServer).name, "host");
    delete process.env.AI_ACT_CLASSIFIER;
    assert.equal(getClassifier(fakeServer).name, "keyword"); // default
    process.env.AI_ACT_CLASSIFIER = "bogus";
    assert.equal(getClassifier(fakeServer).name, "keyword"); // unknown -> default
  } finally {
    if (prev === undefined) delete process.env.AI_ACT_CLASSIFIER;
    else process.env.AI_ACT_CLASSIFIER = prev;
  }
});

test("renderClassification surfaces rationale and degraded backend", () => {
  const out = renderClassification({
    prohibited: [],
    annex: ["A4"],
    transparency: [],
    rationale: "Screens job applicants, matching the employment category.",
    backend: "local:llama3.2",
    degraded: true,
  });
  assert.match(out, /Model reasoning:/);
  assert.match(out, /local:llama3.2/);
  assert.match(out, /fell back to the keyword screen/);
  assert.match(out, /Annex III\(4\)/); // citation still present
});
