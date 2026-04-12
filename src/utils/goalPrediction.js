/**
 * Predictive Goal Analysis Utility
 *
 * Calculates estimated completion dates and provides insights on:
 * - Days remaining per exercise
 * - Estimated completion dates based on workout frequency
 * - Overall program progress
 * - Pace analysis (ahead/behind schedule)
 */

import { TOTAL_DAYS_PER_EXERCISE, MS_PER_DAY } from './constants'

/**
 * Calculate workout frequency from history
 * @param {Array} history - Workout history array
 * @param {number} lookbackDays - Days to analyze (default 14)
 * @returns {Object} Frequency metrics
 */
export const calculateWorkoutFrequency = (history = [], lookbackDays = 14) => {
  if (!history || history.length === 0) {
    return {
      workoutsPerWeek: 0,
      workoutsPerDay: 0,
      activeDays: 0,
      totalWorkouts: 0,
      averageGap: null
    }
  }

  const now = Date.now()
  const cutoff = now - (lookbackDays * MS_PER_DAY)

  // Filter to recent history
  const recentWorkouts = history.filter(w => {
    const workoutDate = new Date(w.date).getTime()
    return workoutDate >= cutoff
  })

  if (recentWorkouts.length === 0) {
    return {
      workoutsPerWeek: 0,
      workoutsPerDay: 0,
      activeDays: 0,
      totalWorkouts: 0,
      averageGap: null
    }
  }

  // Count unique active days
  const uniqueDays = new Set(
    recentWorkouts.map(w => new Date(w.date).toDateString())
  )
  const activeDays = uniqueDays.size

  // Calculate workouts per week
  const actualDays = Math.max(1, Math.min(lookbackDays,
    Math.ceil((now - new Date(recentWorkouts[recentWorkouts.length - 1].date).getTime()) / MS_PER_DAY) + 1
  ))
  const workoutsPerWeek = (recentWorkouts.length / actualDays) * 7

  // Calculate average gap between workouts
  const sortedDates = [...uniqueDays].map(d => new Date(d).getTime()).sort((a, b) => a - b)
  let totalGap = 0
  for (let i = 1; i < sortedDates.length; i++) {
    totalGap += (sortedDates[i] - sortedDates[i - 1]) / MS_PER_DAY
  }
  const averageGap = sortedDates.length > 1 ? totalGap / (sortedDates.length - 1) : null

  return {
    workoutsPerWeek: Math.round(workoutsPerWeek * 10) / 10,
    workoutsPerDay: recentWorkouts.length / actualDays,
    activeDays,
    totalWorkouts: recentWorkouts.length,
    averageGap: averageGap ? Math.round(averageGap * 10) / 10 : null
  }
}

/**
 * Calculate progress for a single exercise
 * @param {string} exerciseKey - Exercise identifier
 * @param {Object} progress - Progress object { exerciseKey: [dayIds] }
 * @returns {Object} Exercise progress details
 */
export const getExerciseProgress = (exerciseKey, progress = {}) => {
  const completedDays = progress[exerciseKey] || []
  const daysCompleted = completedDays.length
  const daysRemaining = Math.max(0, TOTAL_DAYS_PER_EXERCISE - daysCompleted)
  const percentComplete = Math.round((daysCompleted / TOTAL_DAYS_PER_EXERCISE) * 100)

  return {
    exerciseKey,
    daysCompleted,
    daysRemaining,
    percentComplete,
    isComplete: daysRemaining === 0,
    currentDay: daysCompleted + 1
  }
}

/**
 * Predict completion date for an exercise
 * @param {Object} exerciseProgress - From getExerciseProgress
 * @param {Object} frequencyData - From calculateWorkoutFrequency
 * @param {number} workoutsPerExercisePerWeek - Target frequency for this exercise (default 3)
 * @returns {Object} Prediction details
 */
export const predictCompletion = (exerciseProgress, frequencyData, workoutsPerExercisePerWeek = 3) => {
  const { daysRemaining, isComplete } = exerciseProgress

  if (isComplete) {
    return {
      isComplete: true,
      daysUntilComplete: 0,
      estimatedDate: null,
      confidence: 'complete',
      message: 'Completed!'
    }
  }

  // If no workout history, use target frequency
  const effectiveFrequency = frequencyData.workoutsPerWeek > 0
    ? Math.min(frequencyData.workoutsPerWeek, workoutsPerExercisePerWeek)
    : workoutsPerExercisePerWeek

  // Days needed = (remaining workouts) / (workouts per day)
  // Assuming user does this exercise workoutsPerExercisePerWeek times per week
  const workoutsPerDay = effectiveFrequency / 7
  const calendarDaysNeeded = Math.ceil(daysRemaining / workoutsPerDay)

  const estimatedDate = new Date()
  estimatedDate.setDate(estimatedDate.getDate() + calendarDaysNeeded)

  // Determine confidence based on history
  let confidence = 'low'
  if (frequencyData.totalWorkouts >= 10) confidence = 'high'
  else if (frequencyData.totalWorkouts >= 5) confidence = 'medium'

  return {
    isComplete: false,
    daysUntilComplete: calendarDaysNeeded,
    estimatedDate,
    confidence,
    message: formatPredictionMessage(calendarDaysNeeded, confidence)
  }
}

