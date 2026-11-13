---
id: KB-002
title: SAML error: SAML_INVALID_AUDIENCE
area: sso
tags: saml, sso, invalid audience, audience uri, entity id, login error
---
If SSO sign-in fails with `SAML_INVALID_AUDIENCE`, the audience value your identity provider (IdP) sends does not match the entity ID Vantimere expects for your workspace.

## What you see

- The sign-in page shows "SAML_INVALID_AUDIENCE" after you come back from Okta, Entra ID, Google Workspace, or another IdP.
- The SSO test in Settings > Security > SSO fails with the same error.
- It may work for one workspace and fail for another.

## Why it happens

The audience (also called Audience URI, SP Entity ID, or Identifier) in your IdP must exactly match the entity ID, including your workspace ID:

`https://sso.vantimere.example/saml/<workspace_id>`

The match is exact. Common causes:

- **Copied from another workspace.** The entity ID contains a different `ws_` workspace ID, often from a test or staging workspace.
- **Trailing slash.** `https://sso.vantimere.example/saml/ws_a1b2c3/` does not match `https://sso.vantimere.example/saml/ws_a1b2c3`.
- Extra spaces, `http` instead of `https`, or the ACS URL pasted into the audience field by mistake.

## How to fix it

1. In Vantimere, go to Settings > Security > SSO and copy the entity ID shown there.
2. In your IdP, open the Vantimere SAML app and paste it into the audience / entity ID field. Remove any trailing slash or spaces.
3. Confirm the ACS URL is `https://sso.vantimere.example/saml/acs` (that field is separate).
4. Save, then run **Test sign-in** again.

If you manage several Vantimere workspaces, each workspace needs its own SAML app in your IdP with its own entity ID.

## Still failing?

Contact support with your account ID (from Settings > Account), the workspace ID, the exact error text, and the time of a failed sign-in. Do not send your IdP certificate private key or any passwords.
