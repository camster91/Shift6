import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { EXERCISE_PLANS, DIFFICULTY_LEVELS, generateProgression, getCustomRest } from './data/exercises.jsx';
import { EXERCISE_LIBRARY, STARTER_TEMPLATES, EQUIPMENT, PROGRAM_MODES } from './data/exerciseLibrary.js';
import { getDailyStack } from './utils/schedule';
import { calculateStats, getUnlockedBadges } from './utils/gamification';
import {
    savePreferences,
    migrateExistingUser,
    requiresPlanRegeneration,
    regenerateAllPlans,
    saveCustomPlans,
    loadCustomPlans
} from './utils/preferences.js';
import {
    loadSprints,
    saveSprints,
    getActiveSprint,
    getOrCreateSprint,
    analyzeWorkoutPerformance,
    recalculateSprint,
    advanceSprint,
    completeSprint,
    generateNextSprint,
    getCurrentWorkout,
    getSprintProgress,
    SPRINT_STATUS
} from './utils/progression.js';

// Components
import Header from './components/Layout/Header';
import Dashboard from './components/Views/Dashboard';
import WorkoutSession from './components/Views/WorkoutSession';
import AddExercise from './components/Views/AddExercise';
import Onboarding from './components/Views/Onboarding';
import ExerciseLibrary from './components/Views/ExerciseLibrary';
import ProgramManager from './components/Views/ProgramManager';
import TrainingSettings from './components/Views/TrainingSettings';
import { AchievementToastManager } from './components/Visuals/AchievementToast';

const STORAGE_PREFIX = 'shift6_';

