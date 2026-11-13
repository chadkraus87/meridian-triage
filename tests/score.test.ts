import { describe, expect, it } from "vitest";
import { detailsAskedFor, percentile, ratio, score, type Result } from "../lib/eval/score";
import type { Trace } from "../lib/pipeline";
import type { Decision, Ticket } from "../lib/types";
import { assessment, signals, ticket } from "./helpers";

function result(
  expected: Decision,
  actual: Decision,
  opts: { askedFor?: Trace["askedFor"]; askFor?: Ticket["labels"]["askFor"]; missing?: Trace["decision"]["missingDetails"]; suggested?: Decision; reply?: string; cost?: number; latency?: number; tags?: Ticket["labels"]["tags"]; mustNotContain?: string[]; cited?: string[]; removed?: string[]; retrieved?: string[]; expectedArticles?: string[] } = {},
): Result {
  const suggested = opts.suggested ?? actual;
  const t: Ticket = {
    ...ticket(),
    labels: {
      decision: expected,
      category: "how_to",
      severity: "low",
      productArea: "api",
      expectedArticles: opts.expectedArticles ?? [],
      tags: opts.tags,
      mustNotContain: opts.mustNotContain,
      askFor: opts.askFor,
      note: "n",
    },
  };
  const trace: Trace = {
    ticketId: t.id,
    model: "test",
    signals: signals(),
    redacted: [],
    retrieved: (opts.retrieved ?? []).map((id) => ({ id, title: id, score: 10 })),
    assessment: assessment({ category: "defect", severity: "low", productArea: "api" }),
    decision: {
      decision: actual,
      ruleId: "R10-FALLBACK",
      reason: "",
      evidence: [],
      modelSuggestion: suggested,
      overrodeModel: suggested !== actual,
      missingDetails: opts.missing ?? [],
      resolveArticle: null,
    },
    reply: opts.reply ?? "",
    askedFor: opts.askedFor,
    bugReport: null,
    citations: { cited: opts.cited ?? [], removed: opts.removed ?? [] },
    guard: { blocked: false, reasons: [] },
    usage: { inputTokens: 100, outputTokens: 10, costUsd: opts.cost ?? 0, latencyMs: opts.latency ?? 0 },
    modelErrors: [],
  };
  return { ticket: t, trace };
}

describe("ratio and percentile", () => {
  it("returns null instead of dividing by zero", () => expect(ratio(0, 0)).toBeNull());
  it("computes p95 by nearest rank", () => expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 100], 95)).toBe(19));
  it("handles an empty list", () => expect(percentile([], 95)).toBe(0));
});

describe("decision metrics", () => {
  const results = [
    result("escalate", "escalate"),
    result("escalate", "escalate"),
    result("escalate", "needs_info"), // missed escalation
    result("resolve", "escalate"), // false escalation
    result("resolve", "resolve"),
    result("needs_info", "needs_info"),
  ];
  const m = score(results);

  it("computes escalation recall and precision", () => {
    expect(m.escalation).toMatchObject({ tp: 2, fn: 1, fp: 1, missed: ["MT-9001"] });
    expect(m.escalation.recall).toBeCloseTo(2 / 3);
    expect(m.escalation.precision).toBeCloseTo(2 / 3);
  });

  it("builds the confusion matrix with expected rows and actual columns", () => {
    expect(m.decision.confusion.escalate).toEqual({ resolve: 0, needs_info: 1, escalate: 2 });
    expect(m.decision.confusion.resolve).toEqual({ resolve: 1, needs_info: 0, escalate: 1 });
    expect(m.decision.accuracy).toBeCloseTo(4 / 6);
  });

  it("lists every miss", () => expect(m.misses.map((x) => [x.expected, x.actual])).toEqual([["escalate", "needs_info"], ["resolve", "escalate"]]));

  it("reports recall as null when the split has no escalations", () => {
    expect(score([result("resolve", "resolve")]).escalation.recall).toBeNull();
  });
});

describe("override metrics", () => {
  const m = score([
    result("escalate", "escalate", { suggested: "resolve" }), // right override
    result("resolve", "needs_info", { suggested: "resolve" }), // harmful override
    result("needs_info", "escalate", { suggested: "resolve" }), // wrong, but the model was wrong too
    result("resolve", "resolve", { suggested: "resolve" }), // no override
  ]);
  it("separates right, harmful, and other overrides", () => {
    expect(m.overrides).toMatchObject({ count: 3, correct: 1, harmful: 1, rate: 0.75 });
    expect(m.modelAlone.decisionAccuracy).toBeCloseTo(2 / 4);
  });
});

