import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getNextSessionForExercise, getScheduleFocus, getDailyStack } from './schedule'

describe('schedule utilities', () => {
    describe('getNextSessionForExercise', () => {
        it('returns first day when no days completed', () => {
            const next = getNextSessionForExercise('pushups', {})
            expect(next).not.toBeNull()
            expect(next.exerciseKey).toBe('pushups')
            expect(next.week).toBe(1)
            expect(next.dayIndex).toBe(0)
            expect(next.dayId).toBe('p11')
            expect(next.name).toBe('Push-Ups')
        })

        it('returns second day when first is completed', () => {
            const completed = { pushups: ['p11'] }
            const next = getNextSessionForExercise('pushups', completed)
            expect(next.dayId).toBe('p12')
            expect(next.dayIndex).toBe(1)
        })

        it('returns next week day when week is completed', () => {
            const completed = { pushups: ['p11', 'p12', 'p13'] }
            const next = getNextSessionForExercise('pushups', completed)
            expect(next.week).toBe(2)
            expect(next.dayId).toBe('p21')
        })

        it('returns null when all days completed', () => {
            // 18 days for pushups
            const allDays = [
                'p11', 'p12', 'p13', 'p21', 'p22', 'p23',
                'p31', 'p32', 'p33', 'p41', 'p42', 'p43',
                'p51', 'p52', 'p53', 'p61', 'p62', 'p63'
            ]
            const next = getNextSessionForExercise('pushups', { pushups: allDays })
            expect(next).toBeNull()
        })

        it('returns null for invalid exercise key', () => {
            const next = getNextSessionForExercise('invalidexercise', {})
            expect(next).toBeNull()
        })

        it('handles different exercises correctly', () => {
            const next = getNextSessionForExercise('squats', {})
            expect(next.exerciseKey).toBe('squats')
            expect(next.dayId).toBe('s11')
            expect(next.name).toBe('Squats')
        })
    })

    describe('getScheduleFocus', () => {
        beforeEach(() => {
            vi.useFakeTimers()
        })

        afterEach(() => {
            vi.useRealTimers()
        })

        it('returns Rest & Recovery on Sunday', () => {
            vi.setSystemTime(new Date('2024-01-07')) // Sunday
            expect(getScheduleFocus()).toBe('Rest & Recovery')
        })

        it('returns Full Program on Monday', () => {
            vi.setSystemTime(new Date('2024-01-08')) // Monday
            expect(getScheduleFocus()).toBe('Full Program')
        })

        it('returns Full Program on Tuesday', () => {
            vi.setSystemTime(new Date('2024-01-09')) // Tuesday
            expect(getScheduleFocus()).toBe('Full Program')
        })

        it('returns Full Program on Wednesday', () => {
            vi.setSystemTime(new Date('2024-01-10')) // Wednesday
            expect(getScheduleFocus()).toBe('Full Program')
        })

        it('returns Full Program on Thursday', () => {
            vi.setSystemTime(new Date('2024-01-11')) // Thursday
            expect(getScheduleFocus()).toBe('Full Program')
        })

        it('returns Full Program on Friday', () => {
            vi.setSystemTime(new Date('2024-01-12')) // Friday
            expect(getScheduleFocus()).toBe('Full Program')
        })

        it('returns Full Program on Saturday', () => {
            vi.setSystemTime(new Date('2024-01-13')) // Saturday
            expect(getScheduleFocus()).toBe('Full Program')
        })
    })

    describe('getDailyStack', () => {
        beforeEach(() => {
            vi.useFakeTimers()
        })

        afterEach(() => {
            vi.useRealTimers()
        })

        it('returns empty stack on Sunday', () => {
            vi.setSystemTime(new Date('2024-01-07')) // Sunday
            const stack = getDailyStack({})
            expect(stack).toEqual([])
        })

        it('returns all exercises on Monday', () => {
            vi.setSystemTime(new Date('2024-01-08')) // Monday
            const stack = getDailyStack({})
            const exerciseKeys = stack.map(s => s.exerciseKey)
            // All 9 exercises should be returned
            expect(exerciseKeys).toContain('pushups')
            expect(exerciseKeys).toContain('squats')
            expect(exerciseKeys).toContain('pullups')
            expect(exerciseKeys).toContain('dips')
            expect(exerciseKeys).toContain('vups')
            expect(exerciseKeys).toContain('glutebridge')
            expect(exerciseKeys).toContain('plank')
            expect(exerciseKeys).toContain('lunges')
            expect(exerciseKeys).toContain('supermans')
            expect(stack.length).toBe(9)
        })

        it('returns all exercises on Tuesday', () => {
            vi.setSystemTime(new Date('2024-01-09')) // Tuesday
            const stack = getDailyStack({})
            const exerciseKeys = stack.map(s => s.exerciseKey)
            // All 9 exercises should be returned
            expect(exerciseKeys).toContain('pushups')
            expect(exerciseKeys).toContain('squats')
            expect(exerciseKeys).toContain('pullups')
            expect(stack.length).toBe(9)
        })

        it('excludes completed exercises from stack', () => {
            vi.setSystemTime(new Date('2024-01-08')) // Monday
            // Complete all pushups days
            const allPushupDays = [
                'p11', 'p12', 'p13', 'p21', 'p22', 'p23',
                'p31', 'p32', 'p33', 'p41', 'p42', 'p43',
                'p51', 'p52', 'p53', 'p61', 'p62', 'p63'
            ]
            const stack = getDailyStack({ pushups: allPushupDays })
            const exerciseKeys = stack.map(s => s.exerciseKey)
            expect(exerciseKeys).not.toContain('pushups')
            expect(exerciseKeys).toContain('dips') // Still has sessions
            expect(stack.length).toBe(8) // 9 minus 1 completed
        })
    })
})
