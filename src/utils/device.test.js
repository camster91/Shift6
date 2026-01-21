import { describe, it, expect, vi, beforeEach } from 'vitest'
import { requestWakeLock, releaseWakeLock, vibrate, copyToClipboard } from './device'

describe('device utilities', () => {
    beforeEach(() => {
        vi.restoreAllMocks()
    })

    describe('requestWakeLock', () => {
        it('is a function', () => {
            expect(typeof requestWakeLock).toBe('function')
        })

        it('returns a promise', () => {
            const result = requestWakeLock()
            expect(result).toBeInstanceOf(Promise)
        })

        it('handles missing wakeLock API gracefully', async () => {
            // jsdom doesn't have wakeLock by default
            await expect(requestWakeLock()).resolves.not.toThrow()
        })

        it('requests wake lock when API is available', async () => {
            const mockRelease = vi.fn()
            const mockWakeLock = {
                release: mockRelease,
                addEventListener: vi.fn()
            }

            Object.defineProperty(navigator, 'wakeLock', {
                value: {
                    request: vi.fn().mockResolvedValue(mockWakeLock)
                },
                configurable: true
            })

            await requestWakeLock()
            expect(navigator.wakeLock.request).toHaveBeenCalledWith('screen')
        })
    })

    describe('releaseWakeLock', () => {
        it('is a function', () => {
            expect(typeof releaseWakeLock).toBe('function')
        })

        it('returns a promise', () => {
            const result = releaseWakeLock()
            expect(result).toBeInstanceOf(Promise)
        })

        it('handles no active wake lock gracefully', async () => {
            await expect(releaseWakeLock()).resolves.not.toThrow()
        })
    })

    describe('vibrate', () => {
        it('is a function', () => {
            expect(typeof vibrate).toBe('function')
        })

        it('does not throw when called', () => {
            expect(() => vibrate()).not.toThrow()
        })

        it('does not throw with pattern argument', () => {
            expect(() => vibrate(100)).not.toThrow()
            expect(() => vibrate([100, 50, 100])).not.toThrow()
        })

        it('calls navigator.vibrate when available', () => {
            const mockVibrate = vi.fn()
            Object.defineProperty(navigator, 'vibrate', {
                value: mockVibrate,
                configurable: true
            })

            vibrate(50)
            expect(mockVibrate).toHaveBeenCalledWith(50)
        })

        it('uses default pattern of 10ms', () => {
            const mockVibrate = vi.fn()
            Object.defineProperty(navigator, 'vibrate', {
                value: mockVibrate,
                configurable: true
            })

            vibrate()
            expect(mockVibrate).toHaveBeenCalledWith(10)
        })
    })

    describe('copyToClipboard', () => {
        it('is a function', () => {
            expect(typeof copyToClipboard).toBe('function')
        })

        it('returns a promise', () => {
            const result = copyToClipboard('test')
            expect(result).toBeInstanceOf(Promise)
        })

        it('returns false when clipboard API unavailable', async () => {
            // Temporarily remove clipboard
            const originalClipboard = navigator.clipboard
            Object.defineProperty(navigator, 'clipboard', {
                value: undefined,
                configurable: true
            })

            const result = await copyToClipboard('test')
            expect(result).toBe(false)

            // Restore
            Object.defineProperty(navigator, 'clipboard', {
                value: originalClipboard,
                configurable: true
            })
        })

        it('returns true when copy succeeds', async () => {
            Object.defineProperty(navigator, 'clipboard', {
                value: {
                    writeText: vi.fn().mockResolvedValue(undefined)
                },
                configurable: true
            })

            const result = await copyToClipboard('test text')
            expect(result).toBe(true)
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test text')
        })

        it('returns false when copy fails', async () => {
            Object.defineProperty(navigator, 'clipboard', {
                value: {
                    writeText: vi.fn().mockRejectedValue(new Error('Copy failed'))
                },
                configurable: true
            })

            const result = await copyToClipboard('test text')
            expect(result).toBe(false)
        })
    })
})
