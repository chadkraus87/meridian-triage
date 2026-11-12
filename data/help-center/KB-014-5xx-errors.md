---
id: KB-014
title: 5xx errors from Meridian
area: platform
tags: 500, 502, 503, server error, x-request-id, internal server error
---
A 5xx status code means something went wrong on Meridian's side while handling your request.

## What each code means

- **500 Internal Server Error** and **502 Bad Gateway:** usually transient. Retry with exponential backoff and jitter.
- **503 Service Unavailable:** Meridian is in maintenance or overloaded. Check the `Retry-After` header if present, and check status.meridian.example (see KB-015).

## What to do

1. Retry the request with exponential backoff (for example 1s, 2s, 4s, 8s, plus a random delay). Make sure `POST` requests are safe to retry in your application.
2. Check status.meridian.example for an incident in your region (`us-east`, `us-west`, or `eu-west`).
3. If the errors stop after a retry or two, no action is needed.

## When to contact support

Persistent 5xx on one endpoint is a bug worth reporting. Contact support if:

- the same endpoint keeps returning 500 or 502 for the same request, or
- errors continue for more than a few minutes and there's no incident on the status page.

Include these details so we can find the request in our logs:

- Your account ID (from Settings > Account)
- The `X-Request-Id` header value from the failing response (for example `req_8f2a91c0d3`)
- The time of the request, with time zone
- Your region
- The endpoint and HTTP method
- The status code and response body

A few `X-Request-Id` values from different failures help more than one. Never include your API key.
