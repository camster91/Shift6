/**
 * Gym Exercise Database
 *
 * Contains all gym-based exercises with weight tracking support.
 * Organized by muscle groups and movement patterns.
 */

// Equipment types for gym
export const GYM_EQUIPMENT = {
  barbell: { id: 'barbell', name: 'Barbell', icon: '🏋️' },
  dumbbells: { id: 'dumbbells', name: 'Dumbbells', icon: '💪' },
  cables: { id: 'cables', name: 'Cable Machine', icon: '🔗' },
  machines: { id: 'machines', name: 'Machines', icon: '⚙️' },
  bench: { id: 'bench', name: 'Bench', icon: '🛋️' },
  rack: { id: 'rack', name: 'Squat Rack', icon: '🏗️' },
  pullupBar: { id: 'pullupBar', name: 'Pull-up Bar', icon: '🔩' },
}

// Muscle groups
export const MUSCLE_GROUPS = {
  chest: { id: 'chest', name: 'Chest', color: 'blue' },
  back: { id: 'back', name: 'Back', color: 'yellow' },
  shoulders: { id: 'shoulders', name: 'Shoulders', color: 'orange' },
  biceps: { id: 'biceps', name: 'Biceps', color: 'pink' },
  triceps: { id: 'triceps', name: 'Triceps', color: 'purple' },
  quads: { id: 'quads', name: 'Quads', color: 'emerald' },
  hamstrings: { id: 'hamstrings', name: 'Hamstrings', color: 'teal' },
  glutes: { id: 'glutes', name: 'Glutes', color: 'cyan' },
  calves: { id: 'calves', name: 'Calves', color: 'indigo' },
  core: { id: 'core', name: 'Core', color: 'amber' },
}

/**
 * Gym Exercises Database
 */
