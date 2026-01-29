/**
 * Gym Progression System
 * 6-week goal-based progression for weight training
 */

import { GYM_EXERCISES } from '../data/gymExercises'

// Progression rates per week (in kg) based on exercise type
const PROGRESSION_RATES = {
  compound: 2.5,      // Bench, Squat, Deadlift, Rows, OHP
  isolation: 1.25,    // Curls, Extensions, Laterals
  bodyweight: 0,      // Pull-ups, Dips (progress via reps)
}

// Exercise categories for progression rates
const EXERCISE_CATEGORIES = {
  // Compounds
  'bench-press': 'compound',
  'incline-bench': 'compound',
  'squat': 'compound',
  'deadlift': 'compound',
  'barbell-row': 'compound',
  'overhead-press': 'compound',
  'leg-press': 'compound',
  'romanian-deadlift': 'compound',
  'front-squat': 'compound',
  'hip-thrust': 'compound',
  // Isolation
  'bicep-curl': 'isolation',
  'tricep-pushdown': 'isolation',
  'lateral-raise': 'isolation',
  'leg-curl': 'isolation',
  'leg-extension': 'isolation',
  'face-pull': 'isolation',
  'cable-fly': 'isolation',
  'rear-delt-fly': 'isolation',
  'calf-raise': 'isolation',
  'hammer-curl': 'isolation',
  'skull-crusher': 'isolation',
  // Bodyweight
  'pull-up': 'bodyweight',
  'chin-up': 'bodyweight',
  'dip': 'bodyweight',
}

/**
 * Get the category of an exercise for progression calculation
 * @param {string} exerciseId
 * @returns {string} 'compound' | 'isolation' | 'bodyweight'
 */
export const getExerciseCategory = (exerciseId) => {
  return EXERCISE_CATEGORIES[exerciseId] || 'isolation'
}

/**
 * Calculate a realistic 6-week goal based on starting point
 * @param {string} exerciseId
 * @param {number} startingWeight - Current working weight in kg
 * @param {number} startingReps - Current reps at that weight
 * @param {string} fitnessLevel - 'beginner' | 'intermediate' | 'advanced'
 * @returns {Object} { targetWeight, targetReps, weeklyIncrease }
 */
export const calculateRealisticGoal = (exerciseId, startingWeight, startingReps, fitnessLevel = 'beginner') => {
  const category = getExerciseCategory(exerciseId)
  const exercise = GYM_EXERCISES[exerciseId]

  // Fitness level multipliers (beginners progress faster)
  const levelMultiplier = {
    beginner: 1.2,
    intermediate: 1.0,
    advanced: 0.7,
  }[fitnessLevel] || 1.0

  let targetWeight = startingWeight
  let targetReps = startingReps
  let weeklyIncrease = 0

  if (category === 'bodyweight') {
    // For bodyweight exercises, progress via reps
    // Aim for 50% increase in reps over 6 weeks
    const repIncrease = Math.ceil(startingReps * 0.5 * levelMultiplier)
    targetReps = startingReps + repIncrease
    targetWeight = startingWeight // Usually bodyweight or weighted vest
  } else {
    // For weighted exercises, progress via weight
    const baseRate = PROGRESSION_RATES[category]
    weeklyIncrease = baseRate * levelMultiplier

    // 6 weeks of progression
    const totalIncrease = weeklyIncrease * 6
    targetWeight = Math.round((startingWeight + totalIncrease) * 2) / 2 // Round to nearest 0.5kg

    // Keep reps the same or slight increase
    targetReps = Math.min(startingReps + 2, 12)
  }

  // Apply exercise-specific caps if available
  if (exercise?.maxWeight && targetWeight > exercise.maxWeight) {
    targetWeight = exercise.maxWeight
  }

  return {
    targetWeight,
    targetReps,
    weeklyIncrease,
    totalIncrease: targetWeight - startingWeight,
    category
  }
}

/**
 * Generate weekly targets for a 6-week progression
 * @param {number} startingWeight
 * @param {number} targetWeight
 * @param {number} startingReps
 * @param {number} targetReps
 * @param {string} category
 * @returns {Array} Weekly targets
 */
