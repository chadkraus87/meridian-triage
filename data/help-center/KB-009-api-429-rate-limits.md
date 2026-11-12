---
id: KB-009
title: 429 Too Many Requests and rate limits
area: api
tags: 429, rate limit, too many requests, retry-after, throttling, backoff
---
A `429 Too Many Requests` response means your API key has sent more requests than its plan allows in the current minute.

## Rate limits

Limits are per API key:

| Plan | Limit per key |
|---|---|
| Free | 60 requests/min |
| Pro | 600 requests/min |
| Enterprise | 3,000 requests/min |

## What you see

- HTTP status `429 Too Many Requests`.
- A `Retry-After` header that says how many seconds to wait before retrying.
- Bursts of 429s during batch jobs, imports, or when many workers share one key.

## How to handle it

1. Read the `Retry-After` header and wait at least that many seconds.
2. Retry with exponential backoff and jitter. For example, wait 1s, 2s, 4s, 8s, and add a random delay to each so your workers don't all retry at once.
3. Cap the number of retries and log when you hit the cap.

## Reduce how often you hit the limit

- Spread batch jobs out over time instead of sending everything at once.
- Cache responses you read often.
- Use webhooks (see KB-011) instead of polling where you can.
- Use separate keys for separate services so one busy job doesn't throttle another.
- If you regularly need more, consider upgrading your plan (see KB-019).

## Getting 429 below the limit?

If you are sure you are under your plan's limit, contact support with your account ID (from Settings > Account), the key name or last 4 characters (never the full key), your approximate request rate, a few `X-Request-Id` values from 429 responses, and the time it happened.
