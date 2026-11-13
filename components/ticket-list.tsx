"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Decision } from "@/lib/types";
import { DecisionBadge } from "./ui";

export interface ListItem {
  id: string;
  subject: string;
  company: string;
  tier: string;
  decision: Decision;
  /** null when the ticket has no answer key (TechOps). */
  correct: boolean | null;
  split: "test" | "dev" | "techops";
}

const SPLITS = [
  { key: "test", label: "Held-out", hint: "Never tuned on" },
  { key: "dev", label: "Dev", hint: "Used for tuning" },
  { key: "techops", label: "TechOps", hint: "Not scored" },
] as const;

export function TicketList({ items }: { items: ListItem[] }) {
  const pathname = usePathname();
  const activeId = pathname.startsWith("/tickets/") ? decodeURIComponent(pathname.split("/")[2]) : null;
  const [split, setSplit] = useState<ListItem["split"]>(() =>
    activeId ? (items.find((i) => i.id === activeId)?.split ?? "test") : "test",
  );
  const shown = items.filter((i) => i.split === split);

  return (
    // On small screens the list gives way to the open ticket; the ticket page links back.
    <div className={`${activeId ? "hidden lg:block" : ""} panel overflow-hidden`}>
      <div role="group" aria-label="Ticket set" className="grid grid-cols-3 gap-1 border-b border-line p-2">
        {SPLITS.map((s) => {
          const count = items.filter((i) => i.split === s.key).length;
          return (
            <button
              key={s.key}
              type="button"
              aria-pressed={split === s.key}
              onClick={() => setSplit(s.key)}
              className={`rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                split === s.key ? "bg-surface-3 text-ink" : "text-ink-3 hover:bg-surface-2 hover:text-ink-2"
              }`}
            >
              <span className="block font-medium">
                {s.label} <span className="text-ink-4">({count})</span>
              </span>
              <span className="block text-xs text-ink-4">{s.hint}</span>
            </button>
          );
        })}
      </div>
      <ul className="max-h-[70vh] overflow-y-auto lg:max-h-[calc(100vh-14rem)]" aria-label={`${SPLITS.find((s) => s.key === split)!.label} tickets`}>
        {shown.map((t) => {
          const active = t.id === activeId;
          return (
            <li key={t.id} className="border-b border-line-soft [contain-intrinsic-size:auto_5rem] [content-visibility:auto] last:border-b-0">
              <Link
                href={`/tickets/${t.id}`}
                aria-current={active ? "page" : undefined}
                className={`block border-l-2 px-3 py-2.5 transition-colors ${active ? "border-accent bg-surface-3" : "border-transparent hover:bg-surface-2"}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span translate="no" className="font-mono text-xs text-ink-3">
                    {t.id}
                  </span>
                  <DecisionBadge decision={t.decision} />
                </span>
                <span className="mt-1 block truncate text-sm text-ink">{t.subject}</span>
                <span className="mt-0.5 flex items-center justify-between gap-2 text-xs text-ink-3">
                  <span className="min-w-0 truncate">
                    {t.company} · {t.tier}
                  </span>
                  {t.correct === false && <span className="shrink-0 text-warn">Differs from label</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
