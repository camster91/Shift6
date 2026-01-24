/**
 * Simplified Exercise Database
 *
 * Contains only the most effective, widely-known exercises.
 * Organized by movement patterns for balanced program generation.
 */

// Equipment types
export const EQUIPMENT = {
  none: { id: 'none', name: 'No Equipment', icon: '🏃' },
  pullupBar: { id: 'pullupBar', name: 'Pull-up Bar', icon: '🔩' },
  dipBars: { id: 'dipBars', name: 'Dip Bars', icon: '⬛' },
  dumbbells: { id: 'dumbbells', name: 'Dumbbells', icon: '🏋️' },
  bench: { id: 'bench', name: 'Weight Bench', icon: '🛋️' },
  cables: { id: 'cables', name: 'Cable Machine', icon: '🔗' },
  machines: { id: 'machines', name: 'Gym Machines', icon: '⚙️' },
}

// Program modes
export const PROGRAM_MODES = {
  bodyweight: { id: 'bodyweight', name: 'Bodyweight Only', desc: 'No equipment needed', icon: '🏃' },
  mixed: { id: 'mixed', name: 'Mixed Training', desc: 'Bodyweight + gym', icon: '💪' },
  gym: { id: 'gym', name: 'Gym Training', desc: 'Equipment-based', icon: '🏋️' },
}

// Movement patterns for balanced programming
export const MOVEMENT_PATTERNS = {
  knee_dominant: { name: 'Squats & Lunges', muscles: ['quads', 'glutes'] },
  hip_dominant: { name: 'Hip Hinges', muscles: ['hamstrings', 'glutes', 'lower_back'] },
  horizontal_push: { name: 'Chest Press', muscles: ['chest', 'triceps'] },
  vertical_push: { name: 'Shoulder Press', muscles: ['shoulders', 'triceps'] },
  horizontal_pull: { name: 'Rows', muscles: ['back', 'biceps'] },
  vertical_pull: { name: 'Pull-ups', muscles: ['lats', 'biceps'] },
  core_stability: { name: 'Core Stability', muscles: ['abs', 'obliques'] },
  core_flexion: { name: 'Core Flexion', muscles: ['abs'] },
}

// Difficulty levels
export const DIFFICULTY = {
  BEGINNER: 1,
  EASY: 2,
  MODERATE: 3,
  HARD: 4,
  ADVANCED: 5,
}

/**
 * SIMPLIFIED EXERCISE DATABASE
 * Only the most effective, widely-known exercises
 */
