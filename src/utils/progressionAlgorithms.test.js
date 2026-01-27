/**
 * Tests for Advanced Progression Algorithms
 */

import { describe, it, expect } from 'vitest'
import {
  PROGRESSION_TREES,
  findCurrentLevel,
  checkProgressionReady,
  checkRegressionNeeded,
  checkDeloadNeeded,
  applyDeload,
  checkRepSchemeEvolution,
  calculateWeeklyVolume,
  checkVolumeStatus,
  calculateAmrapProgression,
  calculateStartingPoint,
  FAILURE_THRESHOLDS,
} from './progressionAlgorithms.js'

describe('Progression Trees', () => {
  describe('PROGRESSION_TREES structure', () => {
    it('should have all required progression trees', () => {
      expect(PROGRESSION_TREES).toHaveProperty('push')
      expect(PROGRESSION_TREES).toHaveProperty('pull')
      expect(PROGRESSION_TREES).toHaveProperty('squat')
      expect(PROGRESSION_TREES).toHaveProperty('hinge')
      expect(PROGRESSION_TREES).toHaveProperty('coreStability')
      expect(PROGRESSION_TREES).toHaveProperty('coreFlexion')
      expect(PROGRESSION_TREES).toHaveProperty('dip')
    })

    it('should have levels in each tree', () => {
      Object.values(PROGRESSION_TREES).forEach(tree => {
        expect(tree.levels.length).toBeGreaterThanOrEqual(4)
        tree.levels.forEach(level => {
          expect(level).toHaveProperty('key')
          expect(level).toHaveProperty('name')
          expect(level).toHaveProperty('difficulty')
          expect(level).toHaveProperty('targetReps')
        })
      })
    })

    it('should have increasing difficulty in each tree', () => {
      Object.values(PROGRESSION_TREES).forEach(tree => {
        for (let i = 1; i < tree.levels.length; i++) {
          expect(tree.levels[i].difficulty).toBeGreaterThan(tree.levels[i - 1].difficulty)
        }
      })
    })
  })

  describe('findCurrentLevel', () => {
    it('should find push-up in push tree', () => {
      const result = findCurrentLevel('push', 'pushup')
      expect(result).not.toBeNull()
      expect(result.level.name).toBe('Push-up')
      expect(result.hasNext).toBe(true)
      expect(result.hasPrevious).toBe(true)
    })

    it('should identify first level has no previous', () => {
      const result = findCurrentLevel('push', 'wallPushup')
      expect(result.hasPrevious).toBe(false)
      expect(result.hasNext).toBe(true)
    })

    it('should identify last level has no next', () => {
      const result = findCurrentLevel('push', 'oneArmPushup')
      expect(result.hasNext).toBe(false)
      expect(result.hasPrevious).toBe(true)
    })

    it('should return null for invalid tree', () => {
      const result = findCurrentLevel('invalid', 'pushup')
      expect(result).toBeNull()
    })
  })

  describe('checkProgressionReady', () => {
    it('should recommend progression when consistently hitting 3x8+', () => {
      const currentLevel = findCurrentLevel('push', 'pushup')
      const recentWorkouts = [
        { completedSets: 3, avgReps: 10 },
        { completedSets: 3, avgReps: 11 },
        { completedSets: 3, avgReps: 12 },
      ]

      const result = checkProgressionReady(currentLevel, recentWorkouts)
      expect(result.shouldProgress).toBe(true)
      expect(result.nextExercise.key).toBe('diamondPushup')
    })

    it('should not recommend progression when struggling', () => {
      const currentLevel = findCurrentLevel('push', 'pushup')
      const recentWorkouts = [
        { completedSets: 2, avgReps: 6 },
        { completedSets: 3, avgReps: 7 },
      ]

      const result = checkProgressionReady(currentLevel, recentWorkouts)
      expect(result.shouldProgress).toBe(false)
    })
  })

  describe('checkRegressionNeeded', () => {
    it('should recommend regression after 3 failures', () => {
      const currentLevel = findCurrentLevel('push', 'diamondPushup')
      const recentWorkouts = [
        { completedSets: 2, avgReps: 3 },
        { completedSets: 2, avgReps: 4 },
        { completedSets: 1, avgReps: 3 },
      ]

      const result = checkRegressionNeeded(currentLevel, recentWorkouts)
      expect(result.shouldRegress).toBe(true)
      expect(result.previousExercise.key).toBe('pushup')
    })
  })
})

