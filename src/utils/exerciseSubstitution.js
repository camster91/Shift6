/**
 * Exercise Substitution Utility
 * Handles equipment-based exercise filtering and substitution
 */

/**
 * Equipment requirements for each core exercise
 */
export const EXERCISE_EQUIPMENT = {
  // Core 9 exercises
  pushups: { required: [], optional: ['parallettes'], category: 'push' },
  squats: { required: [], optional: ['weight_vest'], category: 'legs' },
  pullups: { required: ['pullup_bar'], optional: ['resistance_band'], category: 'pull' },
  dips: { required: [], alternatives: ['chair', 'dip_station'], category: 'push' },
  vups: { required: [], optional: [], category: 'core' },
  glutebridge: { required: [], optional: ['weight'], category: 'legs' },
  plank: { required: [], optional: [], category: 'core' },
  lunges: { required: [], optional: ['dumbbells'], category: 'legs' },
  supermans: { required: [], optional: [], category: 'pull' },

  // Common substitutes
  inverted_rows: { required: ['table'], optional: [], category: 'pull' },
  chair_dips: { required: ['chair'], optional: [], category: 'push' },
  wall_pushups: { required: [], optional: [], category: 'push' },
  chair_squats: { required: ['chair'], optional: [], category: 'legs' },
  dead_bugs: { required: [], optional: [], category: 'core' },
  bird_dogs: { required: [], optional: [], category: 'pull' },
  incline_plank: { required: ['chair'], optional: [], category: 'core' },
  supported_lunges: { required: ['chair'], optional: [], category: 'legs' }
}

/**
 * Equipment alternatives mapping - what to substitute when equipment is missing
 */
export const EQUIPMENT_ALTERNATIVES = {
  pullup_bar: {
    substitute: 'inverted_rows',
    description: 'Use a sturdy table for inverted rows',
    equipmentNeeded: 'table'
  },
  dip_station: {
    substitute: 'chair_dips',
    description: 'Use two sturdy chairs',
    equipmentNeeded: 'chair'
  }
}

/**
 * Exercise substitution mapping for when equipment is unavailable
 */
export const EXERCISE_SUBSTITUTES = {
  pullups: {
    substitute: 'inverted_rows',
    reason: 'No pull-up bar',
    description: 'Inverted rows using a sturdy table work similar muscles'
  },
  dips: {
    substitute: 'chair_dips',
    reason: 'No dip bars',
    description: 'Chair dips are an effective alternative'
  }
}

/**
 * Home equipment options for onboarding
 */
export const HOME_EQUIPMENT_OPTIONS = [
  { id: 'none', label: 'No equipment', icon: '🏠', description: 'Just bodyweight' },
  { id: 'pullup_bar', label: 'Pull-up bar', icon: '🔲', description: 'Door frame or wall mounted' },
  { id: 'dip_station', label: 'Dip bars/station', icon: '⬛', description: 'Parallel bars for dips' },
  { id: 'resistance_bands', label: 'Resistance bands', icon: '🎗️', description: 'For assisted exercises' },
  { id: 'chair', label: 'Sturdy chair', icon: '🪑', description: 'For dips and support' },
  { id: 'table', label: 'Sturdy table', icon: '🪵', description: 'For inverted rows' },
  { id: 'weight_vest', label: 'Weight vest', icon: '🦺', description: 'For added resistance' },
  { id: 'dumbbells', label: 'Dumbbells', icon: '🏋️', description: 'For weighted exercises' }
]

/**
 * Check if user has required equipment for an exercise
 * @param {string} exerciseKey - The exercise key
 * @param {string[]} userEquipment - Array of equipment IDs the user has
 * @returns {Object} - { hasRequired: boolean, missing: string[], alternatives: string[] }
 */
export const checkEquipmentForExercise = (exerciseKey, userEquipment) => {
  const requirements = EXERCISE_EQUIPMENT[exerciseKey]

  if (!requirements) {
    return { hasRequired: true, missing: [], alternatives: [] }
  }

  const { required = [], alternatives = [] } = requirements

  // If no required equipment, exercise is available
  if (required.length === 0) {
    return { hasRequired: true, missing: [], alternatives: [] }
  }

  // Check if user has required equipment
  const hasRequired = required.every(eq => userEquipment.includes(eq))

  if (hasRequired) {
    return { hasRequired: true, missing: [], alternatives: [] }
  }

  // Check if user has any alternatives
  const hasAlternative = alternatives.some(eq => userEquipment.includes(eq))

  if (hasAlternative) {
    return { hasRequired: true, missing: [], alternatives: [] }
  }

  // Find missing equipment
  const missing = required.filter(eq => !userEquipment.includes(eq))

  return {
    hasRequired: false,
    missing,
    alternatives: alternatives.filter(eq => !userEquipment.includes(eq))
  }
}

