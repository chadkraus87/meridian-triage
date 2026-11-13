import { TicketList, type ListItem } from "@/components/ticket-list";
import { inbox } from "@/lib/site";

export default function InboxLayout({ children }: { children: React.ReactNode }) {
  const items: ListItem[] = inbox().map(({ ticket, trace, split }) => ({
    id: ticket.id,
    subject: ticket.subject,
    company: ticket.customer.company,
    tier: ticket.customer.tier,
    decision: trace.decision.decision,
    // TechOps tickets have no answer key, so there is nothing to differ from.
    correct: ticket.labels ? trace.decision.decision === ticket.labels.decision : null,
    split,
  }));
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[22rem_1fr]">
      <TicketList items={items} />
      {/* Intro or ticket first on small screens; the list sits beside it on large ones. */}
      <div className="order-first min-w-0 lg:order-none">{children}</div>
    </div>
  );
}
