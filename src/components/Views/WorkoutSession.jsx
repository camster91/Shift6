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
            <div className="max-w-lg mx-auto w-full px-4 py-8 md:py-12 animate-in slide-in-from-bottom-4 duration-500">
                <div className="bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 mesh-bg min-h-[600px] flex flex-col justify-center text-center p-8 md:p-12 text-white relative">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                        <Trophy className="absolute -top-10 -right-10" size={300} />
                    </div>

                    <div className="relative z-10">
                        <Trophy className="mx-auto text-blue-400 mb-8 animate-float" size={64} />
                        <h2 className="text-4xl font-black mb-4 tracking-tighter">Elite Calibration</h2>
                        <p className="text-slate-400 mb-12 max-w-sm mx-auto font-medium leading-relaxed">
                            Perform one set of {currentSession.exerciseName} to <span className="text-white font-black underline decoration-blue-500/50 underline-offset-4">FAILURE</span>. <br />Form over everything.
                        </p>

                        <form onSubmit={handleTestSubmit} className="max-w-xs mx-auto w-full space-y-4 mb-10">
                            <div className="relative group">
                                <input
                                    type="number"
                                    value={testInput}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                        setTestInput(val);
                                    }}
                                    className="w-full bg-white/5 border border-white/10 rounded-3xl px-6 py-8 text-6xl font-black text-center focus:outline-none focus:bg-white/10 focus:border-blue-500/50 transition-all text-white placeholder:text-white/10"
                                    placeholder="0"
                                    autoFocus
                                />
                                <div className="absolute inset-0 bg-blue-500/5 rounded-3xl -z-10 group-focus-within:bg-blue-500/10 transition-colors" />
                            </div>
                            <button
                                type="submit"
                                disabled={!testInput}
                                className="w-full bg-blue-600 py-6 rounded-3xl font-black text-white uppercase tracking-widest shadow-2xl shadow-blue-600/30 active-scale disabled:opacity-30 disabled:grayscale transition-all"
                            >
                                Sync Baseline
                            </button>
                        </form>

                        <button onClick={() => applyCalibration(1)} className="text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-white transition-colors py-2">
                            Use Standard Default
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto w-full px-4 animate-in slide-in-from-bottom-8 duration-700 min-h-[500px] flex flex-col items-center justify-center py-4 md:py-10">
            <div className="bg-white rounded-[3rem] overflow-hidden shadow-2xl border border-slate-100 flex flex-col md:flex-row relative transition-all duration-500 w-full min-h-[600px] md:h-[650px]">

                {/* Left Side: Session Info & Main Action */}
                <div className="flex-1 flex flex-col relative bg-white">
                    {/* Header Overlay */}
                    <div className="bg-slate-900 text-white p-6 shrink-0 flex justify-between items-center mesh-bg">
                        <div>
                            <div className="flex items-center gap-2 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-1">
                                {currentSession.exerciseName} <ChevronRight size={10} /> Day {currentSession.dayIndex + 1}
                            </div>
                            <h2 className="text-2xl font-black tracking-tight">Week {currentSession.week}</h2>
                        </div>
                        <button
                            onClick={() => {
                                if (window.confirm('Current progress in this session will be lost. Quit workout?')) {
                                    setCurrentSession(null);
                                    setActiveTab('dashboard');
                                }
                            }}
                            className="p-2 bg-white/5 rounded-xl text-white/50 hover:text-white active-scale"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1.5 w-full bg-slate-50 flex gap-0.5">
                        {currentSession.reps.map((_, i) => (
                            <div key={i} className={`h-full flex-1 transition-all duration-500 ${i <= currentSession.setIndex ? 'bg-blue-600' : 'bg-slate-100'}`} />
                        ))}
                    </div>

                    {/* Centered Action Content */}
                    <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 relative overflow-hidden">
                        <div className="text-center relative z-10 w-full max-w-sm h-full flex flex-col justify-center">
                            {timeLeft > 0 ? (
                                <div className="animate-in zoom-in duration-500 space-y-10">
                                    <div className="relative inline-block scale-110 md:scale-125">
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
                                <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-8 h-full flex flex-col justify-center">
                                    {currentSession.setIndex === currentSession.reps.length - 1 ? (
                                        <div className="space-y-10">
                                            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 animate-float">
                                                <Zap className="text-blue-600 fill-blue-600" size={40} />
                                            </div>
                                            <div className="space-y-2">
                                                <h3 className="text-5xl font-black text-slate-900 tracking-tighter">Max Effort</h3>
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Final Assessment</p>
                                            </div>
                                            <div className="relative group max-w-[200px] mx-auto">
                                                <input
                                                    type="number"
                                                    value={amrapValue}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                                        setAmrapValue(val);
                                                    }}
                                                    className="w-full text-8xl font-black text-center focus:outline-none placeholder:text-slate-100 text-slate-900 bg-transparent hide-spinners"
                                                    autoFocus
                                                    placeholder="0"
                                                />
                                                <div className="h-2 w-full bg-slate-100 group-focus-within:bg-blue-600 rounded-full transition-colors mt-2" />
                                            </div>

                                            <div className="flex flex-col gap-3 w-full max-w-xs mx-auto pt-4 md:flex-row">
                                                <button onClick={handleComplete} className="flex-1 bg-blue-600 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-600/30 active-scale">
                                                    Finish
                                                </button>
                                                <button onClick={handleShare} className="flex-1 bg-white border border-slate-200 py-4 rounded-2xl flex items-center justify-center gap-2 active-scale text-slate-500 font-bold text-sm hover:bg-slate-50 transition-colors">
                                                    {copied ? <Check size={18} /> : <Share2 size={18} />}
                                                    {copied ? 'Copied' : 'Share'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-between h-full py-4">
                                            <div className="space-y-6">
                                                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Set {currentSession.setIndex + 1} of {currentSession.reps.length}</p>
                                                <div className="text-[140px] md:text-[180px] leading-none font-black text-slate-900 tracking-tighter tabular-nums drop-shadow-sm">
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
                                                className="w-full max-w-xs py-7 bg-slate-900 text-white rounded-[2rem] font-black text-xl uppercase tracking-widest shadow-2xl shadow-slate-900/40 active-scale group flex items-center justify-center gap-4 mt-12"
                                            >
                                                Complete Set <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Side: Tips & Visual (Desktop Only) */}
                <div className="hidden md:flex w-80 bg-slate-50 border-l border-slate-100 flex-col p-8 justify-between">
                    <div className="space-y-8">
                        <div>
                            <div className={`w-12 h-12 rounded-2xl bg-${currentSession.color}-500/10 text-${currentSession.color}-600 flex items-center justify-center mb-6`}>
                                <Info size={24} />
                            </div>
                            <h3 className="text-lg font-black text-slate-900 tracking-tight mb-2 uppercase tracking-widest text-xs">Form Check</h3>
                            <p className="text-sm font-medium text-slate-600 leading-relaxed italic">
                                "Perfect form is non-negotiable. Every rep is an investment in your future strength."
                            </p>
                        </div>

                        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
                            <p className={`text-[10px] font-black text-${currentSession.color}-600 uppercase tracking-widest mb-3`}>Coach's Tip</p>
                            <p className="text-xs font-bold text-slate-700 leading-relaxed">
                                {
                                    currentSession.exerciseKey === 'pushups' ? "Keep elbows at 45 degrees. Squeeze your core like a plank." :
                                        currentSession.exerciseKey === 'squats' ? "Weight in heels, chest up. Drive through your mid-foot." :
                                            currentSession.exerciseKey === 'pullups' ? "Full extension at the bottom. Pull elbows to pockets." :
                                                currentSession.exerciseKey === 'plank' ? "Squeeze glutes to protect lower back. Keep neck neutral." :
                                                    currentSession.exerciseKey === 'vups' ? "Keep legs straight, reach for toes. Control the down." :
                                                        currentSession.exerciseKey === 'dips' ? "Keep chest up and elbows tucked. Don't go below 90 deg." :
                                                            currentSession.exerciseKey === 'lunges' ? "Keep torso upright. Back knee should almost touch the floor." :
                                                                currentSession.exerciseKey === 'glutebridge' ? "Drive through heels, squeeze glutes at the top." :
                                                                    currentSession.exerciseKey === 'supermans' ? "Lift chest and thighs. Neutral neck, stare at the floor." :
                                                                        "Maintain perfect tension throughout the move."
                                }
                            </p>
                        </div>
                    </div>

                    <div className="opacity-20 flex justify-center pb-4">
                        <Trophy size={100} className="text-slate-400" />
                    </div>
                </div>

                {/* Mobile Tip Overlay (Floating) */}
                <div className="md:hidden p-4 bg-slate-50 border-t border-slate-100">
                    <div className="flex gap-4 items-center">
                        <div className={`p-2 rounded-xl bg-${currentSession.color}-50 text-${currentSession.color}-600`}>
                            <Info size={16} />
                        </div>
                        <p className="text-[10px] font-bold text-slate-600">
                            <span className={`font-black text-${currentSession.color}-600 uppercase`}>Tip:</span> {
                                currentSession.exerciseKey === 'pushups' ? "Keep elbows at 45 degrees. Squeeze core." :
                                    currentSession.exerciseKey === 'squats' ? "Weight in heels, chest up." :
                                        "Maintain perfect form throughout."
                            }
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WorkoutSession;