/**
 * Get substitute exercise when equipment is missing
 * @param {string} exerciseKey - The exercise key
 * @param {string[]} userEquipment - Array of equipment IDs the user has
 * @returns {Object|null} - { substituteKey, reason, description } or null if no substitute
 */
export const getSubstituteExercise = (exerciseKey, userEquipment) => {
  const check = checkEquipmentForExercise(exerciseKey, userEquipment)

  if (check.hasRequired) {
    return null // No substitute needed
  }

  const substitute = EXERCISE_SUBSTITUTES[exerciseKey]

  if (!substitute) {
    return null // No substitute available
  }

  // Verify user can do the substitute
  const substituteCheck = checkEquipmentForExercise(substitute.substitute, userEquipment)

  if (!substituteCheck.hasRequired) {
    return null // Can't do substitute either
  }

  return {
    substituteKey: substitute.substitute,
    reason: substitute.reason,
    description: substitute.description
  }
}

/**
 * Filter a program based on available equipment
 * Returns exercises user can do, with substitutes where needed
 * @param {string[]} programExercises - Array of exercise keys in the program
 * @param {string[]} userEquipment - Array of equipment IDs the user has
 * @returns {Object} - { available: string[], substituted: {original, substitute}[], unavailable: string[] }
 */
export const filterProgramByEquipment = (programExercises, userEquipment) => {
  const available = []
  const substituted = []
  const unavailable = []

  for (const exerciseKey of programExercises) {
    const check = checkEquipmentForExercise(exerciseKey, userEquipment)

    if (check.hasRequired) {
      available.push(exerciseKey)
    } else {
      const substitute = getSubstituteExercise(exerciseKey, userEquipment)

      if (substitute) {
        substituted.push({
          original: exerciseKey,
          substitute: substitute.substituteKey,
          reason: substitute.reason
        })
        available.push(substitute.substituteKey)
      } else {
        unavailable.push(exerciseKey)
      }
    }
  }

  return { available, substituted, unavailable }
}

/**
 * Get all exercises available with given equipment
 * @param {string[]} userEquipment - Array of equipment IDs the user has
 * @param {Object} allExercises - All exercise definitions
 * @returns {string[]} - Array of available exercise keys
 */
export const getAvailableExercises = (userEquipment, allExercises) => {
  return Object.keys(allExercises).filter(key => {
    const check = checkEquipmentForExercise(key, userEquipment)
    return check.hasRequired
  })
}

/**
 * Get equipment warning for an exercise
 * @param {string} exerciseKey - The exercise key
 * @param {string[]} userEquipment - Array of equipment IDs the user has
 * @returns {Object|null} - Warning info or null if no warning needed
 */
export const getEquipmentWarning = (exerciseKey, userEquipment) => {
  const check = checkEquipmentForExercise(exerciseKey, userEquipment)

  if (check.hasRequired) {
    return null
  }

  const substitute = getSubstituteExercise(exerciseKey, userEquipment)

  if (substitute) {
    return {
      type: 'substitution',
      message: `${substitute.reason} - Try ${substitute.description}`,
      substitute: substitute.substituteKey
    }
  }

  return {
    type: 'unavailable',
    message: `Requires: ${check.missing.join(', ')}`,
    missing: check.missing
  }
}

/**
 * Senior-safe exercise alternatives
 * Maps regular exercises to safer versions for older adults
 */
export const SENIOR_ALTERNATIVES = {
  pushups: 'wall_pushups',
  squats: 'chair_squats',
  pullups: 'assisted_pullups',
  dips: 'chair_dips',
  vups: 'dead_bugs',
  lunges: 'supported_lunges',
  plank: 'incline_plank',
  supermans: 'bird_dogs'
}

/**
 * Get senior-safe alternative for an exercise
 * @param {string} exerciseKey - The exercise key
 * @returns {string} - Alternative exercise key or original if no alternative
 */
export const getSeniorAlternative = (exerciseKey) => {
  return SENIOR_ALTERNATIVES[exerciseKey] || exerciseKey
}

/**
 * Check if an exercise is safe for seniors
 * @param {Object} exercise - Exercise definition
 * @returns {boolean}
 */
export const isSeniorSafe = (exercise) => {
  if (!exercise) return false

  // Check explicit safety flag
  if (exercise.isSafe === false) return false

  // Check impact level
  if (exercise.impact === 'high') return false

  // Check if it's an explosive/plyometric exercise
  if (exercise.category === 'plyometric') return false

  return true
}
