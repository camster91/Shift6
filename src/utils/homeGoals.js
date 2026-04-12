/**
 * Home Mode 6-Week Goal System
 * Rep/time-based progression for bodyweight exercises
 *
 * Adapted from gymProgression.js for calisthenics-specific goals.
 * Instead of weight progression, focuses on rep count or hold time.
 */

// Constants available from './constants' if needed in the future

/**
 * Calculate a realistic 6-week rep goal based on starting point
 * @param {Object} exercise - Exercise data (from EXERCISE_PLANS or allExercises)
 * @param {number} currentMax - Current max reps/seconds achieved
 * @param {string} fitnessLevel - 'beginner' | 'intermediate' | 'advanced'
 * @returns {Object} { targetValue, weeklyIncrease }
 */
export const calculateRealisticHomeGoal = (exercise, currentMax, fitnessLevel = 'intermediate') => {
  const unit = exercise?.unit || 'reps'

  // Fitness level multipliers (beginners see faster relative gains)
  const levelMultiplier = {
    beginner: 1.3,
    intermediate: 1.0,
    advanced: 0.7,
  }[fitnessLevel] || 1.0

  // Parse numeric final goal from exercise data (e.g. "100 Reps" -> 100)
  const parsedFinalGoal = exercise?.finalGoal
    ? parseInt(exercise.finalGoal, 10) || 0
    : 0

  let targetValue

  if (unit === 'seconds') {
    // For timed exercises (plank), aim for 40-60% increase over 6 weeks
    const increase = Math.ceil(currentMax * 0.5 * levelMultiplier)
    targetValue = currentMax + increase
    // Cap at the exercise final goal if defined
    if (parsedFinalGoal > 0) {
      targetValue = Math.min(targetValue, parsedFinalGoal)
    }
  } else {
    // For rep exercises, aim for 50-80% increase over 6 weeks
    const increase = Math.ceil(currentMax * 0.6 * levelMultiplier)
    targetValue = currentMax + increase
    // Cap at the exercise final goal if defined
    if (parsedFinalGoal > 0) {
      targetValue = Math.min(targetValue, parsedFinalGoal)
    }
  }

  // Ensure target is at least slightly above current
  targetValue = Math.max(targetValue, currentMax + 3)

  const weeklyIncrease = Math.ceil((targetValue - currentMax) / 6)

  return {
    targetValue,
    weeklyIncrease,
    totalIncrease: targetValue - currentMax,
    unit
  }
}

/**
 * Generate weekly targets for a 6-week bodyweight progression
 * @param {number} startingValue - Current max reps/seconds
 * @param {number} targetValue - 6-week target
 * @param {string} unit - 'reps' | 'seconds' | 'reps/leg'
 * @returns {Array} Weekly targets
 */
export const generateHomeWeeklyTargets = (startingValue, targetValue, unit = 'reps') => {
  const weeks = []
  const diff = targetValue - startingValue

  // When target is lower than starting (negative diff), use a declining schedule
  if (diff < 0) {
    for (let week = 1; week <= 6; week++) {
      const progress = week / 6
      const weekTarget = Math.round(startingValue + (diff * progress))
      weeks.push({
        week,
        targetValue: weekTarget,
        unit,
        isDeloadWeek: week === 4,
        notes: week === 4 ? 'Consolidation week - focus on form' : null
      })
    }
    return weeks
  }

  for (let week = 1; week <= 6; week++) {
    // Slightly front-loaded for motivation, with deload consideration at week 4
    let progress
    if (week <= 3) {
      // Weeks 1-3: steady build (slightly faster)
      progress = (week / 6) * 1.1
    } else if (week === 4) {
      // Week 4: deload / consolidation
      progress = 0.55
    } else {
      // Weeks 5-6: push to target
      progress = (week / 6)
    }
    progress = Math.min(progress, 1)

    const weekTarget = Math.round(startingValue + (diff * progress))

    weeks.push({
      week,
      targetValue: weekTarget,
      unit,
      isDeloadWeek: week === 4,
      notes: week === 4 ? 'Consolidation week - focus on form' : null
    })
  }

  return weeks
}

