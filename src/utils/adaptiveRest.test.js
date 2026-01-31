import { describe, it, expect } from 'vitest'
import {
  getExerciseIntensity,
  getBodyRegion,
  calculateAdaptiveRest,
  getRestMessage,
  formatRestTime,
  getRestAdjustments,
  EXERCISE_INTENSITY,
  BASE_REST_BY_INTENSITY
} from './adaptiveRest'

describe('adaptiveRest', () => {
  describe('getExerciseIntensity', () => {
    it('returns high for compound movements', () => {
      expect(getExerciseIntensity('pullups')).toBe('high')
      expect(getExerciseIntensity('dips')).toBe('high')
      expect(getExerciseIntensity('squats')).toBe('high')
      expect(getExerciseIntensity('lunges')).toBe('high')
    })

    it('returns medium for moderate exercises', () => {
      expect(getExerciseIntensity('pushups')).toBe('medium')
      expect(getExerciseIntensity('glutebridge')).toBe('medium')
      expect(getExerciseIntensity('vups')).toBe('medium')
    })

    it('returns low for isolation/static exercises', () => {
      expect(getExerciseIntensity('plank')).toBe('low')
      expect(getExerciseIntensity('supermans')).toBe('low')
    })

    it('returns low for unknown exercises', () => {
      expect(getExerciseIntensity('unknown')).toBe('low')
    })
  })

  describe('getBodyRegion', () => {
    it('returns upper for upper body exercises', () => {
      expect(getBodyRegion('pushups')).toBe('upper')
      expect(getBodyRegion('dips')).toBe('upper')
      expect(getBodyRegion('pullups')).toBe('upper')
      expect(getBodyRegion('supermans')).toBe('upper')
    })

    it('returns lower for lower body exercises', () => {
      expect(getBodyRegion('squats')).toBe('lower')
      expect(getBodyRegion('lunges')).toBe('lower')
      expect(getBodyRegion('glutebridge')).toBe('lower')
      expect(getBodyRegion('vups')).toBe('lower')
      expect(getBodyRegion('plank')).toBe('lower')
    })

    it('returns core for unknown exercises', () => {
      expect(getBodyRegion('unknown')).toBe('core')
    })
  })

  describe('calculateAdaptiveRest', () => {
    it('returns base rest time for auto mode with no modifiers', () => {
      const result = calculateAdaptiveRest({
        exerciseKey: 'pushups',
        completedReps: 10,
        targetReps: 10,
        currentSet: 1,
        totalSets: 4,
        setsCompletedInSession: 0,
        userBaseRest: 'auto'
      })

      expect(result.recommendedRest).toBe(60) // medium intensity base
      expect(result.isAdaptive).toBe(true)
      expect(result.intensity).toBe('medium')
    })

    it('uses user base rest when not auto', () => {
      const result = calculateAdaptiveRest({
        exerciseKey: 'pushups',
        completedReps: 10,
        targetReps: 10,
        currentSet: 1,
        totalSets: 4,
        setsCompletedInSession: 0,
        userBaseRest: 45
      })

      expect(result.baseRest).toBe(45)
      expect(result.isAdaptive).toBe(false)
    })

    it('increases rest with accumulated fatigue', () => {
      const result = calculateAdaptiveRest({
        exerciseKey: 'pushups',
        completedReps: 10,
        targetReps: 10,
        currentSet: 1,
        totalSets: 4,
        setsCompletedInSession: 8,
        userBaseRest: 'auto'
      })

      expect(result.recommendedRest).toBeGreaterThan(60)
      expect(result.reasons).toContain('Accumulated fatigue')
    })

    it('decreases rest when exceeding target', () => {
      const result = calculateAdaptiveRest({
        exerciseKey: 'pushups',
        completedReps: 15,
        targetReps: 10,
        currentSet: 1,
        totalSets: 4,
        setsCompletedInSession: 0,
        userBaseRest: 'auto'
      })

      expect(result.recommendedRest).toBeLessThan(60)
      expect(result.reasons).toContain('Strong performance')
    })

    it('increases rest when falling short', () => {
      const result = calculateAdaptiveRest({
        exerciseKey: 'pushups',
        completedReps: 7,
        targetReps: 10,
        currentSet: 1,
        totalSets: 4,
        setsCompletedInSession: 0,
        userBaseRest: 'auto'
      })

      expect(result.recommendedRest).toBeGreaterThan(60)
      expect(result.reasons).toContain('Recovery needed')
    })

    it('adds late workout bonus', () => {
      const result = calculateAdaptiveRest({
        exerciseKey: 'pushups',
        completedReps: 10,
        targetReps: 10,
        currentSet: 5,
        totalSets: 6,
        setsCompletedInSession: 0,
        userBaseRest: 'auto'
      })

      expect(result.reasons).toContain('Deep in workout')
    })

    it('clamps rest time to 20-180 seconds', () => {
      // Very low rest scenario
      const lowResult = calculateAdaptiveRest({
        exerciseKey: 'plank',
        completedReps: 100,
        targetReps: 30,
        currentSet: 1,
        totalSets: 1,
        setsCompletedInSession: 0,
        userBaseRest: 10
      })
      expect(lowResult.recommendedRest).toBeGreaterThanOrEqual(20)

      // Very high rest scenario
      const highResult = calculateAdaptiveRest({
        exerciseKey: 'pullups',
        completedReps: 5,
        targetReps: 20,
        currentSet: 6,
        totalSets: 6,
        setsCompletedInSession: 20,
        userBaseRest: 200
      })
      expect(highResult.recommendedRest).toBeLessThanOrEqual(180)
    })
  })

  describe('getRestMessage', () => {
    it('returns recovery message when needed', () => {
      const msg = getRestMessage({
        reasons: ['Recovery needed'],
        intensity: 'medium'
      })
      expect(msg).toBe('Take extra time to recover')
    })

    it('returns strong performance message', () => {
      const msg = getRestMessage({
        reasons: ['Strong performance'],
        intensity: 'medium'
      })
      expect(msg).toBe('Great set! Quick rest')
    })

    it('returns fatigue message', () => {
      const msg = getRestMessage({
        reasons: ['Accumulated fatigue'],
        intensity: 'medium'
      })
      expect(msg).toBe('Building fatigue - rest up')
    })

    it('returns compound movement message for high intensity', () => {
      const msg = getRestMessage({
        reasons: ['Standard rest'],
        intensity: 'high'
      })
      expect(msg).toBe('Compound movement - full recovery')
    })

    it('returns default message', () => {
      const msg = getRestMessage({
        reasons: ['Standard rest'],
        intensity: 'medium'
      })
      expect(msg).toBe('Ready when you are')
    })
  })

  describe('formatRestTime', () => {
    it('formats seconds under a minute', () => {
      expect(formatRestTime(30)).toBe('30s')
      expect(formatRestTime(45)).toBe('45s')
    })

    it('formats exact minutes', () => {
      expect(formatRestTime(60)).toBe('1:00')
      expect(formatRestTime(120)).toBe('2:00')
    })

    it('formats minutes and seconds', () => {
      expect(formatRestTime(90)).toBe('1:30')
      expect(formatRestTime(75)).toBe('1:15')
      expect(formatRestTime(135)).toBe('2:15')
    })
  })

  describe('getRestAdjustments', () => {
    it('returns adjustment options', () => {
      const adjustments = getRestAdjustments(60)
      expect(adjustments.shorter).toBe(45)
      expect(adjustments.current).toBe(60)
      expect(adjustments.longer).toBe(75)
    })

    it('clamps shorter to minimum 20', () => {
      const adjustments = getRestAdjustments(25)
      expect(adjustments.shorter).toBe(20)
    })

    it('clamps longer to maximum 180', () => {
      const adjustments = getRestAdjustments(170)
      expect(adjustments.longer).toBe(180)
    })
  })

  describe('constants', () => {
    it('has exercise intensity categories', () => {
      expect(EXERCISE_INTENSITY.high).toContain('pullups')
      expect(EXERCISE_INTENSITY.medium).toContain('pushups')
      expect(EXERCISE_INTENSITY.low).toContain('plank')
    })

    it('has base rest times by intensity', () => {
      expect(BASE_REST_BY_INTENSITY.high).toBe(90)
      expect(BASE_REST_BY_INTENSITY.medium).toBe(60)
      expect(BASE_REST_BY_INTENSITY.low).toBe(45)
    })
  })
})
