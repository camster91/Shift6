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
        <div className="space-y-6 pb-24">
            {/* Elite Hero Banner */}
            <div className="relative h-56 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-cyan-500/20 rounded-xl overflow-hidden neon-border">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDYsMTgyLDIxMiwwLjEpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                    <h1 className="text-4xl md:text-5xl font-black text-white mb-2">
                        <span className="text-cyan-400 text-glow">TOTAL BODY</span>
                        <br />
                        <span className="text-white">MASTERY</span>
                    </h1>
                    <p className="text-sm text-cyan-400/70 tracking-wider font-semibold">ELITE TRAINING PROTOCOL</p>
                </div>
                {/* Corner Accents */}
                <div className="absolute top-0 left-0 w-20 h-20 border-l-2 border-t-2 border-cyan-400/50" />
                <div className="absolute top-0 right-0 w-20 h-20 border-r-2 border-t-2 border-cyan-400/50" />
                <div className="absolute bottom-0 left-0 w-20 h-20 border-l-2 border-b-2 border-cyan-400/50" />
                <div className="absolute bottom-0 right-0 w-20 h-20 border-r-2 border-b-2 border-cyan-400/50" />
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900/50 border border-cyan-500/20 rounded-lg p-4 backdrop-blur-sm">
                    <div className="text-2xl font-bold text-cyan-400">{stats.currentStreak}</div>
                    <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Day Streak</div>
                </div>
                <div className="bg-slate-900/50 border border-cyan-500/20 rounded-lg p-4 backdrop-blur-sm">
                    <div className="text-2xl font-bold text-cyan-400">{stats.totalSessions}</div>
                    <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Sessions</div>
                </div>
                <div className="bg-slate-900/50 border border-cyan-500/20 rounded-lg p-4 backdrop-blur-sm">
                    <div className="text-2xl font-bold text-cyan-400">{dailyStack.length}</div>
                    <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Today</div>
                </div>
                <div className="bg-slate-900/50 border border-cyan-500/20 rounded-lg p-4 backdrop-blur-sm">
                    <div className="text-sm font-medium text-cyan-400">{getScheduleFocus()}</div>
                    <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Focus</div>
                </div>
            </div>

            {/* Volume Graph & Action */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Volume History */}
                <div className="lg:col-span-2 bg-slate-900/50 border border-cyan-500/20 rounded-lg p-6 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">Volume Trajectory</h2>
                        <span className="text-xs text-slate-500">Last 32 days</span>
                    </div>
                    <div className="flex items-end gap-1 h-24">
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
                                <div key={i} className="flex-1 bg-slate-800/30 relative h-full rounded-sm">
                                    <div
                                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-cyan-500 to-cyan-400 rounded-sm"
                                        style={{
                                            height: `${Math.max(2, height)}%`,
                                            opacity: volume > 0 ? 1 : 0.2,
                                            boxShadow: volume > 0 ? '0 0 10px rgba(6,182,212,0.5)' : 'none'
                                        }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Quick Action */}
                <div className="bg-slate-900/50 border border-cyan-500/20 rounded-lg p-6 flex flex-col justify-between backdrop-blur-sm">
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">Daily Stack</h3>
                        <div className="text-2xl font-bold text-white">
                            {workoutQueue.length > 0 ? `${workoutQueue.length + 1} Left` : (dailyStack.length > 0 ? `${dailyStack.length} Remaining` : 'Complete')}
                        </div>
                    </div>
                    {workoutQueue.length > 0 ? (
                        <button
                            onClick={() => { if (window.confirm('End current workout session?')) setWorkoutQueue([]); }}
                            className="w-full bg-slate-800 hover:bg-slate-700 border border-cyan-500/30 text-cyan-400 py-3 rounded-lg text-sm font-medium transition-colors mt-4 uppercase tracking-wider"
                        >
                            End Session
                        </button>
                    ) : (
                        <button
                            onClick={() => { vibrate(20); startStack(); }}
                            disabled={dailyStack.length === 0}
                            className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 py-3 rounded-lg text-sm font-bold transition-all mt-4 flex items-center justify-center gap-2 uppercase tracking-wider animate-pulse-glow"
                        >
                            <Zap size={16} />
                            Launch Session
                        </button>
                    )}
                </div>
            </div>

            {/* Recent Activity */}
            {sessionHistory.length > 0 && (
                <div className="bg-slate-900/50 border border-cyan-500/20 rounded-lg p-6 backdrop-blur-sm">
                    <h2 className="text-sm font-semibold text-cyan-400 mb-4 uppercase tracking-wider">Activity Log</h2>
                    <div className="space-y-3">
                        {sessionHistory.slice(0, 5).map((session, i) => (
                            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 flex items-center justify-center bg-cyan-500/10 border border-cyan-500/30 rounded text-cyan-400">
                                        {React.cloneElement(EXERCISE_PLANS[session.exerciseKey].icon, { size: 16 })}
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-white">{EXERCISE_PLANS[session.exerciseKey].name}</div>
                                        <div className="text-xs text-slate-500">
                                            {new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-sm font-medium text-cyan-400">{session.volume} {session.unit}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Exercise Grid */}
            <div>
                <h2 className="text-sm font-semibold text-cyan-400 mb-4 uppercase tracking-wider">Exercise Library</h2>
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
                                className="bg-slate-900/50 border border-cyan-500/20 rounded-lg hover:border-cyan-500 text-left transition-all group overflow-hidden backdrop-blur-sm hover:scale-105"
                            >
                                {/* Exercise Image */}
                                <div className="relative h-40 border-b border-slate-800 -mx-0 -mt-0 mb-4 overflow-hidden rounded-t-lg">
                                    <img
                                        src={ex.image}
                                        alt={ex.name}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60" />
                                </div>

                                <div className="px-5 pb-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-10 h-10 flex items-center justify-center rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                                            {React.cloneElement(ex.icon, { size: 20 })}
                                        </div>
                                        {count > 0 && (
                                            <CheckCircle2 size={16} className="text-green-400" />
                                        )}
                                    </div>
                                    <h3 className="text-base font-semibold text-white mb-1">{ex.name}</h3>
                                    <div className="text-xs text-slate-400 mb-3">{count}/18 days completed</div>
                                    <div className="w-full bg-slate-800/50 h-1 rounded-full">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all"
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
