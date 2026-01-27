/**
 * Advanced Progression Algorithms
 *
 * Implements research-based progression systems:
 * - Linear Progression (StrongLifts/Greyskull style)
 * - Progression Trees (Reddit RR style for calisthenics)
 * - Volume Landmarks (Renaissance Periodization style)
 * - Failure Management with intelligent deloads
 * - AMRAP autoregulation
 *
 * Based on: ACSM guidelines, NSCA protocols, and proven programming methods
 */

// ============================================================
// PROGRESSION TREES FOR CALISTHENICS
// Each exercise has a clear path from beginner to advanced
// Move up when: 3 sets of 8 reps achieved with good form
// Move down when: Can't complete 3 sets of 5 reps
// ============================================================

export const PROGRESSION_TREES = {
  // PUSH PROGRESSION
  push: {
    name: 'Push Progression',
    pattern: 'horizontal_push',
    levels: [
      { key: 'wallPushup', name: 'Wall Push-up', difficulty: 1, targetReps: [5, 15] },
      { key: 'inclinePushup', name: 'Incline Push-up', difficulty: 2, targetReps: [5, 12] },
      { key: 'kneePushup', name: 'Knee Push-up', difficulty: 3, targetReps: [5, 12] },
      { key: 'pushup', name: 'Push-up', difficulty: 4, targetReps: [5, 12] },
      { key: 'diamondPushup', name: 'Diamond Push-up', difficulty: 5, targetReps: [5, 10] },
      { key: 'archerPushup', name: 'Archer Push-up', difficulty: 6, targetReps: [3, 8] },
      { key: 'oneArmPushup', name: 'One-Arm Push-up', difficulty: 7, targetReps: [1, 5] },
    ]
  },

  // PULL PROGRESSION
  pull: {
    name: 'Pull Progression',
    pattern: 'vertical_pull',
    levels: [
      { key: 'deadHang', name: 'Dead Hang', difficulty: 1, targetReps: [10, 30], unit: 'seconds' },
      { key: 'scapularPull', name: 'Scapular Pulls', difficulty: 2, targetReps: [5, 15] },
      { key: 'archHang', name: 'Arch Hangs', difficulty: 3, targetReps: [5, 12] },
      { key: 'negativePullup', name: 'Negative Pull-ups', difficulty: 4, targetReps: [3, 8] },
      { key: 'pullup', name: 'Pull-up', difficulty: 5, targetReps: [3, 10] },
      { key: 'lSitPullup', name: 'L-Sit Pull-up', difficulty: 6, targetReps: [3, 8] },
      { key: 'archerPullup', name: 'Archer Pull-up', difficulty: 7, targetReps: [1, 5] },
    ]
  },

  // ROW PROGRESSION
  row: {
    name: 'Row Progression',
    pattern: 'horizontal_pull',
    levels: [
      { key: 'verticalRow', name: 'Vertical Row', difficulty: 1, targetReps: [5, 15] },
      { key: 'inclineRow', name: 'Incline Row', difficulty: 2, targetReps: [5, 12] },
      { key: 'australianRow', name: 'Australian Row', difficulty: 3, targetReps: [5, 12] },
      { key: 'wideRow', name: 'Wide Row', difficulty: 4, targetReps: [5, 10] },
      { key: 'archerRow', name: 'Archer Row', difficulty: 5, targetReps: [3, 8] },
      { key: 'frontLeverRow', name: 'Front Lever Row', difficulty: 6, targetReps: [1, 5] },
    ]
  },

  // SQUAT PROGRESSION
  squat: {
    name: 'Squat Progression',
    pattern: 'knee_dominant',
    levels: [
      { key: 'assistedSquat', name: 'Assisted Squat', difficulty: 1, targetReps: [5, 15] },
      { key: 'airSquat', name: 'Air Squat', difficulty: 2, targetReps: [8, 20] },
      { key: 'splitSquat', name: 'Split Squat', difficulty: 3, targetReps: [5, 12] },
      { key: 'bulgarianSplitSquat', name: 'Bulgarian Split Squat', difficulty: 4, targetReps: [5, 10] },
      { key: 'shrimpSquat', name: 'Shrimp Squat', difficulty: 5, targetReps: [3, 8] },
      { key: 'pistolSquat', name: 'Pistol Squat', difficulty: 6, targetReps: [1, 5] },
    ]
  },

  // HINGE PROGRESSION
  hinge: {
    name: 'Hinge Progression',
    pattern: 'hip_dominant',
    levels: [
      { key: 'gluteBridge', name: 'Glute Bridge', difficulty: 1, targetReps: [8, 20] },
      { key: 'singleLegGluteBridge', name: 'Single Leg Glute Bridge', difficulty: 2, targetReps: [5, 12] },
      { key: 'hipHinge', name: 'Hip Hinge', difficulty: 3, targetReps: [8, 15] },
      { key: 'romanianDeadlift', name: 'Single Leg Romanian Deadlift', difficulty: 4, targetReps: [5, 10] },
      { key: 'nordicCurlNegative', name: 'Nordic Curl Negative', difficulty: 5, targetReps: [3, 8] },
      { key: 'nordicCurl', name: 'Nordic Curl', difficulty: 6, targetReps: [1, 5] },
    ]
  },

  // CORE STABILITY PROGRESSION
  coreStability: {
    name: 'Core Stability Progression',
    pattern: 'core_stability',
    levels: [
      { key: 'deadBug', name: 'Dead Bug', difficulty: 1, targetReps: [8, 15] },
      { key: 'plank', name: 'Plank', difficulty: 2, targetReps: [20, 60], unit: 'seconds' },
      { key: 'sidePlank', name: 'Side Plank', difficulty: 3, targetReps: [15, 45], unit: 'seconds' },
      { key: 'hollowBodyHold', name: 'Hollow Body Hold', difficulty: 4, targetReps: [15, 45], unit: 'seconds' },
      { key: 'lSit', name: 'L-Sit', difficulty: 5, targetReps: [5, 30], unit: 'seconds' },
      { key: 'dragonFlag', name: 'Dragon Flag', difficulty: 6, targetReps: [1, 8] },
    ]
  },

  // CORE FLEXION PROGRESSION
  coreFlexion: {
    name: 'Core Flexion Progression',
    pattern: 'core_flexion',
    levels: [
      { key: 'crunch', name: 'Crunch', difficulty: 1, targetReps: [10, 20] },
      { key: 'lyingLegRaise', name: 'Lying Leg Raise', difficulty: 2, targetReps: [8, 15] },
      { key: 'vUp', name: 'V-Up', difficulty: 3, targetReps: [5, 12] },
      { key: 'hangingKneeRaise', name: 'Hanging Knee Raise', difficulty: 4, targetReps: [5, 12] },
      { key: 'hangingLegRaise', name: 'Hanging Leg Raise', difficulty: 5, targetReps: [3, 10] },
      { key: 'toesToBar', name: 'Toes to Bar', difficulty: 6, targetReps: [1, 8] },
    ]
  },

  // DIP PROGRESSION
  dip: {
    name: 'Dip Progression',
    pattern: 'vertical_push',
    levels: [
      { key: 'benchDip', name: 'Bench Dip', difficulty: 1, targetReps: [8, 15] },
      { key: 'negativeDip', name: 'Negative Dip', difficulty: 2, targetReps: [3, 8] },
      { key: 'assistedDip', name: 'Assisted Dip', difficulty: 3, targetReps: [5, 10] },
      { key: 'dip', name: 'Dip', difficulty: 4, targetReps: [5, 12] },
      { key: 'ringDip', name: 'Ring Dip', difficulty: 5, targetReps: [3, 10] },
      { key: 'weightedDip', name: 'Weighted Dip', difficulty: 6, targetReps: [3, 8] },
    ]
  },
}

