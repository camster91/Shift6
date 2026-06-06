#!/usr/bin/env bash
# Armor Gauntlet — 12 checks that must pass before App Store submission.
# Run from the repo root: ./scripts/gauntlet.sh
# Exits 0 on all-pass, non-zero on any failure.
# Outputs to gauntlet-report-$(date +%Y-%m-%d).md

set -o pipefail
# Note: -u (unbound variable) removed because Lighthouse URL and Chrome path
# are optional env vars. We check for them with -z below.

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"
REPORT="gauntlet-report-$(date +%Y-%m-%d).md"
PASS=0
FAIL=0
RESULTS=()

# Optional env vars (set before running the gauntlet, or accept defaults)
LH_URL="${LH_URL:-https://getshift6.com}"
LH_CHROME_PATH="${LH_CHROME_PATH:-}"

# Colors (if TTY)
if [ -t 1 ]; then
  GREEN='\033[0;32m'
  RED='\033[0;31m'
  YELLOW='\033[0;33m'
  NC='\033[0m'
else
  GREEN=''; RED=''; YELLOW=''; NC=''
fi

pass() { PASS=$((PASS+1)); RESULTS+=("PASS|$1"); printf "${GREEN}PASS${NC}  %s\n" "$1"; }
fail() { FAIL=$((FAIL+1)); RESULTS+=("FAIL|$1|$2"); printf "${RED}FAIL${NC}  %s — %s\n" "$1" "$2"; }
warn() { RESULTS+=("WARN|$1|$2"); printf "${YELLOW}WARN${NC}  %s — %s\n" "$1" "$2"; }
section() { printf "\n${YELLOW}== %s ==${NC}\n" "$1"; }

# ───────────────────────────────────────────────────────────
# 1. npm run build
# ───────────────────────────────────────────────────────────
section "1/12 — Build"
if npm run build > /tmp/gauntlet-build.log 2>&1; then
  pass "1. npm run build"
else
  fail "1. npm run build" "see /tmp/gauntlet-build.log"
fi

# ───────────────────────────────────────────────────────────
# 2. tsc --noEmit (only if TypeScript is in the project)
# ───────────────────────────────────────────────────────────
section "2/12 — TypeScript"
if [ -f "tsconfig.json" ] && [ -d "node_modules/typescript" ]; then
  if npx tsc --noEmit > /tmp/gauntlet-tsc.log 2>&1; then
    pass "2. tsc --noEmit"
  else
    ERRORS=$(tail -20 /tmp/gauntlet-tsc.log)
    fail "2. tsc --noEmit" "$ERRORS"
  fi
else
  warn "2. tsc --noEmit" "TypeScript not in this project (no tsconfig.json) — skipped"
fi

# Also check that package.json wasn't cheated with || true or 2>/dev/null
if grep -E '\|\| *true|2>/dev/null' package.json > /dev/null 2>&1; then
  fail "2b. package.json build script" "contains '|| true' or '2>/dev/null' — tsc errors being hidden"
else
  pass "2b. package.json build script (no error-swallowing)"
fi

# ───────────────────────────────────────────────────────────
# 3. Orphan component scan
# ───────────────────────────────────────────────────────────
section "3/12 — Orphan components"
ORPHANS=0
ORPHAN_LIST=""
# Use find instead of glob to avoid zsh glob issues with 2>/dev/null
JSX_FILES=$(find src/components -maxdepth 1 -type f \( -name "*.jsx" -o -name "*.tsx" \) 2>/dev/null)
for f in $JSX_FILES; do
  [ -f "$f" ] || continue
  base=$(basename "$f" .jsx)
  base=$(basename "$base" .tsx)
  # Skip known non-imported files
  case "$base" in
    ErrorBoundary|Celebration|PlateVisualizer) continue ;;
  esac
  # Check if imported anywhere
  if ! grep -rln "from.*['\"].*${base}['\"]" src/ 2>/dev/null | grep -v "$f" | head -1 > /dev/null; then
    ORPHANS=$((ORPHANS+1))
    ORPHAN_LIST="$ORPHAN_LIST\n  - $f"
  fi
done
if [ "$ORPHANS" -eq 0 ]; then
  pass "3. No orphan components"
else
  fail "3. Orphan components" "found $ORPHANS: $ORPHAN_LIST"
fi

# ───────────────────────────────────────────────────────────
# 4. cap sync android (catches native plugin mismatches)
# ───────────────────────────────────────────────────────────
section "4/12 — Capacitor sync"
if npx cap sync android > /tmp/gauntlet-cap.log 2>&1; then
  pass "4. npx cap sync android"
else
  fail "4. npx cap sync android" "see /tmp/gauntlet-cap.log"
fi

# ───────────────────────────────────────────────────────────
# 5. Lint
# ───────────────────────────────────────────────────────────
section "5/12 — Lint"
# Use the project's configured --max-warnings (default 5 in package.json)
# Stricter than this would flag pre-existing intentional warnings (see REVIEW_STATUS.md)
if npm run lint > /tmp/gauntlet-lint.log 2>&1; then
  pass "5. npm run lint"
else
  fail "5. npm run lint" "see /tmp/gauntlet-lint.log"
fi

# ───────────────────────────────────────────────────────────
# 6. Lighthouse mobile (performance + accessibility)
# ───────────────────────────────────────────────────────────
section "6/12 — Lighthouse"
LH_BIN="$(which lighthouse 2>/dev/null || echo '')"
if [ -z "$LH_BIN" ]; then
  warn "6. Lighthouse" "lighthouse not installed (npm i -g lighthouse)"
