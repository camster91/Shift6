import {
    MS_PER_DAY,
    TOTAL_DAYS_PER_EXERCISE,
    EARLY_WORKOUT_HOUR,
    LATE_WORKOUT_HOUR,
    UPPER_BODY_EXERCISES,
    LOWER_BODY_EXERCISES,
    STREAK_CONFIG,
    STORAGE_KEYS
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
 * @property {number} totalVolume - Total reps/seconds across all workouts
 * @property {number} exercisesInOneDay - Max exercises completed in a single day
 * @property {boolean} hasWeekendWorkout - Has worked out on both Sat and Sun
 * @property {number} longestStreak - Longest streak ever achieved
 * @property {number} personalRecords - Number of personal records set
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
    // Getting Started
    { id: 'first_step', name: 'First Step', desc: 'Complete your first workout', icon: '🌱', condition: (p) => p.totalSessions >= 1 },
    { id: 'getting_started', name: 'Getting Started', desc: 'Complete 5 workouts', icon: '🚀', condition: (p) => p.totalSessions >= 5 },
    { id: 'dedicated', name: 'Dedicated', desc: 'Complete 25 workouts', icon: '💪', condition: (p) => p.totalSessions >= 25 },
    { id: 'half_century', name: 'Half Century', desc: '50 total workouts', icon: '5️⃣', condition: (p) => p.totalSessions >= 50 },
    { id: 'century_club', name: 'Century Club', desc: '100 total workouts', icon: '💯', condition: (p) => p.totalSessions >= 100 },

    // Streaks
    { id: 'week_warrior', name: 'Week Warrior', desc: '3 day streak', icon: '⚔️', condition: (p) => p.currentStreak >= 3 },
    { id: 'on_fire', name: 'On Fire', desc: '7 day streak', icon: '🔥', condition: (p) => p.currentStreak >= 7 },
    { id: 'two_weeks', name: 'Fortnight Fighter', desc: '14 day streak', icon: '🗓️', condition: (p) => p.currentStreak >= 14 },
    { id: 'month_monster', name: 'Month Monster', desc: '30 day streak', icon: '👹', condition: (p) => p.currentStreak >= 30 },

    // Mastery
    { id: 'mastery', name: 'Master', desc: 'Complete an entire exercise plan', icon: '👑', condition: (p) => p.completedPlans > 0 },
    { id: 'triple_threat', name: 'Triple Threat', desc: 'Master 3 exercises', icon: '🎯', condition: (p) => p.completedPlans >= 3 },
    { id: 'halfway_hero', name: 'Halfway Hero', desc: 'Master half the exercises', icon: '⭐', condition: (p) => p.completedPlans >= Math.ceil(TOTAL_EXERCISES / 2) },
    { id: 'complete_athlete', name: 'Complete Athlete', desc: `Master all ${TOTAL_EXERCISES} exercises`, icon: '🏆', condition: (p) => p.completedPlans >= TOTAL_EXERCISES },

    // Volume
    { id: 'thousand_club', name: 'Thousand Club', desc: '1,000 total reps', icon: '🔢', condition: (p) => p.totalVolume >= 1000 },
    { id: 'five_thousand', name: 'High Volume', desc: '5,000 total reps', icon: '📈', condition: (p) => p.totalVolume >= 5000 },
    { id: 'ten_thousand', name: 'Rep Machine', desc: '10,000 total reps', icon: '🤖', condition: (p) => p.totalVolume >= 10000 },

    // Daily Intensity
    { id: 'double_up', name: 'Double Up', desc: '2 exercises in one day', icon: '✌️', condition: (p) => p.exercisesInOneDay >= 2 },
    { id: 'triple_session', name: 'Triple Session', desc: '3 exercises in one day', icon: '🎲', condition: (p) => p.exercisesInOneDay >= 3 },
    { id: 'beast_mode', name: 'Beast Mode', desc: '5+ exercises in one day', icon: '🦁', condition: (p) => p.exercisesInOneDay >= 5 },

    // Time-based
    { id: 'early_bird', name: 'Early Bird', desc: `Workout before ${EARLY_WORKOUT_HOUR}am`, icon: '🌅', condition: (p) => p.hasEarlyWorkout },
    { id: 'night_owl', name: 'Night Owl', desc: `Workout after ${LATE_WORKOUT_HOUR - 12}pm`, icon: '🦉', condition: (p) => p.hasLateWorkout },
    { id: 'weekend_warrior', name: 'Weekend Warrior', desc: 'Workout on both Sat & Sun', icon: '🎉', condition: (p) => p.hasWeekendWorkout },

    // Personal Records
    { id: 'record_breaker', name: 'Record Breaker', desc: 'Set a personal record', icon: '📊', condition: (p) => p.personalRecords >= 1 },
    { id: 'pr_hunter', name: 'PR Hunter', desc: 'Set 5 personal records', icon: '🎖️', condition: (p) => p.personalRecords >= 5 },
    { id: 'unstoppable', name: 'Unstoppable', desc: 'Set 10 personal records', icon: '⚡', condition: (p) => p.personalRecords >= 10 },
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
    let totalVolume = 0;
    let exercisesInOneDay = 0;
    let hasWeekendWorkout = false;
    let personalRecords = 0;

    if (sessionHistory.length > 0) {
        // Sort history by date descending
        const sorted = [...sessionHistory].sort((a, b) => new Date(b.date) - new Date(a.date));

        // Track workouts per day and weekend days
        const workoutsPerDay = {};
        const weekendSaturdays = new Set();
        const weekendSundays = new Set();

        // Track PRs per exercise
        const exercisePRs = {};

        sessionHistory.forEach(s => {
            const sessionDate = new Date(s.date);
            const hour = sessionDate.getHours();
            const dayOfWeek = sessionDate.getDay();
            const dateKey = s.date.split('T')[0];

            // Time of day checks
            if (hour < EARLY_WORKOUT_HOUR) hasEarlyWorkout = true;
            if (hour >= LATE_WORKOUT_HOUR) hasLateWorkout = true;

            // Total volume
            totalVolume += s.volume || 0;

            // Exercises per day
            if (!workoutsPerDay[dateKey]) workoutsPerDay[dateKey] = new Set();
            workoutsPerDay[dateKey].add(s.exerciseKey);

            // Weekend tracking
            if (dayOfWeek === 6) weekendSaturdays.add(dateKey);
            if (dayOfWeek === 0) weekendSundays.add(dateKey);

            // Personal records tracking
            if (!exercisePRs[s.exerciseKey] || s.volume > exercisePRs[s.exerciseKey]) {
                if (exercisePRs[s.exerciseKey] !== undefined) {
                    personalRecords++;
                }
                exercisePRs[s.exerciseKey] = s.volume;
            }
        });

        // Max exercises in one day
        Object.values(workoutsPerDay).forEach(exercises => {
            if (exercises.size > exercisesInOneDay) {
                exercisesInOneDay = exercises.size;
            }
        });

        // Check for weekend warrior (worked out on both days of same weekend)
        weekendSaturdays.forEach(satDate => {
            const satDateObj = new Date(satDate);
            const sunDate = new Date(satDateObj.getTime() + MS_PER_DAY).toISOString().split('T')[0];
            if (weekendSundays.has(sunDate)) {
                hasWeekendWorkout = true;
            }
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
        hasLateWorkout,
        totalVolume,
        exercisesInOneDay,
        hasWeekendWorkout,
        personalRecords
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
 * Gets the most recent workout for a specific exercise.
 * @param {string} exerciseKey - The exercise to look up
 * @param {SessionHistoryItem[]} sessionHistory - Array of session history items
 * @returns {Object|null} Last workout info or null if never done
 */
export const getLastWorkoutForExercise = (exerciseKey, sessionHistory = []) => {
    // Filter to only this exercise and sort by date (newest first)
    const exerciseHistory = sessionHistory
        .filter(s => s.exerciseKey === exerciseKey)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (exerciseHistory.length === 0) return null;

    const last = exerciseHistory[0];
    const daysSince = Math.floor((Date.now() - new Date(last.date).getTime()) / MS_PER_DAY);

    return {
        volume: last.volume,
        unit: last.unit || 'reps',
        date: last.date,
        dayId: last.dayId,
        daysSince,
        reps: last.reps || [], // Individual set reps if available
        amrapReps: last.amrapReps || 0
    };
};

/**
 * Gets workout history summary for an exercise (last 5 workouts).
 * @param {string} exerciseKey - The exercise to look up
 * @param {SessionHistoryItem[]} sessionHistory - Array of session history items
 * @returns {Object} Summary with trend info
 */
export const getExerciseHistorySummary = (exerciseKey, sessionHistory = []) => {
    const exerciseHistory = sessionHistory
        .filter(s => s.exerciseKey === exerciseKey)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);

    if (exerciseHistory.length === 0) {
        return { workouts: [], trend: 'none', average: 0 };
    }

    const volumes = exerciseHistory.map(s => s.volume);
    const average = Math.round(volumes.reduce((a, b) => a + b, 0) / volumes.length);

    // Calculate trend (comparing last 2 workouts)
    let trend = 'stable';
    if (volumes.length >= 2) {
        const diff = volumes[0] - volumes[1];
        if (diff > volumes[1] * 0.05) trend = 'improving';
        else if (diff < -volumes[1] * 0.05) trend = 'declining';
    }

    return {
        workouts: exerciseHistory,
        trend,
        average,
        best: Math.max(...volumes),
        count: exerciseHistory.length
    };
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

// ============================================
// COMPASSIONATE STREAK SYSTEM
// ============================================

/**
 * Calculates streak with grace period and weekend grace
 * @param {SessionHistoryItem[]} history - Session history
 * @param {Object} config - Streak configuration
 * @returns {Object} - { streak, graceDaysUsed, graceRemaining, isAtRisk, message }
 */
export const calculateStreakWithGrace = (history, config = STREAK_CONFIG) => {
    if (!history || history.length === 0) {
        return {
            streak: 0,
            graceDaysUsed: 0,
            graceRemaining: config.gracePeriodDays,
            isAtRisk: false,
            message: 'Start your streak today!'
        };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get unique workout days
    const workoutDays = new Set(
        history.map(h => h.date.split('T')[0])
    );

    let streak = 0;
    let graceDaysUsed = 0;
    let currentDate = new Date(today);
    let continueChecking = true;

    // Count backwards from today (max 365 days)
    while (continueChecking && (today - currentDate < 365 * MS_PER_DAY)) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayOfWeek = currentDate.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        const workedOut = workoutDays.has(dateStr);

        if (workedOut) {
            streak++;
            graceDaysUsed = 0; // Reset grace on workout
        } else if (isWeekend && config.weekendGrace) {
            // Weekend grace - doesn't count against or for streak
            // Just continue checking
        } else if (graceDaysUsed < config.gracePeriodDays) {
            graceDaysUsed++;
            // Grace day used, don't break streak but don't add to it
        } else {
            continueChecking = false; // Streak broken
        }

        // Move to previous day
        currentDate.setDate(currentDate.getDate() - 1);
    }

    // Determine if streak is at risk (didn't work out today)
    const todayStr = today.toISOString().split('T')[0];
    const workedOutToday = workoutDays.has(todayStr);
    const isAtRisk = !workedOutToday && streak > 0;

    // Generate appropriate message
    let message = '';
    if (streak === 0) {
        message = 'Start a new streak today!';
    } else if (isAtRisk && graceDaysUsed > 0) {
        message = `Work out today to save your ${streak} day streak!`;
    } else if (isAtRisk) {
        message = `Keep your ${streak} day streak going!`;
    } else {
        message = `${streak} day streak! Keep it up!`;
    }

    return {
        streak,
        graceDaysUsed,
        graceRemaining: config.gracePeriodDays - graceDaysUsed,
        isAtRisk,
        message
    };
};

/**
 * Get remaining streak freeze tokens for current month
 * @returns {number} - Remaining freeze tokens
 */
export const getRemainingFreezeTokens = () => {
    const currentMonth = new Date().getMonth();
    const freezeKey = `${STORAGE_KEYS.streakFreezes}_${currentMonth}`;
    const freezesUsed = parseInt(localStorage.getItem(freezeKey) || '0', 10);
    return Math.max(0, STREAK_CONFIG.freezeTokensPerMonth - freezesUsed);
};

/**
 * Use a streak freeze token
 * @returns {Object} - { success, remaining, message }
 */
export const useStreakFreeze = () => {
    const currentMonth = new Date().getMonth();
    const freezeKey = `${STORAGE_KEYS.streakFreezes}_${currentMonth}`;
    const freezesUsed = parseInt(localStorage.getItem(freezeKey) || '0', 10);

    if (freezesUsed >= STREAK_CONFIG.freezeTokensPerMonth) {
        return {
            success: false,
            remaining: 0,
            message: 'No freeze tokens remaining this month'
        };
    }

    localStorage.setItem(freezeKey, String(freezesUsed + 1));

    return {
        success: true,
        remaining: STREAK_CONFIG.freezeTokensPerMonth - freezesUsed - 1,
        message: 'Streak frozen for today! Your streak is safe.'
    };
};

/**
 * Check if user is returning after a break and deserves a comeback badge
 * @param {SessionHistoryItem[]} history - Session history
 * @returns {Object|null} - Comeback info or null
 */
export const checkComeback = (history) => {
    if (!history || history.length < 2) return null;

    // Sort by date descending
    const sorted = [...history].sort((a, b) =>
        new Date(b.date) - new Date(a.date)
    );

    const latest = new Date(sorted[0].date);
    const previous = new Date(sorted[1].date);
    const daysBetween = Math.floor((latest - previous) / MS_PER_DAY);

    if (daysBetween >= 7) {
        return {
            type: 'comeback',
            daysMissed: daysBetween,
            badge: 'comeback_kid',
            message: `Welcome back! You were away for ${daysBetween} days, but you're here now! 💪`
        };
    }

    return null;
};

/**
 * Get streak status with emoji indicator
 * @param {Object} streakData - Data from calculateStreakWithGrace
 * @returns {Object} - { emoji, color, status }
 */
export const getStreakStatus = (streakData) => {
    const { streak, isAtRisk, graceRemaining } = streakData;

    if (streak === 0) {
        return { emoji: '💤', color: 'slate', status: 'inactive' };
    }

    if (isAtRisk && graceRemaining === 0) {
        return { emoji: '🚨', color: 'red', status: 'danger' };
    }

    if (isAtRisk) {
        return { emoji: '⚠️', color: 'yellow', status: 'warning' };
    }

    if (streak >= 30) {
        return { emoji: '🔥🔥', color: 'orange', status: 'legendary' };
    }

    if (streak >= 7) {
        return { emoji: '🔥', color: 'orange', status: 'hot' };
    }

    return { emoji: '✨', color: 'cyan', status: 'active' };
};
