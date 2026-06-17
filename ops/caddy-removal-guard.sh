#!/usr/bin/env bash
# Caddy-removal guard for the Ashbi fleet VPS.
#
# As of 2026-06-17, the VPS runs Traefik on :80/:443 as the SOLE public
# edge proxy. Caddy was decommissioned:
#   - caddy.service systemd unit: masked
#   - /opt/caddy/Caddyfile: vestigial, no process reads it
#   - /etc/caddy/Caddyfile: was empty/missing
#   - The caddy binary at /usr/local/bin/caddy: kept for now so legacy
#     deploy scripts that call `caddy validate` get a "not configured"
#     error instead of a "command not found" surprise.
#
# Run via cron every 5 minutes. Logs to /var/log/caddy-removal.log.

set -uo pipefail

LOG="/var/log/caddy-removal.log"
TRAEFIK_ROUTERS="/opt/traefik/dynamic/routers.yml"

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" | tee -a "$LOG"; }

# 1. Traefik is the only edge proxy. If it dies, sites go down.
if ! pgrep -f "traefik traefik" > /dev/null 2>&1 && ! docker ps --format '{{.Names}}' 2>/dev/null | grep -qx traefik; then
    log "CRIT: traefik process is not running"
    systemctl restart traefik 2>&1 | tee -a "$LOG" || true
fi

# 2. Traefik is listening on 443. (ss -tln has no LISTEN flag word;
#    the state is implicit in the column position. Match on port alone.)
if ! ss -tln 2>/dev/null | grep -qE ':\s*443\s'; then
    log "CRIT: nothing is listening on :443"
fi

# 3. Caddy service is masked. systemctl is-enabled returns
#    "masked" with exit code 1, so a bare pipe-to-grep would
#    fail under pipefail. Use an explicit assignment instead.
CADDY_STATE=$(systemctl is-enabled caddy 2>/dev/null || true)
if [ "$CADDY_STATE" != "masked" ]; then
    log "WARN: caddy.service state is '$CADDY_STATE' (expected 'masked') - re-masking"
    systemctl mask caddy.service
fi

# 4. Caddy binary, if it exists, is not bound to any port.
CADDY_PIDS=$(pgrep -f "/usr/local/bin/caddy" 2>/dev/null || true)
if [ -n "$CADDY_PIDS" ]; then
    log "WARN: caddy binary running with pids: $CADDY_PIDS (killing)"
    for p in $CADDY_PIDS; do
        kill -9 "$p" 2>/dev/null || true
    done
fi

# 5. The caddy-guard crons from other agents. They still write to
#    /opt/caddy/Caddyfile every minute. Harmless but log noise.
for c in markup-caddy-guard simaqadeer-caddy-guard splashtown-host-guard; do
    if [ -f "/etc/cron.d/$c" ]; then
        log "INFO: $c cron still installed (consider migrating to Traefik)"
    fi
done

log "OK caddy-removal guard finished"
