/**
 * Calisthenics Exercise Library
 *
 * Organized by movement patterns with clear progression paths.
 * Users unlock harder exercises by mastering easier ones.
 */

import {
  EXERCISE_PLANS,
  PROGRESSION_CHAINS,
  MOVEMENT_PATTERNS,
  isExerciseUnlocked,
  getStarterExercises,
  getNextProgression,
  getExercisesByPattern
} from './exercises.jsx'

// Equipment types - calisthenics only
export const EQUIPMENT = {
  none: { id: 'none', name: 'No Equipment', icon: '🏃', desc: 'Bodyweight only' },
  pullupBar: { id: 'pullupBar', name: 'Pull-up Bar', icon: '🔩', desc: 'Door frame or wall mounted' },
  dipBars: { id: 'dipBars', name: 'Dip Station', icon: '⬛', desc: 'Parallel bars or sturdy chairs' },
  rings: { id: 'rings', name: 'Gymnastic Rings', icon: '⭕', desc: 'Suspended rings for advanced moves' },
  parallettes: { id: 'parallettes', name: 'Parallettes', icon: '🔲', desc: 'Low bars for L-sits and push-ups' },
  resistanceBands: { id: 'resistanceBands', name: 'Resistance Bands', icon: '➿', desc: 'Assist pull-ups or add resistance' },
  abWheel: { id: 'abWheel', name: 'Ab Wheel', icon: '🎡', desc: 'Core rollouts' },
  weightedVest: { id: 'weightedVest', name: 'Weighted Vest', icon: '🦺', desc: 'Add load to any exercise' },
  plyo: { id: 'plyo', name: 'Plyo Box', icon: '📦', desc: 'Box jumps and step-ups' },
}

// Re-export movement patterns from exercises.jsx
export { MOVEMENT_PATTERNS }

/**
 * Build exercise library from EXERCISE_PLANS
 * This creates a structured library with all metadata
 */
export const EXERCISE_LIBRARY = Object.entries(EXERCISE_PLANS).reduce((acc, [key, exercise]) => {
  acc[key] = {
    key,
    ...exercise,
    // Add progression metadata
    progressionLevel: getProgressionLevel(key),
    movementPattern: exercise.category,
  }
  return acc
}, {})

/**
 * Get progression level (1-6) based on position in chain
 */
function getProgressionLevel(exerciseKey) {
  for (const chain of Object.values(PROGRESSION_CHAINS)) {
    const index = chain.findIndex(p => p.key === exerciseKey)
    if (index !== -1) {
      return index + 1
    }
  }
  return 1 // Standalone exercises default to level 1
}

/**
 * Smart Calisthenics Program Templates
 *
 * Based on research-backed programming principles:
 * - Beginners: 3x/week full body, 4-5 exercises, 3 sets of 8-15 reps
 * - Intermediate: 4x/week upper/lower, 5-6 exercises, 4 sets
 * - Advanced: 5-6x/week PPL, harder progressions, skill work
 *
 * Progression hierarchy:
 * 1. Increase reps (volume) - most important for beginners
 * 2. Exercise variation (leverage changes)
 * 3. External loading (weighted vest)
 */
