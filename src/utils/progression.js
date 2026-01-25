/**
 * Intelligent 6-Week Sprint Progression System
 *
 * Automatically generates and adjusts workout progressions based on user performance.
 * Challenges users appropriately while preventing demotivation from failed workouts.
 */

import { EXERCISE_METADATA } from './programGenerator.js'

// ============================================================
// CONSTANTS
// ============================================================

export const PERFORMANCE_CATEGORIES = {
  STRUGGLING: 'struggling',
  BELOW_TARGET: 'below_target',
  ON_TRACK: 'on_track',
  EXCEEDING: 'exceeding',
  CRUSHING: 'crushing',
}

export const SPRINT_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
}

export const WEEK_THEMES = {
  1: 'foundation',
  2: 'foundation',
  3: 'build',
  4: 'build',
  5: 'peak',
  6: 'test',
}

// Performance ratio thresholds
const THRESHOLDS = {
  STRUGGLING: 0.70,
  BELOW_TARGET: 0.85,
  ON_TRACK: 1.00,
  EXCEEDING: 1.15,
}

// Adjustment factors based on performance
const ADJUSTMENT_FACTORS = {
  [PERFORMANCE_CATEGORIES.STRUGGLING]: 0.80,
  [PERFORMANCE_CATEGORIES.BELOW_TARGET]: 0.92,
  [PERFORMANCE_CATEGORIES.ON_TRACK]: 1.00,
  [PERFORMANCE_CATEGORIES.EXCEEDING]: 1.08,
  [PERFORMANCE_CATEGORIES.CRUSHING]: 1.15,
}

// Messages for each performance category
export const PERFORMANCE_MESSAGES = {
  [PERFORMANCE_CATEGORIES.CRUSHING]: [
    'Beast mode activated!',
    'You are making this look easy!',
    'New challenge unlocked - leveling up!',
  ],
  [PERFORMANCE_CATEGORIES.EXCEEDING]: [
    'Ahead of schedule! Keep pushing!',
    'Your hard work is paying off!',
    'Impressive progress!',
  ],
  [PERFORMANCE_CATEGORIES.ON_TRACK]: [
    'Right on target. Consistency wins!',
    'Perfect execution!',
    'Trust the process - it is working!',
  ],
  [PERFORMANCE_CATEGORIES.BELOW_TARGET]: [
    'Everyone has off days. You showed up!',
    'Rest up and come back stronger!',
    'Small setback, big comeback coming!',
  ],
  [PERFORMANCE_CATEGORIES.STRUGGLING]: [
    'Showing up is half the battle!',
    'We are adjusting your plan for success',
    'Progress is not linear - keep going!',
  ],
}

// ============================================================
// SPRINT GENERATION
// ============================================================

/**
 * Calculate realistic improvement factor based on current level
 * @param {number} currentMax - Current max reps/seconds
 * @param {string} exerciseKey - Exercise identifier
 * @param {Object} exerciseData - Exercise metadata
 * @returns {number} Expected improvement factor (0.06 - 0.40)
 */
export function getImprovementFactor(currentMax, exerciseKey, exerciseData = null) {
  const metadata = exerciseData || EXERCISE_METADATA[exerciseKey] || {}
  const maxPotential = metadata.finalGoal || 100
  const progressPercent = currentMax / maxPotential

  // Diminishing returns as user approaches max potential
  if (progressPercent < 0.15) return 0.45  // Complete beginner: 45% gain
  if (progressPercent < 0.25) return 0.35  // Beginner: 35% gain
  if (progressPercent < 0.40) return 0.25  // Early intermediate: 25%
  if (progressPercent < 0.60) return 0.18  // Intermediate: 18%
  if (progressPercent < 0.75) return 0.12  // Late intermediate: 12%
  if (progressPercent < 0.85) return 0.08  // Advanced: 8%
  return 0.05                               // Near max: 5%
}

