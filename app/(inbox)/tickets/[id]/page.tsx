import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReviewButtons } from "@/components/review-buttons";
import { AREA_LABEL, CATEGORY_LABEL, DecisionBadge, DETAIL_LABEL, Tag, usd } from "@/components/ui";
import { RULES } from "@/lib/rules";
import { article, inbox, inboxItem } from "@/lib/site";
import type { DetailKey } from "@/lib/types";

// Every ticket ID is prerendered by generateStaticParams, so params are awaited at the top:
// the full ticket is in the static HTML. An unknown ID renders the not-found page via notFound().
// Awaiting params inside Suspense instead would stream the ticket in after the shell, which
// only helps routes with unlisted params. instant = false turns off that dev-time check here.
export const instant = false;
export function generateStaticParams() {
  return inbox().map((i) => ({ id: i.ticket.id }));
}

export async function generateMetadata({ params }: PageProps<"/tickets/[id]">): Promise<Metadata> {
  const { id } = await params;
  const item = inboxItem(id);
  return { title: item ? `${id}: ${item.ticket.subject}` : id };
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="panel p-5">
      <h2 className="flex items-baseline gap-3 text-base font-semibold">
        <span className="font-mono text-sm text-ink-4">Step {n}</span>
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink-2">{children}</div>
    </li>
  );
}

function YesNo({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-baseline gap-2">
      <span aria-hidden className={on ? "text-ok" : "text-ink-4"}>
        {on ? "●" : "○"}
      </span>
      <span className={on ? "text-ink" : "text-ink-3"}>
        {children}
        <span className="sr-only">{on ? ": yes" : ": no"}</span>
      </span>
    </li>
  );
}

const DETAILS: DetailKey[] = ["accountId", "errorMessage", "steps", "timestamp"];

