---
id: KB-013
title: Webhook signature verification fails
area: webhooks
tags: webhook signature, meridian-signature, hmac, verification failed, raw body, timestamp
---
If your server rejects Meridian webhooks because the `Meridian-Signature` header doesn't match, the cause is almost always in how the signature is checked. The signature is an HMAC-SHA256 of the raw request body with the endpoint secret (see KB-011).

## What you see

- Your handler logs "signature mismatch" or "invalid signature" and returns 400 or 401.
- Deliveries show as failed in Settings > Webhooks even though your server is up.

## Common causes and fixes

**1. Verifying parsed JSON instead of the raw body.**
Verify against the raw request body, not parsed JSON. Many frameworks parse the body before your code runs. Re-serializing the JSON changes spacing and key order, so the HMAC won't match. Configure your framework to give you the raw bytes for the webhook route.

**2. Server clock is wrong.**
Timestamps older than 5 minutes are rejected, so check your server clock. If your server time drifts, valid deliveries look too old. Turn on NTP or another time sync service.

**3. Wrong secret.**
Each endpoint has its own secret. If you have several endpoints (for example staging and production), make sure each server uses the secret for its own endpoint. If you rolled the secret in Settings > Webhooks, update your server.

**4. Encoding and comparison errors.**
- Compare the hex digest the same way Meridian sends it.
- Strip whitespace or newlines from the secret when you load it.
- Use a constant-time comparison.

## Test it

1. Go to Settings > Webhooks and click **Send test event**.
2. Log the raw body length and your computed signature (never log the secret).
3. Compare with the `Meridian-Signature` header.

If it still fails, contact support with your account ID (from Settings > Account), the endpoint URL, and the time of a failed delivery. Do not include the endpoint secret.