/**
 * Generate weekly targets with non-linear progression
 * @param {number} start - Starting max
 * @param {number} target - Target max
 * @param {number} weeks - Number of weeks (default 6)
 * @returns {number[]} Array of weekly target maxes
 */
export function generateWeeklyTargets(start, target, weeks = 6) {
  const targets = []
  const totalGain = target - start

  // Non-linear distribution: faster gains early, plateau later
  // Week 6 is test/deload week - same target as week 5
  const weeklyGainPercents = [0.18, 0.20, 0.22, 0.20, 0.15, 0.05]

  let cumulative = start
  for (let i = 0; i < weeks; i++) {
    const gainPercent = weeklyGainPercents[i] || 0.1
    cumulative += totalGain * gainPercent
    targets.push(Math.round(cumulative))
  }

  return targets
}

/**
 * Distribute total reps across sets in descending pyramid
 * @param {number} total - Total reps to distribute
 * @param {number} sets - Number of sets
 * @param {number[]} repRange - [min, max] rep range
 * @returns {number[]} Array of reps per set
 */
export function distributeReps(total, sets, repRange) {
  const [minRep, maxRep] = repRange
  const reps = []
  let remaining = Math.max(total, sets) // At minimum, 1 rep per set

  for (let i = 0; i < sets; i++) {
    const setsLeft = sets - i
    const avgNeeded = remaining / setsLeft

    // Descending pyramid: first sets get more
    const factor = 1 + (0.12 * (sets - 1 - i * 2) / Math.max(sets - 1, 1))
    let thisSet = Math.round(avgNeeded * factor)

    // Clamp to range
    thisSet = Math.max(minRep, Math.min(maxRep, thisSet))

    // Ensure we don't exceed remaining (but never go negative)
    thisSet = Math.min(thisSet, remaining - (minRep * (setsLeft - 1)))
    thisSet = Math.max(1, thisSet) // Ensure minimum of 1 rep per set

    reps.push(thisSet)
    remaining -= thisSet
  }

  // If we have leftover reps, add to last set (AMRAP style)
  if (remaining > 0 && reps.length > 0) {
    reps[reps.length - 1] += remaining
  }

  return reps
}

/**
 * Get rep scheme configuration based on training goal
 * @param {string} repScheme - 'strength' | 'hypertrophy' | 'endurance'
 * @returns {Object} Configuration with sets, repRange, restSeconds
 */
export function getRepSchemeConfig(repScheme) {
  const configs = {
    strength: { sets: 5, repRange: [3, 8], restSeconds: 120, volumeFactor: 0.7 },
    hypertrophy: { sets: 4, repRange: [8, 15], restSeconds: 90, volumeFactor: 1.0 },
    endurance: { sets: 3, repRange: [15, 30], restSeconds: 45, volumeFactor: 1.3 },
  }
  return configs[repScheme] || configs.hypertrophy
}

/**
 * Generate workouts for a single week
 * @param {number} weeklyMax - Target max for this week
 * @param {number} weekIndex - Week number (0-5)
 * @param {string} repScheme - Training goal
 * @param {number} daysPerWeek - Training days per week
 * @returns {Object} Week data with days array
 */
