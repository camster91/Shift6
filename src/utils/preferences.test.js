import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    validatePreferences,
    loadPreferences,
    savePreferences,
    applyFitnessLevelPreset,
    getTotalProgramDays,
    requiresPlanRegeneration,
    adjustProgressForPreferenceChange,
    isExerciseComplete,
    getProgressPosition
} from './preferences';
import { DEFAULT_TRAINING_PREFERENCES, FITNESS_LEVEL_PRESETS } from '../data/exercises.jsx';
import { STORAGE_KEYS } from './constants';

// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: vi.fn((key) => store[key] || null),
        setItem: vi.fn((key, value) => { store[key] = value; }),
        removeItem: vi.fn((key) => { delete store[key]; }),
        clear: vi.fn(() => { store = {}; })
    };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('preferences utilities', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
    });

    describe('validatePreferences', () => {
        it('returns valid for correct preferences', () => {
            const prefs = {
                trainingDaysPerWeek: 4,
                preferredDays: [1, 3, 5],
                targetSessionDuration: 30,
                repScheme: 'balanced',
                setsPerExercise: 5,
                progressionRate: 'moderate',
                programDuration: 6,
                restBetweenSets: 'auto',
                fitnessLevel: 'intermediate'
            };
            const result = validatePreferences(prefs);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('rejects invalid trainingDaysPerWeek', () => {
            const prefs = { trainingDaysPerWeek: 7 };
            const result = validatePreferences(prefs);
            expect(result.errors.some(e => e.includes('trainingDaysPerWeek'))).toBe(true);
            expect(result.sanitized.trainingDaysPerWeek).toBe(DEFAULT_TRAINING_PREFERENCES.trainingDaysPerWeek);
        });

        it('rejects invalid repScheme', () => {
            const prefs = { repScheme: 'invalid' };
            const result = validatePreferences(prefs);
            expect(result.errors.some(e => e.includes('repScheme'))).toBe(true);
        });

        it('sanitizes preferredDays to valid values only', () => {
            const prefs = { preferredDays: [0, 1, 7, -1, 6] };
            const result = validatePreferences(prefs);
            expect(result.sanitized.preferredDays).toEqual([0, 1, 6]);
        });

        it('accepts valid rest timer values', () => {
            [30, 45, 60, 90, 120, 'auto'].forEach(value => {
                const result = validatePreferences({ restBetweenSets: value });
                expect(result.sanitized.restBetweenSets).toBe(value);
            });
        });

        it('rejects invalid rest timer value', () => {
            const prefs = { restBetweenSets: 999 };
            const result = validatePreferences(prefs);
            expect(result.errors.some(e => e.includes('restBetweenSets'))).toBe(true);
        });

        it('returns defaults for null/undefined input', () => {
            const result = validatePreferences(null);
            expect(result.valid).toBe(false);
            expect(result.sanitized).toEqual(DEFAULT_TRAINING_PREFERENCES);
        });
    });

    describe('loadPreferences', () => {
        it('returns default preferences when nothing stored', () => {
            const prefs = loadPreferences();
            expect(prefs).toEqual(DEFAULT_TRAINING_PREFERENCES);
        });

        it('loads and sanitizes stored preferences', () => {
            const stored = { trainingDaysPerWeek: 5, repScheme: 'strength' };
            localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(stored));
            const prefs = loadPreferences();
            expect(prefs.trainingDaysPerWeek).toBe(5);
            expect(prefs.repScheme).toBe('strength');
        });
    });

    describe('savePreferences', () => {
        it('saves preferences to localStorage', () => {
            const prefs = { ...DEFAULT_TRAINING_PREFERENCES, trainingDaysPerWeek: 4 };
            savePreferences(prefs);
            expect(localStorageMock.setItem).toHaveBeenCalled();
        });

        it('adds timestamps when saving', () => {
            savePreferences(DEFAULT_TRAINING_PREFERENCES);
            const call = localStorageMock.setItem.mock.calls[0];
            const saved = JSON.parse(call[1]);
            expect(saved.updatedAt).toBeTruthy();
        });
    });

    describe('applyFitnessLevelPreset', () => {
        it('applies beginner preset correctly', () => {
            const result = applyFitnessLevelPreset('beginner', {});
            expect(result.trainingDaysPerWeek).toBe(3);
            expect(result.repScheme).toBe('endurance');
            expect(result.progressionRate).toBe('conservative');
            expect(result.fitnessLevel).toBe('beginner');
        });

        it('applies intermediate preset correctly', () => {
            const result = applyFitnessLevelPreset('intermediate', {});
            expect(result.trainingDaysPerWeek).toBe(4);
            expect(result.repScheme).toBe('balanced');
            expect(result.fitnessLevel).toBe('intermediate');
        });

        it('applies advanced preset correctly', () => {
            const result = applyFitnessLevelPreset('advanced', {});
            expect(result.trainingDaysPerWeek).toBe(5);
            expect(result.repScheme).toBe('strength');
            expect(result.progressionRate).toBe('aggressive');
        });

        it('preserves other preferences when applying preset', () => {
            const existing = { customField: 'value', preferredDays: [1, 2, 3] };
            const result = applyFitnessLevelPreset('beginner', existing);
            expect(result.customField).toBe('value');
            expect(result.preferredDays).toEqual([1, 2, 3]);
        });

        it('returns original prefs for unknown level', () => {
            const prefs = { test: 'value' };
            const result = applyFitnessLevelPreset('unknown', prefs);
            expect(result).toEqual(prefs);
        });
    });

    describe('getTotalProgramDays', () => {
        it('calculates correct total for default preferences', () => {
            const result = getTotalProgramDays({ trainingDaysPerWeek: 3, programDuration: 6 });
            expect(result).toBe(18);
        });

        it('calculates correct total for custom preferences', () => {
            expect(getTotalProgramDays({ trainingDaysPerWeek: 5, programDuration: 8 })).toBe(40);
            expect(getTotalProgramDays({ trainingDaysPerWeek: 2, programDuration: 4 })).toBe(8);
        });
    });

    describe('requiresPlanRegeneration', () => {
        it('returns true when trainingDaysPerWeek changes', () => {
            const old = { trainingDaysPerWeek: 3 };
            const newP = { trainingDaysPerWeek: 5 };
            expect(requiresPlanRegeneration(old, newP)).toBe(true);
        });

        it('returns true when repScheme changes', () => {
            const old = { repScheme: 'balanced' };
            const newP = { repScheme: 'strength' };
            expect(requiresPlanRegeneration(old, newP)).toBe(true);
        });

        it('returns false when only non-affecting keys change', () => {
            const old = { preferredDays: [1, 2], targetSessionDuration: 30 };
            const newP = { preferredDays: [1, 3], targetSessionDuration: 45 };
            expect(requiresPlanRegeneration(old, newP)).toBe(false);
        });
    });

    describe('adjustProgressForPreferenceChange', () => {
        it('preserves progress when program is same length', () => {
            const progress = { pushups: ['p11', 'p12', 'p13'] };
            const oldP = { trainingDaysPerWeek: 3, programDuration: 6 };
            const newP = { trainingDaysPerWeek: 3, programDuration: 6 };
            const result = adjustProgressForPreferenceChange(progress, oldP, newP);
            expect(result).toEqual(progress);
        });

        it('preserves progress when program is lengthened', () => {
            const progress = { pushups: ['p11', 'p12'] };
            const oldP = { trainingDaysPerWeek: 3, programDuration: 6 };
            const newP = { trainingDaysPerWeek: 3, programDuration: 8 };
            const result = adjustProgressForPreferenceChange(progress, oldP, newP);
            expect(result).toEqual(progress);
        });

        it('caps progress when program is shortened', () => {
            const progress = { pushups: ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'd10'] };
            const oldP = { trainingDaysPerWeek: 3, programDuration: 6 }; // 18 days
            const newP = { trainingDaysPerWeek: 2, programDuration: 4 }; // 8 days
            const result = adjustProgressForPreferenceChange(progress, oldP, newP);
            expect(result.pushups.length).toBe(8);
        });
    });

    describe('isExerciseComplete', () => {
        it('returns true when all days completed', () => {
            const days = Array(18).fill('day');
            const prefs = { trainingDaysPerWeek: 3, programDuration: 6 };
            expect(isExerciseComplete(days, prefs)).toBe(true);
        });

        it('returns false when not all days completed', () => {
            const days = ['d1', 'd2', 'd3'];
            const prefs = { trainingDaysPerWeek: 3, programDuration: 6 };
            expect(isExerciseComplete(days, prefs)).toBe(false);
        });

        it('handles null/undefined gracefully', () => {
            const prefs = { trainingDaysPerWeek: 3, programDuration: 6 };
            expect(isExerciseComplete(null, prefs)).toBe(false);
            expect(isExerciseComplete(undefined, prefs)).toBe(false);
        });
    });

    describe('getProgressPosition', () => {
        it('calculates correct position for first day', () => {
            const prefs = { trainingDaysPerWeek: 3, programDuration: 6 };
            const result = getProgressPosition(0, prefs);
            expect(result.week).toBe(1);
            expect(result.day).toBe(1);
            expect(result.dayNumber).toBe(1);
            expect(result.isComplete).toBe(false);
        });

        it('calculates correct position mid-program', () => {
            const prefs = { trainingDaysPerWeek: 3, programDuration: 6 };
            const result = getProgressPosition(9, prefs);
            expect(result.week).toBe(4);
            expect(result.day).toBe(1);
            expect(result.dayNumber).toBe(10);
        });

        it('marks complete when all days done', () => {
            const prefs = { trainingDaysPerWeek: 3, programDuration: 6 };
            const result = getProgressPosition(18, prefs);
            expect(result.isComplete).toBe(true);
        });
    });
});
