---
id: KB-010
title: Report a security concern
area: platform
tags: security, vulnerability, report, leaked key, unauthorized access, data exposure
---
If you think you have found a security problem with Meridian Cloud, or you think your account has been compromised, report it to the Meridian security team. Security reports go to the security team, not normal support, so they are handled by the right people.

## What counts as a security concern

- A vulnerability in Meridian (for example a way to read data you shouldn't).
- Seeing another customer's data in your dashboard, API responses, exports, or webhooks.
- Sign-ins, API calls, or changes in your account that nobody on your team made.
- A Meridian API key, SCIM token, or webhook secret that was leaked or exposed publicly.

## How to report

1. Email security@meridian.example, or open a ticket and choose the **Security** category.
2. Describe what you saw and how to reproduce it.
3. Include your account ID (from Settings > Account), the time it happened, affected users or resources, and any `X-Request-Id` values.
4. Attach screenshots or log lines if they help, with secrets removed.

Meridian acknowledges security reports within 1 business day.

## Do not post secrets

Do not paste API keys, passwords, SCIM tokens, webhook secrets, private keys, or session cookies into a ticket or email. If you need to tell us which key is involved, send its name or the last 4 characters only. We will never ask you for a password.

## If a key or token leaked

Don't wait for a reply before acting:

1. Revoke the exposed key in Settings > API keys (see KB-006).
2. Create a new SCIM token or webhook secret if those were exposed.
3. Review recent activity in your workspace.
4. Then report it so the security team can check for misuse.
