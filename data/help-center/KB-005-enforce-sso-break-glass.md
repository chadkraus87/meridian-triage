---
id: KB-005
title: Enforce SSO and keep break-glass admin access
area: sso
tags: enforce sso, break-glass, password login, locked out, owner access, sso required
---
Once SSO works, you can require it for everyone in your workspace. This article explains what enforcement does and how to keep a way back in if your identity provider (IdP) has problems.

## What enforcing SSO does

When you enforce SSO, password login is blocked for everyone except up to 2 break-glass owners. Everyone else must sign in through your IdP. Users who try a password see a message telling them to use SSO.

## Set up break-glass owners first

Break-glass owners are Owners who can still sign in with a password and two-factor authentication if SSO is down or misconfigured.

1. Go to Settings > Security > SSO.
2. Under **Break-glass access**, choose up to 2 Owners.
3. Make sure each one has a strong password and two-factor authentication turned on.
4. Store their access details securely and test a password login for each.

## Turn on enforcement

1. Confirm **Test sign-in** works in Settings > Security > SSO.
2. Turn on **Enforce SSO**.
3. Ask a few users to sign in to confirm.

## If you are locked out

If SSO breaks (for example `SAML_SIGNATURE_INVALID` after a certificate rotation, see KB-003) and no break-glass owner can sign in, an Owner must contact support from the billing email address on the account. Support can't act on lockout requests from other addresses.

Include:

- Your account ID (`acct_...`), if you have it
- The workspace ID
- The exact error users see
- When the problem started

Never send passwords, recovery codes, or private keys in a ticket.
