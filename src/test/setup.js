import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock localStorage with a proper clear method
const localStorageMock = {
    store: {},
    getItem: vi.fn(function(key) { return this.store[key] || null }),
    setItem: vi.fn(function(key, value) { this.store[key] = String(value) }),
    removeItem: vi.fn(function(key) { delete this.store[key] }),
    clear: vi.fn(function() { this.store = {} })
}

// Make it available globally for tests to access
vi.stubGlobal('localStorage', localStorageMock)
vi.stubGlobal('localStorageMock', localStorageMock)

// Mock AudioContext for audio.js tests
class MockOscillator {
    constructor() {
        this.type = 'sine'
        this.frequency = { setValueAtTime: () => {} }
    }
    connect() {}
    start() {}
    stop() {}
}

class MockGainNode {
    constructor() {
        this.gain = {
            setValueAtTime: () => {},
            exponentialRampToValueAtTime: () => {}
        }
    }
    connect() {}
}

class MockAudioContext {
    constructor() {
        this.currentTime = 0
        this.destination = {}
    }
    createOscillator() { return new MockOscillator() }
    createGain() { return new MockGainNode() }
}

globalThis.AudioContext = MockAudioContext
globalThis.webkitAudioContext = MockAudioContext
