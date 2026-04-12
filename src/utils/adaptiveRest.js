/**
 * Adaptive Rest Timer Utility
 *
 * Calculates smart rest recommendations based on:
 * - Exercise type (compound vs isolation)
 * - Set difficulty (reps completed vs target)
 * - Accumulated fatigue (sets completed in session)
 * - User's configured base rest time
 */

import { UPPER_BODY_EXERCISES, LOWER_BODY_EXERCISES } from './constants'

/**
 * Exercise categories for rest time calculation
 * Compound movements need more rest than isolation
 */
export const EXERCISE_INTENSITY = {
  // High intensity - compound movements (longer rest)
  high: ['pullups', 'chinups', 'dips', 'squats', 'lunges'],
  // Medium intensity - moderate compound (medium rest)
  medium: ['pushups', 'glutebridge', 'vups'],
  // Lower intensity - isolation/static (shorter rest)
  low: ['plank', 'supermans']
}

/**
 * Base rest times by intensity (in seconds)
 */
export const BASE_REST_BY_INTENSITY = {
  high: 90,
  medium: 60,
  low: 45
}

/**
 * Rest time modifiers
 */
export const REST_MODIFIERS = {
  // Fatigue multiplier per set completed (compounds over session)
  fatiguePerSet: 0.05,
  // Max fatigue bonus
  maxFatigueBonus: 0.3,
  // Difficulty adjustment when exceeding target
  exceededTarget: -0.1,
  // Difficulty adjustment when falling short
  fellShort: 0.15,
  // Late in workout bonus (sets 4+)
  lateWorkoutBonus: 0.1
}

/**
 * Get the intensity category for an exercise
 * @param {string} exerciseKey - The exercise key (e.g., 'pushups')
 * @returns {'high' | 'medium' | 'low'} The intensity category
 */
export const getExerciseIntensity = (exerciseKey) => {
  if (EXERCISE_INTENSITY.high.includes(exerciseKey)) return 'high'
  if (EXERCISE_INTENSITY.medium.includes(exerciseKey)) return 'medium'
  return 'low'
}

/**
 * Check if exercise is upper or lower body
 * @param {string} exerciseKey - The exercise key
 * @returns {'upper' | 'lower' | 'core'} Body region
 */
export const getBodyRegion = (exerciseKey) => {
  if (UPPER_BODY_EXERCISES.includes(exerciseKey)) return 'upper'
  if (LOWER_BODY_EXERCISES.includes(exerciseKey)) return 'lower'
  return 'core'
}

/**
 * Calculate adaptive rest time based on workout context
 *
 * @param {Object} params - Parameters for calculation
 * @param {string} params.exerciseKey - The exercise being performed
 * @param {number} params.completedReps - Reps completed in last set
 * @param {number} params.targetReps - Target reps for the set
 * @param {number} params.currentSet - Current set number (1-indexed)
 * @param {number} params.totalSets - Total sets in workout
 * @param {number} params.setsCompletedInSession - Total sets done this session (across exercises)
 * @param {number|string} params.userBaseRest - User's configured rest time (number or 'auto')
 * @returns {Object} Rest recommendation with time and reasoning
 */
export const calculateAdaptiveRest = ({
  exerciseKey,
  completedReps,
  targetReps,
  currentSet,
  totalSets,
  setsCompletedInSession = 0,
  userBaseRest = 'auto'
}) => {
  const intensity = getExerciseIntensity(exerciseKey)
  const baseRest = userBaseRest === 'auto'
    ? BASE_REST_BY_INTENSITY[intensity]
    : Number(userBaseRest)

  let multiplier = 1.0
  const reasons = []

  // 1. Fatigue adjustment based on sets completed in session
  if (setsCompletedInSession > 0) {
    const fatigueBonus = Math.min(
      setsCompletedInSession * REST_MODIFIERS.fatiguePerSet,
      REST_MODIFIERS.maxFatigueBonus
    )
    multiplier += fatigueBonus
    if (fatigueBonus >= 0.15) {
      reasons.push('Accumulated fatigue')
    }
  }

  // 2. Performance adjustment (how close to target)
  if (completedReps && targetReps) {
    const performance = completedReps / targetReps
    if (performance >= 1.1) {
      // Exceeded target by 10%+ - less rest needed
      multiplier += REST_MODIFIERS.exceededTarget
      reasons.push('Strong performance')
    } else if (performance < 0.85) {
      // Fell significantly short - more rest needed
      multiplier += REST_MODIFIERS.fellShort
      reasons.push('Recovery needed')
    }
  }

  // 3. Late workout adjustment
  if (currentSet >= 4 || (currentSet / totalSets) >= 0.75) {
    multiplier += REST_MODIFIERS.lateWorkoutBonus
    reasons.push('Deep in workout')
  }

  // Calculate final rest time
  const calculatedRest = Math.round(baseRest * multiplier)

  // Clamp to reasonable bounds (20s - 180s)
  const recommendedRest = Math.max(20, Math.min(180, calculatedRest))

  return {
    recommendedRest,
    baseRest,
    multiplier: Math.round(multiplier * 100) / 100,
    intensity,
    reasons: reasons.length > 0 ? reasons : ['Standard rest'],
    isAdaptive: userBaseRest === 'auto'
  }
}

/**
 * Get a human-readable rest recommendation message
 * @param {Object} restData - Result from calculateAdaptiveRest
 * @returns {string} Human-readable message
 */
export const getRestMessage = (restData) => {
  const { reasons, intensity } = restData

  if (reasons.includes('Recovery needed')) {
    return 'Take extra time to recover'
  }
  if (reasons.includes('Strong performance')) {
    return 'Great set! Quick rest'
  }
  if (reasons.includes('Accumulated fatigue')) {
    return 'Building fatigue - rest up'
  }
  if (intensity === 'high') {
    return 'Compound movement - full recovery'
  }
  return 'Ready when you are'
}

/**
 * Format rest time for display
 * @param {number} seconds - Rest time in seconds
 * @returns {string} Formatted time string
 */
export const formatRestTime = (seconds) => {
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return secs > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${mins}:00`
  }
  return `${seconds}s`
}

/**
 * Get rest time suggestions for manual adjustment
 * @param {number} currentRest - Current recommended rest
 * @returns {Object} Quick adjustment options
 */
export const getRestAdjustments = (currentRest) => {
  return {
    shorter: Math.max(20, currentRest - 15),
    current: currentRest,
    longer: Math.min(180, currentRest + 15)
  }
}
