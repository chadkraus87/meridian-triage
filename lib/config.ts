import type { Category, DetailKey } from "./types";

/** The one place the model name lives. */
export const MODEL = "claude-sonnet-5-5";

/** USD per million tokens for MODEL. Check current pricing before quoting costs. */
export const PRICE_PER_MTOK = { input: 2, output: 10 };

/** How many articles retrieval returns. */
export const TOP_K = 3;

/** Minimum BM25 score before an article can justify "resolve". Tuned on the dev set only. */
export const RESOLVE_MIN_SCORE = 12;

/** Articles about known issues that already have a workaround and an Engineering owner. */
export const KNOWN_ISSUE_ARTICLES = ["KB-024", "KB-025"];

/** Details a problem report needs before support can act on it. Mirrors docs/labeling-guide.md. */
export const REQUIRED_DETAILS: Record<Category, DetailKey[]> = {
  defect: ["accountId", "errorMessage", "steps", "timestamp"],
  outage: ["accountId", "timestamp"],
  configuration: ["errorMessage"],
  how_to: [],
  billing: [],
  security: [],
};

/** A data-loss escalation asks only for what we need to find the data. Steps can come later from Engineering. */
export const DATA_LOSS_DETAILS: DetailKey[] = ["accountId", "timestamp"];
