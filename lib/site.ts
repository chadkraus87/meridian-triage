import { readdirSync, readFileSync } from "node:fs";
import { z } from "zod";
import path from "node:path";
import { loadArticles, loadTickets, type Split } from "./data";
import type { Metrics } from "./eval/score";
import type { Trace } from "./pipeline";
import { TechOpsTicketSchema, type TechOpsTicket } from "./techops";
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

export type InboxSet = Split | "techops";

export interface InboxItem {
  /** Labels exist for the dev and test sets; TechOps tickets have a source and no labels. */
  ticket: Omit<Ticket, "labels"> & { labels?: Ticket["labels"]; source?: TechOpsTicket["source"] };
  trace: Trace;
  split: InboxSet;
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

export const techopsTickets = memo((): TechOpsTicket[] =>
  z.array(TechOpsTicketSchema).parse(JSON.parse(readFileSync(path.join(root, "data", "techops", "tickets.json"), "utf8"))),
);

/** The latest recorded triage of the TechOps tickets (not an eval run, so not in index.json). */
export const techopsRun = memo((): { id: string; createdAt: string; traces: Trace[] } => {
  const file = readdirSync(path.join(root, "results", "runs"))
    .filter((f) => f.endsWith("-techops-live.json"))
    .sort()
    .at(-1);
  if (!file) throw new Error("No recorded TechOps run in results/runs. Run npm run triage:techops.");
  return JSON.parse(readFileSync(path.join(root, "results", "runs", file), "utf8"));
});

/** Held-out tickets first: those are the results the site reports. */
export const inbox = memo((): InboxItem[] => {
  const scored = (["test", "dev"] as const).flatMap((split) => {
    const run = split === "test" ? heldOutRun() : devRun();
    const traces = new Map(run.traces.map((t) => [t.ticketId, t]));
    return loadTickets(split).map((ticket) => ({ ticket, trace: traces.get(ticket.id)!, split, runId: run.id }));
  });
  const run = techopsRun();
  const traces = new Map(run.traces.map((t) => [t.ticketId, t]));
  const techops = techopsTickets().map((ticket) => ({ ticket, trace: traces.get(ticket.id)!, split: "techops" as const, runId: run.id }));
  return [...scored, ...techops];
});

/** TechOps links to /techops/<scenario>/<n>; this finds the Meridian ticket for it. */
export const techopsTicketFor = (scenarioId: string, templateNumber: number) =>
  techopsTickets().find((t) => t.source.scenarioId === scenarioId && t.source.templateNumber === templateNumber);

export const inboxItem = (id: string) => inbox().find((i) => i.ticket.id === id);

export const articles = memo((): Article[] => loadArticles());
export const article = (id: string) => articles().find((a) => a.id === id);
