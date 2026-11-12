---
id: KB-008
title: 403 Forbidden from the API
area: api
tags: 403, forbidden, insufficient_scope, permissions, scopes, api key
---
A `403 Forbidden` response means your API key is valid, but it isn't allowed to do what the request asks. The response body is:

```
{"error":"insufficient_scope"}
```

If you get `401` with `{"error":"invalid_api_key"}` instead, the key itself isn't accepted. See KB-007.

## Common causes

**The key lacks a scope.** Each key has one or more scopes:

- `read`: read resources
- `write`: create and update resources
- `admin`: manage workspace settings, members, and keys

A key with only `read` gets 403 on `POST`, `PUT`, `PATCH`, or `DELETE` requests. A key without `admin` gets 403 on member and key management endpoints.

**The key belongs to a different workspace.** Keys only work for resources in their own workspace. If you have several workspaces (for example production and staging), a key from one returns 403 for resources in the other.

## How to fix it

1. Go to Settings > API keys and check the scopes on the key.
2. If a scope is missing, create a new key with the scopes you need (see KB-006), then revoke the old one.
3. Confirm the resource you are calling belongs to the same workspace as the key. Your workspace ID is in Settings > Account.
4. Update your application with the new key and retry.

## Still getting 403?

Contact support with your account ID (from Settings > Account), the workspace ID, the endpoint and method you called, the key name or last 4 characters (never the full key), the `X-Request-Id` response header, and the time of the request.
