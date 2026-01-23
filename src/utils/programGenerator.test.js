import { describe, it, expect } from 'vitest'
import {
  calculateTargetExercises,
  determineSplitType,
  calculateExerciseScore,
  filterAvailableExercises,
  selectBalancedProgram,
  generateProgram,
  generateProgramName,
  EXERCISE_METADATA,
} from './programGenerator'
import { EXERCISE_PLANS } from '../data/exercises.jsx'
import { EXERCISE_LIBRARY } from '../data/exerciseLibrary.js'

// Combine all exercises for testing
const allExercises = { ...EXERCISE_PLANS, ...EXERCISE_LIBRARY }

describe('programGenerator', () => {
  describe('calculateTargetExercises', () => {
    it('returns more exercises for longer sessions', () => {
      const short = calculateTargetExercises({
        trainingDaysPerWeek: 3,
        targetSessionDuration: 20,
        fitnessLevel: 'intermediate',
      })
      const long = calculateTargetExercises({
        trainingDaysPerWeek: 3,
        targetSessionDuration: 45,
        fitnessLevel: 'intermediate',
      })

      expect(long.total).toBeGreaterThan(short.total)
      expect(long.perSession).toBeGreaterThan(short.perSession)
    })

    it('returns fewer exercises per session for beginners (more rest time)', () => {
      const beginner = calculateTargetExercises({
        trainingDaysPerWeek: 3,
        targetSessionDuration: 30,
        fitnessLevel: 'beginner',
      })
      const advanced = calculateTargetExercises({
        trainingDaysPerWeek: 3,
        targetSessionDuration: 30,
        fitnessLevel: 'advanced',
      })

      expect(advanced.perSession).toBeGreaterThanOrEqual(beginner.perSession)
    })

    it('returns more total exercises for higher training frequency', () => {
      const threeDays = calculateTargetExercises({
        trainingDaysPerWeek: 3,
        targetSessionDuration: 30,
        fitnessLevel: 'intermediate',
      })
      const sixDays = calculateTargetExercises({
        trainingDaysPerWeek: 6,
        targetSessionDuration: 30,
        fitnessLevel: 'intermediate',
      })

      expect(sixDays.total).toBeGreaterThan(threeDays.total)
    })

    it('clamps exercise count between 3 and 12', () => {
      const veryShort = calculateTargetExercises({
        trainingDaysPerWeek: 2,
        targetSessionDuration: 10,
        fitnessLevel: 'beginner',
      })
      const veryLong = calculateTargetExercises({
        trainingDaysPerWeek: 6,
        targetSessionDuration: 60,
        fitnessLevel: 'advanced',
      })

      expect(veryShort.total).toBeGreaterThanOrEqual(3)
      expect(veryLong.total).toBeLessThanOrEqual(12)
    })
  })

  describe('determineSplitType', () => {
    it('returns fullBody for beginners regardless of frequency', () => {
      expect(determineSplitType(2, 'beginner')).toBe('fullBody')
      expect(determineSplitType(4, 'beginner')).toBe('fullBody')
      expect(determineSplitType(6, 'beginner')).toBe('fullBody')
    })

    it('returns fullBody for 2 days per week', () => {
      expect(determineSplitType(2, 'intermediate')).toBe('fullBody')
      expect(determineSplitType(2, 'advanced')).toBe('fullBody')
    })

    it('returns upperLower for 4 days per week (non-beginner)', () => {
      expect(determineSplitType(4, 'intermediate')).toBe('upperLower')
      expect(determineSplitType(4, 'advanced')).toBe('upperLower')
    })

    it('returns pushPullLegs for 5+ days per week (non-beginner)', () => {
      expect(determineSplitType(5, 'intermediate')).toBe('pushPullLegs')
      expect(determineSplitType(6, 'advanced')).toBe('pushPullLegs')
    })

    it('returns pushPullLegs for 3 days for advanced', () => {
      expect(determineSplitType(3, 'advanced')).toBe('pushPullLegs')
    })

    it('returns fullBody for 3 days for intermediate', () => {
      expect(determineSplitType(3, 'intermediate')).toBe('fullBody')
    })
  })

  describe('calculateExerciseScore', () => {
    it('scores higher for exercises matching the rep scheme goal', () => {
      const strengthExercise = EXERCISE_METADATA['deadlift']
      const enduranceExercise = EXERCISE_METADATA['jumpingJacks']

      const strengthScore = calculateExerciseScore('deadlift', strengthExercise, 'strength', 'intermediate')
      const enduranceScore = calculateExerciseScore('jumpingJacks', enduranceExercise, 'strength', 'intermediate')

      expect(strengthScore).toBeGreaterThan(enduranceScore)
    })

    it('penalizes exercises too complex for fitness level', () => {
      const advancedExercise = EXERCISE_METADATA['oneArmPushups']

      const beginnerScore = calculateExerciseScore('oneArmPushups', advancedExercise, 'strength', 'beginner')
      const advancedScore = calculateExerciseScore('oneArmPushups', advancedExercise, 'strength', 'advanced')

      expect(advancedScore).toBeGreaterThan(beginnerScore)
    })

    it('prefers exercises at users complexity level', () => {
      const simpleExercise = EXERCISE_METADATA['pushups']
      const complexExercise = EXERCISE_METADATA['archerPushups']

      const simpleForBeginner = calculateExerciseScore('pushups', simpleExercise, 'hypertrophy', 'beginner')
      const complexForBeginner = calculateExerciseScore('archerPushups', complexExercise, 'hypertrophy', 'beginner')

      expect(simpleForBeginner).toBeGreaterThan(complexForBeginner)
    })
  })

  describe('filterAvailableExercises', () => {
    it('filters by mode - bodyweight only returns bodyweight exercises', () => {
      const available = filterAvailableExercises(allExercises, 'bodyweight', ['none'], 'intermediate')

      expect(available).toContain('pushups')
      expect(available).toContain('squats')
      expect(available).not.toContain('benchPress')
      expect(available).not.toContain('deadlift')
    })

    it('filters by equipment availability', () => {
      const withBar = filterAvailableExercises(allExercises, 'bodyweight', ['pullupBar'], 'intermediate')
      const withoutBar = filterAvailableExercises(allExercises, 'bodyweight', ['none'], 'intermediate')

      expect(withBar).toContain('pullups')
      expect(withoutBar).not.toContain('pullups')
    })

    it('filters out exercises too complex for fitness level', () => {
      const beginner = filterAvailableExercises(allExercises, 'bodyweight', ['none'], 'beginner')
      const advanced = filterAvailableExercises(allExercises, 'bodyweight', ['none'], 'advanced')

      // One-arm pushups are complexity 3
      expect(beginner).not.toContain('oneArmPushups')
      expect(advanced).toContain('oneArmPushups')
    })

    it('gym mode returns gym exercises', () => {
      const available = filterAvailableExercises(allExercises, 'gym', ['barbell', 'bench'], 'intermediate')

      expect(available).toContain('benchPress')
      expect(available).toContain('backSquat')
    })
  })

  describe('selectBalancedProgram', () => {
    it('selects exercises from required patterns', () => {
      const available = ['pushups', 'pullups', 'squats', 'plank', 'lunges', 'australianRows']
      const selected = selectBalancedProgram(available, 4, 'fullBody', 'hypertrophy', 'intermediate', EXERCISE_METADATA)

      // Should have at least one push, pull, legs, core
      const patterns = selected.map(key => EXERCISE_METADATA[key]?.pattern)
      expect(patterns.some(p => p === 'horizontal_push' || p === 'vertical_push')).toBe(true)
      expect(patterns.some(p => p === 'vertical_pull' || p === 'horizontal_pull')).toBe(true)
      expect(patterns.some(p => p === 'knee_dominant')).toBe(true)
    })

    it('respects target exercise count', () => {
      const available = ['pushups', 'pullups', 'squats', 'plank', 'lunges', 'australianRows', 'dips', 'vups']
      const selected = selectBalancedProgram(available, 5, 'fullBody', 'hypertrophy', 'intermediate', EXERCISE_METADATA)

      expect(selected.length).toBeLessThanOrEqual(5)
      expect(selected.length).toBeGreaterThanOrEqual(3)
    })

    it('limits exercises per pattern to 2', () => {
      const available = ['pushups', 'diamondPushups', 'widePushups', 'declinePushups', 'pullups', 'squats', 'plank']
      const selected = selectBalancedProgram(available, 6, 'fullBody', 'hypertrophy', 'intermediate', EXERCISE_METADATA)

      // Count push exercises
      const pushCount = selected.filter(key => EXERCISE_METADATA[key]?.pattern === 'horizontal_push').length
      expect(pushCount).toBeLessThanOrEqual(2)
    })
  })

  describe('generateProgramName', () => {
    it('generates name based on fitness level and goal', () => {
      expect(generateProgramName({ fitnessLevel: 'beginner', repScheme: 'strength' }))
        .toBe('Foundation Strength Program')

      expect(generateProgramName({ fitnessLevel: 'intermediate', repScheme: 'hypertrophy' }))
        .toBe('Builder Muscle Program')

      expect(generateProgramName({ fitnessLevel: 'advanced', repScheme: 'endurance' }))
        .toBe('Elite Endurance Program')
    })
  })

  describe('generateProgram', () => {
    it('generates valid program for beginner bodyweight', () => {
      const program = generateProgram({
        mode: 'bodyweight',
        equipment: ['none'],
        fitnessLevel: 'beginner',
        repScheme: 'hypertrophy',
        trainingDaysPerWeek: 3,
        targetSessionDuration: 20,
      }, allExercises)

      expect(program).toBeDefined()
      expect(program.exercises).toBeDefined()
      expect(program.exercises.length).toBeGreaterThanOrEqual(3)
      expect(program.splitType).toBe('fullBody')
      expect(program.name).toContain('Foundation')
    })

    it('generates more exercises for longer sessions', () => {
      const shortProgram = generateProgram({
        mode: 'bodyweight',
        equipment: ['pullupBar'],
        fitnessLevel: 'intermediate',
        repScheme: 'strength',
        trainingDaysPerWeek: 3,
        targetSessionDuration: 20,
      }, allExercises)

      const longProgram = generateProgram({
        mode: 'bodyweight',
        equipment: ['pullupBar'],
        fitnessLevel: 'intermediate',
        repScheme: 'strength',
        trainingDaysPerWeek: 3,
        targetSessionDuration: 45,
      }, allExercises)

      expect(longProgram.exercises.length).toBeGreaterThan(shortProgram.exercises.length)
    })

    it('uses upperLower split for 4 days intermediate', () => {
      const program = generateProgram({
        mode: 'mixed',
        equipment: ['pullupBar', 'dumbbells'],
        fitnessLevel: 'intermediate',
        repScheme: 'hypertrophy',
        trainingDaysPerWeek: 4,
        targetSessionDuration: 45,
      }, allExercises)

      expect(program.splitType).toBe('upperLower')
    })

    it('uses pushPullLegs split for 6 days advanced', () => {
      const program = generateProgram({
        mode: 'gym',
        equipment: ['barbell', 'dumbbells', 'bench', 'cables'],
        fitnessLevel: 'advanced',
        repScheme: 'strength',
        trainingDaysPerWeek: 6,
        targetSessionDuration: 60,
      }, allExercises)

      expect(program.splitType).toBe('pushPullLegs')
    })

    it('includes estimated session duration in metadata', () => {
      const program = generateProgram({
        mode: 'bodyweight',
        equipment: ['none'],
        fitnessLevel: 'beginner',
        repScheme: 'endurance',
        trainingDaysPerWeek: 2,
        targetSessionDuration: 15,
      }, allExercises)

      expect(program.metadata.estimatedSessionDuration).toBeDefined()
      expect(typeof program.metadata.estimatedSessionDuration).toBe('number')
    })

    it('only includes exercises user has equipment for', () => {
      const noEquipment = generateProgram({
        mode: 'bodyweight',
        equipment: ['none'],
        fitnessLevel: 'intermediate',
        repScheme: 'hypertrophy',
        trainingDaysPerWeek: 3,
        targetSessionDuration: 30,
      }, allExercises)

      // Should not include pullups (requires pullupBar)
      expect(noEquipment.exercises).not.toContain('pullups')
      expect(noEquipment.exercises).not.toContain('chinups')
    })

    it('respects complexity limits for beginners', () => {
      const program = generateProgram({
        mode: 'bodyweight',
        equipment: ['none', 'pullupBar'],
        fitnessLevel: 'beginner',
        repScheme: 'strength',
        trainingDaysPerWeek: 3,
        targetSessionDuration: 30,
      }, allExercises)

      // Check all exercises are complexity 1 (beginner)
      const allBeginner = program.exercises.every(key => {
        const meta = EXERCISE_METADATA[key]
        return !meta || meta.complexity <= 1
      })

      expect(allBeginner).toBe(true)
    })
  })

  describe('EXERCISE_METADATA', () => {
    it('has metadata for all core exercises', () => {
      const coreExercises = ['pushups', 'squats', 'pullups', 'dips', 'vups', 'plank', 'lunges', 'supermans']

      for (const key of coreExercises) {
        expect(EXERCISE_METADATA[key]).toBeDefined()
        expect(EXERCISE_METADATA[key].pattern).toBeDefined()
        expect(EXERCISE_METADATA[key].complexity).toBeDefined()
        expect(EXERCISE_METADATA[key].goalAlignment).toBeDefined()
      }
    })

    it('has valid complexity values (1-3)', () => {
      for (const [key, meta] of Object.entries(EXERCISE_METADATA)) {
        expect(meta.complexity).toBeGreaterThanOrEqual(1)
        expect(meta.complexity).toBeLessThanOrEqual(3)
      }
    })

    it('has valid goal alignment values (0-1)', () => {
      for (const [key, meta] of Object.entries(EXERCISE_METADATA)) {
        if (meta.goalAlignment) {
          for (const [goal, value] of Object.entries(meta.goalAlignment)) {
            expect(value).toBeGreaterThanOrEqual(0)
            expect(value).toBeLessThanOrEqual(1)
          }
        }
      }
    })
  })
})
