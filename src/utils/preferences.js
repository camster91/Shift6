/**
 * Training preferences utilities
 * Handles validation, migration, and management of user training preferences
 */

import {
    DEFAULT_TRAINING_PREFERENCES,
    REP_SCHEME_CONFIGS,
    PROGRESSION_RATES,
    FITNESS_LEVEL_PRESETS,
    generateCustomProgression
} from '../data/exercises.jsx';
import {
    STORAGE_KEYS,
    TRAINING_DAYS_OPTIONS,
    PROGRAM_DURATION_OPTIONS,
    SESSION_DURATION_OPTIONS,
    SETS_PER_EXERCISE_OPTIONS
} from './constants.js';

/**
 * Validates training preferences object
 * @param {Object} prefs - Preferences to validate
 * @returns {Object} { valid: boolean, errors: string[], sanitized: Object }
 */
export const validatePreferences = (prefs) => {
    const errors = [];
    const sanitized = { ...DEFAULT_TRAINING_PREFERENCES };

    if (!prefs || typeof prefs !== 'object') {
        return { valid: false, errors: ['Invalid preferences object'], sanitized };
    }

    // Validate trainingDaysPerWeek
    if (prefs.trainingDaysPerWeek !== undefined) {
        if (TRAINING_DAYS_OPTIONS.includes(prefs.trainingDaysPerWeek)) {
            sanitized.trainingDaysPerWeek = prefs.trainingDaysPerWeek;
        } else {
            errors.push(`Invalid trainingDaysPerWeek: ${prefs.trainingDaysPerWeek}`);
        }
    }

    // Validate preferredDays (array of 0-6)
    if (prefs.preferredDays !== undefined) {
        if (Array.isArray(prefs.preferredDays)) {
            sanitized.preferredDays = prefs.preferredDays.filter(
                d => typeof d === 'number' && d >= 0 && d <= 6
            );
        } else {
            errors.push('preferredDays must be an array');
        }
    }

    // Validate targetSessionDuration
    if (prefs.targetSessionDuration !== undefined) {
        if (SESSION_DURATION_OPTIONS.includes(prefs.targetSessionDuration)) {
            sanitized.targetSessionDuration = prefs.targetSessionDuration;
        } else {
            errors.push(`Invalid targetSessionDuration: ${prefs.targetSessionDuration}`);
        }
    }

    // Validate repScheme
    if (prefs.repScheme !== undefined) {
        if (REP_SCHEME_CONFIGS[prefs.repScheme]) {
            sanitized.repScheme = prefs.repScheme;
        } else {
            errors.push(`Invalid repScheme: ${prefs.repScheme}`);
        }
    }

    // Validate setsPerExercise
    if (prefs.setsPerExercise !== undefined) {
        if (SETS_PER_EXERCISE_OPTIONS.includes(prefs.setsPerExercise)) {
            sanitized.setsPerExercise = prefs.setsPerExercise;
        } else {
            errors.push(`Invalid setsPerExercise: ${prefs.setsPerExercise}`);
        }
    }

    // Validate progressionRate
    if (prefs.progressionRate !== undefined) {
        if (PROGRESSION_RATES[prefs.progressionRate]) {
            sanitized.progressionRate = prefs.progressionRate;
        } else {
            errors.push(`Invalid progressionRate: ${prefs.progressionRate}`);
        }
    }

    // Validate programDuration
    if (prefs.programDuration !== undefined) {
        if (PROGRAM_DURATION_OPTIONS.includes(prefs.programDuration)) {
            sanitized.programDuration = prefs.programDuration;
        } else {
            errors.push(`Invalid programDuration: ${prefs.programDuration}`);
        }
    }

    // Validate restBetweenSets
    if (prefs.restBetweenSets !== undefined) {
        if (prefs.restBetweenSets === 'auto' ||
            [30, 45, 60, 90, 120].includes(prefs.restBetweenSets)) {
            sanitized.restBetweenSets = prefs.restBetweenSets;
        } else {
            errors.push(`Invalid restBetweenSets: ${prefs.restBetweenSets}`);
        }
    }

    // Validate fitnessLevel
    if (prefs.fitnessLevel !== undefined) {
        if (FITNESS_LEVEL_PRESETS[prefs.fitnessLevel]) {
            sanitized.fitnessLevel = prefs.fitnessLevel;
        } else {
            errors.push(`Invalid fitnessLevel: ${prefs.fitnessLevel}`);
        }
    }

    // Copy timestamps if valid
    if (prefs.createdAt) sanitized.createdAt = prefs.createdAt;
    if (prefs.updatedAt) sanitized.updatedAt = prefs.updatedAt;

    return {
        valid: errors.length === 0,
        errors,
        sanitized
    };
};