/**
 * Create a new home mode goal for an exercise
 * @param {string} exerciseKey - Exercise identifier
 * @param {Object} exercise - Exercise data
 * @param {number} currentMax - Current max reps/seconds
 * @param {number|null} customTarget - Optional custom target
 * @param {string} fitnessLevel - 'beginner' | 'intermediate' | 'advanced'
 * @returns {Object} Complete goal object
 */
export const createHomeGoal = (
  exerciseKey,
  exercise,
  currentMax,
  customTarget = null,
  fitnessLevel = 'intermediate'
) => {
  const unit = exercise?.unit || 'reps'

  // Calculate suggested goal if no custom provided
  const suggested = calculateRealisticHomeGoal(exercise, currentMax, fitnessLevel)

  const targetValue = customTarget ?? suggested.targetValue

  // Generate weekly targets
  const weeklyTargets = generateHomeWeeklyTargets(currentMax, targetValue, unit)

  const now = new Date()
  const targetDate = new Date(now)
  targetDate.setDate(targetDate.getDate() + 42) // 6 weeks

  return {
    exerciseKey,
    exerciseName: exercise?.name || exerciseKey,
    unit,
    startDate: now.toISOString(),
    targetDate: targetDate.toISOString(),
    startingValue: currentMax,
    targetValue,
    weeklyTargets,
    fitnessLevel,
    status: 'active', // 'active' | 'completed' | 'paused'
    currentWeek: 1,
    history: [],
    adjustments: [],
    suggestedGoal: suggested
  }
}

/**
 * Get current week number for a goal
 * @param {Object} goal
 * @returns {number} Week number (1-6) or 7+ if past target
 */
export const getHomeGoalWeek = (goal) => {
  if (!goal?.startDate) return 1
  const start = new Date(goal.startDate)
  const now = new Date()
  const daysDiff = Math.floor((now - start) / (1000 * 60 * 60 * 24))
  const week = Math.floor(daysDiff / 7) + 1
  return Math.max(1, Math.min(week, 7))
}

/**
 * Get the target for the current week
 * @param {Object} goal
 * @returns {Object} { targetValue, week, unit, isDeloadWeek }
 */
export const getHomeCurrentTarget = (goal) => {
  const currentWeek = getHomeGoalWeek(goal)

  if (!goal?.weeklyTargets?.length) {
    return { targetValue: goal?.targetValue || 0, week: currentWeek, isPastTarget: true }
  }

  if (currentWeek > 6) {
    return {
      ...goal.weeklyTargets[5],
      week: currentWeek,
      isPastTarget: true
    }
  }

  return {
    ...goal.weeklyTargets[currentWeek - 1],
    isPastTarget: false
  }
}

/**
 * Record a workout result for a home goal
 * @param {Object} goal
 * @param {number} actualValue - Actual reps/seconds achieved
 * @returns {Object} Updated goal with analysis
 */
export const recordHomeGoalResult = (goal, actualValue) => {
  const currentWeek = getHomeGoalWeek(goal)
  const target = getHomeCurrentTarget(goal)

  const result = {
    date: new Date().toISOString(),
    week: currentWeek,
    targetValue: target.targetValue,
    actualValue,
    diff: actualValue - target.targetValue
  }

  // Analyze performance
  const diffPercent = target.targetValue > 0
    ? ((actualValue - target.targetValue) / target.targetValue) * 100
    : 0

  let status = 'on_track'
  let message = ''

  if (diffPercent >= 10) {
    status = 'ahead'
    message = 'Crushing it! Ahead of schedule.'
  } else if (diffPercent >= -5) {
    status = 'on_track'
    message = 'Right on target. Keep it up!'
  } else if (diffPercent >= -15) {
    status = 'behind'
    message = 'Slightly behind. Focus on recovery.'
  } else {
    status = 'struggling'
    message = 'Tough session. Rest and come back stronger.'
  }

  result.analysis = { status, message, diffPercent: Math.round(diffPercent) }

  const updatedGoal = {
    ...goal,
    currentWeek,
    history: [...(goal.history || []), result],
    lastWorkout: result
  }

  // Check if goal is completed
  if (currentWeek >= 6 && actualValue >= goal.targetValue) {
    updatedGoal.status = 'completed'
    updatedGoal.completedDate = new Date().toISOString()
  }

  return updatedGoal
}

