import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface Ruleset {
  version: string;
  current_as_of: string;
  disclaimer: string;
  source_note: string;
  tiers: Record<string, any>;
  prohibited_practices: Rule[];
  annex_iii_categories: AnnexRule[];
  annex_iii_exemption: { test: string; cite: string; effect: string };
  transparency_triggers: TransparencyRule[];
  gpai: any;
  high_risk_obligations: { provider: Obligation[]; deployer: Obligation[] };
  penalties: Record<string, string>;
  repo_artifacts: RepoArtifact[];
}

interface Rule { id: string; test: string; cite: string; }
interface AnnexRule extends Rule { domain: string; }
interface TransparencyRule { id: string; test: string; obligation: string; cite: string; }
interface Obligation { id: string; obligation: string; cite: string; }
interface RepoArtifact { id: string; artifact: string; severity: "required" | "recommended"; looks_for: string[]; maps_to: string[]; }

export const ruleset: Ruleset = JSON.parse(
  readFileSync(join(__dirname, "..", "rules", "ruleset.json"), "utf-8")
);

const FOOTER = `\n\n---\nRuleset ${ruleset.version} (current as of ${ruleset.current_as_of}). ${ruleset.disclaimer}`;

/** Lightweight keyword matcher. The host agent's model does the real semantic
 *  classification; this gives a deterministic fallback + structured grounding. */
function matches(text: string, keywords: string[]): boolean {
  const t = text.toLowerCase();
  return keywords.some((k) => t.includes(k.toLowerCase()));
}

const PROHIBITED_KEYWORDS: Record<string, string[]> = {
  P1: ["subliminal", "manipulat", "deceptive"],
  P2: ["exploit vulnerab", "elderly", "children", "disabilit"],
  P3: ["social scor", "social credit"],
  P4: ["predictive polic", "predict crime"],
  P5: ["scrape facial", "facial image", "facial recognition database"],
  P6: ["emotion", "workplace", "classroom", "education"],
  P7: ["biometric categor", "infer race", "infer political", "sexual orientation"],
  P8: ["real-time", "remote biometric", "public space", "law enforcement"],
};

const ANNEX_KEYWORDS: Record<string, string[]> = {
  A1: ["biometric", "facial", "fingerprint", "emotion recognition"],
  A2: ["critical infrastructure", "power grid", "water", "traffic"],
  A3: ["education", "exam", "grading", "admission", "student"],
  A4: ["recruit", "hiring", "cv", "resume", "candidate", "employee", "promotion"],
  A5: ["credit", "loan", "insurance", "benefit", "welfare", "emergency dispatch"],
  A6: ["law enforcement", "police", "evidence", "suspect"],
  A7: ["migration", "border", "asylum", "visa", "immigration"],
  A8: ["judicial", "court", "election", "referendum"],
};

const TRANSPARENCY_KEYWORDS: Record<string, string[]> = {
  T1: ["chatbot", "conversational", "assistant", "interact"],
  T2: ["generat", "synthetic", "create image", "create text", "create audio"],
  T3: ["emotion", "biometric categor"],
  T4: ["deepfake", "face swap", "voice clone", "manipulat"],
};

export function classifyRisk(description: string) {
  const hits = {
    prohibited: ruleset.prohibited_practices.filter((p) =>
      matches(description, PROHIBITED_KEYWORDS[p.id] ?? [])
    ),
    annex: ruleset.annex_iii_categories.filter((a) =>
      matches(description, ANNEX_KEYWORDS[a.id] ?? [])
    ),
    transparency: ruleset.transparency_triggers.filter((t) =>
      matches(description, TRANSPARENCY_KEYWORDS[t.id] ?? [])
    ),
  };

  let tier: "prohibited" | "high" | "limited" | "minimal";
  if (hits.prohibited.length) tier = "prohibited";
  else if (hits.annex.length) tier = "high";
  else if (hits.transparency.length) tier = "limited";
  else tier = "minimal";

  const lines: string[] = [];
  lines.push(`# AI Act risk classification\n`);
  lines.push(`**Likely tier: ${ruleset.tiers[tier].label}** (${ruleset.tiers[tier].article})\n`);
  lines.push(ruleset.tiers[tier].summary + "\n");

  if (hits.prohibited.length) {
    lines.push(`## ⛔ Possible prohibited practices`);
    for (const p of hits.prohibited) lines.push(`- ${p.test} — *${p.cite}*`);
    lines.push("");
  }
  if (hits.annex.length) {
    lines.push(`## ⚠️ Possible high-risk categories (Annex III)`);
    for (const a of hits.annex) lines.push(`- **${a.domain}**: ${a.test} — *${a.cite}*`);
    lines.push(`\n> Check the Art. 6(3) exemption: ${ruleset.annex_iii_exemption.test} (*${ruleset.annex_iii_exemption.cite}*)`);
    lines.push("");
  }
  if (hits.transparency.length) {
    lines.push(`## ℹ️ Transparency obligations (Art. 50)`);
    for (const t of hits.transparency) lines.push(`- ${t.obligation} — *${t.cite}*`);
    lines.push("");
  }

  lines.push(`## What to do next`);
  lines.push(`Run \`check_obligations\` with tier "${tier}" and your role (provider or deployer) for the full obligation list, and \`next_deadlines\` for your timeline.`);
  lines.push(`\n*Keyword pre-screen only — confirm each match against the cited article. If you are also a GPAI model provider, Art. 53 obligations apply regardless of tier.*`);

  return lines.join("\n") + FOOTER;
}

