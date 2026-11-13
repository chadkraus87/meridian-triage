import type { Trace } from "../pipeline";
import type { Decision, DetailKey, Ticket } from "../types";

export interface Result {
  ticket: Ticket;
  trace: Trace;
}

export interface Miss {
  id: string;
  expected: Decision;
  actual: Decision;
  modelSuggestion: Decision;
  ruleId: string;
  note: string;
}

export interface Metrics {
  n: number;
  escalation: { recall: number | null; precision: number | null; tp: number; fn: number; fp: number; missed: string[] };
  decision: { accuracy: number; confusion: Record<Decision, Record<Decision, number>> };
  modelAlone: { decisionAccuracy: number };
  category: { accuracy: number };
  severity: { accuracy: number };
  productArea: { accuracy: number };
  citations: {
    /** Share of replies whose model-written citations were all retrieved articles (before stripping). */
    onlyRetrievedRate: number;
    /** Of tickets with expected articles, share whose reply cites at least one of them. */
    expectedCitedRate: number | null;
    /** Of tickets with expected articles, share where retrieval returned at least one of them. */
    retrievalRecall: number | null;
  };
  overrides: { count: number; rate: number; correct: number; harmful: number };
  injection: { n: number; passed: number; failures: { id: string; reasons: string[] }[] };
  /** Did the reply ask for exactly the missing details (labels.askFor), and nothing more? */
  askFor: {
    n: number;
    /** The rules engine's list of missing details matched the label. */
    engineExact: number;
    /** The reply text asked for exactly the labeled details. This is the headline number. */
    replyExact: number;
    failures: { id: string; expected: DetailKey[]; engine: DetailKey[]; reply: DetailKey[] }[];
  };
  guardBlocks: number;
  cost: { totalUsd: number; perTicketUsd: number; inputTokens: number; outputTokens: number };
  latency: { meanMs: number; p95Ms: number };
  misses: Miss[];
}

const DECISIONS: Decision[] = ["resolve", "needs_info", "escalate"];

// ponytail: phrase matching on the reply; a live reply that mentions "account ID" in passing
// counts as asking for it. Move to a structured "askedFor" field in the draft if this misfires.
const ASK_PATTERNS: Record<DetailKey, RegExp> = {
  accountId: /\baccount id\b/i,
  errorMessage: /\b(error (message|text|code)|status code)\b/i,
  steps: /\bsteps (to reproduce|that lead|you took)\b/i,
  timestamp: /\b(when it happened|when it started|what time|timestamp|time zone)\b/i,
};

/** Which details a reply asks the customer for, by phrase. */
export function detailsAskedFor(reply: string): DetailKey[] {
  return (Object.keys(ASK_PATTERNS) as DetailKey[]).filter((k) => ASK_PATTERNS[k].test(reply));
}

const sameSet = (a: DetailKey[], b: DetailKey[]) => a.length === b.length && a.every((x) => b.includes(x));

/** Ratio, or null when there is nothing to divide by (so 0/0 never reads as 0% or 100%). */
export function ratio(num: number, den: number): number | null {
  return den === 0 ? null : num / den;
}

const share = (xs: Result[], pred: (r: Result) => boolean) => ratio(xs.filter(pred).length, xs.length) ?? 0;

export function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}

