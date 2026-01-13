import React, { useState, useEffect } from 'react';
import { EXERCISE_PLANS, getRest } from './data/exercises.jsx';
import { getDailyStack } from './utils/schedule';

// Components
import Header from './components/Layout/Header';
import BottomNav from './components/Layout/BottomNav';
import Dashboard from './components/Views/Dashboard';
import Plan from './components/Views/Plan';
import WorkoutSession from './components/Views/WorkoutSession';
import Guide from './components/Views/Guide';

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

    useEffect(() => {
        localStorage.setItem(`${STORAGE_PREFIX}progress`, JSON.stringify(completedDays));
    }, [completedDays]);

    useEffect(() => {
        localStorage.setItem(`${STORAGE_PREFIX}history`, JSON.stringify(sessionHistory));
    }, [sessionHistory]);

    // UI State
    const [activeTab, setActiveTabState] = useState(() => {
        const hash = window.location.hash.replace('#', '');
        return ['dashboard', 'plan', 'workout', 'guide'].includes(hash) ? hash : 'dashboard';
    });

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

    const setActiveTab = (tab, push = true) => {
        setActiveTabState(tab);
        if (push) {
            window.history.pushState({ tab }, '', `#${tab}`);
        }
        // Scroll to top when changing tabs
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    useEffect(() => {
        const handlePopState = (event) => {
            if (event.state && event.state.tab) {
                setActiveTabState(event.state.tab);
            } else {
                const hash = window.location.hash.replace('#', '');
                if (hash) setActiveTabState(hash);
            }
            // Scroll to top when navigating back/forward
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };

        window.addEventListener('popstate', handlePopState);

        // Initial state
        if (!window.location.hash) {
            window.history.replaceState({ tab: 'dashboard' }, '', '#dashboard');
        }

        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const [activeExercise, setActiveExercise] = useState('pushups');
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);

    // Workout State
    const [timeLeft, setTimeLeft] = useState(0);
    const [amrapValue, setAmrapValue] = useState('');
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [testInput, setTestInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // ---------------- HELPERS ----------------

    const getThemeClass = (part) => {
        const exercise = EXERCISE_PLANS[activeExercise];
        const colors = {
            blue: { bg: 'bg-blue-600', border: 'border-blue-200', text: 'text-blue-600', ring: 'ring-blue-500', hover: 'hover:border-blue-300', light: 'bg-blue-50' },
            orange: { bg: 'bg-orange-600', border: 'border-orange-200', text: 'text-orange-600', ring: 'ring-orange-500', hover: 'hover:border-orange-300', light: 'bg-orange-50' },
            emerald: { bg: 'bg-emerald-600', border: 'border-emerald-200', text: 'text-emerald-600', ring: 'ring-emerald-500', hover: 'hover:border-emerald-300', light: 'bg-emerald-50' },
            indigo: { bg: 'bg-indigo-600', border: 'border-indigo-200', text: 'text-indigo-600', ring: 'ring-indigo-500', hover: 'hover:border-indigo-300', light: 'bg-indigo-50' },
            rose: { bg: 'bg-rose-600', border: 'border-rose-200', text: 'text-rose-600', ring: 'ring-rose-500', hover: 'hover:border-rose-300', light: 'bg-rose-50' },
            cyan: { bg: 'bg-cyan-600', border: 'border-cyan-200', text: 'text-cyan-600', ring: 'ring-cyan-500', hover: 'hover:border-cyan-300', light: 'bg-cyan-50' },
            purple: { bg: 'bg-purple-600', border: 'border-purple-200', text: 'text-purple-600', ring: 'ring-purple-500', hover: 'hover:border-purple-300', light: 'bg-purple-50' },
            fuchsia: { bg: 'bg-fuchsia-600', border: 'border-fuchsia-200', text: 'text-fuchsia-600', ring: 'ring-fuchsia-500', hover: 'hover:border-fuchsia-300', light: 'bg-fuchsia-50' },
            amber: { bg: 'bg-amber-600', border: 'border-amber-200', text: 'text-amber-600', ring: 'ring-amber-500', hover: 'hover:border-amber-300', light: 'bg-amber-50' },
        };
        const config = colors[exercise.color] || colors.blue;
        return config[part] || '';
    };

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

        const exercise = EXERCISE_PLANS[exKey];
        const weekData = exercise.weeks.find(w => w.week === week);
        const day = weekData.days[dayIndex];
        const isFinal = day.isFinal || false;

        setCurrentSession({
            exerciseKey: exKey,
            exerciseName: exercise.name,
            week,
            dayIndex,
            setIndex: 0,
            rest: getRest(week),
            baseReps: day.reps, // Store original reps
            reps: day.reps,     // Will be modified by assessment
            dayId: day.id,
            isFinal: isFinal,
            color: exercise.color,
            unit: exercise.unit,
            // Check if assessment is needed (if no sessions completed for this exercise)
            step: isFinal ? 'workout' : ((completedDays[exKey]?.length || 0) === 0 ? 'assessment' : 'workout')
        });
        setActiveTab('workout');
        setAmrapValue('');
        setTestInput('');
        setTimeLeft(0);
    };

    const startStack = () => {
        const stack = getDailyStack(completedDays); // Need to pass completedDays now
        if (stack.length === 0) return;

        setWorkoutQueue(stack.slice(1));
        startWorkout(stack[0].week, stack[0].dayIndex, stack[0].exerciseKey);
    };

    const completeWorkout = () => {
        if (!currentSession || isProcessing) return;
        setIsProcessing(true);

        const { exerciseKey, dayId, reps, unit } = currentSession;

        // Calculate total volume for this session
        const totalVolume = reps.reduce((sum, r) => sum + r, 0) + (parseInt(amrapValue) || 0);

        // Update progress
        const newCompletedDays = {
            ...completedDays,
            [exerciseKey]: [...(completedDays[exerciseKey] || []), dayId]
        };
        newCompletedDays[exerciseKey] = [...new Set(newCompletedDays[exerciseKey])];

        // Update history
        const newHistoryItem = {
            exerciseKey,
            dayId,
            date: new Date().toISOString(),
            volume: totalVolume,
            unit
        };
        setSessionHistory(prev => [newHistoryItem, ...prev].slice(0, 50));

        setCompletedDays(newCompletedDays);

        // Queue Handling
        if (workoutQueue.length > 0) {
            const next = workoutQueue[0];
            const remaining = workoutQueue.slice(1);
            setWorkoutQueue(remaining);
            startWorkout(next.week, next.dayIndex, next.exerciseKey);
        } else {
            setCurrentSession(null);
            setActiveTab('dashboard');
        }

        setTimeout(() => setIsProcessing(false), 1000);
    };

    const applyCalibration = (factor) => {
        if (!currentSession) return;
        const newReps = currentSession.baseReps.map(r => Math.ceil(r * factor));
        setCurrentSession(prev => ({ ...prev, reps: newReps, step: 'workout' }));
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
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-32 font-sans selection:bg-slate-200">
            <Header
                activeTab={activeTab}
                activeExercise={activeExercise}
                setActiveExercise={setActiveExercise}
                isSelectorOpen={isSelectorOpen}
                setIsSelectorOpen={setIsSelectorOpen}
                getThemeClass={getThemeClass}
                setActiveTab={setActiveTab}
                onExport={handleExport}
                onImport={handleImport}
                onFactoryReset={handleFactoryReset}
            />

            <main className="max-w-6xl mx-auto p-4 md:p-8 mt-4">
                {activeTab === 'dashboard' && (
                    <Dashboard
                        completedDays={completedDays}
                        sessionHistory={sessionHistory}
                        setActiveExercise={setActiveExercise}
                        setActiveTab={setActiveTab}
                        startStack={startStack}
                        workoutQueue={workoutQueue}
                        setWorkoutQueue={setWorkoutQueue}
                    />
                )}

                {activeTab === 'plan' && (
                    <Plan
                        activeExercise={activeExercise}
                        completedDays={completedDays}
                        startWorkout={startWorkout}
                        getThemeClass={getThemeClass}
                    />
                )}

                {activeTab === 'workout' && (
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
                        getThemeClass={getThemeClass}
                        setActiveTab={setActiveTab}
                        exerciseName={EXERCISE_PLANS[activeExercise].name}
                    />
                )}

                {activeTab === 'guide' && (
                    <Guide getThemeClass={getThemeClass} />
                )}
            </main>

            <BottomNav
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                getThemeClass={getThemeClass}
            />
        </div>
    );
};

export default App;
