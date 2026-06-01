# Armor — Test Plan & Verification Checklist

Use this before declaring the app "shipped." Each section has a pass/fail.

---

## 1. Unit-level smoke (5 min)

```bash
# Web build
cd ~/Shift6 && npm run build
# Expect: ✓ built in ~2s, dist/ ~250KB

# API health
ssh coolify 'curl -s http://127.0.0.1:4001/health'
# Expect: {"status":"ok",...}

# Landing page
ssh coolify 'curl -sI http://127.0.0.1:4002/ | head -1'
# Expect: HTTP/1.1 200 OK

# Android APK exists
ls -la ~/Shift6/store-assets/Armor-v3.0.0-debug.apk
# Expect: -rw-r--r-- ~7MB file
```

- [ ] Web build green
- [ ] API health 200
- [ ] Landing 200
- [ ] APK built

---

## 2. Single-device flow (15 min, on real phone)

### Install
- [ ] Transfer `Armor-v3.0.0-debug.apk` to phone (USB, email, or `adb install`)
- [ ] Open APK, accept unknown source
- [ ] App opens to "Choose Your Track"

### Onboarding
- [ ] Select Full Gym, tap Continue
- [ ] Open Barbell Squat row, enter weight+reps, save (or Skip)
- [ ] On "You're Ready" screen, enter name, tap "Begin Armor Protocol"
- [ ] Button morphs to "Entering Armor..." in green (proves submitting state works)
- [ ] Lands on dashboard

### Dashboard
- [ ] "Good morning, [name]" greeting
- [ ] Cycle progress shows "Cycle 1 · Week 1 · Day 1/5 · Base"
- [ ] 4 modifier chips visible (MVD, CNS, Heavy Meal, Travel)
- [ ] Workout card shows "Heavy Squats" with plate math
- [ ] 4 daily habits shown
- [ ] Bottom tab bar: Today / Progress / Account / Settings

### Workout session
- [ ] Tap "Start" on the workout card
- [ ] First set shows: 3 sets × 8 reps @ 78% + plate math (45 + 45 + 10 per side for 215 lbs)
- [ ] Tap "Complete Set 1" → rest timer starts
- [ ] Timer counts down from 120, turns amber at ≤10s
- [ ] Tap "Skip Rest" or wait → next set
- [ ] After 3 sets, "Workout Complete" screen with volume tally
- [ ] Tap "Finish & Log" → back to dashboard, day advances to 2

### Multi-day test
- [ ] Open app on day 2
- [ ] Dashboard shows Day 2 (VO2 Max + Pull)
- [ ] Complete the VO2 Max intervals
- [ ] Streak increases to 2
- [ ] Weekly volume chart on Progress page shows 2 days

---

## 3. Contingency protocol tests (10 min)

For each, toggle on the dashboard, verify behavior:

### MVD Mode
- [ ] Tap MVD chip → turns amber
- [ ] Workout card replaced with "Minimum Viable Day" panel
- [ ] 3 items: 100 push-ups, 15-min walk, 5-min mobility
- [ ] No "Start" button
- [ ] Toggle off → workout card restored

### 20-Minute Window (via Time Crunch modifier — not yet wired in UI, skip)

### Heavy Meal
- [ ] Tap Heavy Meal chip → turns amber
- [ ] Dinner Walk duration shows 20m instead of 10m
- [ ] Toggle off → back to 10m

### Travel Mode
- [ ] Tap Travel chip → turns amber
- [ ] Day number does NOT advance when you log a workout
- [ ] Toggle off → day advances normally again

### CNS Fatigue
- [ ] Tap CNS chip → turns amber
- [ ] Open workout, primary lift weight drops to 60% × 1RM
- [ ] Rep range shifts to 10

---

## 4. PR detection test (5 min)

