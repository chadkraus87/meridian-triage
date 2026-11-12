import { PRICE_PER_MTOK, TOP_K } from "./config";
import { BLOCKED_REPLY, checkReply } from "./guard";
import type { ModelClient } from "./model";
import { search, type Bm25Index } from "./retrieval";
import { decide, type DecisionResult } from "./rules";
import { detectSignals, ticketText, type Signals } from "./signals";
import type { Assessment, BugReport, Retrieved, TicketInput } from "./types";

export interface Trace {
  ticketId: string;
  model: string;
  signals: Signals;
  retrieved: Retrieved[];
  assessment: Assessment;
  decision: DecisionResult;
  reply: string;
  bugReport: BugReport | null;
  citations: { cited: string[]; removed: string[] };
  guard: { blocked: boolean; reasons: string[] };
  usage: { inputTokens: number; outputTokens: number; costUsd: number; latencyMs: number };
}

const CITATION = /\[(KB-\d{3})\]/g;

export function extractCitations(reply: string): string[] {
  return [...new Set([...reply.matchAll(CITATION)].map((m) => m[1]))];
}

export async function triage(ticket: TicketInput, index: Bm25Index, model: ModelClient): Promise<Trace> {
  const signals = detectSignals(ticket);
  const retrieved = search(index, ticketText(ticket), TOP_K);
  const ids = new Set(retrieved.map((r) => r.id));

  const assess = await model.assess(ticket, retrieved, index.articles);
  // The model may only vouch for articles that were actually retrieved.
  const assessment = { ...assess.value, articleMatches: assess.value.articleMatches.filter((m) => ids.has(m.id)) };

  const decision = decide({ ticket, signals, assessment, retrieved });
  const draft = await model.draft(ticket, retrieved, index.articles, decision, assessment);

  // Citations outside the retrieved set are stripped, and recorded for the eval.
  const cited = extractCitations(draft.value.reply);
  const removed = cited.filter((id) => !ids.has(id));
  let reply = draft.value.reply.replace(CITATION, (m, id) => (ids.has(id) ? m : ""));

  const guard = checkReply(reply);
  if (!guard.ok) reply = BLOCKED_REPLY;

  const inputTokens = assess.usage.inputTokens + draft.usage.inputTokens;
  const outputTokens = assess.usage.outputTokens + draft.usage.outputTokens;
  return {
    ticketId: ticket.id,
    model: model.name,
    signals,
    retrieved,
    assessment,
    decision,
    reply,
    bugReport: decision.decision === "escalate" ? draft.value.bugReport : null,
    citations: { cited, removed },
    guard: { blocked: !guard.ok, reasons: guard.reasons },
    usage: {
      inputTokens,
      outputTokens,
      costUsd: (inputTokens * PRICE_PER_MTOK.input + outputTokens * PRICE_PER_MTOK.output) / 1e6,
      latencyMs: assess.usage.latencyMs + draft.usage.latencyMs,
    },
  };
}