export function generateWeekWorkouts(weeklyMax, weekIndex, repScheme, daysPerWeek = 3) {
  const theme = WEEK_THEMES[weekIndex + 1] || 'build'
  const config = getRepSchemeConfig(repScheme)
  const days = []

  // Generate 3 workouts per week (or less if specified)
  const workoutsThisWeek = Math.min(daysPerWeek, 3)

  for (let d = 0; d < workoutsThisWeek; d++) {
    // Progressive intensity within week
    // Day 1: 82% - technique focus, easier
    // Day 2: 90% - building
    // Day 3: 100% - push limits
    const intensityFactors = [0.82, 0.90, 1.00]
    const intensityFactor = intensityFactors[d] || 1.0

    // Week 6 is test week - Day 3 is max test
    const isTestDay = weekIndex === 5 && d === workoutsThisWeek - 1

    if (isTestDay) {
      days.push({
        day: d + 1,
        id: `w${weekIndex + 1}d${d + 1}`,
        isTestDay: true,
        sets: 1,
        reps: [weeklyMax],
        total: weeklyMax,
        restSeconds: 180,
        theme: 'test',
        instructions: 'Max effort test - do as many reps as possible with good form',
      })
    } else {
      const targetTotal = Math.round(weeklyMax * intensityFactor * config.volumeFactor)
      const reps = distributeReps(targetTotal, config.sets, config.repRange)
      const actualTotal = reps.reduce((a, b) => a + b, 0)

      days.push({
        day: d + 1,
        id: `w${weekIndex + 1}d${d + 1}`,
        isTestDay: false,
        sets: config.sets,
        reps,
        total: actualTotal,
        restSeconds: config.restSeconds,
        theme,
      })
    }
  }

  return {
    week: weekIndex + 1,
    theme,
    targetMax: weeklyMax,
    days,
  }
}

/**
 * Generate a complete 6-week sprint for an exercise
 * @param {string} exerciseKey - Exercise identifier
 * @param {number} startingMax - Current max (from assessment or previous sprint)
 * @param {Object} preferences - User training preferences
 * @param {Object} exerciseData - Exercise metadata (optional)
 * @returns {Object} Complete sprint data
 */
export function generateSprint(exerciseKey, startingMax, preferences, exerciseData = null) {
  const {
    repScheme = 'hypertrophy',
    trainingDaysPerWeek = 3,
    programDuration = 6,
  } = preferences

  // Calculate realistic target
  const improvementFactor = getImprovementFactor(startingMax, exerciseKey, exerciseData)
  const targetMax = Math.round(startingMax * (1 + improvementFactor))

  // Generate weekly progression
  const weeklyTargets = generateWeeklyTargets(startingMax, targetMax, programDuration)

  // Generate daily workouts for each week
  const weeks = weeklyTargets.map((weekTarget, weekIndex) =>
    generateWeekWorkouts(weekTarget, weekIndex, repScheme, trainingDaysPerWeek)
  )

  return {
    id: `sprint_${exerciseKey}_${Date.now()}`,
    exerciseKey,
    status: SPRINT_STATUS.ACTIVE,
    createdAt: new Date().toISOString(),

    // Goals
    startingMax,
    targetMax,
    weeklyTargets,
    improvementFactor,

    // Progression plan
    weeks,

    // Tracking
    currentWeek: 0,
    currentDay: 0,
    completedWorkouts: 0,
    totalWorkouts: weeks.reduce((sum, w) => sum + w.days.length, 0),
    performanceHistory: [],
    adjustmentsMade: 0,
    averagePerformanceRatio: null,

    // Results (filled at completion)
    finalMax: null,
    actualImprovement: null,
    completedAt: null,
  }
}

// ============================================================
// PERFORMANCE ANALYSIS
// ============================================================

/**
 * Categorize performance based on ratio
 * @param {number} ratio - Actual/target ratio
 * @returns {string} Performance category
 */
export function categorizePerformance(ratio) {
  if (ratio < THRESHOLDS.STRUGGLING) return PERFORMANCE_CATEGORIES.STRUGGLING
  if (ratio < THRESHOLDS.BELOW_TARGET) return PERFORMANCE_CATEGORIES.BELOW_TARGET
  if (ratio <= THRESHOLDS.ON_TRACK) return PERFORMANCE_CATEGORIES.ON_TRACK
  if (ratio <= THRESHOLDS.EXCEEDING) return PERFORMANCE_CATEGORIES.EXCEEDING
  return PERFORMANCE_CATEGORIES.CRUSHING
}

