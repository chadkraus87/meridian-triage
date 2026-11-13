import Link from "next/link";

export default function TicketNotFound() {
  return (
    <div className="panel p-6">
      <h1 className="text-xl font-semibold tracking-tight">Ticket not found</h1>
      <p className="mt-2 text-ink-2">There is no ticket with that ID. Ticket IDs look like MT-2001 (held-out test) or MT-1001 (dev).</p>
      <Link href="/" className="mt-4 inline-block text-ink underline underline-offset-2">
        Back to the inbox
      </Link>
    </div>
  );
}
