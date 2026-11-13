import { afterAll, describe, expect, it } from "vitest";
import { RESOLVE_MIN_SCORE } from "../lib/config";
import { decide, RULES, type RuleInput } from "../lib/rules";
import { allDetails, assessment, signals, strongHit, ticket, weakHit } from "./helpers";

const reached = new Set<string>();
function run(input: Partial<RuleInput>) {
  const d = decide({ ticket: ticket(), signals: signals(), assessment: assessment(), retrieved: strongHit, ...input });
  reached.add(d.ruleId);
  return d;
}

afterAll(() => {
  // Every rule in the engine must be exercised by at least one test.
  expect([...reached].sort()).toEqual(Object.keys(RULES).sort());
});

describe("R1 security", () => {
  it("escalates on a keyword match even when the model says it is a harmless how-to", () => {
    const d = run({ signals: signals({ security: ["another company's invoices"] }) });
    expect(d).toMatchObject({ decision: "escalate", ruleId: "R1-SECURITY", modelSuggestion: "resolve", overrodeModel: true });
    expect(d.evidence.join(" ")).toContain("another company's invoices");
  });

  it("escalates when only the model flags security", () => {
    expect(run({ assessment: assessment({ signals: { ...assessment().signals, security: true } }) }).ruleId).toBe("R1-SECURITY");
  });

  it("escalates when the model categorizes it as security", () => {
    expect(run({ assessment: assessment({ category: "security" }) }).ruleId).toBe("R1-SECURITY");
  });

  it("outranks every later rule, including a known-issue resolve", () => {
    const d = run({
      ticket: ticket({ contactCount: 5 }),
      signals: signals({ security: ["xss"] }),
      assessment: assessment({ articleMatches: [{ id: "KB-024", confidence: "high" }] }),
      retrieved: [{ id: "KB-024", title: "Known issue", score: 40 }],
    });
    expect(d.ruleId).toBe("R1-SECURITY");
  });
});

describe("R2 data loss", () => {
  it("escalates on a keyword match", () => {
    expect(run({ signals: signals({ dataLoss: ["records are missing"] }) })).toMatchObject({ decision: "escalate", ruleId: "R2-DATA-LOSS" });
  });
  it("escalates when only the model flags it", () => {
    expect(run({ assessment: assessment({ signals: { ...assessment().signals, dataLoss: true } }) }).ruleId).toBe("R2-DATA-LOSS");
  });
  it("asks only for the account ID and time, never for steps, even on a defect", () => {
    const d = run({
      signals: signals({ dataLoss: ["records are missing"], present: { accountId: true, errorMessage: false, steps: false, timestamp: false } }),
      assessment: assessment({ category: "defect" }),
    });
    expect(d.missingDetails).toEqual(["timestamp"]);
  });
});

describe("R3 multi-customer outage", () => {
  it("escalates when 2 or more other accounts report the same issue", () => {
    expect(run({ ticket: ticket({ otherAccountsReporting: 2 }) })).toMatchObject({ decision: "escalate", ruleId: "R3-MULTI-CUSTOMER-OUTAGE" });
  });
  it("does not fire for a single other account", () => {
    expect(run({ ticket: ticket({ otherAccountsReporting: 1 }) }).ruleId).not.toBe("R3-MULTI-CUSTOMER-OUTAGE");
  });
  it("escalates when the model sees evidence of many customers affected", () => {
    const a = assessment({ signals: { ...assessment().signals, multiCustomerOutage: true } });
    expect(run({ assessment: a }).ruleId).toBe("R3-MULTI-CUSTOMER-OUTAGE");
  });
});

describe("R4 repeat contact", () => {
  it("escalates on the third contact", () => {
    expect(run({ ticket: ticket({ contactCount: 3 }) })).toMatchObject({ decision: "escalate", ruleId: "R4-REPEAT-CONTACT" });
  });
  it("does not escalate on the second contact", () => {
    expect(run({ ticket: ticket({ contactCount: 2 }) }).decision).toBe("resolve");
  });
});

describe("R5 known issue", () => {
  const known = { assessment: assessment({ category: "defect", articleMatches: [{ id: "KB-025", confidence: "high" as const }] }) };
  it("resolves with the workaround article when it matches with high confidence", () => {
    const d = run({ ...known, retrieved: [{ id: "KB-025", title: "Known issue", score: RESOLVE_MIN_SCORE }] });
    expect(d).toMatchObject({ decision: "resolve", ruleId: "R5-KNOWN-ISSUE", resolveArticle: "KB-025" });
  });
  it("never resolves a known issue when the ticket contains a prompt injection", () => {
    const d = run({
      ...known,
      signals: signals({ injection: ["note to the assistant"] }),
      retrieved: [{ id: "KB-025", title: "Known issue", score: 40 }],
    });
    expect(d.decision).not.toBe("resolve");
  });
  it("does not fire when the BM25 score is below the threshold", () => {
    const d = run({
      ...known,
      retrieved: [
        { id: "KB-014", title: "5xx errors", score: 30 },
        { id: "KB-025", title: "Known issue", score: RESOLVE_MIN_SCORE - 0.01 },
      ],
    });
    expect(d.ruleId).not.toBe("R5-KNOWN-ISSUE");
  });
});

