import { PRICE_PER_MTOK, TOP_K } from "./config";
import { BLOCKED_REPLY, checkReply } from "./guard";
import { ModelCallError, stubModel, type ModelCall, type ModelClient } from "./model";
import { search, type Bm25Index } from "./retrieval";
import { decide, type DecisionResult } from "./rules";
import { detectSignals, redactInjection, ticketText, type Signals } from "./signals";
import type { Assessment, BugReport, DetailKey, Retrieved, TicketInput } from "./types";

export interface Trace {
  ticketId: string;
  model: string;
  signals: Signals;
  /** Text left out of retrieval and model calls because the injection detector flagged it. */
  redacted: string[];
  retrieved: Retrieved[];
  assessment: Assessment;
  decision: DecisionResult;
  reply: string;
  /** What the draft says its reply asks for. Absent in runs recorded before 2026-11-13. */
  askedFor?: DetailKey[];
  bugReport: BugReport | null;
  citations: { cited: string[]; removed: string[] };
  guard: { blocked: boolean; reasons: string[] };
  usage: { inputTokens: number; outputTokens: number; costUsd: number; latencyMs: number };
  /** Model calls that failed or were refused, where the rules-only stub stood in. */
  modelErrors: string[];
}

const CITATION = /\[(KB-\d{3})\]/g;

export function extractCitations(reply: string): string[] {
  return [...new Set([...reply.matchAll(CITATION)].map((m) => m[1]))];
}

export async function triage(ticket: TicketInput, index: Bm25Index, model: ModelClient): Promise<Trace> {
  // Detectors see the full original text; everything downstream sees the redacted copy.
  const signals = detectSignals(ticket);
  const { ticket: clean, removed: redacted } = redactInjection(ticket);
  const retrieved = search(index, ticketText(clean), TOP_K);
  const ids = new Set(retrieved.map((r) => r.id));

  // If a model call fails or is refused, the rules-only stub stands in, so the rules
  // engine still decides with the deterministic detectors. The failure is recorded.
  const modelErrors: string[] = [];
  const failed = { inputTokens: 0, outputTokens: 0, latencyMs: 0 }; // tokens spent on failed calls still cost money
  async function guarded<T>(step: string, live: () => Promise<ModelCall<T>>, fallback: () => Promise<ModelCall<T>>) {
    try {
      return await live();
    } catch (e) {
      modelErrors.push(`${step}: ${e instanceof Error ? e.message : String(e)}`);
      if (e instanceof ModelCallError) {
        failed.inputTokens += e.usage.inputTokens;
        failed.outputTokens += e.usage.outputTokens;
        failed.latencyMs += e.usage.latencyMs;
      }
      return fallback();
    }
  }

  const assess = await guarded(
    "assess",
    () => model.assess(clean, retrieved, index.articles),
    () => stubModel.assess(clean, retrieved, index.articles),
  );
  // The model may only vouch for articles that were actually retrieved.
  const assessment = { ...assess.value, articleMatches: assess.value.articleMatches.filter((m) => ids.has(m.id)) };

  const decision = decide({ ticket, signals, assessment, retrieved });
  const draft = await guarded(
    "draft",
    () => model.draft(clean, retrieved, index.articles, decision, assessment),
    () => stubModel.draft(clean, retrieved, index.articles, decision, assessment),
  );

  // Citations outside the retrieved set are stripped, and recorded for the eval.
  const cited = extractCitations(draft.value.reply);
  const removed = cited.filter((id) => !ids.has(id));
  let reply = draft.value.reply.replace(CITATION, (m, id) => (ids.has(id) ? m : ""));

  const guard = checkReply(reply);
  if (!guard.ok) reply = BLOCKED_REPLY;

  const inputTokens = assess.usage.inputTokens + draft.usage.inputTokens + failed.inputTokens;
  const outputTokens = assess.usage.outputTokens + draft.usage.outputTokens + failed.outputTokens;
  return {
    ticketId: ticket.id,
    model: model.name,
    signals,
    redacted,
    retrieved,
    assessment,
    decision,
    reply,
    // A blocked draft is replaced by a note to the support engineer, which asks for nothing.
    askedFor: guard.ok ? draft.value.askedFor : [],
    bugReport: decision.decision === "escalate" ? draft.value.bugReport : null,
    citations: { cited, removed },
    guard: { blocked: !guard.ok, reasons: guard.reasons },
    usage: {
      inputTokens,
      outputTokens,
      costUsd: (inputTokens * PRICE_PER_MTOK.input + outputTokens * PRICE_PER_MTOK.output) / 1e6,
      latencyMs: assess.usage.latencyMs + draft.usage.latencyMs + failed.latencyMs,
    },
    modelErrors,
  };
}
