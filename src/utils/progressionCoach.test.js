import { describe, it, expect, beforeEach } from 'vitest'
import {
  checkForNewPR,
  checkForGymPR,
  getWeightSuggestion,
  getRealisticRepTarget,
  checkDeloadNeeded,
  getRandomPRMessage,
  getRandomWeightMessage,
  PR_CELEBRATION_MESSAGES,
  PROGRESSION_CONFIG
} from './progressionCoach'

describe('progressionCoach utilities', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('checkForNewPR', () => {
    it('returns isNewPR true for first workout', () => {
      const result = checkForNewPR('pushups', 25, {})
      expect(result.isNewPR).toBe(true)
      expect(result.previousPR).toBe(null)
      expect(result.message).toBe('First workout recorded!')
    })

    it('returns isNewPR true when volume exceeds PR', () => {
      const prs = { pushups: { volume: 50, date: '2024-01-01' } }
      const result = checkForNewPR('pushups', 55, prs)
      expect(result.isNewPR).toBe(true)
      expect(result.previousPR).toBe(50)
      expect(result.improvement).toBe(5)
      expect(result.improvementPercent).toBe(10)
    })

    it('returns isNewPR false when volume is less than PR', () => {
      const prs = { pushups: { volume: 50, date: '2024-01-01' } }
      const result = checkForNewPR('pushups', 45, prs)
      expect(result.isNewPR).toBe(false)
      expect(result.improvement).toBe(0)
    })

    it('returns isNewPR false when volume equals PR', () => {
      const prs = { pushups: { volume: 50, date: '2024-01-01' } }
      const result = checkForNewPR('pushups', 50, prs)
      expect(result.isNewPR).toBe(false)
    })
  })

  describe('checkForGymPR', () => {
    it('returns isNewPR true for first lift', () => {
      const result = checkForGymPR('benchPress', 60, 8, {})
      expect(result.isNewPR).toBe(true)
      expect(result.type).toBe('first')
      expect(result.message).toBe('First lift recorded!')
    })

    it('detects weight PR at same or higher reps', () => {
      const gymPRs = { benchPress: { weight: 60, reps: 8 } }
      const result = checkForGymPR('benchPress', 65, 8, gymPRs)
      expect(result.isNewPR).toBe(true)
      expect(result.type).toBe('weight')
      expect(result.message).toContain('Weight PR!')
    })

    it('detects rep PR at same weight', () => {
      const gymPRs = { benchPress: { weight: 60, reps: 8 } }
      const result = checkForGymPR('benchPress', 60, 10, gymPRs)
      expect(result.isNewPR).toBe(true)
      expect(result.type).toBe('reps')
      expect(result.message).toContain('Rep PR!')
    })

    it('detects estimated 1RM improvement', () => {
      const gymPRs = { benchPress: { weight: 60, reps: 5 } }
      // Higher 1RM estimate: 65 * (1 + 8/30) = 82.3 vs 60 * (1 + 5/30) = 70
      const result = checkForGymPR('benchPress', 65, 8, gymPRs)
      expect(result.isNewPR).toBe(true)
      expect(result.estimated1RM).toBeGreaterThan(result.previous1RM)
    })

    it('returns false when performance is worse', () => {
      const gymPRs = { benchPress: { weight: 80, reps: 8 } }
      const result = checkForGymPR('benchPress', 60, 6, gymPRs)
      expect(result.isNewPR).toBe(false)
      expect(result.type).toBe(null)
    })
  })

  describe('getWeightSuggestion', () => {
    it('suggests increase when RPE is low and reps exceeded', () => {
      const result = getWeightSuggestion({
        targetReps: 8,
        actualReps: 12,
        rpe: 6,
        currentWeight: 60,
        weightIncrement: 2.5
      })
      expect(result.action).toBe('increase')
      expect(result.newWeight).toBe(62.5)
      expect(result.confidence).toBe('high')
    })

    it('suggests maintain when on track', () => {
      const result = getWeightSuggestion({
        targetReps: 8,
        actualReps: 8,
        rpe: 8,
        currentWeight: 60,
        weightIncrement: 2.5
      })
      expect(result.action).toBe('maintain')
      expect(result.newWeight).toBe(60)
    })

    it('suggests decrease when RPE too high and missing reps', () => {
      const result = getWeightSuggestion({
        targetReps: 8,
        actualReps: 5,
        rpe: 10,
        currentWeight: 60,
        weightIncrement: 2.5
      })
      expect(result.action).toBe('decrease')
      expect(result.newWeight).toBe(57.5)
      expect(result.confidence).toBe('high')
    })

    it('suggests deload after consecutive hard sessions', () => {
      const result = getWeightSuggestion({
        targetReps: 8,
        actualReps: 8,
        rpe: 9,
        currentWeight: 60,
        weightIncrement: 2.5,
        recentSessions: [
          { rpe: 9 },
          { rpe: 9 },
          { rpe: 9 }
        ]
      })
      expect(result.action).toBe('deload')
      expect(result.newWeight).toBeLessThan(60)
    })

    it('returns metrics in response', () => {
      const result = getWeightSuggestion({
        targetReps: 8,
        actualReps: 10,
        rpe: 7,
        currentWeight: 60,
        weightIncrement: 2.5
      })
      expect(result.metrics).toBeDefined()
      expect(result.metrics.rpe).toBe(7)
      expect(result.metrics.targetReps).toBe(8)
      expect(result.metrics.actualReps).toBe(10)
    })
  })

  describe('getRealisticRepTarget', () => {
    it('caps aggressive progression', () => {
      // Original: 5 → 100 in 6 weeks = ~95/6 = ~16 reps/week = 320% weekly increase!
      const result = getRealisticRepTarget(5, 100, 3, 6)
      expect(result.cappedTarget).toBeLessThan(result.originalTarget)
      expect(result.isRealistic).toBe(false)
    })

    it('allows realistic progression unchanged', () => {
      // 50 → 55 in 6 weeks = ~10% total = reasonable
      const result = getRealisticRepTarget(50, 55, 3, 6)
      expect(result.weeklyIncreasePercent).toBeLessThanOrEqual(10)
    })

    it('calculates weekly increase percent', () => {
      const result = getRealisticRepTarget(10, 20, 1, 6)
      expect(result.weeklyIncreasePercent).toBeGreaterThan(0)
      expect(result.weeklyIncreasePercent).toBeLessThanOrEqual(10)
    })

    it('provides message when progression is capped', () => {
      const result = getRealisticRepTarget(5, 100, 3, 6)
      expect(result.message).toContain('capped')
    })
  })

  describe('checkDeloadNeeded', () => {
    it('returns false with insufficient data', () => {
      const result = checkDeloadNeeded([{ rpe: 7 }])
      expect(result.needsDeload).toBe(false)
      expect(result.reason).toBe('Not enough data yet')
    })

    it('detects need for deload after high RPE sessions', () => {
      const sessions = [
        { rpe: 9, volume: 100 },
        { rpe: 9, volume: 100 },
        { rpe: 9, volume: 100 },
        { rpe: 9, volume: 100 },
        { rpe: 9, volume: 100 }
      ]
      const result = checkDeloadNeeded(sessions)
      expect(result.needsDeload).toBe(true)
      expect(result.type).toBe('fatigue')
    })

    it('does not suggest deload for moderate effort', () => {
      const sessions = [
        { rpe: 7, volume: 100 },
        { rpe: 7, volume: 105 },
        { rpe: 7, volume: 110 },
        { rpe: 7, volume: 115 },
        { rpe: 7, volume: 120 }
      ]
      const result = checkDeloadNeeded(sessions)
      expect(result.needsDeload).toBe(false)
    })
  })

  describe('celebration messages', () => {
    it('getRandomPRMessage returns a valid message', () => {
      const message = getRandomPRMessage()
      expect(PR_CELEBRATION_MESSAGES).toContain(message)
    })

    it('getRandomWeightMessage returns message for each action', () => {
      const actions = ['increase', 'maintain', 'decrease', 'deload']
      actions.forEach(action => {
        const message = getRandomWeightMessage(action)
        expect(typeof message).toBe('string')
        expect(message.length).toBeGreaterThan(0)
      })
    })

    it('getRandomWeightMessage defaults to maintain for unknown action', () => {
      const message = getRandomWeightMessage('unknown')
      expect(typeof message).toBe('string')
    })
  })

  describe('PROGRESSION_CONFIG', () => {
    it('has realistic weekly increase caps', () => {
      expect(PROGRESSION_CONFIG.maxWeeklyIncreasePercent).toBeLessThanOrEqual(10)
      expect(PROGRESSION_CONFIG.minWeeklyIncreasePercent).toBeGreaterThanOrEqual(5)
    })

    it('has valid RPE thresholds', () => {
      expect(PROGRESSION_CONFIG.rpeThresholdForIncrease).toBeLessThan(
        PROGRESSION_CONFIG.rpeThresholdForDecrease
      )
    })

    it('has reasonable deload configuration', () => {
      expect(PROGRESSION_CONFIG.deloadReductionPercent).toBeGreaterThan(0)
      expect(PROGRESSION_CONFIG.deloadReductionPercent).toBeLessThan(100)
      expect(PROGRESSION_CONFIG.weeksBeforeDeload).toBeGreaterThanOrEqual(3)
    })
  })
})
