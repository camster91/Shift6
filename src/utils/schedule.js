import { EXERCISE_PLANS } from '../data/exercises.jsx';
import { SUNDAY, UPPER_BODY_EXERCISES, LOWER_BODY_EXERCISES } from './constants';

/**
 * @typedef {Object} NextSession
 * @property {string} exerciseKey - Exercise identifier
 * @property {number} week - Week number (1-6)
 * @property {number} dayIndex - Day index within the week (0-2)
 * @property {string} dayId - Unique day identifier
 * @property {string} name - Exercise display name
 */

/**
 * Finds the next incomplete workout session for a given exercise.
 * @param {string} exKey - Exercise key (e.g., 'pushups', 'squats')
 * @param {Object.<string, string[]>} completedDays - Map of exercise keys to completed day IDs
 * @returns {NextSession|null} Next session info or null if exercise is complete
 */
export const getNextSessionForExercise = (exKey, completedDays) => {
    const plan = EXERCISE_PLANS[exKey];
    if (!plan) return null;

    // Find first incomplete day
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
 * - Mon/Wed/Fri (odd days): Upper Body Focus
 * - Tue/Thu/Sat (even days): Lower Body & Core
 * @returns {string} Today's workout focus description
 */
export const getScheduleFocus = () => {
    const day = new Date().getDay();
    if (day === SUNDAY) return 'Rest & Recovery';
    if (day % 2 === 1) return 'Upper Body Focus'; // Mon, Wed, Fri
    return 'Lower Body & Core'; // Tue, Thu, Sat
};

/**
 * Builds a workout stack for today based on schedule and progress.
 * Returns exercises that still have incomplete sessions.
 * @param {Object.<string, string[]>} completedDays - Map of exercise keys to completed day IDs
 * @returns {NextSession[]} Array of next sessions to complete today
 */
export const getDailyStack = (completedDays) => {
    const day = new Date().getDay();

    let targetKeys = [];
    if (day === SUNDAY) targetKeys = []; // Sunday rest
    else if (day % 2 === 1) targetKeys = UPPER_BODY_EXERCISES; // Mon, Wed, Fri
    else targetKeys = LOWER_BODY_EXERCISES; // Tue, Thu, Sat

    const stack = [];
    targetKeys.forEach(key => {
        const next = getNextSessionForExercise(key, completedDays);
        if (next) stack.push(next);
    });
    return stack;
};
