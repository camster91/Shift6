import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { EXERCISE_PLANS, DIFFICULTY_LEVELS, getCustomRest, generateProgression } from './data/exercises.jsx';
import { EXERCISE_LIBRARY, STARTER_TEMPLATES, EQUIPMENT, PROGRAM_MODES } from './data/exerciseLibrary.js';
import { EXERCISES as DATABASE_EXERCISES } from './data/exerciseDatabase.js';
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
    detectPlateau,
    SPRINT_STATUS
} from './utils/progression.js';

// Components
import Header from './components/Layout/Header';
import BottomNav from './components/Layout/BottomNav';
import SideDrawer from './components/Layout/SideDrawer';
import Dashboard from './components/Views/Dashboard';
import WorkoutQuickStart from './components/Views/WorkoutQuickStart';
import Progress from './components/Views/Progress';
import Guide from './components/Views/Guide';
import WorkoutSession from './components/Views/WorkoutSession';
import AddExercise from './components/Views/AddExercise';
import Onboarding from './components/Views/Onboarding';
import ExerciseLibrary from './components/Views/ExerciseLibrary';
import ProgramManager from './components/Views/ProgramManager';
import TrainingSettings from './components/Views/TrainingSettings';
import BodyMetrics from './components/Views/BodyMetrics';
import WarmupRoutine from './components/Views/WarmupRoutine';
import AccessibilitySettings from './components/Views/AccessibilitySettings';
import { MultiAchievementModal } from './components/Visuals/AchievementModal';
import { getRecommendedWarmup } from './data/warmupRoutines';

