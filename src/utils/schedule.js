import { EXERCISE_PLANS } from '../data/exercises.jsx';
import { SUNDAY } from './constants';

/**
 * @typedef {Object} NextSession
 * @property {string} exerciseKey - Exercise identifier
 * @property {number} week - Week number (1-6 for bodyweight, 0 for gym)
 * @property {number} dayIndex - Day index within the week (0-2 for bodyweight, 0 for gym)
 * @property {string} dayId - Unique day identifier
 * @property {string} name - Exercise display name
 * @property {boolean} [isGym] - True if this is a gym exercise
 */

/**
 * Finds the next incomplete workout session for a given exercise.
 * For bodyweight exercises: Returns next incomplete day in 18-day plan
 * For gym exercises: Always returns available (gym uses progressive overload, not day completion)
 * @param {string} exKey - Exercise key (e.g., 'pushups', 'squats', 'benchPress')
 * @param {Object.<string, string[]>} completedDays - Map of exercise keys to completed day IDs
 * @param {Object} [exercisePlans] - Optional exercise plans object (defaults to EXERCISE_PLANS)
 * @returns {NextSession|null} Next session info or null if exercise is complete (bodyweight only)
 */
export const getNextSessionForExercise = (exKey, completedDays, exercisePlans = EXERCISE_PLANS) => {
    const plan = exercisePlans[exKey];
    if (!plan) return null;

    // Gym exercises use progressive overload - always available
    if (plan.progressionType === 'gym') {
        return {
            exerciseKey: exKey,
            week: 0,
            dayIndex: 0,
            dayId: `gym_${exKey}`,
            name: plan.name,
            isGym: true
        };
    }

    // Bodyweight exercises - find first incomplete day in 18-day plan
    if (!plan.weeks) return null;

    for (let w = 0; w < plan.weeks.length; w++) {
        const week = plan.weeks[w];
        for (let d = 0; d < week.days.length; d++) {
            const day = week.days[d];
            // Check if completed
            const completed = completedDays[exKey]?.includes(day.id);
            if (!completed) {
                return {
                    exerciseKey: exKey,
                    week: week.week,
                    dayIndex: d,
                    dayId: day.id,
                    name: plan.name
                };
            }
        }
    }
    return null; // All done
};

/**
 * Returns the workout focus for today based on day of week.
 * - Sunday: Rest & Recovery
 * - All other days: Full Program
 * @returns {string} Today's workout focus description
 */
export const getScheduleFocus = () => {
    const day = new Date().getDay();
    if (day === SUNDAY) return 'Rest & Recovery';
    return 'Full Program';
};

/**
 * Builds a workout stack for today based on schedule and progress.
 * Returns ALL active exercises that still have incomplete sessions.
 * @param {Object.<string, string[]>} completedDays - Map of exercise keys to completed day IDs
 * @param {Object} [exercisePlans] - Optional exercise plans object (defaults to EXERCISE_PLANS)
 * @param {string[]} [activeProgram] - Optional array of exercise keys in user's active program
 * @returns {NextSession[]} Array of next sessions to complete today
 */
export const getDailyStack = (completedDays, exercisePlans = EXERCISE_PLANS, activeProgram = null) => {
    const day = new Date().getDay();

    // Sunday is rest day
    if (day === SUNDAY) {
        return [];
    }

    // Get all active program exercises (or default 9)
    const programKeys = activeProgram || Object.keys(EXERCISE_PLANS);

    // Return all exercises that have incomplete sessions
    const stack = [];
    programKeys.forEach(key => {
        const next = getNextSessionForExercise(key, completedDays, exercisePlans);
        if (next) stack.push(next);
    });
    return stack;
};
