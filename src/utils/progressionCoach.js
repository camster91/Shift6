/**
 * Progression Coach - Smart training progression guidance
 *
 * Provides realistic progression recommendations like a personal trainer:
 * - Caps weekly increases at 5-10% (vs unrealistic 20-30%)
 * - Suggests weight increases based on RPE and rep performance
 * - Tracks and celebrates PRs
 * - Detects overtraining and suggests deloads
 */

import { STORAGE_PREFIX } from './constants'

// ============================================
// CONFIGURATION
// ============================================

export const PROGRESSION_CONFIG = {
  // Weekly increase caps (realistic vs original aggressive)
  maxWeeklyIncreasePercent: 10, // Cap at 10% weekly (was 20-30%)
  minWeeklyIncreasePercent: 5,  // Minimum 5% to ensure progress

  // Weight progression thresholds
  rpeThresholdForIncrease: 7,   // If RPE < 7, suggest weight increase
  rpeThresholdForDecrease: 9,   // If RPE > 9, suggest weight decrease

  // Rep performance thresholds
  repOvershootPercent: 20,      // If exceeded target by 20%+, suggest increase
  repUndershootPercent: 20,     // If under target by 20%+, suggest decrease

  // Deload detection
  consecutiveHardSessions: 3,   // Sessions with RPE >= 9 before suggesting deload
  deloadReductionPercent: 40,   // Reduce volume by 40% during deload
  weeksBeforeDeload: 4,         // Suggest deload every 4 weeks of hard training

  // PR celebration
  prCelebrationDuration: 3000,  // How long to show PR celebration (ms)
}

// ============================================
// PR TRACKING AND CELEBRATION
// ============================================

/**
 * Check if a workout result is a new personal record
 * @param {string} exerciseKey - Exercise identifier
 * @param {number} volume - Total volume achieved
 * @param {Object} prs - Current PR records { exerciseKey: { volume, date, weight? } }
 * @returns {Object} { isNewPR, previousPR, improvement }
 */
export const checkForNewPR = (exerciseKey, volume, prs = {}) => {
  const currentPR = prs[exerciseKey]

  if (!currentPR || !currentPR.volume) {
    return {
      isNewPR: volume > 0,
      previousPR: null,
      improvement: null,
      message: volume > 0 ? 'First workout recorded!' : null
    }
  }

  const isNewPR = volume > currentPR.volume
  const improvement = isNewPR ? volume - currentPR.volume : 0
  const improvementPercent = isNewPR ? Math.round((improvement / currentPR.volume) * 100) : 0

  return {
    isNewPR,
    previousPR: currentPR.volume,
    improvement,
    improvementPercent,
    message: isNewPR
      ? `New PR! +${improvement} (${improvementPercent}% improvement)`
      : null
  }
}

/**
 * Check for weight-based PR (gym mode)
 * @param {string} exerciseKey - Exercise identifier
 * @param {number} weight - Weight used (in kg)
 * @param {number} reps - Reps completed
 * @param {Object} gymPRs - Current gym PRs
 * @returns {Object} PR check result
 */
export const checkForGymPR = (exerciseKey, weight, reps, gymPRs = {}) => {
  const currentPR = gymPRs[exerciseKey]

  // Calculate estimated 1RM using Epley formula: weight × (1 + reps/30)
  const estimated1RM = weight * (1 + reps / 30)

  if (!currentPR) {
    return {
      isNewPR: true,
      type: 'first',
      estimated1RM: Math.round(estimated1RM),
      message: 'First lift recorded!'
    }
  }

  const previous1RM = currentPR.weight * (1 + currentPR.reps / 30)
  const isNewPR = estimated1RM > previous1RM

  // Also check for rep PR at same weight
  const isRepPR = weight >= currentPR.weight && reps > currentPR.reps
  // And weight PR at same or higher reps
  const isWeightPR = weight > currentPR.weight && reps >= currentPR.reps

  return {
    isNewPR: isNewPR || isRepPR || isWeightPR,
    type: isWeightPR ? 'weight' : isRepPR ? 'reps' : isNewPR ? 'estimated1rm' : null,
    estimated1RM: Math.round(estimated1RM),
    previous1RM: Math.round(previous1RM),
    improvement: isNewPR ? Math.round(estimated1RM - previous1RM) : 0,
    message: isWeightPR
      ? `Weight PR! ${weight}kg for ${reps} reps!`
      : isRepPR
        ? `Rep PR! ${reps} reps at ${weight}kg!`
        : isNewPR
          ? `New estimated 1RM: ${Math.round(estimated1RM)}kg!`
          : null
  }
}

