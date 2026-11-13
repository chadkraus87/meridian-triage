---
id: KB-012
title: Webhook retries, timeouts, and delivery logs
area: webhooks
tags: webhook retries, timeout, delivery logs, endpoint disabled, failed delivery, missing webhooks
---
This article explains what Vantimere does when a webhook delivery fails, and how to find out what happened.

## What counts as a failure

A delivery fails if your endpoint:

- returns any non-2xx status code (for example 400, 401, 404, 500, 502), or
- doesn't respond within 10 seconds (timeout), or
- can't be reached (DNS, TLS, or connection errors).

## Retries

Failed deliveries retry 8 times over about 24 hours with exponential backoff. The gap between attempts grows each time. If any retry succeeds, the event is marked delivered.

Your endpoint may receive the same event more than once. Use the event ID to ignore duplicates.

## Endpoint disabled after repeated failures

After 3 days of failures, the endpoint is disabled and Vantimere stops sending to it. The endpoint shows as **Disabled** in Settings > Webhooks and Owners get an email.

To turn it back on:

1. Fix the problem on your server.
2. Go to Settings > Webhooks and click **Enable** on the endpoint.
3. Use **Send test event** to confirm it returns 2xx.

Events from the disabled period can be fetched with `GET /v2/events?since=`.

## Delivery logs

Go to Settings > Webhooks and open an endpoint to see its delivery logs. Each attempt shows the time, response status code, response time, and response body. Delivery logs keep 14 days of history.

## Common causes of failures

- Slow handlers that do heavy work before responding (respond first, then process).
- Signature checks rejecting valid requests (see KB-013).
- Expired TLS certificates or firewall rules blocking Vantimere.

If deliveries in eu-west are arriving late but not failing, see KB-024.

Still stuck? Contact support with your account ID (from Settings > Account), the endpoint URL, and the time and status code of a failed attempt from the delivery log.
