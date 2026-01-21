import '@testing-library/jest-dom'

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
