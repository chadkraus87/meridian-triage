import { DATA_LOSS_DETAILS, KNOWN_ISSUE_ARTICLES, REQUIRED_DETAILS, RESOLVE_MIN_SCORE } from "./config";
import type { Signals } from "./signals";
import type { Assessment, Decision, DetailKey, Retrieved, TicketInput } from "./types";

/**
 * The rules engine. The model proposes; this decides.
 * Rules run in order and the first match wins. The order mirrors the decision
 * procedure in docs/labeling-guide.md.
 */

export const RULES = {
  "R1-SECURITY": "Security issues always escalate.",
  "R2-DATA-LOSS": "Possible data loss always escalates.",
  "R3-MULTI-CUSTOMER-OUTAGE": "An outage affecting multiple customers always escalates.",
  "R4-REPEAT-CONTACT": "A third contact about the same issue escalates.",
  "R5-KNOWN-ISSUE": "A known issue with a documented workaround resolves with the workaround article.",
  "R6-ENTERPRISE-DEFECT": "An urgent, reproducible defect from an enterprise customer escalates.",
  "R7-MISSING-DETAILS": "Key details are missing from a defect or configuration report, so ask for exactly those.",
  "R8-DEFECT": "Any outage escalates now, without waiting for details. A defect escalates once it has the required details.",
  "R9-RESOLVE-KB": "A how-to, configuration, or billing issue with a high-confidence article match resolves.",
  "R9-INJECTION-BLOCK": "The ticket would resolve, but it contains a prompt-injection attempt, so it never auto-resolves.",
  "R10-FALLBACK": "No rule could resolve or escalate it, so ask the customer for more information.",
} as const;

export type RuleId = keyof typeof RULES;

export interface RuleInput {
  ticket: TicketInput;
  signals: Signals;
  assessment: Assessment;
  retrieved: Retrieved[];
}

export interface DecisionResult {
  decision: Decision;
  ruleId: RuleId;
  /** Plain-language reason, shown in the UI and the eval output. */
  reason: string;
  /** Facts that led to the decision, with where each came from. */
  evidence: string[];
  modelSuggestion: Decision;
  overrodeModel: boolean;
  /** Details the reply must ask for. Empty on resolve. Escalations ask for what's missing in the same reply. */
  missingDetails: DetailKey[];
  /** The article that justified resolve, if any. */
  resolveArticle: string | null;
}

/**
 * An article counts as a confident match only if both the model and BM25 agree.
 * BM25 agrees when the article ranks first, or scores at least RESOLVE_MIN_SCORE.
 * Raw BM25 scores grow with ticket length, so a short ticket ("where is my invoice?")
 * scores low even when its best article is a clear match; rank doesn't have that bias.
 */
function confidentArticles(a: Assessment, retrieved: Retrieved[]): string[] {
  const bm25Agrees = (id: string) =>
    retrieved[0]?.id === id || (retrieved.find((r) => r.id === id)?.score ?? 0) >= RESOLVE_MIN_SCORE;
  return a.articleMatches.filter((m) => m.confidence === "high" && bm25Agrees(m.id)).map((m) => m.id);
}

export function decide({ ticket, signals, assessment: a, retrieved }: RuleInput): DecisionResult {
  const evidence: string[] = [];
  const quote = (xs: string[]) => xs.map((x) => `"${x}"`).join(", ");

  const security = signals.security.length > 0 || a.signals.security || a.category === "security";
  if (signals.security.length) evidence.push(`Security keywords matched: ${quote(signals.security)}`);
  if (a.signals.security || a.category === "security") evidence.push("Model flagged a security issue");

  const dataLoss = signals.dataLoss.length > 0 || a.signals.dataLoss;
  if (signals.dataLoss.length) evidence.push(`Data-loss keywords matched: ${quote(signals.dataLoss)}`);
  if (a.signals.dataLoss) evidence.push("Model flagged possible data loss");

  const multiOutage = ticket.otherAccountsReporting >= 2 || a.signals.multiCustomerOutage;
  if (ticket.otherAccountsReporting >= 2) evidence.push(`${ticket.otherAccountsReporting} other accounts reporting the same issue`);
  if (a.signals.multiCustomerOutage) evidence.push("Model flagged an outage affecting multiple customers");

  const injection = signals.injection.length > 0 || a.signals.injectionSuspected;
  if (signals.injection.length) evidence.push(`Prompt-injection patterns matched: ${quote(signals.injection)}`);
  if (a.signals.injectionSuspected) evidence.push("Model flagged a prompt-injection attempt");

  const isMissing = (k: DetailKey) => !signals.present[k] && !a.detailsPresent[k];
  const missingDetails = REQUIRED_DETAILS[a.category].filter(isMissing);
  const confident = confidentArticles(a, retrieved);
  const knownIssue = confident.find((id) => KNOWN_ISSUE_ARTICLES.includes(id)) ?? null;
  const kbMatch = confident[0] ?? null;

  const result = (decision: Decision, ruleId: RuleId, resolveArticle: string | null = null, asks = missingDetails): DecisionResult => ({
    decision,
    ruleId,
    reason: RULES[ruleId],
    evidence,
    modelSuggestion: a.suggestedDecision,
    overrodeModel: decision !== a.suggestedDecision,
    missingDetails: decision === "resolve" ? [] : asks,
    resolveArticle,
  });

  if (security) return result("escalate", "R1-SECURITY");
  if (dataLoss) return result("escalate", "R2-DATA-LOSS", null, DATA_LOSS_DETAILS.filter(isMissing));
  // An outage escalation asks only what's needed to find the customer and the time window,
  // whatever category the model gave the ticket. Steps to reproduce don't apply mid-outage.
  if (multiOutage) return result("escalate", "R3-MULTI-CUSTOMER-OUTAGE", null, REQUIRED_DETAILS.outage.filter(isMissing));
  if (ticket.contactCount >= 3) {
    evidence.push(`Contact number ${ticket.contactCount} about this issue`);
    return result("escalate", "R4-REPEAT-CONTACT");
  }
  // Injection blocks every path to resolve, not only R9.
  if (knownIssue && !injection) {
    evidence.push(`Known issue ${knownIssue} matched with high confidence`);
    return result("resolve", "R5-KNOWN-ISSUE", knownIssue);
  }
  if (
    ticket.customer.tier === "enterprise" &&
    (a.severity === "high" || a.severity === "critical") &&
    a.category === "defect" &&
    a.signals.reproducible
  ) {
    evidence.push(`Enterprise customer, ${a.severity} severity, reproducible defect`);
    return result("escalate", "R6-ENTERPRISE-DEFECT");
  }
  // We don't make a customer wait during an outage while we collect details.
  if (missingDetails.length && a.category !== "outage") {
    evidence.push(`Missing for a ${a.category} report: ${missingDetails.join(", ")}`);
    return result("needs_info", "R7-MISSING-DETAILS");
  }
  if (a.category === "defect" || a.category === "outage") {
    evidence.push(
      missingDetails.length ? `Outage: escalating now and asking for ${missingDetails.join(", ")}` : `${a.category} with all required details`,
    );
    return result("escalate", "R8-DEFECT");
  }
  if (kbMatch && (a.category === "how_to" || a.category === "configuration" || a.category === "billing")) {
    if (injection) return result("needs_info", "R9-INJECTION-BLOCK");
    evidence.push(`${kbMatch} matched with high confidence`);
    return result("resolve", "R9-RESOLVE-KB", kbMatch);
  }
  evidence.push(kbMatch ? `Category ${a.category} is not resolvable from an article` : "No article matched with high confidence");
  return result("needs_info", "R10-FALLBACK");
}