// ============================================================
// FAILURE MANAGEMENT & DELOAD LOGIC
// Based on StrongLifts 3-strike rule
// ============================================================

export const FAILURE_THRESHOLDS = {
  CONSECUTIVE_FAILURES_FOR_DELOAD: 3,
  DELOAD_PERCENTAGE: 0.90, // 10% reduction
  DOUBLE_DELOAD_PERCENTAGE: 0.85, // 15% reduction after repeated deloads
}

/**
 * Determine if a deload is needed based on failure history
 * @param {Object[]} recentWorkouts - Last N workouts for this exercise
 * @param {number} targetReps - Target reps for success
 * @returns {Object} { needsDeload, deloadFactor, reason }
 */
export function checkDeloadNeeded(recentWorkouts, targetReps) {
  if (!recentWorkouts || recentWorkouts.length < 3) {
    return { needsDeload: false, deloadFactor: 1.0, reason: null }
  }

  // Get last 3 workouts
  const last3 = recentWorkouts.slice(-3)

  // Count consecutive failures (didn't hit target)
  let consecutiveFailures = 0
  for (let i = last3.length - 1; i >= 0; i--) {
    const workout = last3[i]
    const actualReps = workout.totalReps || workout.reps?.reduce((a, b) => a + b, 0) || 0
    const wasSuccess = actualReps >= targetReps * 0.95 // Within 5% counts as success

    if (!wasSuccess) {
      consecutiveFailures++
    } else {
      break
    }
  }

  if (consecutiveFailures >= FAILURE_THRESHOLDS.CONSECUTIVE_FAILURES_FOR_DELOAD) {
    // Check if this is a repeated deload
    const hasRecentDeload = recentWorkouts.some(w => w.wasDeload)

    return {
      needsDeload: true,
      deloadFactor: hasRecentDeload
        ? FAILURE_THRESHOLDS.DOUBLE_DELOAD_PERCENTAGE
        : FAILURE_THRESHOLDS.DELOAD_PERCENTAGE,
      reason: `${consecutiveFailures} consecutive workouts below target`
    }
  }

  return { needsDeload: false, deloadFactor: 1.0, reason: null }
}

