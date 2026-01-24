import React, { useState } from 'react';
import { ChevronRight, ChevronUp, ChevronDown, Info, Share2, Check, X, Zap, Youtube, Play, Pause, Square, Dumbbell, Plus, Minus, Battery, BatteryLow, BatteryCharging, TrendingUp, TrendingDown } from 'lucide-react';

// Color classes for exercise themes
const colorClasses = {
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', solid: 'bg-blue-500' },
    orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', solid: 'bg-orange-500' },
    cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', solid: 'bg-cyan-500' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', solid: 'bg-emerald-500' },
    yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', solid: 'bg-yellow-500' },
    teal: { bg: 'bg-teal-500/10', border: 'border-teal-500/30', text: 'text-teal-400', solid: 'bg-teal-500' },
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', solid: 'bg-purple-500' },
    pink: { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-400', solid: 'bg-pink-500' },
    indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400', solid: 'bg-indigo-500' },
};
import { playBeep, playStart, playSuccess } from '../../utils/audio';
import { vibrate, copyToClipboard } from '../../utils/device';
import { EXERCISE_PLANS, EXERCISE_ACHIEVEMENTS } from '../../data/exercises.jsx';
import { EXERCISE_LIBRARY } from '../../data/exerciseLibrary.js';
import { calculateStats, getUnlockedBadges, BADGES } from '../../utils/gamification';
import Confetti from '../Visuals/Confetti';

