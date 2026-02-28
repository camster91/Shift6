import { describe, it, expect } from 'vitest'
import {
  calculateWeeklyVolume,
  analyzeVolumeTrend,
  detectDeloadNeed,
  detectPlateau,
  getDeloadProtocol,
  getCurrentWeekStatus,
  VOLUME_LANDMARKS
} from './volumeTracking'

describe('volumeTracking', () => {
  describe('calculateWeeklyVolume', () => {
    it('returns empty array for no history', () => {
      const result = calculateWeeklyVolume([])
      expect(result).toEqual([])
    })

    it('returns empty array for null history', () => {
      const result = calculateWeeklyVolume(null)
      expect(result).toEqual([])
    })

    it('groups workouts by week', () => {
      const now = new Date()
      const history = [
        { date: now.toISOString(), exerciseKey: 'pushups', volume: 50 },
        { date: now.toISOString(), exerciseKey: 'squats', volume: 100 },
        { date: new Date(now - 86400000 * 8).toISOString(), exerciseKey: 'pushups', volume: 40 },
      ]

      const result = calculateWeeklyVolume(history, 2)
      expect(result.length).toBe(2)
      expect(result[1].isCurrentWeek).toBe(true)
    })

    it('calculates total volume per week', () => {
      const now = new Date()
      // Use date from 2 days ago to ensure it falls within current week's range
      const twoDaysAgo = new Date(now - 86400000 * 2)
      const history = [
        { date: twoDaysAgo.toISOString(), exerciseKey: 'pushups', volume: 50 },
        { date: twoDaysAgo.toISOString(), exerciseKey: 'squats', volume: 100 },
      ]

      const result = calculateWeeklyVolume(history, 2)
      // Find the week that has the workouts
      const weekWithWorkouts = result.find(w => w.workoutCount > 0)
      expect(weekWithWorkouts).toBeDefined()
      expect(weekWithWorkouts.totalVolume).toBe(150)
      expect(weekWithWorkouts.workoutCount).toBe(2)
    })

    it('tracks volume by exercise', () => {
      const now = new Date()
      // Use date from 2 days ago to ensure it falls within current week's range
      const twoDaysAgo = new Date(now - 86400000 * 2)
      const history = [
        { date: twoDaysAgo.toISOString(), exerciseKey: 'pushups', volume: 50 },
        { date: twoDaysAgo.toISOString(), exerciseKey: 'pushups', volume: 60 },
        { date: twoDaysAgo.toISOString(), exerciseKey: 'squats', volume: 100 },
      ]

      const result = calculateWeeklyVolume(history, 2)
      // Find the week that has the workouts
      const weekWithWorkouts = result.find(w => w.workoutCount > 0)
      expect(weekWithWorkouts).toBeDefined()
      expect(weekWithWorkouts.byExercise.pushups.volume).toBe(110)
      expect(weekWithWorkouts.byExercise.pushups.count).toBe(2)
      expect(weekWithWorkouts.byExercise.squats.volume).toBe(100)
    })
  })

  describe('analyzeVolumeTrend', () => {
    it('returns insufficient data for less than 2 weeks', () => {
      const result = analyzeVolumeTrend([{ totalVolume: 100 }])
      expect(result.trend).toBe('insufficient-data')
    })

    it('detects increasing trend', () => {
      const weeklyData = [
        { totalVolume: 100 },
        { totalVolume: 120 },
        { totalVolume: 140 },
      ]
      const result = analyzeVolumeTrend(weeklyData)
      expect(['increasing', 'increasing-fast']).toContain(result.trend)
      expect(result.change).toBeGreaterThan(0)
    })

    it('detects decreasing trend', () => {
      // Data is oldest first, so this shows decreasing over time
      const weeklyData = [
        { totalVolume: 300 },
        { totalVolume: 200 },
        { totalVolume: 100 },
      ]
      const result = analyzeVolumeTrend(weeklyData)
      expect(['decreasing', 'decreasing-fast']).toContain(result.trend)
      expect(result.change).toBeLessThan(0)
    })

    it('detects stable trend', () => {
      // Very close values should be stable
      const weeklyData = [
        { totalVolume: 100 },
        { totalVolume: 100 },
        { totalVolume: 100 },
      ]
      const result = analyzeVolumeTrend(weeklyData)
      expect(result.trend).toBe('stable')
    })
  })

  describe('detectDeloadNeed', () => {
    it('returns no deload needed for light training', () => {
      const history = []
      const progress = {}
      const result = detectDeloadNeed(history, progress)

      expect(result.needsDeload).toBe(false)
      expect(result.urgency).toBe('none')
    })

    it('detects deload need for high volume weeks', () => {
      const now = new Date()
      const history = []
      // Create 4 weeks of high frequency training
      for (let week = 0; week < 4; week++) {
        for (let day = 0; day < 5; day++) {
          history.push({
            date: new Date(now - 86400000 * (week * 7 + day)).toISOString(),
            exerciseKey: 'pushups',
            volume: 50
          })
        }
      }

      const result = detectDeloadNeed(history, {})
      expect(result.deloadScore).toBeGreaterThan(0)
      expect(result.signals.length).toBeGreaterThan(0)
    })

    it('considers late-program exercises for fatigue', () => {
      const now = new Date()
      const history = [
        { date: now.toISOString(), exerciseKey: 'pushups', volume: 50 }
      ]
      const progress = {
        pushups: Array.from({ length: 15 }, (_, i) => i + 1),
        squats: Array.from({ length: 14 }, (_, i) => i + 1),
        pullups: Array.from({ length: 13 }, (_, i) => i + 1),
      }

      const result = detectDeloadNeed(history, progress)
      expect(result.signals.some(s => s.includes('exercises in late program'))).toBe(true)
    })
  })

  describe('detectPlateau', () => {
    it('returns needs more data for insufficient history', () => {
      const history = [
        { exerciseKey: 'pushups', volume: 50, date: new Date().toISOString() }
      ]
      const result = detectPlateau(history, 'pushups')
      expect(result.isPlateau).toBe(false)
      expect(result.confidence).toBe('low')
    })

    it('detects plateau when volume is stagnant', () => {
      const now = new Date()
      const history = [
        { exerciseKey: 'pushups', volume: 50, date: new Date(now - 86400000 * 6).toISOString() },
        { exerciseKey: 'pushups', volume: 51, date: new Date(now - 86400000 * 4).toISOString() },
        { exerciseKey: 'pushups', volume: 50, date: new Date(now - 86400000 * 2).toISOString() },
        { exerciseKey: 'pushups', volume: 52, date: now.toISOString() },
      ]

      const result = detectPlateau(history, 'pushups')
      expect(result.isPlateau).toBe(true)
    })

    it('does not detect plateau when progressing', () => {
      const now = new Date()
      const history = [
        { exerciseKey: 'pushups', volume: 40, date: new Date(now - 86400000 * 6).toISOString() },
        { exerciseKey: 'pushups', volume: 45, date: new Date(now - 86400000 * 4).toISOString() },
        { exerciseKey: 'pushups', volume: 50, date: new Date(now - 86400000 * 2).toISOString() },
        { exerciseKey: 'pushups', volume: 55, date: now.toISOString() },
      ]

      const result = detectPlateau(history, 'pushups')
      expect(result.isPlateau).toBe(false)
    })

    it('filters to specific exercise', () => {
      const now = new Date()
      const history = [
        { exerciseKey: 'pushups', volume: 50, date: new Date(now - 86400000 * 6).toISOString() },
        { exerciseKey: 'squats', volume: 100, date: new Date(now - 86400000 * 5).toISOString() },
        { exerciseKey: 'pushups', volume: 51, date: new Date(now - 86400000 * 4).toISOString() },
        { exerciseKey: 'squats', volume: 150, date: new Date(now - 86400000 * 3).toISOString() },
        { exerciseKey: 'pushups', volume: 50, date: new Date(now - 86400000 * 2).toISOString() },
        { exerciseKey: 'pushups', volume: 52, date: now.toISOString() },
      ]

      const result = detectPlateau(history, 'pushups')
      expect(result.isPlateau).toBe(true)
    })
  })

  describe('getDeloadProtocol', () => {
    it('returns null when no deload needed', () => {
      const result = getDeloadProtocol({ needsDeload: false })
      expect(result).toBeNull()
    })

    it('returns aggressive protocol for high urgency', () => {
      const result = getDeloadProtocol({ needsDeload: true, urgency: 'high' })
      expect(result.volumeReduction).toBe('50%')
      expect(result.duration).toBe('5-7 days')
    })

    it('returns moderate protocol for medium urgency', () => {
      const result = getDeloadProtocol({ needsDeload: true, urgency: 'medium' })
      expect(result.volumeReduction).toBe('30%')
    })
  })

  describe('getCurrentWeekStatus', () => {
    it('returns no-data for empty week data', () => {
      const result = getCurrentWeekStatus([])
      expect(result.status).toBe('no-data')
    })

    it('identifies high volume week', () => {
      const weeklyData = [
        { workoutCount: 3, totalVolume: 300, isCurrentWeek: false },
        { workoutCount: 5, totalVolume: 500, isCurrentWeek: true },
      ]
      const result = getCurrentWeekStatus(weeklyData)
      expect(result.status).toBe('high')
    })

    it('identifies normal week', () => {
      const weeklyData = [
        { workoutCount: 3, totalVolume: 300, isCurrentWeek: false },
        { workoutCount: 3, totalVolume: 300, isCurrentWeek: true },
      ]
      const result = getCurrentWeekStatus(weeklyData)
      expect(result.status).toBe('normal')
    })

    it('identifies low volume week', () => {
      const weeklyData = [
        { workoutCount: 4, totalVolume: 400, isCurrentWeek: false },
        { workoutCount: 2, totalVolume: 200, isCurrentWeek: true },
      ]
      const result = getCurrentWeekStatus(weeklyData)
      expect(result.status).toBe('low')
    })
  })

  describe('constants', () => {
    it('has volume landmarks', () => {
      expect(VOLUME_LANDMARKS.MV).toBe(0.6)
      expect(VOLUME_LANDMARKS.MEV).toBe(0.8)
      expect(VOLUME_LANDMARKS.MAV).toBe(1.0)
      expect(VOLUME_LANDMARKS.MRV).toBe(1.2)
    })
  })
})