export const STARTER_TEMPLATES = {
  // ========== BEGINNER PROGRAMS (3 days/week) ==========
  'beginner-full-body': {
    id: 'beginner-full-body',
    name: 'Beginner Full Body',
    desc: 'Perfect starting point - build strength foundations',
    longDesc: 'A balanced full-body program focusing on the 5 fundamental movement patterns. Train 3 days per week with a day of rest between sessions.',
    goal: 'balanced',
    difficulty: 'beginner',
    daysPerWeek: 3,
    sessionDuration: 20,
    exercises: ['kneePushups', 'squats', 'australianRows', 'gluteBridges', 'plank'],
    sets: 3,
    repRange: [8, 15],
    restSeconds: 60,
    recommended: true,
    tags: ['no-equipment', 'home-friendly'],
  },
  'beginner-minimal': {
    id: 'beginner-minimal',
    name: 'Minimalist Start',
    desc: '4 essential movements for busy schedules',
    longDesc: 'The bare minimum for building strength. Just 4 compound exercises covering all major movement patterns.',
    goal: 'balanced',
    difficulty: 'beginner',
    daysPerWeek: 2,
    sessionDuration: 15,
    exercises: ['pushups', 'squats', 'plank', 'gluteBridges'],
    sets: 3,
    repRange: [10, 20],
    restSeconds: 45,
    tags: ['no-equipment', 'quick', 'home-friendly'],
  },

  // ========== INTERMEDIATE PROGRAMS (4 days/week) ==========
  'intermediate-upper-lower': {
    id: 'intermediate-upper-lower',
    name: 'Upper/Lower Split',
    desc: 'Classic 4-day split for balanced development',
    longDesc: 'Alternate between upper and lower body days. Allows more volume per muscle group while maintaining balance.',
    goal: 'hypertrophy',
    difficulty: 'intermediate',
    daysPerWeek: 4,
    sessionDuration: 35,
    exercises: ['pushups', 'dips', 'pullups', 'australianRows', 'squats', 'lunges', 'gluteBridges', 'plank', 'vups'],
    sets: 4,
    repRange: [8, 12],
    restSeconds: 60,
    tags: ['pull-up-bar', 'balanced'],
  },
  'intermediate-ppl': {
    id: 'intermediate-ppl',
    name: 'Push/Pull/Legs',
    desc: 'Train each pattern twice per week',
    longDesc: 'The gold standard split for muscle building. Push (chest/shoulders), Pull (back/biceps), Legs each get dedicated days.',
    goal: 'hypertrophy',
    difficulty: 'intermediate',
    daysPerWeek: 3,
    sessionDuration: 30,
    exercises: ['pushups', 'diamondPushups', 'dips', 'pullups', 'chinups', 'australianRows', 'squats', 'lunges', 'gluteBridges', 'plank'],
    sets: 4,
    repRange: [8, 12],
    restSeconds: 60,
    tags: ['pull-up-bar', 'dip-station'],
  },
  'intermediate-strength': {
    id: 'intermediate-strength',
    name: 'Strength Builder',
    desc: 'Lower reps, harder progressions',
    longDesc: 'Focus on building maximal strength with challenging exercise variations and lower rep ranges.',
    goal: 'strength',
    difficulty: 'intermediate',
    daysPerWeek: 4,
    sessionDuration: 40,
    exercises: ['diamondPushups', 'dips', 'pullups', 'bulgarianSplitSquats', 'singleLegGluteBridge', 'hollowBodyHold'],
    sets: 5,
    repRange: [5, 8],
    restSeconds: 90,
    tags: ['pull-up-bar', 'dip-station', 'strength-focus'],
  },

  // ========== ADVANCED PROGRAMS (5-6 days/week) ==========
  'advanced-skills': {
    id: 'advanced-skills',
    name: 'Skills & Strength',
    desc: 'Master advanced calisthenics movements',
    longDesc: 'For experienced athletes ready to tackle pistol squats, L-sits, and archer variations. Requires solid foundation.',
    goal: 'strength',
    difficulty: 'advanced',
    daysPerWeek: 5,
    sessionDuration: 45,
    exercises: ['archerPushups', 'pullups', 'pistolSquats', 'lSits', 'dragonFlags', 'nordicCurls'],
    sets: 4,
    repRange: [5, 8],
    restSeconds: 90,
    tags: ['advanced', 'skill-work'],
  },
  'advanced-muscle': {
    id: 'advanced-muscle',
    name: 'Hypertrophy Focus',
    desc: 'High volume for muscle growth',
    longDesc: 'Maximum muscle stimulus with higher volume and moderate rep ranges. Add a weighted vest for extra challenge.',
    goal: 'hypertrophy',
    difficulty: 'advanced',
    daysPerWeek: 6,
    sessionDuration: 50,
    exercises: ['pushups', 'diamondPushups', 'dips', 'pullups', 'chinups', 'australianRows', 'squats', 'bulgarianSplitSquats', 'lunges', 'gluteBridges', 'vups', 'plank'],
    sets: 4,
    repRange: [10, 15],
    restSeconds: 60,
    tags: ['high-volume', 'weighted-vest-optional'],
  },

  // ========== SPECIALTY PROGRAMS ==========
  'core-progression': {
    id: 'core-progression',
    name: 'Core Mastery',
    desc: 'Progressive core development',
    longDesc: 'From basic planks to dragon flags. Build a rock-solid core through progressive overload.',
    goal: 'core',
    difficulty: 'intermediate',
    daysPerWeek: 3,
    sessionDuration: 20,
    exercises: ['plank', 'sidePlank', 'hollowBodyHold', 'vups', 'lSits', 'mountainClimbers'],
    sets: 3,
    repRange: [10, 20],
    restSeconds: 45,
    tags: ['core-focus', 'no-equipment'],
  },
  'conditioning-circuit': {
    id: 'conditioning-circuit',
    name: 'Endurance Circuit',
    desc: 'High reps, minimal rest',
    longDesc: 'Build muscular endurance and work capacity with high rep circuits. Great for fat loss and conditioning.',
    goal: 'endurance',
    difficulty: 'beginner',
    daysPerWeek: 3,
    sessionDuration: 25,
    exercises: ['squats', 'pushups', 'mountainClimbers', 'burpees', 'plank', 'lunges'],
    sets: 3,
    repRange: [15, 25],
    restSeconds: 30,
    tags: ['no-equipment', 'cardio', 'fat-loss'],
  },
  'shift6-classic': {
    id: 'shift6-classic',
    name: 'Shift6 Classic',
    desc: 'The original 9 foundational exercises',
    longDesc: 'The proven Shift6 program - 9 exercises covering all movement patterns with progressive overload built in.',
    goal: 'balanced',
    difficulty: 'intermediate',
    daysPerWeek: 3,
    sessionDuration: 30,
    exercises: ['pushups', 'squats', 'pullups', 'dips', 'vups', 'gluteBridges', 'plank', 'lunges', 'supermans'],
    sets: 4,
    repRange: [8, 15],
    restSeconds: 60,
    tags: ['classic', 'pull-up-bar', 'dip-station'],
  },
}

