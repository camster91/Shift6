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

// Storage keys
export const STORAGE_KEYS = {
    progress: 'shift6_progress',
    history: 'shift6_history',
    calibrations: 'shift6_calibrations',
    difficulty: 'shift6_difficulty',
    activeProgram: 'shift6_active_program',
    programMode: 'shift6_program_mode',
    userEquipment: 'shift6_user_equipment',
    currentSession: 'shift6_current_session',
    queue: 'shift6_queue',
    seenBadges: 'shift6_seen_badges',
    audioEnabled: 'shift6_audio_enabled',
    restTimer: 'shift6_rest_timer',
    theme: 'shift6_theme',
    onboardingComplete: 'shift6_onboarding_complete',
    trainingPreferences: 'shift6_training_preferences',
    customPlans: 'shift6_custom_plans',
    gymWeights: 'shift6_gym_weights',
    customExercises: 'shift6_custom_exercises',
    // Persona system keys
    userPersona: 'shift6_user_persona',
    currentLocation: 'shift6_current_location',
    accessibility: 'shift6_accessibility',
    streakFreezes: 'shift6_streak_freezes'
};

// Express mode configuration
export const EXPRESS_MODE_CONFIG = {
    sets: 2,
    restBetweenSets: 20,
    targetDuration: 8,
    maxExercises: 2,
    skipReadiness: true
};

// Workout locations
export const WORKOUT_LOCATIONS = {
    HOME: 'home',
    GYM: 'gym',
    OUTDOOR: 'outdoor',
    TRAVEL: 'travel'
};

// Accessibility defaults
export const ACCESSIBILITY_DEFAULTS = {
    fontSize: 'normal',
    highContrast: false,
    reducedMotion: false,
    simpleLanguage: false,
    longerRestTimes: false,
    largerButtons: false,
    voiceInstructions: false
};

// Compassionate streak configuration
export const STREAK_CONFIG = {
    gracePeriodDays: 1,
    weekendGrace: true,
    partialCredit: true,
    comebackBonus: true,
    maxGraceDays: 2,
    freezeTokensPerMonth: 3
};

// Training preference options
export const TRAINING_DAYS_OPTIONS = [2, 3, 4, 5, 6];
export const PROGRAM_DURATION_OPTIONS = [4, 6, 8, 12];
export const SESSION_DURATION_OPTIONS = [15, 20, 30, 45, 60];
export const SETS_PER_EXERCISE_OPTIONS = [3, 4, 5, 6, 7, 8];

// Schedule (day of week)
export const SUNDAY = 0;

// Early/Late workout thresholds (hours)
export const EARLY_WORKOUT_HOUR = 8;
export const LATE_WORKOUT_HOUR = 20;

// Exercise categories
export const UPPER_BODY_EXERCISES = ['pushups', 'dips', 'pullups', 'supermans'];
export const LOWER_BODY_EXERCISES = ['squats', 'lunges', 'glutebridge', 'vups', 'plank'];
