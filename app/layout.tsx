import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Nav } from "@/components/nav";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Switchboard", template: "%s | Switchboard" },
  description:
    "An AI support-ticket triage agent with an evaluation suite. The model proposes; a rules engine decides. All data is synthetic.",
};

export const viewport: Viewport = { themeColor: "#05070b", colorScheme: "dark" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface-3 focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <header className="border-b border-line bg-surface-2">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <Link href="/" className="flex items-baseline gap-2">
              <span translate="no" className="font-semibold tracking-tight">
                Switchboard
              </span>
              <span className="hidden text-sm text-ink-3 sm:inline">AI ticket triage, with the rules in charge</span>
            </Link>
            <Nav />
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
          {children}
        </main>
        <footer className="border-t border-line">
          <div className="mx-auto max-w-7xl px-4 py-5 text-sm text-ink-3 sm:px-6">
            All data here is synthetic. Vantimere Cloud, its customers, and every ticket are made up, and nothing is based on
            any real company, customer, or employer. The hosted site replays recorded runs, so no model is called when you
            visit. Vantimere Cloud also appears in{" "}
            <a className="text-ink-2 underline underline-offset-2 hover:text-ink" href="https://github.com/chadkraus87/techops-command-center">
              TechOps Command Center
            </a>
            .
          </div>
        </footer>
      </body>
    </html>
  );
}
