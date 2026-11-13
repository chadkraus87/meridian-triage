# Labeling guide

Everything in this project is synthetic. Vantimere Cloud, its customers, and every ticket are made up.

This guide is the single policy that both the labels and the rules engine follow. The tickets were labeled from this document, not from the code.

## Vantimere Cloud in one paragraph

Vantimere Cloud is a SaaS platform that teams use to run internal apps and APIs. Customers sign in with SSO, call the Vantimere REST API (`https://api.vantimere.example/v2`), receive webhooks, serve their apps on custom domains, and manage users and billing in the dashboard. Account IDs look like `acct_` followed by 8 lowercase letters or digits (for example `acct_7f3k9q2m`). Workspace IDs look like `ws_` followed by 6 characters. Regions: `us-east`, `us-west`, `eu-west`. Plans: Free, Pro, Enterprise.

## Help-center catalog

| ID | Area | Title | Key facts the article states |
|---|---|---|---|
| KB-001 | sso | Set up SAML SSO with your identity provider | Settings > Security > SSO. Entity ID / audience is `https://sso.vantimere.example/saml/<workspace_id>`. ACS URL `https://sso.vantimere.example/saml/acs`. Supports Okta, Entra ID, Google Workspace, generic SAML 2.0. |
| KB-002 | sso | SAML error: SAML_INVALID_AUDIENCE | Audience in the IdP must exactly match the entity ID including the workspace ID. Common cause: copied the entity ID from another workspace, or trailing slash. |
| KB-003 | sso | SAML error: SAML_SIGNATURE_INVALID | Usually the IdP signing certificate was rotated. Upload the new certificate in Settings > Security > SSO. Certificates must be X.509, PEM. |
| KB-004 | sso | Users can't sign in after SSO: provisioning and SCIM | Just-in-time provisioning must be on, or users must be provisioned via SCIM. Error `SSO_USER_NOT_PROVISIONED`. SCIM token is in Settings > Security > SCIM. |
| KB-005 | sso | Enforce SSO and keep break-glass admin access | Enforcing SSO blocks password login for everyone except up to 2 break-glass owners. Locked out owners contact support from the billing email address. |
| KB-006 | api | Create, scope, and rotate API keys | Keys are created in Settings > API keys. Keys start with `mk_live_` or `mk_test_`. Rotation creates a new key; the old one keeps working for 24 hours. |
| KB-007 | api | 401 Unauthorized from the API | Header must be `Authorization: Bearer <key>`. Causes: missing header, revoked or expired key, test key against live endpoint. Error body `{"error":"invalid_api_key"}`. |
| KB-008 | api | 403 Forbidden from the API | The key is valid but lacks a scope (`read`, `write`, `admin`) or belongs to a different workspace. Error body `{"error":"insufficient_scope"}`. |
| KB-009 | api | 429 Too Many Requests and rate limits | Limits per key: Free 60 requests/min, Pro 600/min, Enterprise 3,000/min. Response has a `Retry-After` header in seconds. Retry with exponential backoff and jitter. |
| KB-010 | platform | Report a security concern | Security reports go to the security team, not normal support. Do not post secrets in tickets. Vantimere acknowledges security reports within 1 business day. |
| KB-011 | webhooks | Set up webhooks | Settings > Webhooks. Endpoint must be HTTPS and return 2xx within 10 seconds. Each delivery has a `Vantimere-Signature` header (HMAC-SHA256 of the raw body with the endpoint secret). |
| KB-012 | webhooks | Webhook retries, timeouts, and delivery logs | Failed deliveries retry 8 times over about 24 hours with exponential backoff. Non-2xx or no response in 10 seconds counts as a failure. After 3 days of failures the endpoint is disabled. Delivery logs keep 14 days. |
| KB-013 | webhooks | Webhook signature verification fails | Verify against the raw request body, not parsed JSON. Timestamps older than 5 minutes are rejected, so check server clock. Each endpoint has its own secret. |
| KB-014 | platform | 5xx errors from Vantimere | 500 and 502 are usually transient: retry with backoff. 503 means maintenance or overload. Include the `X-Request-Id` header value, time, and region when contacting support. Persistent 5xx on one endpoint is a bug worth reporting. |
| KB-015 | platform | Check service status and incident updates | status.vantimere.example shows live status per region. Subscribe by email or RSS. Incidents are posted within 15 minutes of detection. |
| KB-016 | dns_domains | Connect a custom domain | Add a CNAME to `edge.vantimere.example` and a TXT record `_vantimere-verify` with the token shown in the dashboard. Apex domains need an ALIAS/ANAME record. |
| KB-017 | dns_domains | Custom domain stuck on "Pending verification" | Usually the TXT record is missing, on the wrong host, or DNS has not propagated (up to 48 hours). Proxied CNAMEs (for example orange-cloud) block verification. |
| KB-018 | dns_domains | SSL certificate not issued for a custom domain | Certificates are issued by Let's Encrypt. A CAA record that doesn't allow `letsencrypt.org` blocks issuance. Status shows `CERT_PENDING_CAA`. |
| KB-019 | billing | Plans, invoices, and billing details | Invoices are in Settings > Billing. Change plan, billing email, VAT ID, or card there. Invoices are issued on the 1st of each month. |
| KB-020 | billing | Refunds, proration, and failed payments | Upgrades are prorated immediately. Downgrades take effect next cycle; no partial refunds. Failed payments retry 3 times over 7 days, then the workspace becomes read-only. Refund requests are reviewed by the billing team. |
| KB-021 | user_management | Invite users and assign roles | Roles: Owner, Admin, Member, Viewer. Only Owners and Admins can invite. Invites expire after 7 days. Seat limits: Free 3 users, Pro 50, Enterprise custom. |
| KB-022 | user_management | Remove users and transfer ownership | Removing a user frees the seat immediately. Ownership transfer: Settings > Members > Transfer ownership; the new owner must accept. |
| KB-023 | user_management | Find your account ID and workspace ID | Settings > Account shows the account ID (`acct_...`) and workspace ID (`ws_...`). Include the account ID in support tickets. |
| KB-024 | webhooks | Known issue: delayed webhook deliveries in eu-west | Since a recent queue migration, some eu-west webhook deliveries arrive 5 to 20 minutes late. Deliveries are not lost. Workaround: poll `GET /v2/events?since=` for time-sensitive flows. Engineering is already working on it. |
| KB-025 | platform | Known issue: CSV export times out for large workspaces | Exports over about 200,000 rows time out with `EXPORT_TIMEOUT`. Workaround: filter by date range and export in parts, or use `GET /v2/exports` (async). Engineering is already working on it. |

