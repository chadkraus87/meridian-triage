---
id: KB-007
title: 401 Unauthorized from the API
area: api
tags: 401, unauthorized, invalid_api_key, authorization header, bearer token, api key
---
A `401 Unauthorized` response means Vantimere could not authenticate the request. The response body is:

```
{"error":"invalid_api_key"}
```

## The header format

Every request to `https://api.vantimere.example/v2` must send the key in this header:

```
Authorization: Bearer <key>
```

For example `Authorization: Bearer mk_live_...`. The word `Bearer` and the space are required.

## Common causes

1. **Missing header.** A proxy, HTTP client, or redirect dropped the `Authorization` header. Some clients drop it when following a redirect to another host.
2. **Wrong format.** Sending `Authorization: <key>` without `Bearer`, using `Basic`, or sending the key in a query string.
3. **Revoked or expired key.** The key was revoked, or it was rotated more than 24 hours ago (see KB-006).
4. **Test key against live data.** A `mk_test_` key used where a `mk_live_` key is needed, or the other way round.
5. **Extra characters.** A trailing newline or space copied with the key, often from an environment variable or secrets file.

## How to check

1. Go to Settings > API keys and confirm the key is listed and active.
2. Check the key prefix matches what you expect (`mk_live_` or `mk_test_`).
3. Log the outgoing request headers (mask the key) and confirm the `Authorization: Bearer` header is present.
4. Try a simple `GET` request with curl to rule out your HTTP client.

If the key is valid but you get `403` with `{"error":"insufficient_scope"}`, see KB-008 instead.

## Still getting 401?

Contact support with your account ID (from Settings > Account), the key name or last 4 characters (never the full key), the `X-Request-Id` response header, and the time of the request.
