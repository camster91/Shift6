/**
 * migrateFromShift6.test.js — Tests for the legacy-data migration path.
 *
 * Why this matters: a returning Shift6 user opens Armor for the first
 * time and expects their real 1RMs, track choice, and name to carry
 * over. A regression here means either silent data loss (hardcoded
 * placeholders overwriting real numbers) or a stuck-on-onboarding
 * bug (track guess wrong).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { migrateFromShift6 } from './ArmorDataContext';

beforeEach(() => {
  localStorage.clear();
});

describe('migrateFromShift6', () => {
  it('returns null when no Shift6 data exists', () => {
    expect(migrateFromShift6()).toBeNull();
  });

  it('returns null when shift6_onboarding_done is false', () => {
    localStorage.setItem('shift6_onboarding_done', 'false');
    localStorage.setItem('shift6_settings', JSON.stringify({ estimated1RMs: { barbell_squat: 225 } }));
    expect(migrateFromShift6()).toBeNull();
  });

  it('falls back to DEFAULT_DATA shape when settings are missing', () => {
    // Defensive: if shift6_onboarding_done was true but the settings
    // blob is gone (user cleared it, browser crash, etc.), we still
    // produce a valid DEFAULT_DATA shape so onboarding can complete.
    localStorage.setItem('shift6_onboarding_done', 'true');
    const migrated = migrateFromShift6();
    expect(migrated).not.toBeNull();
    expect(migrated.userProfile.estimated1RMs.barbell_squat).toBe(0);
    // Should default to home_gym (no barbell detected)
    expect(migrated.preferences.equipmentTrack).toBe('home_gym');
  });

  it('reads barbell_squat from legacy estimated1RMs', () => {
    localStorage.setItem('shift6_onboarding_done', 'true');
    localStorage.setItem('shift6_settings', JSON.stringify({
      estimated1RMs: { barbell_squat: 225 },
      equippedIds: ['barbell'],
    }));
    const migrated = migrateFromShift6();
    expect(migrated).not.toBeNull();
    expect(migrated.userProfile.estimated1RMs.barbell_squat).toBe(225);
  });

  it('also reads the legacy oneRMs field name', () => {
    localStorage.setItem('shift6_onboarding_done', 'true');
    localStorage.setItem('shift6_settings', JSON.stringify({
      oneRMs: { barbell_squat: 250 },
      equippedIds: ['barbell'],
    }));
    const migrated = migrateFromShift6();
    expect(migrated.userProfile.estimated1RMs.barbell_squat).toBe(250);
  });

  it('prefers estimated1RMs over oneRMs when both are present', () => {
    localStorage.setItem('shift6_onboarding_done', 'true');
    localStorage.setItem('shift6_settings', JSON.stringify({
      estimated1RMs: { barbell_squat: 225 },
      oneRMs: { barbell_squat: 999 },
      equippedIds: ['barbell'],
    }));
    const migrated = migrateFromShift6();
    expect(migrated.userProfile.estimated1RMs.barbell_squat).toBe(225);
  });

  it('defaults to full_gym when barbell is in equippedIds', () => {
    localStorage.setItem('shift6_onboarding_done', 'true');
    localStorage.setItem('shift6_settings', JSON.stringify({
      estimated1RMs: { barbell_squat: 225 },
      equippedIds: ['barbell', 'dumbbells'],
    }));
    const migrated = migrateFromShift6();
    expect(migrated.preferences.equipmentTrack).toBe('full_gym');
  });

  it('defaults to home_gym when no barbell in equippedIds', () => {
    localStorage.setItem('shift6_onboarding_done', 'true');
    localStorage.setItem('shift6_settings', JSON.stringify({
      estimated1RMs: { goblet_squat: 95 },
      equippedIds: ['dumbbells', 'kettlebells'],
    }));
    const migrated = migrateFromShift6();
    expect(migrated.preferences.equipmentTrack).toBe('home_gym');
  });

  it('fills missing 1RMs with 0 (never with hardcoded placeholders)', () => {
    // This is the regression that caused silent data loss: the old
    // ArmorApp.jsx inline migration overwrote unset lifts with
    // 185/135/225 placeholders. The fix is to use 0, which the UI
    // surfaces as "Set your 1RM" so the user fills it in.
    localStorage.setItem('shift6_onboarding_done', 'true');
    localStorage.setItem('shift6_settings', JSON.stringify({
      estimated1RMs: { barbell_squat: 225 }, // only squat set
      equippedIds: ['barbell'],
    }));
    const migrated = migrateFromShift6();
    expect(migrated.userProfile.estimated1RMs.barbell_squat).toBe(225);
    expect(migrated.userProfile.estimated1RMs.bench_press).toBe(0);
    expect(migrated.userProfile.estimated1RMs.deadlift).toBe(0);
    expect(migrated.userProfile.estimated1RMs.barbell_row).toBe(0);
  });

  it('also handles the squat → barbell_squat legacy alias', () => {
    localStorage.setItem('shift6_onboarding_done', 'true');
    localStorage.setItem('shift6_settings', JSON.stringify({
      estimated1RMs: { squat: 300 }, // legacy "squat" key, not "barbell_squat"
      equippedIds: ['barbell'],
    }));
    const migrated = migrateFromShift6();
    expect(migrated.userProfile.estimated1RMs.barbell_squat).toBe(300);
  });

  it('also handles the bench → bench_press legacy alias', () => {
    localStorage.setItem('shift6_onboarding_done', 'true');
    localStorage.setItem('shift6_settings', JSON.stringify({
      estimated1RMs: { bench: 200 },
      equippedIds: ['barbell'],
    }));
    const migrated = migrateFromShift6();
    expect(migrated.userProfile.estimated1RMs.bench_press).toBe(200);
  });

  it('preserves displayName from legacy settings', () => {
    localStorage.setItem('shift6_onboarding_done', 'true');
    localStorage.setItem('shift6_settings', JSON.stringify({
      displayName: 'Sarah K.',
      estimated1RMs: { barbell_squat: 200 },
      equippedIds: ['barbell'],
    }));
    const migrated = migrateFromShift6();
    expect(migrated.userProfile.displayName).toBe('Sarah K.');
  });

  it('returns a complete DEFAULT_DATA shape', () => {
    localStorage.setItem('shift6_onboarding_done', 'true');
    localStorage.setItem('shift6_settings', JSON.stringify({
      estimated1RMs: { barbell_squat: 200 },
      equippedIds: ['barbell'],
    }));
    const migrated = migrateFromShift6();
    // Sanity: all top-level keys present, no undefined fields
    expect(migrated).toHaveProperty('userProfile');
    expect(migrated).toHaveProperty('preferences');
    expect(migrated).toHaveProperty('currentCycle');
    expect(migrated).toHaveProperty('activeModifiers');
    expect(migrated).toHaveProperty('dailyHabitState');
    expect(migrated).toHaveProperty('workoutHistory');
    expect(migrated).toHaveProperty('streakData');
    expect(Array.isArray(migrated.workoutHistory)).toBe(true);
  });
});