export const EXERCISES = {
  // ============================================================
  // BODYWEIGHT - LEGS
  // ============================================================

  airSquat: {
    id: 'airSquat',
    name: 'Air Squat',
    pattern: 'knee_dominant',
    category: 'legs',
    equipment: ['none'],
    modes: ['bodyweight', 'mixed'],
    difficulty: DIFFICULTY.BEGINNER,
    startReps: 15,
    finalGoal: 100,
    unit: 'reps',
    color: 'orange',
    cue: 'Sit back like into a chair, knees over toes, chest up.',
  },
  jumpSquat: {
    id: 'jumpSquat',
    name: 'Jump Squat',
    pattern: 'knee_dominant',
    category: 'legs',
    equipment: ['none'],
    modes: ['bodyweight', 'mixed'],
    difficulty: DIFFICULTY.MODERATE,
    startReps: 8,
    finalGoal: 50,
    unit: 'reps',
    color: 'orange',
    cue: 'Squat down, explode up, land softly.',
  },
  walkingLunge: {
    id: 'walkingLunge',
    name: 'Walking Lunge',
    pattern: 'knee_dominant',
    category: 'legs',
    equipment: ['none'],
    modes: ['bodyweight', 'mixed'],
    difficulty: DIFFICULTY.EASY,
    startReps: 10,
    finalGoal: 50,
    unit: 'reps/leg',
    color: 'purple',
    cue: 'Step forward, drop back knee toward ground.',
  },
  stepUp: {
    id: 'stepUp',
    name: 'Step-Up',
    pattern: 'knee_dominant',
    category: 'legs',
    equipment: ['none'],
    modes: ['bodyweight', 'mixed'],
    difficulty: DIFFICULTY.EASY,
    startReps: 10,
    finalGoal: 40,
    unit: 'reps/leg',
    color: 'orange',
    cue: 'Step onto platform, drive through heel, stand tall.',
  },
  gluteBridge: {
    id: 'gluteBridge',
    name: 'Glute Bridge',
    pattern: 'hip_dominant',
    category: 'legs',
    equipment: ['none'],
    modes: ['bodyweight', 'mixed'],
    difficulty: DIFFICULTY.BEGINNER,
    startReps: 15,
    finalGoal: 50,
    unit: 'reps',
    color: 'cyan',
    cue: 'Lie on back, drive hips up, squeeze glutes at top.',
  },
  calfRaise: {
    id: 'calfRaise',
    name: 'Calf Raise',
    pattern: 'knee_dominant',
    category: 'legs',
    equipment: ['none'],
    modes: ['bodyweight', 'mixed'],
    difficulty: DIFFICULTY.BEGINNER,
    startReps: 15,
    finalGoal: 50,
    unit: 'reps',
    color: 'orange',
    cue: 'Rise onto toes, squeeze calves, lower slowly.',
  },

  // ============================================================
  // BODYWEIGHT - PUSH
  // ============================================================

  pushup: {
    id: 'pushup',
    name: 'Push-Up',
    pattern: 'horizontal_push',
    category: 'push',
    equipment: ['none'],
    modes: ['bodyweight', 'mixed'],
    difficulty: DIFFICULTY.BEGINNER,
    startReps: 10,
    finalGoal: 50,
    unit: 'reps',
    color: 'blue',
    cue: 'Hands shoulder width, lower chest to floor, push back up.',
  },
  kneePushup: {
    id: 'kneePushup',
    name: 'Knee Push-Up',
    pattern: 'horizontal_push',
    category: 'push',
    equipment: ['none'],
    modes: ['bodyweight', 'mixed'],
    difficulty: DIFFICULTY.BEGINNER,
    startReps: 10,
    finalGoal: 40,
    unit: 'reps',
    color: 'blue',
    cue: 'Knees on ground, lower chest, push back up.',
  },
  diamondPushup: {
    id: 'diamondPushup',
    name: 'Diamond Push-Up',
    pattern: 'horizontal_push',
    category: 'push',
    equipment: ['none'],
    modes: ['bodyweight', 'mixed'],
    difficulty: DIFFICULTY.MODERATE,
    startReps: 5,
    finalGoal: 30,
    unit: 'reps',
    color: 'blue',
    cue: 'Hands together forming diamond, elbows close to body.',
  },
  declinePushup: {
    id: 'declinePushup',
    name: 'Decline Push-Up',
    pattern: 'horizontal_push',
    category: 'push',
    equipment: ['none'],
    modes: ['bodyweight', 'mixed'],
    difficulty: DIFFICULTY.MODERATE,
    startReps: 8,
    finalGoal: 40,
    unit: 'reps',
    color: 'blue',
    cue: 'Feet elevated, hands on floor, push up.',
  },
  pikePushup: {
    id: 'pikePushup',
    name: 'Pike Push-Up',
    pattern: 'vertical_push',
    category: 'push',
    equipment: ['none'],
    modes: ['bodyweight', 'mixed'],
    difficulty: DIFFICULTY.MODERATE,
    startReps: 5,
    finalGoal: 30,
    unit: 'reps',
    color: 'blue',
    cue: 'Hips high in V shape, lower head toward ground.',
  },
  dip: {
    id: 'dip',
    name: 'Dip',
    pattern: 'vertical_push',
    category: 'push',
    equipment: ['dipBars'],
    modes: ['bodyweight', 'mixed'],
    difficulty: DIFFICULTY.MODERATE,
    startReps: 5,
    finalGoal: 30,
    unit: 'reps',
    color: 'pink',
    cue: 'Lower until upper arms parallel, push back up.',
  },

  // ============================================================
  // BODYWEIGHT - PULL
  // ============================================================

  pullup: {
    id: 'pullup',
    name: 'Pull-Up',
    pattern: 'vertical_pull',
    category: 'pull',
    equipment: ['pullupBar'],
    modes: ['bodyweight', 'mixed'],
    difficulty: DIFFICULTY.HARD,
    startReps: 1,
    finalGoal: 20,
    unit: 'reps',
    color: 'yellow',
    cue: 'Hang from bar, pull chin above bar, lower controlled.',
  },
  chinup: {
    id: 'chinup',
    name: 'Chin-Up',
    pattern: 'vertical_pull',
    category: 'pull',
    equipment: ['pullupBar'],
    modes: ['bodyweight', 'mixed'],
    difficulty: DIFFICULTY.MODERATE,
    startReps: 1,
    finalGoal: 20,
    unit: 'reps',
    color: 'yellow',
    cue: 'Palms facing you, pull chin above bar.',
  },
  australianRow: {
    id: 'australianRow',
    name: 'Australian Row',
    pattern: 'horizontal_pull',
    category: 'pull',
    equipment: ['pullupBar'],
    modes: ['bodyweight', 'mixed'],
    difficulty: DIFFICULTY.EASY,
    startReps: 8,
    finalGoal: 30,
    unit: 'reps',
    color: 'yellow',
    cue: 'Hang under bar, pull chest to bar, body straight.',
  },

  // ============================================================
  // BODYWEIGHT - CORE
  // ============================================================

  plank: {
    id: 'plank',
    name: 'Plank',
    pattern: 'core_stability',
    category: 'core',
    equipment: ['none'],
    modes: ['bodyweight', 'mixed'],
    difficulty: DIFFICULTY.BEGINNER,
    startReps: 20,
    finalGoal: 120,
    unit: 'seconds',
    color: 'teal',
    cue: 'Forearms and toes, body straight, squeeze everything.',
  },
  sidePlank: {
    id: 'sidePlank',
    name: 'Side Plank',
    pattern: 'core_stability',
    category: 'core',
    equipment: ['none'],
    modes: ['bodyweight', 'mixed'],
    difficulty: DIFFICULTY.EASY,
    startReps: 15,
    finalGoal: 60,
    unit: 'seconds/side',
    color: 'teal',
    cue: 'On one forearm, stack feet, hips up, body straight.',
  },
  vUp: {
    id: 'vUp',
    name: 'V-Up',
    pattern: 'core_flexion',
    category: 'core',
    equipment: ['none'],
    modes: ['bodyweight', 'mixed'],
    difficulty: DIFFICULTY.MODERATE,
    startReps: 5,
    finalGoal: 30,
    unit: 'reps',
    color: 'emerald',
    cue: 'Lie flat, lift legs and torso to touch toes.',
  },
  mountainClimber: {
    id: 'mountainClimber',
    name: 'Mountain Climber',
    pattern: 'core_stability',
    category: 'core',
    equipment: ['none'],
    modes: ['bodyweight', 'mixed'],
    difficulty: DIFFICULTY.EASY,
    startReps: 20,
    finalGoal: 60,
    unit: 'reps',
    color: 'emerald',
    cue: 'High plank, drive knees to chest alternately.',
  },
  legRaise: {
    id: 'legRaise',
    name: 'Leg Raise',
    pattern: 'core_flexion',
    category: 'core',
    equipment: ['none'],
    modes: ['bodyweight', 'mixed'],
    difficulty: DIFFICULTY.MODERATE,
    startReps: 8,
    finalGoal: 30,
    unit: 'reps',
    color: 'emerald',
    cue: 'Lie flat, raise legs to 90 degrees, lower slowly.',
  },
  birdDog: {
    id: 'birdDog',
    name: 'Bird Dog',
    pattern: 'core_stability',
    category: 'core',
    equipment: ['none'],
    modes: ['bodyweight', 'mixed'],
    difficulty: DIFFICULTY.BEGINNER,
    startReps: 10,
    finalGoal: 30,
    unit: 'reps/side',
    color: 'teal',
    cue: 'On all fours, extend opposite arm and leg.',
  },
  superman: {
    id: 'superman',
    name: 'Superman',
    pattern: 'hip_dominant',
    category: 'core',
    equipment: ['none'],
    modes: ['bodyweight', 'mixed'],
    difficulty: DIFFICULTY.BEGINNER,
    startReps: 10,
    finalGoal: 30,
    unit: 'reps',
    color: 'indigo',
    cue: 'Lie face down, lift arms and legs off ground.',
  },

  // ============================================================
  // GYM - LEGS
  // ============================================================

  gobletSquat: {
    id: 'gobletSquat',
    name: 'Goblet Squat',
    pattern: 'knee_dominant',
    category: 'legs',
    equipment: ['dumbbells'],
    modes: ['gym', 'mixed'],
    difficulty: DIFFICULTY.BEGINNER,
    startReps: 10,
    finalGoal: 20,
    unit: 'reps',
    color: 'orange',
    cue: 'Hold dumbbell at chest, squat deep.',
  },
  romanianDeadlift: {
    id: 'romanianDeadlift',
    name: 'Romanian Deadlift',
    pattern: 'hip_dominant',
    category: 'legs',
    equipment: ['dumbbells'],
    modes: ['gym', 'mixed'],
    difficulty: DIFFICULTY.MODERATE,
    startReps: 8,
    finalGoal: 15,
    unit: 'reps',
    color: 'orange',
    cue: 'Hinge at hips, lower weight along legs, squeeze glutes up.',
  },
  legPress: {
    id: 'legPress',
    name: 'Leg Press',
    pattern: 'knee_dominant',
    category: 'legs',
    equipment: ['machines'],
    modes: ['gym', 'mixed'],
    difficulty: DIFFICULTY.BEGINNER,
    startReps: 10,
    finalGoal: 20,
    unit: 'reps',
    color: 'orange',
    cue: 'Feet shoulder width, press until legs almost straight.',
  },
  legCurl: {
    id: 'legCurl',
    name: 'Leg Curl',
    pattern: 'hip_dominant',
    category: 'legs',
    equipment: ['machines'],
    modes: ['gym', 'mixed'],
    difficulty: DIFFICULTY.BEGINNER,
    startReps: 10,
    finalGoal: 20,
    unit: 'reps',
    color: 'orange',
    cue: 'Curl weight toward glutes, squeeze hamstrings.',
  },

  // ============================================================
  // GYM - PUSH
  // ============================================================

  dbChestPress: {
    id: 'dbChestPress',
    name: 'Dumbbell Chest Press',
    pattern: 'horizontal_push',
    category: 'push',
    equipment: ['dumbbells', 'bench'],
    modes: ['gym', 'mixed'],
    difficulty: DIFFICULTY.BEGINNER,
    startReps: 8,
    finalGoal: 15,
    unit: 'reps',
    color: 'blue',
    cue: 'Lie on bench, press dumbbells up, lower to chest.',
  },
  shoulderPress: {
    id: 'shoulderPress',
    name: 'Shoulder Press',
    pattern: 'vertical_push',
    category: 'push',
    equipment: ['dumbbells'],
    modes: ['gym', 'mixed'],
    difficulty: DIFFICULTY.BEGINNER,
    startReps: 8,
    finalGoal: 15,
    unit: 'reps',
    color: 'blue',
    cue: 'Press dumbbells overhead, lower to shoulders.',
  },
  lateralRaise: {
    id: 'lateralRaise',
    name: 'Lateral Raise',
    pattern: 'vertical_push',
    category: 'push',
    equipment: ['dumbbells'],
    modes: ['gym', 'mixed'],
    difficulty: DIFFICULTY.EASY,
    startReps: 10,
    finalGoal: 20,
    unit: 'reps',
    color: 'blue',
    cue: 'Raise dumbbells to sides until shoulder height.',
  },
  tricepPushdown: {
    id: 'tricepPushdown',
    name: 'Tricep Pushdown',
    pattern: 'vertical_push',
    category: 'push',
    equipment: ['cables'],
    modes: ['gym', 'mixed'],
    difficulty: DIFFICULTY.BEGINNER,
    startReps: 10,
    finalGoal: 20,
    unit: 'reps',
    color: 'blue',
    cue: 'Push cable down, extend arms fully, squeeze triceps.',
  },

  // ============================================================
  // GYM - PULL
  // ============================================================

  latPulldown: {
    id: 'latPulldown',
    name: 'Lat Pulldown',
    pattern: 'vertical_pull',
    category: 'pull',
    equipment: ['cables'],
    modes: ['gym', 'mixed'],
    difficulty: DIFFICULTY.BEGINNER,
    startReps: 8,
    finalGoal: 15,
    unit: 'reps',
    color: 'yellow',
    cue: 'Pull bar to chest, squeeze shoulder blades.',
  },
  seatedRow: {
    id: 'seatedRow',
    name: 'Seated Cable Row',
    pattern: 'horizontal_pull',
    category: 'pull',
    equipment: ['cables'],
    modes: ['gym', 'mixed'],
    difficulty: DIFFICULTY.BEGINNER,
    startReps: 8,
    finalGoal: 15,
    unit: 'reps',
    color: 'yellow',
    cue: 'Pull handle to stomach, squeeze back.',
  },
  dbRow: {
    id: 'dbRow',
    name: 'Dumbbell Row',
    pattern: 'horizontal_pull',
    category: 'pull',
    equipment: ['dumbbells', 'bench'],
    modes: ['gym', 'mixed'],
    difficulty: DIFFICULTY.BEGINNER,
    startReps: 8,
    finalGoal: 15,
    unit: 'reps/arm',
    color: 'yellow',
    cue: 'One hand on bench, row dumbbell to hip.',
  },
  bicepCurl: {
    id: 'bicepCurl',
    name: 'Bicep Curl',
    pattern: 'vertical_pull',
    category: 'pull',
    equipment: ['dumbbells'],
    modes: ['gym', 'mixed'],
    difficulty: DIFFICULTY.BEGINNER,
    startReps: 10,
    finalGoal: 20,
    unit: 'reps',
    color: 'yellow',
    cue: 'Curl dumbbells up, squeeze biceps at top.',
  },
  facePull: {
    id: 'facePull',
    name: 'Face Pull',
    pattern: 'horizontal_pull',
    category: 'pull',
    equipment: ['cables'],
    modes: ['gym', 'mixed'],
    difficulty: DIFFICULTY.EASY,
    startReps: 12,
    finalGoal: 20,
    unit: 'reps',
    color: 'yellow',
    cue: 'Pull rope to face, spread hands, squeeze rear delts.',
  },

  // ============================================================
  // LEGACY ALIASES - For backward compatibility
  // These ensure user progress data works seamlessly
  // ============================================================

  pushups: {
    id: 'pushups',
    name: 'Push-Ups',
    pattern: 'horizontal_push',
    category: 'push',
    equipment: ['none'],
    modes: ['bodyweight', 'mixed'],
    difficulty: DIFFICULTY.BEGINNER,
    startReps: 10,
    finalGoal: 100,
    unit: 'reps',
    color: 'blue',
    cue: 'Hands shoulder width, lower chest to floor, push back up.',
  },
  squats: {
    id: 'squats',
    name: 'Squats',
    pattern: 'knee_dominant',
    category: 'legs',
    equipment: ['none'],
    modes: ['bodyweight', 'mixed'],
    difficulty: DIFFICULTY.BEGINNER,
    startReps: 15,
    finalGoal: 200,
    unit: 'reps',
    color: 'orange',
    cue: 'Sit back like into a chair, knees over toes, chest up.',
  },
  pullups: {
    id: 'pullups',
    name: 'Pull-Ups',
    pattern: 'vertical_pull',
    category: 'pull',
    equipment: ['pullupBar'],
    modes: ['bodyweight', 'mixed'],
    difficulty: DIFFICULTY.HARD,
    startReps: 1,
    finalGoal: 50,
    unit: 'reps',
    color: 'yellow',
    cue: 'Hang from bar, pull chin above bar, lower controlled.',
  },
  dips: {
    id: 'dips',
    name: 'Dips',
    pattern: 'vertical_push',
    category: 'push',
    equipment: ['dipBars'],
    modes: ['bodyweight', 'mixed'],
    difficulty: DIFFICULTY.MODERATE,
    startReps: 5,
    finalGoal: 50,
    unit: 'reps',
    color: 'pink',
    cue: 'Lower until upper arms parallel, push back up.',
  },
  glutebridge: {
    id: 'glutebridge',
    name: 'Single Leg Glute Bridge',
    pattern: 'hip_dominant',
    category: 'legs',
    equipment: ['none'],
    modes: ['bodyweight', 'mixed'],
    difficulty: DIFFICULTY.BEGINNER,
    startReps: 10,
    finalGoal: 50,
    unit: 'reps/leg',
    color: 'cyan',
    cue: 'One leg extended, drive hips up, squeeze glutes.',
  },
  vups: {
    id: 'vups',
    name: 'V-Ups',
    pattern: 'core_flexion',
    category: 'core',
    equipment: ['none'],
    modes: ['bodyweight', 'mixed'],
    difficulty: DIFFICULTY.MODERATE,
    startReps: 5,
    finalGoal: 100,
    unit: 'reps',
    color: 'emerald',
    cue: 'Lie flat, lift legs and torso to touch toes.',
  },
  lunges: {
    id: 'lunges',
    name: 'Lunges',
    pattern: 'knee_dominant',
    category: 'legs',
    equipment: ['none'],
    modes: ['bodyweight', 'mixed'],
    difficulty: DIFFICULTY.BEGINNER,
    startReps: 10,
    finalGoal: 50,
    unit: 'reps/leg',
    color: 'purple',
    cue: 'Step forward, lower back knee toward ground.',
  },
  supermans: {
    id: 'supermans',
    name: 'Supermans',
    pattern: 'hip_dominant',
    category: 'core',
    equipment: ['none'],
    modes: ['bodyweight', 'mixed'],
    difficulty: DIFFICULTY.BEGINNER,
    startReps: 10,
    finalGoal: 100,
    unit: 'reps',
    color: 'indigo',
    cue: 'Lie face down, lift arms and legs off ground.',
  },
}

