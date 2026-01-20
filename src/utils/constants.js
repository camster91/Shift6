/**
 * Application-wide constants for Shift6
 */

// Time constants
export const MS_PER_SECOND = 1000;
export const MS_PER_DAY = 86400000;
export const TIMER_INTERVAL_MS = 1000;

// Program structure
export const WEEKS_PER_PROGRAM = 6;
export const DAYS_PER_WEEK = 3;
export const TOTAL_DAYS_PER_EXERCISE = WEEKS_PER_PROGRAM * DAYS_PER_WEEK; // 18

// Calibration constants
export const DEFAULT_INTENSITY_FACTOR = 0.7;
export const MIN_SCALING_FACTOR = 0.5;
export const MAX_SCALING_FACTOR = 2.5;

// Storage
export const STORAGE_PREFIX = 'shift6_';
export const MAX_HISTORY_ITEMS = 50;

// Schedule (day of week)
export const SUNDAY = 0;

// Early/Late workout thresholds (hours)
export const EARLY_WORKOUT_HOUR = 8;
export const LATE_WORKOUT_HOUR = 20;

// Exercise categories
export const UPPER_BODY_EXERCISES = ['pushups', 'dips', 'pullups', 'supermans'];
export const LOWER_BODY_EXERCISES = ['squats', 'lunges', 'glutebridge', 'vups', 'plank'];