/**
 * Apply deload to workout targets
 * @param {number} currentTarget - Current target reps/weight
 * @param {number} deloadFactor - Factor to multiply by (0.85-0.95)
 * @param {string} unit - 'reps' or 'seconds'
 * @returns {number} New deloaded target
 */
export function applyDeload(currentTarget, deloadFactor, unit = 'reps') {
  const newTarget = Math.round(currentTarget * deloadFactor)

  // Enforce minimums based on unit
  if (unit === 'seconds') {
    return Math.max(10, newTarget) // Minimum 10 seconds
  }
  return Math.max(3, newTarget) // Minimum 3 reps
}

// ============================================================
// REP SCHEME EVOLUTION
// StrongLifts style: 5x5 → 3x5 → 3x3 → 1x3 when stalling
// ============================================================

export const REP_SCHEME_EVOLUTION = {
  // Standard progression when stalling
  stages: [
    { sets: 5, reps: 5, name: '5x5', description: 'Volume phase' },
    { sets: 3, reps: 5, name: '3x5', description: 'Reduced volume' },
    { sets: 3, reps: 3, name: '3x3', description: 'Intensity focus' },
    { sets: 1, reps: 3, name: '1x3', description: 'Peaking phase' },
  ],

  // Deloads within each stage before evolving
  deloadsBeforeEvolution: 2,
}

/**
 * Determine if rep scheme should evolve to next stage
 * @param {number} currentStageIndex - Current stage (0-3)
 * @param {number} deloadCount - Number of deloads at current stage
 * @returns {Object} { shouldEvolve, nextStageIndex, newScheme }
 */
export function checkRepSchemeEvolution(currentStageIndex, deloadCount) {
  const { stages, deloadsBeforeEvolution } = REP_SCHEME_EVOLUTION

  if (deloadCount >= deloadsBeforeEvolution && currentStageIndex < stages.length - 1) {
    const nextIndex = currentStageIndex + 1
    return {
      shouldEvolve: true,
      nextStageIndex: nextIndex,
      newScheme: stages[nextIndex]
    }
  }

  return {
    shouldEvolve: false,
    nextStageIndex: currentStageIndex,
    newScheme: stages[currentStageIndex]
  }
}

// ============================================================
// VOLUME LANDMARKS (Renaissance Periodization Style)
// Track sets per muscle group to stay within optimal range
// ============================================================

export const VOLUME_LANDMARKS = {
  // Maintenance Volume - minimum to maintain gains
  MV: { min: 4, max: 6, description: 'Maintenance Volume' },

  // Minimum Effective Volume - minimum for growth
  MEV: { min: 8, max: 10, description: 'Minimum Effective Volume' },

  // Maximum Adaptive Volume - optimal growth zone
  MAV: { min: 12, max: 20, description: 'Maximum Adaptive Volume' },

  // Maximum Recoverable Volume - upper limit before overtraining
  MRV: { min: 20, max: 25, description: 'Maximum Recoverable Volume' },
}