/**
 * Analyze workout performance
 * @param {number[]} actualReps - Reps completed per set
 * @param {number[]} targetReps - Target reps per set
 * @param {number} amrapReps - Bonus AMRAP reps (optional)
 * @param {Object} feedback - User feedback { rpe: number, difficulty: string }
 * @returns {Object} Performance analysis
 */
export function analyzeWorkoutPerformance(actualReps, targetReps, amrapReps = 0, feedback = null) {
  const actualTotal = actualReps.reduce((a, b) => a + b, 0) + amrapReps
  const targetTotal = targetReps.reduce((a, b) => a + b, 0)

  const performanceRatio = targetTotal > 0 ? actualTotal / targetTotal : 1
  let category = categorizePerformance(performanceRatio)

  // Modulate based on RPE (Phase 2: RPE Integration)
  if (feedback?.rpe) {
    const { rpe } = feedback;
    if (rpe <= 4) { // Easy
      // Boost category if they found it easy (unless already crushing)
      if (category === PERFORMANCE_CATEGORIES.ON_TRACK) category = PERFORMANCE_CATEGORIES.EXCEEDING;
      else if (category === PERFORMANCE_CATEGORIES.BELOW_TARGET) category = PERFORMANCE_CATEGORIES.ON_TRACK;
    } else if (rpe >= 9) { // Hard/Max
      // Dampen category if they struggled (safety brake)
      // Even if they hit the numbers, if it was a 10/10 grind, don't accelerate too hard
      if (category === PERFORMANCE_CATEGORIES.CRUSHING) category = PERFORMANCE_CATEGORIES.EXCEEDING;
      else if (category === PERFORMANCE_CATEGORIES.EXCEEDING) category = PERFORMANCE_CATEGORIES.ON_TRACK;
    }
  }

  // Set completion analysis
  const setsCompleted = actualReps.filter((actual, i) => actual >= (targetReps[i] || 0)).length
  const completionRate = targetReps.length > 0 ? setsCompleted / targetReps.length : 1

  return {
    actualTotal,
    targetTotal,
    performanceRatio: Math.round(performanceRatio * 100) / 100,
    category,
    completionRate,
    setsCompleted,
    totalSets: targetReps.length,
    adjustment: getAdjustment(category),
    rpe: feedback?.rpe // Store RPE in analysis
  }
}

/**
 * Get adjustment recommendation based on performance category
 * @param {string} category - Performance category
 * @returns {Object} Adjustment factor and message
 */
export function getAdjustment(category) {
  const factor = ADJUSTMENT_FACTORS[category] || 1.0
  const messages = PERFORMANCE_MESSAGES[category] || ['Keep going!']
  const message = messages[Math.floor(Math.random() * messages.length)]

  return {
    factor,
    message,
    shouldAdjust: factor !== 1.0,
  }
}

/**
 * Smooth adjustment using weighted average of recent performances
 * Prevents overreaction to single bad/good days
 * @param {Object[]} recentPerformances - Last few performance records
 * @param {Object} newPerformance - Latest performance
 * @returns {number} Smoothed performance ratio
 */
export function smoothPerformanceRatio(recentPerformances, newPerformance) {
  // Weights: most recent = highest weight (applied from end)
  const weights = [0.20, 0.30, 0.50]
  const performances = [...recentPerformances.slice(-2), newPerformance]

  if (performances.length < 2) {
    // Not enough data, use raw performance with slight dampening
    return newPerformance.performanceRatio * 0.9 + 0.1
  }

  let weightedSum = 0
  let weightSum = 0

  // Apply weights from start, with array ordered oldest to newest
  // weights[0]=0.20 -> oldest, weights[2]=0.50 -> newest
  performances.forEach((p, i) => {
    const weight = weights[i] || 0.1
    weightedSum += (p.performanceRatio || 1) * weight
    weightSum += weight
  })

  return weightedSum / weightSum
}

// ============================================================
// SPRINT ADJUSTMENT
// ============================================================

