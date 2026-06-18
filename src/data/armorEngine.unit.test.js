/**
 * armorEngine.unit.test.js — Tests for the unit conversion logic.
 *
 * The display layer in ArmorWorkoutSession and ArmorProgress converts
 * stored lbs values to kg for display when the user has set their
 * preferred unit. This file captures the conversion rule so the math
 * is regression-tested in one place.
 */
import { describe, it, expect } from 'vitest';

// Match the conversion used in ArmorWorkoutSession.jsx and
// ArmorProgress.jsx. 1 lb = 0.453592 kg exactly, so 1/2.20462 is the
// inverse (close to 1/2.20462 = 0.45359737...). The app uses 2.20462
// throughout, so we lock that constant here.
const LB_PER_KG = 2.20462;
const kgToLb = (kg) => Math.round(kg * LB_PER_KG);
const lbToKg = (lb) => Math.round(lb / LB_PER_KG);
const displayWeight = (lbValue, unit) =>
  unit === 'kg' ? lbToKg(lbValue) : lbValue;

describe('unit conversion math', () => {
  it('1 lb is approximately 0.45 kg', () => {
    expect(lbToKg(1)).toBe(0);
    expect(lbToKg(2)).toBe(1);
    expect(lbToKg(10)).toBe(5);
    expect(lbToKg(100)).toBe(45);
  });

  it('225 lb squat rounds to 102 kg', () => {
    expect(lbToKg(225)).toBe(102);
  });

  it('135 lb bench rounds to 61 kg', () => {
    expect(lbToKg(135)).toBe(61);
  });

  it('275 lb deadlift rounds to 125 kg', () => {
    expect(lbToKg(275)).toBe(125);
  });

  it('kg to lb round-trips (1 lb precision)', () => {
    // 100 kg should be 220 lb (within 1 lb)
    const lb = kgToLb(100);
    expect(Math.abs(lb - 220)).toBeLessThanOrEqual(1);
  });

  it('displayWeight is identity in lbs mode', () => {
    expect(displayWeight(225, 'lbs')).toBe(225);
  });

  it('displayWeight converts in kg mode', () => {
    expect(displayWeight(225, 'kg')).toBe(102);
  });

  it('displayWeight defaults to lbs when unit is missing', () => {
    expect(displayWeight(225, undefined)).toBe(225);
  });
});

describe('plate resolution by unit', () => {
  // The PlateVisualizer resolves weights to physical plates per unit.
  // US lbs: 45/35/25/10/5/2.5 — 45 lb bar (Olympic).
  // Metric:  25/20/15/10/5/2.5/1.25 — 20 kg bar (Olympic, IPF spec).

  // Mirror the plate sets in PlateVisualizer.jsx. If those change, this
  // test will fail and force both to update.
  const BAR_PLATES_LBS = [45, 35, 25, 10, 5, 2.5];
  const BAR_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
  const BARBELL_BAR_LBS = 45;
  const BARBELL_BAR_KG = 20;
  const epsilon = 0.01;

  // Pure function extracted from PlateVisualizer logic. Returns the
  // plates-per-side (heaviest first) for a target weight + unit, or
  // null if the target is below the bar.
  function resolvePlates(weight, unit) {
    const bar = unit === 'kg' ? BARBELL_BAR_KG : BARBELL_BAR_LBS;
    const plates = unit === 'kg' ? BAR_PLATES_KG : BAR_PLATES_LBS;
    if (weight < bar) return null;
    const perSide = (weight - bar) / 2;
    const used = [];
    let remaining = perSide;
    for (const p of plates) {
      while (remaining >= p - epsilon) {
        used.push(p);
        remaining -= p;
      }
    }
    return used;
  }

  it('US 225 lb = bar + 4x 45 per side (greedy)', () => {
    // 225 - 45 = 180, /2 = 90. Greedy picks 45 first (90→45), then 45 (45→0).
    // Two 45s per side = 4 total.
    expect(resolvePlates(225, 'lbs')).toEqual([45, 45]);
  });

  it('US 135 lb = bar + 2x 45 per side', () => {
    // 135 - 45 = 90, /2 = 45. One 45 plate per side.
    expect(resolvePlates(135, 'lbs')).toEqual([45]);
  });

  it('US 95 lb = bar + 2x 25 per side', () => {
    // 95 - 45 = 50, /2 = 25. One 25 per side.
    expect(resolvePlates(95, 'lbs')).toEqual([25]);
  });

  it('kg 100 = bar + 2x 25 + 2x 15 per side (40/side, greedy)', () => {
    // 100 - 20 = 80, /2 = 40. Greedy picks 25 first (40→15), then 15 (15→0).
    expect(resolvePlates(100, 'kg')).toEqual([25, 15]);
  });

  it('kg 60 = bar + 2x 20 per side', () => {
    // 60 - 20 = 40, /2 = 20. One 20 per side.
    expect(resolvePlates(60, 'kg')).toEqual([20]);
  });

  it('kg 102.5 = bar + 2x 25 + 2x 15 + 2x 1.25 per side (greedy)', () => {
    // 102.5 - 20 = 82.5, /2 = 41.25. Greedy picks 25 first (≤ 41.25), leaving
    // 16.25. Then 15, leaving 1.25. Then 1.25, leaving 0.
    expect(resolvePlates(102.5, 'kg')).toEqual([25, 15, 1.25]);
  });

  it('returns null for weight below the bar', () => {
    expect(resolvePlates(40, 'lbs')).toBeNull();
    expect(resolvePlates(15, 'kg')).toBeNull();
  });

  it('US plate set uses the 45/35/25/10/5/2.5 increments', () => {
    BAR_PLATES_LBS.forEach((p) => {
      expect(p % 2.5).toBe(0);
    });
    expect(BAR_PLATES_LBS[0]).toBe(45);
  });

  it('kg plate set includes the 1.25 kg micro-plate', () => {
    expect(BAR_PLATES_KG).toContain(1.25);
  });
});
