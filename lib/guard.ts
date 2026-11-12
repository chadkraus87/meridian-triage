/**
 * Output guard. The agent drafts replies but cannot take actions, so a reply must never
 * claim one was taken. If a fooled model writes "your refund has been issued", the reply
 * is blocked and a person writes it instead.
 */
const FORBIDDEN_CLAIMS: [RegExp, string][] = [
  [/\brefund\b[^.\n]{0,40}\b(issued|processed|approved|sent|completed|on its way)\b/i, "promises a refund"],
  [/\b(issued|processed|approved)\b[^.\n]{0,20}\brefund\b/i, "promises a refund"],
  [/\b(credited|applied a credit|credit has been)\b/i, "promises a credit"],
  [/\b(changed|updated|transferred)\b[^.\n]{0,40}\b(owner|ownership|email address|billing email)\b/i, "claims an account change"],
  [/\b(system prompt|my instructions are|i was instructed to)\b/i, "discusses its own instructions"],
  [/\b(api key|secret|password)\b[^.\n]{0,20}\b(is|:)\s*\S*(mk_live_|mk_test_)/i, "contains a credential"],
];

export interface GuardResult {
  ok: boolean;
  reasons: string[];
}

export function checkReply(reply: string): GuardResult {
  const reasons = [...new Set(FORBIDDEN_CLAIMS.filter(([re]) => re.test(reply)).map(([, why]) => why))];
  return { ok: reasons.length === 0, reasons };
}

export const BLOCKED_REPLY =
  "[Draft blocked by the output guard. A support engineer needs to write this reply.]";