export function checkObligations(tier: string, role: "provider" | "deployer", isGpai = false) {
  const lines: string[] = [`# Obligations — ${tier} risk, as ${role}\n`];

  if (tier === "prohibited") {
    lines.push(`This practice appears **prohibited (Art. 5)**. It may not be placed on the market, put into service, or used in the EU. ${ruleset.penalties.prohibited} (*${ruleset.penalties.cite}*)`);
    lines.push(`\n**Deadline:** already enforceable since ${ruleset.tiers.prohibited.enforceable_since}.`);
    return lines.join("\n") + FOOTER;
  }

  if (tier === "high") {
    const obs = ruleset.high_risk_obligations[role] ?? [];
    lines.push(`## High-risk obligations for the ${role}`);
    for (const o of obs) lines.push(`- **${o.id}** ${o.obligation} — *${o.cite}*`);
    const d = ruleset.tiers.high.deadlines;
    lines.push(`\n**Deadline for these obligations:** Annex III (use-based) → ${d.annex_iii_standalone}; Annex I (product-embedded) → ${d.annex_i_regulated_products}. ${d.note}`);
  } else if (tier === "limited") {
    lines.push(`## Transparency obligations`);
    for (const t of ruleset.transparency_triggers) lines.push(`- ${t.obligation} — *${t.cite}*`);
    lines.push(`\n**Deadline for these obligations:** ${ruleset.tiers.limited.deadline}.`);
  } else {
    lines.push(`No mandatory obligations under the Act for minimal-risk systems. Voluntary codes of conduct are encouraged.`);
  }

  if (isGpai) {
    lines.push(`\n## GPAI model obligations (apply in addition)`);
    for (const g of ruleset.gpai.base_obligations) lines.push(`- ${g.obligation} — *${g.cite}*`);
    lines.push(`\n> If trained with > 10^25 FLOPs or designated by the Commission, systemic-risk obligations (Art. 55) also apply.`);
  }

  return lines.join("\n") + FOOTER;
}

export function nextDeadlines(tier?: string) {
  const lines: string[] = [`# Relevant AI Act deadlines\n`];
  lines.push(`- **2025-02-02** — Prohibited practices (Art. 5) + AI literacy (Art. 4): in force`);
  lines.push(`- **2025-08-02** — GPAI model obligations + governance + penalties framework: in force`);
  lines.push(`- **2026-08-02** — Transparency (Art. 50) applies; most remaining provisions active`);
  lines.push(`- **2027-12-02** — Annex III high-risk (standalone) obligations (deferred by Digital Omnibus)`);
  lines.push(`- **2028-08-02** — Annex I high-risk (product-embedded) obligations`);
  if (tier === "high") {
    lines.push(`\n**Your likely date:** Annex III standalone → 2027-12-02; Annex I product-embedded → 2028-08-02.`);
  } else if (tier === "limited") {
    lines.push(`\n**Your likely date:** transparency obligations from 2026-08-02.`);
  } else if (tier === "prohibited") {
    lines.push(`\n**Your likely date:** already enforceable since 2025-02-02.`);
  }
  lines.push(`\n*${ruleset.source_note}*`);
  return lines.join("\n") + FOOTER;
}

export function scanRepo(fileList: string[]) {
  const lines: string[] = [`# Repository compliance artifact scan\n`];
  lines.push(`Scanned ${fileList.length} paths for documentation artifacts the Act expects.\n`);
  const lower = fileList.map((f) => f.toLowerCase());
  let pass = 0, warn = 0, fail = 0;
  for (const r of ruleset.repo_artifacts) {
    const found = r.looks_for.some((kw) => lower.some((f) => f.includes(kw.toLowerCase())));
    let status: string;
    if (found) { status = "✅ PASS"; pass++; }
    else if (r.severity === "recommended") { status = "⚠️ WARN"; warn++; }
    else { status = "❌ FAIL"; fail++; }
    lines.push(`- ${status} — **${r.artifact}** (relates to ${r.maps_to.join(", ")})`);
  }
  lines.push(`\n**Summary: ${pass} pass · ${warn} warn · ${fail} fail.** WARN = artifact is conditionally required (only if its trigger applies); FAIL = a core high-risk artifact (Art. 9–15) appears absent.`);
  lines.push(`\n*A present file does not prove adequacy — contents must still satisfy the cited articles. A missing file is a strong signal of a documentation gap.*`);
  return lines.join("\n") + FOOTER;
}