export default async function TicketPage({ params }: PageProps<"/tickets/[id]">) {
  const { id } = await params;
  const item = inboxItem(id);
  if (!item) notFound();
  const { ticket: t, trace, split } = item;
  const { assessment: a, decision: d, signals: s } = trace;
  const labels = t.labels;
  const source = t.source;
  const matches = new Map(a.articleMatches.map((m) => [m.id, m.confidence]));
  const asked = d.missingDetails;

  return (
    <article className="space-y-4">
      <Link href="/" className="inline-block text-sm text-ink-3 underline underline-offset-2 hover:text-ink lg:hidden">
        All tickets
      </Link>

      <header className="panel p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-ink-3">{t.id}</span>
          <Tag tone={split === "test" ? "accent" : split === "techops" ? "info" : "neutral"}>
            {split === "test" ? "Held-out test" : split === "techops" ? "From TechOps" : "Dev set"}
          </Tag>
          <Tag>{t.customer.tier} plan</Tag>
          {t.contactCount > 1 && <Tag>Contact #{t.contactCount} about this</Tag>}
          {t.otherAccountsReporting > 0 && <Tag tone="info">{t.otherAccountsReporting} other accounts reporting</Tag>}
        </div>
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-balance">{t.subject}</h1>
        <p className="mt-1 text-sm text-ink-3">From {t.customer.company}</p>
        <p className="preserve mt-4 leading-relaxed text-ink">{t.body}</p>
        {t.attachment && (
          <figure className="mt-4">
            <figcaption className="mb-1 text-xs text-ink-3">Attached {t.attachment.kind === "http" ? "request and response" : "log"}</figcaption>
            <pre className="preserve rounded-md border border-line bg-void p-3 font-mono text-xs text-ink-2">{t.attachment.content}</pre>
          </figure>
        )}
      </header>

      <ol className="space-y-4" aria-label="What the agent did">
        <Step n={1} title="Deterministic checks">
          <p>Keyword and pattern checks run on every ticket, whatever the model says. They read the full original text.</p>
          <dl className="grid gap-2 sm:grid-cols-3">
            {(
              [
                ["Security", s.security],
                ["Possible data loss", s.dataLoss],
                ["Prompt injection", s.injection],
              ] as const
            ).map(([label, hits]) => (
              <div key={label} className="rounded-md border border-line bg-surface-2 p-3">
                <dt className="text-xs text-ink-3">{label}</dt>
                <dd className={`mt-1 ${hits.length ? "text-crit" : "text-ink-3"}`}>
                  {hits.length ? hits.map((h) => `“${h}”`).join(", ") : "Nothing found"}
                </dd>
              </div>
            ))}
          </dl>
          <div>
            <p className="text-xs text-ink-3">Details found in the text</p>
            <ul className="mt-1 grid gap-1 sm:grid-cols-2">
              {DETAILS.map((k) => (
                <YesNo key={k} on={s.present[k]}>
                  {DETAIL_LABEL[k]}
                </YesNo>
              ))}
            </ul>
          </div>
          {trace.redacted.length > 0 && (
            <div className="rounded-md border border-warn/40 bg-warn-dim p-3 text-warn">
              <p className="font-medium">Left out before the model saw the ticket (suspected prompt injection):</p>
              <ul className="mt-1 list-disc pl-5">
                {trace.redacted.map((r) => (
                  <li key={r} className="preserve font-mono text-xs">
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Step>

        <Step n={2} title="Help-center articles retrieved">
          <p>BM25 keyword search over the 25 articles. The model then rates how well each one fits.</p>
          <ul className="space-y-2">
            {trace.retrieved.map((r, i) => {
              const art = article(r.id);
              const conf = matches.get(r.id) ?? "low";
              return (
                <li key={r.id} className="rounded-md border border-line bg-surface-2">
                  <details>
                    <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 rounded-md p-3 transition-colors hover:bg-surface-3">
                      <span className="font-mono text-xs text-ink-4">#{i + 1}</span>
                      <span className="font-mono text-xs text-ink-3">{r.id}</span>
                      <span className="text-ink">{r.title}</span>
                      <span className="ml-auto flex gap-2 text-xs">
                        <span className="text-ink-3">score {r.score}</span>
                        <Tag tone={conf === "high" ? "accent" : "neutral"}>model: {conf}</Tag>
                      </span>
                    </summary>
                    {art && <p className="preserve border-t border-line p-3 text-ink-2">{art.body}</p>}
                  </details>
                </li>
              );
            })}
          </ul>
        </Step>

        <Step n={3} title="Model's assessment">
          <dl className="grid gap-2 sm:grid-cols-4">
            {(
              [
                ["Category", CATEGORY_LABEL[a.category]],
                ["Severity", a.severity],
                ["Product area", AREA_LABEL[a.productArea]],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="rounded-md border border-line bg-surface-2 p-3">
                <dt className="text-xs text-ink-3">{k}</dt>
                <dd className="mt-1 capitalize text-ink">{v}</dd>
              </div>
            ))}
            <div className="rounded-md border border-line bg-surface-2 p-3">
              <dt className="text-xs text-ink-3">Suggests</dt>
              <dd className="mt-1">
                <DecisionBadge decision={a.suggestedDecision} />
              </dd>
            </div>
          </dl>
          <ul className="grid gap-1 sm:grid-cols-2">
            <YesNo on={a.signals.security}>Security issue</YesNo>
            <YesNo on={a.signals.dataLoss}>Possible data loss</YesNo>
            <YesNo on={a.signals.multiCustomerOutage}>Outage affecting many customers</YesNo>
            <YesNo on={a.signals.reproducible}>Reproducible</YesNo>
            <YesNo on={a.signals.injectionSuspected}>Prompt injection attempt</YesNo>
          </ul>
          <p className="text-ink">{a.rationale}</p>
          {trace.modelErrors.length > 0 && (
            <p className="rounded-md border border-warn/40 bg-warn-dim p-3 text-warn">
              A model call failed, so the rules-only fallback stood in: {trace.modelErrors.join("; ")}
            </p>
          )}
        </Step>

        <Step n={4} title="Final decision (rules engine)">
          <div className="flex flex-wrap items-center gap-3">
            <DecisionBadge decision={d.decision} size="lg" />
            <span className="font-mono text-xs text-ink-3">{d.ruleId}</span>
          </div>
          <p className="text-ink">{RULES[d.ruleId]}</p>
          {d.overrodeModel ? (
            <p className="rounded-md border border-info/40 bg-info-dim p-3 text-info">
              The rules overrode the model, which suggested {a.suggestedDecision.replace("_", " ")}.
            </p>
          ) : (
            <p>The rules agreed with the model&apos;s suggestion.</p>
          )}
          {d.evidence.length > 0 && (
            <ul className="list-disc space-y-1 pl-5">
              {d.evidence.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          {asked.length > 0 && <p>The reply asks for: {asked.map((k) => DETAIL_LABEL[k].toLowerCase()).join(", ")}.</p>}
        </Step>

        <Step n={5} title="Draft reply">
          {trace.guard.blocked && (
            <p className="rounded-md border border-crit/40 bg-crit-dim p-3 text-crit">
              The output guard blocked the draft: {trace.guard.reasons.join(", ")}.
            </p>
          )}
          <p className="preserve rounded-md border border-line bg-surface-2 p-4 leading-relaxed text-ink">{trace.reply}</p>
          <p className="text-xs text-ink-3">
            Cited:{" "}
            {trace.citations.cited.filter((c) => !trace.citations.removed.includes(c)).join(", ") || "none"}
            {trace.citations.removed.length > 0 &&
              `. Removed because they were not retrieved: ${trace.citations.removed.join(", ")}`}
          </p>
        </Step>

        {trace.bugReport && (
          <Step n={6} title="Bug report for Engineering">
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-ink-3">Summary</dt>
                <dd className="text-ink">{trace.bugReport.summary}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-3">Impact</dt>
                <dd className="text-ink">{trace.bugReport.impact}</dd>
              </div>
              {(
                [
                  ["Steps to reproduce", trace.bugReport.stepsToReproduce, true],
                  ["Evidence", trace.bugReport.evidence, false],
                  ["Already ruled out", trace.bugReport.ruledOut, false],
                ] as const
              ).map(([label, list, ordered]) => (
                <div key={label}>
                  <dt className="text-xs text-ink-3">{label}</dt>
                  <dd>
                    {list.length === 0 ? (
                      <span className="text-ink-3">None</span>
                    ) : ordered ? (
                      <ol className="list-decimal space-y-1 pl-5 text-ink">
                        {list.map((x) => (
                          <li key={x} className="preserve">{x}</li>
                        ))}
                      </ol>
                    ) : (
                      <ul className="list-disc space-y-1 pl-5 text-ink">
                        {list.map((x) => (
                          <li key={x} className={`preserve ${label === "Evidence" ? "font-mono text-xs" : ""}`}>
                            {x}
                          </li>
                        ))}
                      </ul>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </Step>
        )}
      </ol>

      <section className="panel p-5" aria-labelledby="review-heading">
        <h2 id="review-heading" className="text-base font-semibold">
          Human review
        </h2>
        <div className="mt-3">
          <ReviewButtons key={t.id} escalate={d.decision === "escalate"} />
        </div>
      </section>

      <section className="panel p-5" aria-labelledby="key-heading">
        {labels ? (
          <>
            <h2 id="key-heading" className="text-base font-semibold">
              Answer key
            </h2>
            <p className="mt-1 text-sm text-ink-3">The label this ticket was scored against, from the labeling guide.</p>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-4">
              {(
                [
                  ["Decision", labels.decision.replace("_", " "), d.decision === labels.decision],
                  ["Category", CATEGORY_LABEL[labels.category], a.category === labels.category],
                  ["Severity", labels.severity, a.severity === labels.severity],
                  ["Product area", AREA_LABEL[labels.productArea], a.productArea === labels.productArea],
                ] as const
              ).map(([k, v, ok]) => (
                <div key={k} className="rounded-md border border-line bg-surface-2 p-3">
                  <dt className="text-xs text-ink-3">{k}</dt>
                  <dd className="mt-1 capitalize text-ink">{v}</dd>
                  <dd className={`mt-1 text-xs ${ok ? "text-ok" : "text-warn"}`}>{ok ? "Agent matched" : "Agent differed"}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-sm text-ink-2">{labels.note}</p>
            {labels.askFor && (
              <p className="mt-1 text-sm text-ink-3">
                Should ask for: {labels.askFor.length ? labels.askFor.map((k) => DETAIL_LABEL[k].toLowerCase()).join(", ") : "nothing"}.
              </p>
            )}
          </>
        ) : source ? (
          <>
            <h2 id="key-heading" className="text-base font-semibold">
              From TechOps Command Center
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">
              This ticket comes from the {source.scenarioTitle} scenario in{" "}
              <a className="text-ink underline underline-offset-2" href="https://techops-command-center.vercel.app">
                TechOps Command Center
              </a>
              , the incident simulator set at the same fictional company. During that incident, {t.otherAccountsReporting} other
              accounts write in about the same problem, which is why the queue shows them as reporting it too.
            </p>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
              {(
                [
                  ["TechOps scenario", source.scenarioTitle],
                  ["TechOps priority", source.priority],
                  ["Affected service", source.affectedService],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="rounded-md border border-line bg-surface-2 p-3">
                  <dt className="text-xs text-ink-3">{k}</dt>
                  <dd className="mt-1 text-ink">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-sm text-ink-3">Not scored: TechOps tickets have no answer key, so they never count toward the results.</p>
          </>
        ) : null}
        <p className="mt-3 text-xs text-ink-4">
          Recorded run {item.runId}. {trace.usage.inputTokens.toLocaleString()} input and {trace.usage.outputTokens.toLocaleString()} output
          tokens, {usd(trace.usage.costUsd, 4)}, {(trace.usage.latencyMs / 1000).toFixed(1)} s across both model calls.
        </p>
      </section>
    </article>
  );
}
