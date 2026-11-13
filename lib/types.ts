import { z } from "zod";

export const Decision = z.enum(["resolve", "needs_info", "escalate"]);
export const Category = z.enum(["how_to", "configuration", "defect", "outage", "security", "billing"]);
export const Severity = z.enum(["low", "medium", "high", "critical"]);
export const ProductArea = z.enum(["sso", "api", "webhooks", "dns_domains", "billing", "user_management", "platform"]);
export const Tier = z.enum(["free", "pro", "enterprise"]);
export const DetailKey = z.enum(["accountId", "errorMessage", "steps", "timestamp"]);
export const Tag = z.enum([
  "injection",
  "angry",
  "duplicate",
  "vague",
  "multi_customer",
  "known_issue",
  "data_loss",
  "security",
  "enterprise_urgent",
]);

export type Decision = z.infer<typeof Decision>;
export type Category = z.infer<typeof Category>;
export type Severity = z.infer<typeof Severity>;
export type ProductArea = z.infer<typeof ProductArea>;
export type DetailKey = z.infer<typeof DetailKey>;

const articleId = z.string().regex(/^KB-\d{3}$/);

export const TicketSchema = z.strictObject({
  id: z.string().regex(/^MT-\d{4}$/),
  subject: z.string().min(1),
  body: z.string().min(1),
  customer: z.strictObject({ company: z.string().min(1), tier: Tier }),
  contactCount: z.int().min(1),
  otherAccountsReporting: z.int().min(0),
  attachment: z.strictObject({ kind: z.enum(["log", "http"]), content: z.string().min(1) }).optional(),
  createdAt: z.iso.datetime(),
  labels: z.strictObject({
    decision: Decision,
    category: Category,
    severity: Severity,
    productArea: ProductArea,
    expectedArticles: z.array(articleId),
    tags: z.array(Tag).optional(),
    mustNotContain: z.array(z.string().min(1)).optional(),
    /** Details the reply must ask for: required on needs_info and escalate, absent on resolve. */
    askFor: z.array(DetailKey).optional(),
    note: z.string().min(1),
  }).refine((l) => (l.decision === "resolve") === (l.askFor === undefined), {
    message: "askFor is required on needs_info and escalate tickets and must be absent on resolve tickets",
  }),
});

export type Ticket = z.infer<typeof TicketSchema>;
/** What the agent is allowed to see: the ticket without its labels. */
export type TicketInput = Omit<Ticket, "labels">;

export interface Article {
  id: string;
  title: string;
  area: string;
  tags: string[];
  body: string;
}

export interface Retrieved {
  id: string;
  title: string;
  score: number;
}

/** Model call 1: classification and signals. The rules engine makes the decision. */
export const AssessmentSchema = z.object({
  category: Category,
  severity: Severity,
  productArea: ProductArea,
  suggestedDecision: Decision,
  signals: z.object({
    security: z.boolean(),
    dataLoss: z.boolean(),
    multiCustomerOutage: z.boolean(),
    reproducible: z.boolean(),
    injectionSuspected: z.boolean(),
  }),
  detailsPresent: z.object({
    accountId: z.boolean(),
    errorMessage: z.boolean(),
    steps: z.boolean(),
    timestamp: z.boolean(),
  }),
  articleMatches: z.array(z.object({ id: articleId, confidence: z.enum(["high", "medium", "low"]) })),
  rationale: z.string(),
});
export type Assessment = z.infer<typeof AssessmentSchema>;

export const BugReportSchema = z.object({
  summary: z.string(),
  impact: z.string(),
  stepsToReproduce: z.array(z.string()),
  evidence: z.array(z.string()),
  ruledOut: z.array(z.string()),
});
export type BugReport = z.infer<typeof BugReportSchema>;

/** Model call 2: the reply for the final decision, plus a bug report when escalating. */
export const DraftSchema = z.object({
  reply: z.string(),
  bugReport: BugReportSchema.nullable(),
});
export type Draft = z.infer<typeof DraftSchema>;

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}