export const GYM_EXERCISES = {
  // ============================================================
  // CHEST
  // ============================================================
  benchPress: {
    id: 'benchPress',
    name: 'Barbell Bench Press',
    shortName: 'Bench Press',
    muscleGroup: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    equipment: ['barbell', 'bench', 'rack'],
    difficulty: 'intermediate',
    defaultWeight: 45, // kg
    weightIncrement: 2.5,
    defaultSets: 4,
    defaultReps: [8, 8, 8, 8],
    restSeconds: 90,
    cue: 'Arch back slightly, feet flat, lower to chest, press up explosively.',
    tips: ['Keep shoulders retracted', 'Control the descent', 'Full lockout at top'],
    videoId: 'rT7DgCr-3pg',
  },
  inclineBenchPress: {
    id: 'inclineBenchPress',
    name: 'Incline Barbell Press',
    shortName: 'Incline Press',
    muscleGroup: 'chest',
    secondaryMuscles: ['shoulders', 'triceps'],
    equipment: ['barbell', 'bench'],
    difficulty: 'intermediate',
    defaultWeight: 35,
    weightIncrement: 2.5,
    defaultSets: 4,
    defaultReps: [10, 10, 10, 10],
    restSeconds: 90,
    cue: 'Set bench to 30-45 degrees. Lower to upper chest.',
    tips: ['Targets upper chest', 'Dont flare elbows too wide'],
    videoId: 'SrqOu55lrYU',
  },
  dbBenchPress: {
    id: 'dbBenchPress',
    name: 'Dumbbell Bench Press',
    shortName: 'DB Bench',
    muscleGroup: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    equipment: ['dumbbells', 'bench'],
    difficulty: 'beginner',
    defaultWeight: 20,
    weightIncrement: 2.5,
    defaultSets: 4,
    defaultReps: [10, 10, 10, 10],
    restSeconds: 75,
    cue: 'Lower dumbbells to chest level, press up and together.',
    tips: ['Greater range of motion than barbell', 'Good for muscle imbalances'],
    videoId: 'VmB1G1K7v94',
  },
  cableFly: {
    id: 'cableFly',
    name: 'Cable Fly',
    shortName: 'Cable Fly',
    muscleGroup: 'chest',
    secondaryMuscles: [],
    equipment: ['cables'],
    difficulty: 'beginner',
    defaultWeight: 10,
    weightIncrement: 2.5,
    defaultSets: 3,
    defaultReps: [12, 12, 12],
    restSeconds: 60,
    cue: 'Slight bend in elbows, bring handles together in arc motion.',
    tips: ['Great chest isolation', 'Constant tension throughout'],
    videoId: 'Iwe6AmxVf7o',
  },
  chestDip: {
    id: 'chestDip',
    name: 'Chest Dips',
    shortName: 'Dips',
    muscleGroup: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    equipment: ['rack'],
    difficulty: 'intermediate',
    defaultWeight: 0, // bodyweight
    weightIncrement: 5,
    defaultSets: 3,
    defaultReps: [10, 10, 10],
    restSeconds: 90,
    cue: 'Lean forward, lower until stretch in chest, push up.',
    tips: ['Lean forward for chest focus', 'Add weight with belt when ready'],
    videoId: '2z8JmcrW-As',
  },

  // ============================================================
  // BACK
  // ============================================================
  deadlift: {
    id: 'deadlift',
    name: 'Barbell Deadlift',
    shortName: 'Deadlift',
    muscleGroup: 'back',
    secondaryMuscles: ['hamstrings', 'glutes', 'core'],
    equipment: ['barbell'],
    difficulty: 'advanced',
    defaultWeight: 60,
    weightIncrement: 5,
    defaultSets: 4,
    defaultReps: [5, 5, 5, 5],
    restSeconds: 120,
    cue: 'Hinge at hips, keep bar close, drive through heels.',
    tips: ['Keep back straight', 'Engage lats', 'Hip hinge not squat'],
    videoId: 'op9kVnSso6Q',
  },
  barbellRow: {
    id: 'barbellRow',
    name: 'Barbell Row',
    shortName: 'BB Row',
    muscleGroup: 'back',
    secondaryMuscles: ['biceps'],
    equipment: ['barbell'],
    difficulty: 'intermediate',
    defaultWeight: 40,
    weightIncrement: 2.5,
    defaultSets: 4,
    defaultReps: [8, 8, 8, 8],
    restSeconds: 90,
    cue: 'Hinge forward 45 degrees, pull bar to lower chest.',
    tips: ['Squeeze shoulder blades', 'Control the negative'],
    videoId: 'FWJR5Ve8bnQ',
  },
  latPulldown: {
    id: 'latPulldown',
    name: 'Lat Pulldown',
    shortName: 'Pulldown',
    muscleGroup: 'back',
    secondaryMuscles: ['biceps'],
    equipment: ['cables'],
    difficulty: 'beginner',
    defaultWeight: 40,
    weightIncrement: 5,
    defaultSets: 4,
    defaultReps: [10, 10, 10, 10],
    restSeconds: 75,
    cue: 'Pull bar to upper chest, squeeze lats at bottom.',
    tips: ['Dont lean back too far', 'Focus on lat contraction'],
    videoId: 'CAwf7n6Luuc',
  },
  seatedRow: {
    id: 'seatedRow',
    name: 'Seated Cable Row',
    shortName: 'Seated Row',
    muscleGroup: 'back',
    secondaryMuscles: ['biceps'],
    equipment: ['cables'],
    difficulty: 'beginner',
    defaultWeight: 40,
    weightIncrement: 5,
    defaultSets: 4,
    defaultReps: [10, 10, 10, 10],
    restSeconds: 75,
    cue: 'Sit upright, pull handle to stomach, squeeze back.',
    tips: ['Keep torso still', 'Full stretch at start'],
    videoId: 'GZbfZ033f74',
  },
  dbRow: {
    id: 'dbRow',
    name: 'Dumbbell Row',
    shortName: 'DB Row',
    muscleGroup: 'back',
    secondaryMuscles: ['biceps'],
    equipment: ['dumbbells', 'bench'],
    difficulty: 'beginner',
    defaultWeight: 20,
    weightIncrement: 2.5,
    defaultSets: 3,
    defaultReps: [10, 10, 10],
    restSeconds: 60,
    cue: 'One hand on bench, row dumbbell to hip.',
    tips: ['Keep back flat', 'Full range of motion'],
    videoId: 'pYcpY20QaE8',
  },
  pullUp: {
    id: 'pullUp',
    name: 'Pull-ups',
    shortName: 'Pull-ups',
    muscleGroup: 'back',
    secondaryMuscles: ['biceps'],
    equipment: ['pullupBar'],
    difficulty: 'intermediate',
    defaultWeight: 0,
    weightIncrement: 5,
    defaultSets: 4,
    defaultReps: [8, 8, 8, 8],
    restSeconds: 90,
    cue: 'Full hang, pull chin over bar, control descent.',
    tips: ['Engage lats to initiate', 'Add weight when 10+ reps easy'],
    videoId: 'eGo4IYlbE5g',
  },

  // ============================================================
  // SHOULDERS
  // ============================================================
  overheadPress: {
    id: 'overheadPress',
    name: 'Barbell Overhead Press',
    shortName: 'OHP',
    muscleGroup: 'shoulders',
    secondaryMuscles: ['triceps'],
    equipment: ['barbell', 'rack'],
    difficulty: 'intermediate',
    defaultWeight: 30,
    weightIncrement: 2.5,
    defaultSets: 4,
    defaultReps: [8, 8, 8, 8],
    restSeconds: 90,
    cue: 'Press bar overhead, lockout, lower to chin level.',
    tips: ['Brace core', 'Dont lean back excessively'],
    videoId: '_RlRDWO2jfg',
  },
  dbShoulderPress: {
    id: 'dbShoulderPress',
    name: 'Dumbbell Shoulder Press',
    shortName: 'DB Press',
    muscleGroup: 'shoulders',
    secondaryMuscles: ['triceps'],
    equipment: ['dumbbells', 'bench'],
    difficulty: 'beginner',
    defaultWeight: 15,
    weightIncrement: 2.5,
    defaultSets: 4,
    defaultReps: [10, 10, 10, 10],
    restSeconds: 75,
    cue: 'Press dumbbells overhead, touch at top.',
    tips: ['Seated or standing', 'Control the weight'],
    videoId: 'qEwKCR5JCog',
  },
  lateralRaise: {
    id: 'lateralRaise',
    name: 'Lateral Raise',
    shortName: 'Lat Raise',
    muscleGroup: 'shoulders',
    secondaryMuscles: [],
    equipment: ['dumbbells'],
    difficulty: 'beginner',
    defaultWeight: 8,
    weightIncrement: 1,
    defaultSets: 3,
    defaultReps: [15, 15, 15],
    restSeconds: 45,
    cue: 'Raise arms to sides until parallel to floor.',
    tips: ['Slight bend in elbows', 'Lead with elbows not hands'],
    videoId: '3VcKaXpzqRo',
  },
  facePull: {
    id: 'facePull',
    name: 'Face Pull',
    shortName: 'Face Pull',
    muscleGroup: 'shoulders',
    secondaryMuscles: ['back'],
    equipment: ['cables'],
    difficulty: 'beginner',
    defaultWeight: 15,
    weightIncrement: 2.5,
    defaultSets: 3,
    defaultReps: [15, 15, 15],
    restSeconds: 45,
    cue: 'Pull rope to face, externally rotate at end.',
    tips: ['Great for rear delts and posture', 'Light weight, high reps'],
    videoId: 'rep-qVOkqgk',
  },
  rearDeltFly: {
    id: 'rearDeltFly',
    name: 'Rear Delt Fly',
    shortName: 'Rear Fly',
    muscleGroup: 'shoulders',
    secondaryMuscles: ['back'],
    equipment: ['dumbbells'],
    difficulty: 'beginner',
    defaultWeight: 8,
    weightIncrement: 1,
    defaultSets: 3,
    defaultReps: [12, 12, 12],
    restSeconds: 45,
    cue: 'Bent over, raise arms to sides squeezing rear delts.',
    tips: ['Keep slight bend in elbows', 'Control the movement'],
    videoId: 'pYcpY20QaE8',
  },

  // ============================================================
  // ARMS
  // ============================================================
  barbellCurl: {
    id: 'barbellCurl',
    name: 'Barbell Curl',
    shortName: 'BB Curl',
    muscleGroup: 'biceps',
    secondaryMuscles: [],
    equipment: ['barbell'],
    difficulty: 'beginner',
    defaultWeight: 20,
    weightIncrement: 2.5,
    defaultSets: 3,
    defaultReps: [10, 10, 10],
    restSeconds: 60,
    cue: 'Keep elbows pinned, curl weight up, squeeze at top.',
    tips: ['No swinging', 'Control the negative'],
    videoId: 'kwG2ipFRgfo',
  },
  dbCurl: {
    id: 'dbCurl',
    name: 'Dumbbell Curl',
    shortName: 'DB Curl',
    muscleGroup: 'biceps',
    secondaryMuscles: [],
    equipment: ['dumbbells'],
    difficulty: 'beginner',
    defaultWeight: 12,
    weightIncrement: 2,
    defaultSets: 3,
    defaultReps: [10, 10, 10],
    restSeconds: 60,
    cue: 'Curl with supination, squeeze bicep at top.',
    tips: ['Alternate or together', 'Full range of motion'],
    videoId: 'ykJmrZ5v0Oo',
  },
  hammerCurl: {
    id: 'hammerCurl',
    name: 'Hammer Curl',
    shortName: 'Hammer',
    muscleGroup: 'biceps',
    secondaryMuscles: [],
    equipment: ['dumbbells'],
    difficulty: 'beginner',
    defaultWeight: 12,
    weightIncrement: 2,
    defaultSets: 3,
    defaultReps: [10, 10, 10],
    restSeconds: 60,
    cue: 'Neutral grip, curl up keeping wrist straight.',
    tips: ['Targets brachialis', 'Great for forearm development'],
    videoId: 'zC3nLlEvin4',
  },
  tricepPushdown: {
    id: 'tricepPushdown',
    name: 'Tricep Pushdown',
    shortName: 'Pushdown',
    muscleGroup: 'triceps',
    secondaryMuscles: [],
    equipment: ['cables'],
    difficulty: 'beginner',
    defaultWeight: 20,
    weightIncrement: 2.5,
    defaultSets: 3,
    defaultReps: [12, 12, 12],
    restSeconds: 45,
    cue: 'Keep elbows pinned to sides, push down until locked.',
    tips: ['Squeeze triceps at bottom', 'Dont let elbows drift'],
    videoId: '2-LAMcpzODU',
  },
  skullCrusher: {
    id: 'skullCrusher',
    name: 'Skull Crusher',
    shortName: 'Skulls',
    muscleGroup: 'triceps',
    secondaryMuscles: [],
    equipment: ['barbell', 'bench'],
    difficulty: 'intermediate',
    defaultWeight: 20,
    weightIncrement: 2.5,
    defaultSets: 3,
    defaultReps: [10, 10, 10],
    restSeconds: 60,
    cue: 'Lower bar to forehead, extend arms fully.',
    tips: ['Keep elbows pointed up', 'Can use EZ bar'],
    videoId: 'd_KZxkY_0cM',
  },
  overheadTricepExt: {
    id: 'overheadTricepExt',
    name: 'Overhead Tricep Extension',
    shortName: 'Overhead Ext',
    muscleGroup: 'triceps',
    secondaryMuscles: [],
    equipment: ['dumbbells'],
    difficulty: 'beginner',
    defaultWeight: 15,
    weightIncrement: 2.5,
    defaultSets: 3,
    defaultReps: [12, 12, 12],
    restSeconds: 60,
    cue: 'Hold dumbbell overhead, lower behind head, extend.',
    tips: ['Great stretch on triceps', 'Keep elbows close'],
    videoId: '_gsUck-7M74',
  },

  // ============================================================
  // LEGS
  // ============================================================
  squat: {
    id: 'squat',
    name: 'Barbell Squat',
    shortName: 'Squat',
    muscleGroup: 'quads',
    secondaryMuscles: ['glutes', 'hamstrings', 'core'],
    equipment: ['barbell', 'rack'],
    difficulty: 'intermediate',
    defaultWeight: 60,
    weightIncrement: 5,
    defaultSets: 4,
    defaultReps: [6, 6, 6, 6],
    restSeconds: 120,
    cue: 'Bar on upper back, squat to parallel or below, drive up.',
    tips: ['Keep knees tracking over toes', 'Brace core tight'],
    videoId: 'bEv6CCg2BC8',
  },
  frontSquat: {
    id: 'frontSquat',
    name: 'Front Squat',
    shortName: 'Front Squat',
    muscleGroup: 'quads',
    secondaryMuscles: ['glutes', 'core'],
    equipment: ['barbell', 'rack'],
    difficulty: 'advanced',
    defaultWeight: 40,
    weightIncrement: 5,
    defaultSets: 4,
    defaultReps: [8, 8, 8, 8],
    restSeconds: 120,
    cue: 'Bar on front delts, elbows high, squat deep.',
    tips: ['More quad dominant', 'Requires mobility'],
    videoId: 'uYumuL_G_V0',
  },
  legPress: {
    id: 'legPress',
    name: 'Leg Press',
    shortName: 'Leg Press',
    muscleGroup: 'quads',
    secondaryMuscles: ['glutes', 'hamstrings'],
    equipment: ['machines'],
    difficulty: 'beginner',
    defaultWeight: 100,
    weightIncrement: 10,
    defaultSets: 4,
    defaultReps: [10, 10, 10, 10],
    restSeconds: 90,
    cue: 'Lower sled until 90 degrees, press back up.',
    tips: ['Dont lock out knees', 'Keep lower back on pad'],
    videoId: 'IZxyjW7MPJQ',
  },
  legExtension: {
    id: 'legExtension',
    name: 'Leg Extension',
    shortName: 'Leg Ext',
    muscleGroup: 'quads',
    secondaryMuscles: [],
    equipment: ['machines'],
    difficulty: 'beginner',
    defaultWeight: 30,
    weightIncrement: 5,
    defaultSets: 3,
    defaultReps: [12, 12, 12],
    restSeconds: 60,
    cue: 'Extend legs until straight, squeeze quads.',
    tips: ['Isolation exercise', 'Control the negative'],
    videoId: 'YyvSfVjQeL0',
  },
  romanianDeadlift: {
    id: 'romanianDeadlift',
    name: 'Romanian Deadlift',
    shortName: 'RDL',
    muscleGroup: 'hamstrings',
    secondaryMuscles: ['glutes', 'back'],
    equipment: ['barbell'],
    difficulty: 'intermediate',
    defaultWeight: 40,
    weightIncrement: 5,
    defaultSets: 4,
    defaultReps: [10, 10, 10, 10],
    restSeconds: 90,
    cue: 'Hinge at hips, keep bar close, feel hamstring stretch.',
    tips: ['Slight knee bend', 'Dont round lower back'],
    videoId: 'jEy_czb3RKA',
  },
  legCurl: {
    id: 'legCurl',
    name: 'Leg Curl',
    shortName: 'Leg Curl',
    muscleGroup: 'hamstrings',
    secondaryMuscles: [],
    equipment: ['machines'],
    difficulty: 'beginner',
    defaultWeight: 25,
    weightIncrement: 5,
    defaultSets: 3,
    defaultReps: [12, 12, 12],
    restSeconds: 60,
    cue: 'Curl heels toward glutes, squeeze hamstrings.',
    tips: ['Lying or seated', 'Full range of motion'],
    videoId: '1Tq3QdYUuHs',
  },
  calfRaise: {
    id: 'calfRaise',
    name: 'Calf Raise',
    shortName: 'Calf Raise',
    muscleGroup: 'calves',
    secondaryMuscles: [],
    equipment: ['machines'],
    difficulty: 'beginner',
    defaultWeight: 50,
    weightIncrement: 5,
    defaultSets: 4,
    defaultReps: [15, 15, 15, 15],
    restSeconds: 45,
    cue: 'Rise onto toes, squeeze calves at top, lower with control.',
    tips: ['Full stretch at bottom', 'Pause at top'],
    videoId: 'gwLzBJYoWlI',
  },
  hipThrust: {
    id: 'hipThrust',
    name: 'Barbell Hip Thrust',
    shortName: 'Hip Thrust',
    muscleGroup: 'glutes',
    secondaryMuscles: ['hamstrings'],
    equipment: ['barbell', 'bench'],
    difficulty: 'intermediate',
    defaultWeight: 40,
    weightIncrement: 5,
    defaultSets: 4,
    defaultReps: [10, 10, 10, 10],
    restSeconds: 75,
    cue: 'Upper back on bench, drive hips up, squeeze glutes.',
    tips: ['Best glute builder', 'Tuck chin slightly'],
    videoId: 'SEdqd1n0cvg',
  },

  // ============================================================
  // CORE (Gym-specific)
  // ============================================================
  cableCrunch: {
    id: 'cableCrunch',
    name: 'Cable Crunch',
    shortName: 'Cable Crunch',
    muscleGroup: 'core',
    secondaryMuscles: [],
    equipment: ['cables'],
    difficulty: 'beginner',
    defaultWeight: 30,
    weightIncrement: 5,
    defaultSets: 3,
    defaultReps: [15, 15, 15],
    restSeconds: 45,
    cue: 'Kneel facing cable, crunch down bringing elbows to knees.',
    tips: ['Focus on ab contraction', 'Dont use hip flexors'],
    videoId: 'AV5PmrYrZeE',
  },
  hangingLegRaise: {
    id: 'hangingLegRaise',
    name: 'Hanging Leg Raise',
    shortName: 'Hanging Raise',
    muscleGroup: 'core',
    secondaryMuscles: [],
    equipment: ['pullupBar'],
    difficulty: 'intermediate',
    defaultWeight: 0,
    weightIncrement: 0,
    defaultSets: 3,
    defaultReps: [12, 12, 12],
    restSeconds: 60,
    cue: 'Hang from bar, raise legs until parallel or higher.',
    tips: ['Control the swing', 'Keep legs straight for harder'],
    videoId: 'hdng3Nm1x_E',
  },
}

