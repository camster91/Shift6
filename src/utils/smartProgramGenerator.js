/**
 * Smart Program Generator
 *
 * Creates balanced, progressive workout programs based on:
 * - User's training mode (bodyweight/gym/mixed)
 * - Available equipment
 * - Fitness level and goals
 * - Training frequency (days per week)
 * - Session duration
 *
 * Uses movement patterns for balanced muscle development.
 */

import { EXERCISES, DIFFICULTY, getExercisesByPattern } from '../data/exerciseDatabase.js'

// ============================================================
// SPLIT CONFIGURATIONS
// ============================================================

/**
 * Training split templates based on days per week
 */
export const SPLIT_TEMPLATES = {
  // 2 days: Full body x2
  2: {
    name: 'Full Body',
    description: '2 full body sessions per week',
    days: [
      { name: 'Full Body A', patterns: ['horizontal_push', 'horizontal_pull', 'knee_dominant', 'core_anti_extension'] },
      { name: 'Full Body B', patterns: ['vertical_push', 'vertical_pull', 'hip_dominant', 'core_flexion'] },
    ],
  },

  // 3 days: Push/Pull/Legs or Full Body x3
  3: {
    name: 'Push/Pull/Legs',
    description: 'Classic PPL split',
    days: [
      { name: 'Push', patterns: ['horizontal_push', 'vertical_push', 'isolation_arms'], focus: 'push' },
      { name: 'Pull', patterns: ['horizontal_pull', 'vertical_pull', 'isolation_arms'], focus: 'pull' },
      { name: 'Legs', patterns: ['knee_dominant', 'hip_dominant', 'isolation_legs', 'core_flexion'], focus: 'legs' },
    ],
  },

  // 4 days: Upper/Lower x2
  4: {
    name: 'Upper/Lower',
    description: 'Upper and lower body split',
    days: [
      { name: 'Upper A', patterns: ['horizontal_push', 'horizontal_pull', 'vertical_push', 'isolation_arms'], focus: 'upper' },
      { name: 'Lower A', patterns: ['knee_dominant', 'hip_dominant', 'core_anti_extension'], focus: 'lower' },
      { name: 'Upper B', patterns: ['vertical_push', 'vertical_pull', 'horizontal_push', 'isolation_arms'], focus: 'upper' },
      { name: 'Lower B', patterns: ['hip_dominant', 'knee_dominant', 'core_flexion', 'isolation_legs'], focus: 'lower' },
    ],
  },

  // 5 days: Push/Pull/Legs/Upper/Lower
  5: {
    name: 'PPLUL',
    description: 'Push, Pull, Legs, Upper, Lower',
    days: [
      { name: 'Push', patterns: ['horizontal_push', 'vertical_push', 'isolation_arms'], focus: 'push' },
      { name: 'Pull', patterns: ['horizontal_pull', 'vertical_pull', 'isolation_arms'], focus: 'pull' },
      { name: 'Legs', patterns: ['knee_dominant', 'hip_dominant', 'isolation_legs'], focus: 'legs' },
      { name: 'Upper', patterns: ['horizontal_push', 'horizontal_pull', 'vertical_push', 'vertical_pull'], focus: 'upper' },
      { name: 'Lower + Core', patterns: ['knee_dominant', 'hip_dominant', 'core_anti_extension', 'core_flexion'], focus: 'lower' },
    ],
  },

  // 6 days: Push/Pull/Legs x2
  6: {
    name: 'PPL x2',
    description: 'Push, Pull, Legs twice per week',
    days: [
      { name: 'Push A', patterns: ['horizontal_push', 'vertical_push', 'isolation_arms'], focus: 'push' },
      { name: 'Pull A', patterns: ['horizontal_pull', 'vertical_pull', 'isolation_arms'], focus: 'pull' },
      { name: 'Legs A', patterns: ['knee_dominant', 'hip_dominant', 'core_anti_extension'], focus: 'legs' },
      { name: 'Push B', patterns: ['vertical_push', 'horizontal_push', 'isolation_arms'], focus: 'push' },
      { name: 'Pull B', patterns: ['vertical_pull', 'horizontal_pull', 'isolation_arms'], focus: 'pull' },
      { name: 'Legs B', patterns: ['hip_dominant', 'knee_dominant', 'core_flexion', 'isolation_legs'], focus: 'legs' },
    ],
  },
}

