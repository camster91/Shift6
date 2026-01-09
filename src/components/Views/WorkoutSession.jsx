import React, { useState } from 'react';
import { ChevronRight, Trophy, Timer, Info, Play, AlertCircle, Share2, Check, X, Zap } from 'lucide-react';
import { formatValue } from '../../data/exercises.jsx';
import { playBeep, playStart, playSuccess } from '../../utils/audio';
import { requestWakeLock, releaseWakeLock, vibrate, copyToClipboard } from '../../utils/device';

const ProgressRing = ({ progress, size = 200, stroke = 8, color = "currentColor" }) => {
    const radius = (size / 2) - (stroke * 2);
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress * circumference);

    return (
        <div className="relative flex items-center justify-center">
            <svg width={size} height={size} className="transform -rotate-90">
                <circle
                    stroke="rgba(255,255,255,0.05)"
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
        setIsFinished(true); // Show summary before calling completeWorkout? 
        // Actually, let's keep it simple and show a "Success" state then calling completeWorkout closes it.
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
            <div className="animate-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white rounded-[2rem] p-16 text-center border border-slate-100 shadow-xl shadow-slate-200/50">
                    <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8">
                        <Play className="text-slate-200 ml-1" size={48} />
                    </div>
                    <h2 className="text-3xl font-black mb-4 tracking-tight">Ready for a shift?</h2>
                    <p className="text-slate-400 mb-10 max-w-xs mx-auto text-sm font-medium">
                        Your muscles are waiting. Select a session from your plan to begin.
                    </p>
                    <button
                        onClick={() => setActiveTab('plan')}
                        className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-slate-900/20 active-scale"
                    >
                        Pick Workout
                    </button>
                </div>
            </div>
        );
    }

    if (currentSession.step === 'assessment') {
        return (
            <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white rounded-[2rem] overflow-hidden shadow-2xl border border-slate-100 mesh-bg min-h-[500px] flex flex-col justify-center text-center p-8 text-white">
                    <Trophy className="mx-auto text-blue-400 mb-8 animate-float" size={64} />
                    <h2 className="text-4xl font-black mb-4 tracking-tighter">Elite Calibration</h2>
                    <p className="text-slate-300 mb-12 max-w-md mx-auto font-medium">
                        Perform one set of {currentSession.exerciseName} to <span className="text-white font-black underline decoration-blue-500/50 underline-offset-4">FAILURE</span>. Form over everything.
                    </p>

                    <form onSubmit={handleTestSubmit} className="max-w-xs mx-auto w-full space-y-4 mb-8">
                        <input
                            type="number"
                            value={testInput}
                            onChange={(e) => setTestInput(e.target.value)}
                            className="w-full bg-white/10 border border-white/30 rounded-2xl px-4 py-5 text-4xl font-black text-center focus:outline-none focus:ring-4 focus:ring-blue-500/20 text-white placeholder:text-white/50"
                            placeholder="0"
                            autoFocus
                        />
                        <button
                            type="submit"
                            disabled={!testInput}
                            className="w-full bg-blue-600 py-5 rounded-2xl font-black text-white uppercase tracking-widest shadow-xl shadow-blue-600/30 active-scale disabled:opacity-30"
                        >
                            Sync Baseline
                        </button>
                    </form>

                    <button onClick={() => applyCalibration(1)} className="text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-white transition-colors">
                        Use Standard Default
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto w-full space-y-6 animate-in slide-in-from-bottom-8 duration-700 h-[calc(100vh-10rem)] flex flex-col">
            <div className="bg-white rounded-[3rem] overflow-hidden shadow-2xl border border-slate-100 flex-1 flex flex-col relative transition-all duration-500">
                {/* Header */}
                <div className="bg-slate-900 text-white p-6 shrink-0 flex justify-between items-center mesh-bg">
                    <div>
                        <div className="flex items-center gap-2 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-1">
                            {currentSession.exerciseName} <ChevronRight size={10} /> Day {currentSession.dayIndex + 1}
                        </div>
                        <h2 className="text-2xl font-black tracking-tight">Week {currentSession.week}</h2>
                    </div>
                    <button onClick={() => setCurrentSession(null)} className="p-3 bg-white/5 rounded-2xl text-white/50 hover:text-white active-scale">
                        <X size={20} />
                    </button>
                </div>

                {/* Progress */}
                <div className="h-1 w-full bg-slate-50 flex gap-0.5">
                    {currentSession.reps.map((_, i) => (
                        <div key={i} className={`h-full flex-1 transition-all duration-500 ${i <= currentSession.setIndex ? 'bg-blue-600' : 'bg-slate-100'}`} />
                    ))}
                </div>

                {/* Main */}
                <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
                    <div className="text-center relative z-10 w-full max-w-sm">
                        {timeLeft > 0 ? (
                            <div className="animate-in zoom-in duration-500 space-y-8">
                                <div className="relative inline-block">
                                    <ProgressRing
                                        progress={timeLeft / currentSession.rest}
                                        color="#3b82f6"
                                        size={240}
                                        stroke={12}
                                    />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-7xl font-black text-slate-900 tabular-nums tracking-tighter">
                                            {timeLeft}
                                        </span>
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rest</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setTimeLeft(0); vibrate(20); }}
                                    className="px-8 py-3 bg-slate-100 text-slate-600 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 active-scale"
                                >
                                    End Rest
                                </button>
                            </div>
                        ) : (
                            <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6">
                                {currentSession.setIndex === currentSession.reps.length - 1 ? (
                                    <div className="space-y-8">
                                        <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 animate-float">
                                            <Zap className="text-blue-600 fill-blue-600" size={40} />
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-5xl font-black text-slate-900 tracking-tighter">Max Effort</h3>
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">How many did you hit?</p>
                                        </div>
                                        <input
                                            type="number"
                                            value={amrapValue}
                                            onChange={(e) => setAmrapValue(e.target.value)}
                                            className="w-full text-8xl font-black text-center focus:outline-none placeholder:text-slate-100 text-slate-900"
                                            autoFocus
                                            placeholder="0"
                                        />
                                        <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
                                            <button onClick={handleShare} className="bg-white border-2 border-slate-100 py-4 rounded-2xl flex items-center justify-center gap-2 active-scale text-slate-600 font-bold text-sm">
                                                {copied ? <Check size={20} /> : <Share2 size={20} />}
                                                {copied ? 'Link' : 'Share'}
                                            </button>
                                            <button onClick={handleComplete} className="bg-blue-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-600/30 active-scale">
                                                Finish
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-12">
                                        <div className="space-y-2">
                                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Set {currentSession.setIndex + 1} of {currentSession.reps.length}</p>
                                            <div className="text-[140px] leading-none font-black text-slate-900 tracking-tighter tabular-nums drop-shadow-sm">
                                                {currentSession.reps[currentSession.setIndex]}
                                            </div>
                                            <p className="text-sm font-black text-blue-600 uppercase tracking-widest">{currentSession.unit}</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                vibrate(20);
                                                setCurrentSession(prev => ({ ...prev, setIndex: prev.setIndex + 1 }));
                                                setTimeLeft(currentSession.rest);
                                                setIsTimerRunning(true);
                                            }}
                                            className="w-full max-w-xs py-5 bg-slate-900 text-white rounded-2xl font-black text-lg uppercase tracking-widest shadow-2xl shadow-slate-900/30 active-scale group flex items-center justify-center gap-4"
                                        >
                                            Complete Set <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Tip Footer */}
            <div className="bg-white/90 backdrop-blur-md p-5 rounded-[2rem] border border-slate-100 flex gap-4 items-start shrink-0 shadow-sm animate-in slide-in-from-bottom-2 duration-1000 delay-700">
                <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
                    <Info size={20} />
                </div>
                <div className="flex-1">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Elite Tip / Form Check</p>
                    <p className="text-xs font-bold text-slate-600 leading-relaxed">
                        {
                            currentSession.exerciseKey === 'pushups' ? "Keep elbows at 45 degrees. Squeeze your core like a plank." :
                                currentSession.exerciseKey === 'squats' ? "Weight in heels, chest up. Drive through your mid-foot." :
                                    currentSession.exerciseKey === 'pullups' ? "Full extension at the bottom. Think about pulling elbows to pockets." :
                                        currentSession.exerciseKey === 'plank' ? "Squeeze glutes to protect lower back. Keep neck neutral." :
                                            currentSession.exerciseKey === 'vups' ? "Keep legs straight and reach for your toes. Control the down." :
                                                "Maintain perfect tension throughout the move."
                        }
                    </p>
                </div>
            </div>
        </div>
    );
};

export default WorkoutSession;
