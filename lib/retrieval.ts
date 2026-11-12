import type { Article, Retrieved } from "./types";

const STOP = new Set(
  "a an and are as at be but by can do for from has have i if in is it its me my of on or our so that the their them then there this to was we were what when where which will with you your not no just get got".split(
    " ",
  ),
);

// ponytail: crude plural stripping instead of a real stemmer; swap in Porter if retrieval misses on word forms.
function stem(w: string): string {
  return w.length > 4 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w;
}

export function tokenize(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.toLowerCase().match(/[a-z0-9_]+/g) ?? []) {
    const parts = raw.includes("_") ? [raw, ...raw.split("_")] : [raw];
    for (const p of parts) if (p.length > 1 && !STOP.has(p)) out.push(stem(p));
  }
  return out;
}

export interface Bm25Index {
  articles: Article[];
  docs: Map<string, number>[];
  lengths: number[];
  avgLength: number;
  df: Map<string, number>;
}

export function buildIndex(articles: Article[]): Bm25Index {
  const docs = articles.map((a) => {
    // Title counts twice: it is the strongest summary of what the article covers.
    const tf = new Map<string, number>();
    for (const t of tokenize(`${a.title} ${a.title} ${a.tags.join(" ")} ${a.body}`)) tf.set(t, (tf.get(t) ?? 0) + 1);
    return tf;
  });
  const lengths = docs.map((d) => [...d.values()].reduce((s, n) => s + n, 0));
  const df = new Map<string, number>();
  for (const d of docs) for (const t of d.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  return { articles, docs, lengths, avgLength: lengths.reduce((s, n) => s + n, 0) / lengths.length, df };
}

export function search(index: Bm25Index, query: string, k: number, k1 = 1.2, b = 0.75): Retrieved[] {
  const n = index.articles.length;
  const terms = new Set(tokenize(query));
  return index.articles
    .map((a, i) => {
      let score = 0;
      for (const t of terms) {
        const tf = index.docs[i].get(t);
        if (!tf) continue;
        const df = index.df.get(t)!;
        const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
        score += (idf * tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * index.lengths[i]) / index.avgLength));
      }
      return { id: a.id, title: a.title, score: Math.round(score * 100) / 100 };
    })
    .filter((r) => r.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, k);
}
