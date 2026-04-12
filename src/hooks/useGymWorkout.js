import { useState, useCallback } from 'react';
import { usePersistedState, safeSetItem, STORAGE_PREFIX } from './usePersistedState';
import { recordWorkoutResult as recordGymWorkoutResult } from '../utils/gymProgression';

/**
 * Manages gym workout sessions: start, complete, resume, program management.
 */
export function useGymWorkout({
    gymProgram, setGymProgram,
    gymHistory, setGymHistory,
    gymStreak, setGymStreak,
    gymGoals, setGymGoals,
    gymWeights, setGymWeights,
    gymReps, setGymReps,
    gymOnboardingComplete, setGymOnboardingComplete,
    customGymPrograms, setCustomGymPrograms,
    setShowGymAssessment,
}) {
    const [currentGymSession, setCurrentGymSession] = useState(null);
    const [pendingGymSession, setPendingGymSession] = useState(() => {
        try {
            const saved = localStorage.getItem(`${STORAGE_PREFIX}current_gym_session`);
            return saved ? JSON.parse(saved) : null;
        } catch { return null; }
    });
    const [assessmentExercises, setAssessmentExercises] = useState([]);

    // Persist gym session for crash recovery
    // (using manual effect-free approach: persist on set)
    const setAndPersistGymSession = useCallback((session) => {
        setCurrentGymSession(session);
        if (session) {
            safeSetItem(`${STORAGE_PREFIX}current_gym_session`, session);
        } else {
            localStorage.removeItem(`${STORAGE_PREFIX}current_gym_session`);
        }
    }, []);

    // --- Handlers ---

    const handleGymOnboardingComplete = useCallback((gymData) => {
        setGymProgram({
            programId: gymData.programId,
            currentWeek: gymData.currentWeek || 1,
            currentDay: gymData.currentDay || 1,
            startDate: gymData.startDate || new Date().toISOString(),
            experienceLevel: gymData.experienceLevel
        });
        setGymOnboardingComplete(true);
    }, [setGymProgram, setGymOnboardingComplete]);

    const handleStartGymWorkout = useCallback((workout) => {
        setAndPersistGymSession(workout);
    }, [setAndPersistGymSession]);

    const handleCompleteGymWorkout = useCallback((workoutData, completedSets) => {
        // Update weights and reps using callback form to avoid stale closures
        const weightUpdates = {};
        const repUpdates = {};
        Object.entries(completedSets).forEach(([exerciseId, sets]) => {
            if (sets.length > 0) {
                weightUpdates[exerciseId] = sets[sets.length - 1].weight;
                repUpdates[exerciseId] = sets.map(s => s.reps);
            }
        });
        setGymWeights(prev => ({ ...prev, ...weightUpdates }));
        setGymReps(prev => ({ ...prev, ...repUpdates }));

        // Update history and streak using callback form
        setGymHistory(prev => {
            const updated = [workoutData, ...prev].slice(0, 100);

            // Streak logic uses the previous history (before this workout)
            const today = new Date().toDateString();
            const lastWorkout = prev[0];
            if (lastWorkout) {
                const lastDate = new Date(lastWorkout.date).toDateString();
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                if (lastDate === today) {
                    // Already worked out today, no streak change
                } else if (lastDate === yesterday.toDateString()) {
                    setGymStreak(s => s + 1);
                } else {
                    setGymStreak(1);
                }
            } else {
                setGymStreak(1);
            }

            return updated;
        });

        // Advance program day
        if (gymProgram) {
            setGymProgram(prev => {
                const newDay = prev.currentDay + 1;
                if (newDay > 7) {
                    return { ...prev, currentWeek: prev.currentWeek + 1, currentDay: 1 };
                }
                return { ...prev, currentDay: newDay };
            });
        }

        setAndPersistGymSession(null);
    }, [gymProgram, setGymHistory, setGymWeights, setGymReps, setGymStreak, setGymProgram, setAndPersistGymSession]);

    const handleChangeGymProgram = useCallback((programId, programData = null) => {
        setGymProgram({
            programId,
            currentWeek: 1,
            currentDay: 1,
            startDate: new Date().toISOString(),
            isCustom: programData?.isCustom || false
        });
    }, [setGymProgram]);

    const handleSaveCustomGymProgram = useCallback((program) => {
        setCustomGymPrograms(prev => {
            const existingIndex = prev.findIndex(p => p.id === program.id);
            if (existingIndex >= 0) {
                const updated = [...prev];
                updated[existingIndex] = program;
                return updated;
            }
            return [...prev, program];
        });
    }, [setCustomGymPrograms]);

    const handleDeleteCustomGymProgram = useCallback((programId) => {
        setCustomGymPrograms(prev => prev.filter(p => p.id !== programId));
        if (gymProgram?.programId === programId) {
            setGymProgram(null);
        }
    }, [gymProgram, setCustomGymPrograms, setGymProgram]);

    const handleStartGymAssessment = useCallback((exerciseIds) => {
        setAssessmentExercises(exerciseIds);
        setShowGymAssessment(true);
    }, [setShowGymAssessment]);

    const handleCompleteGymAssessment = useCallback((assessmentResults, goals) => {
        setGymGoals(prev => ({ ...prev, ...goals }));
        const weightUpdates = {};
        Object.entries(assessmentResults).forEach(([exerciseId, result]) => {
            if (!result.skipped) weightUpdates[exerciseId] = result.weight;
        });
        setGymWeights(prev => ({ ...prev, ...weightUpdates }));
        setShowGymAssessment(false);
        setAssessmentExercises([]);
    }, [setGymGoals, setGymWeights]);

    const handleRecordGymResult = useCallback((exerciseId, weight, reps, rpe) => {
        const goal = gymGoals[exerciseId];
        if (!goal) return null;
        const updatedGoal = recordGymWorkoutResult(goal, weight, reps, rpe);
        setGymGoals(prev => ({ ...prev, [exerciseId]: updatedGoal }));
        return updatedGoal;
    }, [gymGoals, setGymGoals]);

    // Resume / Save / Discard
    const handleResumeGymSession = useCallback(() => {
        if (pendingGymSession) {
            setAndPersistGymSession(pendingGymSession);
            setPendingGymSession(null);
        }
    }, [pendingGymSession, setAndPersistGymSession]);

    const handleDiscardGymSession = useCallback(() => {
        setPendingGymSession(null);
        localStorage.removeItem(`${STORAGE_PREFIX}current_gym_session`);
    }, []);

    const handleSaveGymSession = useCallback(() => {
        if (currentGymSession) {
            setPendingGymSession(currentGymSession);
            setAndPersistGymSession(null);
        }
    }, [currentGymSession, setAndPersistGymSession]);

    return {
        currentGymSession, setCurrentGymSession: setAndPersistGymSession,
        pendingGymSession,
        assessmentExercises,

        handleGymOnboardingComplete,
        handleStartGymWorkout,
        handleCompleteGymWorkout,
        handleChangeGymProgram,
        handleSaveCustomGymProgram,
        handleDeleteCustomGymProgram,
        handleStartGymAssessment,
        handleCompleteGymAssessment,
        handleRecordGymResult,
        handleResumeGymSession,
        handleDiscardGymSession,
        handleSaveGymSession,
    };
}
