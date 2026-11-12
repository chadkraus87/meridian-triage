---
id: KB-024
title: Known issue: delayed webhook deliveries in eu-west
area: webhooks
tags: known issue, webhook delay, eu-west, late webhooks, slow delivery, events
---
This is a known issue. Engineering is already working on it.

## What is affected

Since a recent queue migration, some eu-west webhook deliveries arrive 5 to 20 minutes late. Only workspaces in the `eu-west` region are affected. Workspaces in `us-east` and `us-west` are not affected.

## What you might see

- Webhooks for events in eu-west arrive minutes after the event happened.
- The event exists in the API or dashboard, but your endpoint hasn't received it yet.
- The delivery log in Settings > Webhooks shows the attempt time well after the event time.
- Delays come and go, and range from about 5 to 20 minutes.

## Your data is safe

Deliveries are not lost. Every event is still delivered, only later than usual. You don't need to resend or recreate anything, and your endpoint does not need to be changed.

## Workaround

For time-sensitive flows, poll the events API instead of waiting for the webhook:

```
GET /v2/events?since=<timestamp>
```

1. Store the timestamp of the last event you processed.
2. Every minute or so, call `GET /v2/events?since=` with that timestamp.
3. Process new events and update the timestamp.
4. Use the event ID to skip duplicates, since the webhook for the same event will still arrive later.

Keep polling within your plan's rate limit (see KB-009).

## Is this the issue you are seeing?

This issue causes delays, not failures. If deliveries show non-2xx status codes or timeouts in the delivery log, see KB-012. If signatures fail, see KB-013.

If you see delays longer than 20 minutes, or in a region other than eu-west, contact support with your account ID (from Settings > Account), the endpoint URL, an event ID, and the event time and the time it arrived.
