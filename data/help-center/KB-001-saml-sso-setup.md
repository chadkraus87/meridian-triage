---
id: KB-001
title: Set up SAML SSO with your identity provider
area: sso
tags: saml, sso, okta, entra id, google workspace, identity provider, single sign-on
---
Meridian Cloud supports single sign-on (SSO) with SAML 2.0. You can connect Okta, Entra ID, Google Workspace, or any generic SAML 2.0 identity provider (IdP).

## Before you start

- You need the Owner or Admin role in the Meridian workspace.
- You need admin access to your identity provider.
- Find your workspace ID (`ws_...`) in Settings > Account.

## Values to enter in your identity provider

Create a new SAML application in your IdP and use these values:

- **Entity ID / Audience URI:** `https://sso.meridian.example/saml/<workspace_id>` (replace `<workspace_id>` with your own workspace ID, for example `https://sso.meridian.example/saml/ws_a1b2c3`)
- **ACS URL (Assertion Consumer Service / Reply URL):** `https://sso.meridian.example/saml/acs`
- **Name ID format:** email address

Okta calls the audience "Audience URI (SP Entity ID)". Entra ID calls it "Identifier (Entity ID)" and calls the ACS URL "Reply URL". Google Workspace calls it "Entity ID".

## Steps

1. In Meridian, go to Settings > Security > SSO.
2. Copy the entity ID and ACS URL shown on that page into your IdP.
3. In your IdP, download the IdP metadata or the signing certificate (X.509, PEM format).
4. Back in Settings > Security > SSO, paste the IdP SSO URL and upload the certificate.
5. Click **Test sign-in** with a user who is assigned to the app in your IdP.
6. When the test succeeds, turn SSO on.

## If the test fails

- `SAML_INVALID_AUDIENCE`: the audience in your IdP does not match the entity ID. See KB-002.
- `SAML_SIGNATURE_INVALID`: the certificate does not match. See KB-003.
- `SSO_USER_NOT_PROVISIONED`: the user does not exist in Meridian yet. See KB-004.

If you still need help, contact support with your account ID (from Settings > Account), the exact error text, and the time you tried to sign in.
