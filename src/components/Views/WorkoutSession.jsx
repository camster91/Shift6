import React, { useState } from 'react';
import { ChevronRight, Trophy, Info, Share2, Check, X, Zap, Youtube, Play, Pause, Square } from 'lucide-react';
import { playBeep, playStart, playSuccess } from '../../utils/audio';
import { vibrate, copyToClipboard } from '../../utils/device';
import { EXERCISE_PLANS } from '../../data/exercises.jsx';

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
                    <p className="text-sm text-slate-300">{exercise.instructions}</p>
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
    setExerciseTimerStarted
}) => {
    const [copied, setCopied] = useState(false);
    const [showVideo, setShowVideo] = useState(false);
    const currentExercise = currentSession ? EXERCISE_PLANS[currentSession.exerciseKey] : null;

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
        completeWorkout();
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

    if (currentSession.step === 'assessment') {
        return (
            <div className="max-w-md mx-auto py-12 px-4">
                <div className="bg-slate-900/50 border border-cyan-500/20 rounded-xl p-8 md:p-12 text-center backdrop-blur-sm neon-border">
                    <Trophy className="mx-auto text-cyan-400 mb-6" size={48} />
                    <h2 className="text-2xl font-bold mb-3 text-white">Initial Assessment</h2>
                    <p className="text-sm text-slate-400 mb-8">
                        Perform {currentSession.exerciseName} to failure with proper form.
                        <br />
                        <span className="text-cyan-400">This is just to find your starting point.</span>
                    </p>

                    <form onSubmit={handleTestSubmit} className="space-y-4">
                        <input
                            type="number"
                            value={testInput}
                            onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, '');
                                setTestInput(val);
                            }}
                            className="w-full bg-slate-800/50 border border-cyan-500/30 rounded-lg px-6 py-6 text-5xl font-bold text-center focus:outline-none focus:border-cyan-500 text-white"
                            placeholder="0"
                            autoFocus
                        />
                        <button
                            type="submit"
                            disabled={!testInput}
                            className="w-full bg-cyan-500 rounded-lg py-4 text-slate-900 font-bold hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors uppercase tracking-wider"
                        >
                            Set Baseline & Continue
                        </button>
                    </form>

                    <div className="flex items-center justify-center gap-4 mt-6">
                        <button
                            onClick={() => applyCalibration(1, true)}
                            className="text-slate-500 text-xs font-medium hover:text-cyan-400 transition-colors"
                        >
                            Use default & start
                        </button>
                        <span className="text-slate-700">|</span>
                        <button
                            onClick={() => setCurrentSession(null)}
                            className="text-slate-500 text-xs font-medium hover:text-cyan-400 transition-colors"
                        >
                            Save & Exit
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
            <div className="bg-slate-900/50 border border-cyan-500/20 rounded-xl overflow-hidden backdrop-blur-sm neon-border">
                {/* Header */}
                <div className="bg-slate-900/80 text-white p-4 flex justify-between items-center border-b border-cyan-500/20">
                    <div>
                        <div className="flex items-center gap-2 text-cyan-400 text-xs font-medium mb-1 uppercase tracking-wider">
                            {currentSession.exerciseName} <ChevronRight size={12} /> Day {currentSession.dayIndex + 1}
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
                    {timeLeft > 0 ? (
                        <div className="space-y-8 flex flex-col items-center">
                            <div className="relative">
                                <ProgressRing
                                    progress={timeLeft / currentSession.rest}
                                    color="#06b6d4"
                                    size={220}
                                    stroke={8}
                                />
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-7xl font-bold text-white tabular-nums">
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
                                <div className="space-y-8 text-center">
                                    <div className="w-20 h-20 bg-cyan-500/10 border border-cyan-500/30 rounded-lg flex items-center justify-center mx-auto">
                                        <Zap className="text-cyan-400 fill-cyan-400" size={36} />
                                    </div>
                                    <div>
                                        <h3 className="text-4xl font-bold text-white mb-2">Final Set</h3>
                                        <p className="text-xs text-cyan-400 uppercase tracking-wider">Max Effort</p>
                                    </div>
                                    <div className="max-w-[180px] mx-auto">
                                        <input
                                            type="number"
                                            value={amrapValue}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/[^0-9]/g, '');
                                                setAmrapValue(val);
                                            }}
                                            className="w-full text-7xl font-bold text-center focus:outline-none text-white bg-transparent hide-spinners border-b-2 border-slate-700 focus:border-cyan-500"
                                            autoFocus
                                            placeholder="0"
                                        />
                                    </div>

                                    {/* Optional workout notes */}
                                    <div className="pt-4">
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
                                            onClick={handleComplete}
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
                                                    className={`flex-1 py-4 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 uppercase tracking-wider ${
                                                        isExerciseTimerRunning
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
                </div>

                {/* Tips Section with Watch Video Button */}
                <div className="border-t border-cyan-500/20 bg-slate-900/50 p-4">
                    <div className="flex gap-3 items-start">
                        <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                            <Info size={16} />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-semibold text-cyan-400 mb-1 uppercase tracking-wider">Form Tip</p>
                            <p className="text-xs text-slate-400">
                                {currentExercise?.instructions || "Maintain perfect form throughout."}
                            </p>
                            {currentExercise?.tips && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {currentExercise.tips.map((tip, i) => (
                                        <span key={i} className="text-xs px-2 py-0.5 bg-slate-800 border border-slate-700 rounded-full text-slate-500">
                                            {tip}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                        {currentExercise?.youtubeId && (
                            <button
                                onClick={() => setShowVideo(true)}
                                className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
                                title="Watch form video"
                            >
                                <Youtube size={16} />
                                <span className="text-xs font-medium hidden sm:inline">Watch</span>
                            </button>
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
