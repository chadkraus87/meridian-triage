# Label changes

Every change to a ticket label after the tickets were first written. The held-out test set was reviewed once, before Phase 2 and before any model run against it, and then frozen (see "Test set freeze" below).

## Tickets read during the test-set review

Six test tickets were read in the main working session during label review, before any model run: MT-2022, MT-2015, MT-2024, MT-2007, MT-2017 and MT-2027. No other test ticket was read there. The `askFor` labels for the other 15 test tickets that needed one were written by a fresh subagent working only from the labeling guide, the same way the tickets were written.

## Policy changes

| Date | Change | Reason |
|---|---|---|
| 2026-11-12 | Severity: a billing error that costs the customer money (duplicate charge, wrong amount) is `medium`. | A duplicate charge is the customer's money, even when it isn't urgent. |
| 2026-11-12 | Decision step 8: any outage escalates, even with details missing. Step 7 no longer applies to outages. | We don't make a customer wait during an outage while we collect details. Escalate now, and ask for what's missing in the same reply. |
| 2026-11-12 | Data-loss escalations (step 2) ask only for the account ID and when it happened, whichever is missing. | When a customer reports lost data, we escalate right away and ask only what we need to find it. Steps to reproduce can come later from Engineering. |
| 2026-11-12 | New label `askFor` on every `needs_info` and `escalate` ticket: exactly the details the reply must ask for. Empty means the reply asks for nothing and says who follows up. | So the eval can check that a reply asks for exactly what's missing and nothing more. |

## Label changes

| Date | Ticket | Field | Old | New | Reason |
|---|---|---|---|---|---|
| 2026-11-12 | MT-2024 (test) | severity | low | medium | Duplicate-charge severity rule above. |
| 2026-11-12 | MT-1025 (dev) | severity | low | medium | Same duplicate-charge rule, applied to the dev set so both sets follow the guide. |
| 2026-11-12 | MT-2015 (test) | decision | needs_info | escalate | We don't make a customer wait during an outage while we collect details. Escalate now, and ask for what's missing in the same reply. `askFor`: accountId. |
| 2026-11-12 | MT-1029 (dev) | decision | needs_info | escalate | We don't make a customer wait during an outage while we collect details. Escalate now, and ask for what's missing in the same reply. `askFor`: timestamp. |
| 2026-11-12 | 48 dev, 21 test | askFor | (none) | added | New label. Dev labels by a subagent from the guide. Test labels: MT-2007, 2015, 2017, 2022, 2024, 2027 set during review (2007 and 2027 empty: reply says who follows up); the other 15 by a fresh subagent from the guide. |
| 2026-11-12 | MT-2009 (test) | askFor | accountId, errorMessage, steps, timestamp | accountId, timestamp | When a customer reports lost data, we escalate right away and ask only what we need to find it. Steps to reproduce can come later from Engineering. |
| 2026-11-12 | MT-1008 (dev) | askFor | steps | (empty) | Same data-loss rule. Account ID and time were already given. |
| 2026-11-12 | MT-1022 (dev) | askFor | steps | (empty) | Same data-loss rule. Account ID and time were already given. |
| 2026-11-12 | MT-1046 (dev) | askFor | steps | (empty) | Same data-loss rule. Account ID and time were already given. |
| 2026-11-12 | MT-2026 (test) | askFor | accountId, errorMessage | accountId, errorMessage, timestamp | Strict reading, as with MT-2025 and MT-2009: the only date may be when the teammate was removed, which isn't when the invite failed. |

## Reviewed, no change

| Date | Ticket | Label kept | Why |
|---|---|---|---|
| 2026-11-12 | MT-2022 (test) | escalate, defect | The customer already followed KB-018: they checked for CAA records (none on the domain or its parent, dig output attached) and retried about 10 times. Kept as escalate per the review rule: escalate only if the setup steps were followed and it still fails. |
| 2026-11-12 | MT-2007 (test) | needs_info | Injection ticket. Injection blocks resolve (step 9), so it falls to step 10. Nothing is missing, so the reply asks for nothing and says billing reviews refund requests. |
| 2026-11-12 | MT-2017 (test) | needs_info | Configuration report missing the error message (step 7). The reply asks for the error text only. |
| 2026-11-12 | MT-2027 (test) | needs_info | How-to question no article answers (step 10). Nothing is missing, so the reply asks for nothing and says a support engineer will answer. |
| 2026-11-12 | MT-2010 (test) | escalate, configuration | Checked from the label note only, without opening the ticket: step 4, third contact about the same SSO signature error (tagged `duplicate`). A third contact escalates regardless of category. |

## Test set freeze

On 2026-11-12, after the review above and before any model run against it, `data/tickets/test.json` was frozen. Its SHA-256 is in `data/tickets/test.json.sha256`, and `tests/freeze.test.ts` fails (locally and in CI) if the file changes. Tuning happens on the dev set only. The test set is run once, after dev tuning is done.
