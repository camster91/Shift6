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
  none: { id: 'none', name: 'No Equipment', icon: '🏃' },
  pullupBar: { id: 'pullupBar', name: 'Pull-up Bar', icon: '🔩' },
  dipBars: { id: 'dipBars', name: 'Dip Bars/Chairs', icon: '⬛' },
  resistanceBands: { id: 'resistanceBands', name: 'Resistance Bands', icon: '➿' },
  parallettes: { id: 'parallettes', name: 'Parallettes', icon: '🔲' },
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

// Starter templates - calisthenics focused with progression paths
export const STARTER_TEMPLATES = {
  'calisthenics-beginner': {
    id: 'calisthenics-beginner',
    name: 'Beginner Foundations',
    desc: 'Start your calisthenics journey with the basics',
    goal: 'balanced',
    difficulty: 'beginner',
    exercises: ['wallPushups', 'squats', 'deadHangs', 'gluteBridges', 'plank'],
    recommended: true,
  },
  'shift6-classic': {
    id: 'shift6-classic',
    name: 'Shift6 Classic',
    desc: 'The original 9 foundational exercises',
    goal: 'balanced',
    difficulty: 'intermediate',
    exercises: ['pushups', 'squats', 'pullups', 'dips', 'vups', 'glutebridge', 'plank', 'lunges', 'supermans'],
  },
  'minimalist': {
    id: 'minimalist',
    name: 'Minimalist',
    desc: '4 compound movements for busy schedules',
    goal: 'balanced',
    difficulty: 'beginner',
    exercises: ['pushups', 'squats', 'australianRows', 'plank'],
  },
  'push-pull-legs': {
    id: 'push-pull-legs',
    name: 'Push/Pull/Legs',
    desc: 'Balanced training split',
    goal: 'balanced',
    difficulty: 'intermediate',
    exercises: ['pushups', 'dips', 'pullups', 'australianRows', 'squats', 'lunges', 'plank', 'vups'],
  },
  'strength-focus': {
    id: 'strength-focus',
    name: 'Strength Focus',
    desc: 'Build raw strength with harder progressions',
    goal: 'strength',
    difficulty: 'intermediate',
    exercises: ['diamondPushups', 'dips', 'chinups', 'bulgarianSplitSquats', 'hollowBodyHold', 'glutebridge'],
  },
  'advanced-calisthenics': {
    id: 'advanced-calisthenics',
    name: 'Advanced Skills',
    desc: 'For experienced athletes seeking mastery',
    goal: 'strength',
    difficulty: 'advanced',
    exercises: ['archerPushups', 'pullups', 'pistolSquats', 'lSits', 'dragonFlags', 'nordicCurls'],
  },
  'core-master': {
    id: 'core-master',
    name: 'Core Mastery',
    desc: 'Complete core progression path',
    goal: 'core',
    difficulty: 'intermediate',
    exercises: ['plank', 'sidePlank', 'hollowBodyHold', 'vups', 'lSits', 'mountainClimbers'],
  },
  'upper-body': {
    id: 'upper-body',
    name: 'Upper Body Focus',
    desc: 'Push and pull for upper body development',
    goal: 'hypertrophy',
    difficulty: 'intermediate',
    exercises: ['pushups', 'diamondPushups', 'dips', 'pullups', 'australianRows', 'supermans'],
  },
  'lower-body': {
    id: 'lower-body',
    name: 'Lower Body Focus',
    desc: 'Legs and glutes development',
    goal: 'hypertrophy',
    difficulty: 'intermediate',
    exercises: ['squats', 'lunges', 'bulgarianSplitSquats', 'gluteBridges', 'glutebridge', 'pistolSquats'],
  },
  'conditioning': {
    id: 'conditioning',
    name: 'Conditioning Circuit',
    desc: 'High rep endurance and cardio',
    goal: 'endurance',
    difficulty: 'beginner',
    exercises: ['squats', 'pushups', 'mountainClimbers', 'burpees', 'plank', 'lunges'],
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