describe('Failure Management', () => {
  describe('checkDeloadNeeded', () => {
    it('should trigger deload after 3 consecutive failures', () => {
      const recentWorkouts = [
        { totalReps: 20, wasDeload: false },
        { totalReps: 18, wasDeload: false },
        { totalReps: 17, wasDeload: false },
      ]

      const result = checkDeloadNeeded(recentWorkouts, 25)
      expect(result.needsDeload).toBe(true)
      expect(result.deloadFactor).toBe(FAILURE_THRESHOLDS.DELOAD_PERCENTAGE)
    })

    it('should not trigger deload when succeeding', () => {
      const recentWorkouts = [
        { totalReps: 25, wasDeload: false },
        { totalReps: 26, wasDeload: false },
        { totalReps: 24, wasDeload: false },
      ]

      const result = checkDeloadNeeded(recentWorkouts, 25)
      expect(result.needsDeload).toBe(false)
    })

    it('should use larger deload after previous deload', () => {
      const recentWorkouts = [
        { totalReps: 20, wasDeload: true },
        { totalReps: 18, wasDeload: false },
        { totalReps: 17, wasDeload: false },
      ]

      const result = checkDeloadNeeded(recentWorkouts, 25)
      expect(result.needsDeload).toBe(true)
      expect(result.deloadFactor).toBe(FAILURE_THRESHOLDS.DOUBLE_DELOAD_PERCENTAGE)
    })
  })

  describe('applyDeload', () => {
    it('should reduce target by deload factor', () => {
      const result = applyDeload(100, 0.9, 'reps')
      expect(result).toBe(90)
    })

    it('should enforce minimum for reps', () => {
      const result = applyDeload(5, 0.5, 'reps')
      expect(result).toBe(3) // Minimum 3 reps
    })

    it('should enforce minimum for seconds', () => {
      const result = applyDeload(15, 0.5, 'seconds')
      expect(result).toBe(10) // Minimum 10 seconds
    })
  })
})

describe('Rep Scheme Evolution', () => {
  describe('checkRepSchemeEvolution', () => {
    it('should evolve from 5x5 to 3x5 after 2 deloads', () => {
      const result = checkRepSchemeEvolution(0, 2)
      expect(result.shouldEvolve).toBe(true)
      expect(result.newScheme.name).toBe('3x5')
    })

    it('should not evolve before threshold', () => {
      const result = checkRepSchemeEvolution(0, 1)
      expect(result.shouldEvolve).toBe(false)
      expect(result.newScheme.name).toBe('5x5')
    })

    it('should not evolve past final stage', () => {
      const result = checkRepSchemeEvolution(3, 5) // Already at 1x3
      expect(result.shouldEvolve).toBe(false)
    })
  })
})

describe('Volume Landmarks', () => {
  describe('calculateWeeklyVolume', () => {
    it('should calculate volume per muscle group', () => {
      const workouts = [
        { exercises: [{ key: 'pushup', sets: 3 }, { key: 'dip', sets: 3 }] },
        { exercises: [{ key: 'pushup', sets: 3 }] },
      ]

      const volume = calculateWeeklyVolume(workouts)
      expect(volume.chest).toBeGreaterThan(0)
      expect(volume.triceps).toBeGreaterThan(0)
    })
  })

  describe('checkVolumeStatus', () => {
    it('should warn when volume is below MEV', () => {
      const volume = { chest: 4 }
      const result = checkVolumeStatus(volume, 'growth')
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.suggestions.length).toBeGreaterThan(0)
    })

    it('should warn when volume exceeds MRV', () => {
      const volume = { chest: 30 }
      const result = checkVolumeStatus(volume, 'growth')
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it('should not warn when volume is optimal', () => {
      const volume = { chest: 15 }
      const result = checkVolumeStatus(volume, 'growth')
      expect(result.warnings.length).toBe(0)
    })
  })
})

describe('AMRAP Autoregulation', () => {
  describe('calculateAmrapProgression', () => {
    it('should hold when below minimum', () => {
      const result = calculateAmrapProgression(4, 5, 5)
      expect(result.progressionType).toBe('hold')
      expect(result.increment).toBe(0)
    })

    it('should progress standard when hitting target', () => {
      const result = calculateAmrapProgression(7, 5, 5)
      expect(result.progressionType).toBe('standard')
      expect(result.increment).toBe(5)
    })

    it('should double progress when exceeding threshold', () => {
      const result = calculateAmrapProgression(12, 5, 5)
      expect(result.progressionType).toBe('double')
      expect(result.increment).toBe(10)
    })

    it('should triple progress on exceptional performance', () => {
      const result = calculateAmrapProgression(16, 5, 5)
      expect(result.progressionType).toBe('triple')
      expect(result.increment).toBe(15)
    })
  })
})

describe('Starting Point Calculation', () => {
  describe('calculateStartingPoint', () => {
    it('should use assessment result when provided', () => {
      const exercise = { startReps: 20, finalGoal: 100, unit: 'reps' }
      const result = calculateStartingPoint(exercise, 'beginner', 30)

      expect(result.basedOn).toBe('assessment')
      expect(result.startReps).toBe(21) // 70% of 30
      expect(result.estimatedMax).toBe(30)
    })

    it('should use fitness level when no assessment', () => {
      const exercise = { startReps: 20, finalGoal: 100, unit: 'reps' }
      const result = calculateStartingPoint(exercise, 'beginner')

      expect(result.basedOn).toBe('fitnessLevel')
      expect(result.startReps).toBe(8) // 20 * 0.4 = 8
    })

    it('should enforce minimum for timed exercises', () => {
      const exercise = { startReps: 20, finalGoal: 180, unit: 'seconds' }
      const result = calculateStartingPoint(exercise, 'beginner', 5)

      expect(result.startReps).toBe(10) // Minimum 10 seconds
    })

    it('should scale by fitness level', () => {
      const exercise = { startReps: 20, finalGoal: 100, unit: 'reps' }

      const beginner = calculateStartingPoint(exercise, 'beginner')
      const intermediate = calculateStartingPoint(exercise, 'intermediate')
      const advanced = calculateStartingPoint(exercise, 'advanced')

      expect(beginner.startReps).toBeLessThan(intermediate.startReps)
      expect(intermediate.startReps).toBeLessThan(advanced.startReps)
    })
  })
})
