/**
 * Run the agent over a split and save a dated results file.
 *
 *   npm run eval -- --split dev --mode stub
 *   npm run eval -- --split test --mode live      (Phase 2)
 *
 * Flags: --split dev|test (default dev), --mode stub|live (default stub),
 *        --limit N (first N tickets), --no-save (print only).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { MODEL } from "../lib/config";
import { loadArticles, loadTickets, withoutLabels, type Split } from "../lib/data";
import { score, type Metrics, type Result } from "../lib/eval/score";
import { stubModel, type ModelClient } from "../lib/model";
import { triage } from "../lib/pipeline";
import { buildIndex } from "../lib/retrieval";

const { values } = parseArgs({
  options: {
    split: { type: "string", default: "dev" },
    mode: { type: "string", default: "stub" },
    limit: { type: "string" },
    "no-save": { type: "boolean", default: false },
  },
});

const split = values.split as Split;
if (split !== "dev" && split !== "test") throw new Error("--split must be dev or test");
if (values.mode !== "stub") throw new Error("--mode live arrives in Phase 2. Use --mode stub for now.");
const model: ModelClient = stubModel;

const index = buildIndex(loadArticles());
const tickets = loadTickets(split).slice(0, values.limit ? Number(values.limit) : undefined);

const results: Result[] = [];
for (const ticket of tickets) results.push({ ticket, trace: await triage(withoutLabels(ticket), index, model) });
const metrics = score(results);

const pct = (x: number | null) => (x === null ? "n/a" : `${(x * 100).toFixed(1)}%`);
const m = metrics;
console.log(`\nMeridian Triage eval: split=${split} mode=${values.mode} n=${m.n}\n`);
console.log(`Escalation recall     ${pct(m.escalation.recall)}  (missed: ${m.escalation.missed.join(", ") || "none"})`);
console.log(`Escalation precision  ${pct(m.escalation.precision)}  (false escalations: ${m.escalation.fp})`);
console.log(`Decision accuracy     ${pct(m.decision.accuracy)}  (model suggestion alone: ${pct(m.modelAlone.decisionAccuracy)})`);
console.log(`Category / severity / area  ${pct(m.category.accuracy)} / ${pct(m.severity.accuracy)} / ${pct(m.productArea.accuracy)}`);
console.log(`Citations only retrieved    ${pct(m.citations.onlyRetrievedRate)}`);
console.log(`Cited an expected article   ${pct(m.citations.expectedCitedRate)}  (retrieval recall@k: ${pct(m.citations.retrievalRecall)})`);
console.log(`Rule overrides        ${m.overrides.count} (${pct(m.overrides.rate)}), right ${m.overrides.correct}, harmful ${m.overrides.harmful}`);
console.log(`Prompt injection      ${m.injection.passed}/${m.injection.n} passed${m.injection.failures.map((f) => `\n  ${f.id}: ${f.reasons.join("; ")}`).join("")}`);
console.log(`Guard-blocked replies ${m.guardBlocks}`);
console.log(`Cost                  $${m.cost.totalUsd.toFixed(4)} total, $${m.cost.perTicketUsd.toFixed(5)} per ticket`);
console.log(`Latency               ${Math.round(m.latency.meanMs)} ms mean, ${Math.round(m.latency.p95Ms)} ms p95`);
console.log("\nConfusion matrix (rows = expected, columns = actual)");
console.table(m.decision.confusion);

if (!values["no-save"]) {
  const dir = path.join(process.cwd(), "results", "runs");
  mkdirSync(dir, { recursive: true });
  const createdAt = new Date().toISOString();
  const id = `${createdAt.replace(/[:.]/g, "-")}-${split}-${values.mode}`;
  const file = path.join("results", "runs", `${id}.json`);
  writeFileSync(path.join(process.cwd(), file), JSON.stringify({ id, createdAt, split, mode: values.mode, model: model.name === "stub" ? "stub" : MODEL, metrics, traces: results.map((r) => r.trace) }, null, 2));

  const historyFile = path.join(process.cwd(), "results", "index.json");
  const history: { id: string; file: string; createdAt: string; split: string; mode: string; metrics: Omit<Metrics, "misses"> }[] = existsSync(historyFile)
    ? JSON.parse(readFileSync(historyFile, "utf8"))
    : [];
  const { misses: _misses, ...summary } = metrics;
  history.push({ id, file, createdAt, split, mode: values.mode!, metrics: summary });
  writeFileSync(historyFile, JSON.stringify(history, null, 2));
  console.log(`\nSaved ${file}`);
}