// Bodyweight-specific splits (simplified for home training)
export const BODYWEIGHT_SPLITS = {
  2: {
    name: 'Full Body',
    days: [
      { name: 'Full Body A', patterns: ['horizontal_push', 'vertical_pull', 'knee_dominant', 'core_anti_extension'] },
      { name: 'Full Body B', patterns: ['vertical_push', 'horizontal_pull', 'hip_dominant', 'core_flexion'] },
    ],
  },
  3: {
    name: 'Full Body',
    days: [
      { name: 'Push + Core', patterns: ['horizontal_push', 'vertical_push', 'core_anti_extension', 'core_flexion'] },
      { name: 'Pull + Core', patterns: ['vertical_pull', 'horizontal_pull', 'core_anti_rotation'] },
      { name: 'Legs + Core', patterns: ['knee_dominant', 'hip_dominant', 'core_flexion'] },
    ],
  },
  4: {
    name: 'Upper/Lower',
    days: [
      { name: 'Upper Push', patterns: ['horizontal_push', 'vertical_push', 'core_anti_extension'] },
      { name: 'Lower', patterns: ['knee_dominant', 'hip_dominant', 'core_flexion'] },
      { name: 'Upper Pull', patterns: ['vertical_pull', 'horizontal_pull', 'core_anti_rotation'] },
      { name: 'Lower + Core', patterns: ['hip_dominant', 'knee_dominant', 'core_anti_extension', 'core_flexion'] },
    ],
  },
  5: {
    name: 'Specialization',
    days: [
      { name: 'Push', patterns: ['horizontal_push', 'vertical_push'] },
      { name: 'Pull', patterns: ['vertical_pull', 'horizontal_pull'] },
      { name: 'Legs', patterns: ['knee_dominant', 'hip_dominant'] },
      { name: 'Upper', patterns: ['horizontal_push', 'vertical_pull'] },
      { name: 'Core + Legs', patterns: ['core_anti_extension', 'core_flexion', 'knee_dominant'] },
    ],
  },
  6: {
    name: 'Daily Focus',
    days: [
      { name: 'Horizontal Push', patterns: ['horizontal_push', 'core_anti_extension'] },
      { name: 'Vertical Pull', patterns: ['vertical_pull', 'core_flexion'] },
      { name: 'Legs A', patterns: ['knee_dominant', 'hip_dominant'] },
      { name: 'Vertical Push', patterns: ['vertical_push', 'core_anti_rotation'] },
      { name: 'Horizontal Pull', patterns: ['horizontal_pull', 'core_flexion'] },
      { name: 'Legs B', patterns: ['hip_dominant', 'knee_dominant', 'core_anti_extension'] },
    ],
  },
}

// ============================================================
// EXERCISE SELECTION
// ============================================================

/**
 * Calculate exercise difficulty score for user
 */
function getExerciseDifficultyScore(exercise, userLevel) {
  const diffMap = {
    beginner: DIFFICULTY.EASY,
    intermediate: DIFFICULTY.MODERATE,
    advanced: DIFFICULTY.HARD,
  }
  const maxDiff = diffMap[userLevel] || DIFFICULTY.MODERATE

  // Prefer exercises at or slightly below user level
  if (exercise.difficulty <= maxDiff) {
    // Closer to max = higher score
    return 1 + (exercise.difficulty / maxDiff) * 0.5
  }
  // Exercises above level get lower scores
  return 0.5 / exercise.difficulty
}

