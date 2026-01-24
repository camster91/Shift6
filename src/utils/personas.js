/**
 * Persona System for Shift6
 * Detects and manages user personas to personalize the app experience
 */

/**
 * Available persona types
 */
export const PERSONA_TYPES = {
  HOME_HERO: 'home_hero',
  GYM_WARRIOR: 'gym_warrior',
  HYBRID_FLEX: 'hybrid_flex',
  BUSY_BEE: 'busy_bee',
  GOLDEN_YEARS: 'golden_years',
  COMPETITOR: 'competitor'
}

/**
 * Persona display information for UI
 */
export const PERSONA_INFO = {
  [PERSONA_TYPES.HOME_HERO]: {
    id: 'home_hero',
    icon: '🏠',
    title: 'Home Workout Hero',
    shortTitle: 'Home',
    description: 'I prefer working out at home with minimal or no equipment',
    color: 'cyan',
    features: ['Bodyweight focused', 'No gym needed', 'Flexible schedule']
  },
  [PERSONA_TYPES.GYM_WARRIOR]: {
    id: 'gym_warrior',
    icon: '🏋️',
    title: 'Gym Regular',
    shortTitle: 'Gym',
    description: 'I go to the gym regularly and have access to full equipment',
    color: 'orange',
    features: ['Full equipment access', 'Structured programs', 'Progressive overload']
  },
  [PERSONA_TYPES.HYBRID_FLEX]: {
    id: 'hybrid_flex',
    icon: '🔄',
    title: 'Flexible Trainer',
    shortTitle: 'Hybrid',
    description: 'I mix home workouts with gym sessions depending on my schedule',
    color: 'purple',
    features: ['Best of both worlds', 'Adaptable routines', 'Location-aware']
  },
  [PERSONA_TYPES.BUSY_BEE]: {
    id: 'busy_bee',
    icon: '⚡',
    title: 'Time-Crunched',
    shortTitle: 'Express',
    description: 'I only have 10-15 minutes for quick, effective workouts',
    color: 'yellow',
    features: ['8-minute workouts', 'No setup needed', 'Maximum efficiency']
  },
  [PERSONA_TYPES.GOLDEN_YEARS]: {
    id: 'golden_years',
    icon: '🌟',
    title: 'Active Ager',
    shortTitle: 'Gentle',
    description: 'I focus on mobility, balance, and safe progression',
    color: 'teal',
    features: ['Safe exercises', 'Gentle progression', 'Accessibility options']
  },
  [PERSONA_TYPES.COMPETITOR]: {
    id: 'competitor',
    icon: '🏆',
    title: 'Athlete',
    shortTitle: 'Athlete',
    description: 'I train for sports, competitions, or peak performance',
    color: 'pink',
    features: ['Periodization', 'Performance tracking', 'Advanced programming']
  }
}

/**
 * Default preferences for each persona
 */
export const PERSONA_DEFAULTS = {
  [PERSONA_TYPES.HOME_HERO]: {
    programMode: 'bodyweight',
    targetSessionDuration: 25,
    repScheme: 'balanced',
    setsPerExercise: 4,
    trainingDaysPerWeek: 4,
    progressionRate: 'moderate',
    restBetweenSets: 60,
    fitnessLevel: 'intermediate'
  },
  [PERSONA_TYPES.GYM_WARRIOR]: {
    programMode: 'gym',
    targetSessionDuration: 45,
    repScheme: 'hypertrophy',
    setsPerExercise: 5,
    trainingDaysPerWeek: 5,
    progressionRate: 'moderate',
    restBetweenSets: 90,
    fitnessLevel: 'intermediate'
  },
  [PERSONA_TYPES.HYBRID_FLEX]: {
    programMode: 'mixed',
    targetSessionDuration: 35,
    repScheme: 'balanced',
    setsPerExercise: 4,
    trainingDaysPerWeek: 4,
    progressionRate: 'moderate',
    restBetweenSets: 60,
    fitnessLevel: 'intermediate'
  },
  [PERSONA_TYPES.BUSY_BEE]: {
    programMode: 'bodyweight',
    targetSessionDuration: 10,
    repScheme: 'endurance',
    setsPerExercise: 2,
    trainingDaysPerWeek: 5,
    progressionRate: 'conservative',
    restBetweenSets: 20,
    fitnessLevel: 'beginner',
    expressMode: true
  },
  [PERSONA_TYPES.GOLDEN_YEARS]: {
    programMode: 'bodyweight',
    targetSessionDuration: 20,
    repScheme: 'endurance',
    setsPerExercise: 3,
    trainingDaysPerWeek: 3,
    progressionRate: 'conservative',
    restBetweenSets: 90,
    fitnessLevel: 'beginner',
    accessibility: {
      fontSize: 'large',
      simpleLanguage: true,
      longerRestTimes: true,
      largerButtons: true
    }
  },
  [PERSONA_TYPES.COMPETITOR]: {
    programMode: 'mixed',
    targetSessionDuration: 60,
    repScheme: 'strength',
    setsPerExercise: 6,
    trainingDaysPerWeek: 6,
    progressionRate: 'aggressive',
    restBetweenSets: 120,
    fitnessLevel: 'advanced'
  }
}