/**
 * Gym Program Templates
 * Organized by difficulty level with recommended defaults
 */
export const GYM_PROGRAMS = {
  // ========== RECOMMENDED DEFAULT ==========
  'gym-starter': {
    id: 'gym-starter',
    name: 'Gym Starter',
    desc: 'Recommended - Perfect introduction to weight training',
    longDesc: 'The ideal starting program for gym beginners. Learn proper form on fundamental movements with manageable volume. Builds a solid strength foundation.',
    difficulty: 'beginner',
    daysPerWeek: 3,
    sessionDuration: 40,
    goal: 'strength',
    recommended: true,
    isDefault: true,
    split: [
      {
        name: 'Day A - Upper',
        muscleGroups: ['chest', 'back', 'shoulders'],
        exercises: ['benchPress', 'latPulldown', 'dbShoulderPress', 'seatedRow'],
      },
      {
        name: 'Day B - Lower',
        muscleGroups: ['quads', 'hamstrings', 'glutes'],
        exercises: ['squat', 'romanianDeadlift', 'legPress', 'calfRaise'],
      },
      {
        name: 'Day C - Full Body',
        muscleGroups: ['chest', 'back', 'legs', 'arms'],
        exercises: ['dbBenchPress', 'barbellRow', 'legPress', 'barbellCurl', 'tricepPushdown'],
      },
    ],
    tags: ['recommended', 'beginner-friendly', 'foundation'],
  },

  // ========== BEGINNER PROGRAMS (2-3 days/week) ==========
  'ppl-beginner': {
    id: 'ppl-beginner',
    name: 'Push/Pull/Legs',
    desc: 'Classic 3-day split - train each pattern once per week',
    longDesc: 'The tried and true PPL split. Push day targets chest, shoulders, and triceps. Pull day hits back and biceps. Legs day covers quads, hamstrings, glutes, and calves.',
    difficulty: 'beginner',
    daysPerWeek: 3,
    sessionDuration: 45,
    goal: 'hypertrophy',
    split: [
      {
        name: 'Push Day',
        muscleGroups: ['chest', 'shoulders', 'triceps'],
        exercises: ['benchPress', 'dbShoulderPress', 'inclineBenchPress', 'lateralRaise', 'tricepPushdown', 'cableFly'],
      },
      {
        name: 'Pull Day',
        muscleGroups: ['back', 'biceps'],
        exercises: ['deadlift', 'latPulldown', 'barbellRow', 'facePull', 'barbellCurl', 'hammerCurl'],
      },
      {
        name: 'Legs Day',
        muscleGroups: ['quads', 'hamstrings', 'glutes', 'calves'],
        exercises: ['squat', 'romanianDeadlift', 'legPress', 'legCurl', 'calfRaise', 'hipThrust'],
      },
    ],
    tags: ['classic', 'balanced', 'beginner-friendly'],
  },

  'ppl-6day': {
    id: 'ppl-6day',
    name: 'PPL 6-Day',
    desc: 'Push/Pull/Legs twice per week for maximum gains',
    longDesc: 'Train each muscle group twice per week with the 6-day PPL split. Higher frequency means more growth stimulus.',
    difficulty: 'intermediate',
    daysPerWeek: 6,
    sessionDuration: 50,
    goal: 'hypertrophy',
    split: [
      {
        name: 'Push A',
        muscleGroups: ['chest', 'shoulders', 'triceps'],
        exercises: ['benchPress', 'overheadPress', 'inclineBenchPress', 'lateralRaise', 'tricepPushdown'],
      },
      {
        name: 'Pull A',
        muscleGroups: ['back', 'biceps'],
        exercises: ['deadlift', 'latPulldown', 'barbellRow', 'facePull', 'barbellCurl'],
      },
      {
        name: 'Legs A',
        muscleGroups: ['quads', 'hamstrings', 'glutes'],
        exercises: ['squat', 'romanianDeadlift', 'legPress', 'legCurl', 'calfRaise'],
      },
      {
        name: 'Push B',
        muscleGroups: ['chest', 'shoulders', 'triceps'],
        exercises: ['dbBenchPress', 'dbShoulderPress', 'cableFly', 'rearDeltFly', 'skullCrusher'],
      },
      {
        name: 'Pull B',
        muscleGroups: ['back', 'biceps'],
        exercises: ['pullUp', 'seatedRow', 'dbRow', 'facePull', 'dbCurl', 'hammerCurl'],
      },
      {
        name: 'Legs B',
        muscleGroups: ['quads', 'hamstrings', 'glutes', 'calves'],
        exercises: ['frontSquat', 'hipThrust', 'legExtension', 'legCurl', 'calfRaise'],
      },
    ],
    tags: ['high-frequency', 'advanced', 'muscle-building'],
  },

  // Upper/Lower Split
  'upper-lower': {
    id: 'upper-lower',
    name: 'Upper/Lower',
    desc: '4-day split alternating upper and lower body',
    longDesc: 'A balanced 4-day split that hits everything twice per week. Great for intermediate lifters wanting to progress on the big compounds.',
    difficulty: 'intermediate',
    daysPerWeek: 4,
    sessionDuration: 50,
    goal: 'strength',
    split: [
      {
        name: 'Upper A',
        muscleGroups: ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
        exercises: ['benchPress', 'barbellRow', 'overheadPress', 'latPulldown', 'barbellCurl', 'tricepPushdown'],
      },
      {
        name: 'Lower A',
        muscleGroups: ['quads', 'hamstrings', 'glutes', 'calves'],
        exercises: ['squat', 'romanianDeadlift', 'legPress', 'legCurl', 'calfRaise'],
      },
      {
        name: 'Upper B',
        muscleGroups: ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
        exercises: ['dbBenchPress', 'pullUp', 'dbShoulderPress', 'seatedRow', 'dbCurl', 'skullCrusher'],
      },
      {
        name: 'Lower B',
        muscleGroups: ['quads', 'hamstrings', 'glutes', 'calves'],
        exercises: ['deadlift', 'frontSquat', 'hipThrust', 'legExtension', 'calfRaise'],
      },
    ],
    tags: ['balanced', 'strength-focus', '4-day'],
  },

  // Full Body
  'full-body-3day': {
    id: 'full-body-3day',
    name: 'Full Body 3x',
    desc: 'Hit everything 3 times per week with compound movements',
    longDesc: 'Perfect for beginners or busy schedules. Each session covers all major muscle groups with the most effective exercises.',
    difficulty: 'beginner',
    daysPerWeek: 3,
    sessionDuration: 60,
    goal: 'strength',
    split: [
      {
        name: 'Full Body A',
        muscleGroups: ['chest', 'back', 'quads', 'shoulders', 'core'],
        exercises: ['squat', 'benchPress', 'barbellRow', 'overheadPress', 'cableCrunch'],
      },
      {
        name: 'Full Body B',
        muscleGroups: ['back', 'chest', 'hamstrings', 'shoulders', 'core'],
        exercises: ['deadlift', 'dbBenchPress', 'latPulldown', 'dbShoulderPress', 'hangingLegRaise'],
      },
      {
        name: 'Full Body C',
        muscleGroups: ['quads', 'back', 'chest', 'arms', 'calves'],
        exercises: ['frontSquat', 'pullUp', 'inclineBenchPress', 'barbellCurl', 'tricepPushdown', 'calfRaise'],
      },
    ],
    tags: ['beginner', 'efficient', 'compounds'],
  },

  // Bro Split
  'bro-split': {
    id: 'bro-split',
    name: 'Classic Bro Split',
    desc: 'One muscle group per day, 5-day split',
    longDesc: 'The classic bodybuilding split. Dedicate an entire session to each muscle group for maximum volume and pump.',
    difficulty: 'intermediate',
    daysPerWeek: 5,
    sessionDuration: 60,
    goal: 'hypertrophy',
    split: [
      {
        name: 'Chest Day',
        muscleGroups: ['chest'],
        exercises: ['benchPress', 'inclineBenchPress', 'dbBenchPress', 'cableFly', 'chestDip'],
      },
      {
        name: 'Back Day',
        muscleGroups: ['back'],
        exercises: ['deadlift', 'pullUp', 'barbellRow', 'latPulldown', 'seatedRow', 'dbRow'],
      },
      {
        name: 'Shoulders Day',
        muscleGroups: ['shoulders'],
        exercises: ['overheadPress', 'dbShoulderPress', 'lateralRaise', 'facePull', 'rearDeltFly'],
      },
      {
        name: 'Legs Day',
        muscleGroups: ['quads', 'hamstrings', 'glutes', 'calves'],
        exercises: ['squat', 'legPress', 'romanianDeadlift', 'legExtension', 'legCurl', 'calfRaise'],
      },
      {
        name: 'Arms Day',
        muscleGroups: ['biceps', 'triceps'],
        exercises: ['barbellCurl', 'skullCrusher', 'dbCurl', 'tricepPushdown', 'hammerCurl', 'overheadTricepExt'],
      },
    ],
    tags: ['bodybuilding', 'high-volume', 'classic'],
  },

  // Strength Focus
  'strength-5x5': {
    id: 'strength-5x5',
    name: 'Strength 5x5',
    desc: 'Simple and effective strength program',
    longDesc: 'Based on classic strength programs like StrongLifts. Focus on progressive overload with the big compound lifts.',
    difficulty: 'beginner',
    daysPerWeek: 3,
    sessionDuration: 45,
    goal: 'strength',
    split: [
      {
        name: 'Workout A',
        muscleGroups: ['quads', 'chest', 'back'],
        exercises: ['squat', 'benchPress', 'barbellRow'],
        defaultSets: 5,
        defaultReps: [5, 5, 5, 5, 5],
      },
      {
        name: 'Workout B',
        muscleGroups: ['quads', 'shoulders', 'back'],
        exercises: ['squat', 'overheadPress', 'deadlift'],
        defaultSets: 5,
        defaultReps: [5, 5, 5, 5, 5],
      },
    ],
    tags: ['strength', 'beginner', '5x5', 'simple'],
  },

  // ========== MORE BEGINNER PROGRAMS ==========
  'beginner-machines': {
    id: 'beginner-machines',
    name: 'Machine Starter',
    desc: 'Learn gym basics with guided machines',
    longDesc: 'Perfect for complete beginners. Machine exercises provide stability and safety while you learn movement patterns.',
    difficulty: 'beginner',
    daysPerWeek: 3,
    sessionDuration: 35,
    goal: 'hypertrophy',
    split: [
      {
        name: 'Upper Body',
        muscleGroups: ['chest', 'back', 'shoulders'],
        exercises: ['chestPressMachine', 'latPulldown', 'shoulderPressMachine', 'seatedRow'],
      },
      {
        name: 'Lower Body',
        muscleGroups: ['quads', 'hamstrings', 'calves'],
        exercises: ['legPress', 'legExtension', 'legCurl', 'calfRaise'],
      },
      {
        name: 'Full Body',
        muscleGroups: ['chest', 'back', 'legs', 'arms'],
        exercises: ['chestPressMachine', 'seatedRow', 'legPress', 'bicepCurlMachine', 'tricepPushdown'],
      },
    ],
    tags: ['beginner', 'machines', 'safe', 'guided'],
  },

  'beginner-dumbbells': {
    id: 'beginner-dumbbells',
    name: 'Dumbbell Only',
    desc: 'Full program using just dumbbells',
    longDesc: 'No barbells needed. Great for home gyms or crowded commercial gyms. Dumbbells allow natural movement patterns.',
    difficulty: 'beginner',
    daysPerWeek: 3,
    sessionDuration: 40,
    goal: 'hypertrophy',
    split: [
      {
        name: 'Push Day',
        muscleGroups: ['chest', 'shoulders', 'triceps'],
        exercises: ['dbBenchPress', 'dbShoulderPress', 'dbInclinePress', 'lateralRaise', 'overheadTricepExt'],
      },
      {
        name: 'Pull Day',
        muscleGroups: ['back', 'biceps'],
        exercises: ['dbRow', 'dbPullover', 'dbCurl', 'hammerCurl', 'facePull'],
      },
      {
        name: 'Legs Day',
        muscleGroups: ['quads', 'hamstrings', 'glutes'],
        exercises: ['dbGobletSquat', 'dbRomanianDeadlift', 'dbLunge', 'dbHipThrust', 'calfRaise'],
      },
    ],
    tags: ['beginner', 'dumbbells', 'minimal-equipment'],
  },

  // ========== INTERMEDIATE PROGRAMS (3-5 days/week) ==========
  'intermediate-hypertrophy': {
    id: 'intermediate-hypertrophy',
    name: 'Hypertrophy Focus',
    desc: 'High volume training for muscle growth',
    longDesc: 'Designed for building muscle mass with moderate weights and higher rep ranges. Perfect for those past the beginner gains phase.',
    difficulty: 'intermediate',
    daysPerWeek: 4,
    sessionDuration: 55,
    goal: 'hypertrophy',
    split: [
      {
        name: 'Chest & Triceps',
        muscleGroups: ['chest', 'triceps'],
        exercises: ['benchPress', 'inclineBenchPress', 'dbBenchPress', 'cableFly', 'tricepPushdown', 'skullCrusher'],
      },
      {
        name: 'Back & Biceps',
        muscleGroups: ['back', 'biceps'],
        exercises: ['deadlift', 'latPulldown', 'barbellRow', 'seatedRow', 'barbellCurl', 'hammerCurl'],
      },
      {
        name: 'Shoulders & Arms',
        muscleGroups: ['shoulders', 'biceps', 'triceps'],
        exercises: ['overheadPress', 'lateralRaise', 'rearDeltFly', 'facePull', 'dbCurl', 'overheadTricepExt'],
      },
      {
        name: 'Legs',
        muscleGroups: ['quads', 'hamstrings', 'glutes', 'calves'],
        exercises: ['squat', 'romanianDeadlift', 'legPress', 'legExtension', 'legCurl', 'calfRaise'],
      },
    ],
    tags: ['intermediate', 'muscle-building', 'high-volume'],
  },

  'intermediate-strength': {
    id: 'intermediate-strength',
    name: 'Strength & Power',
    desc: 'Build raw strength with progressive overload',
    longDesc: 'Focus on the big compound lifts with lower reps and heavier weights. Includes accessory work for balanced development.',
    difficulty: 'intermediate',
    daysPerWeek: 4,
    sessionDuration: 60,
    goal: 'strength',
    split: [
      {
        name: 'Squat Day',
        muscleGroups: ['quads', 'glutes', 'core'],
        exercises: ['squat', 'frontSquat', 'legPress', 'legExtension', 'cableCrunch'],
      },
      {
        name: 'Bench Day',
        muscleGroups: ['chest', 'shoulders', 'triceps'],
        exercises: ['benchPress', 'inclineBenchPress', 'dbShoulderPress', 'tricepPushdown', 'lateralRaise'],
      },
      {
        name: 'Deadlift Day',
        muscleGroups: ['back', 'hamstrings', 'glutes'],
        exercises: ['deadlift', 'barbellRow', 'romanianDeadlift', 'latPulldown', 'facePull'],
      },
      {
        name: 'Overhead Day',
        muscleGroups: ['shoulders', 'triceps', 'back'],
        exercises: ['overheadPress', 'pullUp', 'lateralRaise', 'rearDeltFly', 'skullCrusher'],
      },
    ],
    tags: ['intermediate', 'strength', 'powerlifting'],
  },

  'arnold-split': {
    id: 'arnold-split',
    name: 'Arnold Split',
    desc: 'Classic 6-day bodybuilding split',
    longDesc: 'The legendary split used by Arnold Schwarzenegger. High volume, high frequency, maximum gains.',
    difficulty: 'intermediate',
    daysPerWeek: 6,
    sessionDuration: 60,
    goal: 'hypertrophy',
    split: [
      {
        name: 'Chest & Back',
        muscleGroups: ['chest', 'back'],
        exercises: ['benchPress', 'pullUp', 'inclineBenchPress', 'barbellRow', 'cableFly', 'latPulldown'],
      },
      {
        name: 'Shoulders & Arms',
        muscleGroups: ['shoulders', 'biceps', 'triceps'],
        exercises: ['overheadPress', 'barbellCurl', 'skullCrusher', 'lateralRaise', 'dbCurl', 'tricepPushdown'],
      },
      {
        name: 'Legs',
        muscleGroups: ['quads', 'hamstrings', 'calves'],
        exercises: ['squat', 'legPress', 'romanianDeadlift', 'legCurl', 'legExtension', 'calfRaise'],
      },
      {
        name: 'Chest & Back 2',
        muscleGroups: ['chest', 'back'],
        exercises: ['dbBenchPress', 'seatedRow', 'cableFly', 'dbRow', 'chestDip', 'facePull'],
      },
      {
        name: 'Shoulders & Arms 2',
        muscleGroups: ['shoulders', 'biceps', 'triceps'],
        exercises: ['dbShoulderPress', 'hammerCurl', 'overheadTricepExt', 'rearDeltFly', 'preacherCurl', 'tricepDip'],
      },
      {
        name: 'Legs 2',
        muscleGroups: ['quads', 'hamstrings', 'glutes', 'calves'],
        exercises: ['frontSquat', 'hipThrust', 'legCurl', 'legExtension', 'dbLunge', 'calfRaise'],
      },
    ],
    tags: ['intermediate', 'classic', 'bodybuilding', 'high-frequency'],
  },

  'push-pull': {
    id: 'push-pull',
    name: 'Push/Pull',
    desc: '4-day alternating push and pull movements',
    longDesc: 'Simple yet effective. Push days hit chest, shoulders, triceps, and quads. Pull days work back, biceps, and hamstrings.',
    difficulty: 'intermediate',
    daysPerWeek: 4,
    sessionDuration: 50,
    goal: 'balanced',
    split: [
      {
        name: 'Push A',
        muscleGroups: ['chest', 'shoulders', 'triceps', 'quads'],
        exercises: ['benchPress', 'squat', 'overheadPress', 'legPress', 'tricepPushdown'],
      },
      {
        name: 'Pull A',
        muscleGroups: ['back', 'biceps', 'hamstrings'],
        exercises: ['deadlift', 'latPulldown', 'barbellRow', 'legCurl', 'barbellCurl'],
      },
      {
        name: 'Push B',
        muscleGroups: ['chest', 'shoulders', 'triceps', 'quads'],
        exercises: ['dbBenchPress', 'frontSquat', 'dbShoulderPress', 'lateralRaise', 'skullCrusher'],
      },
      {
        name: 'Pull B',
        muscleGroups: ['back', 'biceps', 'hamstrings'],
        exercises: ['barbellRow', 'pullUp', 'romanianDeadlift', 'seatedRow', 'hammerCurl'],
      },
    ],
    tags: ['intermediate', 'balanced', '4-day'],
  },

  // ========== ADVANCED PROGRAMS (5-6 days/week) ==========
  'advanced-powerbuilding': {
    id: 'advanced-powerbuilding',
    name: 'Powerbuilding',
    desc: 'Strength meets hypertrophy - best of both worlds',
    longDesc: 'Combines heavy compound lifts for strength with higher volume accessory work for muscle growth. For experienced lifters.',
    difficulty: 'advanced',
    daysPerWeek: 5,
    sessionDuration: 70,
    goal: 'balanced',
    split: [
      {
        name: 'Heavy Squat',
        muscleGroups: ['quads', 'glutes', 'core'],
        exercises: ['squat', 'frontSquat', 'legPress', 'legExtension', 'hangingLegRaise'],
      },
      {
        name: 'Heavy Bench',
        muscleGroups: ['chest', 'shoulders', 'triceps'],
        exercises: ['benchPress', 'inclineBenchPress', 'dbBenchPress', 'tricepPushdown', 'lateralRaise'],
      },
      {
        name: 'Heavy Deadlift',
        muscleGroups: ['back', 'hamstrings', 'glutes'],
        exercises: ['deadlift', 'romanianDeadlift', 'barbellRow', 'latPulldown', 'legCurl'],
      },
      {
        name: 'Volume Upper',
        muscleGroups: ['chest', 'back', 'shoulders', 'arms'],
        exercises: ['dbBenchPress', 'pullUp', 'dbShoulderPress', 'seatedRow', 'barbellCurl', 'skullCrusher'],
      },
      {
        name: 'Volume Lower',
        muscleGroups: ['quads', 'hamstrings', 'glutes', 'calves'],
        exercises: ['legPress', 'hipThrust', 'legExtension', 'legCurl', 'dbLunge', 'calfRaise'],
      },
    ],
    tags: ['advanced', 'powerbuilding', 'strength', 'hypertrophy'],
  },

  'advanced-ppl-intense': {
    id: 'advanced-ppl-intense',
    name: 'Intense PPL',
    desc: '6-day PPL with advanced techniques',
    longDesc: 'High intensity PPL split with drop sets, rest-pause, and progressive overload. For advanced lifters seeking maximum gains.',
    difficulty: 'advanced',
    daysPerWeek: 6,
    sessionDuration: 60,
    goal: 'hypertrophy',
    split: [
      {
        name: 'Push - Strength',
        muscleGroups: ['chest', 'shoulders', 'triceps'],
        exercises: ['benchPress', 'overheadPress', 'dbBenchPress', 'lateralRaise', 'tricepPushdown', 'cableFly'],
      },
      {
        name: 'Pull - Strength',
        muscleGroups: ['back', 'biceps'],
        exercises: ['deadlift', 'pullUp', 'barbellRow', 'facePull', 'barbellCurl', 'hammerCurl'],
      },
      {
        name: 'Legs - Strength',
        muscleGroups: ['quads', 'hamstrings', 'glutes', 'calves'],
        exercises: ['squat', 'romanianDeadlift', 'legPress', 'legCurl', 'hipThrust', 'calfRaise'],
      },
      {
        name: 'Push - Volume',
        muscleGroups: ['chest', 'shoulders', 'triceps'],
        exercises: ['inclineBenchPress', 'dbShoulderPress', 'cableFly', 'rearDeltFly', 'skullCrusher', 'chestDip'],
      },
      {
        name: 'Pull - Volume',
        muscleGroups: ['back', 'biceps'],
        exercises: ['latPulldown', 'seatedRow', 'dbRow', 'facePull', 'dbCurl', 'preacherCurl'],
      },
      {
        name: 'Legs - Volume',
        muscleGroups: ['quads', 'hamstrings', 'glutes', 'calves'],
        exercises: ['frontSquat', 'hipThrust', 'legExtension', 'legCurl', 'dbLunge', 'calfRaise'],
      },
    ],
    tags: ['advanced', 'high-intensity', 'ppl', '6-day'],
  },

  'advanced-athlete': {
    id: 'advanced-athlete',
    name: 'Athletic Performance',
    desc: 'Power, strength, and conditioning combined',
    longDesc: 'Designed for athletes seeking functional strength, explosive power, and conditioning. Includes compound movements and athletic drills.',
    difficulty: 'advanced',
    daysPerWeek: 5,
    sessionDuration: 65,
    goal: 'strength',
    split: [
      {
        name: 'Power Day',
        muscleGroups: ['full body'],
        exercises: ['deadlift', 'benchPress', 'pullUp', 'overheadPress', 'barbellRow'],
      },
      {
        name: 'Lower Strength',
        muscleGroups: ['quads', 'hamstrings', 'glutes'],
        exercises: ['squat', 'romanianDeadlift', 'legPress', 'hipThrust', 'calfRaise'],
      },
      {
        name: 'Upper Strength',
        muscleGroups: ['chest', 'back', 'shoulders'],
        exercises: ['benchPress', 'pullUp', 'overheadPress', 'barbellRow', 'facePull'],
      },
      {
        name: 'Lower Volume',
        muscleGroups: ['quads', 'hamstrings', 'glutes', 'calves'],
        exercises: ['frontSquat', 'legCurl', 'legExtension', 'dbLunge', 'calfRaise'],
      },
      {
        name: 'Upper Volume',
        muscleGroups: ['chest', 'back', 'shoulders', 'arms'],
        exercises: ['dbBenchPress', 'seatedRow', 'lateralRaise', 'barbellCurl', 'tricepPushdown'],
      },
    ],
    tags: ['advanced', 'athletic', 'performance', 'functional'],
  },

  'advanced-specialization': {
    id: 'advanced-specialization',
    name: 'Chest Specialization',
    desc: 'Extra chest volume for lagging development',
    longDesc: 'A program for advanced lifters wanting to bring up their chest. Increased frequency and volume for chest while maintaining other muscle groups.',
    difficulty: 'advanced',
    daysPerWeek: 5,
    sessionDuration: 55,
    goal: 'hypertrophy',
    split: [
      {
        name: 'Chest Focus',
        muscleGroups: ['chest', 'triceps'],
        exercises: ['benchPress', 'inclineBenchPress', 'dbBenchPress', 'cableFly', 'tricepPushdown'],
      },
      {
        name: 'Back & Biceps',
        muscleGroups: ['back', 'biceps'],
        exercises: ['deadlift', 'pullUp', 'barbellRow', 'seatedRow', 'barbellCurl'],
      },
      {
        name: 'Legs',
        muscleGroups: ['quads', 'hamstrings', 'glutes', 'calves'],
        exercises: ['squat', 'romanianDeadlift', 'legPress', 'legCurl', 'calfRaise'],
      },
      {
        name: 'Chest & Shoulders',
        muscleGroups: ['chest', 'shoulders'],
        exercises: ['inclineBenchPress', 'dbBenchPress', 'overheadPress', 'lateralRaise', 'cableFly'],
      },
      {
        name: 'Arms & Accessories',
        muscleGroups: ['biceps', 'triceps', 'shoulders'],
        exercises: ['barbellCurl', 'skullCrusher', 'hammerCurl', 'facePull', 'rearDeltFly'],
      },
    ],
    tags: ['advanced', 'specialization', 'chest-focus'],
  },

  'advanced-minimalist': {
    id: 'advanced-minimalist',
    name: 'Minimalist Strength',
    desc: 'Maximum results with minimum exercises',
    longDesc: 'For busy advanced lifters. Focus only on the most effective compound movements. High intensity, low volume, maximum efficiency.',
    difficulty: 'advanced',
    daysPerWeek: 4,
    sessionDuration: 45,
    goal: 'strength',
    split: [
      {
        name: 'Squat & Press',
        muscleGroups: ['quads', 'chest', 'triceps'],
        exercises: ['squat', 'benchPress', 'dbShoulderPress'],
      },
      {
        name: 'Hinge & Pull',
        muscleGroups: ['back', 'hamstrings', 'biceps'],
        exercises: ['deadlift', 'pullUp', 'barbellRow'],
      },
      {
        name: 'Press & Squat',
        muscleGroups: ['chest', 'shoulders', 'quads'],
        exercises: ['benchPress', 'overheadPress', 'frontSquat'],
      },
      {
        name: 'Pull & Hinge',
        muscleGroups: ['back', 'hamstrings', 'glutes'],
        exercises: ['barbellRow', 'romanianDeadlift', 'latPulldown'],
      },
    ],
    tags: ['advanced', 'minimalist', 'efficient', 'strength'],
  },
}

