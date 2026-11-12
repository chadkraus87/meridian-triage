---
id: KB-018
title: SSL certificate not issued for a custom domain
area: dns_domains
tags: ssl, tls, certificate, caa record, cert_pending_caa, https error
---
After your custom domain is verified, Meridian requests an SSL/TLS certificate for it automatically. Certificates are issued by Let's Encrypt.

## What you see

- The domain status shows `CERT_PENDING_CAA`.
- Visitors get a browser warning such as "Your connection is not private" or a certificate name mismatch.
- `https://` doesn't work on the domain, even though verification succeeded.

## Why it happens

A CAA (Certification Authority Authorization) DNS record controls which certificate authorities may issue certificates for your domain. A CAA record that doesn't allow `letsencrypt.org` blocks issuance. Meridian then shows `CERT_PENDING_CAA`.

CAA records can be set on the domain itself or on a parent domain. For `app.example.com`, a CAA record on `example.com` also applies.

## How to fix it

1. Check for CAA records:
   `dig CAA app.example.com` and `dig CAA example.com`
2. If CAA records exist and none of them allow `letsencrypt.org`, add one:

```
example.com.  CAA  0 issue "letsencrypt.org"
```

Keep your existing CAA records if other services need them. Just add this one.

3. Wait for DNS to update. Meridian retries certificate issuance automatically. You can also click **Retry certificate** on the domain in the dashboard.

If there are no CAA records at all, any certificate authority is allowed, and CAA is not the problem.

## Other checks

- The domain must be verified first (see KB-017).
- The CNAME must point to `edge.meridian.example` and must not be proxied (see KB-016).

## Still not issued?

Contact support with your account ID (from Settings > Account), the domain name, the status shown in the dashboard, and the output of the CAA lookups.