/**
 * Onboarding steps for each persona
 * Some personas skip steps, others have special steps
 */
export const PERSONA_ONBOARDING_STEPS = {
  [PERSONA_TYPES.HOME_HERO]: [
    'persona',
    'equipment_home',
    'fitness_level',
    'goals',
    'schedule',
    'program',
    'confirm'
  ],
  [PERSONA_TYPES.GYM_WARRIOR]: [
    'persona',
    'equipment_gym',
    'fitness_level',
    'goals',
    'schedule',
    'program',
    'confirm'
  ],
  [PERSONA_TYPES.HYBRID_FLEX]: [
    'persona',
    'location_setup',
    'equipment_both',
    'fitness_level',
    'schedule',
    'program',
    'confirm'
  ],
  [PERSONA_TYPES.BUSY_BEE]: [
    'persona',
    'time_budget',
    'express_setup',
    'confirm'
  ],
  [PERSONA_TYPES.GOLDEN_YEARS]: [
    'persona',
    'accessibility',
    'equipment_home',
    'health_check',
    'program_safe',
    'confirm'
  ],
  [PERSONA_TYPES.COMPETITOR]: [
    'persona',
    'sport_selection',
    'competition_date',
    'equipment_full',
    'program_advanced',
    'confirm'
  ]
}

/**
 * Detect persona based on user preferences and answers
 * @param {Object} preferences - User's training preferences
 * @returns {string} - Detected persona type
 */
export const detectPersona = (preferences) => {
  const {
    programMode,
    targetSessionDuration,
    fitnessLevel,
    trainingDaysPerWeek,
    repScheme,
    userAge,
    hasCompetitionGoal,
    expressMode
  } = preferences

  // Explicit express mode selection
  if (expressMode || targetSessionDuration <= 15) {
    return PERSONA_TYPES.BUSY_BEE
  }

  // Senior/accessibility focused
  if (userAge >= 55 || (fitnessLevel === 'beginner' && targetSessionDuration <= 20)) {
    return PERSONA_TYPES.GOLDEN_YEARS
  }

  // Competition/athlete mode
  if (hasCompetitionGoal || (repScheme === 'strength' && trainingDaysPerWeek >= 5 && fitnessLevel === 'advanced')) {
    return PERSONA_TYPES.COMPETITOR
  }

  // Gym-only user
  if (programMode === 'gym') {
    return PERSONA_TYPES.GYM_WARRIOR
  }

  // Mixed home/gym
  if (programMode === 'mixed') {
    return PERSONA_TYPES.HYBRID_FLEX
  }

  // Default: home workout hero
  return PERSONA_TYPES.HOME_HERO
}

/**
 * Get default preferences for a persona
 * @param {string} personaType - The persona type
 * @returns {Object} - Default preferences for this persona
 */
export const getPersonaDefaults = (personaType) => {
  return PERSONA_DEFAULTS[personaType] || PERSONA_DEFAULTS[PERSONA_TYPES.HOME_HERO]
}

/**
 * Get onboarding steps for a persona
 * @param {string} personaType - The persona type
 * @returns {string[]} - Array of step identifiers
 */
export const getPersonaOnboardingSteps = (personaType) => {
  return PERSONA_ONBOARDING_STEPS[personaType] || PERSONA_ONBOARDING_STEPS[PERSONA_TYPES.HOME_HERO]
}

/**
 * Get display info for a persona
 * @param {string} personaType - The persona type
 * @returns {Object} - Display info (icon, title, description, etc.)
 */
