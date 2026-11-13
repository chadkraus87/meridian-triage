import type { Decision, DetailKey } from "@/lib/types";

export const DECISION_LABEL: Record<Decision, string> = {
  resolve: "Resolve",
  needs_info: "Needs info",
  escalate: "Escalate",
};

const DECISION_INK: Record<Decision, string> = {
  resolve: "text-ok",
  needs_info: "text-warn",
  escalate: "text-crit",
};

const DECISION_STYLE: Record<Decision, string> = {
  resolve: "bg-ok-dim text-ok border-ok/50",
  needs_info: "bg-warn-dim text-warn border-warn/50",
  escalate: "bg-crit-dim text-crit border-crit/50",
};

/** A small typed ink mark. Colour plus a text label, so meaning never depends on colour alone. */
export function DecisionBadge({ decision }: { decision: Decision }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-1.5 py-px font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] ${DECISION_STYLE[decision]}`}
    >
      {DECISION_LABEL[decision]}
    </span>
  );
}

/** The final decision, rubber-stamped onto the case file. */
export function Stamp({ decision }: { decision: Decision }) {
  return <span className={`stamp ${DECISION_INK[decision]}`}>{DECISION_LABEL[decision]}</span>;
}

export const CATEGORY_LABEL: Record<string, string> = {
  how_to: "How-to",
  configuration: "Configuration",
  defect: "Defect",
  outage: "Outage",
  security: "Security",
  billing: "Billing",
};

export const AREA_LABEL: Record<string, string> = {
  sso: "SSO",
  api: "API",
  webhooks: "Webhooks",
  dns_domains: "DNS and domains",
  billing: "Billing",
  user_management: "User management",
  platform: "Platform",
};

export const DETAIL_LABEL: Record<DetailKey, string> = {
  accountId: "Account ID",
  errorMessage: "Error message",
  steps: "Steps to reproduce",
  timestamp: "When it happened",
};

export function Tag({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "accent" | "info" }) {
  const style =
    tone === "accent"
      ? "border-accent/40 bg-accent-dim text-accent"
      : tone === "info"
        ? "border-info/40 bg-info-dim text-info"
        : "border-line bg-surface-2 text-ink-2";
  return <span className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs ${style}`}>{children}</span>;
}

export const pct = (x: number | null) => (x === null ? "n/a" : `${(x * 100).toFixed(1)}%`);
export const usd = (x: number, digits = 3) => `$${x.toFixed(digits)}`;

/** A typed form field: small label, value on a dotted rule. */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field-rule min-w-0">
      <dt className="case-label">{label}</dt>
      <dd className="mt-0.5 break-words text-ink">{children}</dd>
    </div>
  );
}

/** Section heading in the serif, with an optional typed kicker above it. */
export function SectionTitle({ id, kicker, children }: { id?: string; kicker?: string; children: React.ReactNode }) {
  return (
    <div>
      {kicker && <p className="case-label">{kicker}</p>}
      <h2 id={id} className="font-serif text-xl font-semibold tracking-tight text-ink">
        {children}
      </h2>
    </div>
  );
}
