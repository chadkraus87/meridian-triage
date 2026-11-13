import { readFileSync } from "node:fs";
import path from "node:path";
import { loadArticles, loadTickets, type Split } from "./data";
import type { Metrics } from "./eval/score";
import type { Trace } from "./pipeline";
import type { Article, Ticket } from "./types";

/**
 * Data for the website. Everything comes from recorded runs in results/, read at build
 * time, so the hosted site makes no model calls and needs no API key.
 */

export interface RunSummary {
  id: string;
  file: string;
  createdAt: string;
  split: Split;
  mode: "stub" | "live";
  model?: string;
  complete?: boolean;
  metrics: Omit<Metrics, "misses">;
}

export interface Run extends RunSummary {
  metrics: Metrics;
  traces: Trace[];
}

export interface InboxItem {
  ticket: Ticket;
  trace: Trace;
  split: Split;
  runId: string;
}

const root = process.cwd();
const memo = <T>(fn: () => T) => {
  let value: T | undefined;
  return () => (value ??= fn());
};

export const runHistory = memo(
  (): RunSummary[] => JSON.parse(readFileSync(path.join(root, "results", "index.json"), "utf8")),
);

/** The most recent complete live run over the whole split (spot checks on a few tickets don't count). */
export function latestFullRun(split: Split): Run {
  const size = loadTickets(split).length;
  const summary = runHistory()
    .filter((r) => r.split === split && r.mode === "live" && r.complete !== false && r.metrics.n === size)
    .at(-1);
  if (!summary) throw new Error(`No complete live run for the ${split} split in results/index.json`);
  // Scoped to results/runs so the bundler traces only that folder, not the whole project.
  return JSON.parse(readFileSync(path.join(root, "results", "runs", path.basename(summary.file)), "utf8"));
}

export const heldOutRun = memo(() => latestFullRun("test"));
export const devRun = memo(() => latestFullRun("dev"));

/** Held-out tickets first: those are the results the site reports. */
export const inbox = memo((): InboxItem[] =>
  (["test", "dev"] as const).flatMap((split) => {
    const run = split === "test" ? heldOutRun() : devRun();
    const traces = new Map(run.traces.map((t) => [t.ticketId, t]));
    return loadTickets(split).map((ticket) => ({ ticket, trace: traces.get(ticket.id)!, split, runId: run.id }));
  }),
);

export const inboxItem = (id: string) => inbox().find((i) => i.ticket.id === id);

export const articles = memo((): Article[] => loadArticles());
export const article = (id: string) => articles().find((a) => a.id === id);
