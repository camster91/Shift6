import { describe, it, expect } from 'vitest'
import { playBeep, playBoop, playStart, playSuccess } from './audio'

// Note: AudioContext is mocked in test/setup.js

describe('audio utilities', () => {
    describe('playBeep', () => {
        it('is a function', () => {
            expect(typeof playBeep).toBe('function')
        })

        it('does not throw when called', () => {
            expect(() => playBeep()).not.toThrow()
        })
    })

    describe('playBoop', () => {
        it('is a function', () => {
            expect(typeof playBoop).toBe('function')
        })

        it('does not throw when called', () => {
            expect(() => playBoop()).not.toThrow()
        })
    })

    describe('playStart', () => {
        it('is a function', () => {
            expect(typeof playStart).toBe('function')
        })

        it('does not throw when called', () => {
            expect(() => playStart()).not.toThrow()
        })
    })

    describe('playSuccess', () => {
        it('is a function', () => {
            expect(typeof playSuccess).toBe('function')
        })

        it('does not throw when called', () => {
            expect(() => playSuccess()).not.toThrow()
        })
    })
})
