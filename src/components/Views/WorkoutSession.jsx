import React, { useState } from 'react';
import { ChevronRight, Trophy, Timer, Info, Play, AlertCircle, Share2, Check } from 'lucide-react';
import { formatValue } from '../../data/exercises';
import { playBeep, playStart, playSuccess } from '../../utils/audio';
import { requestWakeLock, releaseWakeLock, vibrate, copyToClipboard } from '../../utils/device';

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
    exerciseName // passed for specific icon access if needed, though currentSession has name
}) => {

    // If no session is active, show the "Pick a Workout" state
    if (!currentSession) {
        return (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-sm">
                    <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Play className="text-slate-300 ml-1" size={40} />
                    </div>
                    <h2 className="text-2xl font-black mb-3">Ready to push?</h2>
                    <p className="text-slate-500 mb-8 max-w-xs mx-auto">
                        Go to the plan tab and select your next {exerciseName || 'workout'} session.
                    </p>
                    <button
                        onClick={() => setActiveTab('plan')}
                        className={`text-white px-8 py-3 rounded-full font-bold shadow-lg transition-transform active:scale-95 ${getThemeClass('bg')}`}
                    >
                        Pick a Workout
                    </button>
                </div>
            </div>
        );
    }

    const [copied, setCopied] = useState(false);

    // Audio Cues & Haptics & WakeLock
    React.useEffect(() => {
        if (isTimerRunning) {
            requestWakeLock();
        } else {
            releaseWakeLock();
        }

        if (isTimerRunning && timeLeft > 0 && timeLeft <= 3) {
            playBeep();
        }
        if (isTimerRunning && timeLeft === 0) {
            playStart(); // Time's up -> GO!
            vibrate([100, 50, 100]); // Buzz buzz buzz
        }
    }, [timeLeft, isTimerRunning]);

    // Handle session complete for success sound
    const handleComplete = () => {
        playSuccess();
        vibrate([50, 50, 50, 50, 200]);
        completeWorkout();
    };

    const handleShare = async () => {
        const text = `Shift6: Just crushed Day ${currentSession.dayIndex + 1} of ${currentSession.exerciseName} (Week ${currentSession.week}). Hit ${amrapValue || 'my goal'} on the max set! 🚀`;
        const success = await copyToClipboard(text);
        if (success) {
            setCopied(true);
            vibrate(50);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Assessment Screen
    if (currentSession.step === 'assessment') {
        return (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-200 animate-in zoom-in duration-300">
                    <div className="bg-slate-900 text-white p-8">
                        <div className="flex items-center gap-2 text-blue-400 text-xs font-black uppercase tracking-widest mb-1">
                            First Session <ChevronRight size={12} /> {currentSession.exerciseName}
                        </div>
                        <h2 className="text-3xl font-black">Baseline Assessment</h2>
                    </div>
                    <div className="p-8 md:p-12 space-y-8">

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
        );
    }

    // Standard Workout Screen
    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-700 h-[calc(100vh-8rem)] flex flex-col">
            <div className="bg-white rounded-[2rem] overflow-hidden shadow-2xl border border-slate-200 flex-1 flex flex-col relative">

                {/* Header */}
                <div className="bg-slate-900 text-white p-6 shrink-0 relative z-10">
                    <div className="flex justify-between items-center">
                        <div>
                            <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">
                                {currentSession.exerciseName} <ChevronRight size={12} /> Week {currentSession.week}
                            </div>
                            <h2 className="text-2xl font-black tracking-tight">Day {currentSession.dayIndex + 1}</h2>
                        </div>
                        <button
                            onClick={() => setCurrentSession(null)}
                            className="p-3 bg-white/10 rounded-full text-slate-300 hover:text-white hover:bg-white/20 transition-all active:scale-90"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Progress Bar */}
                {!currentSession.isFinal && (
                    <div className="h-1.5 w-full bg-slate-100 flex gap-0.5">
                        {currentSession.reps.map((_, i) => (
                            <div
                                key={i}
                                className={`h-full flex-1 transition-all duration-500 ${i < currentSession.setIndex ? 'bg-green-500' :
                                    i === currentSession.setIndex ? getThemeClass('bg') : 'bg-slate-100'
                                    }`}
                            />
                        ))}
                    </div>
                )}

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden">
                    {/* Background blob for flair */}
                    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 ${getThemeClass('bg')} rounded-full blur-[100px] opacity-[0.05] pointer-events-none`}></div>

                    <div className="text-center relative z-10 w-full max-w-sm">
                        {currentSession.isFinal ? (
                            <div className="space-y-8 animate-in zoom-in duration-500">
                                <div className="space-y-2">
                                    <Trophy className="mx-auto text-yellow-500 animate-bounce drop-shadow-lg" size={80} />
                                    <p className="text-yellow-600 font-bold uppercase tracking-widest text-xs">Challenge Unlocked</p>
                                </div>
                                <div>
                                    <h3 className="text-7xl font-black text-slate-900 tracking-tighter mb-2">
                                        {formatValue(currentSession.reps[0], currentSession.unit)}
                                    </h3>
                                    <div className="inline-block bg-slate-100 px-4 py-1.5 rounded-full text-xs font-black text-slate-500 uppercase tracking-widest">
                                        Final Boss Goal
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in zoom-in duration-300">
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                    {currentSession.setIndex === currentSession.reps.length - 1 ? '🔥 Max Effort Set' : `Set ${currentSession.setIndex + 1} of ${currentSession.reps.length}`}
                                </p>
                                <div className="relative inline-block">
                                    <span className="text-[120px] leading-none font-black text-slate-900 tabular-nums tracking-tighter">
                                        {formatValue(currentSession.reps[currentSession.setIndex], currentSession.unit)}
                                    </span>
                                    {currentSession.setIndex === currentSession.reps.length - 1 && (
                                        <span className={`absolute top-2 -right-10 text-6xl font-black ${getThemeClass('text')} animate-pulse`}>+</span>
                                    )}
                                </div>
                                <p className={`text-sm font-bold uppercase tracking-wide ${getThemeClass('text')}`}>
                                    Target Reps
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Timer / Controls Area */}
                    <div className="w-full max-w-[320px] mt-12 relative z-10">
                        {timeLeft > 0 ? (
                            <div className="bg-slate-900 p-6 rounded-[2rem] text-center shadow-2xl shadow-blue-900/20 relative overflow-hidden animate-in slide-in-from-bottom-10">
                                <div className={`absolute top-0 left-0 h-1.5 ${getThemeClass('bg')} transition-all duration-1000`} style={{ width: `${(timeLeft / currentSession.rest) * 100}%` }} />

                                <div className="flex items-center justify-center gap-2 text-slate-400 mb-4 opacity-80">
                                    <Timer size={16} />
                                    <span className="font-black uppercase text-[10px] tracking-widest">Resting</span>
                                </div>

                                <div className="text-7xl font-mono font-black text-white tabular-nums tracking-tight mb-6">
                                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                                </div>

                                <button
                                    onClick={() => {
                                        setTimeLeft(0);
                                        vibrate(20);
                                    }}
                                    className="w-full py-4 rounded-xl border border-white/10 hover:bg-white/5 text-slate-400 text-xs font-bold uppercase tracking-widest transition-all active:scale-95"
                                >
                                    Skip Rest
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                {currentSession.setIndex === currentSession.reps.length - 1 ? (
                                    <div className="space-y-4">
                                        <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-200">
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 text-center">
                                                {currentSession.unit === 'seconds' ? 'Seconds Achieved' : 'Total Reps'}
                                            </label>
                                            <input
                                                type="number"
                                                value={amrapValue}
                                                onChange={(e) => setAmrapValue(e.target.value)}
                                                className="w-full bg-transparent text-6xl font-black text-center focus:outline-none placeholder:text-slate-200"
                                                autoFocus
                                                placeholder={currentSession.unit === 'seconds' ? '0' : '0'}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={handleShare}
                                                className="col-span-1 bg-white border border-slate-200 text-slate-600 py-4 rounded-xl font-bold text-sm hover:border-blue-300 transition-all flex items-center justify-center gap-2 active:scale-95"
                                            >
                                                {copied ? <Check size={18} /> : <Share2 size={18} />}
                                                {copied ? 'Copied' : 'Share'}
                                            </button>
                                            <button
                                                onClick={handleComplete}
                                                className={`col-span-1 text-white py-4 rounded-xl font-black text-sm shadow-lg shadow-blue-500/30 hover:brightness-110 transition-all active:scale-95 ${getThemeClass('bg')}`}
                                            >
                                                FINISH
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => {
                                            vibrate(20);
                                            setCurrentSession(prev => ({ ...prev, setIndex: prev.setIndex + 1 }));
                                            setTimeLeft(currentSession.rest);
                                            setIsTimerRunning(true);
                                        }}
                                        className={`w-full text-white py-6 rounded-2xl font-black text-xl shadow-xl shadow-blue-500/20 hover:brightness-110 transition-all active:scale-95 flex items-center justify-center gap-4 group ${getThemeClass('bg')}`}
                                    >
                                        COMPLETE SET <ChevronRight className="group-active:translate-x-1 transition-transform" strokeWidth={3} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Tip Footer */}
            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-100 flex gap-3 items-start shrink-0">
                <div className={`p-2 rounded-lg shrink-0 ${getThemeClass('bg')} bg-opacity-10 ${getThemeClass('text')}`}>
                    <Info size={18} />
                </div>
                <p className="text-xs font-medium text-slate-500 leading-relaxed pt-0.5">
                    <strong className="text-slate-700 block mb-0.5">Form Check:</strong>
                    {
                        currentSession.exerciseKey === 'pushups' ? "Keep elbows at 45 degrees." :
                            currentSession.exerciseKey === 'squats' ? "Weight in heels, chest up." :
                                currentSession.exerciseKey === 'pullups' ? "Full extension at the bottom." :
                                    currentSession.exerciseKey === 'plank' ? "Squeeze glutes to protect lower back." :
                                        currentSession.exerciseKey === 'vups' ? "Keep legs straight and reach for your toes." :
                                            currentSession.exerciseKey === 'glutebridge' ? "Drive through your heel, keep hips level." :
                                                currentSession.exerciseKey === 'lunges' ? "Keep torso upright, knee shouldn't touch ground." :
                                                    currentSession.exerciseKey === 'dips' ? "Keep elbows tucked, lean forward slightly." :
                                                        currentSession.exerciseKey === 'supermans' ? "Lift chest and thighs simultaneously, pause at top." :
                                                            "Exhale on the way up."
                    }
                </p>
            </div>
        </div>
    );
};

export default WorkoutSession;