/**
 * Loads training preferences from localStorage
 * @returns {Object} Training preferences (validated and sanitized)
 */
export const loadPreferences = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.trainingPreferences);
        if (stored) {
            const parsed = JSON.parse(stored);
            const { sanitized } = validatePreferences(parsed);
            return sanitized;
        }
    } catch (e) {
        console.warn('Failed to load training preferences:', e);
    }
    return { ...DEFAULT_TRAINING_PREFERENCES };
};

/**
 * Saves training preferences to localStorage
 * @param {Object} prefs - Preferences to save
 * @returns {boolean} Success status
 */
export const savePreferences = (prefs) => {
    try {
        const { valid, sanitized } = validatePreferences(prefs);
        if (!valid) {
            console.warn('Saving preferences with validation errors');
        }
        sanitized.updatedAt = new Date().toISOString();
        if (!sanitized.createdAt) {
            sanitized.createdAt = sanitized.updatedAt;
        }
        localStorage.setItem(STORAGE_KEYS.trainingPreferences, JSON.stringify(sanitized));
        return true;
    } catch (e) {
        console.error('Failed to save training preferences:', e);
        return false;
    }
};

/**
 * Migrates existing users to the new preference system
 * Called on app load for users who have progress but no preferences
 * @returns {Object} Migrated preferences
 */
export const migrateExistingUser = () => {
    const hasProgress = localStorage.getItem(STORAGE_KEYS.progress);
    const hasPreferences = localStorage.getItem(STORAGE_KEYS.trainingPreferences);

    if (hasProgress && !hasPreferences) {
        // Existing user without preferences - set defaults that match current behavior
        const existingRestTimer = localStorage.getItem(STORAGE_KEYS.restTimer);

        const migratedPrefs = {
            ...DEFAULT_TRAINING_PREFERENCES,
            // Match current app behavior
            trainingDaysPerWeek: 3,
            programDuration: 6,
            repScheme: 'balanced',
            setsPerExercise: 5,
            progressionRate: 'moderate',
            // Migrate existing rest timer setting if present
            restBetweenSets: existingRestTimer ? JSON.parse(existingRestTimer) : 'auto',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        savePreferences(migratedPrefs);
        return migratedPrefs;
    }

    return loadPreferences();
};

/**
 * Applies fitness level preset to preferences
 * @param {string} level - Fitness level: 'beginner', 'intermediate', 'advanced'
 * @param {Object} currentPrefs - Current preferences to merge with
 * @returns {Object} Updated preferences
 */
export const applyFitnessLevelPreset = (level, currentPrefs = {}) => {
    const preset = FITNESS_LEVEL_PRESETS[level];
    if (!preset) {
        console.warn(`Unknown fitness level: ${level}`);
        return currentPrefs;
    }

    return {
        ...currentPrefs,
        ...preset.defaults,
        fitnessLevel: level
    };
};

/**
 * Calculates total days in a program based on preferences
 * @param {Object} prefs - Training preferences
 * @returns {number} Total training days
 */
export const getTotalProgramDays = (prefs) => {
    const { trainingDaysPerWeek = 3, programDuration = 6 } = prefs;
    return trainingDaysPerWeek * programDuration;
};

/**
 * Determines if preferences have changed in a way that requires plan regeneration
 * @param {Object} oldPrefs - Previous preferences
 * @param {Object} newPrefs - New preferences
 * @returns {boolean} Whether plans need regeneration
 */
export const requiresPlanRegeneration = (oldPrefs, newPrefs) => {
    const affectingKeys = [
        'trainingDaysPerWeek',
        'programDuration',
        'repScheme',
        'setsPerExercise',
        'progressionRate',
        'fitnessLevel',
        'targetSessionDuration'
    ];

    return affectingKeys.some(key => oldPrefs[key] !== newPrefs[key]);
};

/**
 * Regenerates custom plans for all exercises based on new preferences
 * @param {Object} exercises - Exercise definitions (EXERCISE_PLANS)
 * @param {Object} activeProgram - Array of active exercise keys
 * @param {Object} calibrations - Calibration factors per exercise
 * @param {Object} preferences - New training preferences
 * @returns {Object} Map of exerciseKey -> generated weeks
 */
export const regenerateAllPlans = (exercises, activeProgram, calibrations, preferences) => {
    const customPlans = {};

    activeProgram.forEach(exKey => {
        const exercise = exercises[exKey];
        if (!exercise) return;

        // Get starting reps (use calibration if available)
        const calibration = calibrations[exKey] || 1.0;
        // Try direct startReps first (exerciseDatabase format), then fallback to weeks structure
        const firstWeek = exercise.weeks?.[0];
        const firstDay = firstWeek?.days?.[0];
        const baseStartReps = exercise.startReps || firstDay?.reps?.[1] || 10;
        const startReps = Math.max(5, Math.round(baseStartReps * calibration)); // Minimum 5 for any exercise

        // Parse final goal (supports both "180 Seconds" string format and numeric)
        let finalGoal = 100;
        if (typeof exercise.finalGoal === 'number') {
            finalGoal = exercise.finalGoal;
        } else if (typeof exercise.finalGoal === 'string') {
            const finalGoalMatch = exercise.finalGoal.match(/(\d+)/);
            finalGoal = finalGoalMatch ? parseInt(finalGoalMatch[1], 10) : 100;
        }

        // Generate custom progression
        customPlans[exKey] = {
            weeks: generateCustomProgression(startReps, finalGoal, preferences),
            generatedAt: new Date().toISOString()
        };
    });

    return customPlans;
};

/**
 * Saves custom plans to localStorage
 * @param {Object} plans - Custom plans object
 */
export const saveCustomPlans = (plans) => {
    try {
        localStorage.setItem(STORAGE_KEYS.customPlans, JSON.stringify(plans));
    } catch (e) {
        console.error('Failed to save custom plans:', e);
    }
};

/**
 * Loads custom plans from localStorage
 * @returns {Object} Custom plans or empty object
 */
export const loadCustomPlans = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.customPlans);
        return stored ? JSON.parse(stored) : {};
    } catch (e) {
        console.warn('Failed to load custom plans:', e);
        return {};
    }
};

