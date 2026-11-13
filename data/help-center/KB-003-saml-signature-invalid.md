---
id: KB-003
title: SAML error: SAML_SIGNATURE_INVALID
area: sso
tags: saml, sso, signature invalid, certificate, certificate rotation, x.509
---
If SSO sign-in fails with `SAML_SIGNATURE_INVALID`, Vantimere could not verify the signature on the SAML response from your identity provider (IdP).

## What you see

- Everyone who signs in with SSO suddenly gets "SAML_SIGNATURE_INVALID", often after SSO was working fine.
- The SSO test in Settings > Security > SSO fails with the same error.

## Why it happens

Usually the IdP signing certificate was rotated. Okta, Entra ID, and Google Workspace rotate or expire signing certificates, and when that happens the IdP starts signing with a new certificate that Vantimere does not have yet. Less often, the wrong certificate was uploaded during setup.

## How to fix it

1. In your IdP, open the Vantimere SAML app and download the current, active signing certificate.
2. Make sure the certificate is X.509 in PEM format. It is a text file that starts with `-----BEGIN CERTIFICATE-----`. If your IdP gives you a `.cer` or `.crt` in binary (DER) format, convert it to PEM first.
3. In Vantimere, go to Settings > Security > SSO and upload the new certificate.
4. Run **Test sign-in** to confirm it works.

Only upload the public certificate. Never upload or send a private key.

## Avoid it next time

Note the expiry date of your IdP signing certificate. When your IdP creates a new certificate, upload it to Vantimere before you make it active in the IdP.

## Still failing?

Contact support with your account ID (from Settings > Account), the exact error text, and the time of a failed sign-in.
