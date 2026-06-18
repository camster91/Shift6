#!/usr/bin/env bash
# Deploy the Armor PWA to VPS 187.77.26.99.
#
# The container's runtime/serve.cjs serves /opt/armor-live/dist/ (NOT the
# top-level /opt/armor-live/). The tarball must be extracted INTO the dist/
# subdir, not at the top level, or you'll get a mix of old and new files.
#
# Usage:  ops/deploy.sh
#   Builds, tars, pushes, extracts into /opt/armor-live/dist/, restarts the
#   container, and verifies the new asset hash is being served.

set -euo pipefail

VPS="root@187.77.26.99"
LOCAL_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARBALL="/tmp/armor-dist-$(date +%Y%m%d-%H%M%S).tar.gz"

echo "==> build"
cd "$LOCAL_ROOT"
npm run build --silent

echo "==> tar dist/"
tar -czf "$TARBALL" -C dist .

echo "==> push to $VPS"
cat "$TARBALL" | ssh "$VPS" "cat > $TARBALL"

echo "==> extract into /opt/armor-live/dist/ and restart"
ssh "$VPS" "set -e
  rm -rf /opt/armor-live/dist
  mkdir -p /opt/armor-live/dist
  tar -xzf $TARBALL -C /opt/armor-live/dist
  docker restart armor-web
  sleep 1
"

echo "==> verify"
EXPECTED_JS=$(grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' "$LOCAL_ROOT/dist/index.html" | head -1)
EXPECTED_CSS=$(grep -oE 'assets/index-[A-Za-z0-9_-]+\.css' "$LOCAL_ROOT/dist/index.html" | head -1)
LIVE_JS=$(curl -s https://getshift6.com/ | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' | head -1)
LIVE_CSS=$(curl -s https://getshift6.com/ | grep -oE 'assets/index-[A-Za-z0-9_-]+\.css' | head -1)

if [[ "$EXPECTED_JS" == "$LIVE_JS" && "$EXPECTED_CSS" == "$LIVE_CSS" ]]; then
  echo "OK  js=$LIVE_JS css=$LIVE_CSS"
  echo "Live: https://getshift6.com/"
else
  echo "MISMATCH  expected js=$EXPECTED_JS css=$EXPECTED_CSS"
  echo "          got      js=$LIVE_JS css=$LIVE_CSS"
  exit 1
fi

echo "==> cleanup"
ssh "$VPS" "rm -f $TARBALL"
rm -f "$TARBALL"
