import { describe, it, expect } from 'vitest'
import {
    MS_PER_SECOND,
    MS_PER_DAY,
    TIMER_INTERVAL_MS,
    WEEKS_PER_PROGRAM,
    DAYS_PER_WEEK,
    TOTAL_DAYS_PER_EXERCISE,
    DEFAULT_INTENSITY_FACTOR,
    MIN_SCALING_FACTOR,
    MAX_SCALING_FACTOR,
    STORAGE_PREFIX,
    MAX_HISTORY_ITEMS,
    SUNDAY,
    EARLY_WORKOUT_HOUR,
    LATE_WORKOUT_HOUR,
    UPPER_BODY_EXERCISES,
    LOWER_BODY_EXERCISES
} from './constants'

describe('constants', () => {
    describe('time constants', () => {
        it('MS_PER_SECOND is 1000', () => {
            expect(MS_PER_SECOND).toBe(1000)
        })

        it('MS_PER_DAY is correct', () => {
            expect(MS_PER_DAY).toBe(24 * 60 * 60 * 1000)
        })

        it('TIMER_INTERVAL_MS is 1000', () => {
            expect(TIMER_INTERVAL_MS).toBe(1000)
        })
    })

    describe('program structure', () => {
        it('WEEKS_PER_PROGRAM is 6', () => {
            expect(WEEKS_PER_PROGRAM).toBe(6)
        })

        it('DAYS_PER_WEEK is 3', () => {
            expect(DAYS_PER_WEEK).toBe(3)
        })

        it('TOTAL_DAYS_PER_EXERCISE is 18', () => {
            expect(TOTAL_DAYS_PER_EXERCISE).toBe(18)
            expect(TOTAL_DAYS_PER_EXERCISE).toBe(WEEKS_PER_PROGRAM * DAYS_PER_WEEK)
        })
    })

    describe('calibration constants', () => {
        it('DEFAULT_INTENSITY_FACTOR is 0.7', () => {
            expect(DEFAULT_INTENSITY_FACTOR).toBe(0.7)
        })

        it('MIN_SCALING_FACTOR is less than MAX_SCALING_FACTOR', () => {
            expect(MIN_SCALING_FACTOR).toBeLessThan(MAX_SCALING_FACTOR)
        })

        it('scaling factors are reasonable values', () => {
            expect(MIN_SCALING_FACTOR).toBe(0.5)
            expect(MAX_SCALING_FACTOR).toBe(2.5)
        })
    })

    describe('storage constants', () => {
        it('STORAGE_PREFIX is shift6_', () => {
            expect(STORAGE_PREFIX).toBe('shift6_')
        })

        it('MAX_HISTORY_ITEMS is 50', () => {
            expect(MAX_HISTORY_ITEMS).toBe(50)
        })
    })

    describe('schedule constants', () => {
        it('SUNDAY is 0', () => {
            expect(SUNDAY).toBe(0)
        })

        it('EARLY_WORKOUT_HOUR is before work hours', () => {
            expect(EARLY_WORKOUT_HOUR).toBe(8)
        })

        it('LATE_WORKOUT_HOUR is evening', () => {
            expect(LATE_WORKOUT_HOUR).toBe(20)
        })
    })

    describe('exercise categories', () => {
        it('UPPER_BODY_EXERCISES contains expected exercises', () => {
            expect(UPPER_BODY_EXERCISES).toContain('pushups')
            expect(UPPER_BODY_EXERCISES).toContain('dips')
            expect(UPPER_BODY_EXERCISES).toContain('pullups')
            expect(UPPER_BODY_EXERCISES).toContain('supermans')
            expect(UPPER_BODY_EXERCISES.length).toBe(4)
        })

        it('LOWER_BODY_EXERCISES contains expected exercises', () => {
            expect(LOWER_BODY_EXERCISES).toContain('squats')
            expect(LOWER_BODY_EXERCISES).toContain('lunges')
            expect(LOWER_BODY_EXERCISES).toContain('glutebridge')
            expect(LOWER_BODY_EXERCISES).toContain('vups')
            expect(LOWER_BODY_EXERCISES).toContain('plank')
            expect(LOWER_BODY_EXERCISES.length).toBe(5)
        })

        it('no overlap between upper and lower body exercises', () => {
            const overlap = UPPER_BODY_EXERCISES.filter(ex => LOWER_BODY_EXERCISES.includes(ex))
            expect(overlap).toEqual([])
        })

        it('total exercises equals 9', () => {
            expect(UPPER_BODY_EXERCISES.length + LOWER_BODY_EXERCISES.length).toBe(9)
        })
    })
})
