import { RESOLVE_MIN_SCORE } from "./config";
import { ASK_PHRASES } from "./prompts";
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

/** A failed model call. Carries the tokens it used, so failed calls still count toward cost. */
export class ModelCallError extends Error {
  constructor(
    message: string,
    readonly usage: Usage,
  ) {
    super(message);
  }
}

const NO_USAGE: Usage = { inputTokens: 0, outputTokens: 0, latencyMs: 0 };

function guessCategory(text: string, s: ReturnType<typeof detectSignals>): Category {
  if (s.security.length) return "security";
  if (/\b(outage|is down|are down|all requests|everything is failing|completely down|unavailable)\b/i.test(text)) return "outage";
  // A server error is evidence of a defect, whatever topic words (invoice, billing) are nearby.
  if (/\b5\d{2}\b|internal[_ ]error|internal server error/i.test(text)) return "defect";
  if (/\b(invoice|refund|charged?|billing|payment|vat|credit card|subscription|downgrade|upgrade)\b/i.test(text)) return "billing";
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
  async draft(ticket, _retrieved, articles, d, assessment) {
    const title = (id: string) => articles.find((a) => a.id === id)?.title ?? id;
    const ask = ASK_PHRASES;
    const hi = `Hi ${ticket.customer.company} team,\n\n`;
    // Ask for exactly what is missing. If nothing is, ask for nothing and say who follows up.
    const asks = d.missingDetails.length
      ? `\n\nSo we can move faster, please send:\n${d.missingDetails.map((k) => `- ${ask[k]}`).join("\n")}`
      : "";
    const owner = assessment.category === "billing" ? "Our billing team" : "A support engineer";
    const reply =
      d.decision === "resolve"
        ? `${hi}This is covered in [${d.resolveArticle}] ${title(d.resolveArticle!)}. Please follow the steps there and reply if it doesn't fix it.`
        : d.decision === "escalate"
          ? `${hi}Thanks for the report. We are escalating this to our engineering team and will update you as soon as we know more.${asks}`
          : asks
            ? `${hi}Thanks for reaching out.${asks}`
            : `${hi}Thanks for reaching out. ${owner} will review this and follow up with you directly.`;
    return {
      usage: NO_USAGE,
      value: {
        reply,
        askedFor: d.missingDetails,
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
