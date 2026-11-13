import type { DetailKey, TicketInput } from "./types";

/**
 * Deterministic detectors. They run on every ticket regardless of what the model says,
 * so a model that has been talked out of escalating still gets overruled.
 * Each detector returns the phrases it matched, so the UI can show why.
 */

const SECURITY = [
  /\b(vulnerabilit(y|ies)|exploit(able)?|xss|cross[- ]site|sql injection|csrf|ssrf|idor|remote code execution|privilege escalation)\b/i,
  /\b(unauthori[sz]ed (access|login|sign[- ]?in)|account (takeover|compromise)|compromised|hacked|breach)\b/i,
  /\b(leak(ed|ing|s)?|expos(ed|es|ing))\b[^.\n]{0,60}\b(api key|key|token|secret|password|credential|personal data|pii)s?\b/i,
  /\b(see|sees|seeing|saw|seen|view(s|ed|ing)?|access(ed|ing)?|shows?|showed|shown|showing|visible|appear(s|ed|ing)?|returns?|returned|got|getting)\b[^.\n]{0,80}\b(another|other|different)\s+(company|customer|tenant|organi[sz]ation|workspace|account)('s)?\b/i,
  /\bsecurity (issue|bug|hole|concern|vulnerability|incident|problem)\b/i,
];

const DATA_LOSS = [
  /\b(data loss|lost (our |all |some )?(data|records|rows|files|entries))\b/i,
  /\bmissing (records|rows|data|files|entries)\b/i,
  /\b(records|rows|data|files|entries|projects?|apps?)\b[^.\n]{0,30}\b(are|is|went|have gone|has gone|have|has)\s+(missing|disappeared|vanished|gone|been wiped|been deleted)\b/i,
  /\b(disappeared|vanished|wiped|corrupt(ed|ion))\b/i,
  /\bdeleted (itself|themselves|on (its|their) own|without (us|anyone))\b/i,
];

const INJECTION = [
  /\b(ignore|disregard|forget|override)\b[^.\n]{0,40}\b(previous|prior|above|all|any|your|earlier|existing)\b[^.\n]{0,30}\b(instructions?|rules|prompts?|guidelines|policies)\b/i,
  /\b(system prompt|developer message|new instructions|hidden instructions?)\b/i,
  /<\/?\s*(system|instructions?|assistant)\s*>/i,
  /\b(do not|don't|dont|never)\s+escalate\b/i,
  /\b(mark|set|close)\s+(this|the)\s+(ticket|case|issue)\s+(as\s+)?(resolved|closed|solved)\b/i,
  /\b(note|message|instructions?)\s+(to|for)\s+(the\s+)?(ai|assistant|agent|bot|model|llm|triage)\b/i,
  /\b(you are now|as an ai|dear (ai|assistant|bot))\b/i,
  /\b(system|admin|administrator|security|trust (&|and) safety)\s+(notice|override|message|directive)\b/i,
  /\b(support|triage|helpdesk)\s+(ai|bot|assistant|model|llm)\b/i,
  /\byou are (now |hereby )?(authori[sz]ed|permitted|allowed|instructed)\s+to\b/i,
  /\b(do not|don't|dont|no need to)\s+(ask for|require|request|perform)\s+(any\s+)?verification\b/i,
];

const PRESENT: Record<DetailKey, RegExp[]> = {
  accountId: [/\bacct_[a-z0-9]{8}\b/i],
  timestamp: [
    /\b\d{4}-\d{2}-\d{2}\b/,
    /\b\d{1,2}:\d{2}(:\d{2})?\b/,
    /\b\d{1,2}\s?(am|pm)\b/i,
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(st|nd|rd|th)?\b/i,
    /\b\d{1,2}(st|nd|rd|th)?\s+(of\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b/i,
  ],
  errorMessage: [
    /\b(http|status|error|code|returns?|returned|returning|got( an?)?|getting( an?)?|throws?|response)\s*:?\s*[45]\d{2}\b/i,
    /\b[45]\d{2}s?\s+(unauthori[sz]ed|forbidden|too many requests|internal server error|bad gateway|service unavailable|gateway time-?out|not found|bad request|conflict)\b/i,
    /\b[45]\d{2}s\b/,
    /\b[A-Z][A-Z0-9]*_[A-Z0-9_]{3,}\b/,
    /"error"\s*:/,
    /\b(error|message|says|saying|shows?|showing)\s*:?\s*["“'`][^"”'`\n]{6,}["”'`]/i,
  ],
  steps: [
    /(^|\n)\s*(\d+[.)]|[-*])\s+\S[^\n]*\n\s*(\d+[.)]|[-*])\s+\S/,
    /\b(steps? to reproduce|repro steps|to reproduce)\b/i,
    /\b(every time|each time|whenever|consistently|reproducible|reproduces|can reproduce)\b/i,
  ],
};

export interface Signals {
  security: string[];
  dataLoss: string[];
  injection: string[];
  present: Record<DetailKey, boolean>;
}

function matches(patterns: RegExp[], text: string): string[] {
  return patterns.flatMap((p) => {
    const m = text.match(p);
    return m ? [m[0].trim()] : [];
  });
}

export function ticketText(t: TicketInput): string {
  return [t.subject, t.body, t.attachment?.content ?? ""].join("\n");
}

export const REDACTED = "[removed: suspected prompt injection]";

/**
 * Leave flagged text out before retrieval and classification, so injected words can't
 * skew the category. Detectors still run on the full original text, so a security issue
 * described inside an injection still escalates.
 *
 * Within each line, everything from the first flagged sentence to the end of the line is
 * removed: injections usually run to the end of their paragraph or string. Literal "\n"
 * inside a JSON string counts as a break.
 * ponytail: line-level heuristic; legit text after an injection on the same line is lost for
 * classification. Use a span model if that starts costing accuracy.
 */
export function redactInjection(t: TicketInput): { ticket: TicketInput; removed: string[] } {
  const removed: string[] = [];
  const clean = (text: string) =>
    text
      .split("\n")
      .map((line) => {
        const parts = line.split(/((?<=[.!?\]])\s+|(?:\\n)+)/);
        const first = parts.findIndex((p, i) => i % 2 === 0 && INJECTION.some((re) => re.test(p)));
        if (first === -1) return line;
        removed.push(parts.slice(first).join("").trim());
        return parts.slice(0, first).join("") + REDACTED;
      })
      .join("\n");
  return {
    ticket: {
      ...t,
      subject: clean(t.subject),
      body: clean(t.body),
      attachment: t.attachment && { ...t.attachment, content: clean(t.attachment.content) },
    },
    removed,
  };
}

export function detectSignals(t: TicketInput): Signals {
  const text = ticketText(t);
  return {
    security: matches(SECURITY, text),
    dataLoss: matches(DATA_LOSS, text),
    injection: matches(INJECTION, text),
    present: {
      accountId: matches(PRESENT.accountId, text).length > 0,
      timestamp: matches(PRESENT.timestamp, text).length > 0,
      // The labeling guide counts an attached log or HTTP response as the error message.
      errorMessage: Boolean(t.attachment) || matches(PRESENT.errorMessage, text).length > 0,
      steps: matches(PRESENT.steps, text).length > 0,
    },
  };
}
