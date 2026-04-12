/**
 * Home Progression System
 * 6-week goal-based progression for bodyweight exercises
 */

// Final goals for each exercise (from CLAUDE.md)
const EXERCISE_FINAL_GOALS = {
  pushups: { reps: 100, unit: 'reps' },
  squats: { reps: 200, unit: 'reps' },
  pullups: { reps: 50, unit: 'reps' },
  dips: { reps: 50, unit: 'reps' },
  vups: { reps: 100, unit: 'reps' },
  glutebridge: { reps: 50, unit: 'reps/leg' },
  plank: { reps: 180, unit: 'seconds' },
  lunges: { reps: 50, unit: 'reps/leg' },
  supermans: { reps: 100, unit: 'reps' }
}

// Difficulty factors for different exercises
const EXERCISE_DIFFICULTY = {
  pushups: 1.0,
  squats: 0.8,      // Easier to progress
  pullups: 1.5,     // Harder to progress
  dips: 1.3,        // Harder to progress
  vups: 1.0,
  glutebridge: 0.9,
  plank: 1.0,       // Time-based
  lunges: 0.9,
  supermans: 0.8
}

// Typical starting points for beginners
const BEGINNER_STARTING_POINTS = {
  pushups: 10,
  squats: 20,
  pullups: 2,
  dips: 5,
  vups: 10,
  glutebridge: 10,
  plank: 30,      // seconds
  lunges: 10,
  supermans: 15
}

/**
 * Calculate a realistic 6-week goal based on assessment
 * @param {string} exerciseKey
 * @param {number} currentReps - From assessment
 * @param {string} fitnessLevel - 'beginner' | 'intermediate' | 'advanced'
 * @returns {Object} { targetReps, weeklyIncrease, isTimeBasedExercise }
 */
export const calculateRealisticGoal = (exerciseKey, currentReps, fitnessLevel = 'beginner') => {
  const finalGoal = EXERCISE_FINAL_GOALS[exerciseKey]
  const difficulty = EXERCISE_DIFFICULTY[exerciseKey] || 1.0

  if (!finalGoal) {
    // Default fallback
    return {
      targetReps: Math.round(currentReps * 1.5),
      weeklyIncrease: Math.round(currentReps * 0.08),
      isTimeBased: false
    }
  }

  const isTimeBased = finalGoal.unit === 'seconds'

  // Fitness level progression multipliers
  const levelMultiplier = {
    beginner: 1.3,      // 30% improvement in 6 weeks
    intermediate: 1.5,   // 50% improvement
    advanced: 1.25       // 25% improvement (diminishing returns)
  }[fitnessLevel] || 1.3

  // Calculate target based on current level and difficulty
  let targetReps

  if (currentReps <= 0) {
    // If assessment was 0 or skipped, use beginner starting point
    currentReps = BEGINNER_STARTING_POINTS[exerciseKey] || 10
    targetReps = Math.round(currentReps * levelMultiplier / difficulty)
  } else {
    // Calculate improvement based on current level
    const improvementFactor = levelMultiplier / difficulty

    // The closer to final goal, the slower the progress
    const distanceToFinal = finalGoal.reps - currentReps
    const progressRatio = Math.min(1, distanceToFinal / finalGoal.reps)

    targetReps = Math.round(currentReps * (1 + (improvementFactor - 1) * progressRatio))
  }

  // Cap at final goal
  targetReps = Math.min(targetReps, finalGoal.reps)

  // Calculate weekly increase
  const totalIncrease = targetReps - currentReps
  const weeklyIncrease = Math.round(totalIncrease / 6)

  return {
    targetReps,
    weeklyIncrease,
    totalIncrease,
    isTimeBased,
    unit: finalGoal.unit,
    finalGoal: finalGoal.reps,
    percentOfFinal: Math.round((targetReps / finalGoal.reps) * 100)
  }
}

/**
 * Generate weekly targets for a 6-week progression
 * @param {number} startingReps
 * @param {number} targetReps
 * @param {boolean} isTimeBased
 * @returns {Array} Weekly targets
 */