- [ ] Use the onboarding 5-rep test to set squat 1RM = 225
- [ ] Day 1 Heavy Squats calculated as 4×5 @ 80% = 180 lbs
- [ ] Complete all sets with 180
- [ ] Next day, edit 1RM to 195 (lower, simulating you're a beginner)
- [ ] Open the workout — Armor's calc is now 156 lbs
- [ ] Complete all sets with 156
- [ ] Should NOT trigger confetti (no PR)

To trigger confetti, do the opposite: lower 1RM to 100, complete sets, then raise 1RM back. (Or just test it once with the magic number.)

---

## 5. Multi-device cloud sync (15 min, requires 2 devices + DNS setup)

### Pre-reqs
- [ ] DNS A record for `sync.getshift6.com` pointing to VPS (see DNS_SETUP.md)
- [ ] Both devices have the latest Armor APK installed
- [ ] Both have completed onboarding to the same point (or not — sync is per-account)

### Account creation
- [ ] On device A: Account tab → create account with email `test@armor.dev` + password
- [ ] Verify "Logged in" view shows email
- [ ] Force-quit and reopen — should stay logged in
- [ ] Repeat on device B with same credentials (or new account if testing 2 users)

### Sync round-trip
- [ ] On device A: log a workout
- [ ] Wait 3 seconds (debounce 2s + push)
- [ ] On Account page: status should show "Synced" with timestamp
- [ ] On device B: pull to refresh / sign in same account / wait
- [ ] Device B should show the workout from device A

### Conflict test
- [ ] On device A: log a workout, go offline (airplane mode)
- [ ] On device A: log ANOTHER workout (local only)
- [ ] On device B (online): log a workout
- [ ] On device A: turn wifi back on
- [ ] Sync attempt → device A's push will 409 (B is newer)
- [ ] Conflict banner appears on Account page: "Keep Local" or "Use Server"
- [ ] Tap "Use Server" → local data replaced with B's data
- [ ] OR tap "Keep Local" → A's local wins, server re-syncs

### Stale token test
- [ ] On device A: log in, verify "Synced"
- [ ] Manually clear `armor_auth` from localStorage in DevTools
- [ ] Refresh page
- [ ] Should show logged-out state (no crash)

---

## 6. Accessibility audit (10 min)

### Visual
- [ ] Increase system text size to largest — UI still readable
- [ ] Toggle system "Increase Contrast" — borders become visible
- [ ] Toggle system "Reduce Motion" — animations should be nearly instant

### Keyboard / Switch Control
- [ ] External keyboard: tab through dashboard
- [ ] All interactive elements have visible focus ring (cyan 2px outline)
- [ ] Enter/Space activates buttons

### Screen reader
- [ ] VoiceOver (iOS) or TalkBack (Android) on dashboard
- [ ] All images have alt text (the ⚔️ emoji should announce as "shield" or similar)
- [ ] Workout card reads as: "Heavy Squats. Strength. Base phase. Primary lift: 215 pounds, 3 sets, 8 reps, 78% of 1-rep max. Start button."

---

## 7. Performance (5 min)

### On phone
- [ ] Cold start to dashboard < 2s on iPhone 11 / Pixel 5
- [ ] Workout screen render < 500ms after tap
- [ ] No jank during rest timer countdown

### Lighthouse (run on landing page)
- [ ] Performance: 95+
- [ ] Accessibility: 95+
- [ ] Best Practices: 95+
- [ ] SEO: 90+

---

## 8. Edge cases (5 min)

- [ ] Open app with airplane mode on → all features work (localStorage)
- [ ] Set system date forward by 1 day → habits reset, new day
- [ ] Set system date backward by 7 days → streak breaks, graceful empty state
- [ ] Log 50 sets in a row → no UI lag
- [ ] Set 1RM to 0 → workout shows "Set your 1RMs in Settings" message
- [ ] Tap "Reset All Data" → confirm modal → all data cleared

---

## 9. Store compliance (10 min, on store listing)

- [ ] Privacy policy URL works and matches app behavior
- [ ] App icon is 1024×1024 with no transparency
- [ ] Screenshots are correct size and match current UI
- [ ] Description has no claims Apple/Google would reject ("cure", "medical", etc.)
- [ ] Content rating questionnaire completed
- [ ] Export compliance: app uses only HTTPS, no encryption export issues
- [ ] For iOS: Privacy manifest (PrivacyInfo.xcprivacy) — required for new apps

---

## Sign-off

- [ ] All 9 sections pass
- [ ] No critical issues
- [ ] Pushed to TestFlight / Internal Testing
- [ ] Submitted for review

Date: ________
Tester: ________
