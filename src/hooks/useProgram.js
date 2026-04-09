import { useMemo, useCallback } from 'react';
import { usePersistedState, safeLoadJSON, STORAGE_PREFIX } from './usePersistedState';
import { EXERCISE_PLANS, DIFFICULTY_LEVELS, generateProgression } from '../data/exercises.jsx';
import { EXERCISE_LIBRARY, STARTER_TEMPLATES, PROGRAM_MODES } from '../data/exerciseLibrary.js';
import { EXERCISES as DATABASE_EXERCISES } from '../data/exerciseDatabase.js';
import {
    savePreferences,
    requiresPlanRegeneration,
    regenerateAllPlans,
    saveCustomPlans,
    loadCustomPlans
} from '../utils/preferences.js';

/**
 * Manages program state: exercises, difficulty, templates, training preferences.
 */
export function useProgram() {
    const [customExercises, setCustomExercises] = usePersistedState('custom_exercises', {});
    const [exerciseDifficulty, setExerciseDifficulty] = usePersistedState('difficulty', {});
    const [activeProgram, setActiveProgram] = usePersistedState('active_program', null);
    const [programMode, setProgramMode] = usePersistedState('program_mode', null);
    const [userEquipment, setUserEquipment] = usePersistedState('user_equipment', ['none']);
    const [onboardingComplete, setOnboardingComplete] = usePersistedState('onboarding_complete', false, { raw: true });
    const [currentMode, setCurrentMode] = usePersistedState('current_mode', 'home');
    const [currentProgramId, setCurrentProgramId] = usePersistedState('current_program_id', null);
    const [trainingPreferences, setTrainingPreferences] = usePersistedState('training_preferences', {});
    const [customPlans, setCustomPlans] = usePersistedState('custom_plans', () => loadCustomPlans());

    // Merge built-in, library, database, and custom exercises
    const allExercises = useMemo(() => {
        const merged = { ...EXERCISE_PLANS };

        Object.entries(EXERCISE_LIBRARY).forEach(([key, ex]) => {
            if (!merged[key] && ex.weeks) {
                merged[key] = {
                    ...ex,
                    image: ex.image || `neo:${key}`,
                    finalGoal: ex.finalGoal || `${ex.startReps} ${ex.unit === 'seconds' ? 'Seconds' : 'Reps'}`,
                };
            }
        });

        Object.entries(DATABASE_EXERCISES).forEach(([key, ex]) => {
            if (!merged[key]) {
                merged[key] = {
                    ...ex,
                    key,
                    image: ex.image || `neo:${key}`,
                    finalGoal: ex.finalGoal || `${ex.startReps} ${ex.unit === 'seconds' ? 'Seconds' : 'Reps'}`,
                    weeks: ex.weeks || generateProgression(ex.startReps, ex.finalGoal),
                };
            }
        });

        return { ...merged, ...customExercises };
    }, [customExercises]);

    const activeProgramKeys = useMemo(() => {
        return activeProgram || Object.keys(EXERCISE_PLANS);
    }, [activeProgram]);

    // --- Handlers ---

    const handleAddExercise = useCallback((exercise) => {
        setCustomExercises(prev => ({ ...prev, [exercise.key]: exercise }));
    }, [setCustomExercises]);

    const handleSetDifficulty = useCallback((exerciseKey, level) => {
        setExerciseDifficulty(prev => ({ ...prev, [exerciseKey]: level }));
    }, [setExerciseDifficulty]);

    const handleAddToProgram = useCallback((exerciseKey) => {
        setActiveProgram(prev => {
            const current = prev || Object.keys(EXERCISE_PLANS);
            if (current.includes(exerciseKey)) return current;
            return [...current, exerciseKey];
        });
    }, [setActiveProgram]);

    const handleRemoveFromProgram = useCallback((exerciseKey) => {
        setActiveProgram(prev => {
            const current = prev || Object.keys(EXERCISE_PLANS);
            return current.filter(k => k !== exerciseKey);
        });
    }, [setActiveProgram]);

    const handleApplyTemplate = useCallback((templateId) => {
        const template = STARTER_TEMPLATES[templateId];
        if (template) {
            setProgramMode(template.mode);
            setActiveProgram([...template.exercises]);
        }
    }, [setProgramMode, setActiveProgram]);

    const handleApplyCustomProgram = useCallback((exercises) => {
        if (exercises && exercises.length >= 3) {
            setActiveProgram([...exercises]);
        }
    }, [setActiveProgram]);

    const handleCompleteOnboarding = useCallback((mode, equipment, templateId, preferences = null, customExerciseList = null) => {
        try {
            setProgramMode(mode || 'bodyweight');
            setUserEquipment(equipment || ['none']);

            if (customExerciseList && customExerciseList.length > 0) {
                setActiveProgram([...customExerciseList]);
            } else if (templateId && STARTER_TEMPLATES[templateId]) {
                setActiveProgram([...STARTER_TEMPLATES[templateId].exercises]);
            } else {
                setActiveProgram([...STARTER_TEMPLATES['shift6-classic'].exercises]);
            }

            if (preferences) {
                setTrainingPreferences({
                    ...preferences,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error('Error completing onboarding:', error);
            setProgramMode('bodyweight');
            setActiveProgram([...STARTER_TEMPLATES['shift6-classic'].exercises]);
        } finally {
            setOnboardingComplete(true);
            setCurrentMode('home');
        }
    }, [setProgramMode, setUserEquipment, setActiveProgram, setTrainingPreferences, setOnboardingComplete, setCurrentMode]);

    const handleTrainingPreferencesChange = useCallback((newPrefs) => {
        const oldPrefs = trainingPreferences;
        const updatedPrefs = { ...newPrefs, updatedAt: new Date().toISOString() };

        if (requiresPlanRegeneration(oldPrefs, updatedPrefs)) {
            const calibrations = safeLoadJSON(`${STORAGE_PREFIX}calibrations`, {});
            const newPlans = regenerateAllPlans(allExercises, activeProgramKeys, calibrations, updatedPrefs);
            setCustomPlans(newPlans);
        }

        setTrainingPreferences(updatedPrefs);
    }, [trainingPreferences, allExercises, activeProgramKeys, setCustomPlans, setTrainingPreferences]);

    const handleChangeProgramMode = useCallback((newMode) => {
        setProgramMode(newMode);
        if (activeProgram) {
            const filtered = activeProgram.filter(key => {
                const ex = allExercises[key];
                return ex && ex.modes && ex.modes.includes(newMode);
            });
            setActiveProgram(filtered.length > 0 ? filtered : null);
        }
    }, [activeProgram, allExercises, setProgramMode, setActiveProgram]);

    const handleSwitchProgram = useCallback((programId, programData) => {
        setCurrentProgramId(programId);
        if (programData?.exercises) {
            setActiveProgram(programData.exercises);
        }
    }, [setCurrentProgramId, setActiveProgram]);

    const handleSwitchMode = useCallback(() => {
        setCurrentMode(prev => prev === 'home' ? 'gym' : 'home');
    }, [setCurrentMode]);

    const handleSelectMode = useCallback((mode) => {
        setCurrentMode(mode);
    }, [setCurrentMode]);

    return {
        // State
        customExercises, setCustomExercises,
        exerciseDifficulty,
        activeProgram, setActiveProgram,
        activeProgramKeys,
        programMode,
        userEquipment, setUserEquipment,
        onboardingComplete, setOnboardingComplete,
        currentMode, setCurrentMode,
        currentProgramId,
        trainingPreferences,
        customPlans,
        allExercises,

        // Handlers
        handleAddExercise,
        handleSetDifficulty,
        handleAddToProgram,
        handleRemoveFromProgram,
        handleApplyTemplate,
        handleApplyCustomProgram,
        handleCompleteOnboarding,
        handleTrainingPreferencesChange,
        handleChangeProgramMode,
        handleSwitchProgram,
        handleSwitchMode,
        handleSelectMode,
    };
}