/**
 * Score an exercise for program inclusion
 */
function scoreExercise(exercise, context) {
  const { userLevel, goal, usedPatterns, usedExercises } = context
  let score = 10 // Base score

  // Difficulty appropriateness
  score += getExerciseDifficultyScore(exercise, userLevel) * 20

  // Penalize if pattern already well-covered
  const patternCount = usedPatterns[exercise.pattern] || 0
  score -= patternCount * 15

  // Penalize if similar exercise already selected
  if (usedExercises.has(exercise.id)) {
    score -= 100
  }

  // Goal alignment bonuses
  if (goal === 'strength' && exercise.difficulty >= DIFFICULTY.MODERATE) {
    score += 10
  }
  if (goal === 'endurance' && exercise.difficulty <= DIFFICULTY.EASY) {
    score += 10
  }
  if (goal === 'hypertrophy') {
    score += 5 // Hypertrophy benefits from variety
  }

  return score
}

/**
 * Select best exercise for a movement pattern
 */
function selectExerciseForPattern(pattern, availableExercises, context) {
  const patternExercises = availableExercises.filter(ex => ex.pattern === pattern)

  if (patternExercises.length === 0) {
    return null
  }

  // Score and sort exercises
  const scored = patternExercises
    .map(ex => ({ exercise: ex, score: scoreExercise(ex, context) }))
    .sort((a, b) => b.score - a.score)

  // Add some randomness to top choices
  const topChoices = scored.slice(0, Math.min(3, scored.length))
  const randomIndex = Math.floor(Math.random() * topChoices.length)

  return topChoices[randomIndex]?.exercise || scored[0]?.exercise
}

// ============================================================
// PROGRAM GENERATION
// ============================================================

/**
 * Generate exercises for a single workout day
 */
function generateDayWorkout(dayTemplate, availableExercises, context, exercisesPerDay) {
  const { patterns } = dayTemplate
  const selected = []
  const usedInDay = new Set()

  // First pass: one exercise per pattern
  for (const pattern of patterns) {
    if (selected.length >= exercisesPerDay) break

    const exercise = selectExerciseForPattern(
      pattern,
      availableExercises.filter(ex => !usedInDay.has(ex.id)),
      { ...context, usedExercises: new Set([...context.usedExercises, ...usedInDay]) }
    )

    if (exercise) {
      selected.push(exercise)
      usedInDay.add(exercise.id)
      context.usedPatterns[exercise.pattern] = (context.usedPatterns[exercise.pattern] || 0) + 1
    }
  }

  // Second pass: fill remaining slots if needed
  while (selected.length < exercisesPerDay) {
    // Find patterns that could use another exercise
    const underrepresentedPatterns = patterns.filter(p =>
      (context.usedPatterns[p] || 0) < 2
    )

    if (underrepresentedPatterns.length === 0) break

    const pattern = underrepresentedPatterns[Math.floor(Math.random() * underrepresentedPatterns.length)]
    const exercise = selectExerciseForPattern(
      pattern,
      availableExercises.filter(ex => !usedInDay.has(ex.id)),
      { ...context, usedExercises: new Set([...context.usedExercises, ...usedInDay]) }
    )

    if (exercise) {
      selected.push(exercise)
      usedInDay.add(exercise.id)
      context.usedPatterns[exercise.pattern] = (context.usedPatterns[exercise.pattern] || 0) + 1
    } else {
      break
    }
  }

  return selected
}

/**
 * Calculate exercises per day based on session duration and goal
 */
function calculateExercisesPerDay(sessionDuration, goal) {
  // Base: ~8 minutes per exercise (including rest)
  const baseExercises = Math.floor(sessionDuration / 8)

  // Adjust for goal
  if (goal === 'endurance') {
    return Math.min(baseExercises + 1, 8) // More exercises, shorter rest
  }
  if (goal === 'strength') {
    return Math.max(baseExercises - 1, 3) // Fewer exercises, longer rest
  }

  return Math.max(3, Math.min(baseExercises, 7))
}

