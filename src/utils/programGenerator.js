/**
 * Intelligent Program Generator
 * Generates personalized workout programs based on user preferences
 */

// Movement pattern definitions for balanced programming
export const MOVEMENT_PATTERNS = {
  // Upper Body Push
  horizontal_push: ['pushups', 'kneePushups', 'wallPushups', 'widePushups', 'diamondPushups', 'declinePushups', 'archerPushups', 'clapPushups', 'oneArmPushups', 'hinduPushups', 'pseudoPlanchePushups', 'benchPress', 'inclineBenchPress', 'dumbbellPress', 'dumbbellFlyes', 'cableFlyes', 'closeGripBench'],
  vertical_push: ['pikePushups', 'overheadPress', 'dips', 'weightedDips', 'tricepPushdowns', 'skullCrushers'],

  // Upper Body Pull
  horizontal_pull: ['australianRows', 'barbellRows', 'dumbbellRows', 'cableRows'],
  vertical_pull: ['pullups', 'chinups', 'negativePullups', 'commandoPullups', 'lsitPullups', 'towelPullups', 'latPulldowns', 'weightedPullups', 'scapularPulls'],

  // Lower Body
  knee_dominant: ['squats', 'jumpSquats', 'splitSquats', 'pistolSquats', 'cossackSquats', 'shrimpSquats', 'wallSits', 'lunges', 'stepUps', 'backSquat', 'frontSquat', 'legPress', 'gobletSquats', 'bulgarianSplitSquats', 'weightedLunges', 'weightedStepUps', 'legExtensions', 'reverseNordicCurls'],
  hip_dominant: ['glutebridge', 'gluteBridges', 'deadlift', 'romanianDeadlift', 'hipThrusts', 'legCurls'],

  // Core
  anti_extension: ['plank', 'hollowBodyHold', 'deadBugs', 'weightedPlanks', 'abWheelRollouts'],
  anti_rotation: ['pallofPress', 'birdDogs'],
  flexion: ['vups', 'legRaises', 'bicycleCrunches', 'reverseCrunches', 'mountainClimbers', 'flutterKicks', 'toesToBar', 'hangingLegRaises', 'cableCrunches', 'declineSitups', 'dragonFlags'],
  extension: ['supermans'],
  rotation: ['russianTwists', 'cableWoodchops', 'weightedRussianTwists'],

  // Full Body / Cardio
  full_body: ['burpees', 'bearCrawls', 'inchworms', 'jumpingJacks', 'highKnees', 'skaterJumps', 'boxJumps', 'broadJumps'],

  // Isolation / Accessory
  arms: ['bicepCurls', 'hammerCurls', 'tricepPushdowns', 'skullCrushers'],
  calves: ['calfRaises', 'weightedCalfRaises'],
  grip: ['deadHangs', 'shrugs'],
}