export const getPersonaInfo = (personaType) => {
  return PERSONA_INFO[personaType] || PERSONA_INFO[PERSONA_TYPES.HOME_HERO]
}

/**
 * Check if a persona should use express mode by default
 * @param {string} personaType - The persona type
 * @returns {boolean}
 */
export const isExpressPersona = (personaType) => {
  return personaType === PERSONA_TYPES.BUSY_BEE
}

/**
 * Check if a persona needs accessibility features
 * @param {string} personaType - The persona type
 * @returns {boolean}
 */
export const needsAccessibility = (personaType) => {
  return personaType === PERSONA_TYPES.GOLDEN_YEARS
}

/**
 * Check if a persona is gym-focused
 * @param {string} personaType - The persona type
 * @returns {boolean}
 */
export const isGymPersona = (personaType) => {
  return personaType === PERSONA_TYPES.GYM_WARRIOR || personaType === PERSONA_TYPES.COMPETITOR
}

/**
 * Check if a persona uses mixed locations
 * @param {string} personaType - The persona type
 * @returns {boolean}
 */
export const isHybridPersona = (personaType) => {
  return personaType === PERSONA_TYPES.HYBRID_FLEX
}

/**
 * Get exercise filter based on persona
 * @param {string} personaType - The persona type
 * @returns {Function} - Filter function for exercises
 */
export const getExerciseFilterForPersona = (personaType) => {
  switch (personaType) {
    case PERSONA_TYPES.BUSY_BEE:
      // Only quick, no-equipment exercises
      return (exercise) => exercise.equipment === 'none' && !exercise.isComplex
    case PERSONA_TYPES.GOLDEN_YEARS:
      // Safe, low-impact exercises
      return (exercise) => exercise.isSafe !== false && exercise.impact !== 'high'
    case PERSONA_TYPES.GYM_WARRIOR:
      // All gym exercises
      return (exercise) => exercise.modes?.includes('gym') || exercise.equipment !== 'none'
    case PERSONA_TYPES.HOME_HERO:
      // Bodyweight only
      return (exercise) => exercise.equipment === 'none' || exercise.modes?.includes('home')
    default:
      // No filter
      return () => true
  }
}

/**
 * Get persona-specific achievements
 * @param {string} personaType - The persona type
 * @returns {Object[]} - Array of achievement definitions
 */
export const getPersonaAchievements = (personaType) => {
  const baseAchievements = [
    { id: 'first_workout', name: 'First Steps', desc: 'Complete your first workout' },
    { id: 'week_streak', name: 'Week Warrior', desc: '7-day workout streak' }
  ]

  const personaAchievements = {
    [PERSONA_TYPES.HOME_HERO]: [
      { id: 'living_room_legend', name: 'Living Room Legend', desc: 'Complete 20 home workouts' },
      { id: 'no_equipment_master', name: 'No Equipment Needed', desc: 'Master 5 bodyweight exercises' }
    ],
    [PERSONA_TYPES.GYM_WARRIOR]: [
      { id: 'iron_addict', name: 'Iron Addict', desc: 'Log 50 gym sessions' },
      { id: 'pr_crusher', name: 'PR Crusher', desc: 'Set 10 personal records' }
    ],
    [PERSONA_TYPES.HYBRID_FLEX]: [
      { id: 'adaptable', name: 'Adaptable Athlete', desc: 'Work out at 3 different locations' },
      { id: 'balanced_life', name: 'Balanced Life', desc: 'Complete workouts at home and gym in same week' }
    ],
    [PERSONA_TYPES.BUSY_BEE]: [
      { id: 'time_efficient', name: 'Time Efficient', desc: 'Complete 10 express workouts' },
      { id: 'micro_gains', name: 'Micro Gains', desc: 'Improve in just 10-minute sessions' }
    ],
    [PERSONA_TYPES.GOLDEN_YEARS]: [
      { id: 'mobility_master', name: 'Mobility Master', desc: 'Complete all warmup routines' },
      { id: 'steady_progress', name: 'Steady Progress', desc: 'Improve for 6 consecutive weeks' }
    ],
    [PERSONA_TYPES.COMPETITOR]: [
      { id: 'peak_performer', name: 'Peak Performer', desc: 'Complete a periodized training block' },
      { id: 'game_day_ready', name: 'Game Day Ready', desc: 'Complete taper week before competition' }
    ]
  }

  return [...baseAchievements, ...(personaAchievements[personaType] || [])]
}