export const generateWeeklyTargets = (startingWeight, targetWeight, startingReps, targetReps, category = 'compound') => {
  const weeks = []
  const weightDiff = targetWeight - startingWeight
  const repsDiff = targetReps - startingReps

  for (let week = 1; week <= 6; week++) {
    // Linear progression with slight front-loading for motivation
    const progress = week / 6

    let weekWeight, weekReps

    if (category === 'bodyweight') {
      // For bodyweight, focus on rep progression
      weekWeight = startingWeight
      weekReps = Math.round(startingReps + (repsDiff * progress))
    } else {
      // For weighted, focus on weight with steady reps
      weekWeight = Math.round((startingWeight + (weightDiff * progress)) * 2) / 2
      // Reps stay constant until week 4, then can increase
      weekReps = week >= 4 ? Math.round(startingReps + (repsDiff * (week - 3) / 3)) : startingReps
    }

    weeks.push({
      week,
      targetWeight: weekWeight,
      targetReps: weekReps,
      // Deload week recommendation
      isDeloadWeek: week === 4,
      notes: week === 4 ? 'Deload week - reduce volume by 40%' : null
    })
  }

  return weeks
}

/**
 * Create a new goal for an exercise
 * @param {string} exerciseId
 * @param {number} startingWeight
 * @param {number} startingReps
 * @param {number} customTargetWeight - Optional custom target
 * @param {number} customTargetReps - Optional custom target
 * @param {string} fitnessLevel
 * @returns {Object} Complete goal object
 */
export const createExerciseGoal = (
  exerciseId,
  startingWeight,
  startingReps,
  customTargetWeight = null,
  customTargetReps = null,
  fitnessLevel = 'beginner'
) => {
  const exercise = GYM_EXERCISES[exerciseId]
  const category = getExerciseCategory(exerciseId)

  // Calculate suggested goal if no custom provided
  const suggested = calculateRealisticGoal(exerciseId, startingWeight, startingReps, fitnessLevel)

  const targetWeight = customTargetWeight ?? suggested.targetWeight
  const targetReps = customTargetReps ?? suggested.targetReps

  // Generate weekly targets
  const weeklyTargets = generateWeeklyTargets(
    startingWeight,
    targetWeight,
    startingReps,
    targetReps,
    category
  )

  const now = new Date()
  const targetDate = new Date(now)
  targetDate.setDate(targetDate.getDate() + 42) // 6 weeks

  return {
    exerciseId,
    exerciseName: exercise?.name || exerciseId,
    startDate: now.toISOString(),
    targetDate: targetDate.toISOString(),
    startingWeight,
    startingReps,
    targetWeight,
    targetReps,
    weeklyTargets,
    category,
    fitnessLevel,
    status: 'active', // 'active' | 'completed' | 'failed' | 'extended'
    currentWeek: 1,
    history: [], // Track actual performance
    adjustments: [], // Track any goal adjustments
    suggestedGoal: suggested // Keep original suggestion for reference
  }
}

/**
 * Get current week number for a goal
 * @param {Object} goal
 * @returns {number} Week number (1-6) or 7+ if past target
 */
export const getCurrentWeek = (goal) => {
  const start = new Date(goal.startDate)
  const now = new Date()
  const daysDiff = Math.floor((now - start) / (1000 * 60 * 60 * 24))
  const week = Math.floor(daysDiff / 7) + 1
  return Math.max(1, Math.min(week, 7)) // Cap at 7 for "past target"
}

/**
 * Get the target for the current week
 * @param {Object} goal
 * @returns {Object} { targetWeight, targetReps, week, isDeloadWeek }
 */