const App = () => {
    // ---------------- STATE ----------------
    // Persistent Progress
    const [completedDays, setCompletedDays] = useState(() => {
        const saved = localStorage.getItem(`${STORAGE_PREFIX}progress`);
        return saved ? JSON.parse(saved) : {};
    });

    const [sessionHistory, setSessionHistory] = useState(() => {
        const saved = localStorage.getItem(`${STORAGE_PREFIX}history`);
        return saved ? JSON.parse(saved) : [];
    });

    // Settings
    const [audioEnabled, setAudioEnabled] = useState(() => {
        const saved = localStorage.getItem(`${STORAGE_PREFIX}audio_enabled`);
        return saved !== null ? JSON.parse(saved) : true;
    });

    const [restTimerOverride, setRestTimerOverride] = useState(() => {
        const saved = localStorage.getItem(`${STORAGE_PREFIX}rest_timer`);
        return saved !== null ? JSON.parse(saved) : null;
    });

    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem(`${STORAGE_PREFIX}theme`);
        return saved || 'dark';
    });

    // Custom exercises added by user
    const [customExercises, setCustomExercises] = useState(() => {
        const saved = localStorage.getItem(`${STORAGE_PREFIX}custom_exercises`);
        return saved ? JSON.parse(saved) : {};
    });

    // Difficulty level per exercise (1-6, default 3 = Standard)
    const [exerciseDifficulty, setExerciseDifficulty] = useState(() => {
        const saved = localStorage.getItem(`${STORAGE_PREFIX}difficulty`);
        return saved ? JSON.parse(saved) : {};
    });

    // Gym weights per exercise (stores current weight for gym progression)
    const [gymWeights, setGymWeights] = useState(() => {
        const saved = localStorage.getItem(`${STORAGE_PREFIX}gym_weights`);
        return saved ? JSON.parse(saved) : {};
    });

    // Sprint-based progression system
    const [sprints, setSprints] = useState(() => loadSprints());

    // UI State for Add Exercise modal
    const [showAddExercise, setShowAddExercise] = useState(false);
    const [showExerciseLibrary, setShowExerciseLibrary] = useState(false);
    const [showProgramManager, setShowProgramManager] = useState(false);
    const [showTrainingSettings, setShowTrainingSettings] = useState(false);

    // Training Preferences (with migration for existing users)
    const [trainingPreferences, setTrainingPreferences] = useState(() => {
        return migrateExistingUser();
    });

    // Custom generated plans (based on preferences)
    const [customPlans, setCustomPlans] = useState(() => {
        return loadCustomPlans();
    });

    // Program Mode: 'bodyweight' | 'mixed' | 'gym'
    const [programMode, setProgramMode] = useState(() => {
        const saved = localStorage.getItem(`${STORAGE_PREFIX}program_mode`);
        return saved || null; // null = show onboarding
    });

    // Active Program: array of exercise keys in current program
    const [activeProgram, setActiveProgram] = useState(() => {
        const saved = localStorage.getItem(`${STORAGE_PREFIX}active_program`);
        return saved ? JSON.parse(saved) : null; // null = use default 9
    });

    // User Equipment: array of equipment IDs user has access to
    const [userEquipment, setUserEquipment] = useState(() => {
        const saved = localStorage.getItem(`${STORAGE_PREFIX}user_equipment`);
        return saved ? JSON.parse(saved) : ['none'];
    });

    // Onboarding Complete flag
    const [onboardingComplete, setOnboardingComplete] = useState(() => {
        // Check if user has progress (existing users skip onboarding)
        const hasProgress = localStorage.getItem(`${STORAGE_PREFIX}progress`);
        const onboarded = localStorage.getItem(`${STORAGE_PREFIX}onboarding_complete`);
        if (onboarded === 'true') return true;
        if (hasProgress && Object.keys(JSON.parse(hasProgress)).length > 0) {
            // Existing user - mark as onboarded and set bodyweight mode
            localStorage.setItem(`${STORAGE_PREFIX}onboarding_complete`, 'true');
            localStorage.setItem(`${STORAGE_PREFIX}program_mode`, 'bodyweight');
            return true;
        }
        return false;
    });

    // Track unlocked badges to detect new ones
    const [seenBadgeIds, setSeenBadgeIds] = useState(() => {
        const saved = localStorage.getItem(`${STORAGE_PREFIX}seen_badges`);
        return saved ? JSON.parse(saved) : [];
    });
    const [newBadges, setNewBadges] = useState([]);
    const prevStatsRef = useRef(null);

    // Merge built-in, library, and custom exercises
    const allExercises = useMemo(() => {
        const merged = { ...EXERCISE_PLANS };

        // Add library exercises (with generated progressions)
        Object.entries(EXERCISE_LIBRARY).forEach(([key, ex]) => {
            if (!merged[key]) {
                merged[key] = {
                    ...ex,
                    weeks: generateProgression(ex.startReps, ex.finalGoal),
                    image: `neo:${key}`,
                    finalGoal: `${ex.finalGoal} ${ex.unit === 'seconds' ? 'Seconds' : 'Reps'}`,
                };
            }
        });

        // Add custom exercises
        return { ...merged, ...customExercises };
    }, [customExercises]);

    // Get active program exercise keys (defaults to original 9)
    const activeProgramKeys = useMemo(() => {
        return activeProgram || Object.keys(EXERCISE_PLANS);
    }, [activeProgram]);

    useEffect(() => {
        localStorage.setItem(`${STORAGE_PREFIX}progress`, JSON.stringify(completedDays));
    }, [completedDays]);

    useEffect(() => {
        localStorage.setItem(`${STORAGE_PREFIX}custom_exercises`, JSON.stringify(customExercises));
    }, [customExercises]);

    useEffect(() => {
        localStorage.setItem(`${STORAGE_PREFIX}difficulty`, JSON.stringify(exerciseDifficulty));
    }, [exerciseDifficulty]);

    useEffect(() => {
        localStorage.setItem(`${STORAGE_PREFIX}gym_weights`, JSON.stringify(gymWeights));
    }, [gymWeights]);

    useEffect(() => {
        localStorage.setItem(`${STORAGE_PREFIX}history`, JSON.stringify(sessionHistory));
    }, [sessionHistory]);

    // Save sprints when they change
    useEffect(() => {
        saveSprints(sprints);
    }, [sprints]);

    // Detect new badges when stats change
    useEffect(() => {
        const stats = calculateStats(completedDays, sessionHistory);
        const unlockedBadges = getUnlockedBadges(stats);
        const unlockedIds = unlockedBadges.map(b => b.id);

        // Find newly unlocked badges (not in seenBadgeIds)
        const newlyUnlocked = unlockedBadges.filter(b => !seenBadgeIds.includes(b.id));

        if (newlyUnlocked.length > 0 && prevStatsRef.current !== null) {
            setNewBadges(newlyUnlocked);
            // Update seen badges
            setSeenBadgeIds(unlockedIds);
            localStorage.setItem(`${STORAGE_PREFIX}seen_badges`, JSON.stringify(unlockedIds));
        } else if (prevStatsRef.current === null) {
            // First load - just update seen badges without showing toast
            setSeenBadgeIds(unlockedIds);
            localStorage.setItem(`${STORAGE_PREFIX}seen_badges`, JSON.stringify(unlockedIds));
        }

        prevStatsRef.current = stats;
    }, [completedDays, sessionHistory, seenBadgeIds]);

    useEffect(() => {
        localStorage.setItem(`${STORAGE_PREFIX}audio_enabled`, JSON.stringify(audioEnabled));
    }, [audioEnabled]);

    useEffect(() => {
        localStorage.setItem(`${STORAGE_PREFIX}rest_timer`, JSON.stringify(restTimerOverride));
    }, [restTimerOverride]);

    useEffect(() => {
        localStorage.setItem(`${STORAGE_PREFIX}theme`, theme);
        document.documentElement.classList.remove('dark', 'light');
        document.documentElement.classList.add(theme);
    }, [theme]);

    useEffect(() => {
        if (programMode) localStorage.setItem(`${STORAGE_PREFIX}program_mode`, programMode);
    }, [programMode]);

    useEffect(() => {
        if (activeProgram) {
            localStorage.setItem(`${STORAGE_PREFIX}active_program`, JSON.stringify(activeProgram));
        }
    }, [activeProgram]);

    useEffect(() => {
        localStorage.setItem(`${STORAGE_PREFIX}user_equipment`, JSON.stringify(userEquipment));
    }, [userEquipment]);

    useEffect(() => {
        localStorage.setItem(`${STORAGE_PREFIX}onboarding_complete`, String(onboardingComplete));
    }, [onboardingComplete]);

    useEffect(() => {
        savePreferences(trainingPreferences);
    }, [trainingPreferences]);

    useEffect(() => {
        saveCustomPlans(customPlans);
    }, [customPlans]);

    // UI State
    const [workoutQueue, setWorkoutQueue] = useState(() => {
        const saved = localStorage.getItem(`${STORAGE_PREFIX}queue`);
        return saved ? JSON.parse(saved) : [];
    });

    const [currentSession, setCurrentSession] = useState(() => {
        const saved = localStorage.getItem(`${STORAGE_PREFIX}current_session`);
        return saved ? JSON.parse(saved) : null;
    });

    useEffect(() => {
        localStorage.setItem(`${STORAGE_PREFIX}queue`, JSON.stringify(workoutQueue));
    }, [workoutQueue]);

    useEffect(() => {
        localStorage.setItem(`${STORAGE_PREFIX}current_session`, JSON.stringify(currentSession));
    }, [currentSession]);

    // Browser exit warning
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (currentSession) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [currentSession]);

    const [activeExercise, setActiveExercise] = useState('pushups');

    // Workout State
    const [timeLeft, setTimeLeft] = useState(0);
    const [amrapValue, setAmrapValue] = useState('');
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [testInput, setTestInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [workoutNotes, setWorkoutNotes] = useState('');

    // Exercise countdown timer (for hold exercises like Plank)
    const [exerciseTimeLeft, setExerciseTimeLeft] = useState(0);
    const [isExerciseTimerRunning, setIsExerciseTimerRunning] = useState(false);
    const [exerciseTimerStarted, setExerciseTimerStarted] = useState(false);

    // ---------------- WORKOUT LOGIC ----------------

    // Rest Timer Tick
    useEffect(() => {
        let interval = null;
        if (isTimerRunning && timeLeft > 0) {
            interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        } else if (timeLeft === 0) {
            setIsTimerRunning(false);
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning, timeLeft]);

    // Exercise Countdown Timer Tick (for hold exercises)
    useEffect(() => {
        let interval = null;
        if (isExerciseTimerRunning && exerciseTimeLeft > 0) {
            interval = setInterval(() => setExerciseTimeLeft(prev => prev - 1), 1000);
        } else if (exerciseTimeLeft === 0 && exerciseTimerStarted) {
            setIsExerciseTimerRunning(false);
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isExerciseTimerRunning, exerciseTimeLeft, exerciseTimerStarted]);

    // ⚡ Bolt: Memoize startWorkout to prevent re-renders in Dashboard.
    const startWorkout = useCallback((week, dayIndex, overrideKey = null) => {
        const exKey = overrideKey || activeExercise;
        if (overrideKey) setActiveExercise(overrideKey);

        const exercise = allExercises[exKey];
        if (!exercise) return;

        // Handle gym exercises (progressive overload, no fixed days)
        if (exercise.progressionType === 'gym') {
            const gymConfig = exercise.gymConfig || { sets: 3, repRange: [8, 12], restSeconds: 90 };
            setCurrentSession({
                exerciseKey: exKey,
                exerciseName: exercise.name,
                week: 0,
                dayIndex: 0,
                setIndex: 0,
                rest: restTimerOverride !== null ? restTimerOverride : gymConfig.restSeconds,
                baseReps: [],
                reps: [],
                dayId: `gym_${exKey}_${Date.now()}`,
                isFinal: false,
                color: exercise.color,
                unit: exercise.unit,
                difficulty: 3,
                step: 'workout',
                isGym: true,
                gymConfig
            });
            setAmrapValue('');
            setTestInput('');
            setTimeLeft(0);
            setWorkoutNotes('');
            setExerciseTimeLeft(0);
            setIsExerciseTimerRunning(false);
            setExerciseTimerStarted(false);
            return;
        }

        // Handle bodyweight exercises (18-day progression)
        // Use customPlans if available, otherwise fall back to exercise.weeks
        const exerciseWeeks = customPlans[exKey]?.weeks || exercise.weeks;
        const weekData = exerciseWeeks?.find(w => w.week === week);
        if (!weekData) return;

        const day = weekData.days[dayIndex];
        const isFinal = day.isFinal || false;

        // Apply difficulty scaling
        const difficultyLevel = exerciseDifficulty[exKey] || 3;
        const multiplier = DIFFICULTY_LEVELS[difficultyLevel]?.multiplier || 1.0;
        const scaledReps = day.reps.map(r => Math.max(1, Math.round(r * multiplier)));

        // Check if assessment already done (calibration exists)
        const calibrations = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}calibrations`) || '{}');
        const hasCalibration = calibrations[exKey] !== undefined;
        const needsAssessment = !isFinal && (completedDays[exKey]?.length || 0) === 0 && !hasCalibration;

        // Calculate rest time: user override > custom preferences > default
        const restTime = restTimerOverride !== null
            ? restTimerOverride
            : getCustomRest(week, trainingPreferences);

        setCurrentSession({
            exerciseKey: exKey,
            exerciseName: exercise.name,
            week,
            dayIndex,
            setIndex: 0,
            rest: restTime,
            baseReps: day.reps,
            reps: scaledReps,
            dayId: day.id,
            isFinal: isFinal,
            color: exercise.color,
            unit: exercise.unit,
            difficulty: difficultyLevel,
            step: needsAssessment ? 'assessment' : 'workout'
        });
        setAmrapValue('');
        setTestInput('');
        setTimeLeft(0);
        setWorkoutNotes('');
        // Reset exercise timer state
        setExerciseTimeLeft(0);
        setIsExerciseTimerRunning(false);
        setExerciseTimerStarted(false);
    }, [activeExercise, allExercises, completedDays, exerciseDifficulty, restTimerOverride, customPlans, trainingPreferences]);

    // Add custom exercise
    const handleAddExercise = (exercise) => {
        setCustomExercises(prev => ({
            ...prev,
            [exercise.key]: exercise
        }));
    };

    // Delete custom exercise
    // ⚡ Bolt: Memoize handleDeleteExercise to prevent Dashboard re-renders.
    const handleDeleteExercise = useCallback((key) => {
        if (window.confirm('Delete this custom exercise? This cannot be undone.')) {
            setCustomExercises(prev => {
                const updated = { ...prev };
                delete updated[key];
                return updated;
            });
            // Also clean up progress for this exercise
            setCompletedDays(prev => {
                const updated = { ...prev };
                delete updated[key];
                return updated;
            });
        }
    }, []);

    // Change difficulty for an exercise
    // ⚡ Bolt: Memoize handleSetDifficulty to prevent Dashboard re-renders.
    const handleSetDifficulty = useCallback((exerciseKey, level) => {
        setExerciseDifficulty(prev => ({
            ...prev,
            [exerciseKey]: level
        }));
    }, []);

    // Add exercise to active program
    const handleAddToProgram = (exerciseKey) => {
        setActiveProgram(prev => {
            const current = prev || Object.keys(EXERCISE_PLANS);
            if (current.includes(exerciseKey)) return current;
            return [...current, exerciseKey];
        });
    };

    // Remove exercise from active program
    const handleRemoveFromProgram = (exerciseKey) => {
        setActiveProgram(prev => {
            const current = prev || Object.keys(EXERCISE_PLANS);
            return current.filter(k => k !== exerciseKey);
        });
    };

    // Apply a starter template
    const handleApplyTemplate = (templateId) => {
        const template = STARTER_TEMPLATES[templateId];
        if (template) {
            setProgramMode(template.mode);
            setActiveProgram([...template.exercises]);
        }
    };

    // Apply custom program from ProgramManager
    const handleApplyCustomProgram = (exercises) => {
        if (exercises && exercises.length >= 3) {
            setActiveProgram([...exercises]);
        }
    };

    // Complete onboarding
    const handleCompleteOnboarding = (mode, equipment, templateId, preferences = null, customExerciseList = null) => {
        try {
            setProgramMode(mode || 'bodyweight');
            setUserEquipment(equipment || ['none']);

            // Handle program exercises
            if (customExerciseList && customExerciseList.length > 0) {
                // User built a custom program
                setActiveProgram([...customExerciseList]);
            } else if (templateId && STARTER_TEMPLATES[templateId]) {
                const template = STARTER_TEMPLATES[templateId];
                setActiveProgram([...template.exercises]);
            } else {
                // Default to Shift6 Classic
                setActiveProgram([...STARTER_TEMPLATES['shift6-classic'].exercises]);
            }

            // Save training preferences if provided
            if (preferences) {
                const prefsWithTimestamps = {
                    ...preferences,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                setTrainingPreferences(prefsWithTimestamps);
            }
        } catch (error) {
            console.error('Error completing onboarding:', error);
            // Set fallback values
            setProgramMode('bodyweight');
            setActiveProgram([...STARTER_TEMPLATES['shift6-classic'].exercises]);
        } finally {
            // Always complete onboarding even if there were errors
            setOnboardingComplete(true);
        }
    };

    // Handle training preferences change
    const handleTrainingPreferencesChange = useCallback((newPrefs) => {
        const oldPrefs = trainingPreferences;
        const updatedPrefs = {
            ...newPrefs,
            updatedAt: new Date().toISOString()
        };

        // Check if we need to regenerate plans
        if (requiresPlanRegeneration(oldPrefs, updatedPrefs)) {
            const calibrations = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}calibrations`) || '{}');
            const newPlans = regenerateAllPlans(allExercises, activeProgramKeys, calibrations, updatedPrefs);
            setCustomPlans(newPlans);
        }

        setTrainingPreferences(updatedPrefs);
    }, [trainingPreferences, allExercises, activeProgramKeys]);

    // Change program mode
    const handleChangeProgramMode = (newMode) => {
        setProgramMode(newMode);
        // Filter active program to only include compatible exercises
        if (activeProgram) {
            const filtered = activeProgram.filter(key => {
                const ex = allExercises[key];
                return ex && ex.modes && ex.modes.includes(newMode);
            });
            setActiveProgram(filtered.length > 0 ? filtered : null);
        }
    };

    const startStack = useCallback(() => {
        const stack = getDailyStack(completedDays, allExercises, activeProgramKeys, trainingPreferences);
        if (stack.length === 0) return;

        setWorkoutQueue(stack.slice(1));
        startWorkout(stack[0].week, stack[0].dayIndex, stack[0].exerciseKey);
    }, [completedDays, allExercises, activeProgramKeys, startWorkout, trainingPreferences]);

    const completeWorkout = (actualRepsPerSet = null) => {
        if (!currentSession || isProcessing) return;
        setIsProcessing(true);

        const { exerciseKey, dayId, reps, unit } = currentSession;
        const amrapReps = parseInt(amrapValue) || 0;
        const totalVolume = reps.reduce((sum, r) => sum + r, 0) + amrapReps;

        // For standard exercises, assume prescribed reps were completed per set
        // AMRAP captures extra effort on final set
        const actualReps = actualRepsPerSet || reps;

        const newCompletedDays = {
            ...completedDays,
            [exerciseKey]: [...(completedDays[exerciseKey] || []), dayId]
        };
        newCompletedDays[exerciseKey] = [...new Set(newCompletedDays[exerciseKey])];

        const newHistoryItem = {
            exerciseKey,
            dayId,
            date: new Date().toISOString(),
            volume: totalVolume,
            unit,
            notes: workoutNotes.trim() || undefined,
            actualReps,
            targetReps: reps,
            amrapReps
        };
        setSessionHistory(prev => [newHistoryItem, ...prev].slice(0, 50));
        setWorkoutNotes('');
        setCompletedDays(newCompletedDays);

        // Update sprint progression if exists
        const activeSprint = getActiveSprint(sprints, exerciseKey);
        if (activeSprint) {
            // Analyze performance
            const performance = analyzeWorkoutPerformance(actualReps, reps, amrapReps);

            // Recalculate sprint if needed
            let updatedSprint = activeSprint;
            if (performance.adjustment.shouldAdjust) {
                updatedSprint = recalculateSprint(activeSprint, performance);
            } else {
                // Just record performance without adjusting
                updatedSprint = {
                    ...activeSprint,
                    performanceHistory: [...activeSprint.performanceHistory, {
                        date: new Date().toISOString(),
                        ...performance
                    }]
                };
            }

            // Advance to next day/week
            updatedSprint = advanceSprint(updatedSprint);

            // Update sprints state
            setSprints(prev => ({
                ...prev,
                [updatedSprint.id]: updatedSprint
            }));
        }

        // Queue Handling
        if (workoutQueue.length > 0) {
            const next = workoutQueue[0];
            const remaining = workoutQueue.slice(1);
            setWorkoutQueue(remaining);
            startWorkout(next.week, next.dayIndex, next.exerciseKey);
        } else {
            setCurrentSession(null);
        }

        setTimeout(() => setIsProcessing(false), 1000);
    };

    const applyCalibration = (factor, skipConfirmation = false) => {
        if (!currentSession) return;
        const newReps = currentSession.baseReps.map(r => Math.ceil(r * factor));

        // Save calibration factor for this exercise
        const calibrations = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}calibrations`) || '{}');
        calibrations[currentSession.exerciseKey] = factor;
        localStorage.setItem(`${STORAGE_PREFIX}calibrations`, JSON.stringify(calibrations));

        // If using default, skip confirmation and go straight to workout
        if (skipConfirmation) {
            setCurrentSession(prev => ({ ...prev, reps: newReps, step: 'workout' }));
        } else {
            // Show assessment complete screen with option to start or exit
            setCurrentSession(prev => ({ ...prev, reps: newReps, step: 'assessment-complete' }));
        }
    };

    const handleTestSubmit = (e) => {
        e.preventDefault();
        if (!testInput) return;
        const userMax = parseFloat(testInput);
        if (isNaN(userMax) || userMax <= 0) return;

        const planMaxRep = Math.max(...currentSession.baseReps);
        const estimatedPlanMax = planMaxRep / 0.7;
        const scalingFactor = userMax / estimatedPlanMax;
        const clampedFactor = Math.max(0.5, Math.min(scalingFactor, 2.5));

        applyCalibration(clampedFactor);
    };

    // ---------------- DATA MANAGEMENT ----------------

    const handleExport = () => {
        const data = {
            progress: completedDays,
            introDismissed: localStorage.getItem('shift6_intro_dismissed'),
            timestamp: new Date().toISOString(),
            version: '1.0'
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shift6_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleExportCSV = () => {
        if (sessionHistory.length === 0) {
            alert('No workout history to export.');
            return;
        }

        const headers = ['Date', 'Exercise', 'Day', 'Volume', 'Unit', 'Notes'];
        const rows = sessionHistory.map(s => [
            new Date(s.date).toLocaleString(),
            EXERCISE_PLANS[s.exerciseKey]?.name || s.exerciseKey,
            s.dayId,
            s.volume,
            s.unit,
            s.notes ? `"${s.notes.replace(/"/g, '""')}"` : ''
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shift6_history_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImport = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.progress) {
                    setCompletedDays(data.progress);
                }
                if (data.introDismissed) {
                    localStorage.setItem('shift6_intro_dismissed', data.introDismissed);
                }
                alert('Data restored successfully!');
            } catch (err) {
                console.error("Import failed", err);
                alert('Failed to import data. Invalid file format.');
            }
        };
        reader.readAsText(file);
    };

    const handleFactoryReset = () => {
        if (window.confirm('WARNING: This will permanently delete ALL workout history and progress. This cannot be undone. Are you absolutely sure?')) {
            setCompletedDays({});
            setSessionHistory([]);
            localStorage.clear();
            alert('Aura Cleansed. Progress Reset.');
            window.location.reload();
        }
    };

    // ⚡ Bolt: Memoize modal handlers to prevent Dashboard re-renders.
    const onShowAddExercise = useCallback(() => setShowAddExercise(true), []);
    const onShowExerciseLibrary = useCallback(() => setShowExerciseLibrary(true), []);
    const onShowProgramManager = useCallback(() => setShowProgramManager(true), []);
    const onShowTrainingSettings = useCallback(() => setShowTrainingSettings(true), []);

    // ---------------- SPRINT MANAGEMENT ----------------

    // Get or create a sprint for an exercise
    const ensureSprintExists = useCallback((exerciseKey, startingMax) => {
        const exerciseData = allExercises[exerciseKey];
        const existingSprint = getActiveSprint(sprints, exerciseKey);

        if (existingSprint) {
            return existingSprint;
        }

        // Create new sprint with user's preferences
        const newSprint = getOrCreateSprint(sprints, exerciseKey, startingMax, {
            repScheme: trainingPreferences.repScheme || 'hypertrophy',
            trainingDaysPerWeek: trainingPreferences.trainingDaysPerWeek || 3,
            programDuration: 6 // 6-week sprints
        }, exerciseData);

        setSprints(prev => ({
            ...prev,
            [newSprint.id]: newSprint
        }));

        return newSprint;
    }, [sprints, allExercises, trainingPreferences]);

    // Complete a sprint (called when user finishes all weeks)
    const handleCompleteSprint = useCallback((sprintId, finalMax) => {
        const sprint = sprints[sprintId];
        if (!sprint || sprint.status !== SPRINT_STATUS.ACTIVE) return;

        const completed = completeSprint(sprint, finalMax);

        // Generate next sprint
        const nextSprint = generateNextSprint(completed, {
            repScheme: trainingPreferences.repScheme || 'hypertrophy',
            trainingDaysPerWeek: trainingPreferences.trainingDaysPerWeek || 3
        });

        setSprints(prev => ({
            ...prev,
            [sprintId]: completed,
            [nextSprint.id]: nextSprint
        }));

        return { completed, nextSprint };
    }, [sprints, trainingPreferences]);

    // Get sprint progress for an exercise
    const getExerciseSprintProgress = useCallback((exerciseKey) => {
        const activeSprint = getActiveSprint(sprints, exerciseKey);
        if (!activeSprint) return null;

        return {
            sprint: activeSprint,
            progress: getSprintProgress(activeSprint),
            currentWorkout: getCurrentWorkout(activeSprint)
        };
    }, [sprints]);

    // ---------------- RENDER ----------------

    return (
        <div className={`min-h-screen font-sans selection:bg-cyan-500/30 ${
            theme === 'light' ? 'bg-slate-100 text-slate-900' : 'bg-slate-950 text-slate-100'
        }`}>
            <Header
                onExport={handleExport}
                onExportCSV={handleExportCSV}
                onImport={handleImport}
                onFactoryReset={handleFactoryReset}
                audioEnabled={audioEnabled}
                setAudioEnabled={setAudioEnabled}
                restTimerOverride={restTimerOverride}
                setRestTimerOverride={setRestTimerOverride}
                theme={theme}
                setTheme={setTheme}
                onShowTrainingSettings={onShowTrainingSettings}
            />

            <main className="max-w-6xl mx-auto p-4 md:p-8 pb-8">
                <Dashboard
                    completedDays={completedDays}
                    sessionHistory={sessionHistory}
                    startStack={startStack}
                    startWorkout={startWorkout}
                    allExercises={allExercises}
                    customExercises={customExercises}
                    exerciseDifficulty={exerciseDifficulty}
                    onSetDifficulty={handleSetDifficulty}
                    onDeleteExercise={handleDeleteExercise}
                    onShowAddExercise={onShowAddExercise}
                    programMode={programMode}
                    activeProgram={activeProgramKeys}
                    onShowExerciseLibrary={onShowExerciseLibrary}
                    onShowProgramManager={onShowProgramManager}
                    trainingPreferences={trainingPreferences}
                    customPlans={customPlans}
                    sprints={sprints}
                    getExerciseSprintProgress={getExerciseSprintProgress}
                    ensureSprintExists={ensureSprintExists}
                    onCompleteSprint={handleCompleteSprint}
                />
            </main>

            {/* Add Exercise Modal */}
            {showAddExercise && (
                <AddExercise
                    onAdd={handleAddExercise}
                    onClose={() => setShowAddExercise(false)}
                />
            )}

            {/* Workout Session - Fullscreen Overlay */}
            {currentSession && (
                <div className="fixed inset-0 z-50 bg-slate-950">
                    <WorkoutSession
                        currentSession={currentSession}
                        setCurrentSession={setCurrentSession}
                        timeLeft={timeLeft}
                        setTimeLeft={setTimeLeft}
                        isTimerRunning={isTimerRunning}
                        setIsTimerRunning={setIsTimerRunning}
                        amrapValue={amrapValue}
                        setAmrapValue={setAmrapValue}
                        testInput={testInput}
                        setTestInput={setTestInput}
                        handleTestSubmit={handleTestSubmit}
                        applyCalibration={applyCalibration}
                        completeWorkout={completeWorkout}
                        audioEnabled={audioEnabled}
                        workoutNotes={workoutNotes}
                        setWorkoutNotes={setWorkoutNotes}
                        exerciseTimeLeft={exerciseTimeLeft}
                        setExerciseTimeLeft={setExerciseTimeLeft}
                        isExerciseTimerRunning={isExerciseTimerRunning}
                        setIsExerciseTimerRunning={setIsExerciseTimerRunning}
                        exerciseTimerStarted={exerciseTimerStarted}
                        setExerciseTimerStarted={setExerciseTimerStarted}
                        completedDays={completedDays}
                        sessionHistory={sessionHistory}
                        gymWeights={gymWeights}
                        setGymWeights={setGymWeights}
                        allExercises={allExercises}
                    />
                </div>
            )}

            {/* Exercise Library Modal */}
            {showExerciseLibrary && (
                <ExerciseLibrary
                    allExercises={allExercises}
                    activeProgram={activeProgramKeys}
                    programMode={programMode}
                    userEquipment={userEquipment}
                    onAddToProgram={handleAddToProgram}
                    onRemoveFromProgram={handleRemoveFromProgram}
                    onClose={() => setShowExerciseLibrary(false)}
                />
            )}

            {/* Program Manager Modal */}
            {showProgramManager && (
                <ProgramManager
                    allExercises={allExercises}
                    activeProgram={activeProgramKeys}
                    programMode={programMode}
                    userEquipment={userEquipment}
                    templates={STARTER_TEMPLATES}
                    equipment={EQUIPMENT}
                    programModes={PROGRAM_MODES}
                    onApplyTemplate={handleApplyTemplate}
                    onApplyCustomProgram={handleApplyCustomProgram}
                    onRemoveFromProgram={handleRemoveFromProgram}
                    onChangeProgramMode={handleChangeProgramMode}
                    onSetEquipment={setUserEquipment}
                    completedDays={completedDays}
                    onShowLibrary={() => {
                        setShowProgramManager(false);
                        setShowExerciseLibrary(true);
                    }}
                    onClose={() => setShowProgramManager(false)}
                />
            )}

            {/* Onboarding - Fullscreen for new users */}
            {!onboardingComplete && (
                <Onboarding
                    programModes={PROGRAM_MODES}
                    equipment={EQUIPMENT}
                    templates={STARTER_TEMPLATES}
                    onComplete={handleCompleteOnboarding}
                />
            )}

            {/* Training Settings Modal */}
            {showTrainingSettings && (
                <TrainingSettings
                    preferences={trainingPreferences}
                    onSave={handleTrainingPreferencesChange}
                    onClose={() => setShowTrainingSettings(false)}
                    hasProgress={Object.keys(completedDays).length > 0}
                />
            )}

            {/* Achievement Toast Notifications */}
            <AchievementToastManager
                newBadges={newBadges}
                onAllDismissed={() => setNewBadges([])}
            />
        </div>
    );
};

export default App;
