import React, { useState } from 'react';
import { ChevronRight, Trophy, Info, Play, Share2, Check, X, Zap } from 'lucide-react';
import { playBeep, playStart, playSuccess } from '../../utils/audio';
import { requestWakeLock, releaseWakeLock, vibrate, copyToClipboard } from '../../utils/device';
import { EXERCISE_PLANS } from '../../data/exercises.jsx';

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
    getThemeClass,
    setActiveTab,
    exerciseName
}) => {
    const [isFinished, setIsFinished] = useState(false);
    const [copied, setCopied] = useState(false);

    // Audio/Vibrate Effect
    React.useEffect(() => {
        if (isTimerRunning && timeLeft > 0 && timeLeft <= 3) playBeep();
        if (isTimerRunning && timeLeft === 0) {
            playStart();
            vibrate([100, 50, 100]);
        }
    }, [timeLeft, isTimerRunning]);

    const handleComplete = () => {
        playSuccess();
        vibrate([50, 50, 50, 50, 200]);
        setIsFinished(true);
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
        return (
            <div className="max-w-md mx-auto py-12">
                <div className="bg-slate-900/50 border border-cyan-500/20 rounded-xl p-12 text-center backdrop-blur-sm">
                    <div className="w-16 h-16 bg-cyan-500/10 border border-cyan-500/30 rounded-lg flex items-center justify-center mx-auto mb-6">
                        <Play className="text-cyan-400" size={32} />
                    </div>
                    <h2 className="text-2xl font-bold mb-3 text-white">No Active Workout</h2>
                    <p className="text-sm text-slate-400 mb-8">
                        Select an exercise from your plan to begin
                    </p>
                    <button
                        onClick={() => setActiveTab('plan')}
                        className="bg-cyan-500 hover:bg-cyan-600 text-slate-900 px-6 py-3 rounded-lg text-sm font-bold transition-colors uppercase tracking-wider"
                    >
                        Go to Plan
                    </button>
                </div>
            </div>
        );
    }

    if (currentSession.step === 'assessment') {
        return (
            <div className="max-w-md mx-auto py-12">
                <div className="bg-slate-900/50 border border-cyan-500/20 rounded-xl p-12 text-center backdrop-blur-sm neon-border">
                    <Trophy className="mx-auto text-cyan-400 mb-6" size={48} />
                    <h2 className="text-2xl font-bold mb-3 text-white">Initial Assessment</h2>
                    <p className="text-sm text-slate-400 mb-8">
                        Perform {currentSession.exerciseName} to failure with proper form
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
                            Set Baseline
                        </button>
                    </form>

                    <button
                        onClick={() => applyCalibration(1)}
                        className="text-slate-500 text-xs font-medium mt-4 hover:text-cyan-400 transition-colors"
                    >
                        Use default instead
                    </button>
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
                                setActiveTab('dashboard');
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

                                    <div className="flex gap-3 pt-4">
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
                            ) : (
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

                {/* Tips Section with Infographic */}
                <div className="border-t border-cyan-500/20 bg-slate-900/50">
                    {/* Exercise Infographic */}
                    <div className="relative h-48 border-b border-cyan-500/20 overflow-hidden">
                        <img
                            src={EXERCISE_PLANS[currentSession.exerciseKey]?.image}
                            alt={`${currentSession.exerciseName} form guide`}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                            <p className="text-cyan-400 text-xs font-bold uppercase tracking-wider">{currentSession.exerciseName} - Form Guide</p>
                        </div>
                    </div>

                    <div className="p-4">
                        <div className="flex gap-3 items-start">
                            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                                <Info size={16} />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-cyan-400 mb-1 uppercase tracking-wider">Form Tip</p>
                                <p className="text-xs text-slate-400">
                                    {
                                        currentSession.exerciseKey === 'pushups' ? "Keep elbows at 45 degrees. Squeeze core." :
                                        currentSession.exerciseKey === 'squats' ? "Weight in heels, chest up." :
                                        currentSession.exerciseKey === 'pullups' ? "Full extension at bottom. Pull elbows down." :
                                        currentSession.exerciseKey === 'plank' ? "Squeeze glutes. Keep neck neutral." :
                                        currentSession.exerciseKey === 'vups' ? "Keep legs straight, reach for toes." :
                                        currentSession.exerciseKey === 'dips' ? "Chest up, elbows tucked." :
                                        currentSession.exerciseKey === 'lunges' ? "Keep torso upright." :
                                        currentSession.exerciseKey === 'glutebridge' ? "Drive through heels, squeeze glutes." :
                                        currentSession.exerciseKey === 'supermans' ? "Lift chest and thighs. Neutral neck." :
                                        "Maintain perfect form throughout."
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WorkoutSession;
