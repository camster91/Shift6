/**
 * Warm-up Routines - Dynamic stretches and mobility exercises
 * Organized by body part focus to match workout type
 */

// Warm-up exercise database
export const WARMUP_EXERCISES = {
  // ============================================================
  // UPPER BODY WARM-UPS
  // ============================================================
  armCircles: {
    id: 'armCircles',
    name: 'Arm Circles',
    duration: 30,
    unit: 'seconds',
    category: 'upper',
    instructions: 'Extend arms to sides and make small circles, gradually increasing size. Switch direction halfway.',
    tips: ['Start small, go bigger', 'Keep core engaged'],
  },
  shoulderRolls: {
    id: 'shoulderRolls',
    name: 'Shoulder Rolls',
    duration: 20,
    unit: 'seconds',
    category: 'upper',
    instructions: 'Roll shoulders forward in circular motion, then backward. Slow and controlled.',
    tips: ['Relax your neck', 'Full range of motion'],
  },
  neckRotations: {
    id: 'neckRotations',
    name: 'Neck Rotations',
    duration: 20,
    unit: 'seconds',
    category: 'upper',
    instructions: 'Slowly rotate head in a circle, then reverse direction. Keep movements gentle.',
    tips: ['Never force the motion', 'Breathe deeply'],
  },
  chestOpener: {
    id: 'chestOpener',
    name: 'Chest Opener',
    duration: 20,
    unit: 'seconds',
    category: 'upper',
    instructions: 'Clasp hands behind back, squeeze shoulder blades together, and lift arms while opening chest.',
    tips: ['Stand tall', 'Feel the stretch across chest'],
  },
  wristCircles: {
    id: 'wristCircles',
    name: 'Wrist Circles',
    duration: 20,
    unit: 'seconds',
    category: 'upper',
    instructions: 'Rotate wrists in circles both directions. Important for push-up prep.',
    tips: ['Essential for push exercises', 'Slow and controlled'],
  },
  scapularPushups: {
    id: 'scapularPushups',
    name: 'Scapular Push-Ups',
    duration: 10,
    unit: 'reps',
    category: 'upper',
    instructions: 'In plank position, squeeze shoulder blades together then spread them apart without bending elbows.',
    tips: ['Activates shoulder stabilizers', 'Keep arms straight'],
  },

  // ============================================================
  // LOWER BODY WARM-UPS
  // ============================================================
  legSwings: {
    id: 'legSwings',
    name: 'Leg Swings',
    duration: 20,
    unit: 'seconds',
    category: 'lower',
    instructions: 'Hold onto something for balance. Swing one leg forward and back, then switch. Also do side-to-side swings.',
    tips: ['Control the swing', 'Keep standing leg slightly bent'],
  },
  hipCircles: {
    id: 'hipCircles',
    name: 'Hip Circles',
    duration: 20,
    unit: 'seconds',
    category: 'lower',
    instructions: 'Hands on hips, make large circles with your hips. Switch direction halfway.',
    tips: ['Loosen up the hip joints', 'Great for squat prep'],
  },
  kneeCircles: {
    id: 'kneeCircles',
    name: 'Knee Circles',
    duration: 20,
    unit: 'seconds',
    category: 'lower',
    instructions: 'Feet together, hands on knees. Make circular motions with both knees together.',
    tips: ['Warms up knee joints', 'Keep feet flat'],
  },
  ankleCircles: {
    id: 'ankleCircles',
    name: 'Ankle Circles',
    duration: 20,
    unit: 'seconds',
    category: 'lower',
    instructions: 'Lift one foot and rotate ankle in circles. Switch feet and direction.',
    tips: ['Important for stability', 'Do both directions'],
  },
  walkingHighKnees: {
    id: 'walkingHighKnees',
    name: 'High Knees',
    duration: 30,
    unit: 'seconds',
    category: 'lower',
    instructions: 'March in place bringing knees up high. Pump arms in opposition.',
    tips: ['Get heart rate up', 'Drive knees to hip height'],
  },
  buttKicks: {
    id: 'buttKicks',
    name: 'Butt Kicks',
    duration: 30,
    unit: 'seconds',
    category: 'lower',
    instructions: 'Jog in place, kicking heels up to touch your glutes.',
    tips: ['Stretches quads', 'Keep a quick pace'],
  },
  bodyweightSquats: {
    id: 'bodyweightSquats',
    name: 'Warm-Up Squats',
    duration: 10,
    unit: 'reps',
    category: 'lower',
    instructions: 'Perform slow, controlled bodyweight squats focusing on depth and form.',
    tips: ['Ease into full depth', 'Keep chest up'],
  },

  // ============================================================
  // CORE WARM-UPS
  // ============================================================
  catCow: {
    id: 'catCow',
    name: 'Cat-Cow Stretch',
    duration: 30,
    unit: 'seconds',
    category: 'core',
    instructions: 'On hands and knees, alternate between arching back (cat) and dropping belly (cow).',
    tips: ['Breathe with movement', 'Great spinal mobility'],
  },
  torsoTwists: {
    id: 'torsoTwists',
    name: 'Torso Twists',
    duration: 20,
    unit: 'seconds',
    category: 'core',
    instructions: 'Stand with feet shoulder-width. Twist torso left and right, letting arms swing.',
    tips: ['Relax your arms', 'Rotate from the waist'],
  },
  sideBends: {
    id: 'sideBends',
    name: 'Side Bends',
    duration: 20,
    unit: 'seconds',
    category: 'core',
    instructions: 'Stand tall, reach one arm overhead and bend to the opposite side. Alternate sides.',
    tips: ['Feel the stretch along your side', 'Keep hips square'],
  },
  deadBug: {
    id: 'deadBug',
    name: 'Dead Bug',
    duration: 10,
    unit: 'reps',
    category: 'core',
    instructions: 'Lie on back with arms up, knees at 90 degrees. Lower opposite arm and leg, then switch.',
    tips: ['Keep lower back pressed to floor', 'Activates deep core'],
  },
  birdDog: {
    id: 'birdDog',
    name: 'Bird Dog',
    duration: 10,
    unit: 'reps',
    category: 'core',
    instructions: 'On hands and knees, extend opposite arm and leg straight out. Alternate sides.',
    tips: ['Keep back flat', 'Great for stability'],
  },

  // ============================================================
  // FULL BODY WARM-UPS
  // ============================================================
  jumpingJacks: {
    id: 'jumpingJacks',
    name: 'Jumping Jacks',
    duration: 30,
    unit: 'seconds',
    category: 'full',
    instructions: 'Jump feet out wide while raising arms overhead, then jump back together.',
    tips: ['Gets blood flowing', 'Land softly'],
  },
  inchworms: {
    id: 'inchworms',
    name: 'Inchworms',
    duration: 5,
    unit: 'reps',
    category: 'full',
    instructions: 'Bend forward, walk hands out to plank, walk feet to hands, stand up. Repeat.',
    tips: ['Full body mobility', 'Stretch hamstrings'],
  },
  worldsGreatestStretch: {
    id: 'worldsGreatestStretch',
    name: 'Worlds Greatest Stretch',
    duration: 6,
    unit: 'reps',
    category: 'full',
    instructions: 'Lunge forward, place inside hand on ground, rotate torso and reach up. Alternate sides.',
    tips: ['Opens hips and thoracic spine', 'Take your time'],
  },
  mountainClimbers: {
    id: 'mountainClimbers',
    name: 'Slow Mountain Climbers',
    duration: 20,
    unit: 'seconds',
    category: 'full',
    instructions: 'In plank position, slowly bring one knee toward chest, then switch. Controlled pace.',
    tips: ['Warms up entire body', 'Keep hips low'],
  },
}

