---
id: KB-004
title: Users can't sign in after SSO: provisioning and SCIM
area: sso
tags: sso, scim, provisioning, jit, user not provisioned, cannot sign in
---
After you turn on SSO, some users may be able to authenticate with your identity provider (IdP) but still can't get into Vantimere. The error is `SSO_USER_NOT_PROVISIONED`.

## What you see

- The user signs in to Okta, Entra ID, or Google Workspace successfully, then Vantimere shows "SSO_USER_NOT_PROVISIONED".
- New hires can't sign in, while existing users can.

## Why it happens

Vantimere only lets a user in if they have a Vantimere user record. There are two ways to create one:

- **Just-in-time (JIT) provisioning:** Vantimere creates the user automatically the first time they sign in with SSO.
- **SCIM provisioning:** your IdP creates, updates, and removes Vantimere users for you.

If JIT provisioning is off and the user was not provisioned via SCIM, they get `SSO_USER_NOT_PROVISIONED`.

## Option 1: Turn on just-in-time provisioning

1. Go to Settings > Security > SSO.
2. Turn on **Just-in-time provisioning** and choose the default role for new users.
3. Ask the user to sign in again.

## Option 2: Provision users with SCIM

1. Go to Settings > Security > SCIM and generate a SCIM token.
2. In your IdP, turn on SCIM provisioning for the Vantimere app and paste the token.
3. Assign the user (or their group) to the Vantimere app in your IdP and push them.

Treat the SCIM token like a password. Don't paste it into tickets or chat.

## Other checks

- The user must be assigned to the Vantimere app in your IdP.
- Your seat limit must allow a new user (see KB-021).

If it still fails, contact support with your account ID (from Settings > Account), the user's email, the exact error text, and the time they tried.
