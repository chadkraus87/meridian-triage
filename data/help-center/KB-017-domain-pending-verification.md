---
id: KB-017
title: Custom domain stuck on "Pending verification"
area: dns_domains
tags: pending verification, custom domain, txt record, dns propagation, cloudflare proxy, verify domain
---
If your custom domain stays on "Pending verification" in the dashboard, Meridian can't yet see the DNS records it needs (see KB-016).

## Common causes

**1. The TXT record is missing.**
You need a TXT record on the `_meridian-verify` host with the token shown in the dashboard.

**2. The TXT record is on the wrong host.**
Many DNS providers add your domain to the host name automatically. If you entered `_meridian-verify.app.example.com`, the record may have been created as `_meridian-verify.app.example.com.example.com`. Enter only the part before your domain.

**3. DNS has not propagated.**
DNS changes can take up to 48 hours to propagate, depending on the record's TTL and your provider.

**4. The CNAME is proxied.**
Proxied CNAMEs (for example orange-cloud) block verification. The CNAME must point directly to `edge.meridian.example`. Set the record to DNS only.

**5. The token doesn't match.**
If you removed and re-added the domain, Meridian created a new token. Update the TXT record with the current one.

## How to check

1. Look up the TXT record with a DNS lookup tool or the command line:
   `dig TXT _meridian-verify.app.example.com`
2. Confirm the value matches the token in the dashboard exactly.
3. Look up the CNAME and confirm it returns `edge.meridian.example`, not a proxy address.
4. In Meridian, click **Verify** again.

## Still pending after 48 hours?

Contact support with your account ID (from Settings > Account), the domain name, the output of the DNS lookups above, and when you added the records.