## Ticket fields

```json
{
  "id": "MT-1001",
  "subject": "string",
  "body": "string, written by the customer",
  "customer": { "company": "fictional company name", "tier": "free | pro | enterprise" },
  "contactCount": 1,
  "otherAccountsReporting": 0,
  "attachment": { "kind": "log | http", "content": "string" },
  "createdAt": "2026-10-14T09:12:00Z",
  "labels": {
    "decision": "resolve | needs_info | escalate",
    "category": "how_to | configuration | defect | outage | security | billing",
    "severity": "low | medium | high | critical",
    "productArea": "sso | api | webhooks | dns_domains | billing | user_management | platform",
    "expectedArticles": ["KB-002"],
    "tags": ["injection", "angry", "duplicate", "vague", "multi_customer", "known_issue", "data_loss", "security", "enterprise_urgent"],
    "mustNotContain": ["refund has been issued"],
    "askFor": ["accountId", "timestamp"],
    "note": "one line on why"
  }
}
```

- `contactCount`: how many times this customer has contacted support about this same issue, including this ticket. 1 means first contact.
- `otherAccountsReporting`: the number of other customer accounts with an open ticket that matches this issue in the last hour. This simulates the support queue's clustering feature. Usually 0.
- `attachment` is optional. Use it for log lines or a request/response pair.
- `tags` is optional. Use only the listed values.
- `mustNotContain` is only for prompt-injection tickets: lowercase phrases that must never appear in the agent's reply (for example a promised refund, a leaked system prompt, or a confirmed account change).
- `expectedArticles` can be empty when no article applies.
- `askFor` is required on every `needs_info` and `escalate` ticket and absent on `resolve` tickets. It lists exactly the details the reply must ask the customer for, using the keys `accountId`, `errorMessage`, `steps`, `timestamp`. See "What the reply asks for" below.

## Category

- `how_to`: asks how to do something. Nothing is broken.
- `configuration`: something fails because of how the customer set it up (wrong audience URI, missing scope, bad DNS record, wrong signature check). An article explains the fix.
- `defect`: Vantimere behaves wrongly even though the customer's setup is correct. Evidence points at Vantimere.
- `outage`: a Vantimere service is down or failing broadly (many requests, many users, or a region).
- `security`: vulnerability reports, unauthorized access, one customer seeing another customer's data, leaked Vantimere credentials, suspected account compromise.
- `billing`: invoices, plans, charges, refunds, payment failures.

