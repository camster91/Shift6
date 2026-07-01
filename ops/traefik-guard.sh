#!/usr/bin/env bash
# Shift6 Traefik route guard.
#
# Ensures the Shift6 site is routed through Traefik to the armor-web
# container on 127.0.0.1:3003. Re-adds the routers, middleware, and
# service entries if a fleet-wide edit drops them.
#
# Idempotent: safe to run every minute.
#
# Cron entry (run `crontab -e` on the VPS):
#   * * * * * /opt/armor-live/ops/traefik-guard.sh >> /var/log/armor-traefik-guard.log 2>&1
#
# To force a re-patch: rm /opt/armor-live/.guard-state/last_patch_marker

set -euo pipefail

LOG_PREFIX="[$(date -u +%Y-%m-%dT%H:%M:%SZ)]"
ROUTERS="/opt/traefik/dynamic/routers.yml"
SERVICE_URL="http://127.0.0.1:3003"
STATE_DIR="/opt/armor-live/.guard-state"
STATE="$STATE_DIR/last_patch_marker"

log() { echo "$LOG_PREFIX $*" >&2; }

mkdir -p "$STATE_DIR"

if grep -q "Host(\`getshift6.com\`)" "$ROUTERS"; then
    log "OK getshift6 router present"
    exit 0
fi

log "MISSING getshift6 router; patching $ROUTERS"
cp "$ROUTERS" "$STATE_DIR/routers.yml.bak.$(date -u +%Y%m%d_%H%M%S)"

python3 <<PYEOF
from pathlib import Path
text = Path("$ROUTERS").read_text()
if "Host(\`getshift6.com\`)" in text:
    print("already patched")
    raise SystemExit(0)

mw_marker = "        browserXssFilter: true\n"
assert text.count(mw_marker) == 1, f"Expected 1 browserXssFilter line, found {text.count(mw_marker)}"
armor_mw = """
    armor-security:
      headers:
        stsIncludeSubdomains: true
        stsSeconds: 63072000
        customFrameOptionsValue: "DENY"
        contentTypeNosniff: true
        referrerPolicy: "strict-origin-when-cross-origin"
        permissionsPolicy: "geolocation=(), microphone=(), camera=(), payment=(), accelerometer=(), gyroscope=(), magnetometer=()"

    armor-compress:
      compress: {}
"""
text = text.replace(mw_marker, mw_marker + armor_mw, 1)

services_split = "  services:\n"
assert text.count(services_split) == 1
before, after = text.split(services_split, 1)
if not before.endswith("\n\n"):
    before = before.rstrip("\n") + "\n\n"
armor_routers = """    getshift6:
      rule: "Host(`getshift6.com`)"
      entryPoints: [websecure]
      service: armor
      middlewares: [armor-compress, armor-security]
      tls:
        certResolver: letsencrypt
    getshift6-www:
      rule: "Host(`www.getshift6.com`)"
      entryPoints: [websecure]
      service: armor
      middlewares: [armor-compress, armor-security]
      tls:
        certResolver: letsencrypt
"""
text = before + armor_routers + services_split + after

armor_svc = """
    armor:
      loadBalancer:
        servers:
          - url: "http://127.0.0.1:3003"
"""
text = text.rstrip("\n") + "\n" + armor_svc

Path("$ROUTERS").write_text(text)
print("patched")
PYEOF

if ! curl -sI --max-time 5 "$SERVICE_URL/" >/dev/null 2>&1; then
    log "WARN armor-web not reachable at $SERVICE_URL"
fi

echo "patched-$(date -u +%s)" > "$STATE"
log "OK patched and watching"