/**
 * Save a new PR to localStorage
 * @param {string} exerciseKey - Exercise identifier
 * @param {Object} prData - { volume, date, weight?, reps?, type }
 * @param {boolean} isGym - Whether this is a gym exercise
 */
export const savePR = (exerciseKey, prData, isGym = false) => {
  const storageKey = isGym
    ? `${STORAGE_PREFIX}gym_prs`
    : `${STORAGE_PREFIX}home_prs`

  const prs = JSON.parse(localStorage.getItem(storageKey) || '{}')

  prs[exerciseKey] = {
    ...prData,
    date: new Date().toISOString()
  }

  localStorage.setItem(storageKey, JSON.stringify(prs))

  // Also save to PR history for trends
  const historyKey = `${STORAGE_PREFIX}pr_history`
  const history = JSON.parse(localStorage.getItem(historyKey) || '[]')
  history.push({
    exerciseKey,
    ...prData,
    isGym,
    date: new Date().toISOString()
  })
  // Keep last 100 PRs
  if (history.length > 100) history.shift()
  localStorage.setItem(historyKey, JSON.stringify(history))
}

/**
 * Get all PRs for display
 * @returns {Object} { home: {}, gym: {}, history: [] }
 */
export const getAllPRs = () => {
  return {
    home: JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}home_prs`) || '{}'),
    gym: JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}gym_prs`) || '{}'),
    history: JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}pr_history`) || '[]')
  }
}

// ============================================
// WEIGHT PROGRESSION SUGGESTIONS (GYM MODE)
// ============================================

/**
 * Get weight progression suggestion based on performance
 * @param {Object} params - Performance parameters
 * @param {number} params.targetReps - Target reps for the set
 * @param {number} params.actualReps - Actual reps completed
 * @param {number} params.rpe - Rate of Perceived Exertion (1-10)
 * @param {number} params.currentWeight - Current weight in kg
 * @param {number} params.weightIncrement - Weight increment for this exercise
 * @param {Array} params.recentSessions - Last 3-5 sessions for this exercise
 * @returns {Object} { action, newWeight, reason, confidence }
 */
export const getWeightSuggestion = ({
  targetReps,
  actualReps,
  rpe,
  currentWeight,
  weightIncrement = 2.5,
  recentSessions = []
}) => {
  const config = PROGRESSION_CONFIG

  // Calculate rep performance
  const repDiff = actualReps - targetReps
  const repDiffPercent = (repDiff / targetReps) * 100

  // Analyze recent trend
  const recentRPEs = recentSessions.slice(-3).map(s => s.rpe || 7)
  const avgRecentRPE = recentRPEs.length > 0
    ? recentRPEs.reduce((a, b) => a + b, 0) / recentRPEs.length
    : 7

  // Check for consecutive hard sessions (potential overtraining)
  const hardSessionCount = recentRPEs.filter(r => r >= 9).length

  // Decision logic
  let action = 'maintain'
  let newWeight = currentWeight
  let reason = ''
  let confidence = 'medium'

  // Priority 1: Check for overtraining
  if (hardSessionCount >= config.consecutiveHardSessions) {
    action = 'deload'
    newWeight = Math.round((currentWeight * (1 - config.deloadReductionPercent / 100)) / weightIncrement) * weightIncrement
    reason = `${hardSessionCount} hard sessions in a row. Time for a deload week!`
    confidence = 'high'
  }
  // Priority 2: RPE too high - suggest decrease
  else if (rpe >= config.rpeThresholdForDecrease && repDiffPercent < 0) {
    action = 'decrease'
    newWeight = Math.max(0, currentWeight - weightIncrement)
    reason = `RPE ${rpe} is very high and you missed reps. Lower the weight to maintain form.`
    confidence = 'high'
  }
  // Priority 3: Great performance - suggest increase
  else if (rpe <= config.rpeThresholdForIncrease && repDiffPercent >= config.repOvershootPercent) {
    action = 'increase'
    newWeight = currentWeight + weightIncrement
    reason = `Crushed it! RPE ${rpe} with ${actualReps} reps (${repDiff} over target). Ready for more weight!`
    confidence = 'high'
  }
  // Priority 4: Good performance, moderate effort - suggest increase
  else if (rpe <= 7 && repDiff >= 2) {
    action = 'increase'
    newWeight = currentWeight + weightIncrement
    reason = `Good form, moderate effort. Time to progress!`
    confidence = 'medium'
  }
  // Priority 5: Struggling but completing - maintain
  else if (rpe >= 8 && repDiff >= 0) {
    action = 'maintain'
    reason = `Working hard but hitting targets. Keep building at this weight.`
    confidence = 'high'
  }
  // Priority 6: Under target - suggest decrease or maintain
  else if (repDiff < -2) {
    if (rpe >= 9) {
      action = 'decrease'
      newWeight = Math.max(0, currentWeight - weightIncrement)
      reason = `Missing reps at high effort. Drop weight to build back up.`
      confidence = 'high'
    } else {
      action = 'maintain'
      reason = `Slightly under target. Focus on form, weight will come.`
      confidence = 'medium'
    }
  }
  // Default: maintain current weight
  else {
    action = 'maintain'
    reason = `On track. Keep building consistency.`
    confidence = 'low'
  }

  return {
    action,
    currentWeight,
    newWeight,
    weightChange: newWeight - currentWeight,
    reason,
    confidence,
    metrics: {
      rpe,
      targetReps,
      actualReps,
      repDiff,
      avgRecentRPE,
      hardSessionCount
    }
  }
}

// ============================================
// REALISTIC REP PROGRESSION (HOME MODE)
// ============================================

/**
 * Cap rep progression to realistic weekly increases
 * @param {number} startReps - Starting rep count
 * @param {number} targetReps - Original target reps
 * @param {number} week - Current week (1-6)
 * @param {number} totalWeeks - Total program weeks
 * @returns {Object} { cappedTarget, weeklyIncrease, isRealistic }
 */
export const getRealisticRepTarget = (startReps, targetReps, week, totalWeeks = 6) => {
  const config = PROGRESSION_CONFIG

  // Calculate what the original progression would be
  const originalWeeklyIncrease = (targetReps - startReps) / totalWeeks
  const originalPercent = (originalWeeklyIncrease / startReps) * 100

  // Cap the weekly increase
  const maxWeeklyIncrease = startReps * (config.maxWeeklyIncreasePercent / 100)
  const minWeeklyIncrease = startReps * (config.minWeeklyIncreasePercent / 100)

  // Use capped increase
  let cappedWeeklyIncrease = Math.min(originalWeeklyIncrease, maxWeeklyIncrease)
  cappedWeeklyIncrease = Math.max(cappedWeeklyIncrease, minWeeklyIncrease)

  // Calculate capped target for this week
  const cappedTarget = Math.round(startReps + (cappedWeeklyIncrease * week))

  // Calculate realistic final goal
  const realisticFinalGoal = Math.round(startReps + (cappedWeeklyIncrease * totalWeeks))

  return {
    cappedTarget,
    originalTarget: Math.round(startReps + (originalWeeklyIncrease * week)),
    weeklyIncrease: Math.round(cappedWeeklyIncrease),
    weeklyIncreasePercent: Math.round((cappedWeeklyIncrease / startReps) * 100),
    originalIncreasePercent: Math.round(originalPercent),
    isRealistic: originalPercent <= config.maxWeeklyIncreasePercent,
    realisticFinalGoal,
    originalFinalGoal: targetReps,
    message: originalPercent > config.maxWeeklyIncreasePercent
      ? `Progression capped from ${Math.round(originalPercent)}% to ${config.maxWeeklyIncreasePercent}% weekly for safety`
      : null
  }
}

/**
 * Apply realistic caps to an entire exercise progression
 * @param {Array} weeks - Original weeks array from exercise plan
 * @param {number} startReps - Starting reps
 * @param {number} finalGoal - Original final goal
 * @returns {Array} Modified weeks with capped progression
 */
export const applyRealisticProgression = (weeks, startReps, finalGoal) => {
  const config = PROGRESSION_CONFIG

  // Calculate realistic weekly increase
  const maxWeeklyIncrease = startReps * (config.maxWeeklyIncreasePercent / 100)
  const totalWeeks = weeks.length

  // Cap the progression
  const realisticFinalGoal = Math.min(
    finalGoal,
    startReps + (maxWeeklyIncrease * totalWeeks)
  )

  // Scale factor to apply to all reps
  const scaleFactor = (realisticFinalGoal - startReps) / (finalGoal - startReps)

  // If the original was already realistic, return unchanged
  if (scaleFactor >= 0.95) return weeks

  // Apply scaling to each day
  return weeks.map((week) => ({
    ...week,
    days: week.days.map(day => ({
      ...day,
      reps: day.reps.map(rep => {
        // Scale the rep, but ensure minimum of startReps and at least 1
        const scaled = Math.round(startReps + ((rep - startReps) * scaleFactor))
        return Math.max(1, Math.round(scaled))
      })
    }))
  }))
}

// ============================================
// DELOAD DETECTION
// ============================================

/**
 * Check if user needs a deload based on recent performance
 * @param {Array} recentSessions - Last 2-4 weeks of sessions
 * @returns {Object} { needsDeload, reason, suggestion }
 */
export const checkDeloadNeeded = (recentSessions = []) => {
  const config = PROGRESSION_CONFIG

  if (recentSessions.length < 5) {
    return { needsDeload: false, reason: 'Not enough data yet', suggestion: null }
  }

  // Check for consecutive high RPE sessions
  const recentRPEs = recentSessions.slice(-5).map(s => s.rpe || 7)
  const highRPECount = recentRPEs.filter(r => r >= 9).length

  // Check for declining performance
  const recentVolumes = recentSessions.slice(-5).map(s => s.volume || 0)
  const isDecreasing = recentVolumes.length >= 3 &&
    recentVolumes[recentVolumes.length - 1] < recentVolumes[0] * 0.9

  // Check weeks since last deload
  const lastDeload = localStorage.getItem(`${STORAGE_PREFIX}last_deload`)
  const weeksSinceDeload = lastDeload
    ? Math.floor((Date.now() - new Date(lastDeload).getTime()) / (7 * 24 * 60 * 60 * 1000))
    : config.weeksBeforeDeload + 1 // Assume they need one if no record

  // Decision
  if (highRPECount >= config.consecutiveHardSessions) {
    return {
      needsDeload: true,
      reason: `${highRPECount} high-effort sessions recently. Your body needs recovery.`,
      suggestion: 'Take a deload week: reduce weights by 40% and reps by 30%',
      type: 'fatigue'
    }
  }

  if (isDecreasing && weeksSinceDeload >= config.weeksBeforeDeload) {
    return {
      needsDeload: true,
      reason: 'Performance trending down. This is normal - time to deload.',
      suggestion: 'Reduce intensity this week to come back stronger',
      type: 'performance'
    }
  }

  if (weeksSinceDeload >= config.weeksBeforeDeload + 2) {
    return {
      needsDeload: true,
      reason: `It's been ${weeksSinceDeload} weeks since your last deload.`,
      suggestion: 'Scheduled deload for long-term progress',
      type: 'scheduled'
    }
  }

  return {
    needsDeload: false,
    reason: null,
    suggestion: null,
    weeksSinceDeload
  }
}

