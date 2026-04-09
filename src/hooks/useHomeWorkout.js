import { useState, useEffect, useCallback } from 'react';
import { usePersistedState, safeLoadJSON, safeSetItem, STORAGE_PREFIX } from './usePersistedState';
import { EXERCISE_PLANS, DIFFICULTY_LEVELS, getCustomRest } from '../data/exercises.jsx';
import { getDailyStack } from '../utils/schedule';
import { getRecommendedWarmup } from '../data/warmupRoutines';
import {
    getActiveSprint,
    getOrCreateSprint,
    analyzeWorkoutPerformance,
    recalculateSprint,
    advanceSprint,
    completeSprint,
    generateNextSprint,
    getCurrentWorkout,
    getSprintProgress,
    detectPlateau,
    SPRINT_STATUS
} from '../utils/progression.js';
import { recordHomeGoalResult } from '../utils/homeGoals';

/**
 * Manages home workout sessions: start, complete, queue, timers, calibration, warmup, sprints.
 */
export function useHomeWorkout({
    allExercises,
    activeProgramKeys,
    completedDays, setCompletedDays,
    sessionHistory, setSessionHistory,
    sprints, setSprints,
    exerciseDifficulty,
    restTimerOverride,
    customPlans,
    trainingPreferences,
    warmupEnabled,
    homeGoals, setHomeGoals,
    setPendingConfirm,
}) {
    // --- Session State ---
    const [workoutQueue, setWorkoutQueue] = usePersistedState('queue', []);
    const [currentSession, setCurrentSession] = useState(null);
    const [pendingSession, setPendingSession] = usePersistedState('current_session', null);
    const [pendingWorkout, setPendingWorkout] = useState(null);

    const [activeExercise, setActiveExercise] = useState('pushups');
    const [timeLeft, setTimeLeft] = useState(0);
    const [amrapValue, setAmrapValue] = useState('');
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [testInput, setTestInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [workoutNotes, setWorkoutNotes] = useState('');
    const [exerciseTimeLeft, setExerciseTimeLeft] = useState(0);
    const [isExerciseTimerRunning, setIsExerciseTimerRunning] = useState(false);
    const [exerciseTimerStarted, setExerciseTimerStarted] = useState(false);

    // --- Timers ---
    useEffect(() => {
        if (!isTimerRunning || timeLeft <= 0) return;
        const interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearInterval(interval);
    }, [isTimerRunning, timeLeft]);

    useEffect(() => {
        if (!isExerciseTimerRunning || exerciseTimeLeft <= 0) return;
        const interval = setInterval(() => setExerciseTimeLeft(prev => prev - 1), 1000);
        return () => clearInterval(interval);
    }, [isExerciseTimerRunning, exerciseTimeLeft]);

    // Auto-stop timers when they reach 0
    useEffect(() => {
        if (timeLeft === 0) setIsTimerRunning(false);
    }, [timeLeft]);

    useEffect(() => {
        if (exerciseTimeLeft === 0 && exerciseTimerStarted) setIsExerciseTimerRunning(false);
    }, [exerciseTimeLeft, exerciseTimerStarted]);

    // Persist current session for crash recovery
    useEffect(() => {
        if (currentSession) {
            safeSetItem(`${STORAGE_PREFIX}current_session`, currentSession);
        }
    }, [currentSession]);

    useEffect(() => {
        if (currentSession === null && !pendingSession) {
            localStorage.removeItem(`${STORAGE_PREFIX}current_session`);
        }
    }, [currentSession, pendingSession]);

    // Browser exit warning
    useEffect(() => {
        if (!currentSession) return;
        const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [currentSession]);

    // --- Reset helpers ---
    const resetSessionUI = useCallback(() => {
        setAmrapValue('');
        setTestInput('');
        setTimeLeft(0);
        setWorkoutNotes('');
        setExerciseTimeLeft(0);
        setIsExerciseTimerRunning(false);
        setExerciseTimerStarted(false);
    }, []);

    // --- Start Workout ---
    const startWorkout = useCallback((week, dayIndex, overrideKey = null) => {
        const exKey = overrideKey || activeExercise;
        if (overrideKey) setActiveExercise(overrideKey);

        const exercise = allExercises[exKey];
        if (!exercise) return;

        const calibrations = safeLoadJSON(`${STORAGE_PREFIX}calibrations`, {});
        const hasCalibration = calibrations[exKey] !== undefined;
        const hasCompletedDays = (completedDays[exKey]?.length || 0) > 0;
        const needsAssessment = !hasCalibration && !hasCompletedDays;

        // Dynamic sprint check
        const activeSprint = getActiveSprint(sprints, exKey);
        if (activeSprint) {
            const sprintSession = getCurrentWorkout(activeSprint);
            if (sprintSession) {
                const initialStep = needsAssessment ? 'assessment' : 'readiness';
                setCurrentSession({
                    exerciseKey: exKey,
                    exerciseName: exercise.name,
                    week: sprintSession.weekNumber,
                    dayIndex: sprintSession.dayIndex || (sprintSession.dayNumber - 1),
                    setIndex: 0,
                    rest: sprintSession.restSeconds,
                    baseReps: sprintSession.reps,
                    reps: sprintSession.reps,
                    dayId: sprintSession.id,
                    isFinal: sprintSession.isTestDay,
                    color: exercise.color,
                    unit: exercise.unit,
                    difficulty: 3,
                    step: initialStep,
                    sprintId: activeSprint.id
                });
                resetSessionUI();
                return;
            }
        }

        // Calisthenics 18-day progression
        const exerciseWeeks = customPlans[exKey]?.weeks || exercise.weeks;
        const weekData = exerciseWeeks?.find(w => w.week === week);
        if (!weekData) return;

        const day = weekData.days[dayIndex];
        const isFinal = day.isFinal || false;
        const difficultyLevel = exerciseDifficulty[exKey] || 3;
        const difficultyMultiplier = DIFFICULTY_LEVELS[difficultyLevel]?.multiplier || 1.0;
        let calibrationFactor = calibrations[exKey] || 1.0;

        // Safeguard against bad calibration
        const testRep = Math.round(day.reps[0] * difficultyMultiplier * calibrationFactor);
        if (testRep < 3 && calibrationFactor < 1.0) {
            const updatedCalibrations = { ...calibrations };
            delete updatedCalibrations[exKey];
            safeSetItem(`${STORAGE_PREFIX}calibrations`, updatedCalibrations);

            setCurrentSession({
                exerciseKey: exKey, exerciseName: exercise.name, week, dayIndex,
                setIndex: 0,
                rest: restTimerOverride !== null ? restTimerOverride : getCustomRest(week, trainingPreferences),
                baseReps: day.reps, reps: day.reps, dayId: day.id,
                isFinal: false, color: exercise.color, unit: exercise.unit,
                difficulty: difficultyLevel, step: 'assessment'
            });
            resetSessionUI();
            return;
        }

        const totalMultiplier = difficultyMultiplier * calibrationFactor;
        const scaledReps = day.reps.map(r => Math.max(1, Math.round(r * totalMultiplier)));
        const shouldShowAssessment = needsAssessment && !isFinal;
        const restTime = restTimerOverride !== null ? restTimerOverride : getCustomRest(week, trainingPreferences);

        setCurrentSession({
            exerciseKey: exKey, exerciseName: exercise.name, week, dayIndex,
            setIndex: 0, rest: restTime, baseReps: day.reps, reps: scaledReps,
            dayId: day.id, isFinal, color: exercise.color, unit: exercise.unit,
            difficulty: difficultyLevel,
            step: shouldShowAssessment ? 'assessment' : 'workout'
        });
        resetSessionUI();
    }, [activeExercise, allExercises, completedDays, exerciseDifficulty, restTimerOverride, customPlans, trainingPreferences, sprints, resetSessionUI]);

    // --- Warmup Flow ---
    const startWorkoutWithWarmup = useCallback((week, dayIndex, overrideKey = null) => {
        const exKey = overrideKey || activeExercise;
        const exercise = allExercises[exKey];
        const lastWarmup = localStorage.getItem(`${STORAGE_PREFIX}last_warmup`);
        const recentlyWarmedUp = lastWarmup && parseInt(lastWarmup) > Date.now() - 30 * 60 * 1000;

        if (warmupEnabled && !recentlyWarmedUp && exercise) {
            setPendingWorkout({ week, dayIndex, overrideKey: exKey });
        } else {
            startWorkout(week, dayIndex, overrideKey);
        }
    }, [activeExercise, allExercises, warmupEnabled, startWorkout]);

    const handleWarmupComplete = useCallback(() => {
        safeSetItem(`${STORAGE_PREFIX}last_warmup`, Date.now().toString());
        if (pendingWorkout) {
            startWorkout(pendingWorkout.week, pendingWorkout.dayIndex, pendingWorkout.overrideKey);
            setPendingWorkout(null);
        }
    }, [pendingWorkout, startWorkout]);

    const handleWarmupSkip = useCallback(() => {
        if (pendingWorkout) {
            startWorkout(pendingWorkout.week, pendingWorkout.dayIndex, pendingWorkout.overrideKey);
            setPendingWorkout(null);
        }
    }, [pendingWorkout, startWorkout]);

    const getRecommendedWarmupForExercise = useCallback((exerciseKey) => {
        const exercise = allExercises[exerciseKey];
        if (!exercise) return 'quick';
        return getRecommendedWarmup(exercise.category);
    }, [allExercises]);

    // --- Complete Workout ---
    const completeWorkout = useCallback((actualRepsPerSet = null, feedback = null) => {
        if (!currentSession || isProcessing) return;
        setIsProcessing(true);

        const { exerciseKey, dayId, reps, unit } = currentSession;
        const amrapReps = parseInt(amrapValue) || 0;
        const totalVolume = reps.reduce((sum, r) => sum + r, 0) + amrapReps;
        const actualReps = actualRepsPerSet || reps;

        const newCompletedDays = {
            ...completedDays,
            [exerciseKey]: [...new Set([...(completedDays[exerciseKey] || []), dayId])]
        };

        const newHistoryItem = {
            exerciseKey, dayId, date: new Date().toISOString(),
            volume: totalVolume, unit,
            notes: workoutNotes.trim() || undefined,
            actualReps, targetReps: reps, amrapReps,
            rpe: feedback?.rpe, difficulty: feedback?.difficulty
        };
        setSessionHistory(prev => [newHistoryItem, ...prev].slice(0, 50));
        setWorkoutNotes('');
        setCompletedDays(newCompletedDays);

        // Sprint progression
        const activeSprint = getActiveSprint(sprints, exerciseKey);
        if (activeSprint) {
            const performance = analyzeWorkoutPerformance(actualReps, reps, amrapReps, feedback);
            let updatedSprint = activeSprint;

            if (performance.adjustment.shouldAdjust) {
                updatedSprint = recalculateSprint(activeSprint, performance);
            } else {
                updatedSprint = {
                    ...activeSprint,
                    performanceHistory: [...activeSprint.performanceHistory, {
                        date: new Date().toISOString(), ...performance
                    }]
                };
            }

            const intervention = detectPlateau(updatedSprint);
            if (intervention) {
                const sprintBeforeIntervention = updatedSprint;
                setPendingConfirm({
                    title: 'Plateau Detected',
                    message: `${intervention.message}\n\n${intervention.suggestion}`,
                    confirmText: 'Apply Change',
                    onConfirm: () => {
                        const adjusted = intervention.apply(sprintBeforeIntervention);
                        const advanced = advanceSprint(adjusted);
                        setSprints(prev => ({ ...prev, [advanced.id]: advanced }));
                        setPendingConfirm(null);
                    },
                    onCancel: () => {
                        const advanced = advanceSprint(sprintBeforeIntervention);
                        setSprints(prev => ({ ...prev, [advanced.id]: advanced }));
                        setPendingConfirm(null);
                    }
                });
            } else {
                updatedSprint = advanceSprint(updatedSprint);
                setSprints(prev => ({ ...prev, [updatedSprint.id]: updatedSprint }));
            }
        }

        // Home goal progress
        if (homeGoals[exerciseKey]?.status === 'active') {
            const updatedGoal = recordHomeGoalResult(homeGoals[exerciseKey], totalVolume);
            setHomeGoals(prev => ({ ...prev, [exerciseKey]: updatedGoal }));
        }

        // Queue handling
        if (workoutQueue.length > 0) {
            const [next, ...remaining] = workoutQueue;
            setWorkoutQueue(remaining);
            startWorkout(next.week, next.dayIndex, next.exerciseKey);
        } else {
            setCurrentSession(null);
        }

        setTimeout(() => setIsProcessing(false), 1000);
    }, [currentSession, isProcessing, amrapValue, workoutNotes, completedDays, sprints, workoutQueue, startWorkout, homeGoals, setSessionHistory, setCompletedDays, setSprints, setPendingConfirm, setHomeGoals, setWorkoutQueue]);

    // --- Calibration ---
    const applyCalibration = useCallback((factor, skipConfirmation = false) => {
        if (!currentSession) return;
        const newReps = currentSession.baseReps.map(r => Math.ceil(r * factor));

        const calibrations = safeLoadJSON(`${STORAGE_PREFIX}calibrations`, {});
        calibrations[currentSession.exerciseKey] = factor;
        safeSetItem(`${STORAGE_PREFIX}calibrations`, calibrations);

        if (skipConfirmation) {
            const nextStep = currentSession.sprintId ? 'readiness' : 'workout';
            setCurrentSession(prev => ({ ...prev, reps: newReps, step: nextStep }));
        } else {
            setCurrentSession(prev => ({ ...prev, reps: newReps, step: 'assessment-complete' }));
        }
    }, [currentSession]);

    const handleTestSubmit = useCallback((e) => {
        e.preventDefault();
        if (!testInput) return;
        const userMax = parseFloat(testInput);
        if (isNaN(userMax) || userMax <= 0) return;

        const planMaxRep = Math.max(...currentSession.baseReps);
        const targetWorkingReps = Math.round(userMax * 0.6);
        const scalingFactor = targetWorkingReps / planMaxRep;
        const clampedFactor = Math.max(0.3, Math.min(scalingFactor, 15));
        applyCalibration(clampedFactor);
    }, [testInput, currentSession, applyCalibration]);

    // --- Session Resume/Save/Discard ---
    const handleResumeSession = useCallback(() => {
        if (pendingSession) {
            setCurrentSession(pendingSession);
            setPendingSession(null);
        }
    }, [pendingSession, setPendingSession]);

    const handleDiscardSession = useCallback(() => {
        setPendingSession(null);
        localStorage.removeItem(`${STORAGE_PREFIX}current_session`);
    }, [setPendingSession]);

    const handleSaveSession = useCallback(() => {
        if (currentSession) {
            setPendingSession(currentSession);
            setCurrentSession(null);
        }
    }, [currentSession, setPendingSession]);

    // --- Stack / Express ---
    const startStack = useCallback(() => {
        const stack = getDailyStack(completedDays, allExercises, activeProgramKeys, trainingPreferences);
        if (stack.length === 0) return;
        setWorkoutQueue(stack.slice(1));
        startWorkoutWithWarmup(stack[0].week, stack[0].dayIndex, stack[0].exerciseKey);
    }, [completedDays, allExercises, activeProgramKeys, startWorkoutWithWarmup, trainingPreferences, setWorkoutQueue]);

    const startExpressWorkout = useCallback(() => {
        const stack = getDailyStack(completedDays, allExercises, activeProgramKeys, trainingPreferences);
        if (stack.length === 0) return;

        const firstExercise = stack[0];
        const exKey = firstExercise.exerciseKey;
        const exercise = allExercises[exKey];
        if (!exercise) return;

        const exerciseWeeks = customPlans[exKey]?.weeks || exercise.weeks;
        const weekData = exerciseWeeks?.find(w => w.week === firstExercise.week);
        if (!weekData) return;

        const day = weekData.days[firstExercise.dayIndex];
        const difficultyLevel = exerciseDifficulty[exKey] || 3;
        const multiplier = DIFFICULTY_LEVELS[difficultyLevel]?.multiplier || 1.0;
        const expressReps = day.reps.slice(0, 2);
        const scaledReps = expressReps.map(r => Math.max(1, Math.round(r * multiplier)));

        if (stack.length > 1) setWorkoutQueue([stack[1]]);

        setCurrentSession({
            exerciseKey: exKey, exerciseName: exercise.name,
            week: firstExercise.week, dayIndex: firstExercise.dayIndex,
            setIndex: 0, rest: 20, baseReps: expressReps, reps: scaledReps,
            dayId: day.id, isFinal: false, color: exercise.color, unit: exercise.unit,
            difficulty: difficultyLevel, step: 'workout', expressMode: true
        });
        resetSessionUI();
    }, [completedDays, allExercises, activeProgramKeys, trainingPreferences, customPlans, exerciseDifficulty, setWorkoutQueue, resetSessionUI]);

    // --- Sprint Management ---
    const ensureSprintExists = useCallback((exerciseKey, startingMax) => {
        const exerciseData = allExercises[exerciseKey];
        const existingSprint = getActiveSprint(sprints, exerciseKey);
        if (existingSprint) return existingSprint;

        const newSprint = getOrCreateSprint(sprints, exerciseKey, startingMax, {
            repScheme: trainingPreferences.repScheme || 'hypertrophy',
            trainingDaysPerWeek: trainingPreferences.trainingDaysPerWeek || 3,
            programDuration: 6
        }, exerciseData);

        setSprints(prev => ({ ...prev, [newSprint.id]: newSprint }));
        return newSprint;
    }, [sprints, allExercises, trainingPreferences, setSprints]);

    const handleCompleteSprint = useCallback((sprintId, finalMax) => {
        const sprint = sprints[sprintId];
        if (!sprint || sprint.status !== SPRINT_STATUS.ACTIVE) return;

        const completed = completeSprint(sprint, finalMax);
        const nextSprint = generateNextSprint(completed, {
            repScheme: trainingPreferences.repScheme || 'hypertrophy',
            trainingDaysPerWeek: trainingPreferences.trainingDaysPerWeek || 3
        });

        setSprints(prev => ({ ...prev, [sprintId]: completed, [nextSprint.id]: nextSprint }));
        return { completed, nextSprint };
    }, [sprints, trainingPreferences, setSprints]);

    const getExerciseSprintProgress = useCallback((exerciseKey) => {
        const activeSprint = getActiveSprint(sprints, exerciseKey);
        if (!activeSprint) return null;
        return {
            sprint: activeSprint,
            progress: getSprintProgress(activeSprint),
            currentWorkout: getCurrentWorkout(activeSprint)
        };
    }, [sprints]);

    return {
        // Session state
        currentSession, setCurrentSession,
        pendingSession,
        workoutQueue,
        pendingWorkout,

        // Timer state
        timeLeft, setTimeLeft,
        amrapValue, setAmrapValue,
        isTimerRunning, setIsTimerRunning,
        testInput, setTestInput,
        isProcessing,
        workoutNotes, setWorkoutNotes,
        exerciseTimeLeft, setExerciseTimeLeft,
        isExerciseTimerRunning, setIsExerciseTimerRunning,
        exerciseTimerStarted, setExerciseTimerStarted,

        // Handlers
        startWorkout,
        startWorkoutWithWarmup,
        startStack,
        startExpressWorkout,
        completeWorkout,
        applyCalibration,
        handleTestSubmit,
        handleResumeSession,
        handleDiscardSession,
        handleSaveSession,
        handleWarmupComplete,
        handleWarmupSkip,
        getRecommendedWarmupForExercise,

        // Sprint
        ensureSprintExists,
        handleCompleteSprint,
        getExerciseSprintProgress,
    };
}
