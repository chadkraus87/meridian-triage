import type { Decision, DetailKey } from "@/lib/types";

export const DECISION_LABEL: Record<Decision, string> = {
  resolve: "Resolve",
  needs_info: "Needs info",
  escalate: "Escalate",
};

const DECISION_STYLE: Record<Decision, string> = {
  resolve: "bg-ok-dim text-ok border-ok/40",
  needs_info: "bg-warn-dim text-warn border-warn/40",
  escalate: "bg-crit-dim text-crit border-crit/40",
};

/** Colour plus a text label, so meaning never depends on colour alone. */
export function DecisionBadge({ decision, size = "sm" }: { decision: Decision; size?: "sm" | "lg" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${DECISION_STYLE[decision]} ${
        size === "lg" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs"
      }`}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {DECISION_LABEL[decision]}
    </span>
  );
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
        : "border-line bg-surface-3 text-ink-2";
  return <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs ${style}`}>{children}</span>;
}

export const pct = (x: number | null) => (x === null ? "n/a" : `${(x * 100).toFixed(1)}%`);
export const usd = (x: number, digits = 3) => `$${x.toFixed(digits)}`;
