import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import Link from "next/link";
import { Nav } from "@/components/nav";
import "./globals.css";

const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], axes: ["opsz", "SOFT"] });
const plexSans = IBM_Plex_Sans({ variable: "--font-plex-sans", subsets: ["latin"], weight: ["400", "500", "600"] });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: { default: "Switchboard", template: "%s | Switchboard" },
  description:
    "An AI support-ticket triage agent with an evaluation suite. The model proposes; a rules engine decides. All data is synthetic.",
};

export const viewport: Viewport = { themeColor: "#efe9dc", colorScheme: "light" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fraunces.variable} ${plexSans.variable} ${plexMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <header className="border-b border-line">
          <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-x-6 gap-y-3 px-4 pt-6 sm:px-6">
            <Link href="/" className="group pb-3">
              <span className="case-label block">Vantimere Cloud · Support desk</span>
              <span translate="no" className="mt-1 block font-serif text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                Switchboard
              </span>
              <span className="mt-1 block text-sm text-ink-3">AI ticket triage, with the rules in charge</span>
            </Link>
            <Nav />
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
          {children}
        </main>
        <footer className="border-t border-line">
          <div className="mx-auto max-w-7xl px-4 py-6 text-sm leading-relaxed text-ink-3 sm:px-6">
            <p className="case-label mb-2">Note on the record</p>
            <p className="max-w-3xl">
              All data here is synthetic. Vantimere Cloud, its customers, and every ticket are made up, and nothing is based on
              any real company, customer, or employer. The hosted site replays recorded runs, so no model is called when you
              visit. Vantimere Cloud also appears in{" "}
              <a className="text-accent underline underline-offset-2 hover:text-ink" href="https://github.com/chadkraus87/techops-command-center">
                TechOps Command Center
              </a>
              .
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
