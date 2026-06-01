# Privacy Policy — Armor

**Last updated:** June 1, 2026
**Effective date:** June 1, 2026
**App name:** Armor
**Developer:** Armor (Cam Sterling / Ashbi Design)
**Contact:** hi@getshift6.com

Armor is built on a local-first principle. This policy explains exactly what data lives where, and what we don't do with it.

---

## Summary (TL;DR)

- **By default, your data lives only on your device.** Nothing leaves it.
- **Optional cloud sync is opt-in.** You create an account, choose to sync. You can delete your cloud account at any time and your local data is unaffected.
- **We don't sell your data.** We don't show you ads. We don't share with third parties.
- **We don't track you across apps.** No analytics SDK, no fingerprinting, no third-party cookies.

---

## 1. Data We Do NOT Collect

We do not collect, transmit, or store:

- ❌ Location data
- ❌ Camera or microphone access
- ❌ Contacts, photos, or other on-device data
- ❌ Advertising identifiers (IDFA, GAID)
- ❌ Crash analytics tied to your identity
- ❌ Any data when you're not signed in (we have nothing to attach it to)

## 2. Data Stored Locally (Always)

These live in your device's localStorage / Capacitor Preferences. Never transmitted unless you sign in AND sync:

- Workout history (exercises, sets, reps, weight, dates, notes)
- 1RM estimates (estimated per exercise)
- Current cycle state (week, day, completed days)
- Daily habit state (boolean flags, dates)
- Streak data (count, longest, freeze usage, MVD dates)
- Active modifiers (MVD, CNS fatigue, heavy meal, travel, time crunch)
- App preferences (theme, units, sound/vibration, notification hour)

## 3. Data Sent to Cloud (Only if You Sign In)

If and only if you create an account and sign in, the data above is sent to our cloud server (Fastify + Postgres on Hetzner/Hostinger VPS) using TLS 1.3.

Authentication data:
- Email address (used as account identifier)
- Password (bcrypt-hashed with cost factor 12. Never stored in plaintext. Never sent to any third party.)

Server stores:
- account_id (UUID, server-generated)
- email
- password_hash
- display_name (optional, you provide it)
- created_at
- last_login_at

The same data listed in §2 (workout history, 1RMs, etc.) is sent as a single JSONB blob when you sync. We do not parse, analyze, or transform this data server-side beyond conflict detection (revision counter).

## 4. Cloud Sync Behavior

- Sync is **debounced 2 seconds** after local changes — so typing a note doesn't trigger 10 pushes
- Sync is **automatic when online** and logged in. Sync is **silent on failure** (offline, network blip). The app retries on next online event.
- Sync uses **last-write-wins by monotonic revision counter**. If two devices edit at the same time, the second to push gets a 409 conflict response, and the client offers "Keep Local" or "Use Server" UI.
- We do not transmit your data to any third party for any purpose.

## 5. JWT Tokens

When you sign in, the server issues a JWT (JSON Web Token) signed with HS256 and a server-side secret. The token:

- Expires in **90 days**
- Contains only `userId` (UUID). No personal data.
- Is sent via `Authorization: Bearer` header on every sync request
- Is stored in your device's localStorage. If you sign out, it's deleted.

We do not use refresh tokens, session cookies, or third-party auth providers (no Google, no Apple Sign-In in v3.0).

## 6. Haptics and Notifications

- **Vibration API** is used for in-app haptics (timer ends, PR detection). This uses the device's standard vibration hardware. No permission required, no data sent.
- **Local notifications** (Apple Push, FCM) are opt-in. If you enable daily reminders, the schedule is stored locally and the notification fires from your device. We do not send push notifications from our servers.
- **Apple Watch** support: workout data is synced between phone and watch via Apple's standard WatchConnectivity framework. We do not have access to the data path.

## 7. Children Under 13

Armor is not directed at children under 13. We do not knowingly collect data from children. If you believe a child has created an account, email hi@getshift6.com and we'll delete it.

## 8. Your Rights (GDPR, CCPA, etc.)

You have the right to:
- **Access** — request a copy of your cloud data (email us)
- **Erasure** — delete your cloud account (Settings → Reset All Data, or email us)
- **Portability** — your local data is in localStorage as JSON; you can copy it manually
- **Rectification** — fix incorrect data (Settings → 1RM, profile name)
- **Object** — stop processing (sign out, delete account)

Local data is always yours to keep. Cloud data deletion is permanent (no soft delete).

## 9. Data Retention

- **Local data:** persists until you delete the app or use "Reset All Data" in Settings
- **Cloud data:** persists until you delete your account. We do not auto-delete inactive accounts (no orphan cleanup cron), but you can request bulk deletion of old accounts at any time.
- **Logs:** Our servers log IP addresses for 7 days for security/DDoS protection. Logs are then rolled. We do not correlate logs with accounts.

## 10. International Transfers

Our cloud server is hosted on Hetzner (Germany) or Hostinger (US, depending on deployment). If you sign in from outside the EU/US, your data crosses borders. By signing in, you consent to this transfer. (For GDPR: Hetzner is a valid processor under Standard Contractual Clauses; Hostinger too.)

## 11. Security Measures

- TLS 1.3 for all data in transit
- bcrypt cost factor 12 for password hashing
- JWT signed with HS256, server-side secret rotated manually on suspected compromise
- Postgres row-level isolation for multi-tenant data
- Hashed `armor_data` is the user_id + auth context — no data is queryable by other users
- Database access restricted to internal network, not publicly exposed

We do not claim to be unhackable. If we suffer a breach, we will:
1. Notify affected users within 72 hours
2. Force-reset all passwords
3. Publish a postmortem

## 12. Changes to This Policy

If we change this policy materially, we will:
1. Update the "Last updated" date
2. Show a one-time in-app banner on next launch
3. Email you if you have an account (we have your email)

We will not retroactively weaken your rights. If we ever do, the previous version remains in effect for data collected under it.

## 13. Contact

Email: hi@getshift6.com
Response time: 7 business days

For GDPR requests specifically: gdpr@getshift6.com (same inbox, monitored)
For data deletion: just delete your account in Settings, or email us.

---

## Cookie Policy (Web PWA only)

The Armor PWA at `getshift6.com` does not use cookies. We don't even have a cookie banner because there's nothing to banner about. The PWA stores all data in localStorage.

The landing page at `armor.ashbi.ca` does not set cookies. If you self-host with analytics (Plausible / Fathom), they would set first-party cookies. We don't enable that by default.

---

## Open Source

The Armor PWA is built with standard open-source tools (React, Vite, Tailwind, Lucide, Capacitor). We do not use any closed-source SDKs in the client. Our cloud sync server is also open source (Fastify + Postgres + JWT, no SaaS dependencies).

Last updated: June 1, 2026
