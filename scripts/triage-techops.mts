/**
 * Triage the tickets imported from TechOps Command Center and record the run for the site.
 *
 *   npm run triage:techops -- --estimate     cost estimate, no paid calls
 *   npm run triage:techops                   live run (needs .env.local)
 *
 * These tickets have no labels, so nothing is scored and the run stays out of the eval
 * history in results/index.json. The site shows the latest results/runs/*-techops-live.json.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { z } from "zod";
import { claudeModel } from "../lib/claude";
import { loadArticles } from "../lib/data";
import { percentile } from "../lib/eval/score";
import { buildIndex } from "../lib/retrieval";
import { estimateRun, printEstimate, runTickets } from "../lib/runner";
import { TechOpsTicketSchema } from "../lib/techops";

const { values } = parseArgs({ options: { estimate: { type: "boolean", default: false } } });
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const tickets = z.array(TechOpsTicketSchema).parse(JSON.parse(readFileSync("data/techops/tickets.json", "utf8")));
// The agent sees only what a customer wrote, not where the ticket came from.
const inputs = tickets.map(({ source: _source, ...t }) => t);
const index = buildIndex(loadArticles());

if (values.estimate) {
  printEstimate("TechOps tickets", inputs.length, await estimateRun(inputs, index));
  process.exit(0);
}
if (!process.env.ANTHROPIC_API_KEY) throw new Error("Needs ANTHROPIC_API_KEY in .env.local (see .env.example).");

const model = claudeModel();
const run = await runTickets(inputs, index, model);
const decisions = run.traces.reduce<Record<string, number>>((acc, t) => ((acc[t.decision.decision] = (acc[t.decision.decision] ?? 0) + 1), acc), {});
const latencies = run.traces.map((t) => t.usage.latencyMs);
const summary = {
  n: run.traces.length,
  decisions,
  modelErrors: run.traces.filter((t) => t.modelErrors.length).length,
  cost: { totalUsd: run.spent, perTicketUsd: run.spent / Math.max(1, run.traces.length) },
  latency: { meanMs: latencies.reduce((a, b) => a + b, 0) / Math.max(1, latencies.length), p95Ms: percentile(latencies, 95) },
};
console.log(`\nTechOps triage: ${summary.n} tickets${run.stopped ? " (INCOMPLETE: budget guard)" : ""}`);
console.log(`Decisions      ${JSON.stringify(decisions)}`);
console.log(`Model errors   ${summary.modelErrors}`);
console.log(`Cost           $${run.spent.toFixed(4)} total, $${summary.cost.perTicketUsd.toFixed(5)} per ticket`);

const createdAt = new Date().toISOString();
const id = `${createdAt.replace(/[:.]/g, "-")}-techops-live`;
const file = path.join("results", "runs", `${id}.json`);
writeFileSync(file, JSON.stringify({ id, createdAt, split: "techops", mode: "live", model: model.name, complete: !run.stopped, summary, traces: run.traces }, null, 2));
console.log(`Saved ${file}`);