// Pre-built warm-up routines - simplified to 2 options
export const WARMUP_ROUTINES = {
  quick: {
    id: 'quick',
    name: 'Quick',
    description: '2 min - get moving fast',
    duration: 2,
    exercises: ['jumpingJacks', 'armCircles', 'hipCircles', 'bodyweightSquats'],
  },
  full: {
    id: 'full',
    name: 'Full',
    description: '4 min - thorough preparation',
    duration: 4,
    exercises: ['jumpingJacks', 'armCircles', 'hipCircles', 'torsoTwists', 'inchworms', 'bodyweightSquats'],
  },
}

/**
 * Get recommended warm-up based on session duration
 * @param {number} sessionDuration - Expected session length in minutes
 * @returns {string} - Recommended warm-up routine ID
 */
export const getRecommendedWarmup = (sessionDuration = 30) => {
  // Quick warmup for short sessions, full for longer ones
  return sessionDuration <= 20 ? 'quick' : 'full'
}

/**
 * Calculate total duration of a warm-up routine
 * @param {string} routineId - The warm-up routine ID
 * @returns {number} - Total duration in seconds
 */
export const calculateWarmupDuration = (routineId) => {
  const routine = WARMUP_ROUTINES[routineId]
  if (!routine) return 0

  return routine.exercises.reduce((total, exerciseId) => {
    const exercise = WARMUP_EXERCISES[exerciseId]
    if (!exercise) return total

    // For rep-based exercises, estimate 3 seconds per rep
    if (exercise.unit === 'reps') {
      return total + (exercise.duration * 3)
    }
    return total + exercise.duration
  }, 0)
}
