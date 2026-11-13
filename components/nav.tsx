"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Inbox", active: (p: string) => p === "/" || p.startsWith("/tickets") },
  { href: "/results", label: "Results", active: (p: string) => p.startsWith("/results") },
  { href: "/how-it-works", label: "How it works", active: (p: string) => p.startsWith("/how-it-works") },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main">
      <ul className="flex gap-1">
        {LINKS.map((l) => {
          const active = l.active(pathname);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                  active ? "bg-surface-3 text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
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
