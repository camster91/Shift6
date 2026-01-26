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

import { EXERCISES, DIFFICULTY, getExercisesByPattern, MOVEMENT_PATTERNS } from '../data/exerciseDatabase.js'

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
    description: 'Complete workouts twice per week',
    days: [
      { name: 'Full Body A', patterns: ['horizontal_push', 'horizontal_pull', 'knee_dominant', 'core_stability'], focus: 'full' },
      { name: 'Full Body B', patterns: ['vertical_push', 'vertical_pull', 'hip_dominant', 'core_flexion'], focus: 'full' },
    ],
  },

  // 3 days: Push/Pull/Legs
  3: {
    name: 'Push / Pull / Legs',
    description: 'Classic balanced training split',
    days: [
      { name: 'Push Day', patterns: ['horizontal_push', 'vertical_push', 'isolation_arms'], focus: 'push' },
      { name: 'Pull Day', patterns: ['horizontal_pull', 'vertical_pull', 'isolation_arms'], focus: 'pull' },
      { name: 'Legs Day', patterns: ['knee_dominant', 'hip_dominant', 'core_flexion'], focus: 'legs' },
    ],
  },

  // 4 days: Upper/Lower x2
  4: {
    name: 'Upper / Lower',
    description: 'Alternate upper and lower body',
    days: [
      { name: 'Upper Body A', patterns: ['horizontal_push', 'horizontal_pull', 'vertical_push', 'isolation_arms'], focus: 'upper' },
      { name: 'Lower Body A', patterns: ['knee_dominant', 'hip_dominant', 'core_stability'], focus: 'lower' },
      { name: 'Upper Body B', patterns: ['vertical_push', 'vertical_pull', 'horizontal_push', 'isolation_arms'], focus: 'upper' },
      { name: 'Lower Body B', patterns: ['hip_dominant', 'knee_dominant', 'core_flexion', 'isolation_legs'], focus: 'lower' },
    ],
  },

  // 5 days: Push/Pull/Legs/Upper/Lower
  5: {
    name: 'Push / Pull / Legs / Upper / Lower',
    description: 'High frequency varied training',
    days: [
      { name: 'Push Day', patterns: ['horizontal_push', 'vertical_push', 'isolation_arms'], focus: 'push' },
      { name: 'Pull Day', patterns: ['horizontal_pull', 'vertical_pull', 'isolation_arms'], focus: 'pull' },
      { name: 'Legs Day', patterns: ['knee_dominant', 'hip_dominant', 'isolation_legs'], focus: 'legs' },
      { name: 'Upper Body', patterns: ['horizontal_push', 'horizontal_pull', 'vertical_push', 'vertical_pull'], focus: 'upper' },
      { name: 'Lower & Core', patterns: ['knee_dominant', 'hip_dominant', 'core_stability', 'core_flexion'], focus: 'lower' },
    ],
  },

  // 6 days: Push/Pull/Legs x2
  6: {
    name: 'Push / Pull / Legs (2x)',
    description: 'Each muscle group twice per week',
    days: [
      { name: 'Push Day A', patterns: ['horizontal_push', 'vertical_push', 'isolation_arms'], focus: 'push' },
      { name: 'Pull Day A', patterns: ['horizontal_pull', 'vertical_pull', 'isolation_arms'], focus: 'pull' },
      { name: 'Legs Day A', patterns: ['knee_dominant', 'hip_dominant', 'core_stability'], focus: 'legs' },
      { name: 'Push Day B', patterns: ['vertical_push', 'horizontal_push', 'isolation_arms'], focus: 'push' },
      { name: 'Pull Day B', patterns: ['vertical_pull', 'horizontal_pull', 'isolation_arms'], focus: 'pull' },
      { name: 'Legs Day B', patterns: ['hip_dominant', 'knee_dominant', 'core_flexion', 'isolation_legs'], focus: 'legs' },
    ],
  },
}

