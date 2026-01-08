import React, { useState, useEffect } from 'react';
import { Trophy, Zap, LayoutDashboard, CheckCircle2, X, Volume2 } from 'lucide-react';
import { EXERCISE_PLANS } from '../../data/exercises';
import { getDailyStack, getScheduleFocus } from '../../utils/schedule';
import { vibrate } from '../../utils/device';

const Dashboard = ({ completedDays, setActiveExercise, setActiveTab, startStack }) => {
    const dailyStack = getDailyStack(completedDays);
    const [showIntro, setShowIntro] = useState(true);

    useEffect(() => {
        const dismissed = localStorage.getItem('shift6_intro_dismissed');
        if (dismissed) setShowIntro(false);
    }, []);

    const dismissIntro = () => {
        setShowIntro(false);
        localStorage.setItem('shift6_intro_dismissed', 'true');
    };

    return (
        <div className="space-y-8 pb-10">
            {/* Intro Box */}
            {showIntro && (
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl shadow-blue-900/20 relative animate-in slide-in-from-top-4 fade-in duration-700">
                    <button
                        onClick={dismissIntro}
                        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors active:scale-95"
                    >
                        <X size={16} />
                    </button>
                    <div className="pr-8">
                        <h2 className="text-2xl font-black mb-2 tracking-tight">Welcome to Shift6! 🚀</h2>
                        <p className="text-blue-100 text-sm leading-relaxed mb-6 font-medium">
                            Your ultimate bodyweight mastery tool. The goal is simple: Complete 18 sessions for each exercise to reach "Mastery Level".
                            <br /><br />
                            We use a <strong>Dynamic Progression System</strong>: If you crush the max-effort set, we increase the difficulty for next time automatically.
                        </p>
                        <button
                            onClick={dismissIntro}
                            className="bg-white text-blue-600 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-blue-50 transition-transform active:scale-95 shadow-lg"
                        >
                            Got it, let's train
                        </button>
                    </div>
                </div>
            )}

            {/* Hero Section */}
            <div className="bg-slate-900 text-white p-8 rounded-[2rem] relative overflow-hidden shadow-2xl ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-700 delay-100">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] transform translate-x-10 -translate-y-10">
                    <Trophy size={300} />
                </div>
                {/* Glassy overlay effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>

                <div className="relative z-10">
                    <p className="text-blue-400 font-bold uppercase tracking-widest text-[10px] mb-2">Transformation Journey</p>
                    <h1 className="text-4xl md:text-5xl font-black mb-6 tracking-tighter">Total Body<br />Mastery</h1>

                    <div className="flex flex-wrap gap-2">
                        {Object.entries(EXERCISE_PLANS).map(([key, ex]) => {
                            const count = completedDays[key]?.length || 0;
                            return (
                                <div key={key} className="bg-slate-800/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2 text-xs font-bold text-slate-300">
                                    {React.cloneElement(ex.icon, { size: 14 })} <span>{count}/18</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Gamification Hub */}
            <div className="animate-in slide-in-from-bottom-8 fade-in duration-700 delay-200">
                <GamificationSection completedDays={completedDays} />
            </div>

            {/* Daily Stack Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden group active:scale-[0.99] transition-all border border-slate-700/50 animate-in slide-in-from-bottom-8 fade-in duration-700 delay-300">
                <div className="absolute top-0 right-0 p-8 opacity-[0.05] group-hover:opacity-10 transition-opacity">
                    <LayoutDashboard size={120} />
                </div>
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        <h2 className="text-2xl font-black flex items-center gap-2 tracking-tight">
                            <Zap className="text-yellow-400 fill-yellow-400" size={24} /> Daily Stack
                        </h2>
                        <span className="bg-white/10 backdrop-blur text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider border border-white/10">
                            {getScheduleFocus()}
                        </span>
                    </div>
                    <p className="text-slate-400 mb-6 max-w-md text-sm font-medium leading-relaxed">
                        {dailyStack.length > 0
                            ? "Your scheduled sessions for today. One click to run them back-to-back."
                            : "No scheduled workouts for today. Enjoy your rest!"}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-8">
                        {dailyStack.map((item, i) => (
                            <div key={i} className="bg-slate-950/50 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 border border-white/5 text-slate-300">
                                {React.cloneElement(EXERCISE_PLANS[item.exerciseKey].icon, { size: 14 })}
                                {item.name} <span className="text-slate-500">W{item.week}D{item.dayIndex + 1}</span>
                            </div>
                        ))}
                        {dailyStack.length === 0 && (
                            <div className="text-slate-500 text-sm font-bold flex items-center gap-2">
                                <CheckCircle2 size={16} /> All caught up!
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => {
                            vibrate(20);
                            startStack();
                        }}
                        disabled={dailyStack.length === 0}
                        className="w-full bg-white text-slate-900 py-4 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-slate-100 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 shadow-lg shadow-white/5"
                    >
                        Start Stack ({dailyStack.length})
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(EXERCISE_PLANS).map(([key, ex], index) => {
                    const count = completedDays[key]?.length || 0;
                    const percent = Math.min(100, Math.round((count / 18) * 100));
                    const delayClass = `delay-${(index * 100) + 400}`; // Stagger effect helper

                    return (
                        <button
                            key={key}
                            onClick={() => {
                                vibrate(10);
                                setActiveExercise(key);
                                setActiveTab('plan');
                            }}
                            className={`bg-white p-6 rounded-3xl border border-slate-100 hover:border-slate-300 active:scale-95 transition-all text-left shadow-sm h-full flex flex-col justify-between animate-in slide-in-from-bottom-8 fade-in duration-700 fill-mode-backwards`}
                            style={{ animationDelay: `${(index * 50) + 400}ms` }}
                        >
                            <div className="w-full">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${key === 'pushups' ? 'bg-blue-50 text-blue-600' :
                                        key === 'squats' ? 'bg-orange-50 text-orange-600' :
                                            key === 'lunges' ? 'bg-purple-50 text-purple-600' :
                                                key === 'dips' ? 'bg-fuchsia-50 text-fuchsia-600' :
                                                    key === 'supermans' ? 'bg-amber-50 text-amber-600' :
                                                        key === 'glutebridge' ? 'bg-cyan-50 text-cyan-600' :
                                                            key === 'vups' ? 'bg-emerald-50 text-emerald-600' :
                                                                key === 'pullups' ? 'bg-indigo-50 text-indigo-600' :
                                                                    'bg-rose-50 text-rose-600'
                                        }`}>
                                        {React.cloneElement(ex.icon, { size: 26, strokeWidth: 2.5 })}
                                    </div>
                                    <span className="text-[10px] font-black uppercase bg-slate-100 text-slate-500 px-2.5 py-1.5 rounded-lg tracking-wide">
                                        {percent}%
                                    </span>
                                </div>

                                <h3 className="text-lg font-black text-slate-900 mb-1 tracking-tight">{ex.name}</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-6">Goal: {ex.finalGoal}</p>
                            </div>

                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ease-out ${key === 'pushups' ? 'bg-blue-500' :
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
    );
};

import { calculateStats, getUnlockedBadges, BADGES } from '../../utils/gamification';

const GamificationSection = ({ completedDays }) => {
    const stats = calculateStats(completedDays);
    const unlocked = getUnlockedBadges(stats);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Stats */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 flex gap-4 items-center shadow-sm">
                <div className="p-4 bg-orange-100 text-orange-600 rounded-full">
                    <Zap size={24} fill="currentColor" />
                </div>
                <div>
                    <h3 className="text-2xl font-black text-slate-900">{stats.currentStreak}</h3>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Active Streak</p>
                </div>
                <div className="ml-auto text-right">
                    <h3 className="text-2xl font-black text-slate-900">{stats.totalSessions}</h3>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Total Sessions</p>
                </div>
            </div>

            {/* Badges */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Latest Achievements</h3>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {unlocked.length > 0 ? unlocked.map(badge => (
                        <div key={badge.id} className="min-w-[80px] flex flex-col items-center text-center p-2 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-2xl mb-1 filter drop-shadow-sm">{badge.icon}</span>
                            <span className="text-[10px] font-bold text-slate-700 leading-tight">{badge.name}</span>
                        </div>
                    )) : (
                        <p className="text-sm text-slate-400 italic">Complete workouts to unlock badges!</p>
                    )}
                    {/* Show locked greyed out */}
                    {BADGES.filter(b => !unlocked.includes(b)).slice(0, 3).map(badge => (
                        <div key={badge.id} className="min-w-[80px] flex flex-col items-center text-center p-2 grayscale opacity-40 border border-dashed border-slate-200 rounded-xl">
                            <span className="text-2xl mb-1">{badge.icon}</span>
                            <span className="text-[10px] font-bold text-slate-700 leading-tight">{badge.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
