import { describe, it, expect } from 'vitest'
import {
  calculateRealisticHomeGoal,
  generateHomeWeeklyTargets,
  createHomeGoal,
  getHomeGoalWeek,
  getHomeCurrentTarget,
  recordHomeGoalResult,
  calculateHomeProgress,
  getHomeGoalsSummary,
  shouldSetNewHomeGoal,
  createFollowUpHomeGoal,
  inferCurrentMax
} from './homeGoals'

describe('homeGoals', () => {
  const mockExercise = {
    name: 'Push-Ups',
    unit: 'reps',
    startReps: 5,
    finalGoal: '100 Reps',
    color: 'blue'
  }

  const mockTimedExercise = {
    name: 'Plank',
    unit: 'seconds',
    startReps: 15,
    finalGoal: '180 Seconds',
    color: 'teal'
  }

  describe('calculateRealisticHomeGoal', () => {
    it('calculates a rep-based goal', () => {
      const result = calculateRealisticHomeGoal(mockExercise, 20, 'intermediate')
      expect(result.targetValue).toBeGreaterThan(20)
      expect(result.weeklyIncrease).toBeGreaterThan(0)
      expect(result.unit).toBe('reps')
    })

    it('calculates a timed goal', () => {
      const result = calculateRealisticHomeGoal(mockTimedExercise, 30, 'intermediate')
      expect(result.targetValue).toBeGreaterThan(30)
      expect(result.unit).toBe('seconds')
    })

    it('beginners get larger increases', () => {
      const beginner = calculateRealisticHomeGoal(mockExercise, 20, 'beginner')
      const advanced = calculateRealisticHomeGoal(mockExercise, 20, 'advanced')
      expect(beginner.targetValue).toBeGreaterThan(advanced.targetValue)
    })

    it('caps at exercise final goal', () => {
      const result = calculateRealisticHomeGoal(mockExercise, 90, 'beginner')
      expect(result.targetValue).toBeLessThanOrEqual(100)
    })

    it('ensures target is at least 3 above current', () => {
      const result = calculateRealisticHomeGoal(mockExercise, 99, 'advanced')
      expect(result.targetValue).toBeGreaterThanOrEqual(102)
    })
  })

  describe('generateHomeWeeklyTargets', () => {
    it('generates 6 weekly targets', () => {
      const targets = generateHomeWeeklyTargets(10, 30, 'reps')
      expect(targets).toHaveLength(6)
      expect(targets[0].week).toBe(1)
      expect(targets[5].week).toBe(6)
    })

    it('marks week 4 as deload', () => {
      const targets = generateHomeWeeklyTargets(10, 30, 'reps')
      expect(targets[3].isDeloadWeek).toBe(true)
    })

    it('targets increase over time', () => {
      const targets = generateHomeWeeklyTargets(10, 50, 'reps')
      expect(targets[5].targetValue).toBeGreaterThan(targets[0].targetValue)
    })

    it('includes unit in each target', () => {
      const targets = generateHomeWeeklyTargets(10, 30, 'seconds')
      targets.forEach(t => expect(t.unit).toBe('seconds'))
    })
  })

  describe('createHomeGoal', () => {
    it('creates a complete goal object', () => {
      const goal = createHomeGoal('pushups', mockExercise, 20)
      expect(goal.exerciseKey).toBe('pushups')
      expect(goal.exerciseName).toBe('Push-Ups')
      expect(goal.startingValue).toBe(20)
      expect(goal.targetValue).toBeGreaterThan(20)
      expect(goal.status).toBe('active')
      expect(goal.weeklyTargets).toHaveLength(6)
      expect(goal.history).toEqual([])
      expect(goal.startDate).toBeTruthy()
      expect(goal.targetDate).toBeTruthy()
    })

    it('uses custom target when provided', () => {
      const goal = createHomeGoal('pushups', mockExercise, 20, 50)
      expect(goal.targetValue).toBe(50)
    })

    it('sets target date 42 days from now', () => {
      const goal = createHomeGoal('pushups', mockExercise, 20)
      const start = new Date(goal.startDate)
      const target = new Date(goal.targetDate)
      const diffDays = Math.round((target - start) / (1000 * 60 * 60 * 24))
      expect(diffDays).toBe(42)
    })
  })

  describe('getHomeGoalWeek', () => {
    it('returns 1 for a newly created goal', () => {
      const goal = createHomeGoal('pushups', mockExercise, 20)
      expect(getHomeGoalWeek(goal)).toBe(1)
    })

    it('returns correct week based on start date', () => {
      const goal = createHomeGoal('pushups', mockExercise, 20)
      // Set start date to 14 days ago
      goal.startDate = new Date(Date.now() - 14 * 86400000).toISOString()
      expect(getHomeGoalWeek(goal)).toBe(3)
    })

    it('caps at 7 for goals past target date', () => {
      const goal = createHomeGoal('pushups', mockExercise, 20)
      goal.startDate = new Date(Date.now() - 50 * 86400000).toISOString()
      expect(getHomeGoalWeek(goal)).toBe(7)
    })

    it('returns 1 for null startDate', () => {
      expect(getHomeGoalWeek({ startDate: null })).toBe(1)
    })
  })

  describe('getHomeCurrentTarget', () => {
    it('returns first week target for new goal', () => {
      const goal = createHomeGoal('pushups', mockExercise, 20, 40)
      const target = getHomeCurrentTarget(goal)
      expect(target.week).toBe(1)
      expect(target.targetValue).toBeGreaterThan(20)
      expect(target.isPastTarget).toBe(false)
    })

    it('returns last week target for expired goals', () => {
      const goal = createHomeGoal('pushups', mockExercise, 20, 40)
      goal.startDate = new Date(Date.now() - 50 * 86400000).toISOString()
      const target = getHomeCurrentTarget(goal)
      expect(target.isPastTarget).toBe(true)
    })
  })

  describe('recordHomeGoalResult', () => {
    it('records a workout result', () => {
      const goal = createHomeGoal('pushups', mockExercise, 20, 40)
      const updated = recordHomeGoalResult(goal, 25)
      expect(updated.history).toHaveLength(1)
      expect(updated.history[0].actualValue).toBe(25)
      expect(updated.lastWorkout.actualValue).toBe(25)
    })

    it('marks goal as completed when target reached at week 6', () => {
      const goal = createHomeGoal('pushups', mockExercise, 20, 40)
      goal.startDate = new Date(Date.now() - 38 * 86400000).toISOString()
      const updated = recordHomeGoalResult(goal, 45)
      expect(updated.status).toBe('completed')
    })

    it('provides correct analysis for exceeding target', () => {
      const goal = createHomeGoal('pushups', mockExercise, 20, 40)
      const target = getHomeCurrentTarget(goal)
      const updated = recordHomeGoalResult(goal, target.targetValue + 10)
      expect(updated.lastWorkout.analysis.status).toBe('ahead')
    })

    it('provides correct analysis for falling behind', () => {
      const goal = createHomeGoal('pushups', mockExercise, 20, 40)
      const updated = recordHomeGoalResult(goal, 5)
      expect(['behind', 'struggling']).toContain(updated.lastWorkout.analysis.status)
    })
  })

  describe('calculateHomeProgress', () => {
    it('returns 0 for goal with no history (adjusted for time)', () => {
      const goal = createHomeGoal('pushups', mockExercise, 20, 40)
      const progress = calculateHomeProgress(goal)
      expect(progress).toBeGreaterThanOrEqual(0)
      expect(progress).toBeLessThanOrEqual(30)
    })

    it('returns correct progress based on latest result', () => {
      const goal = createHomeGoal('pushups', mockExercise, 20, 40)
      goal.history = [{ actualValue: 30 }]
      expect(calculateHomeProgress(goal)).toBe(50)
    })

    it('returns 100 when target reached', () => {
      const goal = createHomeGoal('pushups', mockExercise, 20, 40)
      goal.history = [{ actualValue: 40 }]
      expect(calculateHomeProgress(goal)).toBe(100)
    })

    it('caps at 100 for exceeding target', () => {
      const goal = createHomeGoal('pushups', mockExercise, 20, 40)
      goal.history = [{ actualValue: 60 }]
      expect(calculateHomeProgress(goal)).toBe(100)
    })
  })

  describe('getHomeGoalsSummary', () => {
    it('returns empty summary for no goals', () => {
      const summary = getHomeGoalsSummary({})
      expect(summary.total).toBe(0)
      expect(summary.active).toBe(0)
    })

    it('counts active and completed goals', () => {
      const goals = {
        pushups: createHomeGoal('pushups', mockExercise, 20, 40),
        squats: { ...createHomeGoal('squats', mockExercise, 10, 30), status: 'completed' }
      }
      const summary = getHomeGoalsSummary(goals)
      expect(summary.total).toBe(2)
      expect(summary.active).toBe(1)
      expect(summary.completed).toBe(1)
    })
  })

  describe('shouldSetNewHomeGoal', () => {
    it('returns true for null goal', () => {
      expect(shouldSetNewHomeGoal(null)).toBe(true)
    })

    it('returns true for completed goal', () => {
      const goal = createHomeGoal('pushups', mockExercise, 20)
      goal.status = 'completed'
      expect(shouldSetNewHomeGoal(goal)).toBe(true)
    })

    it('returns false for active goal within 6 weeks', () => {
      const goal = createHomeGoal('pushups', mockExercise, 20)
      expect(shouldSetNewHomeGoal(goal)).toBe(false)
    })

    it('returns true for goal past 6 weeks', () => {
      const goal = createHomeGoal('pushups', mockExercise, 20)
      goal.startDate = new Date(Date.now() - 50 * 86400000).toISOString()
      expect(shouldSetNewHomeGoal(goal)).toBe(true)
    })
  })

  describe('createFollowUpHomeGoal', () => {
    it('creates a follow-up goal from previous', () => {
      const prev = createHomeGoal('pushups', mockExercise, 20, 40)
      prev.history = [{ actualValue: 38 }]
      const followUp = createFollowUpHomeGoal(prev, mockExercise)
      expect(followUp.startingValue).toBe(38)
      expect(followUp.targetValue).toBeGreaterThan(38)
      expect(followUp.status).toBe('active')
    })

    it('uses target value when no history', () => {
      const prev = createHomeGoal('pushups', mockExercise, 20, 40)
      const followUp = createFollowUpHomeGoal(prev, mockExercise)
      expect(followUp.startingValue).toBe(40)
    })
  })

  describe('inferCurrentMax', () => {
    it('returns 0 for no data', () => {
      expect(inferCurrentMax('pushups', [], {})).toBe(0)
    })

    it('prefers personal records', () => {
      const prs = { pushups: { volume: 50 } }
      const history = [{ exerciseKey: 'pushups', volume: 30 }]
      expect(inferCurrentMax('pushups', history, prs)).toBe(50)
    })

    it('falls back to history max', () => {
      const history = [
        { exerciseKey: 'pushups', volume: 30 },
        { exerciseKey: 'pushups', volume: 45 },
        { exerciseKey: 'pushups', volume: 35 }
      ]
      expect(inferCurrentMax('pushups', history, {})).toBe(45)
    })
  })
})