/**
 * Calculate overall progress percentage towards a home goal
 * @param {Object} goal
 * @returns {number} Progress percentage (0-100)
 */
export const calculateHomeProgress = (goal) => {
  if (!goal?.history || goal.history.length === 0) {
    // If no workout recorded yet, use time-based progress
    const week = getHomeGoalWeek(goal)
    return Math.min(100, Math.round(((week - 1) / 6) * 30)) // Max 30% from time alone
  }

  const latestResult = goal.history[goal.history.length - 1]
  const range = goal.targetValue - goal.startingValue

  if (range <= 0) return 100

  const progress = ((latestResult.actualValue - goal.startingValue) / range) * 100
  return Math.min(100, Math.max(0, Math.round(progress)))
}

/**
 * Get a summary of all active home goals
 * @param {Object} goals - { [exerciseKey]: goal }
 * @returns {Object} Summary statistics
 */
export const getHomeGoalsSummary = (goals) => {
  const goalArray = Object.values(goals || {})

  const active = goalArray.filter(g => g.status === 'active')
  const completed = goalArray.filter(g => g.status === 'completed')

  const avgProgress = active.length > 0
    ? Math.round(active.reduce((sum, g) => sum + calculateHomeProgress(g), 0) / active.length)
    : 0

  return {
    total: goalArray.length,
    active: active.length,
    completed: completed.length,
    averageProgress: avgProgress,
    closestToCompletion: active.sort((a, b) => calculateHomeProgress(b) - calculateHomeProgress(a))[0] || null
  }
}

/**
 * Check if it's time to set a new goal (past 6 weeks or completed)
 * @param {Object} goal
 * @returns {boolean}
 */
export const shouldSetNewHomeGoal = (goal) => {
  if (!goal) return true
  if (goal.status === 'completed') return true
  return getHomeGoalWeek(goal) > 6
}

/**
 * Create a follow-up goal after completing the previous one
 * @param {Object} previousGoal
 * @param {Object} exercise - Exercise data
 * @param {string} fitnessLevel
 * @returns {Object} New goal
 */
export const createFollowUpHomeGoal = (previousGoal, exercise, fitnessLevel = 'intermediate') => {
  const lastResult = previousGoal.history?.[previousGoal.history.length - 1]
  const newStartingValue = lastResult?.actualValue || previousGoal.targetValue

  return createHomeGoal(
    previousGoal.exerciseKey,
    exercise,
    newStartingValue,
    null,
    fitnessLevel
  )
}

/**
 * Infer current max from session history for an exercise
 * @param {string} exerciseKey
 * @param {Array} sessionHistory - Array of { exerciseKey, volume, ... }
 * @param {Object} personalRecords - { [exerciseKey]: { volume } }
 * @returns {number} Best estimate of current max
 */
export const inferCurrentMax = (exerciseKey, sessionHistory = [], personalRecords = {}) => {
  // Check personal records first
  if (personalRecords[exerciseKey]?.volume) {
    return personalRecords[exerciseKey].volume
  }

  // Look at recent history for this exercise
  const exerciseHistory = sessionHistory
    .filter(s => s.exerciseKey === exerciseKey)
    .slice(0, 10)

  if (exerciseHistory.length > 0) {
    return Math.max(...exerciseHistory.map(s => s.volume || 0))
  }

  return 0
}
