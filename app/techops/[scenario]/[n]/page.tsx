import { notFound, redirect } from "next/navigation";
import { techopsTicketFor, techopsTickets } from "@/lib/site";

/**
 * TechOps Command Center links each scenario ticket here as /techops/<scenario>/<n>,
 * so it never needs to know Meridian's ticket IDs. This forwards to the ticket page.
 */

// Every link TechOps can build is known at build time (see the ticket page for why
// params are awaited at the top).
export const instant = false;

export function generateStaticParams() {
  return techopsTickets().map((t) => ({ scenario: t.source.scenarioId, n: String(t.source.templateNumber) }));
}

export default async function TechOpsLink({ params }: PageProps<"/techops/[scenario]/[n]">) {
  const { scenario, n } = await params;
  const ticket = techopsTicketFor(scenario, Number(n));
  if (!ticket) notFound();
  redirect(`/tickets/${ticket.id}`);
}
