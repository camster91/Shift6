import React, { useState, useEffect } from 'react';
import {
    ChevronRight,
    Dumbbell,
    History,
    Info,
    CheckCircle2,
    Play,
    Timer,
    Trophy,
    LayoutDashboard,
    User,
    Zap,
    ArrowUp,
    Clock,
    ChevronDown,
    Activity,
    Footprints,
    ArrowDown,
    Plane
} from 'lucide-react';

// Persistent Storage Logic
const STORAGE_PREFIX = 'shift6_';

// Common rest logic: Weeks 1-3 = 60s, Weeks 4-6 = 90s
const getRest = (week) => (week <= 3 ? 60 : 90);

// Helper to format display values (seconds for plank, numbers for others)
const formatValue = (val, type) => {
    if (type === 'seconds') {
        const mins = Math.floor(val / 60);
        const secs = val % 60;
        if (mins > 0) return `${mins}:${secs.toString().padStart(2, '0')}s`;
        return `${secs}s`;
    }
    return val;
};

const EXERCISE_PLANS = {
    pushups: {
        name: "Push-Ups",
        icon: <Dumbbell size={20} />,
        color: "blue",
        unit: "reps",
        finalGoal: "100 Reps",
        weeks: [
            { week: 1, days: [{ id: "p11", reps: [3, 4, 3, 3, 5] }, { id: "p12", reps: [4, 5, 4, 4, 6] }, { id: "p13", reps: [5, 6, 5, 5, 8] }] },
            { week: 2, days: [{ id: "p21", reps: [6, 7, 6, 6, 9] }, { id: "p22", reps: [8, 10, 8, 8, 12] }, { id: "p23", reps: [10, 12, 10, 10, 15] }] },
            { week: 3, days: [{ id: "p31", reps: [12, 15, 12, 12, 18] }, { id: "p32", reps: [14, 18, 14, 14, 20] }, { id: "p33", reps: [16, 20, 16, 16, 25] }] },
            { week: 4, days: [{ id: "p41", reps: [18, 22, 18, 18, 28] }, { id: "p42", reps: [20, 25, 20, 20, 30] }, { id: "p43", reps: [25, 30, 25, 25, 35] }] },
            { week: 5, days: [{ id: "p51", reps: [30, 35, 30, 30, 40] }, { id: "p52", reps: [35, 40, 35, 35, 45] }, { id: "p53", reps: [40, 50, 40, 40, 55] }] },
            { week: 6, days: [{ id: "p61", reps: [45, 55, 45, 45, 60] }, { id: "p62", reps: [50, 60, 50, 50, 70] }, { id: "p63", reps: [100], isFinal: true }] },
        ]
    },
    squats: {
        name: "Squats",
        icon: <Zap size={20} />,
        color: "orange",
        unit: "reps",
        finalGoal: "200 Reps",
        weeks: [
            { week: 1, days: [{ id: "s11", reps: [15, 18, 15, 15, 20] }, { id: "s12", reps: [18, 22, 18, 18, 25] }, { id: "s13", reps: [20, 25, 20, 20, 30] }] },
            { week: 2, days: [{ id: "s21", reps: [25, 30, 25, 25, 35] }, { id: "s22", reps: [30, 35, 30, 30, 40] }, { id: "s23", reps: [35, 40, 35, 35, 50] }] },
            { week: 3, days: [{ id: "s31", reps: [40, 50, 40, 40, 60] }, { id: "s32", reps: [45, 55, 45, 45, 65] }, { id: "s33", reps: [50, 60, 50, 50, 70] }] },
            { week: 4, days: [{ id: "s41", reps: [55, 65, 55, 55, 80] }, { id: "s42", reps: [60, 75, 60, 60, 90] }, { id: "s43", reps: [65, 80, 65, 65, 100] }] },
            { week: 5, days: [{ id: "s51", reps: [75, 90, 75, 75, 110] }, { id: "s52", reps: [80, 100, 80, 80, 120] }, { id: "s53", reps: [90, 110, 90, 90, 130] }] },
            { week: 6, days: [{ id: "s61", reps: [100, 120, 100, 100, 140] }, { id: "s62", reps: [110, 130, 110, 110, 150] }, { id: "s63", reps: [200], isFinal: true }] },
        ]
    },
    glutebridge: {
        name: "SL Bridge",
        icon: <Activity size={20} />,
        color: "cyan",
        unit: "reps/leg",
        finalGoal: "50 Reps/Leg",
        weeks: [
            { week: 1, days: [{ id: "g11", reps: [5, 6, 5, 5, 8] }, { id: "g12", reps: [6, 8, 6, 6, 10] }, { id: "g13", reps: [8, 10, 8, 8, 12] }] },
            { week: 2, days: [{ id: "g21", reps: [10, 12, 10, 10, 15] }, { id: "g22", reps: [12, 15, 12, 12, 18] }, { id: "g23", reps: [15, 18, 15, 15, 20] }] },
            { week: 3, days: [{ id: "g31", reps: [18, 20, 18, 18, 25] }, { id: "g32", reps: [20, 22, 20, 20, 28] }, { id: "g33", reps: [22, 25, 22, 22, 30] }] },
            { week: 4, days: [{ id: "g41", reps: [25, 28, 25, 25, 35] }, { id: "g42", reps: [28, 30, 28, 28, 38] }, { id: "g43", reps: [30, 35, 30, 30, 40] }] },
            { week: 5, days: [{ id: "g51", reps: [35, 38, 35, 35, 45] }, { id: "g52", reps: [38, 40, 38, 38, 48] }, { id: "g53", reps: [40, 45, 40, 40, 50] }] },
            { week: 6, days: [{ id: "g61", reps: [45, 50, 45, 45, 55] }, { id: "g62", reps: [48, 55, 48, 48, 60] }, { id: "g63", reps: [50], isFinal: true }] },
        ]
    },
    vups: {
        name: "V-Ups",
        icon: <User size={20} />,
        color: "emerald",
        unit: "reps",
        finalGoal: "100 Reps",
        weeks: [
            { week: 1, days: [{ id: "v11", reps: [4, 5, 4, 4, 6] }, { id: "v12", reps: [5, 6, 5, 5, 8] }, { id: "v13", reps: [6, 8, 6, 6, 10] }] },
            { week: 2, days: [{ id: "v21", reps: [8, 10, 8, 8, 12] }, { id: "v22", reps: [10, 12, 10, 10, 15] }, { id: "v23", reps: [12, 15, 12, 12, 18] }] },
            { week: 3, days: [{ id: "v31", reps: [15, 18, 15, 15, 22] }, { id: "v32", reps: [18, 22, 18, 18, 25] }, { id: "v33", reps: [20, 25, 20, 20, 30] }] },
            { week: 4, days: [{ id: "v41", reps: [22, 28, 22, 22, 35] }, { id: "v42", reps: [25, 32, 25, 25, 40] }, { id: "v43", reps: [30, 35, 30, 30, 45] }] },
            { week: 5, days: [{ id: "v51", reps: [35, 40, 35, 35, 50] }, { id: "v52", reps: [40, 50, 40, 40, 60] }, { id: "v53", reps: [45, 55, 45, 45, 70] }] },
            { week: 6, days: [{ id: "v61", reps: [50, 60, 50, 50, 75] }, { id: "v62", reps: [60, 70, 60, 60, 85] }, { id: "v63", reps: [100], isFinal: true }] },
        ]
    },
    pullups: {
        name: "Pull-Ups",
        icon: <ArrowUp size={20} />,
        color: "indigo",
        unit: "reps",
        finalGoal: "20 Reps",
        weeks: [
            { week: 1, days: [{ id: "l11", reps: [1, 2, 1, 1, 2] }, { id: "l12", reps: [2, 2, 2, 2, 3] }, { id: "l13", reps: [2, 3, 2, 2, 4] }] },
            { week: 2, days: [{ id: "l21", reps: [3, 3, 3, 3, 4] }, { id: "l22", reps: [3, 4, 3, 3, 5] }, { id: "l23", reps: [4, 5, 4, 4, 6] }] },
            { week: 3, days: [{ id: "l31", reps: [4, 6, 4, 4, 7] }, { id: "l32", reps: [5, 6, 5, 5, 8] }, { id: "l33", reps: [5, 7, 5, 5, 9] }] },
            { week: 4, days: [{ id: "l41", reps: [6, 8, 6, 6, 10] }, { id: "l42", reps: [7, 9, 7, 7, 11] }, { id: "l43", reps: [8, 10, 8, 8, 12] }] },
            { week: 5, days: [{ id: "l51", reps: [9, 11, 9, 9, 13] }, { id: "l52", reps: [10, 12, 10, 10, 14] }, { id: "l53", reps: [11, 13, 11, 11, 15] }] },
            { week: 6, days: [{ id: "l61", reps: [12, 14, 12, 12, 16] }, { id: "l62", reps: [13, 15, 13, 13, 18] }, { id: "l63", reps: [20], isFinal: true }] },
        ]
    },
    plank: {
        name: "Plank",
        icon: <Clock size={20} />,
        color: "rose",
        unit: "seconds",
        finalGoal: "5 Mins",
        weeks: [
            { week: 1, days: [{ id: "k11", reps: [20, 30, 20, 20, 30] }, { id: "k12", reps: [25, 35, 25, 25, 40] }, { id: "k13", reps: [30, 40, 30, 30, 45] }] },
            { week: 2, days: [{ id: "k21", reps: [35, 45, 35, 35, 50] }, { id: "k22", reps: [40, 50, 40, 40, 60] }, { id: "k23", reps: [45, 60, 45, 45, 70] }] },
            { week: 3, days: [{ id: "k31", reps: [50, 70, 50, 50, 80] }, { id: "k32", reps: [60, 80, 60, 60, 90] }, { id: "k33", reps: [70, 90, 70, 70, 100] }] },
            { week: 4, days: [{ id: "k41", reps: [80, 100, 80, 80, 120] }, { id: "k42", reps: [90, 110, 90, 90, 130] }, { id: "k43", reps: [100, 120, 100, 100, 140] }] },
            { week: 5, days: [{ id: "k51", reps: [110, 130, 110, 110, 150] }, { id: "k52", reps: [120, 140, 120, 120, 160] }, { id: "k53", reps: [130, 150, 130, 130, 180] }] },
            { week: 6, days: [{ id: "k61", reps: [140, 160, 140, 140, 200] }, { id: "k62", reps: [150, 180, 150, 150, 220] }, { id: "k63", reps: [300], isFinal: true }] },
        ]
    },
    lunges: {
        name: "Lunges",
        icon: <Footprints size={20} />,
        color: "purple",
        unit: "reps/leg",
        finalGoal: "50 Reps/Leg",
        weeks: [
            { week: 1, days: [{ id: "u11", reps: [6, 8, 6, 6, 10] }, { id: "u12", reps: [8, 10, 8, 8, 12] }, { id: "u13", reps: [10, 12, 10, 10, 15] }] },
            { week: 2, days: [{ id: "u21", reps: [12, 14, 12, 12, 18] }, { id: "u22", reps: [14, 16, 14, 14, 20] }, { id: "u23", reps: [16, 18, 16, 16, 25] }] },
            { week: 3, days: [{ id: "u31", reps: [18, 22, 18, 18, 28] }, { id: "u32", reps: [20, 25, 20, 20, 30] }, { id: "u33", reps: [22, 28, 22, 22, 35] }] },
            { week: 4, days: [{ id: "u41", reps: [25, 30, 25, 25, 40] }, { id: "u42", reps: [28, 35, 28, 28, 45] }, { id: "u43", reps: [30, 40, 30, 30, 50] }] },
            { week: 5, days: [{ id: "u51", reps: [35, 45, 35, 35, 55] }, { id: "u52", reps: [40, 50, 40, 40, 60] }, { id: "u53", reps: [45, 55, 45, 45, 65] }] },
            { week: 6, days: [{ id: "u61", reps: [50, 60, 50, 50, 70] }, { id: "u62", reps: [55, 65, 55, 55, 80] }, { id: "u63", reps: [50], isFinal: true }] },
        ]
    },
    dips: {
        name: "Dips",
        icon: <ArrowDown size={20} />,
        color: "fuchsia",
        unit: "reps",
        finalGoal: "50 Reps",
        weeks: [
            { week: 1, days: [{ id: "d11", reps: [3, 4, 3, 3, 5] }, { id: "d12", reps: [4, 5, 4, 4, 6] }, { id: "d13", reps: [5, 6, 5, 5, 8] }] },
            { week: 2, days: [{ id: "d21", reps: [6, 8, 6, 6, 10] }, { id: "d22", reps: [8, 10, 8, 8, 12] }, { id: "d23", reps: [10, 12, 10, 10, 15] }] },
            { week: 3, days: [{ id: "d31", reps: [12, 14, 12, 12, 18] }, { id: "d32", reps: [14, 16, 14, 14, 20] }, { id: "d33", reps: [15, 18, 15, 15, 25] }] },
            { week: 4, days: [{ id: "d41", reps: [18, 20, 18, 18, 28] }, { id: "d42", reps: [20, 22, 20, 20, 30] }, { id: "d43", reps: [22, 25, 22, 22, 35] }] },
            { week: 5, days: [{ id: "d51", reps: [25, 30, 25, 25, 40] }, { id: "d52", reps: [28, 35, 28, 28, 45] }, { id: "d53", reps: [30, 38, 30, 30, 50] }] },
            { week: 6, days: [{ id: "d61", reps: [35, 40, 35, 35, 55] }, { id: "d62", reps: [40, 45, 40, 40, 60] }, { id: "d63", reps: [50], isFinal: true }] },
        ]
    },
    supermans: {
        name: "Supermans",
        icon: <Plane size={20} />,
        color: "amber",
        unit: "reps",
        finalGoal: "100 Reps",
        weeks: [
            { week: 1, days: [{ id: "m11", reps: [5, 6, 5, 5, 8] }, { id: "m12", reps: [6, 8, 6, 6, 10] }, { id: "m13", reps: [8, 10, 8, 8, 12] }] },
            { week: 2, days: [{ id: "m21", reps: [10, 12, 10, 10, 15] }, { id: "m22", reps: [12, 15, 12, 12, 18] }, { id: "m23", reps: [15, 18, 15, 15, 20] }] },
            { week: 3, days: [{ id: "m31", reps: [18, 20, 18, 18, 25] }, { id: "m32", reps: [20, 25, 20, 20, 30] }, { id: "m33", reps: [25, 30, 25, 25, 35] }] },
            { week: 4, days: [{ id: "m41", reps: [30, 35, 30, 30, 40] }, { id: "m42", reps: [35, 40, 35, 35, 45] }, { id: "m43", reps: [40, 50, 40, 40, 55] }] },
            { week: 5, days: [{ id: "m51", reps: [45, 55, 45, 45, 60] }, { id: "m52", reps: [50, 60, 50, 50, 70] }, { id: "m53", reps: [55, 65, 55, 55, 80] }] },
            { week: 6, days: [{ id: "m61", reps: [60, 70, 60, 60, 90] }, { id: "m62", reps: [70, 80, 70, 70, 100] }, { id: "m63", reps: [100], isFinal: true }] },
        ]
    }
};