/**
 * Format prediction message
 * @param {number} days - Days until completion
 * @param {string} confidence - Confidence level
 * @returns {string} Human-readable message
 */
const formatPredictionMessage = (days, confidence) => {
  const weeks = Math.floor(days / 7)
  const remainingDays = days % 7

  let timeStr
  if (weeks === 0) {
    timeStr = `${days} day${days !== 1 ? 's' : ''}`
  } else if (remainingDays === 0) {
    timeStr = `${weeks} week${weeks !== 1 ? 's' : ''}`
  } else {
    timeStr = `${weeks}w ${remainingDays}d`
  }

  const confidenceNote = confidence === 'low' ? ' (estimate)' : ''
  return `~${timeStr}${confidenceNote}`
}

/**
 * Analyze pace - are they ahead or behind schedule?
 * @param {Object} progress - Full progress object
 * @param {Array} history - Workout history
 * @returns {Object} Pace analysis
 */
export const analyzePace = (progress = {}, history = []) => {
  if (!history || history.length === 0) {
    return {
      status: 'new',
      message: 'Just getting started',
      daysActive: 0,
      averageWorkoutsPerDay: 0
    }
  }

  // Find first workout date
  const sortedHistory = [...history].sort((a, b) =>
    new Date(a.date) - new Date(b.date)
  )
  const firstWorkout = new Date(sortedHistory[0].date)
  const now = new Date()
  const daysActive = Math.ceil((now - firstWorkout) / MS_PER_DAY)

  // Count total completed days across all exercises
  const totalCompletedDays = Object.values(progress).reduce(
    (sum, days) => sum + (days?.length || 0),
    0
  )

  const averageWorkoutsPerDay = totalCompletedDays / Math.max(1, daysActive)

  // Expected pace: 3 workouts per week = 0.43 per day
  const expectedPace = 3 / 7
  const paceRatio = averageWorkoutsPerDay / expectedPace

  let status, message
  if (paceRatio >= 1.2) {
    status = 'ahead'
    message = 'Crushing it! Ahead of schedule'
  } else if (paceRatio >= 0.9) {
    status = 'on-track'
    message = 'Right on track'
  } else if (paceRatio >= 0.6) {
    status = 'slightly-behind'
    message = 'Slightly behind pace'
  } else {
    status = 'behind'
    message = 'Pick up the pace'
  }

  return {
    status,
    message,
    daysActive,
    averageWorkoutsPerDay: Math.round(averageWorkoutsPerDay * 100) / 100,
    paceRatio: Math.round(paceRatio * 100) / 100
  }
}

/**
 * Get overall program completion summary
 * @param {Object} progress - Full progress object
 * @param {Array} exercises - Array of exercise keys
 * @returns {Object} Program summary
 */
export const getProgramSummary = (progress = {}, exercises = []) => {
  const exerciseCount = exercises.length
  const totalDays = exerciseCount * TOTAL_DAYS_PER_EXERCISE

  let completedDays = 0
  let completedExercises = 0

  exercises.forEach(key => {
    const days = progress[key]?.length || 0
    completedDays += days
    if (days >= TOTAL_DAYS_PER_EXERCISE) {
      completedExercises++
    }
  })

  const percentComplete = Math.round((completedDays / totalDays) * 100)

  return {
    totalExercises: exerciseCount,
    completedExercises,
    totalDays,
    completedDays,
    percentComplete,
    allComplete: completedExercises === exerciseCount
  }
}

/**
 * Get next milestone for an exercise
 * @param {number} currentDay - Current day (1-indexed)
 * @returns {Object} Next milestone info
 */
export const getNextMilestone = (currentDay) => {
  const milestones = [
    { day: 3, label: 'Week 1 Complete', emoji: '🎯' },
    { day: 6, label: 'Week 2 Complete', emoji: '💪' },
    { day: 9, label: 'Halfway There!', emoji: '🔥' },
    { day: 12, label: 'Week 4 Complete', emoji: '⭐' },
    { day: 15, label: 'Week 5 Complete', emoji: '🚀' },
    { day: 18, label: 'Mastered!', emoji: '🏆' }
  ]

  for (const milestone of milestones) {
    if (currentDay <= milestone.day) {
      return {
        ...milestone,
        daysAway: milestone.day - currentDay + 1,
        progress: ((currentDay - 1) / milestone.day) * 100
      }
    }
  }

  return {
    day: 18,
    label: 'Mastered!',
    emoji: '🏆',
    daysAway: 0,
    progress: 100
  }
}
