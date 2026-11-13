import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { TicketSchema, type Article, type Ticket } from "./types";

const ROOT = path.join(process.cwd(), "data");

export function parseArticle(text: string): Article {
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error("article is missing frontmatter");
  const meta = Object.fromEntries(
    m[1].split("\n").map((line) => {
      const i = line.indexOf(":");
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    }),
  );
  if (!meta.id || !meta.title || !meta.area) throw new Error(`article frontmatter needs id, title, area: ${m[1]}`);
  return {
    id: meta.id,
    title: meta.title,
    area: meta.area,
    tags: (meta.tags ?? "").split(",").map((t: string) => t.trim()).filter(Boolean),
    body: m[2].trim(),
  };
}

export function loadArticles(): Article[] {
  const dir = path.join(process.cwd(), "data", "help-center");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => parseArticle(readFileSync(path.join(process.cwd(), "data", "help-center", f), "utf8")));
}

export type Split = "dev" | "test";

export function loadTickets(split: Split): Ticket[] {
  const raw = JSON.parse(readFileSync(path.join(ROOT, "tickets", `${split}.json`), "utf8"));
  return z.array(TicketSchema).parse(raw);
}

/** Strip labels so the agent can never see them. */
export function withoutLabels({ labels: _labels, ...input }: Ticket) {
  return input;
}
