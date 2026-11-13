import Anthropic from "@anthropic-ai/sdk";
import { MAX_RUN_USD, MAX_TOKENS, MODEL, PRICE_PER_MTOK } from "./config";
import { stubModel, type ModelClient } from "./model";
import { triage, type Trace } from "./pipeline";
import { ASSESS_SYSTEM, assessUser, DRAFT_SYSTEM, draftUser } from "./prompts";
import type { Bm25Index } from "./retrieval";
import { redactInjection } from "./signals";
import type { TicketInput } from "./types";

/** Shared by the eval CLI and the TechOps triage script: the budget guard and the cost estimate. */

export const usd = (input: number, output: number) => (input * PRICE_PER_MTOK.input + output * PRICE_PER_MTOK.output) / 1e6;

/** Worst case for one ticket: generous input, and both calls hitting their output cap. */
const WORST_TICKET_USD = usd(20_000, MAX_TOKENS.assess + MAX_TOKENS.draft);

export interface RunOutcome {
  traces: Trace[];
  spent: number;
  /** True if the budget guard stopped the run before every ticket was done. */
  stopped: boolean;
}

/**
 * Triage tickets, a few at a time. Before each batch, reserve every ticket's worst case,
 * and stop starting new tickets once spent plus reserved would pass MAX_RUN_USD.
 */
export async function runTickets(
  tickets: TicketInput[],
  index: Bm25Index,
  model: ModelClient,
  { concurrency = 4, log = console.log }: { concurrency?: number; log?: (line: string) => void } = {},
): Promise<RunOutcome> {
  const traces: Trace[] = [];
  let spent = 0;
  for (let i = 0; i < tickets.length; i += concurrency) {
    const batch = tickets.slice(i, i + concurrency);
    if (spent + batch.length * WORST_TICKET_USD > MAX_RUN_USD) {
      log(`Budget guard: stopped after ${traces.length} tickets ($${spent.toFixed(2)} spent, cap $${MAX_RUN_USD}).`);
      return { traces, spent, stopped: true };
    }
    for (const trace of await Promise.all(batch.map((t) => triage(t, index, model)))) {
      spent += trace.usage.costUsd;
      traces.push(trace);
      if (trace.modelErrors.length) log(`  ${trace.ticketId}: ${trace.modelErrors.join("; ")}`);
    }
    if (model.name !== "stub") log(`  ${traces.length}/${tickets.length} tickets, $${spent.toFixed(3)} so far`);
  }
  return { traces, spent, stopped: false };
}

/**
 * Price a live run without paid calls. Input tokens come from the free token-counting
 * endpoint when a key is set, otherwise from a characters-per-token approximation.
 */
export async function estimateRun(tickets: TicketInput[], index: Bm25Index) {
  const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
  const count = async (system: string, user: string) =>
    client
      ? (await client.messages.countTokens({ model: MODEL, system, messages: [{ role: "user", content: user }] })).input_tokens
      : Math.ceil((system.length + user.length) / 3.5);
  let input = 0;
  for (const t of tickets) {
    const stub = await triage(t, index, stubModel); // free: gives a realistic decision for the draft prompt
    const clean = redactInjection(t).ticket;
    input += await count(ASSESS_SYSTEM, assessUser(clean, stub.retrieved, index.articles));
    input += await count(DRAFT_SYSTEM, draftUser(clean, stub.retrieved, index.articles, stub.decision, stub.assessment));
  }
  const n = tickets.length;
  return {
    counted: Boolean(client),
    input,
    typicalUsd: usd(input, n * (900 + 700)),
    worstUsd: usd(input, n * (MAX_TOKENS.assess + MAX_TOKENS.draft)),
  };
}

export function printEstimate(label: string, n: number, e: Awaited<ReturnType<typeof estimateRun>>) {
  console.log(`\nCost estimate: ${label} n=${n} model=${MODEL} (${e.counted ? "input counted by the API" : "input approximated, no API key"})`);
  console.log(`Input tokens   ${e.input.toLocaleString()}  ($${usd(e.input, 0).toFixed(2)})`);
  console.log(`Typical run    $${e.typicalUsd.toFixed(2)}  (assumes about 1,600 output tokens per ticket)`);
  console.log(`Worst case     $${e.worstUsd.toFixed(2)}  (every call hits its max_tokens cap)`);
  console.log(`Run budget     $${MAX_RUN_USD.toFixed(2)}  (the run stops before it can pass this)`);
}