describe("R6 enterprise defect", () => {
  const urgent = assessment({ category: "defect", severity: "high", suggestedDecision: "needs_info", signals: { ...assessment().signals, reproducible: true } });
  it("escalates an urgent reproducible enterprise defect even with details missing", () => {
    const d = run({ ticket: ticket({ customer: { company: "X", tier: "enterprise" } }), assessment: urgent });
    // The escalation still asks for what's missing, in the same reply.
    expect(d).toMatchObject({ decision: "escalate", ruleId: "R6-ENTERPRISE-DEFECT", overrodeModel: true });
    expect(d.missingDetails).toEqual(["accountId", "errorMessage", "steps", "timestamp"]);
  });
  it("does not apply to a pro customer, who gets asked for the missing details", () => {
    expect(run({ assessment: urgent }).ruleId).toBe("R7-MISSING-DETAILS");
  });
  it("does not apply when severity is medium", () => {
    const d = run({ ticket: ticket({ customer: { company: "X", tier: "enterprise" } }), assessment: { ...urgent, severity: "medium" } });
    expect(d.ruleId).toBe("R7-MISSING-DETAILS");
  });
  it("does not apply when the defect is not reproducible", () => {
    const d = run({
      ticket: ticket({ customer: { company: "X", tier: "enterprise" } }),
      assessment: { ...urgent, signals: { ...urgent.signals, reproducible: false } },
    });
    expect(d.ruleId).toBe("R7-MISSING-DETAILS");
  });
});

describe("R7 missing details", () => {
  it("lists exactly the missing details for a defect", () => {
    const d = run({ assessment: assessment({ category: "defect", detailsPresent: { ...allDetails, accountId: false, timestamp: false } }) });
    expect(d).toMatchObject({ decision: "needs_info", ruleId: "R7-MISSING-DETAILS", missingDetails: ["accountId", "timestamp"] });
  });
  it("counts a detail as present when the regex finds it, even if the model missed it", () => {
    const d = run({
      signals: signals({ present: { accountId: true, errorMessage: false, steps: false, timestamp: false } }),
      assessment: assessment({ category: "defect", detailsPresent: { ...allDetails, accountId: false } }),
    });
    expect(d).toMatchObject({ ruleId: "R8-DEFECT", missingDetails: [] });
  });
  it("only needs the error message for a configuration problem", () => {
    const d = run({ assessment: assessment({ category: "configuration" }) });
    expect(d.missingDetails).toEqual(["errorMessage"]);
  });
  it("never asks how-to questions for details", () => {
    expect(run({ assessment: assessment({ category: "how_to" }) }).decision).toBe("resolve");
  });
});

describe("R8 outages and defects", () => {
  it("escalates an outage now, even with details missing, and keeps the list to ask for", () => {
    const d = run({ assessment: assessment({ category: "outage", suggestedDecision: "needs_info", detailsPresent: { ...allDetails, accountId: false } }) });
    expect(d).toMatchObject({ decision: "escalate", ruleId: "R8-DEFECT", missingDetails: ["accountId"], overrodeModel: true });
  });
  it("still sends a defect with details missing to needs_info", () => {
    expect(run({ assessment: assessment({ category: "defect", detailsPresent: { ...allDetails, steps: false } }) }).decision).toBe("needs_info");
  });
  it("never asks for details on a resolve", () => {
    expect(run({ assessment: assessment({ category: "configuration", detailsPresent: allDetails }) }).missingDetails).toEqual([]);
  });

  it("escalates a defect that has every required detail", () => {
    const d = run({ assessment: assessment({ category: "defect", detailsPresent: allDetails }) });
    expect(d).toMatchObject({ decision: "escalate", ruleId: "R8-DEFECT", overrodeModel: true });
  });
});

describe("R9 resolve from an article", () => {
  it("resolves a configuration problem with a confident match", () => {
    const d = run({ assessment: assessment({ category: "configuration", detailsPresent: allDetails }) });
    expect(d).toMatchObject({ decision: "resolve", ruleId: "R9-RESOLVE-KB", resolveArticle: "KB-006", overrodeModel: false });
  });
  it("resolves a short ticket whose top-ranked article scores below the floor", () => {
    const d = run({ retrieved: [{ id: "KB-006", title: "API keys", score: RESOLVE_MIN_SCORE / 3 }] });
    expect(d).toMatchObject({ decision: "resolve", ruleId: "R9-RESOLVE-KB" });
  });
  it("does not resolve when BM25 disagrees with the model's high confidence", () => {
    expect(run({ retrieved: weakHit }).ruleId).toBe("R10-FALLBACK");
  });
  it("does not resolve when the model's confidence is only medium", () => {
    expect(run({ assessment: assessment({ articleMatches: [{ id: "KB-006", confidence: "medium" }] }) }).ruleId).toBe("R10-FALLBACK");
  });
  it("never resolves a ticket with a prompt-injection pattern", () => {
    const d = run({ signals: signals({ injection: ["ignore your previous instructions"] }) });
    expect(d).toMatchObject({ decision: "needs_info", ruleId: "R9-INJECTION-BLOCK", overrodeModel: true });
  });
  it("never resolves when the model flags injection", () => {
    const a = assessment({ signals: { ...assessment().signals, injectionSuspected: true } });
    expect(run({ assessment: a }).ruleId).toBe("R9-INJECTION-BLOCK");
  });
});

describe("R10 fallback", () => {
  it("asks for more information when nothing matches", () => {
    const d = run({ assessment: assessment({ articleMatches: [] }), retrieved: [] });
    expect(d).toMatchObject({ decision: "needs_info", ruleId: "R10-FALLBACK", overrodeModel: true });
  });
});