export function score(results: Result[]): Metrics {
  const confusion = Object.fromEntries(
    DECISIONS.map((e) => [e, Object.fromEntries(DECISIONS.map((a) => [a, 0]))]),
  ) as Record<Decision, Record<Decision, number>>;
  for (const { ticket, trace } of results) confusion[ticket.labels.decision][trace.decision.decision]++;

  const isEsc = (d: Decision) => d === "escalate";
  const tp = results.filter((r) => isEsc(r.ticket.labels.decision) && isEsc(r.trace.decision.decision)).length;
  const fn = results.filter((r) => isEsc(r.ticket.labels.decision) && !isEsc(r.trace.decision.decision));
  const fp = results.filter((r) => !isEsc(r.ticket.labels.decision) && isEsc(r.trace.decision.decision)).length;

  const overridden = results.filter((r) => r.trace.decision.overrodeModel);
  const withExpected = results.filter((r) => r.ticket.labels.expectedArticles.length > 0);

  const injection = results.filter((r) => r.ticket.labels.tags?.includes("injection"));
  const injectionFailures = injection
    .map(({ ticket, trace }) => {
      const reasons: string[] = [];
      if (trace.decision.decision !== ticket.labels.decision)
        reasons.push(`decision ${trace.decision.decision}, expected ${ticket.labels.decision}`);
      const reply = trace.reply.toLowerCase();
      for (const phrase of ticket.labels.mustNotContain ?? [])
        if (reply.includes(phrase.toLowerCase())) reasons.push(`reply contains "${phrase}"`);
      return { id: ticket.id, reasons };
    })
    .filter((f) => f.reasons.length > 0);

  const asks = results
    .filter((r) => r.ticket.labels.askFor !== undefined)
    .map(({ ticket, trace }) => ({
      id: ticket.id,
      expected: ticket.labels.askFor!,
      engine: trace.decision.missingDetails,
      reply: detailsAskedFor(trace.reply),
    }));

  const totalUsd = results.reduce((s, r) => s + r.trace.usage.costUsd, 0);
  const latencies = results.map((r) => r.trace.usage.latencyMs);

  return {
    n: results.length,
    escalation: {
      recall: ratio(tp, tp + fn.length),
      precision: ratio(tp, tp + fp),
      tp,
      fn: fn.length,
      fp,
      missed: fn.map((r) => r.ticket.id),
    },
    decision: { accuracy: share(results, (r) => r.trace.decision.decision === r.ticket.labels.decision), confusion },
    modelAlone: { decisionAccuracy: share(results, (r) => r.trace.decision.modelSuggestion === r.ticket.labels.decision) },
    category: { accuracy: share(results, (r) => r.trace.assessment.category === r.ticket.labels.category) },
    severity: { accuracy: share(results, (r) => r.trace.assessment.severity === r.ticket.labels.severity) },
    productArea: { accuracy: share(results, (r) => r.trace.assessment.productArea === r.ticket.labels.productArea) },
    citations: {
      onlyRetrievedRate: share(results, (r) => r.trace.citations.removed.length === 0),
      expectedCitedRate: ratio(
        withExpected.filter((r) => r.trace.citations.cited.some((id) => r.ticket.labels.expectedArticles.includes(id))).length,
        withExpected.length,
      ),
      retrievalRecall: ratio(
        withExpected.filter((r) => r.trace.retrieved.some((a) => r.ticket.labels.expectedArticles.includes(a.id))).length,
        withExpected.length,
      ),
    },
    overrides: {
      count: overridden.length,
      rate: share(results, (r) => r.trace.decision.overrodeModel),
      correct: overridden.filter((r) => r.trace.decision.decision === r.ticket.labels.decision).length,
      harmful: overridden.filter(
        (r) => r.trace.decision.modelSuggestion === r.ticket.labels.decision && r.trace.decision.decision !== r.ticket.labels.decision,
      ).length,
    },
    injection: { n: injection.length, passed: injection.length - injectionFailures.length, failures: injectionFailures },
    askFor: {
      n: asks.length,
      engineExact: asks.filter((a) => sameSet(a.engine, a.expected)).length,
      replyExact: asks.filter((a) => sameSet(a.reply, a.expected)).length,
      failures: asks.filter((a) => !sameSet(a.reply, a.expected) || !sameSet(a.engine, a.expected)),
    },
    guardBlocks: results.filter((r) => r.trace.guard.blocked).length,
    cost: {
      totalUsd,
      perTicketUsd: results.length ? totalUsd / results.length : 0,
      inputTokens: results.reduce((s, r) => s + r.trace.usage.inputTokens, 0),
      outputTokens: results.reduce((s, r) => s + r.trace.usage.outputTokens, 0),
    },
    latency: {
      meanMs: latencies.length ? latencies.reduce((s, n) => s + n, 0) / latencies.length : 0,
      p95Ms: percentile(latencies, 95),
    },
    misses: results
      .filter((r) => r.trace.decision.decision !== r.ticket.labels.decision)
      .map(({ ticket, trace }) => ({
        id: ticket.id,
        expected: ticket.labels.decision,
        actual: trace.decision.decision,
        modelSuggestion: trace.decision.modelSuggestion,
        ruleId: trace.decision.ruleId,
        note: ticket.labels.note,
      })),
  };
}
