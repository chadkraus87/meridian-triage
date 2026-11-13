---
id: KB-015
title: Check service status and incident updates
area: platform
tags: status page, outage, incident, service status, down, region
---
If Vantimere seems slow or down, check the status page first.

## Status page

status.vantimere.example shows live status per region:

- `us-east`
- `us-west`
- `eu-west`

Each region lists components such as the dashboard, REST API, webhooks, SSO, and custom domains, with their current state (Operational, Degraded, Partial outage, Major outage, or Maintenance).

## Incidents

Incidents are posted within 15 minutes of detection. Each incident shows the affected regions and components, and is updated as Engineering learns more, until it is resolved. Scheduled maintenance is posted in advance.

## Subscribe to updates

On status.vantimere.example you can subscribe by email or RSS. You can choose to get updates only for the regions and components you use.

## If you see problems but the status page is green

1. Check whether the problem affects only one endpoint, user, or integration. That may be a configuration issue (for example a 401 or 403, see KB-007 and KB-008).
2. Retry with backoff if you see 5xx errors (see KB-014).
3. If errors continue, contact support with:
   - Your account ID (from Settings > Account)
   - Your region
   - When it started, with time zone
   - The error text or status code
   - Some `X-Request-Id` values from failing responses

Reports from customers help us detect incidents faster, so please tell us if something looks wrong.