/**
 * Get exercises for a muscle group
 */
export function getExercisesForMuscle(muscleGroup) {
  return Object.values(GYM_EXERCISES).filter(
    ex => ex.muscleGroup === muscleGroup || ex.secondaryMuscles?.includes(muscleGroup)
  )
}

/**
 * Get exercise by ID
 */
export function getGymExercise(id) {
  return GYM_EXERCISES[id] || null
}

/**
 * Get program by ID
 */
export function getGymProgram(id) {
  return GYM_PROGRAMS[id] || null
}

/**
 * Filter programs by difficulty (legacy)
 */
export function filterProgramsByDifficulty(difficulty) {
  return Object.values(GYM_PROGRAMS).filter(p => p.difficulty === difficulty)
}

/**
 * Get gym programs filtered by difficulty level
 * @param {string} difficulty - 'beginner' | 'intermediate' | 'advanced' | 'all'
 * @returns {Array} Array of program objects sorted by recommendation
 */
export function getGymProgramsByDifficulty(difficulty = 'all') {
  return Object.entries(GYM_PROGRAMS)
    .filter(([, program]) => {
      if (difficulty === 'all') return true
      return program.difficulty === difficulty
    })
    .map(([id, program]) => ({ id, ...program }))
    .sort((a, b) => {
      // Sort recommended first, then by days per week
      if (a.recommended && !b.recommended) return -1
      if (!a.recommended && b.recommended) return 1
      if (a.isDefault && !b.isDefault) return -1
      if (!a.isDefault && b.isDefault) return 1
      return (a.daysPerWeek || 3) - (b.daysPerWeek || 3)
    })
}

/**
 * Get recommended gym program for experience level
 * @param {string} experienceLevel - 'beginner' | 'intermediate' | 'advanced'
 * @returns {Object|null} Recommended program
 */
export function getRecommendedGymProgram(experienceLevel) {
  const programs = getGymProgramsByDifficulty(experienceLevel)
  return programs[0] || getGymProgramsByDifficulty('beginner')[0]
}

/**
 * Get all gym programs grouped by difficulty
 * @returns {Object} Programs grouped by difficulty level
 */
export function getAllGymProgramsByDifficulty() {
  return {
    beginner: getGymProgramsByDifficulty('beginner'),
    intermediate: getGymProgramsByDifficulty('intermediate'),
    advanced: getGymProgramsByDifficulty('advanced')
  }
}

/**
 * Gym difficulty labels for UI
 */
export const GYM_DIFFICULTY_LABELS = {
  beginner: { name: 'Beginner', color: 'emerald', icon: '🌱' },
  intermediate: { name: 'Intermediate', color: 'blue', icon: '💪' },
  advanced: { name: 'Advanced', color: 'purple', icon: '🏆' },
}
