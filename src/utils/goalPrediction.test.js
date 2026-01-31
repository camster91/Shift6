import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  calculateWorkoutFrequency,
  getExerciseProgress,
  predictCompletion,
  analyzePace,
  getProgramSummary,
  getNextMilestone
} from './goalPrediction'

describe('goalPrediction', () => {
  describe('calculateWorkoutFrequency', () => {
    it('returns zeros for empty history', () => {
      const result = calculateWorkoutFrequency([])
      expect(result.workoutsPerWeek).toBe(0)
      expect(result.activeDays).toBe(0)
      expect(result.totalWorkouts).toBe(0)
    })

    it('returns zeros for null history', () => {
      const result = calculateWorkoutFrequency(null)
      expect(result.workoutsPerWeek).toBe(0)
    })

    it('calculates frequency from recent history', () => {
      const now = new Date()
      const history = [
        { date: now.toISOString(), exerciseKey: 'pushups', volume: 50 },
        { date: new Date(now - 86400000).toISOString(), exerciseKey: 'squats', volume: 100 },
        { date: new Date(now - 86400000 * 2).toISOString(), exerciseKey: 'pullups', volume: 30 },
      ]

      const result = calculateWorkoutFrequency(history, 7)
      expect(result.totalWorkouts).toBe(3)
      expect(result.activeDays).toBe(3)
      expect(result.workoutsPerWeek).toBeGreaterThan(0)
    })

    it('filters out old workouts beyond lookback period', () => {
      const now = new Date()
      const history = [
        { date: now.toISOString(), exerciseKey: 'pushups', volume: 50 },
        { date: new Date(now - 86400000 * 30).toISOString(), exerciseKey: 'squats', volume: 100 }, // 30 days ago
      ]

      const result = calculateWorkoutFrequency(history, 7)
      expect(result.totalWorkouts).toBe(1)
    })
  })

  describe('getExerciseProgress', () => {
    it('returns correct progress for empty progress', () => {
      const result = getExerciseProgress('pushups', {})
      expect(result.daysCompleted).toBe(0)
      expect(result.daysRemaining).toBe(18)
      expect(result.percentComplete).toBe(0)
      expect(result.isComplete).toBe(false)
      expect(result.currentDay).toBe(1)
    })

    it('returns correct progress for partial completion', () => {
      const result = getExerciseProgress('pushups', { pushups: [1, 2, 3, 4, 5] })
      expect(result.daysCompleted).toBe(5)
      expect(result.daysRemaining).toBe(13)
      expect(result.percentComplete).toBe(28)
      expect(result.isComplete).toBe(false)
      expect(result.currentDay).toBe(6)
    })

    it('returns correct progress for complete exercise', () => {
      const days = Array.from({ length: 18 }, (_, i) => i + 1)
      const result = getExerciseProgress('pushups', { pushups: days })
      expect(result.daysCompleted).toBe(18)
      expect(result.daysRemaining).toBe(0)
      expect(result.percentComplete).toBe(100)
      expect(result.isComplete).toBe(true)
    })
  })

  describe('predictCompletion', () => {
    it('returns complete status for finished exercise', () => {
      const progress = {
        daysRemaining: 0,
        isComplete: true
      }
      const frequency = { workoutsPerWeek: 3 }

      const result = predictCompletion(progress, frequency)
      expect(result.isComplete).toBe(true)
      expect(result.daysUntilComplete).toBe(0)
      expect(result.confidence).toBe('complete')
    })

    it('predicts completion based on frequency', () => {
      const progress = {
        daysRemaining: 9,
        isComplete: false
      }
      const frequency = { workoutsPerWeek: 3, totalWorkouts: 10 }

      const result = predictCompletion(progress, frequency, 3)
      expect(result.isComplete).toBe(false)
      expect(result.daysUntilComplete).toBeGreaterThan(0)
      expect(result.estimatedDate).toBeInstanceOf(Date)
      expect(result.confidence).toBe('high')
    })

    it('uses default frequency when no history', () => {
      const progress = {
        daysRemaining: 18,
        isComplete: false
      }
      const frequency = { workoutsPerWeek: 0, totalWorkouts: 0 }

      const result = predictCompletion(progress, frequency, 3)
      expect(result.daysUntilComplete).toBeGreaterThan(0)
      expect(result.confidence).toBe('low')
    })

    it('sets medium confidence for moderate history', () => {
      const progress = {
        daysRemaining: 10,
        isComplete: false
      }
      const frequency = { workoutsPerWeek: 4, totalWorkouts: 7 }

      const result = predictCompletion(progress, frequency, 3)
      expect(result.confidence).toBe('medium')
    })
  })

  describe('analyzePace', () => {
    it('returns new status for no history', () => {
      const result = analyzePace({}, [])
      expect(result.status).toBe('new')
      expect(result.daysActive).toBe(0)
    })

    it('returns ahead status for fast pace', () => {
      const now = new Date()
      const history = []
      // 10 workouts in 7 days = fast pace
      for (let i = 0; i < 10; i++) {
        history.push({
          date: new Date(now - 86400000 * (i % 7)).toISOString(),
          exerciseKey: 'pushups',
          volume: 50
        })
      }
      const progress = { pushups: [1, 2, 3, 4, 5] }

      const result = analyzePace(progress, history)
      expect(result.status).toBe('ahead')
      expect(result.paceRatio).toBeGreaterThan(1)
    })

    it('returns on-track status for normal pace', () => {
      const now = new Date()
      const history = []
      // ~3 workouts over 7 days = on track
      for (let i = 0; i < 3; i++) {
        history.push({
          date: new Date(now - 86400000 * (i * 2)).toISOString(),
          exerciseKey: 'pushups',
          volume: 50
        })
      }
      const progress = { pushups: [1, 2, 3] }

      const result = analyzePace(progress, history)
      expect(['on-track', 'slightly-behind', 'ahead']).toContain(result.status)
    })
  })

  describe('getProgramSummary', () => {
    it('returns correct summary for empty progress', () => {
      const result = getProgramSummary({}, ['pushups', 'squats', 'pullups'])
      expect(result.totalExercises).toBe(3)
      expect(result.completedExercises).toBe(0)
      expect(result.totalDays).toBe(54) // 3 * 18
      expect(result.completedDays).toBe(0)
      expect(result.percentComplete).toBe(0)
      expect(result.allComplete).toBe(false)
    })

    it('returns correct summary for partial progress', () => {
      const progress = {
        pushups: [1, 2, 3, 4, 5],
        squats: Array.from({ length: 18 }, (_, i) => i + 1), // complete
        pullups: [1, 2]
      }
      const result = getProgramSummary(progress, ['pushups', 'squats', 'pullups'])

      expect(result.completedExercises).toBe(1)
      expect(result.completedDays).toBe(25) // 5 + 18 + 2
      expect(result.percentComplete).toBe(46) // ~46%
      expect(result.allComplete).toBe(false)
    })

    it('returns all complete when finished', () => {
      const completeDays = Array.from({ length: 18 }, (_, i) => i + 1)
      const progress = {
        pushups: completeDays,
        squats: completeDays,
      }
      const result = getProgramSummary(progress, ['pushups', 'squats'])

      expect(result.completedExercises).toBe(2)
      expect(result.allComplete).toBe(true)
      expect(result.percentComplete).toBe(100)
    })
  })

  describe('getNextMilestone', () => {
    it('returns week 1 milestone for day 1', () => {
      const result = getNextMilestone(1)
      expect(result.day).toBe(3)
      expect(result.label).toBe('Week 1 Complete')
      expect(result.daysAway).toBe(3)
    })

    it('returns week 2 milestone for day 6', () => {
      // When on day 6, the next milestone is completing day 6 (Week 2 complete)
      const result = getNextMilestone(6)
      expect(result.day).toBe(6)
      expect(result.label).toBe('Week 2 Complete')
      expect(result.daysAway).toBe(1)
    })

    it('returns halfway milestone for day 7', () => {
      // When on day 7, the next milestone is day 9 (halfway)
      const result = getNextMilestone(7)
      expect(result.day).toBe(9)
      expect(result.label).toBe('Halfway There!')
      expect(result.daysAway).toBe(3)
    })

    it('returns mastered milestone at end', () => {
      const result = getNextMilestone(18)
      expect(result.day).toBe(18)
      expect(result.label).toBe('Mastered!')
      expect(result.daysAway).toBe(1)
    })

    it('returns mastered for completed exercise', () => {
      const result = getNextMilestone(19)
      expect(result.label).toBe('Mastered!')
      expect(result.daysAway).toBe(0)
      expect(result.progress).toBe(100)
    })
  })
})