/**
 * Main program generation function
 */
export function generateSmartProgram(options = {}) {
  const {
    mode = 'bodyweight',
    equipment = ['none'],
    fitnessLevel = 'intermediate',
    goal = 'balanced',
    trainingDaysPerWeek = 3,
    sessionDuration = 30,
  } = options

  // Get appropriate split template
  const splitTemplates = mode === 'bodyweight' ? BODYWEIGHT_SPLITS : SPLIT_TEMPLATES
  const split = splitTemplates[trainingDaysPerWeek] || splitTemplates[3]

  // Get available exercises
  const exercisesByPattern = getExercisesByPattern(mode, equipment)
  const availableExercises = Object.values(exercisesByPattern).flat()

  if (availableExercises.length === 0) {
    console.warn('No exercises available for the given mode and equipment')
    return null
  }

  // Calculate exercises per day
  const exercisesPerDay = calculateExercisesPerDay(sessionDuration, goal)

  // Context for exercise selection
  const context = {
    userLevel: fitnessLevel,
    goal,
    usedPatterns: {},
    usedExercises: new Set(),
  }

  // Generate workout for each day
  const weeklyProgram = split.days.map((dayTemplate, index) => {
    const exercises = generateDayWorkout(
      dayTemplate,
      availableExercises,
      context,
      exercisesPerDay
    )

    // Add selected exercises to context
    exercises.forEach(ex => context.usedExercises.add(ex.id))

    return {
      dayIndex: index,
      name: dayTemplate.name,
      focus: dayTemplate.focus || 'full',
      exercises: exercises.map(ex => ex.id),
      exerciseDetails: exercises,
    }
  })

  // Compile all unique exercises used
  const allExercises = [...new Set(weeklyProgram.flatMap(day => day.exercises))]

  return {
    name: generateProgramName(mode, goal, fitnessLevel),
    mode,
    split: split.name,
    trainingDaysPerWeek,
    sessionDuration,
    exercises: allExercises,
    weeklySchedule: weeklyProgram,
    metadata: {
      exerciseCount: allExercises.length,
      estimatedSessionDuration: sessionDuration,
      splitName: split.name,
      description: split.description,
    },
  }
}

/**
 * Generate a descriptive program name
 */
function generateProgramName(mode, goal, level) {
  const modeNames = {
    bodyweight: 'Bodyweight',
    gym: 'Gym',
    mixed: 'Hybrid',
  }

  const goalNames = {
    strength: 'Strength',
    hypertrophy: 'Muscle Building',
    endurance: 'Endurance',
    balanced: 'Balanced',
  }

  const levelNames = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
  }

  return `${levelNames[level] || 'Custom'} ${goalNames[goal] || 'Balanced'} ${modeNames[mode] || ''} Program`.trim()
}

// ============================================================
// DAILY WORKOUT SELECTION
// ============================================================

/**
 * Get today's recommended workout from a program
 */
export function getTodaysWorkout(program, completedDays = {}, preferredDays = []) {
  if (!program?.weeklySchedule) return null

  const today = new Date()
  const dayOfWeek = today.getDay() // 0 = Sunday

  // Check if today is a preferred training day
  const isTrainingDay = preferredDays.length === 0 ||
    preferredDays.includes(dayOfWeek) ||
    dayOfWeek !== 0 // Default: train any day except Sunday

  if (!isTrainingDay) {
    return { isRestDay: true, message: 'Rest day - recovery is part of progress!' }
  }

  // Find the next workout day in the rotation
  const totalCompletedThisWeek = Object.values(completedDays)
    .flat()
    .filter(date => {
      const d = new Date(date)
      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - today.getDay())
      return d >= startOfWeek
    }).length

  const nextDayIndex = totalCompletedThisWeek % program.weeklySchedule.length
  const todaysWorkout = program.weeklySchedule[nextDayIndex]

  return {
    isRestDay: false,
    workout: todaysWorkout,
    dayNumber: nextDayIndex + 1,
    totalDays: program.weeklySchedule.length,
  }
}

