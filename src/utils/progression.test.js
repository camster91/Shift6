import { describe, it, expect, beforeEach } from 'vitest'
import {
  // Constants
  PERFORMANCE_CATEGORIES,
  SPRINT_STATUS,

  // Sprint Generation
  getImprovementFactor,
  generateWeeklyTargets,
  distributeReps,
  getRepSchemeConfig,
  generateWeekWorkouts,
  generateSprint,

  // Performance Analysis
  categorizePerformance,
  analyzeWorkoutPerformance,
  getAdjustment,
  smoothPerformanceRatio,

  // Sprint Adjustment
  recalculateSprint,
  advanceSprint,
  getCurrentWorkout,

  // Sprint Completion
  completeSprint,
  generateNextSprint,

  // Progress Metrics
  getSprintProgress,

  // Storage
  loadSprints,
  saveSprints,
  getActiveSprint,
  getOrCreateSprint,
} from './progression'

describe('progression', () => {
  describe('getImprovementFactor', () => {
    it('returns higher factor for beginners', () => {
      const beginnerFactor = getImprovementFactor(10, 'pushups', { finalGoal: 100 })
      const advancedFactor = getImprovementFactor(80, 'pushups', { finalGoal: 100 })

      expect(beginnerFactor).toBeGreaterThan(advancedFactor)
    })

    it('returns at least 0.05 for near-max users', () => {
      const factor = getImprovementFactor(95, 'pushups', { finalGoal: 100 })
      expect(factor).toBeGreaterThanOrEqual(0.05)
    })

    it('returns up to 0.45 for complete beginners', () => {
      const factor = getImprovementFactor(5, 'pushups', { finalGoal: 100 })
      expect(factor).toBeLessThanOrEqual(0.45)
    })

    it('scales based on progress toward final goal', () => {
      const at20 = getImprovementFactor(20, 'pushups', { finalGoal: 100 })
      const at40 = getImprovementFactor(40, 'pushups', { finalGoal: 100 })
      const at60 = getImprovementFactor(60, 'pushups', { finalGoal: 100 })

      expect(at20).toBeGreaterThan(at40)
      expect(at40).toBeGreaterThan(at60)
    })
  })

  describe('generateWeeklyTargets', () => {
    it('generates 6 weekly targets by default', () => {
      const targets = generateWeeklyTargets(20, 30, 6)
      expect(targets).toHaveLength(6)
    })

    it('starts near starting max and ends at target', () => {
      const targets = generateWeeklyTargets(20, 30, 6)

      expect(targets[0]).toBeGreaterThan(20)
      expect(targets[5]).toBe(30)
    })

    it('progresses non-linearly (faster early gains)', () => {
      const targets = generateWeeklyTargets(20, 40, 6)

      // Early gains should be larger
      const earlyGain = targets[1] - targets[0]
      const lateGain = targets[5] - targets[4]

      expect(earlyGain).toBeGreaterThanOrEqual(lateGain)
    })

    it('handles same start and target', () => {
      const targets = generateWeeklyTargets(30, 30, 6)
      expect(targets.every(t => t === 30)).toBe(true)
    })
  })

  describe('distributeReps', () => {
    it('distributes total across sets', () => {
      const reps = distributeReps(40, 4, [8, 15])
      const total = reps.reduce((a, b) => a + b, 0)

      expect(total).toBeGreaterThanOrEqual(40)
      expect(reps).toHaveLength(4)
    })

    it('creates descending pyramid', () => {
      const reps = distributeReps(50, 4, [8, 15])

      // First set should be >= last set
      expect(reps[0]).toBeGreaterThanOrEqual(reps[reps.length - 1])
    })

    it('respects min/max rep range', () => {
      const reps = distributeReps(30, 4, [5, 10])

      reps.forEach(r => {
        expect(r).toBeGreaterThanOrEqual(5)
        // Last set might exceed max slightly due to remainder distribution
      })
    })

    it('handles small totals', () => {
      const reps = distributeReps(12, 3, [3, 8])
      const total = reps.reduce((a, b) => a + b, 0)

      expect(total).toBeGreaterThanOrEqual(12)
      expect(reps).toHaveLength(3)
    })
  })

  describe('getRepSchemeConfig', () => {
    it('returns correct config for strength', () => {
      const config = getRepSchemeConfig('strength')

      expect(config.sets).toBe(5)
      expect(config.repRange[0]).toBeLessThan(config.repRange[1])
      expect(config.restSeconds).toBe(120)
    })

    it('returns correct config for hypertrophy', () => {
      const config = getRepSchemeConfig('hypertrophy')

      expect(config.sets).toBe(4)
      expect(config.repRange).toEqual([8, 15])
    })

    it('returns correct config for endurance', () => {
      const config = getRepSchemeConfig('endurance')

      expect(config.sets).toBe(3)
      expect(config.repRange[1]).toBeGreaterThanOrEqual(25)
    })

    it('defaults to hypertrophy for unknown schemes', () => {
      const config = getRepSchemeConfig('unknown')
      expect(config).toEqual(getRepSchemeConfig('hypertrophy'))
    })
  })

  describe('generateWeekWorkouts', () => {
    it('generates workouts for a week', () => {
      const week = generateWeekWorkouts(30, 0, 'hypertrophy', 3)

      expect(week.week).toBe(1)
      expect(week.days).toHaveLength(3)
      expect(week.theme).toBe('foundation')
    })

    it('creates progressive intensity within week', () => {
      const week = generateWeekWorkouts(30, 2, 'hypertrophy', 3)

      // Day 3 should have higher total than Day 1
      expect(week.days[2].total).toBeGreaterThan(week.days[0].total)
    })

    it('creates test day in week 6', () => {
      const week = generateWeekWorkouts(50, 5, 'hypertrophy', 3)
      const lastDay = week.days[week.days.length - 1]

      expect(lastDay.isTestDay).toBe(true)
      expect(lastDay.instructions).toContain('Max effort')
    })

    it('respects days per week limit', () => {
      const week = generateWeekWorkouts(30, 0, 'hypertrophy', 2)
      expect(week.days).toHaveLength(2)
    })
  })

  describe('generateSprint', () => {
    it('generates complete 6-week sprint', () => {
      const sprint = generateSprint('pushups', 25, {
        repScheme: 'hypertrophy',
        trainingDaysPerWeek: 3,
        programDuration: 6,
      })

      expect(sprint.weeks).toHaveLength(6)
      expect(sprint.startingMax).toBe(25)
      expect(sprint.targetMax).toBeGreaterThan(25)
      expect(sprint.status).toBe(SPRINT_STATUS.ACTIVE)
    })

    it('calculates realistic target based on starting level', () => {
      const beginnerSprint = generateSprint('pushups', 10, { repScheme: 'hypertrophy' }, { finalGoal: 100 })
      const advancedSprint = generateSprint('pushups', 80, { repScheme: 'hypertrophy' }, { finalGoal: 100 })

      const beginnerImprovement = (beginnerSprint.targetMax - 10) / 10
      const advancedImprovement = (advancedSprint.targetMax - 80) / 80

      expect(beginnerImprovement).toBeGreaterThan(advancedImprovement)
    })

    it('includes tracking fields', () => {
      const sprint = generateSprint('squats', 30, { repScheme: 'strength' })

      expect(sprint.currentWeek).toBe(0)
      expect(sprint.currentDay).toBe(0)
      expect(sprint.completedWorkouts).toBe(0)
      expect(sprint.performanceHistory).toEqual([])
      expect(sprint.adjustmentsMade).toBe(0)
    })
  })

  describe('categorizePerformance', () => {
    it('categorizes struggling performance', () => {
      expect(categorizePerformance(0.65)).toBe(PERFORMANCE_CATEGORIES.STRUGGLING)
    })

    it('categorizes below target performance', () => {
      expect(categorizePerformance(0.80)).toBe(PERFORMANCE_CATEGORIES.BELOW_TARGET)
    })

    it('categorizes on track performance', () => {
      expect(categorizePerformance(0.95)).toBe(PERFORMANCE_CATEGORIES.ON_TRACK)
      expect(categorizePerformance(1.00)).toBe(PERFORMANCE_CATEGORIES.ON_TRACK)
    })

    it('categorizes exceeding performance', () => {
      expect(categorizePerformance(1.10)).toBe(PERFORMANCE_CATEGORIES.EXCEEDING)
    })

    it('categorizes crushing performance', () => {
      expect(categorizePerformance(1.20)).toBe(PERFORMANCE_CATEGORIES.CRUSHING)
    })
  })

  describe('analyzeWorkoutPerformance', () => {
    it('calculates correct performance ratio', () => {
      const result = analyzeWorkoutPerformance([12, 10, 8], [10, 10, 10], 0)

      expect(result.actualTotal).toBe(30)
      expect(result.targetTotal).toBe(30)
      expect(result.performanceRatio).toBe(1.0)
    })

    it('includes AMRAP reps in total', () => {
      const result = analyzeWorkoutPerformance([10, 10, 10], [10, 10, 10], 5)

      expect(result.actualTotal).toBe(35)
      expect(result.performanceRatio).toBeGreaterThan(1.0)
    })

    it('calculates completion rate', () => {
      const result = analyzeWorkoutPerformance([10, 8, 5], [10, 10, 10], 0)

      expect(result.setsCompleted).toBe(1)
      expect(result.completionRate).toBeCloseTo(0.33, 1)
    })

    it('includes adjustment recommendation', () => {
      const poor = analyzeWorkoutPerformance([5, 5, 5], [10, 10, 10], 0)
      const great = analyzeWorkoutPerformance([15, 15, 15], [10, 10, 10], 0)

      expect(poor.adjustment.factor).toBeLessThan(1.0)
      expect(great.adjustment.factor).toBeGreaterThan(1.0)
    })
  })

  describe('getAdjustment', () => {
    it('returns no adjustment for on track', () => {
      const adj = getAdjustment(PERFORMANCE_CATEGORIES.ON_TRACK)
      expect(adj.factor).toBe(1.0)
      expect(adj.shouldAdjust).toBe(false)
    })

    it('returns decrease for struggling', () => {
      const adj = getAdjustment(PERFORMANCE_CATEGORIES.STRUGGLING)
      expect(adj.factor).toBeLessThan(1.0)
      expect(adj.shouldAdjust).toBe(true)
    })

    it('returns increase for crushing', () => {
      const adj = getAdjustment(PERFORMANCE_CATEGORIES.CRUSHING)
      expect(adj.factor).toBeGreaterThan(1.0)
      expect(adj.shouldAdjust).toBe(true)
    })

    it('includes motivational message', () => {
      const adj = getAdjustment(PERFORMANCE_CATEGORIES.EXCEEDING)
      expect(adj.message).toBeDefined()
      expect(typeof adj.message).toBe('string')
    })
  })

  describe('smoothPerformanceRatio', () => {
    it('dampens single outlier performances', () => {
      const history = [
        { performanceRatio: 1.0 },
        { performanceRatio: 1.0 },
      ]
      const outlier = { performanceRatio: 0.5 }

      const smoothed = smoothPerformanceRatio(history, outlier)

      // Should be between outlier and history average
      expect(smoothed).toBeGreaterThan(0.5)
      expect(smoothed).toBeLessThan(1.0)
    })

    it('gives more weight to recent performances', () => {
      const history = [{ performanceRatio: 0.8 }]
      const recent = { performanceRatio: 1.2 }

      const smoothed = smoothPerformanceRatio(history, recent)

      // Should be closer to recent than old
      expect(smoothed).toBeGreaterThan(1.0)
    })
  })

  describe('recalculateSprint', () => {
    let baseSprint

    beforeEach(() => {
      baseSprint = generateSprint('pushups', 20, {
        repScheme: 'hypertrophy',
        trainingDaysPerWeek: 3,
      })
      baseSprint.currentWeek = 1
    })

    it('does not modify past weeks', () => {
      const performance = analyzeWorkoutPerformance([5, 5, 5], [10, 10, 10], 0)
      const updated = recalculateSprint(baseSprint, performance)

      // Week 1 should be unchanged
      expect(updated.weeks[0]).toEqual(baseSprint.weeks[0])
    })

    it('adjusts future weeks based on performance', () => {
      const performance = analyzeWorkoutPerformance([5, 5, 5], [10, 10, 10], 0)
      const updated = recalculateSprint(baseSprint, performance)

      // Week 3+ should have reduced targets
      const originalWeek3Total = baseSprint.weeks[2].days[0].total
      const updatedWeek3Total = updated.weeks[2].days[0].total

      expect(updatedWeek3Total).toBeLessThan(originalWeek3Total)
    })

    it('records adjustment in history', () => {
      const performance = analyzeWorkoutPerformance([5, 5, 5], [10, 10, 10], 0)
      const updated = recalculateSprint(baseSprint, performance)

      expect(updated.adjustmentsMade).toBe(1)
      expect(updated.lastAdjustment).toBeDefined()
      expect(updated.performanceHistory).toHaveLength(1)
    })

    it('does not adjust for on-track performance', () => {
      const performance = analyzeWorkoutPerformance([10, 10, 10], [10, 10, 10], 0)
      const updated = recalculateSprint(baseSprint, performance)

      expect(updated.adjustmentsMade).toBe(0)
      expect(updated.weeks).toEqual(baseSprint.weeks)
    })
  })

  describe('advanceSprint', () => {
    it('advances to next day', () => {
      const sprint = generateSprint('pushups', 20, { repScheme: 'hypertrophy' })
      const advanced = advanceSprint(sprint)

      expect(advanced.currentDay).toBe(1)
      expect(advanced.completedWorkouts).toBe(1)
    })

    it('advances to next week when days complete', () => {
      const sprint = generateSprint('pushups', 20, { repScheme: 'hypertrophy' })
      sprint.currentDay = 2 // Last day of week

      const advanced = advanceSprint(sprint)

      expect(advanced.currentWeek).toBe(1)
      expect(advanced.currentDay).toBe(0)
    })

    it('marks sprint complete when all weeks done', () => {
      const sprint = generateSprint('pushups', 20, { repScheme: 'hypertrophy' })
      sprint.currentWeek = 5
      sprint.currentDay = 2

      const advanced = advanceSprint(sprint)

      expect(advanced.status).toBe(SPRINT_STATUS.COMPLETED)
      expect(advanced.completedAt).toBeDefined()
    })
  })

  describe('getCurrentWorkout', () => {
    it('returns current workout data', () => {
      const sprint = generateSprint('pushups', 20, { repScheme: 'hypertrophy' })
      const workout = getCurrentWorkout(sprint)

      expect(workout).toBeDefined()
      expect(workout.weekNumber).toBe(1)
      expect(workout.dayNumber).toBe(1)
      expect(workout.reps).toBeDefined()
    })

    it('returns null for completed sprint', () => {
      const sprint = generateSprint('pushups', 20, { repScheme: 'hypertrophy' })
      sprint.status = SPRINT_STATUS.COMPLETED

      expect(getCurrentWorkout(sprint)).toBeNull()
    })

    it('includes isLastWorkout flag', () => {
      const sprint = generateSprint('pushups', 20, { repScheme: 'hypertrophy' })
      sprint.currentWeek = 5
      sprint.currentDay = 2

      const workout = getCurrentWorkout(sprint)
      expect(workout.isLastWorkout).toBe(true)
    })
  })

  describe('completeSprint', () => {
    it('calculates improvement correctly', () => {
      const sprint = generateSprint('pushups', 20, { repScheme: 'hypertrophy' })
      sprint.completedWorkouts = 18

      const completed = completeSprint(sprint, 28)

      expect(completed.finalMax).toBe(28)
      expect(completed.actualImprovement).toBe(8)
      expect(completed.actualImprovementPercent).toBe(40)
    })

    it('determines if goal was achieved', () => {
      const sprint = generateSprint('pushups', 20, { repScheme: 'hypertrophy' })
      sprint.targetMax = 25

      const achieved = completeSprint(sprint, 30)
      const notAchieved = completeSprint(sprint, 22)

      expect(achieved.goalAchieved).toBe(true)
      expect(notAchieved.goalAchieved).toBe(false)
    })

    it('generates summary', () => {
      const sprint = generateSprint('pushups', 20, { repScheme: 'hypertrophy' })
      const completed = completeSprint(sprint, 28)

      expect(completed.summary).toBeDefined()
      expect(completed.summary.startingMax).toBe(20)
      expect(completed.summary.finalMax).toBe(28)
    })
  })

  describe('generateNextSprint', () => {
    it('uses final max as new starting point', () => {
      const previous = generateSprint('pushups', 20, { repScheme: 'hypertrophy' })
      previous.finalMax = 30
      previous.averagePerformanceRatio = 1.0

      const next = generateNextSprint(previous, { repScheme: 'hypertrophy' })

      expect(next.startingMax).toBe(30)
    })

    it('adjusts expectations based on past performance', () => {
      const crushedIt = generateSprint('pushups', 20, { repScheme: 'hypertrophy' })
      crushedIt.finalMax = 30
      crushedIt.averagePerformanceRatio = 1.2

      const struggled = generateSprint('pushups', 20, { repScheme: 'hypertrophy' })
      struggled.finalMax = 30
      struggled.averagePerformanceRatio = 0.75

      const nextAfterCrushing = generateNextSprint(crushedIt, { repScheme: 'hypertrophy' })
      const nextAfterStruggling = generateNextSprint(struggled, { repScheme: 'hypertrophy' })

      expect(nextAfterCrushing.targetMax).toBeGreaterThan(nextAfterStruggling.targetMax)
    })

    it('links to previous sprint', () => {
      const previous = generateSprint('pushups', 20, { repScheme: 'hypertrophy' })
      previous.finalMax = 30

      const next = generateNextSprint(previous, { repScheme: 'hypertrophy' })

      expect(next.previousSprintId).toBe(previous.id)
    })
  })

  describe('getSprintProgress', () => {
    it('calculates progress metrics', () => {
      const sprint = generateSprint('pushups', 20, { repScheme: 'hypertrophy' })
      sprint.completedWorkouts = 9
      sprint.totalWorkouts = 18

      const progress = getSprintProgress(sprint)

      expect(progress.percentComplete).toBe(50)
      expect(progress.workoutsRemaining).toBe(9)
    })

    it('returns null for null sprint', () => {
      expect(getSprintProgress(null)).toBeNull()
    })

    it('includes projection', () => {
      const sprint = generateSprint('pushups', 20, { repScheme: 'hypertrophy' })
      sprint.averagePerformanceRatio = 1.1

      const progress = getSprintProgress(sprint)

      expect(progress.projection).toBeDefined()
      expect(progress.projection.estimatedFinalMax).toBeDefined()
    })
  })

  describe('storage helpers', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('loadSprints returns empty object when nothing saved', () => {
      expect(loadSprints()).toEqual({})
    })

    it('saveSprints and loadSprints work together', () => {
      const sprints = {
        sprint_1: { id: 'sprint_1', exerciseKey: 'pushups' },
      }

      saveSprints(sprints)
      expect(loadSprints()).toEqual(sprints)
    })

    it('getActiveSprint finds active sprint for exercise', () => {
      const sprints = {
        sprint_1: { id: 'sprint_1', exerciseKey: 'pushups', status: SPRINT_STATUS.COMPLETED },
        sprint_2: { id: 'sprint_2', exerciseKey: 'pushups', status: SPRINT_STATUS.ACTIVE },
        sprint_3: { id: 'sprint_3', exerciseKey: 'squats', status: SPRINT_STATUS.ACTIVE },
      }

      const active = getActiveSprint(sprints, 'pushups')
      expect(active.id).toBe('sprint_2')
    })

    it('getActiveSprint returns null when no active sprint', () => {
      const sprints = {
        sprint_1: { id: 'sprint_1', exerciseKey: 'pushups', status: SPRINT_STATUS.COMPLETED },
      }

      expect(getActiveSprint(sprints, 'pushups')).toBeNull()
    })

    it('getOrCreateSprint returns existing active sprint', () => {
      const existing = { id: 'sprint_1', exerciseKey: 'pushups', status: SPRINT_STATUS.ACTIVE }
      const sprints = { sprint_1: existing }

      const result = getOrCreateSprint(sprints, 'pushups', 20, { repScheme: 'hypertrophy' })

      expect(result.id).toBe('sprint_1')
    })

    it('getOrCreateSprint creates new sprint when none exists', () => {
      const result = getOrCreateSprint({}, 'pushups', 20, { repScheme: 'hypertrophy' })

      expect(result.exerciseKey).toBe('pushups')
      expect(result.startingMax).toBe(20)
      expect(result.status).toBe(SPRINT_STATUS.ACTIVE)
    })
  })
})
