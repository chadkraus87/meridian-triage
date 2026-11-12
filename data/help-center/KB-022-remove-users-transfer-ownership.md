---
id: KB-022
title: Remove users and transfer ownership
area: user_management
tags: remove user, transfer ownership, new owner, offboarding, free seat, deactivate
---
This article explains how to remove someone from your workspace and how to hand ownership to another person.

## Remove a user

Owners and Admins can remove users.

1. Go to Settings > Members.
2. Find the user and click **Remove**.
3. Confirm.

Removing a user frees the seat immediately, so you can invite someone else right away. The removed user loses access to the workspace at once. Apps, API keys, and webhooks they created stay in the workspace.

If you use SCIM provisioning, remove the user in your identity provider instead, or they may be added back (see KB-004).

## Transfer ownership

Use this when the current Owner is leaving or the account should belong to someone else.

1. The current Owner goes to Settings > Members > Transfer ownership.
2. Choose the new owner. They must already be a member of the workspace.
3. Confirm the transfer.
4. The new owner gets an email and must accept. The transfer isn't complete until they accept.

After the transfer, the previous Owner becomes an Admin. They can then be removed if needed.

Remember to update the billing email in Settings > Billing if it belonged to the previous Owner (see KB-019).

## The Owner has already left

If the only Owner left the company and nobody can sign in as them, contact support from the billing email address on the account. Include:

- Your account ID (from Settings > Account)
- The workspace ID
- The name and email of the person who should become the new owner

Support will verify the request before making any change.