// Gym Mode Components
import ModeSelector from './components/Views/ModeSelector';
import GymDashboard from './components/Views/GymDashboard';
import GymOnboarding from './components/Views/GymOnboarding';
import GymWorkoutSession from './components/Views/GymWorkoutSession';

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
    void setRestTimerOverride; // Settings panel TODO

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

    // Personal records per exercise (max reps achieved)
    const [personalRecords, setPersonalRecords] = useState(() => {
        const saved = localStorage.getItem(`${STORAGE_PREFIX}personal_records`);
        return saved ? JSON.parse(saved) : {};
    });

    // Sprint-based progression system
    const [sprints, setSprints] = useState(() => loadSprints());

    // UI State for Add Exercise modal
    const [showAddExercise, setShowAddExercise] = useState(false);
    const [showExerciseLibrary, setShowExerciseLibrary] = useState(false);
    const [showProgramManager, setShowProgramManager] = useState(false);
    const [showTrainingSettings, setShowTrainingSettings] = useState(false);
    const [showBodyMetrics, setShowBodyMetrics] = useState(false);
    const [showAccessibility, setShowAccessibility] = useState(false);
    const [showWarmup, setShowWarmup] = useState(false);
    const [pendingWorkout, setPendingWorkout] = useState(null); // Stores workout to start after warmup

    // Navigation State
    const [activeTab, setActiveTab] = useState('home');
    const [showDrawer, setShowDrawer] = useState(false);
    const [showGuide, setShowGuide] = useState(false);

    // Warm-up preference (enabled by default)
    const [warmupEnabled, setWarmupEnabled] = useState(() => {
        const saved = localStorage.getItem(`${STORAGE_PREFIX}warmup_enabled`);
        return saved !== null ? JSON.parse(saved) : true;
    });
    void setWarmupEnabled; // Settings panel TODO

    // Body metrics (weight, measurements)
    const [bodyMetrics, setBodyMetrics] = useState(() => {
        const saved = localStorage.getItem(`${STORAGE_PREFIX}body_metrics`);
        return saved ? JSON.parse(saved) : [];
    });

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

    // ============ GYM MODE STATE ============
    // Current mode selection (null = show selector on launch)
    const [currentMode, setCurrentMode] = useState(() => {
        // Check if we should remember the mode for today
        const remembered = localStorage.getItem(`${STORAGE_PREFIX}remember_mode_today`);
        const rememberedDate = localStorage.getItem(`${STORAGE_PREFIX}remember_mode_date`);
        const today = new Date().toDateString();
        if (remembered && rememberedDate === today) {
            return remembered;
        }
        return null; // Show mode selector
    });

    // Gym onboarding complete flag
    const [gymOnboardingComplete, setGymOnboardingComplete] = useState(() => {
        const saved = localStorage.getItem(`${STORAGE_PREFIX}gym_onboarding_complete`);
        return saved === 'true';
    });

    // Gym program state
    const [gymProgram, setGymProgram] = useState(() => {
        const saved = localStorage.getItem(`${STORAGE_PREFIX}gym_program`);
        return saved ? JSON.parse(saved) : null;
    });

    // Gym weights (last used weight per exercise)
    const [gymWeights, setGymWeights] = useState(() => {
        const saved = localStorage.getItem(`${STORAGE_PREFIX}gym_weights`);
        return saved ? JSON.parse(saved) : {};
    });

    // Gym workout history
    const [gymHistory, setGymHistory] = useState(() => {
        const saved = localStorage.getItem(`${STORAGE_PREFIX}gym_history`);
        return saved ? JSON.parse(saved) : [];
    });

    // Gym streak
    const [gymStreak, setGymStreak] = useState(() => {
        const saved = localStorage.getItem(`${STORAGE_PREFIX}gym_streak`);
        return saved ? JSON.parse(saved) : 0;
    });

    // Current gym workout session
    const [currentGymSession, setCurrentGymSession] = useState(null);

    // Bootstrap Sprints for Active Program (Dynamic Engine Migration)
    useEffect(() => {
        if (!activeProgram || !trainingPreferences || !allExercises) return;

        // Defer to avoid blocking render
        const timer = setTimeout(() => {
            let hasChanges = false;
            const updatedSprints = { ...sprints };
            // Simple PR scan from history
            const historyPRs = {};
            sessionHistory.forEach(s => {
                if (!historyPRs[s.exerciseKey] || s.volume > historyPRs[s.exerciseKey]) {
                    historyPRs[s.exerciseKey] = s.volume;
                }
            });

            activeProgram.forEach(exKey => {
                // skip if already has active sprint
                if (getActiveSprint(updatedSprints, exKey)) return;

                const exercise = allExercises[exKey];
                if (!exercise) return;

                // Determine starting max from history or default
                const historyMax = historyPRs[exKey] || 0;
                // If no history, checking if we have calibration
                const calibrations = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}calibrations`) || '{}');
                const calibrationFactor = calibrations[exKey] || 1.0;

                // Base start reps scaled by calibration, or history max
                let startMax = Math.round((exercise.startReps || 10) * calibrationFactor);
                if (historyMax > startMax) startMax = historyMax;

                // Create sprint
                const newSprint = getOrCreateSprint(
                    updatedSprints,
                    exKey,
                    startMax,
                    trainingPreferences,
                    exercise
                );

                if (newSprint) {
                    updatedSprints[newSprint.id] = newSprint;
                    hasChanges = true;
                }
            });

            if (hasChanges) {
                setSprints(updatedSprints);
            }
        }, 2000); // Delay 2s to allow load

        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeProgram, trainingPreferences, sessionHistory.length]); // Dependency on history length to trigger updates

    // Merge built-in, library, database, and custom exercises
    const allExercises = useMemo(() => {
        const merged = { ...EXERCISE_PLANS };

        // Add library exercises (these may have additional metadata from progression system)
        Object.entries(EXERCISE_LIBRARY).forEach(([key, ex]) => {
            if (!merged[key] && ex.weeks) {
                merged[key] = {
                    ...ex,
                    image: ex.image || `neo:${key}`,
                    finalGoal: ex.finalGoal || `${ex.startReps} ${ex.unit === 'seconds' ? 'Seconds' : 'Reps'}`,
                };
            }
        });

        // Add database exercises (from smartProgramGenerator) - these have simpler structure
        Object.entries(DATABASE_EXERCISES).forEach(([key, ex]) => {
            if (!merged[key]) {
                merged[key] = {
                    ...ex,
                    key,
                    image: ex.image || `neo:${key}`,
                    finalGoal: ex.finalGoal || `${ex.startReps} ${ex.unit === 'seconds' ? 'Seconds' : 'Reps'}`,
                    // Generate simple progression weeks if not present
                    weeks: ex.weeks || generateProgression(ex.startReps, ex.finalGoal),
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
        localStorage.setItem(`${STORAGE_PREFIX}personal_records`, JSON.stringify(personalRecords));
    }, [personalRecords]);

    useEffect(() => {
        localStorage.setItem(`${STORAGE_PREFIX}body_metrics`, JSON.stringify(bodyMetrics));
    }, [bodyMetrics]);

    useEffect(() => {
        localStorage.setItem(`${STORAGE_PREFIX}warmup_enabled`, JSON.stringify(warmupEnabled));
    }, [warmupEnabled]);

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

    // ============ GYM MODE EFFECTS ============
    useEffect(() => {
        localStorage.setItem(`${STORAGE_PREFIX}gym_onboarding_complete`, String(gymOnboardingComplete));
    }, [gymOnboardingComplete]);

    useEffect(() => {
        if (gymProgram) {
            localStorage.setItem(`${STORAGE_PREFIX}gym_program`, JSON.stringify(gymProgram));
        }
    }, [gymProgram]);

    useEffect(() => {
        localStorage.setItem(`${STORAGE_PREFIX}gym_weights`, JSON.stringify(gymWeights));
    }, [gymWeights]);

    useEffect(() => {
        localStorage.setItem(`${STORAGE_PREFIX}gym_history`, JSON.stringify(gymHistory));
    }, [gymHistory]);

    useEffect(() => {
        localStorage.setItem(`${STORAGE_PREFIX}gym_streak`, JSON.stringify(gymStreak));
    }, [gymStreak]);

    // UI State
    const [workoutQueue, setWorkoutQueue] = useState(() => {
        const saved = localStorage.getItem(`${STORAGE_PREFIX}queue`);
        return saved ? JSON.parse(saved) : [];
    });

    // Current active session - null until user starts or resumes
    const [currentSession, setCurrentSession] = useState(null);

    // Pending session from previous app session (loaded from localStorage)
    const [pendingSession, setPendingSession] = useState(() => {
        const saved = localStorage.getItem(`${STORAGE_PREFIX}current_session`);
        return saved ? JSON.parse(saved) : null;
    });

    // Resume a pending session
    const handleResumeSession = useCallback(() => {
        if (pendingSession) {
            setCurrentSession(pendingSession);
            setPendingSession(null);
        }
    }, [pendingSession]);

    // Discard a pending session
    const handleDiscardSession = useCallback(() => {
        setPendingSession(null);
        localStorage.removeItem(`${STORAGE_PREFIX}current_session`);
    }, []);

    useEffect(() => {
        localStorage.setItem(`${STORAGE_PREFIX}queue`, JSON.stringify(workoutQueue));
    }, [workoutQueue]);

    // Persist current session to localStorage
    useEffect(() => {
        if (currentSession) {
            localStorage.setItem(`${STORAGE_PREFIX}current_session`, JSON.stringify(currentSession));
        }
    }, [currentSession]);

    // Clear localStorage when session ends (currentSession becomes null)
    useEffect(() => {
        if (currentSession === null && !pendingSession) {
            localStorage.removeItem(`${STORAGE_PREFIX}current_session`);
        }
    }, [currentSession, pendingSession]);

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

        // Check if Day 1 assessment is needed (before any workout flow)
        // Assessment is required when: no calibration exists AND no completed days
        const calibrations = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}calibrations`) || '{}');
        const hasCalibration = calibrations[exKey] !== undefined;
        const hasCompletedDays = (completedDays[exKey]?.length || 0) > 0;
        const needsAssessment = !hasCalibration && !hasCompletedDays;

        // Dynamic Engine: Check for active sprint
        const activeSprint = getActiveSprint(sprints, exKey);
        if (activeSprint) {
            const sprintSession = getCurrentWorkout(activeSprint);
            if (sprintSession) {
                // If assessment is needed, show assessment screen first
                // (even with active sprint, first workout needs calibration)
                const initialStep = needsAssessment ? 'assessment' : 'readiness';

                // Construct session from dynamic sprint data
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
                    difficulty: 3, // Difficulty is managed by the sprint engine
                    step: initialStep, // Assessment first if needed, otherwise readiness
                    sprintId: activeSprint.id
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
        }

        // Handle calisthenics exercises (18-day progression)
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

        // Use assessment check from earlier (but also skip assessment for final test days)
        const shouldShowAssessment = needsAssessment && !isFinal;

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
            step: shouldShowAssessment ? 'assessment' : 'workout'
        });
        setAmrapValue('');
        setTestInput('');
        setTimeLeft(0);
        setWorkoutNotes('');
        // Reset exercise timer state
        setExerciseTimeLeft(0);
        setIsExerciseTimerRunning(false);
        setExerciseTimerStarted(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // Body metrics handlers
    const handleAddMetric = useCallback((metric) => {
        setBodyMetrics(prev => [...prev, metric]);
    }, []);

    const handleDeleteMetric = useCallback((id) => {
        setBodyMetrics(prev => prev.filter(m => m.id !== id));
    }, []);

    // Start workout with optional warmup
    const startWorkoutWithWarmup = useCallback((week, dayIndex, overrideKey = null) => {
        const exKey = overrideKey || activeExercise;
        const exercise = allExercises[exKey];

        // Check if user has warm-up enabled and hasn't warmed up recently (within last 30 min)
        const lastWarmup = localStorage.getItem(`${STORAGE_PREFIX}last_warmup`);
        const thirtyMinsAgo = Date.now() - (30 * 60 * 1000);
        const recentlyWarmedUp = lastWarmup && parseInt(lastWarmup) > thirtyMinsAgo;

        if (warmupEnabled && !recentlyWarmedUp && exercise) {
            // Store the workout to start after warmup
            setPendingWorkout({ week, dayIndex, overrideKey: exKey });
            setShowWarmup(true);
        } else {
            // Skip warmup, start workout directly
            startWorkout(week, dayIndex, overrideKey);
        }
    }, [activeExercise, allExercises, warmupEnabled, startWorkout]);

    // Handle warmup completion
    const handleWarmupComplete = useCallback(() => {
        // Record warmup time
        localStorage.setItem(`${STORAGE_PREFIX}last_warmup`, Date.now().toString());
        setShowWarmup(false);

        // Start the pending workout
        if (pendingWorkout) {
            startWorkout(pendingWorkout.week, pendingWorkout.dayIndex, pendingWorkout.overrideKey);
            setPendingWorkout(null);
        }
    }, [pendingWorkout, startWorkout]);

    // Handle warmup skip
    const handleWarmupSkip = useCallback(() => {
        setShowWarmup(false);

        // Start the pending workout
        if (pendingWorkout) {
            startWorkout(pendingWorkout.week, pendingWorkout.dayIndex, pendingWorkout.overrideKey);
            setPendingWorkout(null);
        }
    }, [pendingWorkout, startWorkout]);

    // Get recommended warmup based on exercise category
    const getRecommendedWarmupForExercise = useCallback((exerciseKey) => {
        const exercise = allExercises[exerciseKey];
        if (!exercise) return 'quick';
        return getRecommendedWarmup(exercise.category);
    }, [allExercises]);

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
        startWorkoutWithWarmup(stack[0].week, stack[0].dayIndex, stack[0].exerciseKey);
    }, [completedDays, allExercises, activeProgramKeys, startWorkoutWithWarmup, trainingPreferences]);

    // Express Mode: Quick workout with 2 exercises, 2 sets each, minimal rest
    const startExpressWorkout = useCallback(() => {
        const stack = getDailyStack(completedDays, allExercises, activeProgramKeys, trainingPreferences);
        if (stack.length === 0) return;

        // Get first exercise for express workout
        const firstExercise = stack[0];
        const exKey = firstExercise.exerciseKey;
        const exercise = allExercises[exKey];
        if (!exercise) return;

        // Get the workout data
        const exerciseWeeks = customPlans[exKey]?.weeks || exercise.weeks;
        const weekData = exerciseWeeks?.find(w => w.week === firstExercise.week);
        if (!weekData) return;

        const day = weekData.days[firstExercise.dayIndex];

        // Apply difficulty scaling
        const difficultyLevel = exerciseDifficulty[exKey] || 3;
        const multiplier = DIFFICULTY_LEVELS[difficultyLevel]?.multiplier || 1.0;

        // Express mode: only 2 sets (take first 2 reps from the day's plan)
        const expressReps = day.reps.slice(0, 2);
        const scaledReps = expressReps.map(r => Math.max(1, Math.round(r * multiplier)));

        // Queue the second exercise if available
        if (stack.length > 1) {
            setWorkoutQueue([stack[1]]);
        }

        // Start session with express mode enabled
        setCurrentSession({
            exerciseKey: exKey,
            exerciseName: exercise.name,
            week: firstExercise.week,
            dayIndex: firstExercise.dayIndex,
            setIndex: 0,
            rest: 20, // Express rest time
            baseReps: expressReps,
            reps: scaledReps,
            dayId: day.id,
            isFinal: false,
            color: exercise.color,
            unit: exercise.unit,
            difficulty: difficultyLevel,
            step: 'workout', // Skip readiness check for express mode
            expressMode: true
        });
        setAmrapValue('');
        setTestInput('');
        setTimeLeft(0);
        setWorkoutNotes('');
        setExerciseTimeLeft(0);
        setIsExerciseTimerRunning(false);
        setExerciseTimerStarted(false);
    }, [completedDays, allExercises, activeProgramKeys, trainingPreferences, customPlans, exerciseDifficulty]);

    const completeWorkout = (actualRepsPerSet = null, feedback = null) => {
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
            amrapReps,
            rpe: feedback?.rpe,
            difficulty: feedback?.difficulty
        };
        setSessionHistory(prev => [newHistoryItem, ...prev].slice(0, 50));
        setWorkoutNotes('');
        setCompletedDays(newCompletedDays);

        // Update sprint progression if exists
        const activeSprint = getActiveSprint(sprints, exerciseKey);
        if (activeSprint) {
            // Analyze performance
            const performance = analyzeWorkoutPerformance(actualReps, reps, amrapReps, feedback);

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

            // Phase 4: Plateau Detector
            const intervention = detectPlateau(updatedSprint);
            if (intervention) {
                // Ask user if they want to apply the intervention
                if (window.confirm(`${intervention.message}\n\n${intervention.suggestion}\n\nApply this change?`)) {
                    updatedSprint = intervention.apply(updatedSprint);
                }
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

        // If using default, skip confirmation and go straight to workout/readiness
        if (skipConfirmation) {
            // Sprint sessions go to readiness check, regular sessions go to workout
            const nextStep = currentSession.sprintId ? 'readiness' : 'workout';
            setCurrentSession(prev => ({ ...prev, reps: newReps, step: nextStep }));
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

    // ============ GYM MODE HANDLERS ============

    // Handle mode selection from ModeSelector
    const handleSelectMode = useCallback((mode) => {
        setCurrentMode(mode);
    }, []);

    // Handle gym onboarding completion
    const handleGymOnboardingComplete = useCallback((gymData) => {
        setGymProgram({
            programId: gymData.programId,
            currentWeek: gymData.currentWeek || 1,
            currentDay: gymData.currentDay || 1,
            startDate: gymData.startDate || new Date().toISOString(),
            experienceLevel: gymData.experienceLevel
        });
        setGymOnboardingComplete(true);
    }, []);

    // Start gym workout
    const handleStartGymWorkout = useCallback((workout) => {
        setCurrentGymSession(workout);
    }, []);

    // Complete gym workout
    const handleCompleteGymWorkout = useCallback((workoutData, completedSets) => {
        // Update gym history
        setGymHistory(prev => [workoutData, ...prev].slice(0, 100));

        // Update weights from completed sets
        const newWeights = { ...gymWeights };
        Object.entries(completedSets).forEach(([exerciseId, sets]) => {
            if (sets.length > 0) {
                // Use the weight from the last set
                newWeights[exerciseId] = sets[sets.length - 1].weight;
            }
        });
        setGymWeights(newWeights);

        // Update streak
        const today = new Date().toDateString();
        const lastWorkout = gymHistory[0];
        if (lastWorkout) {
            const lastDate = new Date(lastWorkout.date).toDateString();
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toDateString();

            if (lastDate === today) {
                // Already worked out today, no streak change
            } else if (lastDate === yesterdayStr) {
                // Consecutive day, increase streak
                setGymStreak(prev => prev + 1);
            } else {
                // Streak broken, reset to 1
                setGymStreak(1);
            }
        } else {
            // First workout
            setGymStreak(1);
        }

        // Advance program day
        if (gymProgram) {
            setGymProgram(prev => {
                const newDay = prev.currentDay + 1;
                // Assuming 7-day weeks, advance week when needed
                const daysPerWeek = 7;
                if (newDay > daysPerWeek) {
                    return {
                        ...prev,
                        currentWeek: prev.currentWeek + 1,
                        currentDay: 1
                    };
                }
                return { ...prev, currentDay: newDay };
            });
        }

        // Clear session
        setCurrentGymSession(null);
    }, [gymWeights, gymHistory, gymProgram]);

    // Change gym program
    const handleChangeGymProgram = useCallback((programId) => {
        setGymProgram({
            programId,
            currentWeek: 1,
            currentDay: 1,
            startDate: new Date().toISOString()
        });
    }, []);

    // Switch between home and gym mode
    const handleSwitchMode = useCallback(() => {
        // Clear the remembered mode
        localStorage.removeItem(`${STORAGE_PREFIX}remember_mode_today`);
        localStorage.removeItem(`${STORAGE_PREFIX}remember_mode_date`);
        setCurrentMode(null);
    }, []);

    // Calculate home mode streak (for display in mode selector)
    const homeStreak = useMemo(() => {
        const stats = calculateStats(completedDays, sessionHistory);
        return stats.currentStreak;
    }, [completedDays, sessionHistory]);

    // Get today's home workout name (for mode selector preview)
    const todayHomeWorkout = useMemo(() => {
        const stack = getDailyStack(completedDays, allExercises, activeProgramKeys, trainingPreferences);
        if (stack.length === 0) return 'Rest Day';
        return stack.slice(0, 2).map(s => allExercises[s.exerciseKey]?.name).filter(Boolean).join(', ');
    }, [completedDays, allExercises, activeProgramKeys, trainingPreferences]);

    // Get today's gym workout name (for mode selector preview)
    const todayGymWorkout = useMemo(() => {
        if (!gymProgram?.programId) return null;
        // This would need to look up the program schedule
        return gymProgram.programId ? 'Ready to train' : null;
    }, [gymProgram]);

    // ---------------- RENDER ----------------

    // Calculate stats for drawer
    const drawerStats = useMemo(() => {
        const stats = calculateStats(completedDays, sessionHistory);
        const unlockedBadges = getUnlockedBadges(stats);
        return {
            totalSessions: stats.totalSessions,
            currentStreak: stats.currentStreak,
            completedPlans: stats.completedPlans,
            unlockedBadges: unlockedBadges.length
        };
    }, [completedDays, sessionHistory]);

    // Determine if we should show mode selector
    // Show when: onboarded for home mode, no mode currently selected, and no active session
    const shouldShowModeSelector = onboardingComplete && currentMode === null && !currentSession && !currentGymSession;

    // Determine if we should show gym onboarding
    const shouldShowGymOnboarding = currentMode === 'gym' && !gymOnboardingComplete;

    // Determine if we're in gym mode (and onboarded)
    const isGymMode = currentMode === 'gym' && gymOnboardingComplete;

    return (
        <div className={`min-h-screen font-sans selection:bg-cyan-500/30 ${theme === 'light' ? 'bg-slate-100 text-slate-900' : 'bg-slate-950 text-slate-100'
            }`}>

            {/* Mode Selector - Show on app launch for onboarded users */}
            {shouldShowModeSelector && (
                <ModeSelector
                    onSelectMode={handleSelectMode}
                    homeStreak={homeStreak}
                    gymStreak={gymStreak}
                    todayHomeWorkout={todayHomeWorkout}
                    todayGymWorkout={todayGymWorkout}
                    theme={theme}
                />
            )}

            {/* Gym Onboarding - First time gym mode setup */}
            {shouldShowGymOnboarding && (
                <GymOnboarding
                    onComplete={handleGymOnboardingComplete}
                    theme={theme}
                />
            )}

            {/* Gym Workout Session - Fullscreen Overlay */}
            {currentGymSession && (
                <GymWorkoutSession
                    workout={currentGymSession}
                    gymWeights={gymWeights}
                    gymHistory={gymHistory}
                    onComplete={handleCompleteGymWorkout}
                    onExit={() => setCurrentGymSession(null)}
                    audioEnabled={audioEnabled}
                    theme={theme}
                />
            )}

            {/* Gym Dashboard - Main gym mode view */}
            {isGymMode && !currentGymSession && (
                <GymDashboard
                    gymProgram={gymProgram}
                    gymWeights={gymWeights}
                    gymHistory={gymHistory}
                    gymStreak={gymStreak}
                    onStartWorkout={handleStartGymWorkout}
                    onChangeProgram={handleChangeGymProgram}
                    onSwitchMode={handleSwitchMode}
                    theme={theme}
                />
            )}

            {/* Home Mode - Original app content */}
            {currentMode === 'home' && !shouldShowModeSelector && (
                <>
                    <Header
                        audioEnabled={audioEnabled}
                        setAudioEnabled={setAudioEnabled}
                        theme={theme}
                        setTheme={setTheme}
                        onSwitchMode={handleSwitchMode}
                        showSwitchMode={true}
                        currentMode="home"
                    />

                    <main className="max-w-6xl mx-auto p-4 md:p-8 pb-24">
                        {/* Home Tab - Dashboard */}
                        {activeTab === 'home' && (
                            <Dashboard
                        completedDays={completedDays}
                        sessionHistory={sessionHistory}
                        startStack={startStack}
                        startWorkout={startWorkoutWithWarmup}
                        startExpressWorkout={startExpressWorkout}
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
                        pendingSession={pendingSession}
                        onResumeSession={handleResumeSession}
                        onDiscardSession={handleDiscardSession}
                    />
                )}

                {/* Workout Tab - Quick Start */}
                {activeTab === 'workout' && (
                    <WorkoutQuickStart
                        completedDays={completedDays}
                        sessionHistory={sessionHistory}
                        allExercises={allExercises}
                        activeProgram={activeProgramKeys}
                        trainingPreferences={trainingPreferences}
                        startStack={startStack}
                        startExpressWorkout={startExpressWorkout}
                        startWorkout={startWorkoutWithWarmup}
                        theme={theme}
                    />
                )}

                    {/* Progress Tab */}
                    {activeTab === 'progress' && (
                        <Progress
                            completedDays={completedDays}
                            sessionHistory={sessionHistory}
                            allExercises={allExercises}
                            activeProgram={activeProgramKeys}
                            startWorkout={startWorkoutWithWarmup}
                            theme={theme}
                            sprints={sprints}
                            getExerciseSprintProgress={getExerciseSprintProgress}
                        />
                    )}
                </main>

                {/* Bottom Navigation - Hide during workout */}
                {!currentSession && onboardingComplete && (
                    <BottomNav
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        onMenuClick={() => setShowDrawer(true)}
                        theme={theme}
                    />
                )}

                {/* Side Drawer */}
                <SideDrawer
                    isOpen={showDrawer}
                    onClose={() => setShowDrawer(false)}
                    stats={drawerStats}
                    onShowCalendar={() => { setActiveTab('progress'); setShowDrawer(false); }}
                    onShowGuide={() => { setShowGuide(true); setShowDrawer(false); }}
                    onShowAchievements={() => { setActiveTab('progress'); setShowDrawer(false); }}
                    onShowTrainingSettings={() => { setShowTrainingSettings(true); setShowDrawer(false); }}
                    onShowBodyMetrics={() => { setShowBodyMetrics(true); setShowDrawer(false); }}
                    onShowAccessibility={() => { setShowAccessibility(true); setShowDrawer(false); }}
                    onExport={handleExport}
                    onExportCSV={handleExportCSV}
                    onImport={handleImport}
                    onFactoryReset={handleFactoryReset}
                    theme={theme}
                />
            </>
            )}

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
                        personalRecords={personalRecords}
                        setPersonalRecords={setPersonalRecords}
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

            {/* Body Metrics Modal */}
            {showBodyMetrics && (
                <BodyMetrics
                    metrics={bodyMetrics}
                    onAddMetric={handleAddMetric}
                    onDeleteMetric={handleDeleteMetric}
                    onClose={() => setShowBodyMetrics(false)}
                />
            )}

            {/* Accessibility Settings Modal */}
            {showAccessibility && (
                <AccessibilitySettings
                    onClose={() => setShowAccessibility(false)}
                />
            )}

            {/* Warmup Routine Modal */}
            {showWarmup && (
                <WarmupRoutine
                    onComplete={handleWarmupComplete}
                    onSkip={handleWarmupSkip}
                    recommendedRoutine={pendingWorkout ? getRecommendedWarmupForExercise(pendingWorkout.overrideKey) : 'quick'}
                    audioEnabled={audioEnabled}
                />
            )}

            {/* Guide Modal */}
            {showGuide && (
                <div className="fixed inset-0 z-50 bg-slate-950 overflow-y-auto">
                    <div className="min-h-screen">
                        <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-white">Exercise Guide</h2>
                            <button
                                onClick={() => setShowGuide(false)}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-white transition-colors"
                            >
                                Close
                            </button>
                        </div>
                        <div className="p-4">
                            <Guide
                                allExercises={allExercises}
                                activeProgram={activeProgramKeys}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Achievement Modal */}
            <MultiAchievementModal
                badges={newBadges}
                onClose={() => setNewBadges([])}
            />
        </div>
    );
};

export default App;
