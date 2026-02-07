import { describe, it, expect, vi, afterEach } from 'vitest'
import {
    canShare,
    shareContent,
    buildWorkoutShareText,
    buildStreakShareText,
    buildBadgeShareText,
    buildProgressShareText,
    buildPRShareText
} from './sharing'

describe('sharing utilities', () => {
    describe('canShare', () => {
        it('returns true when Web Share API is available', () => {
            navigator.share = vi.fn()
            expect(canShare()).toBe(true)
        })

        it('returns false when Web Share API is not available', () => {
            delete navigator.share
            expect(canShare()).toBe(false)
        })
    })

    describe('shareContent', () => {
        afterEach(() => {
            vi.restoreAllMocks()
        })

        it('uses Web Share API when available', async () => {
            navigator.share = vi.fn().mockResolvedValue(undefined)
            const result = await shareContent({ title: 'Test', text: 'Hello' })
            expect(navigator.share).toHaveBeenCalledWith({ title: 'Test', text: 'Hello' })
            expect(result).toBe(true)
        })

        it('returns false when user cancels share', async () => {
            const abortError = new Error('Aborted')
            abortError.name = 'AbortError'
            navigator.share = vi.fn().mockRejectedValue(abortError)
            const result = await shareContent({ title: 'Test', text: 'Hello' })
            expect(result).toBe(false)
        })

        it('falls back to clipboard when share fails with non-abort error', async () => {
            navigator.share = vi.fn().mockRejectedValue(new Error('Failed'))
            Object.assign(navigator, {
                clipboard: { writeText: vi.fn().mockResolvedValue(undefined) }
            })
            const result = await shareContent({ title: 'Test', text: 'Hello' })
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Hello')
            expect(result).toBe(true)
        })

        it('uses clipboard when Web Share API is not available', async () => {
            delete navigator.share
            Object.assign(navigator, {
                clipboard: { writeText: vi.fn().mockResolvedValue(undefined) }
            })
            const result = await shareContent({ title: 'Test', text: 'Hello' })
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Hello')
            expect(result).toBe(true)
        })

        it('returns false when both share and clipboard fail', async () => {
            delete navigator.share
            Object.assign(navigator, {
                clipboard: { writeText: vi.fn().mockRejectedValue(new Error('Fail')) }
            })
            const result = await shareContent({ title: 'Test', text: 'Hello' })
            expect(result).toBe(false)
        })
    })

    describe('buildWorkoutShareText', () => {
        it('generates workout completion text with reps', () => {
            const result = buildWorkoutShareText({
                exerciseName: 'Push-Ups',
                volume: 50,
                unit: 'reps',
                sets: 3
            })
            expect(result.title).toBe('Shift6 Workout Complete')
            expect(result.text).toContain('Push-Ups')
            expect(result.text).toContain('50 reps')
            expect(result.text).toContain('3 sets')
            expect(result.text).toContain('#Shift6')
        })

        it('generates workout completion text with seconds', () => {
            const result = buildWorkoutShareText({
                exerciseName: 'Plank',
                volume: 120,
                unit: 'seconds',
                sets: 3
            })
            expect(result.text).toContain('120 seconds')
        })
    })

    describe('buildStreakShareText', () => {
        it('generates streak text', () => {
            const result = buildStreakShareText(7)
            expect(result.title).toBe('Shift6 Streak')
            expect(result.text).toContain('7-day')
            expect(result.text).toContain('#Shift6')
        })
    })

    describe('buildBadgeShareText', () => {
        it('generates badge achievement text', () => {
            const badge = { name: 'First Step', desc: 'Complete your first workout', icon: '🌱' }
            const result = buildBadgeShareText(badge)
            expect(result.title).toBe('Shift6 Achievement Unlocked')
            expect(result.text).toContain('🌱')
            expect(result.text).toContain('First Step')
            expect(result.text).toContain('Complete your first workout')
        })
    })

    describe('buildProgressShareText', () => {
        it('generates full progress summary', () => {
            const stats = {
                totalSessions: 25,
                currentStreak: 7,
                completedPlans: 2,
                totalVolume: 5000
            }
            const result = buildProgressShareText(stats)
            expect(result.text).toContain('25 workouts')
            expect(result.text).toContain('7-day streak')
            expect(result.text).toContain('2 exercises mastered')
            expect(result.text).toContain('5,000 total reps')
        })

        it('generates beginner progress text when no stats', () => {
            const stats = { totalSessions: 0, currentStreak: 0, completedPlans: 0, totalVolume: 0 }
            const result = buildProgressShareText(stats)
            expect(result.text).toContain('Starting my fitness journey')
        })

        it('handles partial stats', () => {
            const stats = { totalSessions: 3, currentStreak: 0, completedPlans: 0, totalVolume: 150 }
            const result = buildProgressShareText(stats)
            expect(result.text).toContain('3 workouts')
            expect(result.text).toContain('150 total reps')
            expect(result.text).not.toContain('streak')
        })
    })

    describe('buildPRShareText', () => {
        it('generates personal record text', () => {
            const result = buildPRShareText('Push-Ups', 75, 'reps')
            expect(result.title).toBe('Shift6 Personal Record')
            expect(result.text).toContain('Push-Ups')
            expect(result.text).toContain('75 reps')
            expect(result.text).toContain('#PersonalBest')
        })

        it('handles seconds unit', () => {
            const result = buildPRShareText('Plank', 180, 'seconds')
            expect(result.text).toContain('180 seconds')
        })
    })
})