/**
 * Record a deload week
 */
export const recordDeload = () => {
  localStorage.setItem(`${STORAGE_PREFIX}last_deload`, new Date().toISOString())
}

// ============================================
// CELEBRATION MESSAGES
// ============================================

export const PR_CELEBRATION_MESSAGES = [
  "NEW PERSONAL RECORD!",
  "YOU'RE GETTING STRONGER!",
  "BEAST MODE ACTIVATED!",
  "PERSONAL BEST CRUSHED!",
  "NEW PR UNLOCKED!",
  "RECORD BREAKER!",
  "LEGENDARY LIFT!",
  "STRONGER THAN YESTERDAY!"
]

export const getRandomPRMessage = () => {
  return PR_CELEBRATION_MESSAGES[Math.floor(Math.random() * PR_CELEBRATION_MESSAGES.length)]
}

export const WEIGHT_INCREASE_MESSAGES = {
  increase: [
    "Time to level up! Add some weight.",
    "You're ready for more. Increase the load!",
    "Crushing it! Go heavier next time.",
    "Progressive overload time - add weight!"
  ],
  maintain: [
    "Solid work. Build strength at this weight.",
    "Keep grinding at this weight.",
    "Consistency builds champions. Stay here.",
    "Master this weight before moving up."
  ],
  decrease: [
    "Form first. Drop weight to dial it in.",
    "No shame in dropping weight. It's how we grow.",
    "Reset and rebuild. You'll come back stronger.",
    "Focus on quality over weight."
  ],
  deload: [
    "Recovery is part of the process. Time to deload.",
    "Smart athletes deload. This is a sign of wisdom.",
    "Your body needs this. Trust the process.",
    "Deload week = gains week. Embrace it."
  ]
}

export const getRandomWeightMessage = (action) => {
  const messages = WEIGHT_INCREASE_MESSAGES[action] || WEIGHT_INCREASE_MESSAGES.maintain
  return messages[Math.floor(Math.random() * messages.length)]
}