// Muscle group contributions per exercise type
export const EXERCISE_MUSCLE_CONTRIBUTIONS = {
  // Push exercises
  pushup: { chest: 1.0, triceps: 0.5, frontDelt: 0.3 },
  diamondPushup: { chest: 0.7, triceps: 1.0, frontDelt: 0.3 },
  dip: { chest: 0.8, triceps: 1.0, frontDelt: 0.5 },

  // Pull exercises
  pullup: { lats: 1.0, biceps: 0.7, rearDelt: 0.3 },
  row: { lats: 0.8, biceps: 0.5, rearDelt: 0.5, rhomboids: 0.8 },

  // Leg exercises
  squat: { quads: 1.0, glutes: 0.7, hamstrings: 0.3 },
  lunge: { quads: 0.8, glutes: 0.8, hamstrings: 0.4 },
  gluteBridge: { glutes: 1.0, hamstrings: 0.5 },

  // Core exercises
  plank: { core: 1.0, obliques: 0.3 },
  vUp: { core: 1.0, hipFlexors: 0.5 },
  sidePlank: { obliques: 1.0, core: 0.5 },
}

/**
 * Calculate weekly volume per muscle group
 * @param {Object[]} weeklyWorkouts - Array of workout objects with exercises
 * @returns {Object} Volume per muscle group { chest: 12, back: 10, ... }
 */
export function calculateWeeklyVolume(weeklyWorkouts) {
  const volume = {}

  weeklyWorkouts.forEach(workout => {
    workout.exercises?.forEach(ex => {
      const exerciseKey = ex.key || ex.exerciseKey || ex.id
      const sets = ex.sets || ex.completedSets || 3
      const contributions = EXERCISE_MUSCLE_CONTRIBUTIONS[exerciseKey] || {}

      Object.entries(contributions).forEach(([muscle, factor]) => {
        volume[muscle] = (volume[muscle] || 0) + (sets * factor)
      })
    })
  })

  return volume
}

/**
 * Check if any muscle group is outside optimal volume range
 * @param {Object} muscleVolume - Volume per muscle { chest: 12, ... }
 * @param {string} goal - 'maintenance' | 'growth' | 'overreaching'
 * @returns {Object} { warnings: [], suggestions: [] }
 */
export function checkVolumeStatus(muscleVolume, goal = 'growth') {
  const warnings = []
  const suggestions = []

  const targetRange = goal === 'maintenance' ? VOLUME_LANDMARKS.MV :
                      goal === 'growth' ? VOLUME_LANDMARKS.MAV :
                      VOLUME_LANDMARKS.MRV

  Object.entries(muscleVolume).forEach(([muscle, volume]) => {
    if (volume < VOLUME_LANDMARKS.MEV.min) {
      warnings.push(`${muscle}: ${volume} sets is below minimum effective volume`)
      suggestions.push(`Add ${VOLUME_LANDMARKS.MEV.min - volume} more sets for ${muscle}`)
    }

    if (volume > VOLUME_LANDMARKS.MRV.max) {
      warnings.push(`${muscle}: ${volume} sets exceeds maximum recoverable volume`)
      suggestions.push(`Reduce ${muscle} volume by ${volume - VOLUME_LANDMARKS.MAV.max} sets`)
    }
  })

  return { warnings, suggestions }
}

// ============================================================
// AMRAP AUTOREGULATION (Greyskull Style)
// Use last set performance to adjust progression
// ============================================================

export const AMRAP_THRESHOLDS = {
  MINIMUM_SUCCESS: 5,        // Must hit at least 5 reps to progress
  DOUBLE_PROGRESSION: 10,    // 10+ reps triggers double weight jump
  TRIPLE_PROGRESSION: 15,    // 15+ reps triggers triple jump (rare)
}

/**
 * Calculate progression based on AMRAP performance
 * @param {number} amrapReps - Reps achieved on AMRAP set
 * @param {number} targetReps - Target reps (usually 5)
 * @param {number} standardIncrement - Normal increment (e.g., 5 for reps, 5 for seconds)
 * @returns {Object} { increment, progressionType, message }
 */
