/**
 * Gym-specific badge definitions for weight-training workouts.
 * These badges unlock based on gym history data (sessions, volume, PRs, streaks).
 * They are additive to the home (bodyweight) badges in gamification.js.
 */

/**
 * @typedef {Object} GymBadge
 * @property {string} id - Unique badge identifier
 * @property {string} name - Display name
 * @property {string} desc - Description of how to earn
 * @property {string} icon - Emoji icon
 * @property {function(GymStats): boolean} condition - Function to check if badge is unlocked
 */

/**
 * @typedef {Object} GymStats
 * @property {number} totalGymSessions - Total completed gym workout sessions
 * @property {number} totalGymVolume - Total volume (kg) lifted across all gym sessions
 * @property {number} gymPRs - Number of personal records set in gym exercises
 * @property {number} gymStreak - Current consecutive-day gym streak
 */

/**
 * Gym-specific badges that can be unlocked through gym workout achievements.
 * @type {GymBadge[]}
 */
export const GYM_BADGES = [
    // Getting Started
    { id: 'first_weight', name: 'First Rep', desc: 'Complete your first gym workout', icon: '🏋️', condition: (s) => s.totalGymSessions >= 1 },
    { id: 'iron_warrior', name: 'Iron Warrior', desc: 'Complete 25 gym workouts', icon: '💪', condition: (s) => s.totalGymSessions >= 25 },
    { id: 'gym_centurion', name: 'Gym Centurion', desc: 'Complete 100 gym workouts', icon: '🏗️', condition: (s) => s.totalGymSessions >= 100 },

    // Volume
    { id: 'plateau_breaker', name: 'Plateau Breaker', desc: 'Hit a personal record on any exercise', icon: '⚡', condition: (s) => s.gymPRs > 0 },
    { id: 'pr_hunter_gym', name: 'PR Hunter (Gym)', desc: 'Set 5 personal records in the gym', icon: '🎖️', condition: (s) => s.gymPRs >= 5 },
    { id: 'volume_king', name: 'Volume King', desc: 'Lift over 10,000kg total volume', icon: '👑', condition: (s) => s.totalGymVolume >= 10000 },
    { id: 'volume_titan', name: 'Volume Titan', desc: 'Lift over 100,000kg total volume', icon: '🏔️', condition: (s) => s.totalGymVolume >= 100000 },

    // Streaks
    { id: 'consistent_lifter', name: 'Consistent Lifter', desc: 'Maintain a 7-day gym streak', icon: '🔥', condition: (s) => s.gymStreak >= 7 },
    { id: 'iron_habit', name: 'Iron Habit', desc: 'Maintain a 30-day gym streak', icon: '⛓️', condition: (s) => s.gymStreak >= 30 },
];

/**
 * Calculates gym-specific statistics from gym history and streak data.
 * @param {Array} gymHistory - Array of gym workout history entries
 * @param {number} gymStreak - Current gym streak count
 * @returns {GymStats} Calculated gym statistics
 */
export const calculateGymStats = (gymHistory = [], gymStreak = 0) => {
    const totalGymSessions = gymHistory.length;

    // Total volume: sum of all exercise volumes across all sessions
    const totalGymVolume = gymHistory.reduce((sum, workout) => {
        if (workout.exercises && Array.isArray(workout.exercises)) {
            return sum + workout.exercises.reduce((eSum, ex) => eSum + (ex.totalVolume || 0), 0);
        }
        // Fallback if exercises array is missing
        return sum + (workout.totalVolume || 0);
    }, 0);

    // Count personal records: compare each exercise's best volume to its second-best
    const exerciseBests = {};
    const exerciseSecondBests = {};
    gymHistory.forEach(workout => {
        if (workout.exercises && Array.isArray(workout.exercises)) {
            workout.exercises.forEach(ex => {
                const vol = ex.totalVolume || 0;
                const key = ex.exerciseId;
                if (!exerciseBests[key] || vol > exerciseBests[key]) {
                    exerciseSecondBests[key] = exerciseBests[key] || 0;
                    exerciseBests[key] = vol;
                } else if (vol > (exerciseSecondBests[key] || 0)) {
                    exerciseSecondBests[key] = vol;
                }
            });
        }
    });

    // A PR counts if there are at least two entries for an exercise (improvement over previous best)
    const gymPRs = Object.keys(exerciseBests).filter(key => exerciseSecondBests[key] > 0).length;

    return {
        totalGymSessions,
        totalGymVolume,
        gymPRs,
        gymStreak,
    };
};

/**
 * Returns all gym badges that the user has unlocked based on their gym stats.
 * @param {GymStats} stats - User's gym statistics
 * @returns {GymBadge[]} Array of unlocked gym badges
 */
export const getUnlockedGymBadges = (stats) => {
    return GYM_BADGES.filter(badge => badge.condition(stats));
};