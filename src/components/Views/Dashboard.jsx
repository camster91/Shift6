import React, { useState, useEffect } from 'react';
import { Trophy, Zap, LayoutDashboard, CheckCircle2, X, Volume2, Info } from 'lucide-react';
import { EXERCISE_PLANS } from '../../data/exercises.jsx';
import { getDailyStack, getScheduleFocus } from '../../utils/schedule';
import { vibrate } from '../../utils/device';
import { calculateStats, getUnlockedBadges, BADGES } from '../../utils/gamification';

const GamificationSection = ({completedDays, sessionHistory}) => {
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

const Dashboard = ({ completedDays, sessionHistory, setActiveExercise, setActiveTab, startStack, workoutQueue, setWorkoutQueue }) => {
    const dailyStack = getDailyStack(completedDays);
    const [activeTooltip, setActiveTooltip] = useState(null);

    const dismissIntro = () => {
        localStorage.setItem('shift6_intro_dismissed', 'true');
    };

    return (
        <div className="space-y-12 pb-24">
            {/* Top Bar: Hero & Stats Summary */}
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-blue-600 font-black uppercase tracking-[0.3em] text-[10px] relative">
                            <Zap size={14} className="fill-blue-600" />
                            <button
                                onClick={() => setActiveTooltip(activeTooltip === 'system' ? null : 'system')}
                                className="flex items-center gap-1 hover:text-blue-400 transition-colors"
                            >
                                Status: Active <Info size={10} />
                            </button>
                            {activeTooltip === 'system' && (
                                <div className="absolute top-6 left-0 z-50 bg-slate-900 text-white text-[9px] p-3 rounded-xl w-48 border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                                    System is monitoring your progress and adjusting targets weekly.
                                </div>
                            )}
                        </div>
                        <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-slate-900 leading-none uppercase">Dashboard</h1>
                        <p className="text-slate-400 font-medium text-lg">Tracking your weekly progress.</p>
                    </div>
                </div>

                {/* Hero Section - Full Width */}
                {/* Hero Section - Full Width */}
                <div className="bg-slate-900 text-white p-8 md:p-12 rounded-3xl relative overflow-hidden shadow-[0_40px_80px_-15px_rgba(15,23,42,0.3)] ring-1 ring-white/10 mesh-bg selection:bg-blue-500/30">
                    <div className="absolute top-0 right-0 p-12 opacity-[0.03] transform translate-x-10 -translate-y-10">
                        <Trophy size={350} />
                    </div>

                    <div className="relative z-10 flex flex-col lg:flex-row gap-12 items-center">
                        <div className="flex-1 space-y-8 w-full">
                            <div>
                                <div className="flex items-center gap-2 mb-4 relative">
                                    <p className="text-blue-400 font-black uppercase tracking-[0.4em] text-[11px]">Volume History</p>
                                    <button
                                        onClick={() => setActiveTooltip(activeTooltip === 'volume' ? null : 'volume')}
                                        className="text-blue-400/50 hover:text-blue-400"
                                    >
                                        <Info size={12} />
                                    </button>
                                    {activeTooltip === 'volume' && (
                                        <div className="absolute top-6 left-0 z-50 bg-slate-800 text-white text-[10px] p-4 rounded-2xl w-64 border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-200 font-medium normal-case tracking-normal">
                                            Total volume (reps × sets) over the last 32 days.
                                        </div>
                                    )}
                                </div>
                                <h2 className="text-5xl md:text-7xl font-black mb-4 tracking-tighter leading-tight italic">Consistency</h2>
                                <p className="text-slate-400 text-lg font-medium leading-relaxed max-w-xl">
                                    Your volume is trending up. Keep hitting your daily targets to maintain momentum.
                                </p>
                            </div>

                            {/* Expanded Graph */}
                            <div className="flex items-end gap-1.5 h-28 bg-white/5 p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-sm">
                                {Array.from({ length: 32 }).map((_, i) => {
                                    const date = new Date();
                                    date.setDate(date.getDate() - (31 - i));
                                    const dateStr = date.toISOString().split('T')[0];
                                    const volume = sessionHistory
                                        .filter(s => s.date.startsWith(dateStr))
                                        .reduce((sum, s) => sum + s.volume, 0);
                                    const max = 250;
                                    const height = Math.min(100, (volume / max) * 100);
                                    return (
                                        <div key={i} className="flex-1 bg-white/[0.03] rounded-t-sm relative group h-full">
                                            <div
                                                className={`absolute bottom-0 left-0 right-0 bg-blue-500 rounded-t-sm transition-all ease-out`}
                                                style={{
                                                    height: `${Math.max(4, height)}%`,
                                                    opacity: volume > 0 ? 1 : 0.15,
                                                    transitionDuration: '1500ms',
                                                    transitionDelay: `${i * 20}ms`
                                                }}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="w-full lg:w-96 bg-white/5 backdrop-blur-2xl rounded-[3.5rem] p-12 border border-white/10 flex flex-col justify-between shadow-3xl">
                            <div className="space-y-4">
                                <div className="w-full lg:w-80 bg-white/5 backdrop-blur-2xl rounded-3xl p-8 border border-white/10 flex flex-col justify-between shadow-3xl">
                                    <div className="space-y-4">
                                        <p className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-500">Today's Focus</p>
                                        <h3 className="text-4xl font-black tracking-tighter">
                                            {workoutQueue.length > 0 ? `${workoutQueue.length + 1} Left` : (dailyStack.length > 0 ? `${dailyStack.length} Ex` : 'Done')}
                                        </h3>
                                        <div className="inline-block bg-blue-500/20 text-blue-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/30">
                                            {getScheduleFocus()}
                                        </div>
                                    </div>
                                    <div className="space-y-6 pt-8">
                                        {workoutQueue.length > 0 ? (
                                            <button
                                                onClick={() => { if (window.confirm('Cancel remaining exercises in this stack?')) setWorkoutQueue([]); }}
                                                className="w-full bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all border border-rose-500/20 active-scale"
                                            >
                                                End Session
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => { vibrate(20); startStack(); }}
                                                disabled={dailyStack.length === 0}
                                                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all shadow-[0_20px_50px_-10px_rgba(37,99,235,0.5)] active-scale group flex items-center justify-center gap-4"
                                            >
                                                Start Workout <Zap size={16} className="group-hover:animate-pulse fill-white" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                        {/* Side Pane (4 cols) */}
                        <div className="lg:col-span-4 space-y-12">
                            <GamificationSection completedDays={completedDays} sessionHistory={sessionHistory} />

                            <div className="bg-white rounded-[3.5rem] p-10 border border-slate-100 shadow-3xl shadow-slate-200/50 relative overflow-hidden group">
                                <h3 className="text-xl font-black mb-10 tracking-tight flex items-center justify-between">
                                    Activity Log
                                    <span className="text-[10px] bg-slate-100 px-3 py-1 rounded-full text-slate-400 font-black uppercase tracking-widest">Recent Sessions</span>
                                </h3>
                                <div className="space-y-8">
                                    {sessionHistory.length > 0 ? sessionHistory.slice(0, 5).map((session, i) => (
                                        <div key={i} className="flex items-center gap-6 group/item cursor-pointer">
                                            <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-900 flex items-center justify-center shrink-0 group-hover/item:bg-blue-600 group-hover/item:text-white transition-all transform group-hover/item:scale-110 shadow-sm">
                                                {React.cloneElement(EXERCISE_PLANS[session.exerciseKey].icon, { size: 24 })}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[13px] font-black text-slate-900 truncate uppercase tracking-tighter">
                                                    {EXERCISE_PLANS[session.exerciseKey].name}
                                                </p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-60">
                                                    {new Date(session.date).toLocaleDateString(undefined, { weekday: 'short', hour: '2-digit' })}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-blue-600">+{session.volume}</p>
                                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">{session.unit}</p>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="text-center py-16 opacity-30 font-black text-xs uppercase tracking-[0.4em] italic">No Telemetry recorded</div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-slate-900 rounded-[3.5rem] p-12 text-white shadow-3xl active-scale group relative overflow-hidden mesh-bg ring-1 ring-white/5">
                                <div
                                    className="absolute -bottom-10 -right-10 opacity-10 group-hover:scale-150 transition-transform pointer-events-none"
                                    style={{ transitionDuration: '2000ms' }}
                                >
                                    <Volume2 size={300} />
                                </div>
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-10">
                                        <Volume2 size={24} className="text-blue-500" />
                                        <span className="bg-white/10 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10">Mindset</span>
                                    </div>
                                    <p className="text-2xl font-black leading-tight mb-8 tracking-tighter italic opacity-95">
                                        "The elite are not born. They are calibrated through consistent failure."
                                    </p>
                                    <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-30">- Shift6 Philosophy</p>
                                </div>
                            </div>
                        </div>

                        {/* Main Content (8 cols) */}
                        <div className="lg:col-span-8 space-y-12">
                            <div className="flex items-center justify-between px-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-3 h-3 rounded-full bg-blue-600 animate-pulse" />
                                    <h2 className="text-3xl font-black tracking-tighter text-slate-900 uppercase italic">Training Matrix</h2>
                                </div>
                                <div className="h-[2px] flex-1 mx-8 bg-slate-100 hidden md:block" />
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{Object.keys(EXERCISE_PLANS).length} Active Nodes</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-10">
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
                                            className="bg-white p-8 rounded-3xl border border-slate-100 hover:border-blue-600 hover:shadow-[0_40px_70px_-20px_rgba(0,0,0,0.1)] transition-all duration-500 text-left shadow-[0_20px_40px_-5px_rgba(0,0,0,0.03)] flex flex-col justify-between group animate-in slide-in-from-bottom-10 fill-mode-backwards relative overflow-hidden active:scale-95"
                                            style={{ animationDelay: `${(index * 100)}ms` }}
                                        >
                                            <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.08] transition-opacity duration-700 pointer-events-none">
                                                {React.cloneElement(ex.icon, { size: 140 })}
                                            </div>

                                            <div className="mb-12 relative z-10">
                                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 transition-all group-hover:scale-110 group-hover:-rotate-6 duration-500 shadow-2xl bg-${ex.color}-600 text-white shadow-${ex.color}-900/20`}>
                                                    {React.cloneElement(ex.icon, { size: 32, strokeWidth: 2.5 })}
                                                </div>
                                                <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-2">{ex.name}</h3>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest">{percent}% Mastery</span>
                                                    <div className="h-[1px] w-8 bg-slate-100" />
                                                </div>
                                            </div>

                                            <div className="w-full bg-slate-50 h-3.5 rounded-full overflow-hidden p-1 border border-slate-100">
                                                <div
                                                    className={`h-full rounded-full transition-all ease-out shadow-sm bg-${ex.color}-600`}
                                                    style={{
                                                        width: `${percent}%`,
                                                        transitionDuration: '1500ms'
                                                    }}
                                                />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
