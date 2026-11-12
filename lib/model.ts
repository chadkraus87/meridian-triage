import { RESOLVE_MIN_SCORE } from "./config";
import type { DecisionResult } from "./rules";
import { detectSignals, ticketText } from "./signals";
import type { Article, Assessment, Category, Draft, ProductArea, Retrieved, TicketInput, Usage } from "./types";

export interface ModelCall<T> {
  value: T;
  usage: Usage;
}

export interface ModelClient {
  name: string;
  assess(ticket: TicketInput, retrieved: Retrieved[], articles: Article[]): Promise<ModelCall<Assessment>>;
  draft(
    ticket: TicketInput,
    retrieved: Retrieved[],
    articles: Article[],
    decision: DecisionResult,
    assessment: Assessment,
  ): Promise<ModelCall<Draft>>;
}

const NO_USAGE: Usage = { inputTokens: 0, outputTokens: 0, latencyMs: 0 };

function guessCategory(text: string, s: ReturnType<typeof detectSignals>): Category {
  if (s.security.length) return "security";
  if (/\b(invoice|refund|charged?|billing|payment|vat|credit card|subscription|downgrade|upgrade)\b/i.test(text)) return "billing";
  if (/\b(outage|is down|are down|all requests|everything is failing|completely down|unavailable)\b/i.test(text)) return "outage";
  if (/\b(SAML_\w+|invalid_api_key|insufficient_scope|CERT_PENDING_CAA|pending verification|signature)\b|\b(401|403|429)\b/i.test(text))
    return "configuration";
  if (s.dataLoss.length || s.present.errorMessage) return "defect";
  return "how_to";
}

/**
 * Stub model: no API key, no network. It uses keyword heuristics plus BM25 scores and
 * always suggests "needs_info", so an eval run with it measures the rules engine on its own.
 * This is the "rules only" baseline, not a model.
 */
export const stubModel: ModelClient = {
  name: "stub",
  async assess(ticket, retrieved, articles) {
    const s = detectSignals(ticket);
    const category = guessCategory(ticketText(ticket), s);
    const top = articles.find((a) => a.id === retrieved[0]?.id);
    return {
      usage: NO_USAGE,
      value: {
        category,
        severity: category === "security" || category === "outage" || s.dataLoss.length ? "critical" : category === "defect" || category === "configuration" ? "medium" : "low",
        productArea: (top?.area as ProductArea | undefined) ?? "platform",
        suggestedDecision: "needs_info",
        signals: { security: false, dataLoss: false, multiCustomerOutage: false, reproducible: s.present.steps, injectionSuspected: false },
        detailsPresent: s.present,
        articleMatches: retrieved.map((r) => ({
          id: r.id,
          confidence: r.score >= RESOLVE_MIN_SCORE ? "high" : r.score >= RESOLVE_MIN_SCORE / 2 ? "medium" : "low",
        })),
        rationale: "Stub: keyword heuristics only.",
      },
    };
  },
  async draft(ticket, _retrieved, articles, d) {
    const title = (id: string) => articles.find((a) => a.id === id)?.title ?? id;
    const ask: Record<string, string> = {
      accountId: "your account ID (Settings > Account, it starts with acct_)",
      errorMessage: "the exact error message or HTTP status code you see",
      steps: "the steps that lead to the problem",
      timestamp: "when it happened, with time zone",
    };
    const reply =
      d.decision === "resolve"
        ? `Hi ${ticket.customer.company} team,\n\nThis is covered in [${d.resolveArticle}] ${title(d.resolveArticle!)}. Please follow the steps there and reply if it doesn't fix it.`
        : d.decision === "needs_info"
          ? `Hi ${ticket.customer.company} team,\n\nThanks for reaching out. So we can look into this, please send:\n${(d.missingDetails.length ? d.missingDetails.map((k) => ask[k]) : ["a short description of what you expected and what happened instead"]).map((x) => `- ${x}`).join("\n")}`
          : `Hi ${ticket.customer.company} team,\n\nThanks for the details. We are escalating this to our engineering team and will update you as soon as we know more.`;
    return {
      usage: NO_USAGE,
      value: {
        reply,
        bugReport:
          d.decision === "escalate"
            ? {
                summary: ticket.subject,
                impact: `${ticket.customer.tier} customer. ${d.reason}`,
                stepsToReproduce: ["See ticket body."],
                evidence: [...d.evidence, ...(ticket.attachment ? [ticket.attachment.content.split("\n").slice(0, 5).join("\n")] : [])],
                ruledOut: [],
              }
            : null,
      },
    };
  },
};