export function calculateAmrapProgression(amrapReps, targetReps = 5, standardIncrement = 5) {
  const { MINIMUM_SUCCESS, DOUBLE_PROGRESSION, TRIPLE_PROGRESSION } = AMRAP_THRESHOLDS

  if (amrapReps < MINIMUM_SUCCESS) {
    return {
      increment: 0,
      progressionType: 'hold',
      message: 'Keep working at current level'
    }
  }

  if (amrapReps >= TRIPLE_PROGRESSION) {
    return {
      increment: standardIncrement * 3,
      progressionType: 'triple',
      message: 'Exceptional performance! Triple progression unlocked'
    }
  }

  if (amrapReps >= DOUBLE_PROGRESSION) {
    return {
      increment: standardIncrement * 2,
      progressionType: 'double',
      message: 'Great work! Double progression earned'
    }
  }

  // Standard progression
  return {
    increment: standardIncrement,
    progressionType: 'standard',
    message: 'Solid performance - progressing normally'
  }
}

// ============================================================
// PROGRESSION TREE NAVIGATION
// ============================================================

/**
 * Find current level in a progression tree
 * @param {string} treeKey - Key of the progression tree
 * @param {string} exerciseKey - Current exercise key
 * @returns {Object|null} Current level info or null if not found
 */
export function findCurrentLevel(treeKey, exerciseKey) {
  const tree = PROGRESSION_TREES[treeKey]
  if (!tree) return null

  const levelIndex = tree.levels.findIndex(l => l.key === exerciseKey)
  if (levelIndex === -1) return null

  return {
    level: tree.levels[levelIndex],
    index: levelIndex,
    totalLevels: tree.levels.length,
    hasNext: levelIndex < tree.levels.length - 1,
    hasPrevious: levelIndex > 0,
  }
}

/**
 * Determine if user should progress to next level
 * @param {Object} currentLevel - Current level info
 * @param {Object[]} recentWorkouts - Recent workout performance
 * @returns {Object} { shouldProgress, nextExercise, reason }
 */
export function checkProgressionReady(currentLevel, recentWorkouts) {
  if (!currentLevel || !recentWorkouts?.length) {
    return { shouldProgress: false, nextExercise: null, reason: 'Insufficient data' }
  }

  const { level, hasNext, index } = currentLevel
  const tree = Object.values(PROGRESSION_TREES).find(t =>
    t.levels.some(l => l.key === level.key)
  )

  if (!hasNext) {
    return {
      shouldProgress: false,
      nextExercise: null,
      reason: 'Already at highest progression'
    }
  }

  // Check if last 2-3 workouts hit 3x8 (or equivalent based on target range)
  const targetMax = level.targetReps[1]
  const targetSets = 3
  const requiredSuccesses = 2

  let successCount = 0
  const recentRelevant = recentWorkouts.slice(-3)

  recentRelevant.forEach(workout => {
    const completedSets = workout.completedSets || workout.sets || 0
    const avgReps = workout.avgReps ||
      (workout.reps?.reduce((a, b) => a + b, 0) / (workout.reps?.length || 1)) || 0

    if (completedSets >= targetSets && avgReps >= targetMax * 0.9) {
      successCount++
    }
  })

  if (successCount >= requiredSuccesses) {
    const nextLevel = tree.levels[index + 1]
    return {
      shouldProgress: true,
      nextExercise: nextLevel,
      reason: `Mastered ${level.name} - ready for ${nextLevel.name}`
    }
  }

  return {
    shouldProgress: false,
    nextExercise: null,
    reason: `Need ${requiredSuccesses - successCount} more successful workouts at 3x${targetMax}`
  }
}

/**
 * Determine if user should regress to previous level
 * @param {Object} currentLevel - Current level info
 * @param {Object[]} recentWorkouts - Recent workout performance
 * @returns {Object} { shouldRegress, previousExercise, reason }
 */
