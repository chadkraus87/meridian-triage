---
id: KB-006
title: Create, scope, and rotate API keys
area: api
tags: api key, create key, rotate key, scopes, mk_live, mk_test
---
API keys let your code call the Meridian REST API at `https://api.meridian.example/v2`. Each key belongs to one workspace and has one or more scopes.

## Key types

- Live keys start with `mk_live_` and work against live data.
- Test keys start with `mk_test_` and only work against test data.

## Create a key

1. Go to Settings > API keys.
2. Click **Create key**.
3. Give it a name that says where it is used (for example "billing-sync prod").
4. Choose live or test.
5. Choose scopes:
   - `read`: read resources
   - `write`: create and update resources
   - `admin`: manage workspace settings, members, and keys
6. Click **Create** and copy the key. It is shown only once.

Give each key the smallest set of scopes it needs. A key missing a scope gets `403 Forbidden` (see KB-008).

## Rotate a key

Rotate keys on a schedule, and right away if a key may have leaked.

1. Go to Settings > API keys and click **Rotate** next to the key.
2. Meridian creates a new key with the same scopes.
3. The old key keeps working for 24 hours, so you can deploy the new key without downtime.
4. After 24 hours the old key stops working and returns `401 Unauthorized` (see KB-007).

If a key was exposed publicly, revoke it instead of rotating. Revoking stops it right away. If you think a key was used by someone else, report it as a security concern (see KB-010).

## Keep keys safe

- Store keys in a secrets manager or environment variables, not in source code.
- Never paste a full key into a support ticket. If support needs to identify a key, send only its name or the last 4 characters.
