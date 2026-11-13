---
id: KB-016
title: Connect a custom domain
area: dns_domains
tags: custom domain, cname, txt record, dns, apex domain, alias
---
You can serve your Vantimere apps on your own domain, for example `app.example.com`.

## Before you start

- You need the Owner or Admin role in Vantimere.
- You need access to your domain's DNS settings at your DNS provider or registrar.

## Steps

1. In Vantimere, open your app and go to **Domains**, then click **Add domain**.
2. Enter the domain, for example `app.example.com`.
3. Vantimere shows a verification token. Keep this page open.
4. At your DNS provider, add two records:

| Type | Host | Value |
|---|---|---|
| CNAME | `app` (your subdomain) | `edge.vantimere.example` |
| TXT | `_vantimere-verify.app` | the token shown in the dashboard |

The TXT record goes on the `_vantimere-verify` host for your domain. Some DNS providers add your domain automatically, so enter only `_vantimere-verify.app`, not the full name.

5. Back in Vantimere, click **Verify**.

Verification and the SSL certificate are usually done within minutes, but DNS changes can take up to 48 hours to propagate.

## Apex (root) domains

A root domain like `example.com` can't use a CNAME. Apex domains need an ALIAS/ANAME record pointing to `edge.vantimere.example`. If your DNS provider doesn't support ALIAS or ANAME, use a subdomain such as `www.example.com` instead.

## Using a CDN or proxy

Don't proxy the CNAME through a CDN (for example, an orange-cloud proxied record). Proxied CNAMEs block verification. Set the record to DNS only.

## If something goes wrong

- Stuck on "Pending verification": see KB-017.
- SSL certificate not issued or `CERT_PENDING_CAA`: see KB-018.

If you contact support, include your account ID (from Settings > Account), the domain, and the status shown in the dashboard.