export const getCurrentTarget = (goal) => {
  const currentWeek = getCurrentWeek(goal)

  if (currentWeek > 6) {
    // Past 6 weeks - return final target
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
 * Record a workout result and analyze progress
 * @param {Object} goal
 * @param {number} actualWeight
 * @param {number} actualReps
 * @param {number} rpe - Rate of Perceived Exertion (1-10)
 * @returns {Object} Updated goal with analysis
 */
export const recordWorkoutResult = (goal, actualWeight, actualReps, rpe = null) => {
  const currentWeek = getCurrentWeek(goal)
  const target = getCurrentTarget(goal)

  const result = {
    date: new Date().toISOString(),
    week: currentWeek,
    targetWeight: target.targetWeight,
    targetReps: target.targetReps,
    actualWeight,
    actualReps,
    rpe,
    // Calculate performance vs target
    weightDiff: actualWeight - target.targetWeight,
    repsDiff: actualReps - target.targetReps
  }

  // Analyze performance
  const analysis = analyzePerformance(result, goal.category)
  result.analysis = analysis

  // Create updated goal
  const updatedGoal = {
    ...goal,
    currentWeek,
    history: [...goal.history, result],
    lastWorkout: result
  }

  // Check if goal is completed
  if (currentWeek >= 6 && actualWeight >= goal.targetWeight && actualReps >= goal.targetReps) {
    updatedGoal.status = 'completed'
    updatedGoal.completedDate = new Date().toISOString()
  }

  // Suggest adjustments if needed
  if (analysis.needsAdjustment) {
    updatedGoal.suggestedAdjustment = analysis.adjustment
  }

  return updatedGoal
}

/**
 * Analyze workout performance vs target
 * @param {Object} result
 * @param {string} category
 * @returns {Object} Analysis with recommendations
 */
export const analyzePerformance = (result, category) => {
  const { rpe } = result

  let status = 'on_track'
  let message = ''
  let needsAdjustment = false
  let adjustment = null

  // Calculate estimated 1RM performance
  const targetVolume = result.targetWeight * result.targetReps
  const actualVolume = result.actualWeight * result.actualReps
  const volumeDiff = ((actualVolume - targetVolume) / targetVolume) * 100

  if (volumeDiff >= 10) {
    // Significantly exceeded target
    status = 'ahead'
    message = 'Crushing it! You\'re ahead of schedule.'

    if (volumeDiff >= 20 && rpe && rpe < 8) {
      needsAdjustment = true
      adjustment = {
        type: 'increase',
        reason: 'Exceeding targets with low RPE',
        suggestedWeightIncrease: category === 'compound' ? 2.5 : 1.25
      }
    }
  } else if (volumeDiff >= -5) {
    // Within acceptable range
    status = 'on_track'
    message = 'Right on target! Keep it up.'
  } else if (volumeDiff >= -15) {
    // Slightly behind
    status = 'behind'
    message = 'Slightly behind target. Focus on recovery.'

    if (rpe && rpe >= 9) {
      needsAdjustment = true
      adjustment = {
        type: 'maintain',
        reason: 'High RPE - maintain current weight next session'
      }
    }
  } else {
    // Significantly behind
    status = 'struggling'
    message = 'Tough session. Consider a deload.'
    needsAdjustment = true
    adjustment = {
      type: 'deload',
      reason: 'Performance significantly below target',
      suggestedWeightDecrease: category === 'compound' ? 5 : 2.5
    }
  }

  return {
    status,
    message,
    volumeDiff: Math.round(volumeDiff),
    needsAdjustment,
    adjustment
  }
}

/**
 * Adjust goal based on performance
 * @param {Object} goal
 * @param {string} adjustmentType - 'increase' | 'decrease' | 'extend'
 * @param {number} amount - Weight adjustment in kg
 * @returns {Object} Updated goal
 */
export const adjustGoal = (goal, adjustmentType, amount = 0) => {
  const now = new Date()
  const currentWeek = getCurrentWeek(goal)

  let newTargetWeight = goal.targetWeight
  let newTargetReps = goal.targetReps
  let newStatus = goal.status
  let newTargetDate = goal.targetDate

  switch (adjustmentType) {
    case 'increase':
      newTargetWeight = goal.targetWeight + amount
      break
    case 'decrease':
      newTargetWeight = Math.max(goal.startingWeight, goal.targetWeight - amount)
      break
    case 'extend': {
      // Extend by 2 weeks
      const extendedDate = new Date(goal.targetDate)
      extendedDate.setDate(extendedDate.getDate() + 14)
      newTargetDate = extendedDate.toISOString()
      newStatus = 'extended'
      break
    }
  }

  // Regenerate weekly targets from current week
  const remainingWeeks = Math.max(1, 6 - currentWeek + 1)
  const currentWeight = goal.history.length > 0
    ? goal.history[goal.history.length - 1].actualWeight
    : goal.startingWeight

  // Only regenerate future weeks
  const newWeeklyTargets = [...goal.weeklyTargets]
  for (let i = currentWeek - 1; i < 6; i++) {
    const progress = (i - currentWeek + 2) / remainingWeeks
    newWeeklyTargets[i] = {
      week: i + 1,
      targetWeight: Math.round((currentWeight + (newTargetWeight - currentWeight) * progress) * 2) / 2,
      targetReps: newTargetReps,
      isDeloadWeek: i === 3,
      notes: i === 3 ? 'Deload week - reduce volume by 40%' : null
    }
  }

  return {
    ...goal,
    targetWeight: newTargetWeight,
    targetReps: newTargetReps,
    targetDate: newTargetDate,
    status: newStatus,
    weeklyTargets: newWeeklyTargets,
    adjustments: [
      ...goal.adjustments,
      {
        date: now.toISOString(),
        type: adjustmentType,
        amount,
        fromWeek: currentWeek,
        previousTarget: goal.targetWeight,
        newTarget: newTargetWeight
      }
    ]
  }
}

/**
 * Calculate overall progress percentage towards goal
 * @param {Object} goal
 * @returns {number} Progress percentage (0-100)
 */
export const calculateProgress = (goal) => {
  if (!goal.history || goal.history.length === 0) return 0

  const latestResult = goal.history[goal.history.length - 1]
  const weightProgress = goal.targetWeight > goal.startingWeight
    ? ((latestResult.actualWeight - goal.startingWeight) / (goal.targetWeight - goal.startingWeight)) * 100
    : 100
  const repsProgress = goal.targetReps > goal.startingReps
    ? ((latestResult.actualReps - goal.startingReps) / (goal.targetReps - goal.startingReps)) * 100
    : 100

  // Weight is typically more important for gym goals
  return Math.min(100, Math.round(weightProgress * 0.7 + repsProgress * 0.3))
}

/**
 * Check if it's time to set a new goal (past 6 weeks or completed)
 * @param {Object} goal
 * @returns {boolean}
 */
export const shouldSetNewGoal = (goal) => {
  if (goal.status === 'completed') return true

  const currentWeek = getCurrentWeek(goal)
  return currentWeek > 6
}

/**
 * Create a follow-up goal after completing the previous one
 * @param {Object} previousGoal
 * @param {string} fitnessLevel
 * @returns {Object} New goal
 */
export const createFollowUpGoal = (previousGoal, fitnessLevel = 'intermediate') => {
  // Use the actual achieved values as the new starting point
  const lastResult = previousGoal.history[previousGoal.history.length - 1]
  const newStartingWeight = lastResult?.actualWeight || previousGoal.targetWeight
  const newStartingReps = lastResult?.actualReps || previousGoal.targetReps

  return createExerciseGoal(
    previousGoal.exerciseId,
    newStartingWeight,
    newStartingReps,
    null, // Let system calculate new target
    null,
    fitnessLevel
  )
}

/**
 * Get a summary of all active goals
 * @param {Object} goals - { [exerciseId]: goal }
 * @returns {Object} Summary statistics
 */
export const getGoalsSummary = (goals) => {
  const goalArray = Object.values(goals || {})

  const active = goalArray.filter(g => g.status === 'active')
  const completed = goalArray.filter(g => g.status === 'completed')
  const needsAttention = goalArray.filter(g => g.suggestedAdjustment)

  const avgProgress = active.length > 0
    ? Math.round(active.reduce((sum, g) => sum + calculateProgress(g), 0) / active.length)
    : 0

  return {
    total: goalArray.length,
    active: active.length,
    completed: completed.length,
    needsAttention: needsAttention.length,
    averageProgress: avgProgress,
    // Find closest to completion
    closestToCompletion: active.sort((a, b) => calculateProgress(b) - calculateProgress(a))[0] || null
  }
}