/**
 * Recalculate remaining sprint based on performance
 * @param {Object} sprint - Current sprint data
 * @param {Object} performance - Latest performance analysis
 * @returns {Object} Updated sprint data
 */
export function recalculateSprint(sprint, performance) {
  const { factor, shouldAdjust } = performance.adjustment

  if (!shouldAdjust) {
    // Just record performance, no adjustments needed
    return {
      ...sprint,
      performanceHistory: [...sprint.performanceHistory, performance],
      averagePerformanceRatio: calculateAverageRatio(sprint.performanceHistory, performance),
    }
  }

  const { currentWeek } = sprint

  // Adjust remaining weeks only
  const adjustedWeeks = sprint.weeks.map((weekData, weekIndex) => {
    if (weekIndex <= currentWeek) {
      return weekData // Don't modify past weeks
    }

    return {
      ...weekData,
      targetMax: Math.round(weekData.targetMax * factor),
      days: weekData.days.map(day => ({
        ...day,
        reps: day.reps.map(r => Math.max(1, Math.round(r * factor))),
        total: Math.round(day.total * factor),
      })),
    }
  })

  // Adjust final target
  const newTargetMax = Math.round(sprint.targetMax * factor)

  return {
    ...sprint,
    targetMax: newTargetMax,
    weeks: adjustedWeeks,
    weeklyTargets: sprint.weeklyTargets.map((t, i) =>
      i > currentWeek ? Math.round(t * factor) : t
    ),
    adjustmentsMade: sprint.adjustmentsMade + 1,
    lastAdjustment: {
      date: new Date().toISOString(),
      reason: performance.adjustment.message,
      factor,
      fromWeek: currentWeek + 1,
    },
    performanceHistory: [...sprint.performanceHistory, performance],
    averagePerformanceRatio: calculateAverageRatio(sprint.performanceHistory, performance),
  }
}

/**
 * Calculate average performance ratio
 */
function calculateAverageRatio(history, newPerformance) {
  const all = [...history, newPerformance]
  if (all.length === 0) return null
  const sum = all.reduce((s, p) => s + (p.performanceRatio || 1), 0)
  return Math.round((sum / all.length) * 100) / 100
}

/**
 * Advance sprint to next workout
 * @param {Object} sprint - Current sprint
 * @returns {Object} Updated sprint with advanced position
 */
export function advanceSprint(sprint) {
  let { currentWeek, currentDay } = sprint
  const currentWeekData = sprint.weeks[currentWeek]

  if (!currentWeekData) {
    return { ...sprint, status: SPRINT_STATUS.COMPLETED }
  }

  currentDay++

  // Move to next week if needed
  if (currentDay >= currentWeekData.days.length) {
    currentDay = 0
    currentWeek++
  }

  // Check if sprint is complete
  if (currentWeek >= sprint.weeks.length) {
    return {
      ...sprint,
      status: SPRINT_STATUS.COMPLETED,
      completedAt: new Date().toISOString(),
    }
  }

  return {
    ...sprint,
    currentWeek,
    currentDay,
    completedWorkouts: sprint.completedWorkouts + 1,
  }
}

/**
 * Get current workout from sprint
 * @param {Object} sprint - Sprint data
 * @returns {Object|null} Current workout or null if complete
 */
export function getCurrentWorkout(sprint) {
  if (sprint.status !== SPRINT_STATUS.ACTIVE) return null

  const { currentWeek, currentDay } = sprint
  const weekData = sprint.weeks[currentWeek]

  if (!weekData) return null

  const dayData = weekData.days[currentDay]
  if (!dayData) return null

  return {
    ...dayData,
    weekNumber: currentWeek + 1,
    dayNumber: currentDay + 1,
    weekTheme: weekData.theme,
    weekTargetMax: weekData.targetMax,
    isLastWorkout: currentWeek === sprint.weeks.length - 1 &&
      currentDay === weekData.days.length - 1,
  }
}