/**
 * Get a daily exercise stack from a program
 */
export function getDailyStack(program, completedDays = {}) {
  if (!program?.weeklySchedule) {
    return []
  }

  const todaysInfo = getTodaysWorkout(program, completedDays)

  if (!todaysInfo || todaysInfo.isRestDay || !todaysInfo.workout) {
    return []
  }

  const { workout } = todaysInfo

  return workout.exercises.map((exerciseId, index) => {
    const exercise = EXERCISES[exerciseId]
    const dayProgress = completedDays[exerciseId] || []

    return {
      exerciseKey: exerciseId,
      exercise,
      dayIndex: dayProgress.length,
      order: index + 1,
      isComplete: false,
    }
  })
}

// ============================================================
// QUICK TEMPLATES
// ============================================================

/**
 * Pre-built quick start templates
 */
export const QUICK_TEMPLATES = {
  'beginner-bodyweight': {
    id: 'beginner-bodyweight',
    name: 'Bodyweight Basics',
    description: 'Perfect for starting your fitness journey',
    exercises: [
      'kneePushup', 'inclinePushup', 'airSquat', 'gluteBridge',
      'australianRow', 'plank', 'deadBug', 'walkingLunge'
    ],
  },
  'intermediate-bodyweight': {
    id: 'intermediate-bodyweight',
    name: 'Bodyweight Builder',
    description: 'Build strength with progressive calisthenics',
    exercises: [
      'pushup', 'diamondPushup', 'pikePushup', 'dip',
      'pullup', 'australianRow', 'airSquat', 'bulgarianSplitSquat',
      'singleLegGluteBridge', 'plank', 'vUp', 'sidePlank'
    ],
  },
  'advanced-bodyweight': {
    id: 'advanced-bodyweight',
    name: 'Calisthenics Master',
    description: 'Challenge yourself with advanced movements',
    exercises: [
      'archerPushup', 'diamondPushup', 'pikePushup', 'dip',
      'pullup', 'chinup', 'pistolSquat', 'bulgarianSplitSquat',
      'singleLegGluteBridge', 'hollowBodyHold', 'vUp', 'legRaise'
    ],
  },
  'gym-basics': {
    id: 'gym-basics',
    name: 'Gym Essentials',
    description: 'Fundamental gym exercises for beginners',
    exercises: [
      'chestPressMachine', 'latPulldownWide', 'legPress', 'seatedLegCurl',
      'seatedShoulderPress', 'seatedCableRow', 'dbBicepCurl', 'tricepPushdownRope',
      'cableCrunch', 'backExtension'
    ],
  },
  'gym-muscle-building': {
    id: 'gym-muscle-building',
    name: 'Muscle Builder',
    description: 'Optimized for hypertrophy and growth',
    exercises: [
      'dbChestPressFlat', 'dbChestPressIncline', 'cableCrossover',
      'latPulldownWide', 'seatedCableRow', 'singleArmDbRow',
      'seatedShoulderPress', 'lateralRaise', 'facePull',
      'legPress', 'romanianDeadlift', 'legExtension', 'seatedLegCurl',
      'dbBicepCurl', 'tricepPushdownRope', 'cableCrunch'
    ],
  },
  'minimalist': {
    id: 'minimalist',
    name: 'Minimalist',
    description: '4 compound movements for busy schedules',
    exercises: ['pushup', 'airSquat', 'australianRow', 'plank'],
  },
}

/**
 * Get a quick template program
 */
export function getQuickTemplate(templateId) {
  const template = QUICK_TEMPLATES[templateId]
  if (!template) return null

  return {
    ...template,
    exerciseDetails: template.exercises.map(id => EXERCISES[id]).filter(Boolean),
  }
}
