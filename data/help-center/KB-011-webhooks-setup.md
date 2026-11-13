---
id: KB-011
title: Set up webhooks
area: webhooks
tags: webhooks, endpoint, vantimere-signature, hmac, https, events
---
Webhooks send an HTTP `POST` to your server when something happens in your Vantimere workspace, so you don't have to poll the API.

## Requirements for your endpoint

- It must use HTTPS. Plain HTTP URLs are rejected.
- It must return a 2xx status code within 10 seconds. Anything else counts as a failed delivery and is retried (see KB-012).
- It must accept a JSON body.

Do slow work after you respond. Store the event, return `200`, then process it in a background job.

## Add an endpoint

1. Go to Settings > Webhooks.
2. Click **Add endpoint** and enter your HTTPS URL.
3. Choose the event types you want to receive.
4. Save. Vantimere shows the endpoint secret. Store it securely.
5. Click **Send test event** and check that your endpoint returns 2xx.

## Verify every delivery

Each delivery has a `Vantimere-Signature` header. It is an HMAC-SHA256 of the raw request body, computed with your endpoint secret.

To verify:

1. Read the raw request body as bytes, before any JSON parsing.
2. Compute HMAC-SHA256 of the raw body using the endpoint secret.
3. Compare your result with the `Vantimere-Signature` header using a constant-time comparison.
4. Reject the request if they don't match.

Each endpoint has its own secret. If verification fails, see KB-013.

## Keep the secret safe

Treat the endpoint secret like a password. Don't commit it to source control and don't paste it into support tickets. If it leaks, roll the secret in Settings > Webhooks and update your server.

If you need help, contact support with your account ID (from Settings > Account), the endpoint URL, and the time of a delivery you expected.