const App = () => {
    // Persistent State (No Auth)
    const [completedDays, setCompletedDays] = useState(() => {
        const saved = localStorage.getItem(`${STORAGE_PREFIX}progress`);
        return saved ? JSON.parse(saved) : {};
    });

    // Save effect
    useEffect(() => {
        localStorage.setItem(`${STORAGE_PREFIX}progress`, JSON.stringify(completedDays));
    }, [completedDays]);

    const [activeTab, setActiveTab] = useState('plan');
    const [activeExercise, setActiveExercise] = useState('pushups');
    const [workoutQueue, setWorkoutQueue] = useState([]);
    const [currentSession, setCurrentSession] = useState(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [amrapValue, setAmrapValue] = useState('');
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(false);

    // Assessment state
    const [testInput, setTestInput] = useState('');



    const fetchProgress = async () => {
        setIsLoadingData(true);
        try {
            // Simulate network delay
            await new Promise(r => setTimeout(r, 300));

            const savedData = localStorage.getItem(`${STORAGE_PREFIX}progress`);
            if (savedData) {
                setCompletedDays(JSON.parse(savedData));
            } else {
                setCompletedDays({});
            }
        } catch (e) {
            console.error("Failed to fetch progress", e);
        } finally {
            setIsLoadingData(false);
        }
    };

    const getNextSessionForExercise = (exKey) => {
        const plan = EXERCISE_PLANS[exKey];
        if (!plan) return null;

        // Find first incomplete day
        for (let w = 0; w < plan.weeks.length; w++) {
            const week = plan.weeks[w];
            for (let d = 0; d < week.days.length; d++) {
                const day = week.days[d];
                // Check if completed
                const completed = completedDays[exKey]?.includes(day.id);
                if (!completed) {
                    return {
                        exerciseKey: exKey,
                        week: week.week,
                        dayIndex: d,
                        dayId: day.id,
                        name: plan.name
                    };
                }
            }
        }
        return null; // All done
    };

    const getScheduleFocus = () => {
        const day = new Date().getDay();
        if (day === 0) return 'Rest & Recovery';
        if (day % 2 === 1) return 'Upper Body Focus'; // Mon, Wed, Fri
        return 'Lower Body & Core'; // Tue, Thu, Sat
    };

    const getDailyStack = () => {
        const day = new Date().getDay();
        const upper = ['pushups', 'dips', 'pullups', 'supermans'];
        const lower = ['squats', 'lunges', 'glutebridge', 'vups', 'plank'];

        let targetKeys = [];
        if (day === 0) targetKeys = []; // Sunday rest
        else if (day % 2 === 1) targetKeys = upper; // Mon, Wed, Fri
        else targetKeys = lower; // Tue, Thu, Sat

        const stack = [];
        targetKeys.forEach(key => {
            const next = getNextSessionForExercise(key);
            if (next) stack.push(next);
        });
        return stack;
    };

    const startStack = () => {
        const stack = getDailyStack();
        if (stack.length === 0) return;

        setWorkoutQueue(stack.slice(1)); // Queue the rest
        startWorkout(stack[0].week, stack[0].dayIndex, stack[0].exerciseKey);
    };





    // Timer logic
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
            step: isFinal ? 'workout' : ((completedDays[exKey]?.length || 0) === 0 ? 'assessment' : 'workout') // Max Test only on first session
        });
        setActiveTab('workout');
        setAmrapValue('');
        setTestInput('');
        setTimeLeft(0);
    };

    const applyCalibration = (factor) => {
        if (!currentSession) return;

        // Apply factor to base reps, rounding to nearest integer
        const newReps = currentSession.baseReps.map(r => {
            const scaled = r * factor;
            return Math.ceil(scaled);
        });

        setCurrentSession(prev => ({
            ...prev,
            reps: newReps,
            step: 'workout'
        }));
    };

    const handleTestSubmit = (e) => {
        e.preventDefault();
        if (!testInput) return;

        const userMax = parseFloat(testInput);
        if (isNaN(userMax) || userMax <= 0) return;

        const planMaxRep = Math.max(...currentSession.baseReps);
        const estimatedPlanMax = planMaxRep / 0.7; // Heuristic

        const scalingFactor = userMax / estimatedPlanMax;

        // Clamp the scaling factor (0.5x to 2.5x range)
        const clampedFactor = Math.max(0.5, Math.min(scalingFactor, 2.5));

        applyCalibration(clampedFactor);
    };

    const completeWorkout = async () => {
        const { exerciseKey, dayId } = currentSession;

        // Optimistic update
        const newCompletedDays = {
            ...completedDays,
            [exerciseKey]: [...(completedDays[exerciseKey] || []), dayId]
        };
        setCompletedDays(newCompletedDays);

        // Queue Check
        if (workoutQueue.length > 0) {
            // Moving to next in stack
            const next = workoutQueue[0];
            const remaining = workoutQueue.slice(1);

            // Short delay/transition could go here, but for now instant switch
            setWorkoutQueue(remaining);
            startWorkout(next.week, next.dayIndex, next.exerciseKey);
        } else {
            setCurrentSession(null);
            setActiveTab('plan');
        }
    };

    // No Auth Check


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

    const getThemeClass = (part) => {
        const base = colorMap[exercise.color];
        const [bg, border, text, ring, hover] = base.split(' ');
        if (part === 'bg') return bg;
        if (part === 'border') return border;
        if (part === 'text') return text;
        if (part === 'ring') return ring;
        if (part === 'hover') return hover;
        return '';
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-12 font-sans selection:bg-slate-200">
            {/* Navigation Header */}
            <header className="bg-slate-900 text-white sticky top-0 z-20 shadow-md">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${getThemeClass('bg')}`}>
                            {React.cloneElement(exercise.icon, { className: "text-white" })}
                        </div>
                        <div className="relative">
                            <button
                                onClick={() => setIsSelectorOpen(!isSelectorOpen)}
                                className="flex items-center gap-1 font-bold text-lg hover:text-slate-300 transition-colors"
                            >
                                {exercise.name} <ChevronDown size={16} />
                            </button>
                            {isSelectorOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setIsSelectorOpen(false)} />
                                    <div className="absolute top-full left-0 mt-2 w-56 bg-white text-slate-900 rounded-xl shadow-xl border border-slate-200 overflow-hidden py-1 z-20">
                                        {Object.entries(EXERCISE_PLANS).map(([key, ex]) => (
                                            <button
                                                key={key}
                                                onClick={() => {
                                                    setActiveExercise(key);
                                                    setIsSelectorOpen(false);
                                                    setActiveTab('plan');
                                                }}
                                                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold hover:bg-slate-50 transition-colors ${activeExercise === key ? 'bg-slate-50 text-slate-900' : 'text-slate-500'}`}
                                            >
                                                <span className={key === activeExercise ? '' : 'grayscale opacity-70'}>
                                                    {React.cloneElement(ex.icon, { size: 18, color: "currentColor" })}
                                                </span>
                                                {ex.name}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <nav className="hidden sm:flex bg-slate-800 rounded-full p-1">
                            {['dashboard', 'plan', 'workout', 'guide'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase transition-all ${activeTab === tab ? getThemeClass('bg') + ' text-white' : 'text-slate-400 hover:text-white'}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>
            </header>

            {/* Mobile Nav */}
            <nav className="sm:hidden flex bg-slate-900 text-white border-t border-slate-800 p-2 fixed bottom-0 w-full z-20">
                {['dashboard', 'plan', 'workout', 'guide'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-3 rounded-xl flex flex-col items-center gap-1 transition-all ${activeTab === tab ? 'text-white' : 'text-slate-500'}`}
                    >
                        <span className="text-[10px] font-bold uppercase tracking-widest">{tab}</span>
                    </button>
                ))}
            </nav>

            <main className="max-w-4xl mx-auto p-4 md:p-6 mt-4 pb-24 sm:pb-6">

                {activeTab === 'dashboard' && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        {/* Hero Section */}
                        <div className="bg-slate-900 text-white p-8 rounded-3xl relative overflow-hidden shadow-2xl">
                            <div className="absolute top-0 right-0 p-8 opacity-5 transform translate-x-10 -translate-y-10">
                                <Trophy size={300} />
                            </div>
                            <div className="relative z-10">
                                <p className="text-blue-400 font-bold uppercase tracking-widest text-xs mb-2">Transformation Journey</p>
                                <h1 className="text-4xl md:text-5xl font-black mb-6">Total Body Mastery</h1>

                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(EXERCISE_PLANS).map(([key, ex]) => {
                                        const count = completedDays[key]?.length || 0;
                                        return (
                                            <div key={key} className="bg-slate-800/50 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700/50 flex items-center gap-2 text-xs font-bold text-slate-300">
                                                {ex.icon} <span>{count}/18</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Daily Stack Card (Moved from Plan) */}
                        <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group hover:shadow-2xl transition-all border border-slate-700">
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                <LayoutDashboard size={120} />
                            </div>
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-2">
                                    <h2 className="text-2xl font-black flex items-center gap-2">
                                        <Zap className="text-yellow-400" fill="currentColor" /> Daily Stack
                                    </h2>
                                    <span className="bg-slate-800 text-slate-300 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-slate-700">
                                        {getScheduleFocus()}
                                    </span>
                                </div>
                                <p className="text-slate-400 mb-6 max-w-md">
                                    {getDailyStack().length > 0
                                        ? "Your scheduled sessions for today. One click to run them back-to-back."
                                        : "No scheduled workouts for today. Enjoy your rest!"}
                                </p>

                                <div className="flex flex-wrap gap-2 mb-6">
                                    {getDailyStack().map((item, i) => (
                                        <div key={i} className="bg-slate-800 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-2 border border-slate-700">
                                            {EXERCISE_PLANS[item.exerciseKey].icon}
                                            {item.name} <span className="text-slate-500">W{item.week}D{item.dayIndex + 1}</span>
                                        </div>
                                    ))}
                                    {getDailyStack().length === 0 && (
                                        <div className="text-slate-500 text-sm font-bold flex items-center gap-2">
                                            <CheckCircle2 size={16} /> All caught up!
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={startStack}
                                    disabled={getDailyStack().length === 0}
                                    className="bg-white text-slate-900 px-6 py-3 rounded-xl font-black text-sm uppercase tracking-wide hover:bg-slate-200 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                                >
                                    Start Stack ({getDailyStack().length})
                                </button>
                            </div>
                        </div>

                        {/* Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.entries(EXERCISE_PLANS).map(([key, ex]) => {
                                const count = completedDays[key]?.length || 0;
                                const percent = Math.min(100, Math.round((count / 18) * 100));

                                return (
                                    <button
                                        key={key}
                                        onClick={() => {
                                            setActiveExercise(key);
                                            setActiveTab('plan');
                                        }}
                                        className="bg-white p-6 rounded-2xl border-2 border-slate-100 hover:border-slate-300 hover:scale-[1.02] active:scale-95 transition-all text-left group shadow-sm hover:shadow-md h-full flex flex-col justify-between"
                                    >
                                        <div className="w-full">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${key === 'pushups' ? 'bg-blue-100 text-blue-600' :
                                                    key === 'squats' ? 'bg-orange-100 text-orange-600' :
                                                        key === 'lunges' ? 'bg-purple-100 text-purple-600' :
                                                            key === 'dips' ? 'bg-fuchsia-100 text-fuchsia-600' :
                                                                key === 'supermans' ? 'bg-amber-100 text-amber-600' :
                                                                    key === 'glutebridge' ? 'bg-cyan-100 text-cyan-600' :
                                                                        key === 'vups' ? 'bg-emerald-100 text-emerald-600' :
                                                                            key === 'pullups' ? 'bg-indigo-100 text-indigo-600' :
                                                                                'bg-rose-100 text-rose-600'
                                                    }`}>
                                                    {React.cloneElement(ex.icon, { size: 24 })}
                                                </div>
                                                <span className="text-[10px] font-black uppercase bg-slate-100 text-slate-500 px-2 py-1 rounded-md">
                                                    {percent}% Ready
                                                </span>
                                            </div>

                                            <h3 className="text-xl font-black text-slate-900 mb-1">{ex.name}</h3>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-6">Goal: {ex.finalGoal}</p>
                                        </div>

                                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ${key === 'pushups' ? 'bg-blue-500' :
                                                    key === 'squats' ? 'bg-orange-500' :
                                                        key === 'lunges' ? 'bg-purple-500' :
                                                            key === 'dips' ? 'bg-fuchsia-500' :
                                                                key === 'supermans' ? 'bg-amber-500' :
                                                                    key === 'glutebridge' ? 'bg-cyan-500' :
                                                                        key === 'vups' ? 'bg-emerald-500' :
                                                                            key === 'pullups' ? 'bg-indigo-500' :
                                                                                'bg-rose-500'
                                                    }`}
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {activeTab === 'plan' && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        {/* Daily Stack Card OLD */}{false && (
                            <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group hover:shadow-2xl transition-all">
                                <div className="absolute top-0 right-0 p-8 opacity-10">
                                    <LayoutDashboard size={120} />
                                </div>
                                <div className="relative z-10">
                                    <h2 className="text-2xl font-black mb-2 flex items-center gap-2">
                                        <Zap className="text-yellow-400" fill="currentColor" /> Daily Stack
                                    </h2>
                                    <p className="text-slate-400 mb-6 max-w-md">
                                        Your personal playlist for today. One click to run all your next scheduled sessions back-to-back.
                                    </p>

                                    <div className="flex flex-wrap gap-2 mb-6">
                                        {getDailyStack().map((item, i) => (
                                            <div key={i} className="bg-slate-800 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-2 border border-slate-700">
                                                {EXERCISE_PLANS[item.exerciseKey].icon}
                                                {item.name} <span className="text-slate-500">W{item.week}D{item.dayIndex + 1}</span>
                                            </div>
                                        ))}
                                        {getDailyStack().length === 0 && (
                                            <div className="text-slate-500 text-sm font-bold flex items-center gap-2">
                                                <CheckCircle2 size={16} /> All caught up!
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={startStack}
                                        disabled={getDailyStack().length === 0}
                                        className="bg-white text-slate-900 px-6 py-3 rounded-xl font-black text-sm uppercase tracking-wide hover:bg-slate-200 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                                    >
                                        Start Stack ({getDailyStack().length})
                                    </button>
                                </div>
                            </div>
                        )} {/* Stats Card */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <p className="text-slate-400 text-xs font-bold uppercase mb-1">Total Progress</p>
                                <div className="flex items-end gap-2">
                                    <span className="text-3xl font-black">{completedDays[activeExercise]?.length || 0}</span>
                                    <span className="text-slate-400 font-bold mb-1">/ 18 Days</span>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <p className="text-slate-400 text-xs font-bold uppercase mb-1">Goal</p>
                                <div className="flex items-end gap-2">
                                    <span className={`text-3xl font-black ${getThemeClass('text')}`}>{exercise.finalGoal}</span>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                                <div>
                                    <p className="text-slate-400 text-xs font-bold uppercase mb-1">Next Session</p>
                                    <p className="font-bold">Week {Math.min(6, Math.floor((completedDays[activeExercise]?.length || 0) / 3) + 1)}</p>
                                </div>
                                <div className={`p-2 rounded-full ${getThemeClass('bg')} bg-opacity-10 ${getThemeClass('text')}`}>
                                    <History size={20} />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <LayoutDashboard className={getThemeClass('text')} size={20} />
                                Training Curriculum
                            </h2>
                            <div className="space-y-10">
                                {exercise.weeks.map((weekData) => (
                                    <div key={weekData.week} className="relative">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white ${getThemeClass('bg')}`}>
                                                {weekData.week}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold">Week {weekData.week}</h3>
                                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                                                    Rest: {getRest(weekData.week)}s Between Sets
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 ml-5 pl-8 border-l-2 border-slate-100">
                                            {weekData.days.map((day, idx) => {
                                                const isCompleted = completedDays[activeExercise]?.includes(day.id);
                                                return (
                                                    <button
                                                        key={day.id}
                                                        onClick={() => startWorkout(weekData.week, idx)}
                                                        className={`group p-4 rounded-xl border text-left transition-all hover:shadow-md ${isCompleted
                                                            ? 'bg-green-50 border-green-200'
                                                            : `bg-white border-slate-200 ${getThemeClass('hover')}`
                                                            }`}
                                                    >
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className="text-[10px] font-black text-slate-400">SESSION {idx + 1}</span>
                                                            {isCompleted && <CheckCircle2 size={14} className="text-green-600" />}
                                                        </div>
                                                        <div className="text-sm font-mono font-bold text-slate-700">
                                                            {day.reps.map(r => formatValue(r, exercise.unit)).join(', ')}
                                                            {day.reps.length > 1 && !day.isFinal ? '+' : ''}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'workout' && (
                    <div className="animate-in slide-in-from-bottom-4 duration-500">
                        {!currentSession ? (
                            <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-sm">
                                <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Play className="text-slate-300 ml-1" size={40} />
                                </div>
                                <h2 className="text-2xl font-black mb-3">Ready to push?</h2>
                                <p className="text-slate-500 mb-8 max-w-xs mx-auto">
                                    Go to the plan tab and select your next {exercise.name} session.
                                </p>
                                <button
                                    onClick={() => setActiveTab('plan')}
                                    className={`text-white px-8 py-3 rounded-full font-bold shadow-lg transition-transform active:scale-95 ${getThemeClass('bg')}`}
                                >
                                    Pick a Workout
                                </button>
                            </div>
                        ) : currentSession.step === 'assessment' ? (
                            // ---------------- ASSESSMENT SCREEN (FIRST TIME ONLY) ----------------
                            <div className="space-y-6">
                                <div className="bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-200 animate-in zoom-in duration-300">
                                    <div className="bg-slate-900 text-white p-8">
                                        <div className="flex items-center gap-2 text-blue-400 text-xs font-black uppercase tracking-widest mb-1">
                                            First Session <ChevronRight size={12} /> {currentSession.exerciseName}
                                        </div>
                                        <h2 className="text-3xl font-black">Baseline Assessment</h2>
                                    </div>
                                    <div className="p-8 md:p-12 space-y-8">

                                        {/* Warning Alert */}
                                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-900">
                                            <AlertCircle className="shrink-0 mt-0.5" size={20} />
                                            <div>
                                                <p className="font-bold text-sm mb-1">Fresh Muscles Required</p>
                                                <p className="text-xs leading-relaxed opacity-90 font-medium">
                                                    For accurate results, please ensure you have had a <span className="underline">10-15 minute break</span> from any other exercise before attempting this test so you don't ruin your numbers.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="text-center space-y-4">
                                            <Trophy className={`mx-auto ${getThemeClass('text')}`} size={48} />
                                            <p className="text-lg font-bold text-slate-700">
                                                Perform one set of {currentSession.exerciseName} to FAILURE with perfect form.
                                            </p>
                                        </div>

                                        <form onSubmit={handleTestSubmit} className="max-w-md mx-auto space-y-4">
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    value={testInput}
                                                    onChange={(e) => setTestInput(e.target.value)}
                                                    placeholder={currentSession.unit === 'seconds' ? 'Max seconds' : 'Max reps'}
                                                    autoFocus
                                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-xl font-black text-center focus:outline-none focus:ring-4 focus:ring-slate-100 transition-all"
                                                />
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={!testInput}
                                                className={`w-full py-4 rounded-xl font-black text-white text-lg shadow-lg active:scale-95 transition-all ${getThemeClass('bg')} disabled:opacity-50 disabled:grayscale`}
                                            >
                                                Calculated Start
                                            </button>
                                        </form>

                                        <div className="pt-4 border-t border-slate-100 text-center">
                                            <button
                                                onClick={() => applyCalibration(1)}
                                                className="text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors uppercase tracking-wide"
                                            >
                                                Skip (Start Standard Level)
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // ---------------- WORKOUT SCREEN ----------------
                            <div className="space-y-6">
                                <div className="bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-200">
                                    <div className="bg-slate-900 text-white p-8">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <div className="flex items-center gap-2 text-slate-400 text-xs font-black uppercase tracking-widest mb-1">
                                                    {currentSession.exerciseName} <ChevronRight size={12} /> Week {currentSession.week}
                                                </div>
                                                <h2 className="text-3xl font-black">Day {currentSession.dayIndex + 1}</h2>
                                            </div>
                                            <button onClick={() => setCurrentSession(null)} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white">✕</button>
                                        </div>
                                    </div>

                                    <div className="p-8 md:p-12">
                                        {!currentSession.isFinal && (
                                            <div className="flex justify-between gap-3 mb-12">
                                                {currentSession.reps.map((_, i) => (
                                                    <div
                                                        key={i}
                                                        className={`h-2 flex-1 rounded-full transition-all duration-500 ${i < currentSession.setIndex ? 'bg-green-500' :
                                                            i === currentSession.setIndex ? `${getThemeClass('bg')} scale-y-150` : 'bg-slate-100'
                                                            }`}
                                                    />
                                                ))}
                                            </div>
                                        )}

                                        <div className="text-center py-4">
                                            {currentSession.isFinal ? (
                                                <div className="space-y-6">
                                                    <Trophy className="mx-auto text-yellow-500 animate-bounce" size={80} />
                                                    <h3 className="text-6xl font-black text-slate-900">
                                                        {formatValue(currentSession.reps[0], currentSession.unit)}
                                                    </h3>
                                                    <p className="text-slate-500 font-bold uppercase tracking-widest">FINAL BOSS GOAL</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                                        {currentSession.setIndex === currentSession.reps.length - 1 ? 'MAX EFFORT SET' : `TARGET`}
                                                    </p>
                                                    <div className="relative inline-block">
                                                        <span className="text-8xl font-black text-slate-900 tabular-nums tracking-tighter">
                                                            {formatValue(currentSession.reps[currentSession.setIndex], currentSession.unit)}
                                                        </span>
                                                        {currentSession.setIndex === currentSession.reps.length - 1 && (
                                                            <span className={`absolute top-0 -right-8 text-5xl font-black ${getThemeClass('text')}`}>+</span>
                                                        )}
                                                    </div>
                                                    <p className="text-slate-400 font-bold uppercase tracking-widest pt-4">SET {currentSession.setIndex + 1} OF 5</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-12 flex flex-col items-center">
                                            {timeLeft > 0 ? (
                                                <div className="bg-slate-900 w-full max-w-sm p-8 rounded-3xl text-center shadow-2xl relative overflow-hidden">
                                                    <div className={`absolute top-0 left-0 h-1 ${getThemeClass('bg')} transition-all duration-1000`} style={{ width: `${(timeLeft / currentSession.rest) * 100}%` }} />
                                                    <div className="flex items-center justify-center gap-2 text-slate-400 mb-2">
                                                        <Timer size={18} />
                                                        <span className="font-black uppercase text-[10px] tracking-widest">Resting</span>
                                                    </div>
                                                    <div className="text-6xl font-mono font-black text-white tabular-nums">
                                                        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                                                    </div>
                                                    <button
                                                        onClick={() => setTimeLeft(0)}
                                                        className="mt-6 text-xs font-black text-slate-400 hover:text-white uppercase tracking-widest border border-slate-700 px-4 py-2 rounded-full"
                                                    >
                                                        Skip Timer
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="w-full max-w-sm space-y-4">
                                                    {currentSession.setIndex === currentSession.reps.length - 1 ? (
                                                        <div className="space-y-4">
                                                            <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-200">
                                                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 text-center">
                                                                    {currentSession.unit === 'seconds' ? 'Seconds Held' : 'Reps Completed'}
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    value={amrapValue}
                                                                    onChange={(e) => setAmrapValue(e.target.value)}
                                                                    className="w-full bg-transparent text-5xl font-black text-center focus:outline-none"
                                                                    autoFocus
                                                                    placeholder={currentSession.unit === 'seconds' ? '0' : '0'}
                                                                />
                                                            </div>
                                                            <button
                                                                onClick={completeWorkout}
                                                                className={`w-full text-white py-5 rounded-2xl font-black text-xl shadow-xl hover:brightness-110 transition-all active:scale-95 ${getThemeClass('bg')}`}
                                                            >
                                                                FINISH WORKOUT
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => {
                                                                setCurrentSession(prev => ({ ...prev, setIndex: prev.setIndex + 1 }));
                                                                setTimeLeft(currentSession.rest);
                                                                setIsTimerRunning(true);
                                                            }}
                                                            className={`w-full text-white py-6 rounded-2xl font-black text-2xl shadow-xl hover:brightness-110 transition-all active:scale-95 flex items-center justify-center gap-3 ${getThemeClass('bg')}`}
                                                        >
                                                            SET DONE <ChevronRight strokeWidth={4} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-2xl border border-slate-200 flex gap-4 items-center">
                                    <div className={`p-3 rounded-xl ${getThemeClass('bg')} bg-opacity-10 ${getThemeClass('text')}`}>
                                        <Info size={24} />
                                    </div>
                                    <p className="text-sm font-medium text-slate-600">
                                        <strong>Phase Tip:</strong> {
                                            activeExercise === 'pushups' ? "Keep elbows at 45 degrees." :
                                                activeExercise === 'squats' ? "Weight in heels, chest up." :
                                                    activeExercise === 'pullups' ? "Full extension at the bottom." :
                                                        activeExercise === 'plank' ? "Squeeze glutes to protect lower back." :
                                                            activeExercise === 'vups' ? "Keep legs straight and reach for your toes." :
                                                                activeExercise === 'glutebridge' ? "Drive through your heel, keep hips level." :
                                                                    activeExercise === 'lunges' ? "Keep torso upright, knee shouldn't touch ground." :
                                                                        activeExercise === 'dips' ? "Keep elbows tucked, lean forward slightly." :
                                                                            activeExercise === 'supermans' ? "Lift chest and thighs simultaneously, pause at top." :
                                                                                "Exhale on the way up."
                                        }
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'guide' && (
                    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
                        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                            <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
                                <Info className="text-blue-600" size={24} />
                                Methodology
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <section className="space-y-6">
                                    <h3 className="font-black text-slate-900 border-b-2 border-slate-100 pb-2 uppercase tracking-widest text-xs">The Rules</h3>
                                    <div className="space-y-4">
                                        {[
                                            { t: "Frequency", d: "3 days per week per exercise. Ideally: Mon/Wed/Fri for all, or alternate days." },
                                            { t: "The Rule of Five", d: "5 sets per session. The last set is always AMRAP (As Many Reps/Seconds As Possible)." },
                                            { t: "The Fail Rule", d: "If you fail a day, rest 48 hours and retry. Do not advance until completed." }
                                        ].map((item, i) => (
                                            <div key={i} className="flex gap-4">
                                                <span className={`font-black text-xl ${getThemeClass('text')}`}>0{i + 1}</span>
                                                <div>
                                                    <p className="font-bold text-slate-800 text-sm mb-1">{item.t}</p>
                                                    <p className="text-slate-500 text-xs leading-relaxed">{item.d}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <section className="space-y-6">
                                    <h3 className="font-black text-slate-900 border-b-2 border-slate-100 pb-2 uppercase tracking-widest text-xs">Form Cues</h3>
                                    <div className="space-y-4">
                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-2">
                                                <Clock size={16} className="text-rose-600" /> Plank Tips
                                            </div>
                                            <p className="text-xs text-slate-600 leading-relaxed">
                                                Don't just hang out there. Actively pull your elbows towards your toes (without moving them) to create massive core tension.
                                            </p>
                                        </div>
                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-2">
                                                <ArrowUp size={16} className="text-indigo-600" /> Pull-Up Tips
                                            </div>
                                            <p className="text-xs text-slate-600 leading-relaxed">
                                                Imagine driving your elbows down into your back pockets. If you can't do one yet, do "negatives" (jump up, lower slowly).
                                            </p>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default App;
