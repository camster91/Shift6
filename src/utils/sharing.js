/**
 * Social Sharing Utilities
 *
 * Uses the Web Share API when available, with clipboard fallback.
 * Supports sharing workout completions, achievements, streaks, and progress.
 */

/**
 * Check if the Web Share API is available
 * @returns {boolean} True if sharing is supported
 */
export const canShare = () => {
    return typeof navigator !== 'undefined' && !!navigator.share
}

/**
 * Share content using Web Share API with clipboard fallback
 * @param {Object} options - Share options
 * @param {string} options.title - Share title
 * @param {string} options.text - Share text/body
 * @returns {Promise<boolean>} True if shared successfully
 */
export const shareContent = async ({ title, text }) => {
    if (canShare()) {
        try {
            await navigator.share({ title, text })
            return true
        } catch (err) {
            // User cancelled or share failed
            if (err.name === 'AbortError') return false
            // Fall through to clipboard
        }
    }

    // Clipboard fallback
    try {
        await navigator.clipboard.writeText(text)
        return true
    } catch {
        return false
    }
}

/**
 * Generate shareable text for a workout completion
 * @param {Object} options
 * @param {string} options.exerciseName - Name of the exercise
 * @param {number} options.volume - Volume completed (reps or seconds)
 * @param {string} options.unit - Unit of measurement
 * @param {number} options.sets - Number of sets completed
 * @returns {Object} Share data with title and text
 */
export const buildWorkoutShareText = ({ exerciseName, volume, unit, sets }) => {
    const unitLabel = unit === 'seconds' ? 'seconds' : 'reps'
    return {
        title: 'Shift6 Workout Complete',
        text: `Just crushed ${sets} sets of ${exerciseName} - ${volume} ${unitLabel} total! #Shift6 #Fitness`
    }
}

/**
 * Generate shareable text for a streak milestone
 * @param {number} streak - Current streak count
 * @returns {Object} Share data with title and text
 */
export const buildStreakShareText = (streak) => {
    return {
        title: 'Shift6 Streak',
        text: `${streak}-day workout streak and counting! Consistency is key. #Shift6 #WorkoutStreak`
    }
}

/**
 * Generate shareable text for an achievement/badge
 * @param {Object} badge - Badge object
 * @param {string} badge.name - Badge display name
 * @param {string} badge.desc - Badge description
 * @param {string} badge.icon - Badge emoji
 * @returns {Object} Share data with title and text
 */
export const buildBadgeShareText = (badge) => {
    return {
        title: 'Shift6 Achievement Unlocked',
        text: `${badge.icon} Achievement Unlocked: ${badge.name} - ${badge.desc}! #Shift6 #FitnessGoals`
    }
}

/**
 * Generate shareable text for overall progress summary
 * @param {Object} stats - User stats object
 * @param {number} stats.totalSessions - Total workouts completed
 * @param {number} stats.currentStreak - Current streak days
 * @param {number} stats.completedPlans - Exercises mastered
 * @param {number} stats.totalVolume - Total reps/seconds
 * @returns {Object} Share data with title and text
 */
export const buildProgressShareText = (stats) => {
    const parts = []
    if (stats.totalSessions > 0) parts.push(`${stats.totalSessions} workouts`)
    if (stats.currentStreak > 0) parts.push(`${stats.currentStreak}-day streak`)
    if (stats.completedPlans > 0) parts.push(`${stats.completedPlans} exercises mastered`)
    if (stats.totalVolume > 0) parts.push(`${stats.totalVolume.toLocaleString()} total reps`)

    return {
        title: 'Shift6 Progress',
        text: parts.length > 0
            ? `My Shift6 fitness journey: ${parts.join(' | ')} #Shift6 #FitnessProgress`
            : 'Starting my fitness journey with Shift6! #Shift6 #FitnessGoals'
    }
}

/**
 * Generate shareable text for a personal record
 * @param {string} exerciseName - Name of the exercise
 * @param {number} volume - New record volume
 * @param {string} unit - Unit of measurement
 * @returns {Object} Share data with title and text
 */
export const buildPRShareText = (exerciseName, volume, unit) => {
    const unitLabel = unit === 'seconds' ? 'seconds' : 'reps'
    return {
        title: 'Shift6 Personal Record',
        text: `New personal record! ${exerciseName}: ${volume} ${unitLabel}! #Shift6 #PersonalBest`
    }
}