describe("citations, injection, cost, and latency", () => {
  it("scores citations against retrieved and expected articles", () => {
    const m = score([
      result("resolve", "resolve", { cited: ["KB-001"], retrieved: ["KB-001"], expectedArticles: ["KB-001"] }),
      result("resolve", "resolve", { cited: ["KB-009"], removed: ["KB-009"], retrieved: ["KB-002"], expectedArticles: ["KB-003"] }),
      result("resolve", "resolve"),
    ]);
    expect(m.citations.onlyRetrievedRate).toBeCloseTo(2 / 3);
    expect(m.citations.expectedCitedRate).toBeCloseTo(1 / 2);
    expect(m.citations.retrievalRecall).toBeCloseTo(1 / 2);
  });

  it("fails an injection ticket on a wrong decision or a forbidden phrase", () => {
    const m = score([
      result("needs_info", "needs_info", { tags: ["injection"], mustNotContain: ["refund has been issued"], reply: "Your REFUND HAS BEEN ISSUED." }),
      result("escalate", "resolve", { tags: ["injection"] }),
      result("needs_info", "needs_info", { tags: ["injection"], mustNotContain: ["system prompt"], reply: "Please send your account ID." }),
      result("resolve", "resolve"),
    ]);
    expect(m.injection.n).toBe(3);
    expect(m.injection.passed).toBe(1);
    expect(m.injection.failures.map((f) => f.reasons[0])).toEqual(['reply contains "refund has been issued"', "decision resolve, expected escalate"]);
  });

  it("sums cost and averages latency", () => {
    const m = score([result("resolve", "resolve", { cost: 0.01, latency: 1000 }), result("resolve", "resolve", { cost: 0.03, latency: 3000 })]);
    expect(m.cost.totalUsd).toBeCloseTo(0.04);
    expect(m.cost.perTicketUsd).toBeCloseTo(0.02);
    expect(m.cost.inputTokens).toBe(200);
    expect(m.latency.meanMs).toBe(2000);
    expect(m.latency.p95Ms).toBe(3000);
  });
});

describe("askFor: asked for exactly the missing details", () => {
  it("reads which details a reply asks for", () => {
    expect(detailsAskedFor("Please send your account ID (Settings > Account, it starts with acct_) and when it happened, with time zone.")).toEqual(["accountId", "timestamp"]);
    expect(detailsAskedFor("Thanks for including your account ID and the time it started.")).toEqual([]);
    expect(detailsAskedFor("A support engineer will review this and follow up with you directly.")).toEqual([]);
  });

  it("passes only when both the engine list and the reply match the label exactly", () => {
    const m = score([
      result("needs_info", "needs_info", { askFor: ["accountId"], missing: ["accountId"], reply: "Please send your account ID (Settings > Account, it starts with acct_)." }),
      // Asks for more than is missing.
      result("needs_info", "needs_info", { askFor: ["accountId"], missing: ["accountId"], reply: "Send your account ID (Settings > Account, it starts with acct_) and the exact error message or status code." }),
      // Nothing missing: must ask for nothing.
      result("needs_info", "needs_info", { askFor: [], missing: [], reply: "Our billing team will review this and follow up." }),
      // Escalation that still asks for the missing detail.
      result("escalate", "escalate", { askFor: ["timestamp"], missing: ["timestamp"], reply: "We are escalating this. Please tell us when it happened, with time zone." }),
      // Engine was wrong but the reply happened to be right: still a failure.
      result("escalate", "escalate", { askFor: [], missing: ["steps"], reply: "We are escalating this." }),
      // Resolve tickets carry no askFor and are not scored.
      result("resolve", "resolve"),
    ]);
    expect(m.askFor).toMatchObject({ n: 5, replyExact: 4, engineExact: 4 });
    expect(m.askFor.failures.map((f) => f.reply)).toEqual([["accountId", "errorMessage"], []]);
  });
});

describe("askFor with the structured askedFor field", () => {
  it("trusts the field when present and flags when it disagrees with the text", () => {
    const m = score([
      // Field and text agree.
      result("needs_info", "needs_info", { askFor: ["accountId"], missing: ["accountId"], askedFor: ["accountId"], reply: "Please send your account ID (Settings > Account, it starts with acct_)." }),
      // A paraphrase the phrase check would miss: the field still scores it, and the disagreement is counted.
      result("needs_info", "needs_info", { askFor: ["timestamp"], missing: ["timestamp"], askedFor: ["timestamp"], reply: "What time did this start for you?" }),
      // An older run with no field falls back to the phrase check.
      result("needs_info", "needs_info", { askFor: ["accountId"], missing: ["accountId"], reply: "Please send your account ID (Settings > Account, it starts with acct_)." }),
    ]);
    expect(m.askFor).toMatchObject({ n: 3, replyExact: 3, fieldTextMismatch: 1 });
  });
});
