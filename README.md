# Meridian Triage

An AI support-ticket triage agent with a real evaluation suite. For each ticket it classifies the issue, retrieves help-center articles, drafts a reply that cites only those articles, and recommends **resolve**, **needs info**, or **escalate**. Escalations come with a Jira-ready bug report. A person approves every reply and escalation, and nothing is ever sent anywhere.

**All data in this project is synthetic.** Meridian Cloud, its customers, its help center, and every ticket are made up. Nothing is based on any real company, customer, person, or any employer's product, tickets, or data. Meridian Cloud is the same fictional company as in [TechOps Command Center](https://github.com/chadkraus87/techops-command-center).

**Live demo: [meridian-triage.vercel.app](https://meridian-triage.vercel.app)** (replays recorded runs, so it needs no API key and makes no model calls)

![Ticket view: a compromised-key report with a hidden instruction, escalated by the security rule](docs/screenshots/ticket-escalation.png)

## The design rule

The model is never the last line of defense. It proposes. A rules engine you can read and test ([lib/rules.ts](lib/rules.ts)) makes the final decision and records which rule decided and why.

- Security issues, possible data loss, and outages affecting multiple customers always escalate, whatever the model says. Keyword detectors ([lib/signals.ts](lib/signals.ts)) run on every ticket alongside the model, so a model that has been talked out of escalating is still overruled.
- An urgent, reproducible defect from an enterprise customer escalates, and so does a third contact about the same issue.
- If key details are missing, the reply asks for exactly those. During an outage it escalates right away and asks in the same reply.
- Resolve is only allowed when a retrieved article matches with high confidence and the issue looks like configuration, not a defect.
- Ticket text is untrusted. Text the injection detector flags is left out before the model sees the ticket, and an output guard ([lib/guard.ts](lib/guard.ts)) blocks any reply that claims an action the agent can't take, such as a refund.

## Results

On the held-out test set: 30 tickets that were never used for tuning, run once after tuning on the 70-ticket dev set.

| Metric | Held-out test |
|---|---|
| Escalation recall | 100% (13 of 13) |
| Escalation precision | 100% (no false escalations) |
| Decision accuracy | 100% (model's suggestion alone: 96.7%) |
| Category / severity / product area | 86.7% / 90.0% / 96.7% |
| Reply asked for exactly the missing details | 18 of 21 |
| Prompt-injection tickets passed | 2 of 2 |
| Cost per ticket | $0.027 |
| Latency (two model calls) | 6.8 s mean, 9.3 s p95 |

On the dev set, the rules-only baseline (no model) caught 50% of escalations. The untuned model run caught all of them with 94.3% decision accuracy, and tuning brought that to 100%. Every run is kept in [results/index.json](results/index.json).

Read these numbers with care. Thirty tickets is a small sample: a perfect score is consistent with a true accuracy of roughly 90% or higher, not proof of 100%. The tickets and labels were written by Claude from a written guide, and the agent also runs on Claude, so they may share blind spots. The site's "What it gets wrong" section covers the misses in detail.

## How a ticket flows

1. **Deterministic checks**: security, data loss, prompt injection, and which key details are present.
2. **Injection filter**: flagged text is left out of everything downstream.
3. **Retrieval**: BM25 over 25 help-center articles, top 5.
4. **Model call 1**: Claude Sonnet 5.5 classifies the ticket, flags signals, rates each article, and suggests a decision (structured JSON, validated against a schema).
5. **Rules engine**: the final decision, the rule that made it, and the details the reply must ask for.
6. **Model call 2**: the reply for the final decision, plus a bug report when escalating.
7. **Output checks**: citations to articles that weren't retrieved are stripped; the guard blocks forbidden claims.
8. **Human review**: approve or reject.

If a model call fails or is refused, a rules-only fallback stands in for that call, so the rules engine still decides. The failure is recorded.

## The website

| Inbox | Results | How it works |
|---|---|---|
| ![Inbox](docs/screenshots/inbox.png) | ![Results](docs/screenshots/results.png) | ![How it works](docs/screenshots/how-it-works.png) |

- **Inbox**: all 100 tickets with the agent's work step by step, the rule that decided, the draft reply, the bug report, Approve and Reject buttons (local state only), and the answer key it was scored against.
- **Results**: the held-out numbers, confusion matrix, override stats, every miss with an explanation, and the run history.
- **How it works**: the design rule, the flow, the rules generated from the engine itself, and what it gets wrong.

The hosted site replays recorded runs from `results/`. It makes no model calls and needs no API key.

## How it was evaluated

- **Labels** follow a written policy: [docs/labeling-guide.md](docs/labeling-guide.md). The rules engine follows the same policy, and every label change is logged with a reason in [docs/label-changes.md](docs/label-changes.md).
- **Split**: 70 dev tickets for tuning, 30 held-out tickets. Tuning happened on dev only. The test file was reviewed once, frozen by checksum (a test fails if it changes, locally and in CI), and run once.
- **Metrics**: escalation recall first, then escalation precision, decision accuracy with a confusion matrix, classification accuracy, citation checks, rule overrides (and whether each was right), prompt-injection results, whether each reply asked for exactly the missing details, cost, and latency. The scoring code is in [lib/eval/score.ts](lib/eval/score.ts).
- **Cost control**: every live run prints an estimate first, has a hard per-call token cap, and stops before it can spend more than $5.

## Running it

```bash
npm install
```

```bash
npm test
```

```bash
npm run eval -- --split dev --mode stub
```

```bash
npm run dev
```

Stub mode needs no API key: it replaces the model with keyword heuristics, so it measures the rules engine on its own. For live runs, copy `.env.example` to `.env.local` and add an Anthropic API key, then estimate before you spend:

```bash
npm run eval -- --split dev --mode live --estimate
```

```bash
npm run eval -- --split dev --mode live
```

The test split refuses to run without `--final`, because it is meant to run once.

End-to-end tests (Playwright) build the site and walk through the inbox, a ticket, the review buttons, the results page, and how it works:

```bash
npm run e2e
```

## Project layout

```
data/help-center/      25 synthetic help-center articles
data/tickets/          dev.json (70), test.json (30, frozen), test.json.sha256
docs/                  labeling guide, label change log, screenshots
lib/signals.ts         deterministic detectors and injection redaction
lib/retrieval.ts       BM25
lib/rules.ts           the rules engine
lib/claude.ts          model client (structured output, refusal fallback)
lib/prompts.ts         the two prompts
lib/pipeline.ts        one ticket, end to end
lib/guard.ts           output guard
lib/eval/score.ts      metrics
scripts/eval.mts       eval CLI
results/               every recorded run and the run history
app/                   the website (Next.js App Router)
tests/, e2e/           Vitest and Playwright
```

## Built with

Next.js (App Router), React, TypeScript in strict mode, Tailwind, Vitest, Playwright, GitHub Actions, Vercel, and the Claude API (Claude Sonnet 5.5) through the Anthropic SDK.

## About

I'm Chad Kraus, a Network IT Specialist in Austin, Texas. I own Tier 2/3 escalations across customer networks, SSO and APIs, and I'm the main link between Support and Engineering. I reproduce an issue before I escalate it, and when a tool would save the team time, I build it.

* Portfolio: [chad-kraus-portfolio.vercel.app](https://chad-kraus-portfolio.vercel.app/)
* LinkedIn: [in/chadwick-kraus](https://www.linkedin.com/in/chadwick-kraus/)
* Also on GitHub: [TechOps Command Center](https://github.com/chadkraus87/techops-command-center), an incident-response simulator set at the same fictional company
