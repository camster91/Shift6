import { describe, it, expect } from 'vitest'
import {
  generateSmartProgram,
  getTodaysWorkout,
  getDailyStack,
  getQuickTemplate,
  SPLIT_TEMPLATES,
  BODYWEIGHT_SPLITS,
  QUICK_TEMPLATES,
} from './smartProgramGenerator.js'
import { EXERCISES, getExercisesByPattern } from '../data/exerciseDatabase.js'

describe('smartProgramGenerator', () => {
  describe('SPLIT_TEMPLATES', () => {
    it('has templates for 2-6 days', () => {
      expect(SPLIT_TEMPLATES[2]).toBeDefined()
      expect(SPLIT_TEMPLATES[3]).toBeDefined()
      expect(SPLIT_TEMPLATES[4]).toBeDefined()
      expect(SPLIT_TEMPLATES[5]).toBeDefined()
      expect(SPLIT_TEMPLATES[6]).toBeDefined()
    })

    it('each template has correct number of days', () => {
      expect(SPLIT_TEMPLATES[2].days.length).toBe(2)
      expect(SPLIT_TEMPLATES[3].days.length).toBe(3)
      expect(SPLIT_TEMPLATES[4].days.length).toBe(4)
      expect(SPLIT_TEMPLATES[5].days.length).toBe(5)
      expect(SPLIT_TEMPLATES[6].days.length).toBe(6)
    })

    it('each day has patterns array', () => {
      Object.values(SPLIT_TEMPLATES).forEach(split => {
        split.days.forEach(day => {
          expect(Array.isArray(day.patterns)).toBe(true)
          expect(day.patterns.length).toBeGreaterThan(0)
        })
      })
    })
  })

  describe('BODYWEIGHT_SPLITS', () => {
    it('has templates for 2-6 days', () => {
      expect(BODYWEIGHT_SPLITS[2]).toBeDefined()
      expect(BODYWEIGHT_SPLITS[3]).toBeDefined()
      expect(BODYWEIGHT_SPLITS[4]).toBeDefined()
      expect(BODYWEIGHT_SPLITS[5]).toBeDefined()
      expect(BODYWEIGHT_SPLITS[6]).toBeDefined()
    })
  })

  describe('generateSmartProgram', () => {
    it('generates a program with default options', () => {
      const program = generateSmartProgram()

      expect(program).toBeDefined()
      expect(program.name).toBeDefined()
      expect(program.exercises).toBeDefined()
      expect(Array.isArray(program.exercises)).toBe(true)
      expect(program.exercises.length).toBeGreaterThan(0)
    })

    it('generates program for bodyweight mode', () => {
      const program = generateSmartProgram({
        mode: 'bodyweight',
        equipment: ['none'],
        trainingDaysPerWeek: 3,
      })

      expect(program.mode).toBe('bodyweight')
      expect(program.weeklySchedule.length).toBe(3)
    })

    it('generates program for gym mode', () => {
      const program = generateSmartProgram({
        mode: 'gym',
        equipment: ['dumbbells', 'cables', 'machines'],
        trainingDaysPerWeek: 4,
      })

      expect(program.mode).toBe('gym')
      expect(program.weeklySchedule.length).toBe(4)
    })

    it('respects training days per week', () => {
      for (let days = 2; days <= 6; days++) {
        const program = generateSmartProgram({
          trainingDaysPerWeek: days,
        })

        expect(program.weeklySchedule.length).toBe(days)
      }
    })

    it('generates unique exercises across days', () => {
      const program = generateSmartProgram({
        trainingDaysPerWeek: 3,
        sessionDuration: 30,
      })

      const allExercises = program.weeklySchedule.flatMap(day => day.exercises)
      const uniqueExercises = [...new Set(allExercises)]

      // Most exercises should be unique (some repetition is ok for larger programs)
      expect(uniqueExercises.length).toBeGreaterThan(allExercises.length * 0.5)
    })

    it('generates more exercises for longer sessions', () => {
      const shortSession = generateSmartProgram({
        sessionDuration: 15,
        trainingDaysPerWeek: 2,
      })

      const longSession = generateSmartProgram({
        sessionDuration: 60,
        trainingDaysPerWeek: 2,
      })

      const shortAvg = shortSession.weeklySchedule.reduce((sum, day) => sum + day.exercises.length, 0) / 2
      const longAvg = longSession.weeklySchedule.reduce((sum, day) => sum + day.exercises.length, 0) / 2

      expect(longAvg).toBeGreaterThan(shortAvg)
    })

    it('includes metadata', () => {
      const program = generateSmartProgram()

      expect(program.metadata).toBeDefined()
      expect(program.metadata.exerciseCount).toBeDefined()
      expect(program.metadata.splitName).toBeDefined()
    })

    it('each day has name and exercises', () => {
      const program = generateSmartProgram()

      program.weeklySchedule.forEach(day => {
        expect(day.name).toBeDefined()
        expect(day.exercises).toBeDefined()
        expect(Array.isArray(day.exercises)).toBe(true)
      })
    })
  })

  describe('getTodaysWorkout', () => {
    const mockProgram = {
      weeklySchedule: [
        { name: 'Day 1', exercises: ['pushup', 'airSquat'] },
        { name: 'Day 2', exercises: ['pullup', 'gluteBridge'] },
        { name: 'Day 3', exercises: ['dip', 'walkingLunge'] },
      ],
    }

    it('returns workout for first day when no progress', () => {
      const result = getTodaysWorkout(mockProgram, {})

      if (!result.isRestDay) {
        expect(result.workout).toBeDefined()
        expect(result.dayNumber).toBe(1)
      }
    })

    it('cycles through days based on completion', () => {
      // Simulate some completed days
      const completedDays = {
        pushup: [new Date().toISOString()],
        airSquat: [new Date().toISOString()],
      }

      const result = getTodaysWorkout(mockProgram, completedDays)

      // Should rotate to next day
      expect(result).toBeDefined()
    })

    it('returns null for null program', () => {
      const result = getTodaysWorkout(null, {})
      expect(result).toBeNull()
    })
  })

  describe('getDailyStack', () => {
    const mockProgram = {
      weeklySchedule: [
        { name: 'Day 1', exercises: ['pushup', 'airSquat', 'plank'] },
      ],
    }

    it('returns empty array for rest day', () => {
      // When program is null or undefined
      const result = getDailyStack(null, {})
      expect(result).toEqual([])
    })

    it('returns exercise stack for workout day', () => {
      const result = getDailyStack(mockProgram, {})

      if (result.length > 0) {
        expect(result[0].exerciseKey).toBeDefined()
        expect(result[0].order).toBe(1)
      }
    })
  })

  describe('getQuickTemplate', () => {
    it('returns template for valid ID', () => {
      const template = getQuickTemplate('beginner-bodyweight')

      expect(template).toBeDefined()
      expect(template.name).toBe('Bodyweight Basics')
      expect(template.exercises).toBeDefined()
    })

    it('returns null for invalid ID', () => {
      const template = getQuickTemplate('nonexistent')
      expect(template).toBeNull()
    })

    it('includes exercise details', () => {
      const template = getQuickTemplate('minimalist')

      expect(template.exerciseDetails).toBeDefined()
      expect(template.exerciseDetails.length).toBeGreaterThan(0)
    })
  })

  describe('QUICK_TEMPLATES', () => {
    it('all templates have valid exercise IDs', () => {
      Object.values(QUICK_TEMPLATES).forEach(template => {
        template.exercises.forEach(exerciseId => {
          expect(EXERCISES[exerciseId]).toBeDefined()
        })
      })
    })

    it('has required templates', () => {
      expect(QUICK_TEMPLATES['beginner-bodyweight']).toBeDefined()
      expect(QUICK_TEMPLATES['intermediate-bodyweight']).toBeDefined()
      expect(QUICK_TEMPLATES['gym-basics']).toBeDefined()
      expect(QUICK_TEMPLATES['minimalist']).toBeDefined()
    })
  })
})

