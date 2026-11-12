# Meridian Triage

An AI ticket-triage agent with an evaluation suite. For each support ticket it classifies the issue, retrieves help-center articles, drafts a reply that cites only those articles, and recommends **resolve**, **needs info**, or **escalate**. Escalations come with a Jira-ready bug report.

**All data in this project is synthetic.** Meridian Cloud, its customers, its help center, and every ticket are made up. Nothing is based on any real company, customer, person, or any employer's product, tickets, or data.

## The design rule

The model is never the last line of defense. It proposes; a deterministic rules engine ([lib/rules.ts](lib/rules.ts)) makes the final decision and records which rule decided and why. Security issues, possible data loss, and outages affecting multiple customers always escalate, whatever the model says. Keyword detectors ([lib/signals.ts](lib/signals.ts)) run on every ticket alongside the model, so a model that has been talked out of escalating is still overruled. Ticket text is treated as untrusted input, and an output guard ([lib/guard.ts](lib/guard.ts)) blocks replies that claim an action the agent can't take, such as a refund.

A person approves every reply and escalation. Nothing is ever sent anywhere.

## How a ticket flows

1. Deterministic signals: security, data loss, prompt injection, and which key details are present.
2. Retrieval: BM25 over 25 help-center articles.
3. Model call 1: category, severity, product area, signals, and article confidence.
4. Rules engine: the final decision.
5. Model call 2: a reply for the final decision, plus a bug report when escalating.
6. Citation check and output guard.

The labeling policy is in [docs/labeling-guide.md](docs/labeling-guide.md). The labels and the rules follow the same written policy.

## Running it

```bash
npm install
npm test
npm run eval -- --split dev --mode stub
```

Stub mode needs no API key. It replaces the model with keyword heuristics, so it measures the rules engine on its own (the "rules only" baseline). Live mode with the Claude API arrives in Phase 2.

Results are saved to `results/runs/` and the run history to `results/index.json`.

## Data

- 25 help-center articles in `data/help-center/`
- 70 dev tickets in `data/tickets/dev.json`, used for tuning
- 30 held-out test tickets in `data/tickets/test.json`, never used for tuning and reported separately
