import {
    MS_PER_DAY,
    TOTAL_DAYS_PER_EXERCISE,
    EARLY_WORKOUT_HOUR,
    LATE_WORKOUT_HOUR,
    UPPER_BODY_EXERCISES,
    LOWER_BODY_EXERCISES
} from './constants'

/** Total number of exercises in the program */
const TOTAL_EXERCISES = UPPER_BODY_EXERCISES.length + LOWER_BODY_EXERCISES.length

/**
 * @typedef {Object} Badge
 * @property {string} id - Unique badge identifier
 * @property {string} name - Display name
 * @property {string} desc - Description of how to earn
 * @property {string} icon - Emoji icon
 * @property {function(Stats): boolean} condition - Function to check if badge is unlocked
 */

/**
 * @typedef {Object} Stats
 * @property {number} totalSessions - Total completed workout sessions
 * @property {number} completedPlans - Number of fully completed exercise plans
 * @property {number} currentStreak - Current consecutive day streak
 * @property {boolean} hasEarlyWorkout - Has completed a workout before 8am
 * @property {boolean} hasLateWorkout - Has completed a workout after 8pm
 */

/**
 * @typedef {Object} SessionHistoryItem
 * @property {string} exerciseKey - Exercise identifier
 * @property {string} dayId - Day identifier
 * @property {string} date - ISO date string
 * @property {number} volume - Total reps/time completed
 * @property {string} unit - Unit of measurement (reps/seconds)
 */

/**
 * Available badges that can be unlocked through workout achievements.
 * @type {Badge[]}
 */
export const BADGES = [
    { id: 'first_step', name: 'First Step', desc: 'Complete your first workout', icon: '🌱', condition: (p) => p.totalSessions >= 1 },
    { id: 'week_warrior', name: 'Week Warrior', desc: 'Complete 3 workouts in a week', icon: '⚔️', condition: (p) => p.currentStreak >= 3 },
    { id: 'on_fire', name: 'On Fire', desc: '7 day streak', icon: '🔥', condition: (p) => p.currentStreak >= 7 },
    { id: 'month_monster', name: 'Month Monster', desc: '30 day streak', icon: '👹', condition: (p) => p.currentStreak >= 30 },
    { id: 'century_club', name: 'Century Club', desc: '100 total workouts', icon: '💯', condition: (p) => p.totalSessions >= 100 },
    { id: 'mastery', name: 'Master', desc: 'Complete an entire plan', icon: '👑', condition: (p) => p.completedPlans > 0 },
    { id: 'complete_athlete', name: 'Complete Athlete', desc: `Master all ${TOTAL_EXERCISES} exercises`, icon: '🏆', condition: (p) => p.completedPlans >= TOTAL_EXERCISES },
    { id: 'early_bird', name: 'Early Bird', desc: `Workout before ${EARLY_WORKOUT_HOUR}am`, icon: '🌅', condition: (p) => p.hasEarlyWorkout },
    { id: 'night_owl', name: 'Night Owl', desc: `Workout after ${LATE_WORKOUT_HOUR - 12}pm`, icon: '🦉', condition: (p) => p.hasLateWorkout },
]

/**
 * Calculates user statistics from completed workouts and session history.
 * @param {Object.<string, string[]>} completedDays - Map of exercise keys to arrays of completed day IDs
 * @param {SessionHistoryItem[]} sessionHistory - Array of session history items
 * @returns {Stats} Calculated statistics object
 */
export const calculateStats = (completedDays, sessionHistory = []) => {
    let totalSessions = 0;
    let completedPlans = 0;

    // Plan Progress
    Object.keys(completedDays).forEach(key => {
        const count = completedDays[key].length;
        totalSessions += count;
        if (count >= TOTAL_DAYS_PER_EXERCISE) completedPlans++;
    });

    // True Streak Calculation from History
    let currentStreak = 0;
    let hasEarlyWorkout = false;
    let hasLateWorkout = false;

    if (sessionHistory.length > 0) {
        // Sort history by date descending
        const sorted = [...sessionHistory].sort((a, b) => new Date(b.date) - new Date(a.date));

        // Time of day checks
        sessionHistory.forEach(s => {
            const hour = new Date(s.date).getHours();
            if (hour < EARLY_WORKOUT_HOUR) hasEarlyWorkout = true;
            if (hour >= LATE_WORKOUT_HOUR) hasLateWorkout = true;
        });

        // Daily Streak
        const uniqueDays = new Set(sorted.map(s => s.date.split('T')[0]));
        const days = Array.from(uniqueDays).sort((a, b) => new Date(b) - new Date(a));

        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - MS_PER_DAY).toISOString().split('T')[0];

        // If no workout today or yesterday, streak is 0
        if (days[0] === today || days[0] === yesterday) {
            currentStreak = 1;
            for (let i = 0; i < days.length - 1; i++) {
                const current = new Date(days[i]);
                const next = new Date(days[i + 1]);
                const diffDays = (current - next) / MS_PER_DAY;

                if (diffDays <= 1.1) { // Allowing some slack for rounding
                    currentStreak++;
                } else {
                    break;
                }
            }
        }
    }

    return {
        totalSessions,
        completedPlans,
        currentStreak,
        hasEarlyWorkout,
        hasLateWorkout
    };
};

/**
 * Returns all badges that the user has unlocked based on their stats.
 * @param {Stats} stats - User statistics object
 * @returns {Badge[]} Array of unlocked badges
 */
export const getUnlockedBadges = (stats) => {
    return BADGES.filter(badge => badge.condition(stats));
};

/**
 * Calculates personal records (max volume) for each exercise from session history.
 * @param {SessionHistoryItem[]} sessionHistory - Array of session history items
 * @returns {Object.<string, {volume: number, date: string}>} Map of exercise keys to PR info
 */
export const getPersonalRecords = (sessionHistory = []) => {
    const prs = {};
    sessionHistory.forEach(session => {
        const { exerciseKey, volume, date } = session;
        if (!prs[exerciseKey] || volume > prs[exerciseKey].volume) {
            prs[exerciseKey] = { volume, date };
        }
    });
    return prs;
};

/**
 * Checks if a given volume is a new personal record for an exercise.
 * @param {string} exerciseKey - The exercise key
 * @param {number} volume - The volume to check
 * @param {SessionHistoryItem[]} sessionHistory - Previous session history (not including current)
 * @returns {boolean} True if this is a new PR
 */
export const isNewPersonalRecord = (exerciseKey, volume, sessionHistory = []) => {
    const exerciseHistory = sessionHistory.filter(s => s.exerciseKey === exerciseKey);
    if (exerciseHistory.length === 0) return volume > 0;
    const maxVolume = Math.max(...exerciseHistory.map(s => s.volume));
    return volume > maxVolume;
};
