# QA Loop 2C — State Pollution Attacks

**Date:** 2026-06-06
**Tester:** Hostile QA (localStorage manipulation)
**Target:** https://getshift6.com (iPhone 14 viewport 390×844)

---

## Attack 1: Corrupt User Data

**What I tried:** Set `equipmentTrack` to `invalid_track`, `estimated1RMs` to `null`, `week` to `-5`, `day` to `99`, `activeModifiers` to `{ foo: true }`.

**What happened:** App showed "Something went wrong" error page with two options: "Reload App" and "Reset Data & Start Fresh". No JS crash in console — corruption was caught by schema validation.

**Severity:** Medium — graceful error, not crash, but user loses access to their data without manual reset.

**Repro:** `localStorage.setItem('armor_data', JSON.stringify({...corrupted...}))` → refresh.

---

## Attack 2: Wrong Schema

**What I tried:** `localStorage.setItem('armor_data', '{"completely":"wrong","shape":42}')`.

**What happened:** Same "Something went wrong" error page. Schema validation correctly rejected non-shaped data.

**Severity:** Low — validation works as intended.

**Repro:** `localStorage.setItem('armor_data', '{"completely":"wrong","shape":42}')` → refresh.

---

## Attack 3: Empty Data

**What I tried:** `localStorage.setItem('armor_data', '{}')`.

**What happened:** Same "Something went wrong" error page. Empty object fails schema validation.

**Severity:** Medium — app doesn't recover with defaults when data is empty; goes straight to error. Could be improved by falling back to defaults rather than erroring.

**Repro:** `localStorage.setItem('armor_data', '{}')` → refresh.

---

## Attack 4: NaN Revision

**What I tried:** Set `armor_revision` to `"NaN"`.

**What happened:** App went to onboarding screen (treated as uninitialized user). Sync logic likely failed on NaN comparison.

**Severity:** Low — falls back to onboarding gracefully.

**Repro:** `localStorage.setItem('armor_revision', 'NaN')` → refresh.

---

## Attack 5: 1000 Workouts

**What I tried:** Injected 1000 workout history entries (each with date, day, week, completed, exercises, sets).

**What happened:** App went to onboarding — schema validation failed. Possibly the large `workoutHistory` array broke a schema check, or the data shape was rejected. No render crash observed.

**Severity:** Low — validation caught it; but large data should be handled gracefully (maybe with a warning rather than full rejection).

**Repro:** Inject `workoutHistory` with 1000 entries → refresh.

---

## Attack 6: String 1RM

**What I tried:** Set `barbell_squat` 1RM to string `"not_a_number"`.

**What happened:** App rendered normally. Top 1RM display showed "NaNlbs". Workout started fine (barbell squat exercise) with no crash. No JS errors in console.

**Severity:** Low — app tolerates gracefully with NaN display. Cosmetic issue only.

**Repro:** Set `estimated1RMs.barbell_squat = "not_a_number"` → refresh → workout start.

---

## Attack 7: Float 1RM (3.14159)

**What I tried:** Set `barbell_squat` 1RM to `3.14159`.

**What happened:** App rendered normally. Top 1RM showed deadlift value (225lbs) since squat's float was too low. When starting workout, exercise showed "Set your 1RM in Settings →" prompt — sensible fallback when 1RM is too low/invalid.

**Severity:** Low — app handles gracefully. Plate visualizer not tested due to 1RM fallback.

**Repro:** Set `estimated1RMs.barbell_squat = 3.14159` → refresh → start workout.

---

## Attack 8: Negative 1RM

**What I tried:** Set `barbell_squat` 1RM to `-100`.

**What happened:** App rendered normally. Top 1RM showed deadlift (225lbs) since negative squat was ignored. No crash.

**Severity:** Low — graceful handling.

**Repro:** Set `estimated1RMs.barbell_squat = -100` → refresh.

---

## Attack 9: Null userId

**What I tried:** Set `userId` to `null`.

**What happened:** App rendered normally with "GOOD EVENING, TEST" greeting. No issues.

**Severity:** None — null userId is handled correctly.

**Repro:** Set `userId = null` → refresh.

---

## Summary

| Attack | Result | Severity |
|---|---|---|
| Corrupt data (bad values) | Error page shown, no crash | Medium |
| Wrong schema | Error page shown, validation works | Low |
| Empty data `{}` | Error page, no default recovery | Medium |
| NaN revision | Falls back to onboarding | Low |
| 1000 workouts | Schema rejected, went to onboarding | Low |
| String 1RM | NaN display, no crash | Low |
| Float 1RM (3.14159) | Shows fallback prompt in workout | Low |
| Negative 1RM | Ignored, renders fine | Low |
| Null userId | Works fine | None |

**Key finding:** Schema validation is robust — catches corruption, wrong schema, empty data. Main improvement opportunity is Attack 3: empty data `{}` should ideally recover with defaults rather than showing error. Attacks 6-8 show 1RM validation could be tighter (disallow strings, negatives, tiny floats from causing weird UI states like "NaNlbs").