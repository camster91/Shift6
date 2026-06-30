#!/bin/bash
# ops/build-release-aab.sh — Build a release-signed AAB for Play Store.
#
# Requires 3 env vars:
#   RELEASE_STORE_PASSWORD — the password for the .keystore file
#   RELEASE_KEY_ALIAS      — the key alias inside the keystore
#   RELEASE_KEY_PASSWORD   — the password for that specific key
#
# These are NEVER committed. Run with:
#   export RELEASE_STORE_PASSWORD='...'
#   export RELEASE_KEY_ALIAS='...'
#   export RELEASE_KEY_PASSWORD='...'
#   bash ops/build-release-aab.sh
#
# Output: android/app/build/outputs/bundle/release/app-release.aab
# (also android/app/build/outputs/apk/release/ for the split APK)
#
# After build, verify:
#   jarsigner -verify -verbose -certs android/app/build/outputs/bundle/release/app-release.aab
#   apksigner verify --print-certs android/app/build/outputs/bundle/release/app-release.aab

set -e

cd "$(dirname "$0")/.."

# Sanity check
[ -z "$RELEASE_STORE_PASSWORD" ] && { echo "RELEASE_STORE_PASSWORD not set"; exit 1; }
[ -z "$RELEASE_KEY_ALIAS" ]      && { echo "RELEASE_KEY_ALIAS not set"; exit 1; }
[ -z "$RELEASE_KEY_PASSWORD" ]   && { echo "RELEASE_KEY_PASSWORD not set"; exit 1; }

# Build the web bundle first
echo "=== Building web bundle ==="
npm run build

# Sync the bundle into the Android project
echo "=== Syncing to Capacitor ==="
npx cap sync android

# Build the release AAB
echo "=== Building release AAB ==="
cd android
./gradlew bundleRelease --no-daemon 2>&1 | tail -30
cd ..

# Verify
AAB="android/app/build/outputs/bundle/release/app-release.aab"
if [ -f "$AAB" ]; then
  echo ""
  echo "=== Build complete ==="
  echo "AAB: $(ls -lh $AAB | awk '{print $5}') at $AAB"
  echo ""
  echo "Verify signature:"
  echo "  apksigner verify --print-certs $AAB"
else
  echo "Build failed — AAB not found"
  exit 1
fi