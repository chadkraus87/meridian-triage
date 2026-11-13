import { z } from "zod";
import { TicketSchema } from "./types";

/**
 * Tickets imported from TechOps Command Center, the incident simulator set at the same
 * fictional company. They have no labels: they are a demo set, never part of the eval.
 */

export const TechOpsSourceSchema = z.strictObject({
  scenarioId: z.string().min(1),
  scenarioTitle: z.string().min(1),
  /** 1-based, matching the link TechOps builds: /techops/<scenarioId>/<templateNumber>. */
  templateNumber: z.int().min(1),
  priority: z.string().min(1),
  affectedService: z.string().min(1),
});

export const TechOpsTicketSchema = TicketSchema.omit({ labels: true }).extend({ source: TechOpsSourceSchema });
export type TechOpsTicket = z.infer<typeof TechOpsTicketSchema>;

/** The parts of a TechOps scenario the import reads. */
export interface TechOpsScenario {
  id: string;
  title: string;
  ticketTemplates: { subject: string; body: string; priority: string; affectedService: string }[];
}

const REAL_DOMAINS = /meridiancloud\.io|meridian\.io\b/i;

/**
 * Convert TechOps scenario ticket templates into Switchboard tickets, MT-3001 upward.
 * TechOps incidents hit many customers at once, so each ticket counts the other
 * templates in its scenario as other accounts reporting. TechOps has no plan tiers,
 * so every ticket is on the pro plan.
 */
export function fromTechOps(scenarios: TechOpsScenario[], companies: string[]): TechOpsTicket[] {
  let n = 0;
  return scenarios.flatMap((s) =>
    s.ticketTemplates.map((t, i) => {
      const text = `${t.subject}\n${t.body}`;
      if (REAL_DOMAINS.test(text)) throw new Error(`${s.id} template ${i + 1} names a real domain; fix it in TechOps first`);
      n += 1;
      return TechOpsTicketSchema.parse({
        id: `MT-${3000 + n}`,
        subject: t.subject,
        body: t.body,
        customer: { company: companies[(n - 1) % companies.length], tier: "pro" },
        contactCount: 1,
        otherAccountsReporting: s.ticketTemplates.length - 1,
        createdAt: "2026-11-13T12:00:00Z",
        source: { scenarioId: s.id, scenarioTitle: s.title, templateNumber: i + 1, priority: t.priority, affectedService: t.affectedService },
      });
    }),
  );
}
