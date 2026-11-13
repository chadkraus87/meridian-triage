import type { Metadata } from "next";
import Link from "next/link";
import { MISS_NOTES } from "@/content/miss-notes";
import { AREA_LABEL, CATEGORY_LABEL, DECISION_LABEL, DETAIL_LABEL, pct, usd } from "@/components/ui";
import { MODEL, MODEL_LABEL } from "@/lib/config";
import { heldOutRun, inbox, runHistory } from "@/lib/site";
import type { Decision } from "@/lib/types";

export const metadata: Metadata = { title: "Results" };

const DECISIONS: Decision[] = ["resolve", "needs_info", "escalate"];

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface-2 p-4">
      <dt className="case-label">{label}</dt>
      <dd className="mt-1 font-serif text-3xl font-semibold tabular-nums">{value}</dd>
      {note && <dd className="mt-1 text-xs text-ink-3">{note}</dd>}
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="panel p-5 sm:p-6">
      <h2 id={id} className="font-serif text-2xl font-semibold tracking-tight">
        {title}
      </h2>
      <div className="mt-4 text-sm leading-relaxed text-ink-2">{children}</div>
    </section>
  );
}

const date = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export default function ResultsPage() {
  const run = heldOutRun();
  const m = run.metrics;
  const heldOut = inbox().filter((i) => i.split === "test");
  const askFails = new Map(m.askFor.failures.map((f) => [f.id, f]));
  const maxCell = Math.max(...DECISIONS.flatMap((e) => DECISIONS.map((a) => m.decision.confusion[e][a])));

  // Every way each held-out ticket differed from its label, computed from the recorded run.
  const misses = heldOut
    .map(({ ticket, trace }) => {
      const l = ticket.labels!; // held-out tickets always carry labels
      const a = trace.assessment;
      const diffs: string[] = [];
      if (trace.decision.decision !== l.decision)
        diffs.push(`Decision: expected ${DECISION_LABEL[l.decision]}, decided ${DECISION_LABEL[trace.decision.decision]} (${trace.decision.ruleId})`);
      if (a.category !== l.category) diffs.push(`Category: expected ${CATEGORY_LABEL[l.category]}, said ${CATEGORY_LABEL[a.category]}`);
      if (a.severity !== l.severity) diffs.push(`Severity: expected ${l.severity}, said ${a.severity}`);
      if (a.productArea !== l.productArea)
        diffs.push(`Product area: expected ${AREA_LABEL[l.productArea]}, said ${AREA_LABEL[a.productArea]}`);
      const ask = askFails.get(ticket.id);
      if (ask) {
        const names = (xs: string[]) => (xs.length ? xs.map((k) => DETAIL_LABEL[k as keyof typeof DETAIL_LABEL].toLowerCase()).join(", ") : "nothing");
        diffs.push(`Asked for ${names(ask.reply)}; should have asked for ${names(ask.expected)}`);
      }
      return { id: ticket.id, subject: ticket.subject, diffs };
    })
    .filter((x) => x.diffs.length > 0);
  const decisionMisses = m.misses.length;

  const history = runHistory();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Results</h1>
        <p className="mt-2 max-w-3xl leading-relaxed text-ink-2">
          The held-out test set: {m.n} tickets that were never used for tuning, run once on {date(run.createdAt)} with{" "}
          {run.model === MODEL ? MODEL_LABEL : run.model}. Rules and prompts were tuned only on the 70-ticket dev set. The test file is frozen by checksum, and
          every label change is logged in the repository.
        </p>
      </header>

      <Section id="headline" title="Held-out numbers">
        <p className="mb-4">Escalation recall comes first: a missed escalation is the most expensive mistake.</p>
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Escalation recall" value={pct(m.escalation.recall)} note={`${m.escalation.tp} of ${m.escalation.tp + m.escalation.fn} escalations caught`} />
          <Stat label="Escalation precision" value={pct(m.escalation.precision)} note={`${m.escalation.fp} false escalations`} />
          <Stat label="Decision accuracy" value={pct(m.decision.accuracy)} note={`Model suggestion alone: ${pct(m.modelAlone.decisionAccuracy)}`} />
          <Stat label="Asked for exactly the missing details" value={`${m.askFor.replyExact}/${m.askFor.n}`} />
          <Stat label="Prompt injection" value={`${m.injection.passed}/${m.injection.n}`} note="passed" />
          <Stat label="Cost per ticket" value={usd(m.cost.perTicketUsd)} note={`${usd(m.cost.totalUsd, 2)} for the run`} />
          <Stat label="Latency" value={`${(m.latency.meanMs / 1000).toFixed(1)} s`} note={`p95 ${(m.latency.p95Ms / 1000).toFixed(1)} s, two model calls`} />
          <Stat label="Category / severity / area" value={`${Math.round(m.category.accuracy * 100)} / ${Math.round(m.severity.accuracy * 100)} / ${Math.round(m.productArea.accuracy * 100)}`} note="percent correct" />
        </dl>
      </Section>

      <Section id="matrix" title="Confusion matrix">
        <div className="overflow-x-auto">
          <table className="min-w-[28rem] border-separate border-spacing-1 text-center tabular-nums">
            <caption className="mb-2 text-left text-ink-3">Rows are the label. Columns are what the agent decided.</caption>
            <thead>
              <tr>
                <td />
                {DECISIONS.map((d) => (
                  <th key={d} scope="col" className="px-3 py-2 font-medium text-ink-2">
                    Decided: {DECISION_LABEL[d]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DECISIONS.map((e) => (
                <tr key={e}>
                  <th scope="row" className="px-3 py-2 text-left font-medium text-ink-2">
                    Label: {DECISION_LABEL[e]}
                  </th>
                  {DECISIONS.map((a) => {
                    const v = m.decision.confusion[e][a];
                    const correct = e === a;
                    return (
                      <td
                        key={a}
                        className={`rounded-md px-3 py-3 text-base ${v === 0 ? "text-ink-4" : correct ? "text-ink" : "text-crit"}`}
                        style={{
                          background:
                            v === 0
                              ? "var(--color-surface-2)"
                              : `color-mix(in oklab, ${correct ? "var(--color-ok)" : "var(--color-crit)"} ${Math.round(15 + (45 * v) / maxCell)}%, var(--color-surface-2))`,
                        }}
                      >
                        {v}
                        <span className="sr-only">{correct ? " correct" : " wrong"}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="overrides" title="When the rules overrode the model">
        <p>
          The rules engine overrode the model&apos;s suggestion {m.overrides.count} time{m.overrides.count === 1 ? "" : "s"} (
          {pct(m.overrides.rate)} of tickets). {m.overrides.correct} of those overrides were right, and {m.overrides.harmful} made a
          correct suggestion wrong. On their own, the model&apos;s suggestions got {pct(m.modelAlone.decisionAccuracy)} of decisions
          right; with the rules in charge, {pct(m.decision.accuracy)}.
        </p>
      </Section>

      <Section id="misses" title="Every miss">
        <p className="mb-4">
          {decisionMisses === 0
            ? "No decision was wrong on the held-out set. These are every other way a ticket differed from its label."
            : `${decisionMisses} decision${decisionMisses === 1 ? " was" : "s were"} wrong. Below is every way a ticket differed from its label.`}
        </p>
        <ul className="space-y-3">
          {misses.map((x) => (
            <li key={x.id} className="rounded-md border border-line bg-surface-2 p-4">
              <Link href={`/tickets/${x.id}`} className="font-medium text-ink underline-offset-2 hover:underline">
                <span className="font-mono text-xs text-ink-3">{x.id}</span> {x.subject}
              </Link>
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-ink-2">
                {x.diffs.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
              <p className="mt-2 text-ink">{MISS_NOTES[x.id] ?? "No explanation written for this miss yet."}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4">
          Citations: {pct(m.citations.onlyRetrievedRate)} of replies cited only articles that were retrieved. Retrieval found an
          expected article for {pct(m.citations.retrievalRecall)} of tickets that have one.
        </p>
      </Section>

      <Section id="caveats" title="Read these numbers with care">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Thirty tickets is a small sample. A perfect score on 30 is consistent with a true accuracy of roughly 90% or higher.
            It doesn&apos;t prove 100%.
          </li>
          <li>
            The tickets and labels were written by Claude from a written labeling guide, and the agent also runs on Claude. They
            may share blind spots, which can make agreement look better than it is.
          </li>
          <li>
            These numbers can&apos;t be used for further tuning. Any fix made because of a test-set miss needs a fresh held-out set
            to measure honestly.
          </li>
        </ul>
      </Section>

      <Section id="history" title="Run history">
        <p className="mb-4">
          Every recorded run, oldest first. Stub runs replace the model with keyword rules, so they measure the rules engine on
          its own. Partial runs were short checks on a few tickets.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-left tabular-nums">
            <thead className="text-ink-3">
              <tr className="border-b border-line">
                {["Date", "Set", "Model", "Tickets", "Escalation recall", "Escalation precision", "Decision accuracy", "Asked for missing details", "Cost"].map((h) => (
                  <th key={h} scope="col" className="px-2 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((r) => {
                const isHeldOut = r.split === "test";
                return (
                  <tr key={r.id} className={`border-b border-line-soft ${isHeldOut ? "bg-accent-dim text-ink" : ""}`}>
                    <td className="px-2 py-2 whitespace-nowrap">{date(r.createdAt)}</td>
                    <td className="px-2 py-2">{isHeldOut ? "Held-out test" : "Dev"}</td>
                    <td className="px-2 py-2">{r.mode === "stub" ? "Rules only (stub)" : r.model === MODEL ? MODEL_LABEL : (r.model ?? "live")}</td>
                    <td className="px-2 py-2">{r.metrics.n}</td>
                    <td className="px-2 py-2">{pct(r.metrics.escalation.recall)}</td>
                    <td className="px-2 py-2">{pct(r.metrics.escalation.precision)}</td>
                    <td className="px-2 py-2">{pct(r.metrics.decision.accuracy)}</td>
                    <td className="px-2 py-2">{r.metrics.askFor ? `${r.metrics.askFor.replyExact}/${r.metrics.askFor.n}` : "n/a"}</td>
                    <td className="px-2 py-2">{usd(r.metrics.cost.totalUsd, 2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
