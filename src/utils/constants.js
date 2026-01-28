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
    gymReps: 'shift6_gym_reps',
    gymWeightUnit: 'shift6_gym_weight_unit',
    customExercises: 'shift6_custom_exercises',
    // Persona system keys
    userPersona: 'shift6_user_persona',
    currentLocation: 'shift6_current_location',
    accessibility: 'shift6_accessibility',
    streakFreezes: 'shift6_streak_freezes',
    // Daily goals
    dailyGoal: 'shift6_daily_goal',
    restDays: 'shift6_rest_days',
    warmupEnabled: 'shift6_warmup_enabled'
};

// Daily goal options (workouts per day)
export const DAILY_GOAL_OPTIONS = [1, 2, 3, 4, 5, 6];
export const DEFAULT_DAILY_GOAL = 1;

// Rest timer options (in seconds, 'auto' for dynamic)
export const REST_TIMER_OPTIONS = [
    { value: 'auto', label: 'Auto' },
    { value: 30, label: '30s' },
    { value: 45, label: '45s' },
    { value: 60, label: '60s' },
    { value: 90, label: '90s' },
    { value: 120, label: '2min' }
];

// XP rewards for gamification
export const XP_REWARDS = {
    workoutComplete: 100,
    exerciseComplete: 25,
    setComplete: 5,
    streakBonus: 50, // Per day of streak
    dailyGoalMet: 75,
    personalRecord: 150,
    badgeEarned: 200,
    firstWorkout: 500,
    weekComplete: 300,
};

// Level thresholds (XP needed for each level)
export const LEVEL_THRESHOLDS = [
    0,      // Level 1
    500,    // Level 2
    1200,   // Level 3
    2100,   // Level 4
    3200,   // Level 5
    4500,   // Level 6
    6000,   // Level 7
    7700,   // Level 8
    9600,   // Level 9
    11700,  // Level 10
    14000,  // Level 11
    16500,  // Level 12
    19200,  // Level 13
    22100,  // Level 14
    25200,  // Level 15
    28500,  // Level 16
    32000,  // Level 17
    35700,  // Level 18
    39600,  // Level 19
    43700,  // Level 20
];

// Level titles
export const LEVEL_TITLES = [
    'Newcomer',         // 1
    'Beginner',         // 2
    'Apprentice',       // 3
    'Trainee',          // 4
    'Regular',          // 5
    'Dedicated',        // 6
    'Committed',        // 7
    'Strong',           // 8
    'Powerful',         // 9
    'Elite',            // 10
    'Champion',         // 11
    'Master',           // 12
    'Expert',           // 13
    'Veteran',          // 14
    'Legend',           // 15
    'Hero',             // 16
    'Titan',            // 17
    'Olympian',         // 18
    'Demigod',          // 19
    'Immortal',         // 20
];

// Streak milestones for special rewards
export const STREAK_MILESTONES = [3, 7, 14, 21, 30, 60, 90, 180, 365];

// Weight unit options
export const WEIGHT_UNITS = {
    KG: 'kg',
    LBS: 'lbs'
};

// Conversion factor: 1 kg = 2.20462 lbs
export const KG_TO_LBS = 2.20462;
export const LBS_TO_KG = 1 / KG_TO_LBS;

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

/**
 * Centralized color classes for exercise themes.
 * Use this instead of defining colorClasses in each component.
 * NOTE: All class names must be complete strings (not template literals) for Tailwind JIT.
 */
export const COLOR_CLASSES = {
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', solid: 'bg-blue-500' },
    orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', solid: 'bg-orange-500' },
    cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', solid: 'bg-cyan-500' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', solid: 'bg-emerald-500' },
    yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', solid: 'bg-yellow-500' },
    teal: { bg: 'bg-teal-500/10', border: 'border-teal-500/30', text: 'text-teal-400', solid: 'bg-teal-500' },
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', solid: 'bg-purple-500' },
    pink: { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-400', solid: 'bg-pink-500' },
    indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400', solid: 'bg-indigo-500' },
};

/**
 * Location color classes with complete Tailwind class names.
 * Used for location switching UI (home vs gym).
 */
export const LOCATION_COLORS = {
    home: {
        activeBorder: 'border-emerald-500',
        activeBg: 'bg-emerald-500/10',
        activeText: 'text-emerald-400',
        activeBadge: 'bg-emerald-500/20 text-emerald-400'
    },
    gym: {
        activeBorder: 'border-purple-500',
        activeBg: 'bg-purple-500/10',
        activeText: 'text-purple-400',
        activeBadge: 'bg-purple-500/20 text-purple-400'
    }
};
