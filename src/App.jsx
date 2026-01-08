import React, { useState, useEffect } from 'react';
import { EXERCISE_PLANS, getRest } from './data/exercises';
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

    useEffect(() => {
        localStorage.setItem(`${STORAGE_PREFIX}progress`, JSON.stringify(completedDays));
    }, [completedDays]);

    // UI State
    const [activeTab, setActiveTab] = useState('dashboard'); // Default to Dashboard (User Request)
    const [activeExercise, setActiveExercise] = useState('pushups');
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);

    // Workout State
    const [workoutQueue, setWorkoutQueue] = useState([]);
    const [currentSession, setCurrentSession] = useState(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [amrapValue, setAmrapValue] = useState('');
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [testInput, setTestInput] = useState('');

    // ---------------- HELPERS ----------------

    const getThemeClass = (part) => {
        const exercise = EXERCISE_PLANS[activeExercise];
        const colorMap = {
            blue: 'bg-blue-600 border-blue-200 text-blue-600 ring-blue-500 hover:border-blue-300',
            orange: 'bg-orange-600 border-orange-200 text-orange-600 ring-orange-500 hover:border-orange-300',
            emerald: 'bg-emerald-600 border-emerald-200 text-emerald-600 ring-emerald-500 hover:border-emerald-300',
            indigo: 'bg-indigo-600 border-indigo-200 text-indigo-600 ring-indigo-500 hover:border-indigo-300',
            rose: 'bg-rose-600 border-rose-200 text-rose-600 ring-rose-500 hover:border-rose-300',
            cyan: 'bg-cyan-600 border-cyan-200 text-cyan-600 ring-cyan-500 hover:border-cyan-300',
            purple: 'bg-purple-600 border-purple-200 text-purple-600 ring-purple-500 hover:border-purple-300',
            fuchsia: 'bg-fuchsia-600 border-fuchsia-200 text-fuchsia-600 ring-fuchsia-500 hover:border-fuchsia-300',
            amber: 'bg-amber-600 border-amber-200 text-amber-600 ring-amber-500 hover:border-amber-300',
        };
        const base = colorMap[exercise.color];
        if (!base) return '';
        const [bg, border, text, ring, hover] = base.split(' ');
        if (part === 'bg') return bg;
        if (part === 'border') return border;
        if (part === 'text') return text;
        if (part === 'ring') return ring;
        if (part === 'hover') return hover;
        return '';
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
        if (!currentSession) return;
        const { exerciseKey, dayId } = currentSession;

        // Update progress
        const newCompletedDays = {
            ...completedDays,
            [exerciseKey]: [...(completedDays[exerciseKey] || []), dayId] // Handle duplicate safety? Set? Array is fine for now
        };
        // Deduplicate just in case
        newCompletedDays[exerciseKey] = [...new Set(newCompletedDays[exerciseKey])];

        setCompletedDays(newCompletedDays);

        // Queue Handling
        if (workoutQueue.length > 0) {
            const next = workoutQueue[0];
            const remaining = workoutQueue.slice(1);
            setWorkoutQueue(remaining);
            startWorkout(next.week, next.dayIndex, next.exerciseKey);
        } else {
            setCurrentSession(null);
            setActiveTab('plan'); // Or dashboard? User asked for dashboard home, but after workout plan is usually good. Stick to plan or dashboard. Let's go Dashboard to see updated daily stack.
            setActiveTab('dashboard');
        }
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
                alert('Data restored successfully! Please refresh if changes are not immediately visible.');
                // Force reload or let state update handle it
            } catch (err) {
                console.error("Import failed", err);
                alert('Failed to import data. Invalid file format.');
            }
        };
        reader.readAsText(file);
    };

    // ---------------- RENDER ----------------

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 font-sans selection:bg-slate-200">
            <Header
                activeExercise={activeExercise}
                setActiveExercise={setActiveExercise}
                isSelectorOpen={isSelectorOpen}
                setIsSelectorOpen={setIsSelectorOpen}
                getThemeClass={getThemeClass}
                setActiveTab={setActiveTab}
                onExport={handleExport}
                onImport={handleImport}
            />

            <main className="max-w-4xl mx-auto p-4 md:p-6 mt-4">
                {activeTab === 'dashboard' && (
                    <Dashboard
                        completedDays={completedDays}
                        setActiveExercise={setActiveExercise}
                        setActiveTab={setActiveTab}
                        startStack={startStack}
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
