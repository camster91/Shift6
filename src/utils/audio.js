// Simple Audio Synth using Web Audio API
// No assets to load, extremely lightweight.

const audioCtx = typeof window !== 'undefined' ? new (window.AudioContext || window.webkitAudioContext)() : null;

const playTone = (freq = 440, type = 'sine', duration = 0.1, vol = 0.1) => {
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
};

export const playBeep = () => playTone(880, 'sine', 0.1, 0.1); // High beep
export const playBoop = () => playTone(440, 'sine', 0.1, 0.1); // Low boop
export const playStart = () => {
    // 3 high beeps
    playTone(600, 'sine', 0.1, 0.1);
    setTimeout(() => playTone(600, 'sine', 0.1, 0.1), 500);
    setTimeout(() => playTone(1200, 'square', 0.4, 0.1), 1000); // GO!
};

export const playSuccess = () => {
    // Victory fanfare little sequence
    const now = audioCtx.currentTime;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        setTimeout(() => playTone(freq, 'triangle', 0.2, 0.1), i * 150);
    });
};