/**
 * Get exercises filtered by criteria
 */
export function getExercises(filters = {}) {
  const { pattern, category, mode, equipment, difficulty, excludeIds = [] } = filters

  return Object.values(EXERCISES).filter(ex => {
    if (excludeIds.includes(ex.id)) return false
    if (pattern && ex.pattern !== pattern) return false
    if (category && ex.category !== category) return false
    if (mode && !ex.modes?.includes(mode)) return false
    if (equipment && !equipment.some(eq => ex.equipment?.includes(eq))) return false
    if (difficulty && ex.difficulty > difficulty) return false
    return true
  })
}

/**
 * Get exercises grouped by pattern
 */
export function getExercisesByPattern(mode = 'bodyweight', userEquipment = ['none']) {
  const grouped = {}

  Object.values(EXERCISES).forEach(ex => {
    if (!ex.modes?.includes(mode)) return

    // Check equipment availability
    const hasEquipment = ex.equipment?.every(eq =>
      eq === 'none' || userEquipment.includes(eq)
    )
    if (!hasEquipment) return

    if (!grouped[ex.pattern]) {
      grouped[ex.pattern] = []
    }
    grouped[ex.pattern].push(ex)
  })

  return grouped
}

// Export for backwards compatibility
export const EXERCISE_DATABASE = EXERCISES