// Bodyweight-specific splits (simplified for home training)
export const BODYWEIGHT_SPLITS = {
  2: {
    name: 'Full Body',
    description: 'Complete full body workouts twice per week',
    days: [
      { name: 'Full Body A', patterns: ['horizontal_push', 'vertical_pull', 'knee_dominant', 'core_stability'], focus: 'full' },
      { name: 'Full Body B', patterns: ['vertical_push', 'horizontal_pull', 'hip_dominant', 'core_flexion'], focus: 'full' },
    ],
  },
  3: {
    name: 'Push / Pull / Legs',
    description: 'Classic balanced split for calisthenics',
    days: [
      { name: 'Push Day', patterns: ['horizontal_push', 'vertical_push', 'core_stability'], focus: 'push' },
      { name: 'Pull Day', patterns: ['vertical_pull', 'horizontal_pull', 'core_flexion'], focus: 'pull' },
      { name: 'Legs Day', patterns: ['knee_dominant', 'hip_dominant', 'core_stability'], focus: 'legs' },
    ],
  },
  4: {
    name: 'Upper / Lower',
    description: 'Alternate between upper and lower body focus',
    days: [
      { name: 'Upper Body A', patterns: ['horizontal_push', 'vertical_pull', 'core_stability'], focus: 'upper' },
      { name: 'Lower Body A', patterns: ['knee_dominant', 'hip_dominant', 'core_flexion'], focus: 'lower' },
      { name: 'Upper Body B', patterns: ['vertical_push', 'horizontal_pull', 'core_stability'], focus: 'upper' },
      { name: 'Lower Body B', patterns: ['hip_dominant', 'knee_dominant', 'core_flexion'], focus: 'lower' },
    ],
  },
  5: {
    name: 'Push / Pull / Legs / Upper / Lower',
    description: 'High frequency training with varied focus',
    days: [
      { name: 'Push Day', patterns: ['horizontal_push', 'vertical_push'], focus: 'push' },
      { name: 'Pull Day', patterns: ['vertical_pull', 'horizontal_pull'], focus: 'pull' },
      { name: 'Legs Day', patterns: ['knee_dominant', 'hip_dominant'], focus: 'legs' },
      { name: 'Upper Body', patterns: ['horizontal_push', 'vertical_pull'], focus: 'upper' },
      { name: 'Lower & Core', patterns: ['core_stability', 'core_flexion', 'knee_dominant'], focus: 'lower' },
    ],
  },
  6: {
    name: 'Daily Specialization',
    description: 'Focus on specific muscle groups each day',
    days: [
      { name: 'Chest & Triceps', patterns: ['horizontal_push', 'core_stability'], focus: 'push' },
      { name: 'Back & Biceps', patterns: ['vertical_pull', 'core_flexion'], focus: 'pull' },
      { name: 'Quads & Glutes', patterns: ['knee_dominant', 'hip_dominant'], focus: 'legs' },
      { name: 'Shoulders & Core', patterns: ['vertical_push', 'core_stability'], focus: 'push' },
      { name: 'Back & Core', patterns: ['horizontal_pull', 'core_flexion'], focus: 'pull' },
      { name: 'Hamstrings & Core', patterns: ['hip_dominant', 'knee_dominant', 'core_stability'], focus: 'legs' },
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
  const { userLevel, goal, usedPatterns, usedExercises, dayPatterns, dayMuscleCounts } = context
  let score = 10 // Base score

  // Difficulty appropriateness
  score += getExerciseDifficultyScore(exercise, userLevel) * 20

  // Penalize if pattern already heavily covered (global program context)
  const patternCount = usedPatterns[exercise.pattern] || 0
  score -= patternCount * 5

  // Penalize if pattern used in THIS day (encourage variety within day)
  if (dayPatterns && dayPatterns[exercise.pattern]) {
    score -= dayPatterns[exercise.pattern] * 15;
  }

  // Penalize if similar exercise already selected
  if (usedExercises.has(exercise.id)) {
    score -= 100
  }

  // Muscle Balance Penalty
  // Check which muscles this exercise hits and penalize if already worked today
  if (dayMuscleCounts) {
    const patternInfo = MOVEMENT_PATTERNS[exercise.pattern];
    if (patternInfo && patternInfo.muscles) {
      let musclePenalty = 0;
      patternInfo.muscles.forEach(muscle => {
        const currentCount = dayMuscleCounts[muscle] || 0;
        // Higher penalty for primary muscles already hit > 2 times
        if (currentCount > 0) {
          musclePenalty += currentCount * 8;
        }
      });
      score -= musclePenalty;
    }
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

  // Track usage specific to this day to ensure balance
  const dayPatterns = {};
  const dayMuscleCounts = {};

  // Helper to update trackers
  const recordSelection = (exercise) => {
    selected.push(exercise);
    usedInDay.add(exercise.id);

    // Update Context (Global)
    context.usedExercises.add(exercise.id);
    context.usedPatterns[exercise.pattern] = (context.usedPatterns[exercise.pattern] || 0) + 1;

    // Update Day Trackers
    dayPatterns[exercise.pattern] = (dayPatterns[exercise.pattern] || 0) + 1;

    const patternInfo = MOVEMENT_PATTERNS[exercise.pattern];
    if (patternInfo && patternInfo.muscles) {
      patternInfo.muscles.forEach(m => {
        dayMuscleCounts[m] = (dayMuscleCounts[m] || 0) + 1;
      });
    }
  };

  // First pass: one exercise per MANDATORY pattern
  for (const pattern of patterns) {
    if (selected.length >= exercisesPerDay) break;

    // Filter out exercises already used globally if possible, but hard filter for 'usedInDay'
    const exercise = selectExerciseForPattern(
      pattern,
      availableExercises.filter(ex => !usedInDay.has(ex.id)),
      { ...context, dayPatterns, dayMuscleCounts }
    )

    if (exercise) {
      recordSelection(exercise);
    }
  }

  // Second pass: fill remaining slots intelligently
  while (selected.length < exercisesPerDay) {
    // Find patterns that are under-represented relative to muscle balance
    // Instead of random, pick the pattern whose primary muscles are LEAST worked
    const scoredPatterns = patterns.map(p => {
      const info = MOVEMENT_PATTERNS[p];
      if (!info) return { pattern: p, score: 0 };

      // Calculate "fatigue" for this pattern based on muscles used
      let fatigue = 0;
      info.muscles.forEach(m => {
        fatigue += (dayMuscleCounts[m] || 0);
      });

      // Lower fatigue = Higher score
      return { pattern: p, score: -fatigue };
    }).sort((a, b) => b.score - a.score); // Highest score (least fatigue) first

    // Try top patterns
    let found = false;
    for (const { pattern } of scoredPatterns) {
      const exercise = selectExerciseForPattern(
        pattern,
        availableExercises.filter(ex => !usedInDay.has(ex.id)),
        { ...context, dayPatterns, dayMuscleCounts }
      );

      if (exercise) {
        recordSelection(exercise);
        found = true;
        break;
      }
    }

    // If we couldn't find anything for any pattern (rare), break
    if (!found) break;
  }

  return selected;
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
 * Only uses exercises from the simplified database
 */
export const QUICK_TEMPLATES = {
  'beginner-bodyweight': {
    id: 'beginner-bodyweight',
    name: 'Bodyweight Basics',
    description: 'Perfect for starting your fitness journey',
    exercises: [
      'kneePushup', 'airSquat', 'gluteBridge',
      'plank', 'walkingLunge', 'birdDog'
    ],
  },
  'intermediate-bodyweight': {
    id: 'intermediate-bodyweight',
    name: 'Bodyweight Builder',
    description: 'Build strength with progressive calisthenics',
    exercises: [
      'pushup', 'diamondPushup', 'pikePushup', 'dip',
      'pullup', 'australianRow', 'airSquat', 'walkingLunge',
      'gluteBridge', 'plank', 'vUp', 'sidePlank'
    ],
  },
  'advanced-bodyweight': {
    id: 'advanced-bodyweight',
    name: 'Calisthenics Master',
    description: 'Challenge yourself with advanced movements',
    exercises: [
      'diamondPushup', 'declinePushup', 'pikePushup', 'dip',
      'pullup', 'chinup', 'jumpSquat', 'walkingLunge',
      'gluteBridge', 'vUp', 'legRaise', 'mountainClimber'
    ],
  },
  'gym-basics': {
    id: 'gym-basics',
    name: 'Gym Essentials',
    description: 'Fundamental gym exercises for beginners',
    exercises: [
      'dbChestPress', 'latPulldown', 'legPress', 'legCurl',
      'shoulderPress', 'seatedRow', 'bicepCurl', 'tricepPushdown'
    ],
  },
  'gym-muscle-building': {
    id: 'gym-muscle-building',
    name: 'Muscle Builder',
    description: 'Optimized for hypertrophy and growth',
    exercises: [
      'dbChestPress', 'shoulderPress', 'lateralRaise',
      'latPulldown', 'seatedRow', 'dbRow', 'facePull',
      'legPress', 'romanianDeadlift', 'legCurl', 'gobletSquat',
      'bicepCurl', 'tricepPushdown'
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