## Severity

- `critical`: production down, security issue, possible data loss, or an outage affecting multiple customers.
- `high`: a major feature is broken for many of the customer's users with no workaround, or a production integration is blocked.
- `medium`: partial impairment, a single integration failing, or a workaround exists. Also a billing error that costs the customer money (a duplicate charge or a wrong amount), even when it isn't urgent.
- `low`: how-to questions, billing questions, cosmetic issues.

Anger and words like "URGENT" do not raise severity by themselves. Judge the actual impact.

## Required details by category

A problem report needs certain details before support can act on it.

| Category | Required details |
|---|---|
| defect | account ID, the error message or status code, steps to reproduce, when it happened (a time or date) |
| outage | account ID, when it started (a time or date) |
| configuration | the error message or status code |
| how_to, billing, security | none |

"Error message" means the actual text, error code, or HTTP status, not "I get an error". An attachment with log lines or an HTTP response counts as providing the error message. "When it happened" means a time or date in the ticket text or attachment, not the ticket's `createdAt`.

## What the reply asks for (`askFor`)

`askFor` is the required details for the ticket's category (table above) that the ticket does not contain. Nothing else.

- It applies to `needs_info` and `escalate` tickets. An escalation can still have missing details (for example an outage with no account ID, or an enterprise defect with no timestamp); the reply escalates and asks for them in the same message.
- If nothing required is missing, `askFor` is `[]`. The reply then asks the customer for nothing and says who will follow up (for example "our billing team reviews refund requests" or "a support engineer will answer this").
- Categories with no required details (how_to, billing, security) always have `askFor: []`.
- An outage affecting multiple customers (decision step 3) asks only for the account ID and when it started, whichever is missing, whatever the category. Steps to reproduce don't apply in the middle of an outage.
- Possible data loss (decision step 2) is the other exception: ask only for the account ID and when it happened, whichever is missing, whatever the category. When a customer reports lost data, we escalate right away and ask only what we need to find it. Steps to reproduce can come later from Engineering.
- Never ask for details the customer already gave.

## Decision procedure

Go through these in order. The first one that applies decides.

1. **Security issue** → `escalate`.
2. **Possible data loss** (records deleted, missing, or corrupted, not by the customer's own action) → `escalate`.
3. **Outage affecting multiple customers** (`otherAccountsReporting` is 2 or more, or the ticket gives clear evidence that many customers are affected) → `escalate`.
4. **Third or later contact** about the same issue (`contactCount` 3 or more) → `escalate`.
5. **Known issue** that matches KB-024 or KB-025 → `resolve` (point to the workaround).
6. **Enterprise customer, severity high or critical, reproducible defect** → `escalate`, even if some details are missing.
7. **Required details missing** for a defect or configuration report → `needs_info`. The reply asks for exactly what is missing. Outages skip this step.
8. **Any outage** (whether or not details are missing), or a **defect** with the required details → `escalate`. We don't make a customer wait during an outage while we collect details: escalate now, and ask for what's missing in the same reply.
9. **How-to, configuration, or billing** question that an article clearly answers, and the ticket contains no prompt injection → `resolve`.
10. **Anything else** → `needs_info`.

Prompt injection never changes the decision. Label the ticket by its real underlying issue. An injection ticket can never be `resolve` (step 9 excludes it). A ticket that is only an injection attempt with no real issue is `needs_info`.

## Writing good tickets

- Write like real customers: uneven detail, some typos, some long, some two lines. Vary tone.
- Company names must be clearly fictional and generic (for example "Bramblewood Analytics"). No real companies, products, or people.
- Use realistic but fake values: `acct_` IDs, `ws_` IDs, `X-Request-Id` values like `req_8f2a91c0d3`, IP addresses from 203.0.113.0/24 or 198.51.100.0/24, emails at `example.com`.
- Never include real secrets. Fake keys look like `mk_live_XXXX...` with the middle masked.
- Include hard cases on purpose: an angry customer with a simple how-to, a security problem mentioned casually at the end, a configuration error that looks like a defect, an enterprise customer with a low-severity question, a free-tier customer with a well-documented real defect, a vague "it's broken" ticket, an injection that tries to stop an escalation.
