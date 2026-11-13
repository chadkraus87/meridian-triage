import Link from "next/link";
import { DecisionBadge, pct } from "@/components/ui";
import { heldOutRun } from "@/lib/site";

export default function InboxHome() {
  const m = heldOutRun().metrics;
  return (
    <div className="panel p-6 sm:p-8">
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Support inbox</h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-ink-2">
        These are support tickets for Vantimere Cloud, a made-up SaaS company. For each one, the agent classifies it, finds
        help-center articles, drafts a reply, and recommends a decision. A rules engine you can read makes the final call,
        and a person approves every reply before anything would go out. Nothing is ever sent.
      </p>
      <p className="mt-3 max-w-2xl leading-relaxed text-ink-2">
        Pick a ticket to see each step: what the checks found, which articles came back, what the model suggested, which
        rule decided, and the draft reply.
      </p>
      <p className="mt-3 max-w-2xl leading-relaxed text-ink-2">
        The From TechOps tab holds tickets from the outage scenarios in TechOps Command Center, the incident simulator set at
        the same company. They go through the same agent but have no answer key, so they aren&apos;t scored.
      </p>

      <dl className="mt-6 grid max-w-2xl gap-2 text-sm text-ink-2 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-x-3">
        {(
          [
            ["resolve", "An article answers it."],
            ["needs_info", "Ask the customer for specific missing details."],
            ["escalate", "Engineering needs to act. Comes with a bug report."],
          ] as const
        ).map(([d, text]) => (
          <div key={d} className="contents">
            <dt>
              <DecisionBadge decision={d} />
            </dt>
            <dd className="mb-2 sm:mb-0">{text}</dd>
          </div>
        ))}
      </dl>

      <dl className="mt-8 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-surface-2 p-4">
          <dt className="case-label">Escalation recall</dt>
          <dd className="mt-1 font-serif text-3xl font-semibold tabular-nums">{pct(m.escalation.recall)}</dd>
        </div>
        <div className="rounded-lg border border-line bg-surface-2 p-4">
          <dt className="case-label">Decision accuracy</dt>
          <dd className="mt-1 font-serif text-3xl font-semibold tabular-nums">{pct(m.decision.accuracy)}</dd>
        </div>
        <div className="rounded-lg border border-line bg-surface-2 p-4">
          <dt className="case-label">Tickets</dt>
          <dd className="mt-1 font-serif text-3xl font-semibold tabular-nums">{m.n}</dd>
        </div>
      </dl>
      <p className="mt-3 text-sm text-ink-3">
        On the held-out test set, run once after tuning on the dev set.{" "}
        <Link href="/results" className="text-ink-2 underline underline-offset-2 hover:text-ink">
          Full results and the caveats
        </Link>
      </p>
    </div>
  );
}
