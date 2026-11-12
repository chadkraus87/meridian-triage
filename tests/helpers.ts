import type { Signals } from "../lib/signals";
import type { Assessment, Retrieved, TicketInput } from "../lib/types";

export function ticket(over: Partial<TicketInput> = {}): TicketInput {
  return {
    id: "MT-9001",
    subject: "Question",
    body: "Hello",
    customer: { company: "Example Co", tier: "pro" },
    contactCount: 1,
    otherAccountsReporting: 0,
    createdAt: "2026-10-01T10:00:00Z",
    ...over,
  };
}

export function signals(over: Partial<Signals> = {}): Signals {
  return {
    security: [],
    dataLoss: [],
    injection: [],
    present: { accountId: false, errorMessage: false, steps: false, timestamp: false },
    ...over,
  };
}

export function assessment(over: Partial<Assessment> = {}): Assessment {
  return {
    category: "how_to",
    severity: "low",
    productArea: "api",
    suggestedDecision: "resolve",
    signals: { security: false, dataLoss: false, multiCustomerOutage: false, reproducible: false, injectionSuspected: false },
    detailsPresent: { accountId: false, errorMessage: false, steps: false, timestamp: false },
    articleMatches: [{ id: "KB-006", confidence: "high" }],
    rationale: "test",
    ...over,
  };
}

/** A retrieved article scored well above the resolve threshold. */
export const strongHit: Retrieved[] = [{ id: "KB-006", title: "Create, scope, and rotate API keys", score: 40 }];
export const weakHit: Retrieved[] = [{ id: "KB-006", title: "Create, scope, and rotate API keys", score: 1 }];

export const allDetails = { accountId: true, errorMessage: true, steps: true, timestamp: true };