// ============================================================
// SPRINT COMPLETION & NEW SPRINT
// ============================================================

/**
 * Complete a sprint and generate summary
 * @param {Object} sprint - Completed sprint
 * @param {number} finalTestResult - Result from final max test
 * @returns {Object} Sprint summary
 */
export function completeSprint(sprint, finalTestResult) {
  const improvement = finalTestResult - sprint.startingMax
  const improvementPercent = Math.round((improvement / sprint.startingMax) * 100)
  const goalAchieved = finalTestResult >= sprint.targetMax

  return {
    ...sprint,
    status: SPRINT_STATUS.COMPLETED,
    completedAt: new Date().toISOString(),
    finalMax: finalTestResult,
    actualImprovement: improvement,
    actualImprovementPercent: improvementPercent,
    goalAchieved,
    summary: {
      startingMax: sprint.startingMax,
      targetMax: sprint.targetMax,
      finalMax: finalTestResult,
      improvement,
      improvementPercent,
      goalAchieved,
      workoutsCompleted: sprint.completedWorkouts,
      averagePerformance: sprint.averagePerformanceRatio,
      adjustmentsMade: sprint.adjustmentsMade,
    },
  }
}

/**
 * Generate next sprint based on previous results
 * @param {Object} previousSprint - Completed sprint
 * @param {Object} preferences - User preferences
 * @param {Object} exerciseData - Exercise metadata
 * @returns {Object} New sprint
 */
export function generateNextSprint(previousSprint, preferences, exerciseData = null) {
  const { finalMax, exerciseKey, averagePerformanceRatio } = previousSprint

  // Use final max as new starting point
  const newStartingMax = finalMax || previousSprint.targetMax

  // Adjust improvement expectations based on past performance
  let adjustmentMultiplier = 1.0
  if (averagePerformanceRatio) {
    if (averagePerformanceRatio > 1.1) {
      adjustmentMultiplier = 1.15 // User was crushing it, aim higher
    } else if (averagePerformanceRatio < 0.85) {
      adjustmentMultiplier = 0.85 // User struggled, be more conservative
    }
  }

  // Generate new sprint with adjusted expectations
  const newSprint = generateSprint(exerciseKey, newStartingMax, preferences, exerciseData)

  // Apply adjustment multiplier to target
  newSprint.targetMax = Math.round(newSprint.targetMax * adjustmentMultiplier)
  newSprint.weeklyTargets = newSprint.weeklyTargets.map(t =>
    Math.round(t * adjustmentMultiplier)
  )

  // Regenerate weeks with adjusted targets
  newSprint.weeks = newSprint.weeklyTargets.map((weekTarget, weekIndex) =>
    generateWeekWorkouts(weekTarget, weekIndex, preferences.repScheme, preferences.trainingDaysPerWeek)
  )

  newSprint.previousSprintId = previousSprint.id

  return newSprint
}

// ============================================================
// PLATEAU DETECTION (Phase 4)
// ============================================================

/**
 * Check for plateau or stagnation
 * @param {Object} sprint - Current sprint data
 * @returns {Object|null} Intervention recommendation or null
 */
export function detectPlateau(sprint) {
  if (!sprint || sprint.performanceHistory.length < 3) return null;

  // Check last 3 sessions
  const recent = sprint.performanceHistory.slice(-3);

  // Count bad sessions (STRUGGLING or BELOW_TARGET)
  const struggles = recent.filter(p =>
    p.category === PERFORMANCE_CATEGORIES.STRUGGLING ||
    p.category === PERFORMANCE_CATEGORIES.BELOW_TARGET
  ).length;

  if (struggles >= 3) {
    // 3 strikes: suggest reset
    return {
      type: 'deload',
      reason: 'multiple_fails',
      message: 'It looks like you have hit a plateau on this exercise.',
      suggestion: 'We recommend a "Deload": reducing the weight by 10% to let your body recover and rebuild momentum.',
      actionLabel: 'Apply Deload & Reset',
      apply: (s) => {
        // Create a new sprint with lowered max
        const deloadMax = Math.round(s.startingMax * 0.9);
        return {
          ...s,
          status: SPRINT_STATUS.COMPLETED, // Close old sprint
          nextSprintParams: { // Params for generating next
            startingMax: deloadMax,
            isDeload: true
          }
        };
      }
    };
  }

  return null;
}

