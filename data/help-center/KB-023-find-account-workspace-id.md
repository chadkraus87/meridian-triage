---
id: KB-023
title: Find your account ID and workspace ID
area: user_management
tags: account id, workspace id, acct, ws, support ticket, find id
---
Support often needs your account ID to find your account quickly. This article shows where to find it and your workspace ID.

## Where to find them

1. Sign in to the Meridian dashboard.
2. Go to Settings > Account.

Settings > Account shows:

- **Account ID:** starts with `acct_` followed by 8 lowercase letters or digits, for example `acct_7f3k9q2m`.
- **Workspace ID:** starts with `ws_` followed by 6 characters, for example `ws_a1b2c3`.

Click the copy icon next to each ID to copy it.

## What each ID is for

- The **account ID** identifies your organization's Meridian account, including billing.
- The **workspace ID** identifies one workspace. An account can have more than one workspace (for example production and staging). The workspace ID is used in your SAML entity ID (see KB-001).

## Include your account ID in support tickets

Include the account ID in support tickets. Without it, support has to ask for it before they can look into your issue, which slows things down.

A good ticket includes:

- Your account ID (`acct_...`)
- The workspace ID, if the issue is in one workspace
- The exact error message or status code
- When it happened, with time zone
- The `X-Request-Id` header value for API errors

Your account ID and workspace ID are not secrets. You can safely share them with support. Never share API keys, passwords, or tokens.

## Can't sign in?

If you can't reach Settings > Account, your account ID also appears on invoices sent to your billing email. If you are locked out by SSO, see KB-005.
