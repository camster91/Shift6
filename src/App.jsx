import { useState, useEffect, useMemo } from 'react';
import { EXERCISE_PLANS, getRest, DIFFICULTY_LEVELS } from './data/exercises.jsx';
import { getDailyStack } from './utils/schedule';

// Components
import Header from './components/Layout/Header';
import Dashboard from './components/Views/Dashboard';
import WorkoutSession from './components/Views/WorkoutSession';
import AddExercise from './components/Views/AddExercise';

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

    // UI State for Add Exercise modal
    const [showAddExercise, setShowAddExercise] = useState(false);

    // Merge built-in and custom exercises
    const allExercises = useMemo(() => {
        return { ...EXERCISE_PLANS, ...customExercises };
    }, [customExercises]);

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
        localStorage.setItem(`${STORAGE_PREFIX}history`, JSON.stringify(sessionHistory));
    }, [sessionHistory]);

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

    // ---------------- WORKOUT LOGIC ----------------

    // Timer Tick
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

    const startWorkout = (week, dayIndex, overrideKey = null) => {
        const exKey = overrideKey || activeExercise;
        if (overrideKey) setActiveExercise(overrideKey);

        const exercise = allExercises[exKey];
        if (!exercise) return;

        const weekData = exercise.weeks.find(w => w.week === week);
        const day = weekData.days[dayIndex];
        const isFinal = day.isFinal || false;

        // Apply difficulty scaling
        const difficultyLevel = exerciseDifficulty[exKey] || 3;
        const multiplier = DIFFICULTY_LEVELS[difficultyLevel]?.multiplier || 1.0;
        const scaledReps = day.reps.map(r => Math.max(1, Math.round(r * multiplier)));

        setCurrentSession({
            exerciseKey: exKey,
            exerciseName: exercise.name,
            week,
            dayIndex,
            setIndex: 0,
            rest: restTimerOverride !== null ? restTimerOverride : getRest(week),
            baseReps: day.reps,
            reps: scaledReps,
            dayId: day.id,
            isFinal: isFinal,
            color: exercise.color,
            unit: exercise.unit,
            difficulty: difficultyLevel,
            step: isFinal ? 'workout' : ((completedDays[exKey]?.length || 0) === 0 ? 'assessment' : 'workout')
        });
        setAmrapValue('');
        setTestInput('');
        setTimeLeft(0);
        setWorkoutNotes('');
    };

    // Add custom exercise
    const handleAddExercise = (exercise) => {
        setCustomExercises(prev => ({
            ...prev,
            [exercise.key]: exercise
        }));
    };

    // Delete custom exercise
    const handleDeleteExercise = (key) => {
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
    };

    // Change difficulty for an exercise
    const handleSetDifficulty = (exerciseKey, level) => {
        setExerciseDifficulty(prev => ({
            ...prev,
            [exerciseKey]: level
        }));
    };

    const startStack = () => {
        const stack = getDailyStack(completedDays);
        if (stack.length === 0) return;

        setWorkoutQueue(stack.slice(1));
        startWorkout(stack[0].week, stack[0].dayIndex, stack[0].exerciseKey);
    };

    const completeWorkout = () => {
        if (!currentSession || isProcessing) return;
        setIsProcessing(true);

        const { exerciseKey, dayId, reps, unit } = currentSession;
        const totalVolume = reps.reduce((sum, r) => sum + r, 0) + (parseInt(amrapValue) || 0);

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
            notes: workoutNotes.trim() || undefined
        };
        setSessionHistory(prev => [newHistoryItem, ...prev].slice(0, 50));
        setWorkoutNotes('');
        setCompletedDays(newCompletedDays);

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
                    onShowAddExercise={() => setShowAddExercise(true)}
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
                    />
                </div>
            )}
        </div>
    );
};

export default App;
