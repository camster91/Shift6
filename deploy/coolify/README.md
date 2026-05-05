# Shift6 — Coolify Deployment

## Quick start

### 1. Add Shift6 in Coolify UI
1. Go to your Coolify dashboard → **New Resource**
2. Select **GitHub** → pick the `camster91/Shift6` repo
3. Set branch to `main`
4. **Build Pack**: select `Dockerfile`
5. **Dockerfile Path**: `deploy/coolify/Dockerfile`
6. **Publish Port**: `3000`

### 2. Environment variables
In Coolify's env panel, add:

| Key | Value |
|-----|-------|
| `APP_URL` | Your assigned domain (e.g. `https://shift6-xxx.coolify.tech`) |
| `APP_PORT` | `3000` |
| `DATABASE_PATH` | `/app/data/shift6.db` |
| `STRIPE_SECRET_KEY` | `sk_live_...` |
| `STRIPE_PRO_PRICE_ID` | `price_...` (from Stripe Dashboard) |
| `STRIPE_TEAM_PRICE_ID` | `price_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` |

### 3. Persistent storage
Add a persistent volume mount so SQLite survives redeploys:

```
Source:   shift6-data
Target:   /app/data
```

### 4. Deploy
Click **Deploy** — Coolify will build the Docker image and start the container.

## Architecture

```
Internet → nginx :80 → app :3000 (Node.js + better-sqlite3)
                ↓
          /api/*  → Stripe checkout/webhooks + workout API
          /*      → SPA fallback (dist/)
```

## What's persisted

SQLite file at `/app/data/shift6.db` survives redeploys via named volume `shift6-data`.

Schema auto-creates on first boot:
- `users` — email → Stripe customer mapping
- `subscriptions` — per-user subscription status
- `workouts` — workout history per user

## Stripe webhook setup

In Stripe Dashboard → Webhooks, add endpoint:
```
https://your-shift6-domain.com/api/webhooks/stripe
```
Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

## Useful commands (Coolify shell)

```bash
# Check server logs
docker logs shift6-app

# View SQLite DB
docker exec shift6-app sh -c "ls /app/data/"

# Rebuild after env var changes
# Trigger redeploy from Coolify dashboard
```