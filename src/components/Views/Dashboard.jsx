import React, { useState, useEffect } from 'react';
import { Trophy, Zap, LayoutDashboard, CheckCircle2, X } from 'lucide-react';
import { EXERCISE_PLANS } from '../../data/exercises';
import { getDailyStack, getScheduleFocus } from '../../utils/schedule';

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
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Intro Box */}
            {showIntro && (
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-6 text-white shadow-xl relative animate-in slide-in-from-top-4 duration-500">
                    <button
                        onClick={dismissIntro}
                        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X size={16} />
                    </button>
                    <div className="pr-8">
                        <h2 className="text-xl font-black mb-2">Welcome to Shift6! 🚀</h2>
                        <p className="text-blue-100 text-sm leading-relaxed mb-4">
                            Your ultimate bodyweight mastery tool. The goal is simple: Complete 18 sessions for each exercise to reach "Mastery Level".
                            <br /><br />
                            We use a <strong>Dynamic Progression System</strong>: If you crush the max-effort set, we increase the difficulty for next time automatically.
                        </p>
                        <button
                            onClick={dismissIntro}
                            className="bg-white text-blue-600 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-blue-50 transition-colors"
                        >
                            Got it, let's train
                        </button>
                    </div>
                </div>
            )}

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

            {/* Gamification Hub */}
            <GamificationSection completedDays={completedDays} />

            {/* Daily Stack Card */}
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
                        {dailyStack.length > 0
                            ? "Your scheduled sessions for today. One click to run them back-to-back."
                            : "No scheduled workouts for today. Enjoy your rest!"}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-6">
                        {dailyStack.map((item, i) => (
                            <div key={i} className="bg-slate-800 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-2 border border-slate-700">
                                {EXERCISE_PLANS[item.exerciseKey].icon}
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
                        onClick={startStack}
                        disabled={dailyStack.length === 0}
                        className="bg-white text-slate-900 px-6 py-3 rounded-xl font-black text-sm uppercase tracking-wide hover:bg-slate-200 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                    >
                        Start Stack ({dailyStack.length})
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