export const generateWeeklyTargets = (startingReps, targetReps, isTimeBased = false) => {
  const weeks = []
  const totalIncrease = targetReps - startingReps

  for (let week = 1; week <= 6; week++) {
    // Progressive loading with slight ease-in
    // Week 1-2: Slower start (40% of weekly rate)
    // Week 3-5: Normal rate
    // Week 6: Push to target
    let progress

    if (week <= 2) {
      progress = week * 0.12 // 12% each of first 2 weeks
    } else if (week <= 5) {
      progress = 0.24 + (week - 2) * 0.19 // 19% each for weeks 3-5
    } else {
      progress = 1.0 // Week 6 hits target
    }

    const weekReps = Math.round(startingReps + (totalIncrease * progress))

    weeks.push({
      week,
      targetReps: weekReps,
      // For time-based exercises, show as seconds
      targetDisplay: isTimeBased ? `${weekReps}s` : `${weekReps}`,
      // Recovery/deload recommendation
      isDeloadWeek: week === 4,
      notes: week === 4 ? 'Recovery week - reduce intensity by 20%' : null,
      // Motivation milestones
      milestone: getMilestone(weekReps, isTimeBased)
    })
  }

  return weeks
}

/**
 * Get milestone achievement for a given rep count
 * @param {number} reps
 * @param {boolean} isTimeBased
 * @returns {string|null}
 */
const getMilestone = (reps, isTimeBased) => {
  if (isTimeBased) {
    // Plank milestones
    if (reps >= 180) return '3 MINUTE PLANK MASTER!'
    if (reps >= 120) return '2 Minute Club!'
    if (reps >= 60) return '1 Minute Strong!'
    if (reps >= 30) return 'Solid Foundation!'
  } else {
    // Rep milestones
    if (reps >= 100) return 'CENTURY CLUB!'
    if (reps >= 50) return 'Half Century!'
    if (reps >= 25) return 'Quarter Century!'
    if (reps >= 10) return 'Double Digits!'
  }
  return null
}

/**
 * Create a new goal for a home exercise
 * @param {string} exerciseKey
 * @param {number} assessmentReps - From initial max effort test
 * @param {number} customTarget - Optional user-set target
 * @param {string} fitnessLevel
 * @returns {Object} Complete goal object
 */
export const createHomeExerciseGoal = (
  exerciseKey,
  assessmentReps,
  customTarget = null,
  fitnessLevel = 'beginner'
) => {
  const finalGoal = EXERCISE_FINAL_GOALS[exerciseKey]
  const isTimeBased = finalGoal?.unit === 'seconds'

  // Calculate suggested goal
  const suggested = calculateRealisticGoal(exerciseKey, assessmentReps, fitnessLevel)

  const targetReps = customTarget ?? suggested.targetReps

  // Generate weekly targets
  const weeklyTargets = generateWeeklyTargets(assessmentReps, targetReps, isTimeBased)

  const now = new Date()
  const targetDate = new Date(now)
  targetDate.setDate(targetDate.getDate() + 42) // 6 weeks

  return {
    exerciseKey,
    startDate: now.toISOString(),
    targetDate: targetDate.toISOString(),
    assessmentReps,
    targetReps,
    weeklyTargets,
    isTimeBased,
    unit: finalGoal?.unit || 'reps',
    finalGoal: finalGoal?.reps,
    fitnessLevel,
    status: 'active', // 'active' | 'completed' | 'failed' | 'extended'
    currentWeek: 1,
    history: [], // Track actual performance
    suggestedGoal: suggested,
    // Track best performance
    personalBest: assessmentReps,
    personalBestDate: now.toISOString()
  }
}

/**
 * Get current week number for a goal
 * @param {Object} goal
 * @returns {number} Week number (1-6)
 */
export const getCurrentWeek = (goal) => {
  const start = new Date(goal.startDate)
  const now = new Date()
  const daysDiff = Math.floor((now - start) / (1000 * 60 * 60 * 24))
  const week = Math.floor(daysDiff / 7) + 1
  return Math.max(1, Math.min(week, 7))
}

/**
 * Get the target for the current week
 * @param {Object} goal
 * @returns {Object} Weekly target
 */