// Exercise metadata - complexity, patterns, goal alignment
export const EXERCISE_METADATA = {
  // === PUSH - Bodyweight ===
  wallPushups: { complexity: 1, pattern: 'horizontal_push', primaryMuscles: ['chest', 'triceps'], secondaryMuscles: ['shoulders'], goalAlignment: { strength: 0.3, hypertrophy: 0.4, endurance: 0.9 }, timePerSet: 30 },
  kneePushups: { complexity: 1, pattern: 'horizontal_push', primaryMuscles: ['chest', 'triceps'], secondaryMuscles: ['shoulders', 'core'], goalAlignment: { strength: 0.4, hypertrophy: 0.5, endurance: 0.9 }, timePerSet: 35 },
  pushups: { complexity: 1, pattern: 'horizontal_push', primaryMuscles: ['chest', 'triceps'], secondaryMuscles: ['shoulders', 'core'], goalAlignment: { strength: 0.6, hypertrophy: 0.8, endurance: 0.9 }, timePerSet: 40 },
  widePushups: { complexity: 1, pattern: 'horizontal_push', primaryMuscles: ['chest'], secondaryMuscles: ['triceps', 'shoulders'], goalAlignment: { strength: 0.5, hypertrophy: 0.8, endurance: 0.8 }, timePerSet: 40 },
  diamondPushups: { complexity: 2, pattern: 'horizontal_push', primaryMuscles: ['triceps', 'chest'], secondaryMuscles: ['shoulders'], goalAlignment: { strength: 0.7, hypertrophy: 0.8, endurance: 0.7 }, timePerSet: 40 },
  declinePushups: { complexity: 2, pattern: 'horizontal_push', primaryMuscles: ['chest', 'shoulders'], secondaryMuscles: ['triceps', 'core'], goalAlignment: { strength: 0.7, hypertrophy: 0.8, endurance: 0.7 }, timePerSet: 40 },
  pikePushups: { complexity: 2, pattern: 'vertical_push', primaryMuscles: ['shoulders', 'triceps'], secondaryMuscles: ['chest', 'core'], goalAlignment: { strength: 0.8, hypertrophy: 0.7, endurance: 0.6 }, timePerSet: 45 },
  archerPushups: { complexity: 3, pattern: 'horizontal_push', primaryMuscles: ['chest', 'triceps'], secondaryMuscles: ['shoulders', 'core'], goalAlignment: { strength: 0.9, hypertrophy: 0.7, endurance: 0.5 }, timePerSet: 50 },
  hinduPushups: { complexity: 2, pattern: 'horizontal_push', primaryMuscles: ['chest', 'shoulders', 'triceps'], secondaryMuscles: ['core', 'back'], goalAlignment: { strength: 0.6, hypertrophy: 0.7, endurance: 0.8 }, timePerSet: 45 },
  clapPushups: { complexity: 3, pattern: 'horizontal_push', primaryMuscles: ['chest', 'triceps'], secondaryMuscles: ['shoulders'], goalAlignment: { strength: 0.8, hypertrophy: 0.6, endurance: 0.5 }, timePerSet: 45 },
  pseudoPlanchePushups: { complexity: 3, pattern: 'horizontal_push', primaryMuscles: ['chest', 'shoulders'], secondaryMuscles: ['triceps', 'core'], goalAlignment: { strength: 0.9, hypertrophy: 0.6, endurance: 0.4 }, timePerSet: 50 },
  oneArmPushups: { complexity: 3, pattern: 'horizontal_push', primaryMuscles: ['chest', 'triceps'], secondaryMuscles: ['shoulders', 'core'], goalAlignment: { strength: 1.0, hypertrophy: 0.6, endurance: 0.3 }, timePerSet: 60 },
  dips: { complexity: 2, pattern: 'vertical_push', primaryMuscles: ['triceps', 'chest'], secondaryMuscles: ['shoulders'], goalAlignment: { strength: 0.8, hypertrophy: 0.9, endurance: 0.6 }, timePerSet: 45 },

  // === PULL - Bodyweight ===
  chinups: { complexity: 2, pattern: 'vertical_pull', primaryMuscles: ['biceps', 'lats'], secondaryMuscles: ['forearms', 'core'], goalAlignment: { strength: 0.8, hypertrophy: 0.9, endurance: 0.6 }, timePerSet: 50 },
  pullups: { complexity: 2, pattern: 'vertical_pull', primaryMuscles: ['lats', 'biceps'], secondaryMuscles: ['forearms', 'core', 'shoulders'], goalAlignment: { strength: 0.9, hypertrophy: 0.8, endurance: 0.6 }, timePerSet: 50 },
  negativePullups: { complexity: 1, pattern: 'vertical_pull', primaryMuscles: ['lats', 'biceps'], secondaryMuscles: ['forearms'], goalAlignment: { strength: 0.7, hypertrophy: 0.6, endurance: 0.5 }, timePerSet: 40 },
  australianRows: { complexity: 1, pattern: 'horizontal_pull', primaryMuscles: ['lats', 'rhomboids'], secondaryMuscles: ['biceps', 'rear_delts'], goalAlignment: { strength: 0.6, hypertrophy: 0.7, endurance: 0.8 }, timePerSet: 40 },
  commandoPullups: { complexity: 3, pattern: 'vertical_pull', primaryMuscles: ['lats', 'biceps'], secondaryMuscles: ['obliques', 'forearms'], goalAlignment: { strength: 0.8, hypertrophy: 0.7, endurance: 0.5 }, timePerSet: 55 },
  lsitPullups: { complexity: 3, pattern: 'vertical_pull', primaryMuscles: ['lats', 'biceps', 'core'], secondaryMuscles: ['hip_flexors'], goalAlignment: { strength: 0.9, hypertrophy: 0.7, endurance: 0.4 }, timePerSet: 60 },
  deadHangs: { complexity: 1, pattern: 'grip', primaryMuscles: ['forearms'], secondaryMuscles: ['shoulders', 'lats'], goalAlignment: { strength: 0.5, hypertrophy: 0.3, endurance: 0.9 }, timePerSet: 45 },
  scapularPulls: { complexity: 1, pattern: 'vertical_pull', primaryMuscles: ['lats', 'rhomboids'], secondaryMuscles: ['shoulders'], goalAlignment: { strength: 0.5, hypertrophy: 0.4, endurance: 0.7 }, timePerSet: 35 },
  towelPullups: { complexity: 3, pattern: 'vertical_pull', primaryMuscles: ['lats', 'forearms'], secondaryMuscles: ['biceps'], goalAlignment: { strength: 0.9, hypertrophy: 0.6, endurance: 0.4 }, timePerSet: 60 },

  // === LEGS - Bodyweight ===
  squats: { complexity: 1, pattern: 'knee_dominant', primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings', 'core'], goalAlignment: { strength: 0.6, hypertrophy: 0.8, endurance: 0.9 }, timePerSet: 40 },
  jumpSquats: { complexity: 2, pattern: 'knee_dominant', primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['calves'], goalAlignment: { strength: 0.7, hypertrophy: 0.6, endurance: 0.8 }, timePerSet: 45 },
  splitSquats: { complexity: 1, pattern: 'knee_dominant', primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings'], goalAlignment: { strength: 0.6, hypertrophy: 0.7, endurance: 0.8 }, timePerSet: 45 },
  stepUps: { complexity: 1, pattern: 'knee_dominant', primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings'], goalAlignment: { strength: 0.5, hypertrophy: 0.6, endurance: 0.8 }, timePerSet: 45 },
  pistolSquats: { complexity: 3, pattern: 'knee_dominant', primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings', 'core'], goalAlignment: { strength: 0.9, hypertrophy: 0.7, endurance: 0.5 }, timePerSet: 60 },
  cossackSquats: { complexity: 2, pattern: 'knee_dominant', primaryMuscles: ['quads', 'adductors'], secondaryMuscles: ['glutes', 'hamstrings'], goalAlignment: { strength: 0.6, hypertrophy: 0.6, endurance: 0.7 }, timePerSet: 50 },
  wallSits: { complexity: 1, pattern: 'knee_dominant', primaryMuscles: ['quads'], secondaryMuscles: ['glutes'], goalAlignment: { strength: 0.4, hypertrophy: 0.5, endurance: 0.9 }, timePerSet: 60 },
  calfRaises: { complexity: 1, pattern: 'calves', primaryMuscles: ['calves'], secondaryMuscles: [], goalAlignment: { strength: 0.5, hypertrophy: 0.7, endurance: 0.8 }, timePerSet: 35 },
  boxJumps: { complexity: 2, pattern: 'full_body', primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['calves', 'core'], goalAlignment: { strength: 0.7, hypertrophy: 0.5, endurance: 0.7 }, timePerSet: 45 },
  shrimpSquats: { complexity: 3, pattern: 'knee_dominant', primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings'], goalAlignment: { strength: 0.9, hypertrophy: 0.6, endurance: 0.4 }, timePerSet: 60 },
  reverseNordicCurls: { complexity: 2, pattern: 'knee_dominant', primaryMuscles: ['quads'], secondaryMuscles: ['hip_flexors'], goalAlignment: { strength: 0.7, hypertrophy: 0.7, endurance: 0.6 }, timePerSet: 50 },
  gluteBridges: { complexity: 1, pattern: 'hip_dominant', primaryMuscles: ['glutes'], secondaryMuscles: ['hamstrings', 'core'], goalAlignment: { strength: 0.5, hypertrophy: 0.7, endurance: 0.8 }, timePerSet: 40 },
  glutebridge: { complexity: 1, pattern: 'hip_dominant', primaryMuscles: ['glutes'], secondaryMuscles: ['hamstrings', 'core'], goalAlignment: { strength: 0.6, hypertrophy: 0.7, endurance: 0.8 }, timePerSet: 45 },
  lunges: { complexity: 1, pattern: 'knee_dominant', primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings', 'core'], goalAlignment: { strength: 0.6, hypertrophy: 0.8, endurance: 0.8 }, timePerSet: 45 },
  broadJumps: { complexity: 2, pattern: 'full_body', primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['calves', 'core'], goalAlignment: { strength: 0.7, hypertrophy: 0.5, endurance: 0.6 }, timePerSet: 45 },

  // === CORE - Bodyweight ===
  plank: { complexity: 1, pattern: 'anti_extension', primaryMuscles: ['core'], secondaryMuscles: ['shoulders', 'glutes'], goalAlignment: { strength: 0.5, hypertrophy: 0.4, endurance: 0.9 }, timePerSet: 60 },
  hollowBodyHold: { complexity: 2, pattern: 'anti_extension', primaryMuscles: ['core'], secondaryMuscles: ['hip_flexors'], goalAlignment: { strength: 0.6, hypertrophy: 0.5, endurance: 0.8 }, timePerSet: 50 },
  deadBugs: { complexity: 1, pattern: 'anti_extension', primaryMuscles: ['core'], secondaryMuscles: ['hip_flexors'], goalAlignment: { strength: 0.4, hypertrophy: 0.5, endurance: 0.8 }, timePerSet: 45 },
  mountainClimbers: { complexity: 1, pattern: 'flexion', primaryMuscles: ['core', 'hip_flexors'], secondaryMuscles: ['shoulders'], goalAlignment: { strength: 0.4, hypertrophy: 0.4, endurance: 0.9 }, timePerSet: 40 },
  bicycleCrunches: { complexity: 1, pattern: 'flexion', primaryMuscles: ['core', 'obliques'], secondaryMuscles: ['hip_flexors'], goalAlignment: { strength: 0.4, hypertrophy: 0.6, endurance: 0.8 }, timePerSet: 40 },
  legRaises: { complexity: 2, pattern: 'flexion', primaryMuscles: ['core', 'hip_flexors'], secondaryMuscles: [], goalAlignment: { strength: 0.6, hypertrophy: 0.7, endurance: 0.7 }, timePerSet: 45 },
  flutterKicks: { complexity: 1, pattern: 'flexion', primaryMuscles: ['core', 'hip_flexors'], secondaryMuscles: [], goalAlignment: { strength: 0.3, hypertrophy: 0.4, endurance: 0.9 }, timePerSet: 40 },
  russianTwists: { complexity: 1, pattern: 'rotation', primaryMuscles: ['obliques'], secondaryMuscles: ['core'], goalAlignment: { strength: 0.5, hypertrophy: 0.6, endurance: 0.8 }, timePerSet: 40 },
  sidePlank: { complexity: 1, pattern: 'anti_extension', primaryMuscles: ['obliques'], secondaryMuscles: ['shoulders', 'glutes'], goalAlignment: { strength: 0.5, hypertrophy: 0.4, endurance: 0.8 }, timePerSet: 50 },
  lSits: { complexity: 3, pattern: 'anti_extension', primaryMuscles: ['core', 'hip_flexors'], secondaryMuscles: ['triceps', 'shoulders'], goalAlignment: { strength: 0.9, hypertrophy: 0.6, endurance: 0.5 }, timePerSet: 50 },
  reverseCrunches: { complexity: 1, pattern: 'flexion', primaryMuscles: ['core'], secondaryMuscles: ['hip_flexors'], goalAlignment: { strength: 0.4, hypertrophy: 0.6, endurance: 0.8 }, timePerSet: 40 },
  dragonFlags: { complexity: 3, pattern: 'flexion', primaryMuscles: ['core'], secondaryMuscles: ['lats'], goalAlignment: { strength: 0.9, hypertrophy: 0.7, endurance: 0.4 }, timePerSet: 60 },
  toesToBar: { complexity: 3, pattern: 'flexion', primaryMuscles: ['core', 'hip_flexors'], secondaryMuscles: ['lats', 'forearms'], goalAlignment: { strength: 0.8, hypertrophy: 0.6, endurance: 0.5 }, timePerSet: 55 },
  vups: { complexity: 2, pattern: 'flexion', primaryMuscles: ['core', 'hip_flexors'], secondaryMuscles: [], goalAlignment: { strength: 0.6, hypertrophy: 0.7, endurance: 0.7 }, timePerSet: 45 },
  supermans: { complexity: 1, pattern: 'extension', primaryMuscles: ['lower_back', 'glutes'], secondaryMuscles: ['hamstrings'], goalAlignment: { strength: 0.5, hypertrophy: 0.5, endurance: 0.8 }, timePerSet: 40 },

  // === FULL BODY - Bodyweight ===
  burpees: { complexity: 2, pattern: 'full_body', primaryMuscles: ['full_body'], secondaryMuscles: [], goalAlignment: { strength: 0.5, hypertrophy: 0.4, endurance: 0.95 }, timePerSet: 50 },
  bearCrawls: { complexity: 1, pattern: 'full_body', primaryMuscles: ['shoulders', 'core'], secondaryMuscles: ['quads', 'triceps'], goalAlignment: { strength: 0.4, hypertrophy: 0.3, endurance: 0.8 }, timePerSet: 45 },
  inchworms: { complexity: 1, pattern: 'full_body', primaryMuscles: ['core', 'shoulders'], secondaryMuscles: ['hamstrings', 'chest'], goalAlignment: { strength: 0.4, hypertrophy: 0.3, endurance: 0.7 }, timePerSet: 40 },
  jumpingJacks: { complexity: 1, pattern: 'full_body', primaryMuscles: ['full_body'], secondaryMuscles: [], goalAlignment: { strength: 0.2, hypertrophy: 0.2, endurance: 0.9 }, timePerSet: 35 },
  highKnees: { complexity: 1, pattern: 'full_body', primaryMuscles: ['hip_flexors', 'core'], secondaryMuscles: ['quads'], goalAlignment: { strength: 0.3, hypertrophy: 0.2, endurance: 0.9 }, timePerSet: 35 },
  skaterJumps: { complexity: 2, pattern: 'full_body', primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['core', 'calves'], goalAlignment: { strength: 0.5, hypertrophy: 0.4, endurance: 0.8 }, timePerSet: 40 },

  // === GYM - Push ===
  benchPress: { complexity: 2, pattern: 'horizontal_push', primaryMuscles: ['chest', 'triceps'], secondaryMuscles: ['shoulders'], goalAlignment: { strength: 0.95, hypertrophy: 0.9, endurance: 0.5 }, timePerSet: 60 },
  inclineBenchPress: { complexity: 2, pattern: 'horizontal_push', primaryMuscles: ['chest', 'shoulders'], secondaryMuscles: ['triceps'], goalAlignment: { strength: 0.9, hypertrophy: 0.9, endurance: 0.5 }, timePerSet: 60 },
  dumbbellPress: { complexity: 1, pattern: 'horizontal_push', primaryMuscles: ['chest', 'triceps'], secondaryMuscles: ['shoulders'], goalAlignment: { strength: 0.8, hypertrophy: 0.9, endurance: 0.6 }, timePerSet: 55 },
  overheadPress: { complexity: 2, pattern: 'vertical_push', primaryMuscles: ['shoulders', 'triceps'], secondaryMuscles: ['core'], goalAlignment: { strength: 0.9, hypertrophy: 0.8, endurance: 0.5 }, timePerSet: 60 },
  dumbbellFlyes: { complexity: 1, pattern: 'horizontal_push', primaryMuscles: ['chest'], secondaryMuscles: ['shoulders'], goalAlignment: { strength: 0.5, hypertrophy: 0.9, endurance: 0.6 }, timePerSet: 50 },
  cableFlyes: { complexity: 1, pattern: 'horizontal_push', primaryMuscles: ['chest'], secondaryMuscles: ['shoulders'], goalAlignment: { strength: 0.5, hypertrophy: 0.9, endurance: 0.7 }, timePerSet: 50 },
  tricepPushdowns: { complexity: 1, pattern: 'arms', primaryMuscles: ['triceps'], secondaryMuscles: [], goalAlignment: { strength: 0.5, hypertrophy: 0.8, endurance: 0.7 }, timePerSet: 45 },
  skullCrushers: { complexity: 2, pattern: 'arms', primaryMuscles: ['triceps'], secondaryMuscles: [], goalAlignment: { strength: 0.7, hypertrophy: 0.9, endurance: 0.5 }, timePerSet: 50 },
  closeGripBench: { complexity: 2, pattern: 'horizontal_push', primaryMuscles: ['triceps', 'chest'], secondaryMuscles: ['shoulders'], goalAlignment: { strength: 0.8, hypertrophy: 0.85, endurance: 0.5 }, timePerSet: 55 },
  weightedDips: { complexity: 2, pattern: 'vertical_push', primaryMuscles: ['triceps', 'chest'], secondaryMuscles: ['shoulders'], goalAlignment: { strength: 0.9, hypertrophy: 0.9, endurance: 0.4 }, timePerSet: 60 },

  // === GYM - Pull ===
  deadlift: { complexity: 2, pattern: 'hip_dominant', primaryMuscles: ['hamstrings', 'glutes', 'lower_back'], secondaryMuscles: ['lats', 'forearms', 'core'], goalAlignment: { strength: 1.0, hypertrophy: 0.8, endurance: 0.4 }, timePerSet: 75 },
  barbellRows: { complexity: 2, pattern: 'horizontal_pull', primaryMuscles: ['lats', 'rhomboids'], secondaryMuscles: ['biceps', 'rear_delts'], goalAlignment: { strength: 0.85, hypertrophy: 0.9, endurance: 0.5 }, timePerSet: 60 },
  dumbbellRows: { complexity: 1, pattern: 'horizontal_pull', primaryMuscles: ['lats', 'rhomboids'], secondaryMuscles: ['biceps', 'rear_delts'], goalAlignment: { strength: 0.7, hypertrophy: 0.9, endurance: 0.6 }, timePerSet: 50 },
  latPulldowns: { complexity: 1, pattern: 'vertical_pull', primaryMuscles: ['lats'], secondaryMuscles: ['biceps', 'rear_delts'], goalAlignment: { strength: 0.6, hypertrophy: 0.9, endurance: 0.6 }, timePerSet: 50 },
  cableRows: { complexity: 1, pattern: 'horizontal_pull', primaryMuscles: ['lats', 'rhomboids'], secondaryMuscles: ['biceps'], goalAlignment: { strength: 0.6, hypertrophy: 0.85, endurance: 0.6 }, timePerSet: 50 },
  facePulls: { complexity: 1, pattern: 'horizontal_pull', primaryMuscles: ['rear_delts', 'rhomboids'], secondaryMuscles: ['rotator_cuff'], goalAlignment: { strength: 0.4, hypertrophy: 0.7, endurance: 0.8 }, timePerSet: 45 },
  bicepCurls: { complexity: 1, pattern: 'arms', primaryMuscles: ['biceps'], secondaryMuscles: ['forearms'], goalAlignment: { strength: 0.5, hypertrophy: 0.9, endurance: 0.7 }, timePerSet: 45 },
  hammerCurls: { complexity: 1, pattern: 'arms', primaryMuscles: ['biceps', 'forearms'], secondaryMuscles: [], goalAlignment: { strength: 0.5, hypertrophy: 0.85, endurance: 0.7 }, timePerSet: 45 },
  weightedPullups: { complexity: 3, pattern: 'vertical_pull', primaryMuscles: ['lats', 'biceps'], secondaryMuscles: ['forearms', 'core'], goalAlignment: { strength: 0.95, hypertrophy: 0.8, endurance: 0.3 }, timePerSet: 65 },
  shrugs: { complexity: 1, pattern: 'grip', primaryMuscles: ['traps'], secondaryMuscles: ['forearms'], goalAlignment: { strength: 0.6, hypertrophy: 0.8, endurance: 0.6 }, timePerSet: 45 },

  // === GYM - Legs ===
  backSquat: { complexity: 2, pattern: 'knee_dominant', primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings', 'core'], goalAlignment: { strength: 1.0, hypertrophy: 0.9, endurance: 0.5 }, timePerSet: 70 },
  frontSquat: { complexity: 3, pattern: 'knee_dominant', primaryMuscles: ['quads', 'core'], secondaryMuscles: ['glutes'], goalAlignment: { strength: 0.9, hypertrophy: 0.85, endurance: 0.4 }, timePerSet: 70 },
  legPress: { complexity: 1, pattern: 'knee_dominant', primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings'], goalAlignment: { strength: 0.7, hypertrophy: 0.9, endurance: 0.6 }, timePerSet: 55 },
  romanianDeadlift: { complexity: 2, pattern: 'hip_dominant', primaryMuscles: ['hamstrings', 'glutes'], secondaryMuscles: ['lower_back'], goalAlignment: { strength: 0.85, hypertrophy: 0.9, endurance: 0.5 }, timePerSet: 60 },
  legCurls: { complexity: 1, pattern: 'hip_dominant', primaryMuscles: ['hamstrings'], secondaryMuscles: [], goalAlignment: { strength: 0.5, hypertrophy: 0.85, endurance: 0.7 }, timePerSet: 45 },
  legExtensions: { complexity: 1, pattern: 'knee_dominant', primaryMuscles: ['quads'], secondaryMuscles: [], goalAlignment: { strength: 0.5, hypertrophy: 0.85, endurance: 0.7 }, timePerSet: 45 },
  hipThrusts: { complexity: 1, pattern: 'hip_dominant', primaryMuscles: ['glutes'], secondaryMuscles: ['hamstrings'], goalAlignment: { strength: 0.7, hypertrophy: 0.9, endurance: 0.6 }, timePerSet: 55 },
  gobletSquats: { complexity: 1, pattern: 'knee_dominant', primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['core'], goalAlignment: { strength: 0.6, hypertrophy: 0.8, endurance: 0.7 }, timePerSet: 50 },
  bulgarianSplitSquats: { complexity: 2, pattern: 'knee_dominant', primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings', 'core'], goalAlignment: { strength: 0.8, hypertrophy: 0.9, endurance: 0.5 }, timePerSet: 60 },
  weightedCalfRaises: { complexity: 1, pattern: 'calves', primaryMuscles: ['calves'], secondaryMuscles: [], goalAlignment: { strength: 0.6, hypertrophy: 0.8, endurance: 0.7 }, timePerSet: 45 },
  weightedLunges: { complexity: 2, pattern: 'knee_dominant', primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings'], goalAlignment: { strength: 0.7, hypertrophy: 0.85, endurance: 0.6 }, timePerSet: 55 },
  weightedStepUps: { complexity: 2, pattern: 'knee_dominant', primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings'], goalAlignment: { strength: 0.7, hypertrophy: 0.8, endurance: 0.6 }, timePerSet: 55 },

  // === GYM - Core ===
  cableWoodchops: { complexity: 1, pattern: 'rotation', primaryMuscles: ['obliques', 'core'], secondaryMuscles: [], goalAlignment: { strength: 0.5, hypertrophy: 0.7, endurance: 0.7 }, timePerSet: 45 },
  hangingLegRaises: { complexity: 2, pattern: 'flexion', primaryMuscles: ['core', 'hip_flexors'], secondaryMuscles: ['forearms'], goalAlignment: { strength: 0.7, hypertrophy: 0.8, endurance: 0.6 }, timePerSet: 50 },
  abWheelRollouts: { complexity: 2, pattern: 'anti_extension', primaryMuscles: ['core'], secondaryMuscles: ['shoulders', 'lats'], goalAlignment: { strength: 0.8, hypertrophy: 0.7, endurance: 0.5 }, timePerSet: 50 },
  weightedPlanks: { complexity: 2, pattern: 'anti_extension', primaryMuscles: ['core'], secondaryMuscles: ['shoulders'], goalAlignment: { strength: 0.7, hypertrophy: 0.5, endurance: 0.7 }, timePerSet: 55 },
  cableCrunches: { complexity: 1, pattern: 'flexion', primaryMuscles: ['core'], secondaryMuscles: [], goalAlignment: { strength: 0.5, hypertrophy: 0.8, endurance: 0.7 }, timePerSet: 45 },
  pallofPress: { complexity: 1, pattern: 'anti_rotation', primaryMuscles: ['core', 'obliques'], secondaryMuscles: [], goalAlignment: { strength: 0.6, hypertrophy: 0.5, endurance: 0.7 }, timePerSet: 45 },
  weightedRussianTwists: { complexity: 1, pattern: 'rotation', primaryMuscles: ['obliques'], secondaryMuscles: ['core'], goalAlignment: { strength: 0.6, hypertrophy: 0.7, endurance: 0.7 }, timePerSet: 45 },
  declineSitups: { complexity: 1, pattern: 'flexion', primaryMuscles: ['core'], secondaryMuscles: ['hip_flexors'], goalAlignment: { strength: 0.6, hypertrophy: 0.7, endurance: 0.7 }, timePerSet: 45 },
}

// Split configurations
const SPLIT_CONFIGS = {
  fullBody: {
    name: 'Full Body',
    description: 'Train all muscle groups each session',
    requiredPatterns: ['horizontal_push', 'vertical_pull', 'knee_dominant', 'anti_extension'],
    optionalPatterns: ['hip_dominant', 'horizontal_pull', 'flexion'],
  },
  upperLower: {
    name: 'Upper/Lower',
    description: 'Alternate upper and lower body days',
    upper: {
      requiredPatterns: ['horizontal_push', 'vertical_pull'],
      optionalPatterns: ['vertical_push', 'horizontal_pull', 'arms'],
    },
    lower: {
      requiredPatterns: ['knee_dominant', 'hip_dominant'],
      optionalPatterns: ['anti_extension', 'calves', 'flexion'],
    },
  },
  pushPullLegs: {
    name: 'Push/Pull/Legs',
    description: 'Push, Pull, and Legs rotation',
    push: {
      requiredPatterns: ['horizontal_push', 'vertical_push'],
      optionalPatterns: ['arms'],
    },
    pull: {
      requiredPatterns: ['vertical_pull', 'horizontal_pull'],
      optionalPatterns: ['arms', 'extension'],
    },
    legs: {
      requiredPatterns: ['knee_dominant', 'hip_dominant'],
      optionalPatterns: ['anti_extension', 'calves'],
    },
  },
}

/**
 * Calculate target number of exercises based on preferences
 */
export function calculateTargetExercises(preferences) {
  const { trainingDaysPerWeek, targetSessionDuration, fitnessLevel } = preferences

  // Minutes per exercise including setup and rest
  const minutesPerExercise = {
    beginner: 7,
    intermediate: 6,
    advanced: 5,
  }[fitnessLevel] || 6

  const exercisesPerSession = Math.floor(targetSessionDuration / minutesPerExercise)

  // For higher frequency, can use more total exercises across splits
  const splitFactor = trainingDaysPerWeek <= 3 ? 1 : (trainingDaysPerWeek <= 4 ? 1.3 : 1.5)
  const totalExercises = Math.round(exercisesPerSession * splitFactor)

  return {
    total: Math.min(Math.max(totalExercises, 3), 12),
    perSession: Math.min(Math.max(exercisesPerSession, 3), 8),
  }
}

/**
 * Determine the best split type based on training frequency and fitness level
 */
export function determineSplitType(trainingDaysPerWeek, fitnessLevel) {
  // Beginners always do full body for motor learning
  if (fitnessLevel === 'beginner') return 'fullBody'

  switch (trainingDaysPerWeek) {
    case 2:
      return 'fullBody'
    case 3:
      return fitnessLevel === 'advanced' ? 'pushPullLegs' : 'fullBody'
    case 4:
      return 'upperLower'
    case 5:
    case 6:
      return 'pushPullLegs'
    default:
      return 'fullBody'
  }
}

/**
 * Calculate exercise score for selection algorithm
 */
export function calculateExerciseScore(exerciseKey, metadata, repScheme, fitnessLevel) {
  let score = 0

  // Goal alignment (0-40 points)
  const alignment = metadata.goalAlignment?.[repScheme] || 0.5
  score += alignment * 40

  // Compound movement bonus (0-15 points)
  const muscleCount = (metadata.primaryMuscles?.length || 1) +
                      (metadata.secondaryMuscles?.length || 0) * 0.3
  score += Math.min(muscleCount * 5, 15)

  // Complexity match (0-15 points)
  const complexityLimit = { beginner: 1, intermediate: 2, advanced: 3 }[fitnessLevel] || 2
  const complexity = metadata.complexity || 1

  if (complexity <= complexityLimit) {
    // Prefer exercises at user's level, but allow easier ones
    if (complexity === complexityLimit) {
      score += 15
    } else {
      score += 10
    }
  } else {
    // Too complex - heavy penalty
    score -= 50
  }

  // Prefer foundational exercises for beginners
  if (fitnessLevel === 'beginner' && complexity === 1) {
    score += 10
  }

  return score
}

/**
 * Select balanced exercises ensuring all required patterns are covered
 */
export function selectBalancedProgram(availableExercises, targetCount, splitType, repScheme, fitnessLevel, allMetadata) {
  const selected = []
  const patternCounts = {}
  const config = SPLIT_CONFIGS[splitType]

  // Get required patterns
  const requiredPatterns = config.requiredPatterns || []

  // Score all exercises
  const scored = availableExercises.map(key => ({
    key,
    meta: allMetadata[key],
    score: calculateExerciseScore(key, allMetadata[key] || {}, repScheme, fitnessLevel),
  })).filter(ex => ex.score > 0) // Remove exercises too complex for user
    .sort((a, b) => b.score - a.score)

  // First pass: one exercise from each required pattern
  for (const pattern of requiredPatterns) {
    const matching = scored.filter(ex =>
      ex.meta?.pattern === pattern && !selected.find(s => s.key === ex.key)
    )
    if (matching.length > 0) {
      selected.push(matching[0])
      patternCounts[pattern] = 1
    }
  }

  // Second pass: fill with highest scored, respecting pattern limits
  while (selected.length < targetCount) {
    const next = scored.find(ex => {
      if (selected.find(s => s.key === ex.key)) return false

      const pattern = ex.meta?.pattern
      // Allow max 2 exercises per pattern
      if ((patternCounts[pattern] || 0) >= 2) return false

      return true
    })

    if (!next) break

    selected.push(next)
    patternCounts[next.meta?.pattern] = (patternCounts[next.meta?.pattern] || 0) + 1
  }

  return selected.map(ex => ex.key)
}

/**
 * Filter exercises by mode and equipment
 */
export function filterAvailableExercises(allExercises, mode, equipment, fitnessLevel) {
  const complexityLimit = { beginner: 1, intermediate: 2, advanced: 3 }[fitnessLevel] || 2

  return Object.entries(allExercises)
    .filter(([key, ex]) => {
      // Mode check
      if (!ex.modes?.includes(mode)) return false

      // Equipment check
      const hasEquipment = ex.equipment?.every(eq =>
        eq === 'none' || equipment.includes(eq)
      )
      if (!hasEquipment) return false

      // Complexity check
      const meta = EXERCISE_METADATA[key]
      if (meta && meta.complexity > complexityLimit) return false

      return true
    })
    .map(([key]) => key)
}

/**
 * Generate a program name based on preferences
 */
export function generateProgramName(preferences) {
  const goalNames = {
    strength: 'Strength',
    hypertrophy: 'Muscle',
    endurance: 'Endurance',
  }
  const levelNames = {
    beginner: 'Foundation',
    intermediate: 'Builder',
    advanced: 'Elite',
  }

  const level = levelNames[preferences.fitnessLevel] || 'Custom'
  const goal = goalNames[preferences.repScheme] || 'Balanced'

  return `${level} ${goal} Program`
}

/**
 * Main program generation function
 */
export function generateProgram(preferences, allExercises) {
  const {
    mode,
    equipment = ['none'],
    fitnessLevel = 'beginner',
    repScheme = 'hypertrophy',
    trainingDaysPerWeek = 3,
    targetSessionDuration = 30,
  } = preferences

  // Calculate targets
  const targets = calculateTargetExercises(preferences)
  const splitType = determineSplitType(trainingDaysPerWeek, fitnessLevel)

  // Filter available exercises
  const available = filterAvailableExercises(allExercises, mode, equipment, fitnessLevel)

  // Select balanced program
  const exercises = selectBalancedProgram(
    available,
    targets.total,
    splitType,
    repScheme,
    fitnessLevel,
    EXERCISE_METADATA
  )

  // Estimate session duration
  const avgTimePerExercise = exercises.reduce((sum, key) => {
    const meta = EXERCISE_METADATA[key]
    return sum + (meta?.timePerSet || 45)
  }, 0) / exercises.length

  // 3 sets per exercise + rest between sets
  const estimatedDuration = Math.round((exercises.length / targets.perSession) * targets.perSession * (avgTimePerExercise * 3 / 60 + 1.5))

  return {
    id: `generated_${Date.now()}`,
    name: generateProgramName(preferences),
    mode,
    splitType,
    exercises,
    metadata: {
      generatedAt: new Date().toISOString(),
      preferences: { ...preferences },
      exerciseCount: exercises.length,
      estimatedSessionDuration: Math.min(estimatedDuration, targetSessionDuration + 10),
      splitName: SPLIT_CONFIGS[splitType]?.name || 'Full Body',
    },
  }
}

/**
 * Regenerate with slight variation (for "shuffle" feature)
 */
export function regenerateProgram(preferences, allExercises) {
  // Add small random factor to scores to get variation
  const originalGenerate = generateProgram(preferences, allExercises)

  // Shuffle while keeping required patterns
  const shuffled = [...originalGenerate.exercises]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return {
    ...originalGenerate,
    exercises: shuffled,
    id: `generated_${Date.now()}`,
  }
}