export function checkRegressionNeeded(currentLevel, recentWorkouts) {
  if (!currentLevel || !recentWorkouts?.length) {
    return { shouldRegress: false, previousExercise: null, reason: 'Insufficient data' }
  }

  const { level, hasPrevious, index } = currentLevel
  const tree = Object.values(PROGRESSION_TREES).find(t =>
    t.levels.some(l => l.key === level.key)
  )

  if (!hasPrevious) {
    return {
      shouldRegress: false,
      previousExercise: null,
      reason: 'Already at base progression'
    }
  }

  // Check if struggling to complete 3x5 in last 3 workouts
  const targetMin = level.targetReps[0]
  const targetSets = 3

  let failureCount = 0
  const recentRelevant = recentWorkouts.slice(-3)

  recentRelevant.forEach(workout => {
    const completedSets = workout.completedSets || workout.sets || 0
    const avgReps = workout.avgReps ||
      (workout.reps?.reduce((a, b) => a + b, 0) / (workout.reps?.length || 1)) || 0

    if (completedSets < targetSets || avgReps < targetMin) {
      failureCount++
    }
  })

  if (failureCount >= 3) {
    const prevLevel = tree.levels[index - 1]
    return {
      shouldRegress: true,
      previousExercise: prevLevel,
      reason: `${level.name} too challenging - build strength with ${prevLevel.name}`
    }
  }

  return {
    shouldRegress: false,
    previousExercise: null,
    reason: null
  }
}

// ============================================================
// SMART STARTING POINT CALCULATION
// Based on initial assessment or fitness level
// ============================================================

export const FITNESS_LEVEL_MULTIPLIERS = {
  beginner: 0.4,      // Start at 40% of standard
  novice: 0.6,        // Start at 60% of standard
  intermediate: 0.8,  // Start at 80% of standard
  advanced: 1.0,      // Start at standard
  elite: 1.2,         // Start above standard
}

/**
 * Calculate intelligent starting point for an exercise
 * @param {Object} exercise - Exercise definition with startReps, finalGoal
 * @param {string} fitnessLevel - User's fitness level
 * @param {number} assessmentResult - Optional assessment result (actual max achieved)
 * @returns {Object} { startReps, estimatedMax, weeklyIncrement }
 */
export function calculateStartingPoint(exercise, fitnessLevel = 'beginner', assessmentResult = null) {
  const baseStart = exercise.startReps || 10
  const finalGoal = exercise.finalGoal || 100
  const unit = exercise.unit || 'reps'

  // If we have assessment data, use it
  if (assessmentResult && assessmentResult > 0) {
    const startReps = Math.round(assessmentResult * 0.7) // Start at 70% of max
    return {
      startReps: Math.max(unit === 'seconds' ? 10 : 3, startReps),
      estimatedMax: assessmentResult,
      weeklyIncrement: Math.round((finalGoal - startReps) / 18), // 6 weeks x 3 days
      basedOn: 'assessment'
    }
  }

  // Otherwise, use fitness level multiplier
  const multiplier = FITNESS_LEVEL_MULTIPLIERS[fitnessLevel] || 0.5
  const adjustedStart = Math.round(baseStart * multiplier)

  // Enforce sensible minimums
  const minValue = unit === 'seconds' ? 10 : 3
  const startReps = Math.max(minValue, adjustedStart)

  return {
    startReps,
    estimatedMax: Math.round(startReps * 1.5), // Estimate max as 1.5x start
    weeklyIncrement: Math.round((finalGoal - startReps) / 18),
    basedOn: 'fitnessLevel'
  }
}

// ============================================================
// EXPORT COMBINED API
// ============================================================

export default {
  // Progression Trees
  PROGRESSION_TREES,
  findCurrentLevel,
  checkProgressionReady,
  checkRegressionNeeded,

  // Failure Management
  FAILURE_THRESHOLDS,
  checkDeloadNeeded,
  applyDeload,

  // Rep Scheme Evolution
  REP_SCHEME_EVOLUTION,
  checkRepSchemeEvolution,

  // Volume Landmarks
  VOLUME_LANDMARKS,
  EXERCISE_MUSCLE_CONTRIBUTIONS,
  calculateWeeklyVolume,
  checkVolumeStatus,

  // AMRAP Autoregulation
  AMRAP_THRESHOLDS,
  calculateAmrapProgression,

  // Starting Points
  FITNESS_LEVEL_MULTIPLIERS,
  calculateStartingPoint,
}
