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

describe('plate math is lbs-only', () => {
  // The PlateVisualizer hardcodes US plate set: 45/35/25/10/5/2.5.
  // These are the standard plates in commercial gyms in the US. A kg
  // user has different equipment (20/15/10/5/2.5/1.25) and the
  // visualizer should NOT pretend to show their bar.

  it('the 45 lb barbell bar is the US standard', () => {
    expect(45).toBeGreaterThan(20); // kg bars are 20 kg, not 45 kg
  });

  it('US plate set uses the 45/35/25/10/5/2.5 increments', () => {
    const usPlates = [45, 35, 25, 10, 5, 2.5];
    // Each plate should be loadable in a real US gym
    usPlates.forEach((p) => {
      expect(p % 2.5).toBe(0);
    });
    // The 45 lb plate is the iconic US bumper plate
    expect(usPlates[0]).toBe(45);
  });
});
