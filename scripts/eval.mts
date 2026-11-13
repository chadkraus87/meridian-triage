/**
 * Run the agent over a split and save a dated results file.
 *
 *   npm run eval -- --split dev --mode stub                rules-only baseline, no API key
 *   npm run eval -- --split dev --mode live --estimate     cost estimate, no paid calls
 *   npm run eval -- --split dev --mode live                real model run (needs .env.local)
 *   npm run eval -- --split test --mode live --final       the one held-out run
 *
 * Flags: --split dev|test (default dev), --mode stub|live (default stub),
 *        --limit N (first N tickets), --no-save (print only), --estimate,
 *        --final (required for the test split).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import Anthropic from "@anthropic-ai/sdk";
import { claudeModel } from "../lib/claude";
import { MAX_RUN_USD, MAX_TOKENS, MODEL, PRICE_PER_MTOK } from "../lib/config";
import { loadArticles, loadTickets, withoutLabels, type Split } from "../lib/data";
import { score, type Metrics, type Result } from "../lib/eval/score";
import { stubModel, type ModelClient } from "../lib/model";
import { triage } from "../lib/pipeline";
import { ASSESS_SYSTEM, assessUser, DRAFT_SYSTEM, draftUser } from "../lib/prompts";
import { buildIndex } from "../lib/retrieval";
import { redactInjection } from "../lib/signals";

const { values } = parseArgs({
  options: {
    split: { type: "string", default: "dev" },
    mode: { type: "string", default: "stub" },
    limit: { type: "string" },
    "no-save": { type: "boolean", default: false },
    estimate: { type: "boolean", default: false },
    final: { type: "boolean", default: false },
  },
});

const split = values.split as Split;
if (split !== "dev" && split !== "test") throw new Error("--split must be dev or test");
if (split === "test" && !values.final)
  throw new Error("The test split is the held-out set: it runs once, after dev tuning is done. Pass --final to run it.");
if (values.mode !== "stub" && values.mode !== "live") throw new Error("--mode must be stub or live");
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const index = buildIndex(loadArticles());
const tickets = loadTickets(split).slice(0, values.limit ? Number(values.limit) : undefined);
const usd = (input: number, output: number) => (input * PRICE_PER_MTOK.input + output * PRICE_PER_MTOK.output) / 1e6;

if (values.estimate) {
  // No paid calls. Input tokens come from the free token-counting endpoint when a key is
  // set, otherwise from a characters-per-token approximation. Output is given as a range.
  const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
  const count = async (system: string, user: string) =>
    client
      ? (await client.messages.countTokens({ model: MODEL, system, messages: [{ role: "user", content: user }] })).input_tokens
      : Math.ceil((system.length + user.length) / 3.5);
  let input = 0;
  for (const ticket of tickets) {
    const t = withoutLabels(ticket);
    const stub = await triage(t, index, stubModel); // free: gives a realistic decision for the draft prompt
    const clean = redactInjection(t).ticket;
    input += await count(ASSESS_SYSTEM, assessUser(clean, stub.retrieved, index.articles));
    input += await count(DRAFT_SYSTEM, draftUser(clean, stub.retrieved, index.articles, stub.decision, stub.assessment));
  }
  const n = tickets.length;
  const typicalOut = n * (900 + 700); // assumed: JSON plus some thinking per call
  const worstOut = n * (MAX_TOKENS.assess + MAX_TOKENS.draft);
  console.log(`\nCost estimate: split=${split} n=${n} model=${MODEL} (${client ? "input counted by the API" : "input approximated, no API key"})`);
  console.log(`Input tokens   ${input.toLocaleString()}  ($${usd(input, 0).toFixed(2)})`);
  console.log(`Typical run    $${usd(input, typicalOut).toFixed(2)}  (assumes about 1,600 output tokens per ticket)`);
  console.log(`Worst case     $${usd(input, worstOut).toFixed(2)}  (every call hits its max_tokens cap)`);
  console.log(`Run budget     $${MAX_RUN_USD.toFixed(2)}  (the run stops before it can pass this)`);
  process.exit(0);
}

let model: ModelClient = stubModel;
if (values.mode === "live") {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("Live mode needs ANTHROPIC_API_KEY in .env.local (see .env.example).");
  model = claudeModel();
}

// Budget guard: before starting a batch, reserve each ticket's worst case. Stop starting
// new tickets once spent plus reserved would pass MAX_RUN_USD.
const WORST_TICKET_USD = usd(20_000, MAX_TOKENS.assess + MAX_TOKENS.draft);
const CONCURRENCY = values.mode === "live" ? 4 : 1;
let spent = 0;
let stopped = false;
const results: Result[] = [];
for (let i = 0; i < tickets.length; i += CONCURRENCY) {
  const batch = tickets.slice(i, i + CONCURRENCY);
  if (spent + batch.length * WORST_TICKET_USD > MAX_RUN_USD) {
    stopped = true;
    console.log(`Budget guard: stopped after ${results.length} tickets ($${spent.toFixed(2)} spent, cap $${MAX_RUN_USD}).`);
    break;
  }
  const done = await Promise.all(batch.map(async (ticket) => ({ ticket, trace: await triage(withoutLabels(ticket), index, model) })));
  for (const r of done) {
    spent += r.trace.usage.costUsd;
    results.push(r);
    if (r.trace.modelErrors.length) console.log(`  ${r.ticket.id}: ${r.trace.modelErrors.join("; ")}`);
  }
  if (values.mode === "live") console.log(`  ${results.length}/${tickets.length} tickets, $${spent.toFixed(3)} so far`);
}
const metrics = score(results);

const pct = (x: number | null) => (x === null ? "n/a" : `${(x * 100).toFixed(1)}%`);
const m = metrics;
console.log(`\nMeridian Triage eval: split=${split} mode=${values.mode} model=${model.name} n=${m.n}${stopped ? " (INCOMPLETE: budget guard)" : ""}\n`);
console.log(`Escalation recall     ${pct(m.escalation.recall)}  (missed: ${m.escalation.missed.join(", ") || "none"})`);
console.log(`Escalation precision  ${pct(m.escalation.precision)}  (false escalations: ${m.escalation.fp})`);
console.log(`Decision accuracy     ${pct(m.decision.accuracy)}  (model suggestion alone: ${pct(m.modelAlone.decisionAccuracy)})`);
console.log(`Category / severity / area  ${pct(m.category.accuracy)} / ${pct(m.severity.accuracy)} / ${pct(m.productArea.accuracy)}`);
console.log(`Citations only retrieved    ${pct(m.citations.onlyRetrievedRate)}`);
console.log(`Cited an expected article   ${pct(m.citations.expectedCitedRate)}  (retrieval recall@k: ${pct(m.citations.retrievalRecall)})`);
console.log(`Rule overrides        ${m.overrides.count} (${pct(m.overrides.rate)}), right ${m.overrides.correct}, harmful ${m.overrides.harmful}`);
console.log(`Prompt injection      ${m.injection.passed}/${m.injection.n} passed${m.injection.failures.map((f) => `\n  ${f.id}: ${f.reasons.join("; ")}`).join("")}`);
console.log(`Asked for exactly the missing details  ${m.askFor.replyExact}/${m.askFor.n} (rules engine list matched: ${m.askFor.engineExact}/${m.askFor.n})`);
console.log(`Model errors (stub stood in)  ${results.filter((r) => r.trace.modelErrors.length).length}`);
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
  writeFileSync(
    path.join(process.cwd(), file),
    JSON.stringify({ id, createdAt, split, mode: values.mode, model: model.name, complete: !stopped, metrics, traces: results.map((r) => r.trace) }, null, 2),
  );

  const historyFile = path.join(process.cwd(), "results", "index.json");
  const history: {
    id: string;
    file: string;
    createdAt: string;
    split: string;
    mode: string;
    model?: string;
    complete?: boolean;
    metrics: Omit<Metrics, "misses">;
  }[] = existsSync(historyFile) ? JSON.parse(readFileSync(historyFile, "utf8")) : [];
  const { misses: _misses, ...summary } = metrics;
  history.push({ id, file, createdAt, split, mode: values.mode!, model: model.name, complete: !stopped, metrics: summary });
  writeFileSync(historyFile, JSON.stringify(history, null, 2));
  console.log(`\nSaved ${file}`);
}