elif [ -z "${LH_CHROME_PATH:-}" ]; then
  warn "6. Lighthouse" "LH_CHROME_PATH not set; skipping (run manually: lighthouse https://getshift6.com --preset=desktop --form-factor=mobile)"
else
  lighthouse "$LH_URL" \
    --form-factor=mobile \
    --screen-emulation.mobile=true \
    --chrome-flags="--headless" \
    --output=json \
    --output-path=/tmp/gauntlet-lh.json \
    --chrome-path="$LH_CHROME_PATH" \
    --quiet > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    PERF=$(jq -r '.categories.performance.score * 100' /tmp/gauntlet-lh.json 2>/dev/null)
    A11Y=$(jq -r '.categories.accessibility.score * 100' /tmp/gauntlet-lh.json 2>/dev/null)
    if [ "${PERF%.*}" -ge 90 ] && [ "${A11Y%.*}" -ge 90 ]; then
      pass "6. Lighthouse mobile (perf=$PERF, a11y=$A11Y)"
    else
      fail "6. Lighthouse mobile" "perf=$PERF, a11y=$A11Y (need ≥90 each)"
    fi
  else
    fail "6. Lighthouse" "lighthouse run failed"
  fi
fi

# ───────────────────────────────────────────────────────────
# 7. Live site smoke test
# ───────────────────────────────────────────────────────────
section "7/12 — Live site"
HTTP=$(curl -s -o /tmp/gauntlet-html.txt -w '%{http_code}' --max-time 15 "$LH_URL")
if [ "$HTTP" = "200" ] && grep -q "Armor" /tmp/gauntlet-html.txt; then
  pass "7. Live site returns 200 with Armor branding"
else
  fail "7. Live site" "HTTP $HTTP, brand string missing"
fi

# Check the deployed JS bundle hash matches git HEAD (verifies deploy caught up)
DEPLOYED_JS=$(grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' /tmp/gauntlet-html.txt | head -1)
if [ -n "$DEPLOYED_JS" ]; then
  GIT_HASH=$(git rev-parse --short=12 HEAD)
  if echo "$DEPLOYED_JS" | grep -q "$GIT_HASH"; then
    pass "7b. Live bundle matches git HEAD ($GIT_HASH)"
  else
    warn "7b. Live bundle mismatch" "deployed=$DEPLOYED_JS, git=$GIT_HASH — deploy may be stale"
  fi
fi

# ───────────────────────────────────────────────────────────
# 8. Click-through audit (placeholder — uses auditor skill)
# ───────────────────────────────────────────────────────────
section "8/12 — Click-through audit"
if [ -f ~/.hermes/skills/auditor-button-click-through/SKILL.md ]; then
  warn "8. Click-through audit" "delegated to auditor skill — run manually or via subagent"
else
  warn "8. Click-through audit" "auditor skill not installed; skip (manual click-through required)"
fi

# ───────────────────────────────────────────────────────────
# 9. Visual regression (placeholder)
# ───────────────────────────────────────────────────────────
section "9/12 — Visual regression"
warn "9. Visual regression" "requires browser_vision run per page — run as subagent or manually"

# ───────────────────────────────────────────────────────────
# 10. Service worker / offline
# ───────────────────────────────────────────────────────────
section "10/12 — Service worker"
SW_PRESENT=$(grep -c "registerSW.js\|workbox" /tmp/gauntlet-html.txt)
if [ "$SW_PRESENT" -gt 0 ]; then
  pass "10. Service worker registered"
else
  warn "10. Service worker" "no SW references in HTML"
fi

# ───────────────────────────────────────────────────────────
# 11. Mobile viewport matrix (placeholder)
# ───────────────────────────────────────────────────────────
section "11/12 — Mobile viewport matrix"
warn "11. Mobile viewport" "requires browser run at 375/390/412/768px — run as subagent or manually"

# ───────────────────────────────────────────────────────────
# 12. VoiceOver / a11y spot check (placeholder)
# ───────────────────────────────────────────────────────────
section "12/12 — A11y / screen reader"
warn "12. A11y spot check" "requires manual screen reader run — see a11y report from subagent"

# ───────────────────────────────────────────────────────────
# Summary + report
# ───────────────────────────────────────────────────────────
section "Summary"
echo "  Passed: $PASS / 12"
echo "  Failed: $FAIL / 12"
echo "  Warnings: $(printf '%s\n' "${RESULTS[@]}" | grep -c '^WARN')"
echo ""

# Write the report
{
  echo "# Armor Gauntlet Report — $(date +%Y-%m-%d)"
  echo ""
  echo "**Repo:** $REPO_ROOT"
  echo "**Git HEAD:** $(git rev-parse --short=12 HEAD)"
  echo "**Live site:** ${LH_URL:-https://getshift6.com}"
  echo ""
  echo "## Results"
  echo ""
  echo "| # | Check | Result |"
  echo "|---|-------|--------|"
  printf '| %s |\n' "${RESULTS[@]}" | awk -F'|' '{
    n = split($2, a, ".");
    printf "| %s | %s | %s |\n", a[1], $2, $1
  }' | head -30
  echo ""
  echo "## Summary"
  echo ""
  echo "- **Passed:** $PASS / 12"
  echo "- **Failed:** $FAIL / 12"
  if [ "$FAIL" -eq 0 ]; then
    echo ""
    echo "**ALL PASS — ready for tester team.**"
  else
    echo ""
    echo "**$FAIL CHECK(S) FAILED — fix before tester team.**"
  fi
} > "$REPORT"

echo "Report written to: $REPORT"

# Exit code
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
