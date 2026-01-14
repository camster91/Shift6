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
                    stroke="rgba(226,232,240,1)"
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
                <div className="border border-slate-200 rounded-lg p-12 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded flex items-center justify-center mx-auto mb-6">
                        <Play className="text-slate-400" size={32} />
                    </div>
                    <h2 className="text-2xl font-bold mb-3 text-slate-900">No Active Workout</h2>
                    <p className="text-sm text-slate-500 mb-8">
                        Select an exercise from your plan to begin
                    </p>
                    <button
                        onClick={() => setActiveTab('plan')}
                        className="bg-slate-900 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
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
                <div className="border border-slate-200 rounded-lg p-12 text-center">
                    <Trophy className="mx-auto text-blue-600 mb-6" size={48} />
                    <h2 className="text-2xl font-bold mb-3 text-slate-900">Initial Assessment</h2>
                    <p className="text-sm text-slate-600 mb-8">
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
                            className="w-full border border-slate-300 rounded-lg px-6 py-6 text-5xl font-bold text-center focus:outline-none focus:border-blue-600 text-slate-900"
                            placeholder="0"
                            autoFocus
                        />
                        <button
                            type="submit"
                            disabled={!testInput}
                            className="w-full bg-blue-600 rounded-lg py-4 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Set Baseline
                        </button>
                    </form>

                    <button
                        onClick={() => applyCalibration(1)}
                        className="text-slate-500 text-xs font-medium mt-4 hover:text-slate-700 transition-colors"
                    >
                        Use default instead
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto">
            <div className="border border-slate-200 rounded-lg overflow-hidden">
                {/* Header */}
                <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                    <div>
                        <div className="flex items-center gap-2 text-blue-400 text-xs font-medium mb-1">
                            {currentSession.exerciseName} <ChevronRight size={12} /> Day {currentSession.dayIndex + 1}
                        </div>
                        <h2 className="text-xl font-bold">Week {currentSession.week}</h2>
                    </div>
                    <button
                        onClick={() => {
                            if (window.confirm('Exit workout? Progress will be lost.')) {
                                setCurrentSession(null);
                                setActiveTab('dashboard');
                            }
                        }}
                        className="p-2 hover:bg-white/10 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="h-1 w-full bg-slate-100 flex">
                    {currentSession.reps.map((_, i) => (
                        <div key={i} className={`h-full flex-1 transition-all ${i <= currentSession.setIndex ? 'bg-blue-600' : 'bg-slate-200'}`} />
                    ))}
                </div>

                {/* Main Content */}
                <div className="p-8 md:p-12 min-h-[500px] flex flex-col items-center justify-center">
                    {timeLeft > 0 ? (
                        <div className="space-y-8 flex flex-col items-center">
                            <div className="relative">
                                <ProgressRing
                                    progress={timeLeft / currentSession.rest}
                                    color="#3b82f6"
                                    size={220}
                                    stroke={8}
                                />
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-7xl font-bold text-slate-900 tabular-nums">
                                        {timeLeft}
                                    </span>
                                    <span className="text-xs text-slate-500 uppercase mt-1">Rest</span>
                                </div>
                            </div>
                            <button
                                onClick={() => { setTimeLeft(0); vibrate(20); }}
                                className="px-6 py-2 rounded-lg bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition-colors"
                            >
                                End Rest
                            </button>
                        </div>
                    ) : (
                        <div className="w-full max-w-sm">
                            {currentSession.setIndex === currentSession.reps.length - 1 ? (
                                <div className="space-y-8 text-center">
                                    <div className="w-20 h-20 bg-blue-100 rounded-lg flex items-center justify-center mx-auto">
                                        <Zap className="text-blue-600 fill-blue-600" size={36} />
                                    </div>
                                    <div>
                                        <h3 className="text-4xl font-bold text-slate-900 mb-2">Final Set</h3>
                                        <p className="text-xs text-slate-500 uppercase">Max Effort</p>
                                    </div>
                                    <div className="max-w-[180px] mx-auto">
                                        <input
                                            type="number"
                                            value={amrapValue}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/[^0-9]/g, '');
                                                setAmrapValue(val);
                                            }}
                                            className="w-full text-7xl font-bold text-center focus:outline-none text-slate-900 bg-transparent hide-spinners border-b-2 border-slate-200 focus:border-blue-600"
                                            autoFocus
                                            placeholder="0"
                                        />
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <button
                                            onClick={handleComplete}
                                            className="flex-1 bg-blue-600 rounded-lg text-white py-4 text-sm font-medium hover:bg-blue-700 transition-colors"
                                        >
                                            Finish
                                        </button>
                                        <button
                                            onClick={handleShare}
                                            className="flex-1 border border-slate-200 rounded-lg py-4 flex items-center justify-center gap-2 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
                                        >
                                            {copied ? <Check size={16} /> : <Share2 size={16} />}
                                            {copied ? 'Copied' : 'Share'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center space-y-8">
                                    <p className="text-xs text-slate-500 uppercase">Set {currentSession.setIndex + 1} of {currentSession.reps.length}</p>
                                    <div className="text-[120px] leading-none font-bold text-slate-900 tabular-nums">
                                        {currentSession.reps[currentSession.setIndex]}
                                    </div>
                                    <p className="text-sm font-medium text-blue-600 uppercase">{currentSession.unit}</p>

                                    <button
                                        onClick={() => {
                                            vibrate(20);
                                            setCurrentSession(prev => ({ ...prev, setIndex: prev.setIndex + 1 }));
                                            setTimeLeft(currentSession.rest);
                                            setIsTimerRunning(true);
                                        }}
                                        className="w-full py-5 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                                    >
                                        Complete Set <ChevronRight size={20} />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Tips Section with Infographic */}
                <div className="border-t border-slate-200 bg-slate-50">
                    {/* Exercise Infographic */}
                    <div className="relative h-48 border-b border-slate-200 overflow-hidden">
                        <img
                            src={EXERCISE_PLANS[currentSession.exerciseKey]?.image}
                            alt={`${currentSession.exerciseName} form guide`}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                            <p className="text-white text-xs font-medium">{currentSession.exerciseName} - Form Guide</p>
                        </div>
                    </div>

                    <div className="p-4">
                        <div className="flex gap-3 items-start">
                            <div className="p-2 rounded bg-blue-100 text-blue-600">
                                <Info size={16} />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-900 mb-1">Form Tip</p>
                                <p className="text-xs text-slate-600">
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
