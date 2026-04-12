import { useState, useCallback } from 'react';

const STORAGE_PREFIX = 'shift6_';

/** Safely parse JSON from localStorage */
const safeLoadJSON = (key, fallback) => {
    try {
        const saved = localStorage.getItem(key);
        if (saved === null) return fallback;
        return JSON.parse(saved);
    } catch {
        return fallback;
    }
};

/** Safely write to localStorage */
const safeSetItem = (key, value) => {
    try {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    } catch (e) {
        console.warn('localStorage write failed:', key, e?.name);
    }
};

/**
 * useState + automatic localStorage persistence.
 * Eliminates the need for separate useEffect sync hooks.
 *
 * @param {string} key - localStorage key (without prefix)
 * @param {*} fallback - default value if nothing in storage
 * @param {object} [opts]
 * @param {boolean} [opts.raw] - if true, store as raw string (not JSON)
 */
export function usePersistedState(key, fallback, opts = {}) {
    const fullKey = `${STORAGE_PREFIX}${key}`;

    const [value, setValue] = useState(() => {
        if (opts.raw) {
            try {
                const saved = localStorage.getItem(fullKey);
                if (saved === null) return fallback;
                // For booleans stored as strings
                if (fallback === true || fallback === false) return saved === 'true';
                return saved;
            } catch {
                return fallback;
            }
        }
        return safeLoadJSON(fullKey, fallback);
    });

    const setPersistedValue = useCallback((newValue) => {
        setValue(prev => {
            const resolved = typeof newValue === 'function' ? newValue(prev) : newValue;
            // Persist inside the updater to ensure atomicity with state changes.
            // In React 18's StrictMode, this may double-write to localStorage,
            // which is safe since the same value is written both times.
            if (opts.raw) {
                safeSetItem(fullKey, String(resolved));
            } else {
                safeSetItem(fullKey, resolved);
            }
            return resolved;
        });
    }, [fullKey, opts.raw]);

    return [value, setPersistedValue];
}

// Re-export helpers for use in hooks that need ad-hoc reads
export { safeLoadJSON, safeSetItem, STORAGE_PREFIX };