// ============================================================
// PROGRESS METRICS
// ============================================================

/**
 * Calculate sprint progress metrics for UI
 * @param {Object} sprint - Current sprint
 * @returns {Object} Progress metrics
 */
export function getSprintProgress(sprint) {
  if (!sprint) return null

  const { currentWeek, currentDay, weeks, completedWorkouts, totalWorkouts } = sprint

  const percentComplete = Math.round((completedWorkouts / totalWorkouts) * 100)
  const workoutsRemaining = totalWorkouts - completedWorkouts

  // Performance trend
  const recentPerformances = sprint.performanceHistory.slice(-5)
  let trend = 'stable'
  if (recentPerformances.length >= 3) {
    const recent = recentPerformances.slice(-3)
    const avgRecent = recent.reduce((s, p) => s + p.performanceRatio, 0) / recent.length
    if (avgRecent > 1.05) trend = 'up'
    else if (avgRecent < 0.90) trend = 'down'
  }

  // Projection
  const avgRatio = sprint.averagePerformanceRatio || 1
  const estimatedFinalMax = Math.round(sprint.targetMax * avgRatio)

  return {
    currentWeek: currentWeek + 1,
    currentDay: currentDay + 1,
    totalWeeks: weeks.length,
    completedWorkouts,
    workoutsRemaining,
    percentComplete,
    trend,
    trendMessage: getTrendMessage(trend, avgRatio),
    projection: {
      estimatedFinalMax,
      originalTarget: sprint.targetMax,
      onTrackForGoal: estimatedFinalMax >= sprint.targetMax,
    },
  }
}

function getTrendMessage(trend, avgRatio) {
  if (trend === 'up') {
    const percent = Math.round((avgRatio - 1) * 100)
    return `You are ${percent}% ahead of schedule!`
  }
  if (trend === 'down') {
    return 'We are adjusting to get you back on track'
  }
  return 'Right on target - keep it up!'
}

// ============================================================
// STORAGE HELPERS
// ============================================================

const STORAGE_KEY = 'shift6_sprints'

/**
 * Load all sprints from storage
 * @returns {Object} Sprints by exercise key
 */
export function loadSprints() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

/**
 * Save sprints to storage
 * @param {Object} sprints - Sprints data
 */
export function saveSprints(sprints) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sprints))
  } catch (e) {
    console.error('Failed to save sprints:', e)
  }
}

/**
 * Get active sprint for an exercise
 * @param {Object} sprints - All sprints
 * @param {string} exerciseKey - Exercise identifier
 * @returns {Object|null} Active sprint or null
 */
export function getActiveSprint(sprints, exerciseKey) {
  const exerciseSprints = Object.values(sprints).filter(s => s.exerciseKey === exerciseKey)
  return exerciseSprints.find(s => s.status === SPRINT_STATUS.ACTIVE) || null
}

/**
 * Get or create sprint for an exercise
 * @param {Object} sprints - All sprints
 * @param {string} exerciseKey - Exercise identifier
 * @param {number} startingMax - Starting max if creating new
 * @param {Object} preferences - User preferences
 * @param {Object} exerciseData - Exercise metadata
 * @returns {Object} Sprint (existing or new)
 */
export function getOrCreateSprint(sprints, exerciseKey, startingMax, preferences, exerciseData = null) {
  const existing = getActiveSprint(sprints, exerciseKey)
  if (existing) return existing

  return generateSprint(exerciseKey, startingMax, preferences, exerciseData)
}