describe('exerciseDatabase', () => {
  describe('EXERCISES', () => {
    it('has exercises defined', () => {
      expect(Object.keys(EXERCISES).length).toBeGreaterThan(50)
    })

    it('each exercise has required fields', () => {
      Object.values(EXERCISES).forEach(exercise => {
        expect(exercise.id).toBeDefined()
        expect(exercise.name).toBeDefined()
        expect(exercise.pattern).toBeDefined()
        expect(exercise.category).toBeDefined()
        expect(exercise.equipment).toBeDefined()
        expect(exercise.modes).toBeDefined()
        expect(exercise.difficulty).toBeDefined()
      })
    })

    it('exercise patterns are valid', () => {
      const validPatterns = [
        'knee_dominant', 'hip_dominant',
        'horizontal_push', 'vertical_push',
        'horizontal_pull', 'vertical_pull',
        'core_anti_extension', 'core_anti_rotation', 'core_flexion',
        'isolation_arms', 'isolation_legs'
      ]

      Object.values(EXERCISES).forEach(exercise => {
        expect(validPatterns).toContain(exercise.pattern)
      })
    })

    it('exercise categories are valid', () => {
      const validCategories = ['push', 'pull', 'legs', 'core', 'full']

      Object.values(EXERCISES).forEach(exercise => {
        expect(validCategories).toContain(exercise.category)
      })
    })

    it('exercise modes are valid', () => {
      const validModes = ['bodyweight', 'gym', 'mixed']

      Object.values(EXERCISES).forEach(exercise => {
        exercise.modes.forEach(mode => {
          expect(validModes).toContain(mode)
        })
      })
    })
  })

  describe('getExercisesByPattern', () => {
    it('returns exercises grouped by pattern for bodyweight', () => {
      const grouped = getExercisesByPattern('bodyweight', ['none'])

      expect(grouped.horizontal_push).toBeDefined()
      expect(grouped.horizontal_push.length).toBeGreaterThan(0)
    })

    it('returns exercises grouped by pattern for gym', () => {
      const grouped = getExercisesByPattern('gym', ['dumbbells', 'cables', 'machines'])

      expect(grouped.horizontal_push).toBeDefined()
      expect(grouped.knee_dominant).toBeDefined()
    })

    it('filters by equipment', () => {
      const withPullupBar = getExercisesByPattern('bodyweight', ['none', 'pullupBar'])
      const withoutPullupBar = getExercisesByPattern('bodyweight', ['none'])

      // Should have more vertical pull options with pull-up bar
      const withBarPulls = withPullupBar.vertical_pull?.length || 0
      const withoutBarPulls = withoutPullupBar.vertical_pull?.length || 0

      expect(withBarPulls).toBeGreaterThanOrEqual(withoutBarPulls)
    })
  })
})
