import React, { useState, useEffect } from 'react';
import { Trophy, Zap, LayoutDashboard, CheckCircle2, X, Volume2, Info } from 'lucide-react';
import { EXERCISE_PLANS } from '../../data/exercises';
import { getDailyStack, getScheduleFocus } from '../../utils/schedule';
import { vibrate } from '../../utils/device';

const Dashboard = ({ completedDays, sessionHistory, setActiveExercise, setActiveTab, startStack }) => {
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
                <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden animate-in slide-in-from-top-4 fade-in duration-700 mesh-bg border border-white/5">
                    <button
                        onClick={dismissIntro}
                        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors active:scale-95"
                    >
                        <X size={16} />
                    </button>
                    <div className="pr-8 relative z-10">
                        <h2 className="text-2xl font-black mb-2 tracking-tight">Shift6 Elite 🚀</h2>
                        <p className="text-slate-300 text-sm leading-relaxed mb-6 font-medium">
                            Welcome to the next level of bodyweight mastery. Track your volume, unlock achievements, and dominate the daily stack.
                        </p>
                        <button
                            onClick={dismissIntro}
                            className="bg-blue-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-blue-500 transition-transform active:scale-95 shadow-lg shadow-blue-900/40"
                        >
                            Start Training
                        </button>
                    </div>
                </div>
            )}

            {/* Hero Section */}
            <div className="bg-slate-900 text-white p-8 rounded-[2rem] relative overflow-hidden shadow-2xl ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-700 delay-100 mesh-bg">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] transform translate-x-10 -translate-y-10">
                    <Trophy size={300} />
                </div>

                <div className="relative z-10">
                    <p className="text-blue-400 font-bold uppercase tracking-widest text-[10px] mb-2">Total Volume Trajectory</p>
                    <h1 className="text-4xl md:text-5xl font-black mb-6 tracking-tighter">Elite Strength</h1>

                    {/* Simple Volume Sparkline */}
                    <div className="flex items-end gap-1 h-12 mb-6">
                        {Array.from({ length: 14 }).map((_, i) => {
                            const date = new Date();
                            date.setDate(date.getDate() - (13 - i));
                            const dateStr = date.toISOString().split('T')[0];
                            const volume = sessionHistory
                                .filter(s => s.date.startsWith(dateStr))
                                .reduce((sum, s) => sum + s.volume, 0);
                            const max = 200; // Normalization
                            const height = Math.min(100, (volume / max) * 100);
                            return (
                                <div
                                    key={i}
                                    className="flex-1 bg-blue-500/20 rounded-t-sm relative group"
                                    style={{ height: '100%' }}
                                >
                                    <div
                                        className="absolute bottom-0 left-0 right-0 bg-blue-500 rounded-t-sm transition-all duration-1000"
                                        style={{ height: `${Math.max(10, height)}%`, opacity: volume > 0 ? 1 : 0.3 }}
                                    />
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {Object.entries(EXERCISE_PLANS).map(([key, ex]) => {
                            const count = completedDays[key]?.length || 0;
                            return (
                                <div key={key} className="bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2 text-xs font-bold text-slate-300">
                                    {React.cloneElement(ex.icon, { size: 14 })} <span>{count}/18</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Gamification Hub */}
            <div className="animate-in slide-in-from-bottom-8 fade-in duration-700 delay-200">
                <GamificationSection completedDays={completedDays} sessionHistory={sessionHistory} />
            </div>

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Col: Daily Stack & Grid */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Daily Stack Card */}
                    <div className="bg-white rounded-[2rem] p-8 text-slate-900 shadow-xl shadow-slate-200/50 relative overflow-hidden group active-scale border border-slate-100 animate-in slide-in-from-bottom-8 fade-in duration-700 delay-300">
                        <div className="absolute top-0 right-0 p-8 text-slate-50 opacity-10 group-hover:opacity-20 transition-opacity">
                            <LayoutDashboard size={120} />
                        </div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <h2 className="text-2xl font-black flex items-center gap-2 tracking-tight">
                                    <Zap className="text-blue-600 fill-blue-600" size={24} /> Daily Stack
                                </h2>
                                <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                                    {getScheduleFocus()}
                                </span>
                            </div>
                            <p className="text-slate-500 mb-6 max-w-md text-sm font-medium leading-relaxed">
                                {dailyStack.length > 0
                                    ? "Your power-stack for today. High efficiency training."
                                    : "Goal achieved. Take your recovery seriously."}
                            </p>

                            <div className="flex flex-wrap gap-2 mb-8">
                                {dailyStack.map((item, i) => (
                                    <div key={i} className="bg-slate-50 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-100 text-slate-700">
                                        {React.cloneElement(EXERCISE_PLANS[item.exerciseKey].icon, { size: 14 })}
                                        {item.name} <span className="text-slate-400">W{item.week}D{item.dayIndex + 1}</span>
                                    </div>
                                ))}
                                {dailyStack.length === 0 && (
                                    <div className="text-blue-600 text-sm font-black flex items-center gap-2">
                                        <CheckCircle2 size={16} /> Mastery in progress
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => {
                                    vibrate(20);
                                    startStack();
                                }}
                                disabled={dailyStack.length === 0}
                                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 shadow-xl shadow-slate-900/20"
                            >
                                Launch Session ({dailyStack.length})
                            </button>
                        </div>
                    </div>

                    {/* Progress Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {Object.entries(EXERCISE_PLANS).map(([key, ex], index) => {
                            const count = completedDays[key]?.length || 0;
                            const percent = Math.min(100, Math.round((count / 18) * 100));

                            return (
                                <button
                                    key={key}
                                    onClick={() => {
                                        vibrate(10);
                                        setActiveExercise(key);
                                        setActiveTab('plan');
                                    }}
                                    className="bg-white p-5 rounded-[2rem] border border-slate-100 hover:border-blue-200 active-scale transition-all text-left shadow-sm flex flex-col justify-between animate-in slide-in-from-bottom-8 fade-in duration-700 fill-mode-backwards"
                                    style={{ animationDelay: `${(index * 50) + 400}ms` }}
                                >
                                    <div className="mb-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${key === 'pushups' ? 'bg-blue-50 text-blue-600' :
                                            key === 'squats' ? 'bg-orange-50 text-orange-600' :
                                                'bg-slate-50 text-slate-600'
                                            }`}>
                                            {React.cloneElement(ex.icon, { size: 22, strokeWidth: 2.5 })}
                                        </div>
                                        <h3 className="text-sm font-black text-slate-900 truncate tracking-tight">{ex.name}</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{percent}%</p>
                                    </div>

                                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-slate-900 rounded-full transition-all duration-1000 ease-out"
                                            style={{ width: `${percent}%` }}
                                        />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Right Col: Recent Activity */}
                <div className="space-y-6">
                    <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-xl shadow-slate-200/50 animate-in slide-in-from-right-8 fade-in duration-700 delay-500">
                        <h3 className="text-lg font-black mb-6 tracking-tight flex items-center gap-2">
                            Activity Log
                        </h3>

                        <div className="space-y-4">
                            {sessionHistory.length > 0 ? sessionHistory.slice(0, 5).map((session, i) => (
                                <div key={i} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                                    <div className="w-10 h-10 rounded-xl bg-slate-950 text-white flex items-center justify-center shrink-0">
                                        {React.cloneElement(EXERCISE_PLANS[session.exerciseKey].icon, { size: 18 })}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-slate-900 truncate">
                                            {EXERCISE_PLANS[session.exerciseKey].name}
                                        </p>
                                        <p className="text-[10px] font-bold text-slate-400 capitalize">
                                            {new Date(session.date).toLocaleDateString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-black text-blue-600">+{session.volume}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{session.unit}</p>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-10">
                                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3">
                                        <Info className="text-slate-200" size={24} />
                                    </div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No activity yet</p>
                                </div>
                            )}
                        </div>

                        {sessionHistory.length > 5 && (
                            <button className="w-full mt-6 py-3 border-t border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">
                                View Full History
                            </button>
                        )}
                    </div>

                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-6 text-white shadow-xl shadow-blue-900/20 active-scale group">
                        <div className="flex justify-between items-start mb-4">
                            <Volume2 size={24} className="opacity-50" />
                            <span className="bg-white/10 px-2 py-1 rounded text-[10px] font-bold uppercase">Pro Tip</span>
                        </div>
                        <p className="text-sm font-bold leading-relaxed opacity-90">
                            "Strength doesn't come from what you can do. It comes from overcoming the things you once thought you couldn't."
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

import { calculateStats, getUnlockedBadges, BADGES } from '../../utils/gamification';

const GamificationSection = ({ completedDays, sessionHistory }) => {
    const stats = calculateStats(completedDays, sessionHistory);
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
