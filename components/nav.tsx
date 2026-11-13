"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Inbox", active: (p: string) => p === "/" || p.startsWith("/tickets") },
  { href: "/results", label: "Results", active: (p: string) => p.startsWith("/results") },
  { href: "/how-it-works", label: "How it works", active: (p: string) => p.startsWith("/how-it-works") },
];

/** Folder tabs: the active tab joins the page below it. */
export function Nav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="-mb-px">
      <ul className="flex gap-1">
        {LINKS.map((l) => {
          const active = l.active(pathname);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`block rounded-t border px-4 py-2 text-sm transition-colors ${
                  active
                    ? "border-line border-b-void bg-void font-medium text-ink"
                    : "border-transparent text-ink-3 hover:border-line hover:bg-surface-2 hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
