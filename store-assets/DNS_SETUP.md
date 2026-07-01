# Shift6 — DNS Setup for getshift6.com / ashbi.ca

## Overview

Shift6 is served from **187.77.26.99** (Cam's VPS at Hetzner/Hostinger). Coolify + Traefik on the VPS handle TLS termination. Three subdomains need DNS records:

| Subdomain | Purpose | Container |
|-----------|---------|-----------|
| `getshift6.com` | Existing PWA (already routed) | `toc8kck8g08k8g0co0gg8ggs-...` |
| `armor.ashbi.ca` | Landing page (new) | `armor-landing` (nginx) |
| `sync.getshift6.com` | Cloud sync API (new) | `armor-sync-api` (fastify) |

The VPS already has Traefik + Let's Encrypt configured for any `Host(...)` label on a container. Once DNS points, HTTPS works automatically.

---

## Step 1: Add A records (Cloudflare or wherever DNS lives)

Add these three A records, all pointing to the same IP:

| Type | Name | Value | Proxy | TTL |
|------|------|-------|-------|-----|
| A | `@` (or `getshift6.com`) | `187.77.26.99` | DNS only (grey cloud) | Auto |
| A | `armor` | `187.77.26.99` | DNS only | Auto |
| A | `sync` | `187.77.26.99` | DNS only | Auto |

**Important:** Use DNS-only mode (grey cloud), not proxied (orange cloud). Cloudflare proxy interferes with the Let's Encrypt HTTP-01 challenge that Traefik uses.

If `getshift6.com` is already on Cloudflare proxy and you can't switch, you'll need DNS validation instead. Contact me — there's a workaround using `acme.json` with Cloudflare DNS-01.

---

## Step 2: Verify DNS propagation

```bash
# Should return 187.77.26.99 for each
dig +short getshift6.com
dig +short armor.ashbi.ca
dig +short sync.getshift6.com

# Should show Let's Encrypt certs within ~60 seconds
curl -sI https://getshift6.com/        | head -3
curl -sI https://armor.ashbi.ca/        | head -3
curl -sI https://sync.getshift6.com/    | head -3
```

---

## Step 3: Traefik auto-cert

Traefik watches the `coolify` Docker network. As soon as a container has a `traefik.http.routers.<name>.tls.certresolver=letsencrypt` label, it issues a cert on the next request to that hostname.

Current state on the VPS:
- `armor-landing` is labeled for `Host(armor.ashbi.ca)` — cert will issue on first request
- `armor-sync-api` is labeled for `Host(sync.getshift6.com)` — same
- `toc8kck8g08k8g0co0gg8ggs-...` is the existing `getshift6.com` PWA — already certified

---

## Step 4: Verify each service

```bash
# Landing page
curl -sI https://armor.ashbi.ca/   # 200 OK + Shift6 title

# Sync API
curl -s https://sync.getshift6.com/health   # {"status":"ok",...}

# PWA (existing)
curl -sI https://getshift6.com/   # 200 OK + Shift6
```

---

## Optional: Wildcard cert

If Cam wants `*.getshift6.com` to work for any future subdomain, do DNS-01 with Cloudflare API token. Contact me — I can set it up.

---

## Troubleshooting

**"DNS not resolving"** — wait 5-10 minutes for Cloudflare to propagate. Use `dig +trace` to see the chain.

**"Cert not issued after 60s"** — check `docker logs coolify-proxy` for the Let's Encrypt error. Most common cause: DNS-01 vs HTTP-01 mismatch. Traefik uses HTTP-01 by default, so DNS must resolve to the server IP.

**"Mixed content warnings"** — all Shift6 assets are relative paths. If you see warnings, check that the PWA's `index.html` has `<meta http-equiv="Content-Security-Policy">` (currently does not, which is fine — but document it).

**"armor-sync-api unhealthy in Coolify"** — cosmetic. The IPv6-vs-IPv4 healthcheck race I worked around in the Dockerfile. The service itself returns 200 OK on manual `curl`. Monitor with:
```bash
ssh coolify 'curl -s http://127.0.0.1:4001/health'
```

---

## What the user does NOT need to do

- No port forwarding changes (Traefik handles 80/443)
- No firewall changes (VPS already allows HTTP/HTTPS)
- No SSL cert management (Let's Encrypt auto-renews via Traefik)
- No Docker changes (containers are already running with correct labels)
