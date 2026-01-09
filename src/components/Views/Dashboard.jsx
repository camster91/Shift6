import React, { useState, useEffect } from 'react';
import { Trophy, Zap, LayoutDashboard, CheckCircle2, X, Volume2, Info } from 'lucide-react';
import { EXERCISE_PLANS } from '../../data/exercises.jsx';
import { getDailyStack, getScheduleFocus } from '../../utils/schedule';
import { vibrate } from '../../utils/device';
import { calculateStats, getUnlockedBadges, BADGES } from '../../utils/gamification';

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
        <div className="space-y-8 pb-20">
            {/* Header / Intro Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900">Command Center</h1>
                    <p className="text-slate-500 font-medium whitespace-nowrap">Welcome back, Elite. Your trajectory is climbing.</p>
                </div>
                {showIntro && (
                    <div className="bg-slate-900 rounded-2xl p-4 pr-10 text-white shadow-xl relative overflow-hidden mesh-bg border border-white/5 animate-in slide-in-from-right-4 duration-500">
                        <button onClick={dismissIntro} className="absolute top-2 right-2 p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                            <X size={14} />
                        </button>
                        <p className="text-[11px] font-bold leading-tight opacity-90 max-w-xs">
                            <span className="text-blue-400">Pro Tip:</span> Track your failure points to calibrate your elite baseline.
                        </p>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Stats & Trajectory (4 cols) */}
                <div className="lg:col-span-4 space-y-8 order-2 lg:order-1">
                    <GamificationSection completedDays={completedDays} sessionHistory={sessionHistory} />

                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 text-slate-50 opacity-[0.05] group-hover:opacity-10 transition-opacity">
                            <Zap size={140} />
                        </div>
                        <h3 className="text-lg font-black mb-6 tracking-tight flex items-center gap-2">
                            Activity Log
                        </h3>
                        <div className="space-y-5">
                            {sessionHistory.length > 0 ? sessionHistory.slice(0, 4).map((session, i) => (
                                <div key={i} className="flex items-center gap-4 group/item">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center shrink-0 group-hover/item:bg-blue-600 group-hover/item:text-white transition-colors">
                                        {React.cloneElement(EXERCISE_PLANS[session.exerciseKey].icon, { size: 18 })}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-slate-900 truncate uppercase tracking-tighter">
                                            {EXERCISE_PLANS[session.exerciseKey].name}
                                        </p>
                                        <p className="text-[9px] font-bold text-slate-400">
                                            {new Date(session.date).toLocaleDateString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-black text-blue-600">+{session.volume}</p>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-8 opacity-50 font-bold text-xs uppercase tracking-widest italic">No Data Recorded</div>
                            )}
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-blue-900/30 active-scale group relative overflow-hidden">
                        <div className="absolute -bottom-10 -right-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
                            <Trophy size={200} />
                        </div>
                        <div className="flex justify-between items-start mb-6">
                            <Volume2 size={24} className="opacity-50" />
                            <span className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">Mindset</span>
                        </div>
                        <p className="text-lg font-black leading-tight mb-4 tracking-tight">
                            "The elite are not born. They are calibrated through consistent failure."
                        </p>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-50">- Shift6 Philosophy</p>
                    </div>
                </div>

                {/* Center/Right Column: Hero & Daily Stack & Progress (8 cols) */}
                <div className="lg:col-span-8 space-y-8 order-1 lg:order-2">
                    {/* Hero Section */}
                    <div className="bg-slate-900 text-white p-10 rounded-[3rem] relative overflow-hidden shadow-2xl ring-1 ring-white/10 mesh-bg">
                        <div className="absolute top-0 right-0 p-12 opacity-[0.03] transform translate-x-10 -translate-y-10">
                            <Trophy size={350} />
                        </div>

                        <div className="relative z-10 flex flex-col md:flex-row gap-10">
                            <div className="flex-1 space-y-8">
                                <div>
                                    <p className="text-blue-400 font-black uppercase tracking-[0.2em] text-[10px] mb-3">Volume Trajectory</p>
                                    <h2 className="text-4xl md:text-6xl font-black mb-4 tracking-tighter">Elite Potential</h2>
                                    <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-md">
                                        Your consistent execution is translating into pure power. The data shows an upward shift in failure points across all domains.
                                    </p>
                                </div>

                                <div className="flex items-end gap-1.5 h-16 bg-white/5 p-4 rounded-3xl border border-white/5">
                                    {Array.from({ length: 21 }).map((_, i) => {
                                        const date = new Date();
                                        date.setDate(date.getDate() - (20 - i));
                                        const dateStr = date.toISOString().split('T')[0];
                                        const volume = sessionHistory
                                            .filter(s => s.date.startsWith(dateStr))
                                            .reduce((sum, s) => sum + s.volume, 0);
                                        const max = 200;
                                        const height = Math.min(100, (volume / max) * 100);
                                        return (
                                            <div key={i} className="flex-1 bg-white/5 rounded-t-[2px] relative group h-full">
                                                <div
                                                    className={`absolute bottom-0 left-0 right-0 bg-blue-500 rounded-t-[2px] transition-all duration-1000 delay-${i * 50}`}
                                                    style={{ height: `${Math.max(5, height)}%`, opacity: volume > 0 ? 1 : 0.2 }}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="w-full md:w-64 bg-white/5 backdrop-blur-xl rounded-[2rem] p-6 border border-white/10 flex flex-col justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Daily Goal</p>
                                    <h3 className="text-xl font-black">{dailyStack.length > 0 ? `${dailyStack.length} Exercises` : 'Complete'}</h3>
                                </div>
                                <div className="space-y-4 pt-6">
                                    <div className="flex justify-between items-center text-xs font-bold border-b border-white/5 pb-2">
                                        <span className="text-slate-500">Focus</span>
                                        <span className="text-blue-400 uppercase tracking-widest text-[9px]">{getScheduleFocus()}</span>
                                    </div>
                                    <button
                                        onClick={() => { vibrate(20); startStack(); }}
                                        disabled={dailyStack.length === 0}
                                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-blue-900/50 active-scale"
                                    >
                                        Start Stack
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Progress Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6">
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
                                    className="bg-white p-6 rounded-[2.5rem] border border-slate-100 hover:border-blue-200 hover:shadow-lg transition-all text-left shadow-sm flex flex-col justify-between group animate-in slide-in-from-bottom-4 fill-mode-backwards"
                                    style={{ animationDelay: `${(index * 100)}ms` }}
                                >
                                    <div className="mb-6">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-500 ${key === 'pushups' ? 'bg-blue-50 text-blue-600' :
                                            key === 'squats' ? 'bg-orange-50 text-orange-600' :
                                                key === 'pullups' ? 'bg-indigo-50 text-indigo-600' :
                                                    key === 'plank' ? 'bg-green-50 text-green-600' :
                                                        'bg-rose-50 text-rose-600'
                                            }`}>
                                            {React.cloneElement(ex.icon, { size: 26, strokeWidth: 2.5 })}
                                        </div>
                                        <h3 className="text-sm font-black text-slate-900 tracking-tighter uppercase mb-1">{ex.name}</h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{percent}% Mastery</p>
                                    </div>

                                    <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden p-[2px]">
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
            </div>
        </div>
    );
};

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
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Latest Achievements</h3>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {unlocked.length > 0 ? unlocked.map(badge => (
                        <div key={badge.id} className="min-w-[80px] flex flex-col items-center text-center p-2 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-2xl mb-1 filter drop-shadow-sm">{badge.icon}</span>
                            <span className="text-[10px] font-bold text-slate-700 leading-tight">{badge.name}</span>
                        </div>
                    )) : (
                        <p className="text-sm text-slate-500 italic">Complete workouts to unlock badges!</p>
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
