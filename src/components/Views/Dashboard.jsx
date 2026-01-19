import React, { useState } from 'react';
import { Zap, CheckCircle2 } from 'lucide-react';
import { EXERCISE_PLANS } from '../../data/exercises.jsx';
import { getDailyStack, getScheduleFocus } from '../../utils/schedule';
import { vibrate } from '../../utils/device';
import { calculateStats } from '../../utils/gamification';
import NeoIcon from '../Visuals/NeoIcon';
import DataBackground from '../Visuals/DataBackground';
import { BADGES, getUnlockedBadges } from '../../utils/gamification';

const Dashboard = ({ completedDays, sessionHistory, setActiveExercise, setActiveTab, startStack, workoutQueue, setWorkoutQueue }) => {
    const dailyStack = getDailyStack(completedDays);
    const stats = calculateStats(completedDays, sessionHistory);

    return (
        <div className="space-y-8 pb-24">
            {/* Compact Welcome Banner */}
            <div className="relative bg-slate-900 rounded-xl overflow-hidden border border-slate-800 hover:border-cyan-500/30 transition-colors">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent" />
                <div className="relative p-6 flex items-center justify-between">
                    <div>
                        <p className="text-xs text-cyan-400 font-semibold uppercase tracking-wider mb-1">{getScheduleFocus()}</p>
                        <h1 className="text-2xl font-bold text-white">
                            {dailyStack.length > 0
                                ? `${dailyStack.length} exercises today`
                                : (new Date().getDay() === 0 ? 'Rest Day' : 'All caught up')}
                        </h1>
                    </div>
                    {dailyStack.length > 0 && (
                        <button
                            onClick={() => { vibrate(20); startStack(); }}
                            className="px-5 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-900 rounded-lg font-bold text-sm transition-colors flex items-center gap-2"
                        >
                            <Zap size={16} className="fill-current" />
                            Start
                        </button>
                    )}
                </div>
            </div>

            {/* Achievement Badges - Functional */}
            {(() => {
                const unlockedBadges = getUnlockedBadges(stats);
                const totalBadges = BADGES.length;
                return (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-cyan-500/30 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-semibold text-white">Achievements</h2>
                            <span className="text-xs text-cyan-400 font-medium">{unlockedBadges.length}/{totalBadges}</span>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {BADGES.map((badge) => {
                                const isUnlocked = badge.condition(stats);
                                return (
                                    <div
                                        key={badge.id}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                                            isUnlocked
                                                ? 'bg-cyan-500/10 border-cyan-500/30 text-white'
                                                : 'bg-slate-800/50 border-slate-700 text-slate-500 opacity-50'
                                        }`}
                                        title={badge.desc}
                                    >
                                        <span className="text-lg">{badge.icon}</span>
                                        <span className="text-xs font-medium">{badge.name}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}

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

            {/* Volume History */}
            <div className="relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-cyan-500/30 transition-colors">
                <DataBackground type="grid" />
                <div className="relative p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-white">30-Day Activity</h2>
                        <span className="text-xs text-slate-500">{stats.totalSessions} total sessions</span>
                    </div>
                    <div className="flex items-end gap-1 h-24">
                        {Array.from({ length: 30 }).map((_, i) => {
                            const date = new Date();
                            date.setDate(date.getDate() - (29 - i));
                            const dateStr = date.toISOString().split('T')[0];
                            const volume = sessionHistory
                                .filter(s => s.date.startsWith(dateStr))
                                .reduce((sum, s) => sum + s.volume, 0);
                            const max = 250;
                            const height = Math.min(100, (volume / max) * 100);
                            return (
                                <div key={i} className="flex-1 bg-slate-800/60 relative h-full rounded-sm overflow-hidden">
                                    <div
                                        className="absolute bottom-0 left-0 right-0 bg-cyan-500 transition-all"
                                        style={{
                                            height: `${Math.max(2, height)}%`,
                                            opacity: volume > 0 ? 0.9 : 0.2,
                                        }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            {sessionHistory.length > 0 && (
                <div className="relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="absolute inset-0">
                        <DataBackground type="dots" />
                    </div>
                    <div className="relative p-6">
                        <h2 className="text-sm font-semibold text-white mb-4">Activity Log</h2>
                        <div className="space-y-1">
                            {sessionHistory.slice(0, 5).map((session, i) => (
                                <div key={i} className="flex items-center justify-between py-3 border-b border-slate-800 last:border-0 hover:bg-slate-800/50 px-3 -mx-3 rounded transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 flex items-center justify-center bg-slate-800 rounded text-cyan-400">
                                            {React.cloneElement(EXERCISE_PLANS[session.exerciseKey].icon, { size: 16 })}
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-slate-200">{EXERCISE_PLANS[session.exerciseKey].name}</div>
                                            <div className="text-xs text-slate-500">
                                                {new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-sm font-semibold text-white tabular-nums">{session.volume} <span className="text-xs text-slate-500 font-normal ml-1">{session.unit}</span></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Exercise Grid */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-slate-400 flex items-center gap-2">
                        Exercise Library
                    </h2>
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
                                className="bg-slate-900 border border-slate-800 rounded-lg hover:border-cyan-500/50 text-left transition-all group overflow-hidden hover:shadow-lg relative"
                            >
                                {/* Exercise Image */}
                                <div className="relative h-48 border-b border-slate-800 -mx-0 -mt-0 mb-4 overflow-hidden">
                                    {ex.image.startsWith('neo:') ? (
                                        <NeoIcon type={ex.image.split(':')[1]} />
                                    ) : (
                                        <img
                                            src={ex.image}
                                            alt={ex.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent pointer-events-none" />

                                    {/* Completion Check */}
                                    {count > 0 && (
                                        <div className="absolute top-3 right-3 bg-cyan-500 text-white p-1 rounded-full shadow-lg">
                                            <CheckCircle2 size={14} />
                                        </div>
                                    )}
                                </div>

                                <div className="px-5 pb-5 relative">
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="text-lg font-bold text-white mb-1">{ex.name}</h3>
                                        <div className="w-8 h-8 flex items-center justify-center rounded bg-slate-800 text-slate-400 group-hover:bg-cyan-500 group-hover:text-white transition-all">
                                            {React.cloneElement(ex.icon, { size: 16 })}
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-end mb-2">
                                        <div className="text-xs text-slate-500 font-medium">MASTERY TRACK</div>
                                        <div className="text-xs text-cyan-500 font-bold">{percent}%</div>
                                    </div>

                                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-cyan-500 transition-all duration-500"
                                            style={{ width: `${percent}%` }}
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