export const getCurrentTarget = (goal) => {
  const currentWeek = getCurrentWeek(goal)

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
 * Record a workout result and analyze progress
 * @param {Object} goal
 * @param {number} actualReps - What user achieved
 * @param {number} sets - Number of sets performed
 * @returns {Object} Updated goal with analysis
 */
export const recordWorkoutResult = (goal, actualReps, sets = 1) => {
  const currentWeek = getCurrentWeek(goal)
  const target = getCurrentTarget(goal)

  const result = {
    date: new Date().toISOString(),
    week: currentWeek,
    targetReps: target.targetReps,
    actualReps,
    sets,
    repsDiff: actualReps - target.targetReps
  }

  // Analyze performance
  const analysis = analyzePerformance(result, goal)
  result.analysis = analysis

  // Update personal best
  let newPersonalBest = goal.personalBest
  let newPersonalBestDate = goal.personalBestDate
  let isNewPR = false

  if (actualReps > goal.personalBest) {
    newPersonalBest = actualReps
    newPersonalBestDate = result.date
    isNewPR = true
    result.isNewPR = true
  }

  // Create updated goal
  const updatedGoal = {
    ...goal,
    currentWeek,
    history: [...goal.history, result],
    lastWorkout: result,
    personalBest: newPersonalBest,
    personalBestDate: newPersonalBestDate
  }

  // Check if goal is completed
  if (actualReps >= goal.targetReps) {
    updatedGoal.status = 'completed'
    updatedGoal.completedDate = new Date().toISOString()
  }

  // Suggest adjustments if needed
  if (analysis.needsAdjustment) {
    updatedGoal.suggestedAdjustment = analysis.adjustment
  }

  return {
    updatedGoal,
    isNewPR,
    analysis
  }
}

/**
 * Analyze workout performance
 * @param {Object} result
 * @param {Object} goal
 * @returns {Object} Analysis
 */
export const analyzePerformance = (result, goal) => {
  const { repsDiff, targetReps, actualReps } = result
  const percentDiff = targetReps > 0 ? (repsDiff / targetReps) * 100 : 0

  let status = 'on_track'
  let message = ''
  let needsAdjustment = false
  let adjustment = null

  if (percentDiff >= 20) {
    status = 'ahead'
    message = 'Exceptional! You\'re crushing this goal!'
    needsAdjustment = true
    adjustment = {
      type: 'increase',
      reason: 'Significantly exceeding targets',
      suggestedNewTarget: Math.round(goal.targetReps * 1.15)
    }
  } else if (percentDiff >= 5) {
    status = 'ahead'
    message = 'Great work! Ahead of schedule.'
  } else if (percentDiff >= -10) {
    status = 'on_track'
    message = 'Right on target! Keep pushing.'
  } else if (percentDiff >= -25) {
    status = 'behind'
    message = 'Slightly behind. Focus on consistency.'
  } else {
    status = 'struggling'
    message = 'Tough day. Rest and recover.'
    needsAdjustment = true
    adjustment = {
      type: 'decrease',
      reason: 'Performance significantly below target',
      suggestedNewTarget: Math.round(goal.targetReps * 0.85)
    }
  }

  // Check for milestone achievement
  const weeklyTarget = goal.weeklyTargets.find(w => w.week === result.week)
  const milestone = weeklyTarget?.milestone
  const achievedMilestone = getMilestone(actualReps, goal.isTimeBased)

  return {
    status,
    message,
    percentDiff: Math.round(percentDiff),
    needsAdjustment,
    adjustment,
    milestone: achievedMilestone,
    weeklyMilestone: milestone
  }
}

/**
 * Adjust goal based on performance
 * @param {Object} goal
 * @param {string} adjustmentType - 'increase' | 'decrease' | 'extend'
 * @param {number} newTarget - Optional new target reps
 * @returns {Object} Updated goal
 */
export const adjustGoal = (goal, adjustmentType, newTarget = null) => {
  const currentWeek = getCurrentWeek(goal)
  const currentReps = goal.history.length > 0
    ? goal.history[goal.history.length - 1].actualReps
    : goal.assessmentReps

  let newTargetReps = goal.targetReps
  let newTargetDate = goal.targetDate
  let newStatus = goal.status

  switch (adjustmentType) {
    case 'increase':
      newTargetReps = newTarget || Math.round(goal.targetReps * 1.15)
      break
    case 'decrease':
      newTargetReps = newTarget || Math.round(goal.targetReps * 0.85)
      newTargetReps = Math.max(currentReps + 5, newTargetReps) // At least 5 more than current
      break
    case 'extend': {
      const extendedDate = new Date(goal.targetDate)
      extendedDate.setDate(extendedDate.getDate() + 14) // 2 more weeks
      newTargetDate = extendedDate.toISOString()
      newStatus = 'extended'
      break
    }
  }

  // Regenerate remaining weekly targets
  const newWeeklyTargets = generateWeeklyTargets(
    currentReps,
    newTargetReps,
    goal.isTimeBased
  )

  // Merge existing completed weeks with new targets
  const mergedTargets = goal.weeklyTargets.map((original, i) => {
    if (i < currentWeek - 1) {
      return original // Keep completed weeks
    }
    return {
      ...newWeeklyTargets[i - currentWeek + 1] || original,
      week: i + 1
    }
  })

  return {
    ...goal,
    targetReps: newTargetReps,
    targetDate: newTargetDate,
    status: newStatus,
    weeklyTargets: mergedTargets,
    adjustments: [
      ...(goal.adjustments || []),
      {
        date: new Date().toISOString(),
        type: adjustmentType,
        fromWeek: currentWeek,
        previousTarget: goal.targetReps,
        newTarget: newTargetReps
      }
    ]
  }
}

/**
 * Calculate progress percentage
 * @param {Object} goal
 * @returns {number} 0-100
 */
export const calculateProgress = (goal) => {
  if (!goal.history || goal.history.length === 0) return 0

  const latestReps = goal.history[goal.history.length - 1].actualReps
  const totalImprovement = goal.targetReps - goal.assessmentReps

  if (totalImprovement <= 0) return 100

  const currentImprovement = latestReps - goal.assessmentReps
  return Math.min(100, Math.max(0, Math.round((currentImprovement / totalImprovement) * 100)))
}

/**
 * Check if goal needs renewal
 * @param {Object} goal
 * @returns {boolean}
 */
export const shouldSetNewGoal = (goal) => {
  if (goal.status === 'completed') return true
  return getCurrentWeek(goal) > 6
}

/**
 * Create follow-up goal after completion
 * @param {Object} previousGoal
 * @param {string} fitnessLevel
 * @returns {Object} New goal
 */
export const createFollowUpGoal = (previousGoal, fitnessLevel = 'intermediate') => {
  const lastResult = previousGoal.history[previousGoal.history.length - 1]
  const newStartingReps = lastResult?.actualReps || previousGoal.targetReps

  return createHomeExerciseGoal(
    previousGoal.exerciseKey,
    newStartingReps,
    null,
    fitnessLevel
  )
}

/**
 * Get summary of all home goals
 * @param {Object} goals - { [exerciseKey]: goal }
 * @returns {Object} Summary
 */
export const getHomeGoalsSummary = (goals) => {
  const goalArray = Object.values(goals || {})

  const active = goalArray.filter(g => g.status === 'active')
  const completed = goalArray.filter(g => g.status === 'completed')

  const avgProgress = active.length > 0
    ? Math.round(active.reduce((sum, g) => sum + calculateProgress(g), 0) / active.length)
    : 0

  // Calculate total improvement across all exercises
  const totalStarting = goalArray.reduce((sum, g) => sum + (g.assessmentReps || 0), 0)
  const totalCurrent = goalArray.reduce((sum, g) => {
    const latest = g.history?.[g.history.length - 1]
    return sum + (latest?.actualReps || g.assessmentReps || 0)
  }, 0)

  return {
    total: goalArray.length,
    active: active.length,
    completed: completed.length,
    averageProgress: avgProgress,
    totalImprovement: totalCurrent - totalStarting,
    exercisesNearGoal: active.filter(g => calculateProgress(g) >= 80).length
  }
}

/**
 * Get formatted display for a goal
 * @param {Object} goal
 * @returns {Object} Display-ready data
 */
export const getGoalDisplay = (goal) => {
  const currentWeek = getCurrentWeek(goal)
  const target = getCurrentTarget(goal)
  const progress = calculateProgress(goal)

  const daysRemaining = Math.max(0, Math.ceil(
    (new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24)
  ))

  return {
    currentWeek,
    weekTarget: target.targetReps,
    weekTargetDisplay: goal.isTimeBased ? `${target.targetReps}s` : target.targetReps,
    finalTarget: goal.targetReps,
    finalTargetDisplay: goal.isTimeBased ? `${goal.targetReps}s` : goal.targetReps,
    progress,
    daysRemaining,
    weeksRemaining: Math.max(0, 6 - currentWeek + 1),
    isDeloadWeek: target.isDeloadWeek,
    milestone: target.milestone,
    status: goal.status,
    personalBest: goal.personalBest,
    unit: goal.unit
  }
}