// Program mode - calisthenics only (kept for compatibility)
export const PROGRAM_MODES = {
  bodyweight: { id: 'bodyweight', name: 'Calisthenics', desc: 'Bodyweight training - train anywhere', icon: '🏃' },
}

// Goal icons for UI display
export const GOAL_ICONS = {
  strength: '💪',
  endurance: '🏃',
  hypertrophy: '🎯',
  balanced: '⚖️',
  core: '🎯',
}

// Difficulty labels
export const DIFFICULTY_LABELS = {
  beginner: { name: 'Beginner', color: 'emerald', icon: '🌱' },
  intermediate: { name: 'Intermediate', color: 'cyan', icon: '💪' },
  advanced: { name: 'Advanced', color: 'orange', icon: '🏆' },
}

/**
 * Get exercises filtered by user equipment
 * @param {string[]} userEquipment - Array of equipment IDs user has
 * @returns {Object} Filtered exercises
 */
export const getAvailableExercises = (userEquipment = ['none']) => {
  const available = {}

  Object.entries(EXERCISE_LIBRARY).forEach(([key, exercise]) => {
    // Check if user has required equipment
    const hasEquipment = exercise.equipment?.every(eq =>
      eq === 'none' || userEquipment.includes(eq)
    ) ?? true

    if (hasEquipment) {
      available[key] = exercise
    }
  })

  return available
}

/**
 * Get exercises unlocked for a user based on their progress
 * @param {string[]} userEquipment - Equipment user has
 * @param {Object} completedDays - User's completed days per exercise
 * @param {Object} personalRecords - User's PRs per exercise
 * @returns {Object} { available: [], locked: [] }
 */
export const getExercisesByUnlockStatus = (userEquipment = ['none'], completedDays = {}, personalRecords = {}) => {
  const available = []
  const locked = []

  Object.entries(EXERCISE_LIBRARY).forEach(([key, exercise]) => {
    // Check equipment
    const hasEquipment = exercise.equipment?.every(eq =>
      eq === 'none' || userEquipment.includes(eq)
    ) ?? true

    if (!hasEquipment) {
      locked.push({ key, exercise, reason: 'Missing equipment' })
      return
    }

    // Check progression unlock
    const unlockStatus = isExerciseUnlocked(key, completedDays, personalRecords)

    if (unlockStatus.unlocked) {
      available.push({ key, exercise, unlockReason: unlockStatus.reason })
    } else {
      locked.push({ key, exercise, reason: unlockStatus.reason, prerequisite: unlockStatus.prerequisite })
    }
  })

  return { available, locked }
}

/**
 * Get all exercises grouped by movement pattern
 * @returns {Object} Exercises grouped by pattern
 */
export const getExercisesByMovementPattern = () => {
  const grouped = {}

  Object.keys(MOVEMENT_PATTERNS).forEach(pattern => {
    grouped[pattern] = {
      ...MOVEMENT_PATTERNS[pattern],
      exercises: getExercisesByPattern(pattern),
      chain: PROGRESSION_CHAINS[pattern] || []
    }
  })

  return grouped
}

/**
 * Get recommended next exercises for a user
 * Based on what they've completed and what's unlocked
 * @param {Object} completedDays - User's completed days per exercise
 * @param {Object} personalRecords - User's PRs
 * @param {string[]} userEquipment - Equipment user has
 * @returns {Array} Recommended exercise keys
 */
export const getRecommendedNextExercises = (completedDays = {}, personalRecords = {}, userEquipment = ['none']) => {
  const recommendations = []

  // For each active exercise, check if next progression is available
  Object.keys(completedDays).forEach(exerciseKey => {
    const nextKey = getNextProgression(exerciseKey)
    if (!nextKey) return

    const exercise = EXERCISE_PLANS[nextKey]
    if (!exercise) return

    // Check equipment
    const hasEquipment = exercise.equipment?.every(eq =>
      eq === 'none' || userEquipment.includes(eq)
    ) ?? true

    if (!hasEquipment) return

    // Check if unlocked
    const unlockStatus = isExerciseUnlocked(nextKey, completedDays, personalRecords)

    if (unlockStatus.unlocked && !completedDays[nextKey]?.length) {
      recommendations.push({
        key: nextKey,
        name: exercise.name,
        reason: `Next progression from ${EXERCISE_PLANS[exerciseKey]?.name}`,
        category: exercise.category
      })
    }
  })

  return recommendations
}

/**
 * Get starter exercises that are always available
 * @returns {Array} Array of starter exercise keys
 */
export const getStarterExercisesList = () => {
  return getStarterExercises().map(key => ({
    key,
    ...EXERCISE_PLANS[key]
  })).filter(e => e.name)
}

/**
 * Get template with full exercise data
 * @param {string} templateId - Template ID
 * @returns {Object} Template with full exercise data
 */
export const getTemplateWithExercises = (templateId) => {
  const template = STARTER_TEMPLATES[templateId]
  if (!template) return null

  return {
    ...template,
    exerciseData: template.exercises.map(key => ({
      key,
      ...EXERCISE_PLANS[key]
    })).filter(e => e.name)
  }
}
