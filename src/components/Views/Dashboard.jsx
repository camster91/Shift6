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
            {/* Hero Image Placeholder */}
            <div className="relative h-48 bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-6xl mb-2">💪</div>
                        <p className="text-xs text-slate-400 font-medium">Hero Image Placeholder</p>
                    </div>
                </div>
            </div>

            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
                <p className="text-sm text-slate-500">Track your progress and start your workout</p>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="border border-slate-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-slate-900">{stats.currentStreak}</div>
                    <div className="text-xs text-slate-500 mt-1">Day Streak</div>
                </div>
                <div className="border border-slate-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-slate-900">{stats.totalSessions}</div>
                    <div className="text-xs text-slate-500 mt-1">Total Sessions</div>
                </div>
                <div className="border border-slate-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-slate-900">{dailyStack.length}</div>
                    <div className="text-xs text-slate-500 mt-1">Today's Exercises</div>
                </div>
                <div className="border border-slate-200 rounded-lg p-4">
                    <div className="text-sm font-medium text-blue-600">{getScheduleFocus()}</div>
                    <div className="text-xs text-slate-500 mt-1">Current Focus</div>
                </div>
            </div>

            {/* Volume Graph & Action */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Volume History */}
                <div className="lg:col-span-2 border border-slate-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-slate-900">Volume History</h2>
                        <span className="text-xs text-slate-400">Last 32 days</span>
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
                                <div key={i} className="flex-1 bg-slate-50 relative h-full">
                                    <div
                                        className="absolute bottom-0 left-0 right-0 bg-blue-600"
                                        style={{
                                            height: `${Math.max(2, height)}%`,
                                            opacity: volume > 0 ? 1 : 0.2
                                        }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Quick Action */}
                <div className="border border-slate-200 rounded-lg p-6 flex flex-col justify-between">
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-slate-900">Today's Status</h3>
                        <div className="text-2xl font-bold text-slate-900">
                            {workoutQueue.length > 0 ? `${workoutQueue.length + 1} Left` : (dailyStack.length > 0 ? `${dailyStack.length} Remaining` : 'Complete')}
                        </div>
                    </div>
                    {workoutQueue.length > 0 ? (
                        <button
                            onClick={() => { if (window.confirm('End current workout session?')) setWorkoutQueue([]); }}
                            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 py-3 rounded-lg text-sm font-medium transition-colors mt-4"
                        >
                            End Session
                        </button>
                    ) : (
                        <button
                            onClick={() => { vibrate(20); startStack(); }}
                            disabled={dailyStack.length === 0}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg text-sm font-medium transition-colors mt-4 flex items-center justify-center gap-2"
                        >
                            <Zap size={16} />
                            Start Workout
                        </button>
                    )}
                </div>
            </div>

            {/* Recent Activity */}
            {sessionHistory.length > 0 && (
                <div className="border border-slate-200 rounded-lg p-6">
                    <h2 className="text-sm font-semibold text-slate-900 mb-4">Recent Activity</h2>
                    <div className="space-y-3">
                        {sessionHistory.slice(0, 5).map((session, i) => (
                            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded text-slate-600">
                                        {React.cloneElement(EXERCISE_PLANS[session.exerciseKey].icon, { size: 16 })}
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-slate-900">{EXERCISE_PLANS[session.exerciseKey].name}</div>
                                        <div className="text-xs text-slate-500">
                                            {new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-sm font-medium text-slate-900">{session.volume} {session.unit}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Exercise Grid */}
            <div>
                <h2 className="text-sm font-semibold text-slate-900 mb-4">All Exercises</h2>
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
                                className="border border-slate-200 rounded-lg hover:border-blue-600 text-left transition-colors group overflow-hidden"
                            >
                                {/* Exercise Image */}
                                <div className="relative h-40 border-b border-slate-200 -mx-0 -mt-0 mb-4 overflow-hidden rounded-t-lg">
                                    <img
                                        src={ex.image}
                                        alt={ex.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>

                                <div className="px-5 pb-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className={`w-10 h-10 flex items-center justify-center rounded bg-${ex.color}-100 text-${ex.color}-600`}>
                                            {React.cloneElement(ex.icon, { size: 20 })}
                                        </div>
                                        {count > 0 && (
                                            <CheckCircle2 size={16} className="text-green-600" />
                                        )}
                                    </div>
                                    <h3 className="text-base font-semibold text-slate-900 mb-1">{ex.name}</h3>
                                    <div className="text-xs text-slate-500 mb-3">{count}/18 days completed</div>
                                    <div className="w-full bg-slate-100 h-1 rounded-full">
                                        <div
                                            className={`h-full rounded-full bg-${ex.color}-600 transition-all`}
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