/**
 * Handles mid-program preference changes
 * Preserves completed progress and adjusts for new program structure
 * @param {Object} completedDays - Map of exerciseKey -> completed day IDs
 * @param {Object} oldPrefs - Previous preferences
 * @param {Object} newPrefs - New preferences
 * @returns {Object} Adjusted completed days (caps if program shortened)
 */
export const adjustProgressForPreferenceChange = (completedDays, oldPrefs, newPrefs) => {
    const oldTotal = getTotalProgramDays(oldPrefs);
    const newTotal = getTotalProgramDays(newPrefs);

    // If program is same length or longer, no adjustment needed
    if (newTotal >= oldTotal) {
        return completedDays;
    }

    // Program was shortened - cap completed days
    const adjusted = {};

    Object.entries(completedDays).forEach(([exKey, days]) => {
        if (!Array.isArray(days)) {
            adjusted[exKey] = days;
            return;
        }

        // Keep only days that fit in new program length
        // Days are numbered sequentially, so we cap at newTotal
        adjusted[exKey] = days.slice(0, newTotal);
    });

    return adjusted;
};

/**
 * Checks if an exercise is complete based on preferences
 * @param {string[]} completedDays - Array of completed day IDs
 * @param {Object} preferences - Training preferences
 * @returns {boolean} Whether exercise is complete
 */
export const isExerciseComplete = (completedDays, preferences) => {
    const totalDays = getTotalProgramDays(preferences);
    return completedDays?.length >= totalDays;
};

/**
 * Gets the current week and day number for an exercise
 * @param {number} completedCount - Number of completed days
 * @param {Object} preferences - Training preferences
 * @returns {Object} { week, day, total }
 */
export const getProgressPosition = (completedCount, preferences) => {
    const { trainingDaysPerWeek = 3, programDuration = 6 } = preferences;
    const nextDay = completedCount + 1;
    const week = Math.ceil(nextDay / trainingDaysPerWeek);
    const dayInWeek = ((nextDay - 1) % trainingDaysPerWeek) + 1;
    const total = trainingDaysPerWeek * programDuration;

    return {
        week: Math.min(week, programDuration),
        day: dayInWeek,
        dayNumber: nextDay,
        total,
        isComplete: completedCount >= total
    };
};
