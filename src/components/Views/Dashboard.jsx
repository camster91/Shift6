import React, { useState } from 'react';
import { Zap, CheckCircle2 } from 'lucide-react';
import { EXERCISE_PLANS } from '../../data/exercises.jsx';
import { getDailyStack, getScheduleFocus } from '../../utils/schedule';
import { vibrate } from '../../utils/device';
import { calculateStats } from '../../utils/gamification';

const Dashboard = ({ completedDays, sessionHistory, setActiveExercise, setActiveTab, startStack, workoutQueue, setWorkoutQueue }) => {
    const dailyStack = getDailyStack(completedDays);
    const stats = calculateStats(completedDays, sessionHistory);

    return (
        <div className="space-y-8 pb-24">
            {/* Elite Hero Banner */}
            <div className="relative h-64 md:h-80 bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-cyan-500/20 group">
                <div className="absolute inset-0">
                    <img 
                        src="/assets/images/hero-elite.png" 
                        alt="Shift6 Elite" 
                        className="w-full h-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/40 to-transparent" />
                </div>
                
                <div className="absolute inset-0 flex flex-col justify-center p-8 md:p-12 relative z-10">
                    <div className="inline-block px-3 py-1 bg-cyan-500/10 border border-cyan-400/30 rounded-full text-cyan-400 text-xs font-bold tracking-[0.2em] mb-4 w-fit backdrop-blur-md">
                        ELITE PROTOCOL
                    </div>
                    <h1 className="text-5xl md:text-6xl font-black text-white mb-2 tracking-tight">
                        SHIFT<span className="text-cyan-400">6</span>
                    </h1>
                    <p className="text-lg text-slate-300 font-light tracking-wide max-w-md border-l-2 border-cyan-500 pl-4">
                        TOTAL BODY <span className="text-white font-bold">MASTERY</span>
                    </p>
                </div>
            </div>

            {/* Achievement Badges Section */}
            <div>
                <h2 className="text-sm font-semibold text-cyan-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-8 h-[1px] bg-cyan-500/50"></span>
                    Achievements
                </h2>
                <div className="relative bg-slate-900/50 border border-cyan-500/20 rounded-xl p-6 overflow-hidden backdrop-blur-sm group">
                    <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-10 transition-opacity" />
                    <img 
                        src="/assets/images/badges-composite.png" 
                        alt="Achievements" 
                        className="w-full h-auto object-contain max-h-32 md:max-h-40 filter drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                    />
                    <div className="mt-4 flex justify-between text-xs text-slate-400 font-medium uppercase tracking-wider px-4">
                        <span>First Step</span>
                        <span>Week Warrior</span>
                        <span>On Fire</span>
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Day Streak', value: stats.currentStreak },
                    { label: 'Sessions', value: stats.totalSessions },
                    { label: 'Today', value: dailyStack.length },
                    { label: 'Focus', value: getScheduleFocus(), isText: true }
                ].map((stat, i) => (
                    <div key={i} className="bg-slate-900/80 border border-cyan-500/20 rounded-lg p-4 backdrop-blur-md hover:border-cyan-500/40 transition-colors relative overflow-hidden">
                         <div className="relative z-10">
                            <div className={`text-2xl font-bold ${stat.isText ? 'text-sm' : 'text-cyan-400'}`}>{stat.value}</div>
                            <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest">{stat.label}</div>
                         </div>
                    </div>
                ))}
            </div>

            {/* Volume Graph & Action */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Volume History */}
                <div className="lg:col-span-2 relative bg-slate-900 border border-cyan-500/20 rounded-xl overflow-hidden group">
                     {/* Data Viz Background */}
                     <div className="absolute inset-0">
                        <img 
                            src="/assets/images/dataviz-bg.png" 
                            alt="Data Viz" 
                            className="w-full h-full object-cover opacity-20 mix-blend-screen"
                        />
                        <div className="absolute inset-0 bg-slate-900/60" />
                     </div>

                    <div className="relative p-6 h-full flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">Volume Trajectory</h2>
                            <span className="text-xs text-cyan-500/50 font-mono">LIVE DATA</span>
                        </div>
                        <div className="flex items-end gap-1 h-32 mt-auto">
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
                                    <div key={i} className="flex-1 bg-slate-800/40 relative h-full rounded-sm overflow-hidden group/bar">
                                        <div
                                            className="absolute bottom-0 left-0 right-0 bg-cyan-500 group-hover/bar:bg-cyan-400 transition-all duration-300"
                                            style={{
                                                height: `${Math.max(2, height)}%`,
                                                opacity: volume > 0 ? 0.8 : 0.1,
                                                boxShadow: volume > 0 ? '0 0 15px rgba(6,182,212,0.4)' : 'none'
                                            }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Quick Action */}
                <div className="bg-slate-900/80 border border-cyan-500/20 rounded-xl p-6 flex flex-col justify-between backdrop-blur-md shadow-lg shadow-cyan-900/5">
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">Daily Stack</h3>
                        <div className="text-3xl font-black text-white tracking-tight">
                            {workoutQueue.length > 0 ? `${workoutQueue.length + 1} LEFT` : (dailyStack.length > 0 ? `${dailyStack.length} READY` : 'DONE')}
                        </div>
                    </div>
                    {workoutQueue.length > 0 ? (
                        <button
                            onClick={() => { if (window.confirm('End current workout session?')) setWorkoutQueue([]); }}
                            className="w-full bg-slate-800 hover:bg-red-500/10 hover:text-red-400 border border-cyan-500/30 text-cyan-400 py-4 rounded-lg text-sm font-bold transition-all mt-4 uppercase tracking-wider"
                        >
                            End Session
                        </button>
                    ) : (
                        <button
                            onClick={() => { vibrate(20); startStack(); }}
                            disabled={dailyStack.length === 0}
                            className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 py-4 rounded-lg text-sm font-bold transition-all mt-4 flex items-center justify-center gap-2 uppercase tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]"
                        >
                            <Zap size={18} className="fill-slate-900" />
                            Launch Session
                        </button>
                    )}
                </div>
            </div>

            {/* Pro Tip Card */}
            <div>
                 <div className="relative rounded-xl overflow-hidden border border-cyan-500/30 group cursor-default">
                    <div className="absolute inset-0">
                         <img 
                            src="/assets/images/protip-card.png"
                            alt="Pro Tip"
                            className="w-full h-full object-cover opacity-40"
                         />
                         <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/80 to-transparent" />
                    </div>
                    <div className="relative p-6 md:p-8">
                        <span className="text-cyan-400 font-bold text-xs tracking-[0.2em] uppercase mb-2 block">Mindset</span>
                        <blockquote className="text-xl md:text-2xl font-light text-white italic max-w-2xl leading-relaxed">
                            "Strength doesn't come from what you can do. It comes from overcoming the things you once thought you couldn't."
                        </blockquote>
                    </div>
                 </div>
            </div>

            {/* Recent Activity */}
            {sessionHistory.length > 0 && (
                <div className="relative bg-slate-900 border border-cyan-500/20 rounded-xl overflow-hidden">
                     <div className="absolute inset-0">
                        <img 
                            src="/assets/images/dataviz-bg.png" 
                            alt="Data Viz" 
                            className="w-full h-full object-cover opacity-10 rotate-180"
                        />
                     </div>
                    <div className="relative p-6">
                        <h2 className="text-sm font-semibold text-cyan-400 mb-4 uppercase tracking-wider">Activity Log</h2>
                        <div className="space-y-3">
                            {sessionHistory.slice(0, 5).map((session, i) => (
                                <div key={i} className="flex items-center justify-between py-3 border-b border-slate-800/50 last:border-0 hover:bg-white/5 px-2 -mx-2 rounded transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 flex items-center justify-center bg-cyan-500/10 border border-cyan-500/30 rounded text-cyan-400">
                                            {React.cloneElement(EXERCISE_PLANS[session.exerciseKey].icon, { size: 16 })}
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-white">{EXERCISE_PLANS[session.exerciseKey].name}</div>
                                            <div className="text-xs text-slate-500 font-mono">
                                                {new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-sm font-bold text-cyan-400 font-mono">{session.volume} <span className="text-[10px] text-slate-500 font-normal ml-1">{session.unit}</span></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Exercise Grid - Now with Icons Composite Header */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">Exercise Library</h2>
                </div>
                
                {/* Visual Guide Banner */}
                <div className="mb-6 rounded-lg overflow-hidden border border-cyan-500/10 opacity-80 hover:opacity-100 transition-opacity">
                    <img src="/assets/images/icons-composite.png" alt="Exercise Form" className="w-full h-32 object-cover object-center" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(EXERCISE_PLANS).map(([key, ex]) => {
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
                                className="bg-slate-900 border border-slate-800 rounded-lg hover:border-cyan-500 text-left transition-all group overflow-hidden hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] relative"
                            >
                                {/* Exercise Image */}
                                <div className="relative h-48 border-b border-slate-800 -mx-0 -mt-0 mb-4 overflow-hidden">
                                    <img
                                        src={ex.image}
                                        alt={ex.name}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 saturate-0 group-hover:saturate-100"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent" />
                                    
                                    {/* Completion Check */}
                                    {count > 0 && (
                                        <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur text-cyan-400 p-1 rounded-full border border-cyan-500/30">
                                            <CheckCircle2 size={14} />
                                        </div>
                                    )}
                                </div>

                                <div className="px-5 pb-5 relative">
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="text-lg font-bold text-white mb-1 group-hover:text-cyan-400 transition-colors">{ex.name}</h3>
                                        <div className="w-8 h-8 flex items-center justify-center rounded bg-slate-800 text-slate-400 group-hover:bg-cyan-500 group-hover:text-slate-900 transition-all">
                                            {React.cloneElement(ex.icon, { size: 16 })}
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-between items-end mb-2">
                                         <div className="text-xs text-slate-500 font-mono">MASTERY TRACK</div>
                                         <div className="text-xs text-cyan-400 font-bold">{percent}%</div>
                                    </div>
                                    
                                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-cyan-500 transition-all duration-500"
                                            style={{ width: `${percent}%`, boxShadow: '0 0 10px rgba(6,182,212,0.5)' }}
                                        />
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