const VideoModal = ({ exercise, onClose }) => {
    if (!exercise) return null

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                    <h3 className="text-lg font-bold text-white">{exercise.name} - Form Guide</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>
                <div className="aspect-video bg-black">
                    <iframe
                        src={`https://www.youtube.com/embed/${exercise.youtubeId}?rel=0`}
                        title={`${exercise.name} form guide`}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                </div>
                <div className="p-4 space-y-3">
                    <p className="text-sm text-slate-300">{exercise.instructions || exercise.cue}</p>
                    {exercise.tips && (
                        <div className="flex flex-wrap gap-2">
                            {exercise.tips.map((tip, i) => (
                                <span key={i} className="text-xs px-2 py-1 bg-slate-800 border border-slate-700 rounded-full text-slate-400">
                                    {tip}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

const ProgressRing = ({ progress, size = 200, stroke = 8, color = "currentColor" }) => {
    const radius = (size / 2) - (stroke * 2);
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress * circumference);

    return (
        <div className="relative flex items-center justify-center">
            <svg width={size} height={size} className="transform -rotate-90">
                <circle
                    stroke="rgba(30,41,59,0.3)"
                    strokeWidth={stroke}
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                <circle
                    stroke={color}
                    strokeWidth={stroke}
                    strokeDasharray={circumference}
                    style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 1s linear' }}
                    strokeLinecap="round"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                    filter="drop-shadow(0 0 8px rgba(6,182,212,0.5))"
                />
            </svg>
        </div>
    );
};

const WorkoutSession = ({
    currentSession,
    setCurrentSession,
    timeLeft,
    setTimeLeft,
    isTimerRunning,
    setIsTimerRunning,
    amrapValue,
    setAmrapValue,
    testInput,
    setTestInput,
    handleTestSubmit,
    applyCalibration,
    completeWorkout,
    audioEnabled = true,
    workoutNotes,
    setWorkoutNotes,
    exerciseTimeLeft,
    setExerciseTimeLeft,
    isExerciseTimerRunning,
    setIsExerciseTimerRunning,
    exerciseTimerStarted,
    setExerciseTimerStarted,
    completedDays = {},
    sessionHistory = [],
    gymWeights = {},
    setGymWeights,
    allExercises = {}
}) => {
    const [copied, setCopied] = useState(false);
    const [showVideo, setShowVideo] = useState(false);
    const [showTips, setShowTips] = useState(false);
    const [showAchievements, setShowAchievements] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    // Gym workout state - track reps completed for each set
    const [gymSetReps, setGymSetReps] = useState([]);
    const [currentGymReps, setCurrentGymReps] = useState(0);

    // Check if this is a gym exercise
    const exerciseData = currentSession ? (allExercises[currentSession.exerciseKey] || EXERCISE_PLANS[currentSession.exerciseKey] || EXERCISE_LIBRARY[currentSession.exerciseKey]) : null;
    const isGymExercise = exerciseData?.progressionType === 'gym';
    const gymConfig = exerciseData?.gymConfig;

    // Get current weight for gym exercise
    const currentWeight = currentSession ? (gymWeights[currentSession.exerciseKey] || 0) : 0;

    // Calculate stats and unlocked badges
    const stats = calculateStats(completedDays, sessionHistory);
    const unlockedBadges = getUnlockedBadges(stats);

    // Get exercise-specific achievements progress
    const exerciseCompletedCount = currentSession ? (completedDays[currentSession.exerciseKey]?.length || 0) : 0;

    // Look up exercise from both EXERCISE_PLANS and EXERCISE_LIBRARY
    const currentExercise = currentSession
        ? (EXERCISE_PLANS[currentSession.exerciseKey] || EXERCISE_LIBRARY[currentSession.exerciseKey])
        : null;

    // Audio/Vibrate Effect for Rest Timer
    React.useEffect(() => {
        if (isTimerRunning && timeLeft > 0 && timeLeft <= 3 && audioEnabled) playBeep();
        if (isTimerRunning && timeLeft === 0) {
            if (audioEnabled) playStart();
            vibrate([100, 50, 100]);
        }
    }, [timeLeft, isTimerRunning, audioEnabled]);

    // Audio/Vibrate Effect for Exercise Countdown Timer (hold exercises)
    React.useEffect(() => {
        if (isExerciseTimerRunning && exerciseTimeLeft > 0 && exerciseTimeLeft <= 3 && audioEnabled) {
            playBeep();
        }
        if (exerciseTimerStarted && exerciseTimeLeft === 0 && !isExerciseTimerRunning) {
            // Timer completed - play success sound
            if (audioEnabled) playSuccess();
            vibrate([100, 50, 100, 50, 200]);
        }
    }, [exerciseTimeLeft, isExerciseTimerRunning, exerciseTimerStarted, audioEnabled]);

    const handleComplete = () => {
        if (audioEnabled) playSuccess();
        vibrate([50, 50, 50, 50, 200]);
        setShowConfetti(true);
        // Delay completion slightly to show confetti
        setTimeout(() => {
            completeWorkout();
        }, 500);
    };

    // Save assessment and exit (for Save & Exit button)
    const handleSaveAssessmentAndExit = () => {
        if (testInput && currentSession) {
            const userMax = parseFloat(testInput);
            if (!isNaN(userMax) && userMax > 0) {
                // Calculate calibration factor (same logic as handleTestSubmit)
                const planMaxRep = Math.max(...currentSession.baseReps);
                const estimatedPlanMax = planMaxRep / 0.7;
                const scalingFactor = userMax / estimatedPlanMax;
                const clampedFactor = Math.max(0.5, Math.min(scalingFactor, 2.5));

                // Save calibration to localStorage
                const calibrations = JSON.parse(localStorage.getItem('shift6_calibrations') || '{}');
                calibrations[currentSession.exerciseKey] = clampedFactor;
                localStorage.setItem('shift6_calibrations', JSON.stringify(calibrations));
            }
        }
        setCurrentSession(null);
    };

    const handleShare = async () => {
        const text = `Shift6: Just crushed Day ${currentSession.dayIndex + 1} of ${currentSession.exerciseName}! Volume is climbing. 🚀`;
        const success = await copyToClipboard(text);
        if (success) {
            setCopied(true);
            vibrate(50);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!currentSession) {
        return null;
    }

    // Express Mode: Skip readiness check and go straight to workout
    const isExpressMode = currentSession.expressMode === true;

    // Phase 3: Auto-Regulation - Readiness Check (skipped in Express Mode)
    if (currentSession.step === 'readiness') {
        // Auto-skip readiness for express mode
        if (isExpressMode) {
            setCurrentSession(prev => ({
                ...prev,
                step: 'workout',
                readiness: 'normal'
            }));
            return null;
        }
        const handleReadiness = (level) => {
            let adjustments = {};
            let message = '';

            if (level === 'low') {
                // Optimization Mode: Reduce volume
                if (currentSession.isGym) {
                    const newSets = Math.max(1, (currentSession.gymConfig?.sets || 3) - 1);
                    adjustments = {
                        gymConfig: { ...currentSession.gymConfig, sets: newSets }
                    };
                    message = `Volume reduced to ${newSets} sets. Focus on quality!`;
                } else {
                    // Bodyweight: remove one set (if > 1)
                    if (currentSession.reps.length > 1) {
                        const newReps = currentSession.reps.slice(0, -1);
                        adjustments = { reps: newReps };
                        message = `Volume reduced. Focus on form!`;
                    }
                }
            } else if (level === 'high') {
                // Hero Mode: Increase volume
                if (currentSession.isGym) {
                    const newSets = (currentSession.gymConfig?.sets || 3) + 1;
                    adjustments = {
                        gymConfig: { ...currentSession.gymConfig, sets: newSets }
                    };
                    message = `Hero Mode activated! ${newSets} sets today. Go crush it!`;
                } else {
                    // Bodyweight: add a set (repeat last set)
                    if (currentSession.reps.length > 0) {
                        const lastRep = currentSession.reps[currentSession.reps.length - 1];
                        const newReps = [...currentSession.reps, lastRep];
                        adjustments = { reps: newReps };
                        message = `Hero Mode activated! Extra set added.`;
                    }
                }
            }

            if (message) {
                // Could show a toast here, but for now just proceed
            }

            setCurrentSession(prev => ({
                ...prev,
                step: 'workout',
                ...adjustments,
                readiness: level
            }));
            vibrate(50);
        };

        return (
            <div className="max-w-md mx-auto py-12 px-4">
                <div className="bg-slate-900/50 border border-cyan-500/20 rounded-xl p-8 text-center backdrop-blur-sm">
                    <h2 className="text-2xl font-bold mb-2 text-white">Readiness Check</h2>
                    <p className="text-slate-400 mb-8">How is your energy level today?</p>

                    <div className="space-y-4">
                        <button
                            onClick={() => handleReadiness('low')}
                            className="w-full bg-slate-800/50 border border-amber-500/30 p-4 rounded-xl flex items-center justify-between hover:bg-amber-500/10 transition-colors group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-amber-500/20 rounded-full text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-900 transition-colors">
                                    <BatteryLow size={24} />
                                </div>
                                <div className="text-left">
                                    <div className="font-bold text-white group-hover:text-amber-400 transition-colors">Low Energy</div>
                                    <div className="text-xs text-slate-400">Reduce sets, focus on form</div>
                                </div>
                            </div>
                            <TrendingDown size={20} className="text-amber-500/50" />
                        </button>

                        <button
                            onClick={() => handleReadiness('normal')}
                            className="w-full bg-slate-800/50 border border-slate-700 p-4 rounded-xl flex items-center justify-between hover:bg-slate-700 transition-colors group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-slate-700 rounded-full text-slate-400 group-hover:text-white transition-colors">
                                    <Battery size={24} />
                                </div>
                                <div className="text-left">
                                    <div className="font-bold text-white">Normal</div>
                                    <div className="text-xs text-slate-400">Stick to the plan</div>
                                </div>
                            </div>
                        </button>

                        <button
                            onClick={() => handleReadiness('high')}
                            className="w-full bg-slate-800/50 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between hover:bg-emerald-500/10 transition-colors group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-500/20 rounded-full text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-900 transition-colors">
                                    <BatteryCharging size={24} />
                                </div>
                                <div className="text-left">
                                    <div className="font-bold text-white group-hover:text-emerald-400 transition-colors">Crushing It</div>
                                    <div className="text-xs text-slate-400">Add bonus set</div>
                                </div>
                            </div>
                            <TrendingUp size={20} className="text-emerald-500/50" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (currentSession.step === 'assessment') {
        const unitLabel = currentSession.unit === 'seconds' ? 'seconds' : 'reps';
        return (
            <div className="max-w-md mx-auto py-8 px-4">
                <div className="bg-slate-900/50 border border-cyan-500/20 rounded-xl p-6 md:p-10 text-center backdrop-blur-sm neon-border">
                    {/* Exercise being assessed - prominent display */}
                    <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-full ${colorClasses[currentSession.color]?.bg || 'bg-cyan-500/10'} ${colorClasses[currentSession.color]?.border || 'border-cyan-500/30'} border mb-4`}>
                        <Dumbbell className={colorClasses[currentSession.color]?.text || 'text-cyan-400'} size={20} />
                        <span className={`font-bold ${colorClasses[currentSession.color]?.text || 'text-cyan-400'}`}>
                            {currentSession.exerciseName}
                        </span>
                    </div>

                    <h2 className="text-xl font-bold mb-2 text-white">Find Your Starting Point</h2>
                    <p className="text-sm text-slate-400 mb-6">
                        Do as many <span className="text-white font-medium">{currentSession.exerciseName}</span> as you can with good form.
                        <br />
                        <span className="text-cyan-400 text-xs">We&apos;ll customize your program based on this.</span>
                    </p>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-slate-500 uppercase tracking-wider mb-3 block">
                                How many {unitLabel} did you complete?
                            </label>
                            {/* Number display with +/- buttons */}
                            <div className="flex items-center justify-center gap-3">
                                {/* -5 button */}
                                <button
                                    type="button"
                                    onClick={() => setTestInput(String(Math.max(0, (parseInt(testInput) || 0) - 5)))}
                                    className="w-14 h-14 rounded-full bg-slate-800 border border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-cyan-500/50 transition-colors flex items-center justify-center text-lg font-bold"
                                >
                                    −5
                                </button>
                                {/* Number with up/down arrows */}
                                <div className="flex flex-col items-center">
                                    <button
                                        type="button"
                                        onClick={() => setTestInput(String((parseInt(testInput) || 0) + 1))}
                                        className="w-12 h-8 rounded-t-lg bg-slate-700/50 border border-slate-600 border-b-0 text-slate-400 hover:bg-slate-600 hover:text-white transition-colors flex items-center justify-center"
                                    >
                                        <ChevronUp size={20} />
                                    </button>
                                    <div className="w-24 h-16 bg-slate-800/50 border border-cyan-500/30 flex items-center justify-center">
                                        <span className="text-4xl font-bold text-white tabular-nums">
                                            {testInput || '0'}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setTestInput(String(Math.max(0, (parseInt(testInput) || 0) - 1)))}
                                        className="w-12 h-8 rounded-b-lg bg-slate-700/50 border border-slate-600 border-t-0 text-slate-400 hover:bg-slate-600 hover:text-white transition-colors flex items-center justify-center"
                                    >
                                        <ChevronDown size={20} />
                                    </button>
                                </div>
                                {/* +5 button */}
                                <button
                                    type="button"
                                    onClick={() => setTestInput(String((parseInt(testInput) || 0) + 5))}
                                    className="w-14 h-14 rounded-full bg-slate-800 border border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-cyan-500/50 transition-colors flex items-center justify-center text-lg font-bold"
                                >
                                    +5
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={handleTestSubmit}
                            disabled={!testInput || testInput === '0'}
                            className="w-full bg-cyan-500 rounded-lg py-4 text-slate-900 font-bold hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors uppercase tracking-wider"
                        >
                            Set Baseline & Continue
                        </button>
                    </div>

                    <div className="flex items-center justify-center gap-4 mt-6">
                        <button
                            onClick={() => applyCalibration(1, true)}
                            className="text-slate-500 text-xs font-medium hover:text-cyan-400 transition-colors"
                        >
                            Skip & use default
                        </button>
                        <span className="text-slate-700">|</span>
                        <button
                            onClick={handleSaveAssessmentAndExit}
                            className="text-slate-500 text-xs font-medium hover:text-cyan-400 transition-colors"
                        >
                            {testInput ? 'Save & Exit' : 'Exit'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Post-assessment confirmation - option to start workout or exit
    if (currentSession.step === 'assessment-complete') {
        return (
            <div className="max-w-md mx-auto py-12 px-4">
                <div className="bg-slate-900/50 border border-emerald-500/20 rounded-xl p-8 md:p-12 text-center backdrop-blur-sm">
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Check className="text-emerald-400" size={32} />
                    </div>
                    <h2 className="text-2xl font-bold mb-3 text-white">Assessment Complete!</h2>
                    <p className="text-sm text-slate-400 mb-2">
                        Your program is calibrated for {currentSession.exerciseName}.
                    </p>
                    <p className="text-lg font-bold text-cyan-400 mb-8">
                        Day 1 is ready when you are.
                    </p>

                    <div className="space-y-3">
                        <button
                            onClick={() => setCurrentSession(prev => ({ ...prev, step: 'workout' }))}
                            className="w-full bg-cyan-500 rounded-lg py-4 text-slate-900 font-bold hover:bg-cyan-600 transition-colors uppercase tracking-wider"
                        >
                            Start Day 1 Now
                        </button>
                        <button
                            onClick={() => setCurrentSession(null)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-4 text-white font-medium hover:bg-slate-700 transition-colors"
                        >
                            Save & Come Back Later
                        </button>
                    </div>

                    <p className="text-xs text-slate-500 mt-6">
                        Your calibration is saved. Next time you select this exercise, Day 1 will be waiting.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto">
            {/* Celebration confetti */}
            <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />

            <div className="bg-slate-900/50 border border-cyan-500/20 rounded-xl overflow-hidden backdrop-blur-sm neon-border">
                {/* Header */}
                <div className="bg-slate-900/80 text-white p-4 flex justify-between items-center border-b border-cyan-500/20">
                    <div>
                        <div className="flex items-center gap-2 text-cyan-400 text-xs font-medium mb-1 uppercase tracking-wider">
                            {currentSession.exerciseName} <ChevronRight size={12} /> Day {currentSession.dayIndex + 1}
                            {isExpressMode && (
                                <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/30 rounded-full text-yellow-400">
                                    <Zap size={10} />
                                    Express
                                </span>
                            )}
                        </div>
                        <h2 className="text-xl font-bold text-white">Week {currentSession.week}</h2>
                    </div>
                    <button
                        onClick={() => {
                            if (window.confirm('Exit workout? Progress will be lost.')) {
                                setCurrentSession(null);
                            }
                        }}
                        className="p-2 hover:bg-cyan-500/10 transition-colors rounded"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="h-1 w-full bg-slate-800/50 flex">
                    {currentSession.reps.map((_, i) => (
                        <div key={i} className={`h-full flex-1 transition-all ${i <= currentSession.setIndex ? 'bg-cyan-500' : 'bg-slate-700/50'}`} />
                    ))}
                </div>

                {/* Main Content */}
                <div className="p-8 md:p-12 min-h-[500px] flex flex-col items-center justify-center bg-slate-900/30">
                    {/* Gym Exercise Workout UI */}
                    {isGymExercise && gymConfig ? (
                        <div className="w-full max-w-sm">
                            {timeLeft > 0 ? (
                                // Rest Timer for Gym
                                <div className="space-y-6 flex flex-col items-center w-full">
                                    <div className="relative">
                                        <ProgressRing
                                            progress={timeLeft / (gymConfig.restSeconds || 90)}
                                            color="#06b6d4"
                                            size={180}
                                            stroke={8}
                                        />
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-6xl font-bold text-white tabular-nums">
                                                {timeLeft}
                                            </span>
                                            <span className="text-xs text-cyan-400 uppercase mt-1 tracking-wider">Rest</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => { setTimeLeft(0); vibrate(20); }}
                                        className="px-6 py-2 rounded-lg bg-slate-800/50 border border-cyan-500/30 text-cyan-400 text-sm font-medium hover:bg-slate-700/50 transition-colors uppercase tracking-wider"
                                    >
                                        End Rest
                                    </button>
                                </div>
                            ) : gymSetReps.length >= gymConfig.sets ? (
                                // All sets complete - show summary
                                <div className="space-y-6 text-center">
                                    <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-center mx-auto">
                                        <Check className="text-emerald-400" size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-white mb-2">Workout Complete!</h3>
                                        <p className="text-slate-400 text-sm">
                                            {gymConfig.sets} sets @ {currentWeight > 0 ? `${currentWeight} lbs` : 'bodyweight'}
                                        </p>
                                    </div>

                                    {/* Set Summary */}
                                    <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Set Summary</p>
                                        <div className="flex justify-center gap-3">
                                            {gymSetReps.map((reps, i) => (
                                                <div key={i} className="text-center">
                                                    <div className="text-2xl font-bold text-white">{reps}</div>
                                                    <div className="text-xs text-slate-500">Set {i + 1}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Progression hint if last set exceeded range */}
                                    {gymSetReps[gymSetReps.length - 1] > gymConfig.repRange[1] && (
                                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                                            <p className="text-emerald-400 text-sm font-medium">
                                                💪 Great job! Consider increasing weight by {gymConfig.weightIncrement} lbs next time.
                                            </p>
                                            <button
                                                onClick={() => {
                                                    if (setGymWeights) {
                                                        setGymWeights(prev => ({
                                                            ...prev,
                                                            [currentSession.exerciseKey]: currentWeight + gymConfig.weightIncrement
                                                        }));
                                                    }
                                                    vibrate(50);
                                                }}
                                                className="mt-2 px-4 py-2 bg-emerald-500 text-slate-900 rounded-lg text-sm font-bold hover:bg-emerald-600 transition-colors"
                                            >
                                                Increase to {currentWeight + gymConfig.weightIncrement} lbs
                                            </button>
                                        </div>
                                    )}

                                    {/* Feedback Section */}
                                    <div className="pt-4 space-y-4">
                                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                                            <p className="text-white text-sm font-bold mb-3 text-center">How hard was this?</p>
                                            <div className="flex justify-between items-center mb-2 px-2">
                                                <span className="text-xs text-slate-400">Easy</span>
                                                <span className="text-xs text-slate-400">Hard</span>
                                                <span className="text-xs text-slate-400">Max</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="1"
                                                max="10"
                                                step="1"
                                                defaultValue="7"
                                                onChange={(e) => {
                                                    const display = document.getElementById('gym-rpe-display');
                                                    if (display) display.innerText = e.target.value;
                                                }}
                                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                                id="gym-rpe-slider"
                                            />
                                            <div className="text-center mt-2 text-2xl font-bold text-cyan-400" id="gym-rpe-display">7</div>
                                        </div>

                                        <textarea
                                            value={workoutNotes || ''}
                                            onChange={(e) => setWorkoutNotes(e.target.value)}
                                            placeholder="Add notes (optional)..."
                                            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 resize-none"
                                            rows={2}
                                            maxLength={200}
                                        />
                                    </div>

                                    <button
                                        onClick={() => {
                                            if (audioEnabled) playSuccess();
                                            vibrate([50, 50, 50, 50, 200]);
                                            // Store gym workout in history with weight info
                                            const totalReps = gymSetReps.reduce((sum, r) => sum + r, 0);
                                            setAmrapValue(String(totalReps));

                                            const rpe = parseInt(document.getElementById('gym-rpe-slider')?.value || '7');
                                            const feedback = { rpe, difficulty: rpe >= 9 ? 'hard' : rpe <= 4 ? 'easy' : 'moderate' };

                                            completeWorkout(null, feedback);
                                            setGymSetReps([]);
                                            setCurrentGymReps(0);
                                        }}
                                        className="w-full bg-cyan-500 rounded-lg text-slate-900 py-4 text-sm font-bold hover:bg-cyan-600 transition-colors uppercase tracking-wider"
                                    >
                                        Finish Workout
                                    </button>
                                </div>
                            ) : (
                                // Active set - gym exercise
                                <div className="text-center space-y-6">
                                    <p className="text-xs text-cyan-400 uppercase tracking-wider">
                                        Set {gymSetReps.length + 1} of {gymConfig.sets}
                                    </p>

                                    {/* Current Weight Display */}
                                    <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Weight</p>
                                        <div className="flex items-center justify-center gap-3">
                                            <button
                                                onClick={() => {
                                                    if (setGymWeights && currentWeight > 0) {
                                                        setGymWeights(prev => ({
                                                            ...prev,
                                                            [currentSession.exerciseKey]: Math.max(0, currentWeight - gymConfig.weightIncrement)
                                                        }));
                                                    }
                                                    vibrate(20);
                                                }}
                                                className="w-10 h-10 rounded-full bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600 transition-colors flex items-center justify-center"
                                            >
                                                <Minus size={18} />
                                            </button>
                                            <div className="text-3xl font-bold text-white min-w-[100px]">
                                                {currentWeight > 0 ? `${currentWeight} lbs` : 'BW'}
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (setGymWeights) {
                                                        setGymWeights(prev => ({
                                                            ...prev,
                                                            [currentSession.exerciseKey]: currentWeight + gymConfig.weightIncrement
                                                        }));
                                                    }
                                                    vibrate(20);
                                                }}
                                                className="w-10 h-10 rounded-full bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600 transition-colors flex items-center justify-center"
                                            >
                                                <Plus size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Rep Target */}
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Target Reps</p>
                                        <div className="text-4xl font-bold text-cyan-400">
                                            {gymConfig.repRange[0]}-{gymConfig.repRange[1]}
                                        </div>
                                    </div>

                                    {/* Rep Counter */}
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Reps Completed</p>
                                        <div className="flex items-center justify-center gap-3">
                                            <button
                                                onClick={() => setCurrentGymReps(prev => Math.max(0, prev - 5))}
                                                className="w-12 h-12 rounded-full bg-slate-800 border border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-cyan-500/50 transition-colors flex items-center justify-center"
                                            >
                                                <Minus size={20} />
                                            </button>
                                            <button
                                                onClick={() => setCurrentGymReps(prev => Math.max(0, prev - 1))}
                                                className="w-9 h-9 rounded-full bg-slate-800/50 border border-slate-700 text-slate-400 hover:bg-slate-700 transition-colors flex items-center justify-center text-sm font-bold"
                                            >
                                                -1
                                            </button>
                                            <div className="w-20 h-16 bg-slate-800/50 border border-cyan-500/30 rounded-xl flex items-center justify-center">
                                                <span className="text-4xl font-bold text-white tabular-nums">
                                                    {currentGymReps}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => setCurrentGymReps(prev => prev + 1)}
                                                className="w-9 h-9 rounded-full bg-slate-800/50 border border-slate-700 text-slate-400 hover:bg-slate-700 transition-colors flex items-center justify-center text-sm font-bold"
                                            >
                                                +1
                                            </button>
                                            <button
                                                onClick={() => setCurrentGymReps(prev => prev + 5)}
                                                className="w-12 h-12 rounded-full bg-slate-800 border border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-cyan-500/50 transition-colors flex items-center justify-center"
                                            >
                                                <Plus size={20} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Rep quality indicator */}
                                    {currentGymReps > 0 && (
                                        <div className={`text-xs font-medium ${currentGymReps < gymConfig.repRange[0]
                                            ? 'text-amber-400'
                                            : currentGymReps > gymConfig.repRange[1]
                                                ? 'text-emerald-400'
                                                : 'text-cyan-400'
                                            }`}>
                                            {currentGymReps < gymConfig.repRange[0]
                                                ? 'Below target - consider reducing weight'
                                                : currentGymReps > gymConfig.repRange[1]
                                                    ? 'Above target - ready to progress!'
                                                    : 'In target range - good work!'}
                                        </div>
                                    )}

                                    <button
                                        onClick={() => {
                                            vibrate(20);
                                            setGymSetReps(prev => [...prev, currentGymReps]);
                                            setCurrentGymReps(0);
                                            if (gymSetReps.length + 1 < gymConfig.sets) {
                                                setTimeLeft(gymConfig.restSeconds || 90);
                                                setIsTimerRunning(true);
                                            }
                                        }}
                                        disabled={currentGymReps === 0}
                                        className="w-full py-5 rounded-lg bg-cyan-500 text-slate-900 font-bold hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 uppercase tracking-wider"
                                    >
                                        {gymSetReps.length + 1 >= gymConfig.sets ? 'Complete Final Set' : 'Complete Set'} <ChevronRight size={20} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : timeLeft > 0 ? (
                        <div className="space-y-6 flex flex-col items-center w-full">
                            <div className="relative">
                                <ProgressRing
                                    progress={timeLeft / currentSession.rest}
                                    color="#06b6d4"
                                    size={180}
                                    stroke={8}
                                />
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-6xl font-bold text-white tabular-nums">
                                        {timeLeft}
                                    </span>
                                    <span className="text-xs text-cyan-400 uppercase mt-1 tracking-wider">Rest</span>
                                </div>
                            </div>
                            <button
                                onClick={() => { setTimeLeft(0); vibrate(20); }}
                                className="px-6 py-2 rounded-lg bg-slate-800/50 border border-cyan-500/30 text-cyan-400 text-sm font-medium hover:bg-slate-700/50 transition-colors uppercase tracking-wider"
                            >
                                End Rest
                            </button>
                        </div>
                    ) : (
                        <div className="w-full max-w-sm">
                            {currentSession.setIndex === currentSession.reps.length - 1 ? (
                                <div className="space-y-6 text-center">
                                    <div className="w-16 h-16 bg-cyan-500/10 border border-cyan-500/30 rounded-lg flex items-center justify-center mx-auto">
                                        <Zap className="text-cyan-400 fill-cyan-400" size={28} />
                                    </div>
                                    <div>
                                        <h3 className="text-3xl font-bold text-white mb-1">Final Set</h3>
                                        <p className="text-xs text-cyan-400 uppercase tracking-wider">Max Effort</p>
                                    </div>
                                    {/* Number display with +/- buttons */}
                                    <div className="flex items-center justify-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setAmrapValue(String(Math.max(0, (parseInt(amrapValue) || 0) - 5)))}
                                            className="w-12 h-12 rounded-full bg-slate-800 border border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-cyan-500/50 transition-colors flex items-center justify-center"
                                        >
                                            <Minus size={20} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAmrapValue(String(Math.max(0, (parseInt(amrapValue) || 0) - 1)))}
                                            className="w-9 h-9 rounded-full bg-slate-800/50 border border-slate-700 text-slate-400 hover:bg-slate-700 transition-colors flex items-center justify-center text-sm font-bold"
                                        >
                                            -1
                                        </button>
                                        <div className="w-20 h-16 bg-slate-800/50 border border-cyan-500/30 rounded-xl flex items-center justify-center">
                                            <span className="text-4xl font-bold text-white tabular-nums">
                                                {amrapValue || '0'}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setAmrapValue(String((parseInt(amrapValue) || 0) + 1))}
                                            className="w-9 h-9 rounded-full bg-slate-800/50 border border-slate-700 text-slate-400 hover:bg-slate-700 transition-colors flex items-center justify-center text-sm font-bold"
                                        >
                                            +1
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAmrapValue(String((parseInt(amrapValue) || 0) + 5))}
                                            className="w-12 h-12 rounded-full bg-slate-800 border border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-cyan-500/50 transition-colors flex items-center justify-center"
                                        >
                                            <Plus size={20} />
                                        </button>
                                    </div>

                                    {/* Feedback Section */}
                                    <div className="pt-4 space-y-4">
                                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                                            <p className="text-white text-sm font-bold mb-3 text-center">How hard was this?</p>
                                            <div className="flex justify-between items-center mb-2 px-2">
                                                <span className="text-xs text-slate-400">Easy</span>
                                                <span className="text-xs text-slate-400">Hard</span>
                                                <span className="text-xs text-slate-400">Max</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="1"
                                                max="10"
                                                step="1"
                                                defaultValue="7"
                                                onChange={(e) => {
                                                    // Store feedback in a temporary state or ref if needed, or pass directly
                                                    // Ideally we add state for this: const [feedbackRpe, setFeedbackRpe] = useState(7);
                                                    document.getElementById('rpe-display').innerText = e.target.value;
                                                }}
                                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                                id="rpe-slider"
                                            />
                                            <div className="text-center mt-2 text-2xl font-bold text-cyan-400" id="rpe-display">7</div>
                                        </div>

                                        <textarea
                                            value={workoutNotes || ''}
                                            onChange={(e) => setWorkoutNotes(e.target.value)}
                                            placeholder="Add notes (optional)..."
                                            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 resize-none"
                                            rows={2}
                                            maxLength={200}
                                        />
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <button
                                            onClick={() => {
                                                const rpe = parseInt(document.getElementById('rpe-slider').value);
                                                handleComplete({ rpe, difficulty: rpe >= 9 ? 'hard' : rpe <= 4 ? 'easy' : 'moderate' });
                                            }}
                                            className="flex-1 bg-cyan-500 rounded-lg text-slate-900 py-4 text-sm font-bold hover:bg-cyan-600 transition-colors uppercase tracking-wider"
                                        >
                                            Finish
                                        </button>
                                        <button
                                            onClick={handleShare}
                                            className="flex-1 border border-cyan-500/30 bg-slate-800/50 rounded-lg py-4 flex items-center justify-center gap-2 text-cyan-400 text-sm font-medium hover:bg-slate-700/50 transition-colors uppercase tracking-wider"
                                        >
                                            {copied ? <Check size={16} /> : <Share2 size={16} />}
                                            {copied ? 'Copied' : 'Share'}
                                        </button>
                                    </div>
                                </div>
                            ) : currentSession.unit === 'seconds' ? (
                                // Countdown timer for hold exercises (like Plank)
                                <div className="text-center space-y-6">
                                    <p className="text-xs text-cyan-400 uppercase tracking-wider">Set {currentSession.setIndex + 1} of {currentSession.reps.length}</p>

                                    {!exerciseTimerStarted ? (
                                        // Timer not started - show target and Start button
                                        <>
                                            <div className="relative inline-block">
                                                <ProgressRing
                                                    progress={1}
                                                    color="#06b6d4"
                                                    size={240}
                                                    stroke={10}
                                                />
                                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                    <span className="text-7xl font-bold text-white tabular-nums">
                                                        {currentSession.reps[currentSession.setIndex]}
                                                    </span>
                                                    <span className="text-sm text-cyan-400 uppercase mt-2 tracking-wider">seconds</span>
                                                </div>
                                            </div>
                                            <p className="text-slate-400 text-sm">Get into position, then tap Start</p>
                                            <button
                                                onClick={() => {
                                                    vibrate(20);
                                                    if (audioEnabled) playStart();
                                                    setExerciseTimeLeft(currentSession.reps[currentSession.setIndex]);
                                                    setExerciseTimerStarted(true);
                                                    setIsExerciseTimerRunning(true);
                                                }}
                                                className="w-full py-5 rounded-lg bg-cyan-500 text-slate-900 font-bold hover:bg-cyan-600 transition-colors flex items-center justify-center gap-3 uppercase tracking-wider"
                                            >
                                                <Play size={24} fill="currentColor" /> Start Timer
                                            </button>
                                        </>
                                    ) : exerciseTimeLeft > 0 ? (
                                        // Timer is running or paused
                                        <>
                                            <div className="relative inline-block">
                                                <ProgressRing
                                                    progress={exerciseTimeLeft / currentSession.reps[currentSession.setIndex]}
                                                    color={isExerciseTimerRunning ? "#06b6d4" : "#f59e0b"}
                                                    size={240}
                                                    stroke={10}
                                                />
                                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                    <span className={`text-7xl font-bold tabular-nums ${isExerciseTimerRunning ? 'text-white' : 'text-amber-400'}`}>
                                                        {exerciseTimeLeft}
                                                    </span>
                                                    <span className={`text-sm uppercase mt-2 tracking-wider ${isExerciseTimerRunning ? 'text-cyan-400' : 'text-amber-400'}`}>
                                                        {isExerciseTimerRunning ? 'Hold!' : 'Paused'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => {
                                                        vibrate(20);
                                                        setIsExerciseTimerRunning(prev => !prev);
                                                    }}
                                                    className={`flex-1 py-4 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 uppercase tracking-wider ${isExerciseTimerRunning
                                                        ? 'bg-amber-500 text-slate-900 hover:bg-amber-600'
                                                        : 'bg-cyan-500 text-slate-900 hover:bg-cyan-600'
                                                        }`}
                                                >
                                                    {isExerciseTimerRunning ? (
                                                        <><Pause size={20} /> Pause</>
                                                    ) : (
                                                        <><Play size={20} fill="currentColor" /> Resume</>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        vibrate([50, 30, 50]);
                                                        // Stop timer and move to next set
                                                        setIsExerciseTimerRunning(false);
                                                        setExerciseTimerStarted(false);
                                                        setExerciseTimeLeft(0);
                                                        setCurrentSession(prev => ({ ...prev, setIndex: prev.setIndex + 1 }));
                                                        setTimeLeft(currentSession.rest);
                                                        setIsTimerRunning(true);
                                                    }}
                                                    className="px-6 py-4 rounded-lg bg-slate-700 text-white font-bold hover:bg-slate-600 transition-colors flex items-center justify-center gap-2 uppercase tracking-wider"
                                                >
                                                    <Square size={18} fill="currentColor" /> Stop
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        // Timer completed - show success and continue
                                        <>
                                            <div className="relative inline-block">
                                                <ProgressRing
                                                    progress={0}
                                                    color="#10b981"
                                                    size={240}
                                                    stroke={10}
                                                />
                                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                    <Check className="text-emerald-400" size={64} />
                                                    <span className="text-lg text-emerald-400 uppercase mt-2 tracking-wider font-bold">Complete!</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    vibrate(20);
                                                    setExerciseTimerStarted(false);
                                                    setExerciseTimeLeft(0);
                                                    setCurrentSession(prev => ({ ...prev, setIndex: prev.setIndex + 1 }));
                                                    setTimeLeft(currentSession.rest);
                                                    setIsTimerRunning(true);
                                                }}
                                                className="w-full py-5 rounded-lg bg-emerald-500 text-slate-900 font-bold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 uppercase tracking-wider"
                                            >
                                                Next Set <ChevronRight size={20} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            ) : (
                                // Standard rep-based exercise display
                                <div className="text-center space-y-8">
                                    <p className="text-xs text-cyan-400 uppercase tracking-wider">Set {currentSession.setIndex + 1} of {currentSession.reps.length}</p>
                                    <div className="text-[120px] leading-none font-bold text-white tabular-nums text-glow">
                                        {currentSession.reps[currentSession.setIndex]}
                                    </div>
                                    <p className="text-sm font-medium text-cyan-400 uppercase tracking-wider">{currentSession.unit}</p>

                                    <button
                                        onClick={() => {
                                            vibrate(20);
                                            setCurrentSession(prev => ({ ...prev, setIndex: prev.setIndex + 1 }));
                                            setTimeLeft(currentSession.rest);
                                            setIsTimerRunning(true);
                                        }}
                                        className="w-full py-5 rounded-lg bg-cyan-500 text-slate-900 font-bold hover:bg-cyan-600 transition-colors flex items-center justify-center gap-2 uppercase tracking-wider"
                                    >
                                        Complete Set <ChevronRight size={20} />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Form Tips, Video & Achievements - always visible */}
                    <div className="w-full max-w-sm mx-auto mt-6 space-y-3">
                        {/* Watch Video Button */}
                        {currentExercise?.youtubeId && (
                            <button
                                onClick={() => setShowVideo(true)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
                            >
                                <Youtube size={18} />
                                <span className="text-sm font-medium">Watch Form Video</span>
                            </button>
                        )}

                        {/* Collapsible Form Tips */}
                        {currentExercise && (currentExercise.tips || currentExercise.instructions || currentExercise.cue) && (
                            <>
                                <button
                                    onClick={() => setShowTips(!showTips)}
                                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/30 border border-slate-700/50 rounded-lg text-sm text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
                                >
                                    <span className="flex items-center gap-2">
                                        <Info size={16} />
                                        Form Tips
                                    </span>
                                    <ChevronRight size={16} className={`transition-transform ${showTips ? 'rotate-90' : ''}`} />
                                </button>
                                {showTips && (
                                    <div className="p-4 bg-slate-800/20 border border-slate-700/30 rounded-lg space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                        {(currentExercise.instructions || currentExercise.cue) && (
                                            <p className="text-sm text-slate-300 leading-relaxed">
                                                {currentExercise.instructions || currentExercise.cue}
                                            </p>
                                        )}
                                        {currentExercise.tips && currentExercise.tips.length > 0 && (
                                            <ul className="space-y-1">
                                                {currentExercise.tips.map((tip, i) => (
                                                    <li key={i} className="text-xs text-cyan-400 flex items-start gap-2">
                                                        <span className="text-cyan-500 mt-0.5">•</span>
                                                        {tip}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {/* Collapsible Achievements */}
                        <button
                            onClick={() => setShowAchievements(!showAchievements)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/30 border border-slate-700/50 rounded-lg text-sm text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
                        >
                            <span className="flex items-center gap-2">
                                <span className="text-base">🏆</span>
                                Achievements
                                <span className="text-xs text-cyan-400">({unlockedBadges.length}/{BADGES.length})</span>
                            </span>
                            <ChevronRight size={16} className={`transition-transform ${showAchievements ? 'rotate-90' : ''}`} />
                        </button>
                        {showAchievements && (
                            <div className="p-4 bg-slate-800/20 border border-slate-700/30 rounded-lg space-y-3 animate-in fade-in slide-in-from-top-2 duration-200 max-h-48 overflow-y-auto">
                                {/* Exercise-specific progress */}
                                <div className="pb-2 border-b border-slate-700/30">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">{currentSession?.exerciseName} Progress</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {EXERCISE_ACHIEVEMENTS.map((ach) => {
                                            const isUnlocked = exerciseCompletedCount >= ach.days;
                                            return (
                                                <div
                                                    key={ach.id}
                                                    className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${isUnlocked
                                                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                                        : 'bg-slate-800/50 text-slate-600 border border-slate-700'
                                                        }`}
                                                    title={ach.desc}
                                                >
                                                    <span>{ach.icon}</span>
                                                    <span className="hidden sm:inline">{ach.name}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Global badges */}
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Overall Achievements</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {BADGES.slice(0, 12).map((badge) => {
                                            const isUnlocked = badge.condition(stats);
                                            return (
                                                <div
                                                    key={badge.id}
                                                    className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${isUnlocked
                                                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                                        : 'bg-slate-800/50 text-slate-600 border border-slate-700'
                                                        }`}
                                                    title={badge.desc}
                                                >
                                                    <span>{badge.icon}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {BADGES.length > 12 && (
                                        <p className="text-xs text-slate-600 mt-2 text-center">
                                            +{BADGES.length - 12} more badges to unlock
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Video Modal */}
                {showVideo && currentExercise && (
                    <VideoModal exercise={currentExercise} onClose={() => setShowVideo(false)} />
                )}
            </div>
        </div>
    );
};

export default WorkoutSession;
