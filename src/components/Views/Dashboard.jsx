import { useState } from 'react';
import { Zap, ChevronRight, Flame, Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import { EXERCISE_PLANS } from '../../data/exercises.jsx';
import { getDailyStack, getScheduleFocus } from '../../utils/schedule';
import { vibrate } from '../../utils/device';
import { calculateStats, getPersonalRecords } from '../../utils/gamification';
import { BADGES, getUnlockedBadges } from '../../utils/gamification';
import NeoIcon from '../Visuals/NeoIcon';
import CalendarView from './CalendarView';

const Dashboard = ({ completedDays, sessionHistory, setActiveExercise, setActiveTab, startStack }) => {
    const dailyStack = getDailyStack(completedDays);
    const stats = calculateStats(completedDays, sessionHistory);
    const personalRecords = getPersonalRecords(sessionHistory);
    const [showMore, setShowMore] = useState(false);

    // Get today's completed workouts
    const today = new Date().toISOString().split('T')[0];
    const todayWorkouts = sessionHistory.filter(s => s.date.startsWith(today));

    // Determine if it's a rest day
    const isRestDay = new Date().getDay() === 0;

    return (
        <div className="space-y-6 pb-24">
            {/* Today's Summary - Only show if worked out today */}
            {todayWorkouts.length > 0 && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                            <Trophy className="text-emerald-400" size={20} />
                        </div>
                        <div>
                            <p className="text-emerald-400 text-sm font-bold">Great work today!</p>
                            <p className="text-slate-300 text-xs">
                                You completed {todayWorkouts.map(w => EXERCISE_PLANS[w.exerciseKey]?.name).join(' & ')}
                            </p>
                        </div>
                    </div>
                    {dailyStack.length > 0 && (
                        <button
                            onClick={() => { vibrate(20); startStack(); }}
                            className="mt-3 w-full py-2 text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                            Want to do more? →
                        </button>
                    )}
                </div>
            )}

            {/* Main CTA - Next Workout */}
            {dailyStack.length > 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="p-6 border-b border-slate-800">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-cyan-400 font-semibold uppercase tracking-wider mb-1">
                                    {getScheduleFocus()}
                                </p>
                                <h1 className="text-2xl font-bold text-white">
                                    {dailyStack.length} exercise{dailyStack.length > 1 ? 's' : ''} ready
                                </h1>
                            </div>
                            <button
                                onClick={() => { vibrate(20); startStack(); }}
                                className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-900 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 shadow-lg shadow-cyan-500/20"
                            >
                                <Zap size={18} className="fill-current" />
                                Start All
                            </button>
                        </div>
                    </div>

                    {/* Next Workout Cards */}
                    <div className="p-4 space-y-3">
                        {dailyStack.map((item, i) => {
                            const ex = EXERCISE_PLANS[item.exerciseKey];
                            const pr = personalRecords[item.exerciseKey];
                            const dayNum = (completedDays[item.exerciseKey]?.length || 0) + 1;

                            return (
                                <button
                                    key={i}
                                    onClick={() => {
                                        vibrate(10);
                                        setActiveExercise(item.exerciseKey);
                                        setActiveTab('plan');
                                    }}
                                    className="w-full flex items-center gap-4 p-4 bg-slate-800/50 hover:bg-slate-800 rounded-xl transition-all group"
                                >
                                    {/* Exercise Icon/Image */}
                                    <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border border-slate-700">
                                        {ex.image.startsWith('neo:') ? (
                                            <div className="w-full h-full">
                                                <NeoIcon type={ex.image.split(':')[1]} />
                                            </div>
                                        ) : (
                                            <img src={ex.image} alt={ex.name} className="w-full h-full object-cover" />
                                        )}
                                    </div>

                                    {/* Exercise Info */}
                                    <div className="flex-1 text-left">
                                        <h3 className="text-white font-bold">{ex.name}</h3>
                                        <p className="text-xs text-slate-400">
                                            Day {dayNum} of 18
                                            {pr && <span className="text-amber-400 ml-2">PR: {pr.volume}</span>}
                                        </p>
                                    </div>

                                    {/* Arrow */}
                                    <ChevronRight className="text-slate-500 group-hover:text-cyan-400 transition-colors" size={20} />
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : (
                /* Rest Day / All Caught Up */
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
                    <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        {isRestDay ? (
                            <span className="text-3xl">😴</span>
                        ) : (
                            <Trophy className="text-cyan-400" size={28} />
                        )}
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">
                        {isRestDay ? 'Rest Day' : 'All Caught Up!'}
                    </h2>
                    <p className="text-sm text-slate-400 mb-4">
                        {isRestDay
                            ? 'Take it easy today. Recovery is part of the process.'
                            : 'You\'re on track. Check back tomorrow for your next workout.'}
                    </p>
                </div>
            )}

            {/* Streak Display - Simple and focused */}
            {stats.currentStreak > 0 && (
                <div className="flex items-center justify-center gap-3 py-4">
                    <Flame className="text-orange-500" size={24} />
                    <span className="text-2xl font-bold text-white">{stats.currentStreak}</span>
                    <span className="text-slate-400 text-sm">day streak</span>
                </div>
            )}

            {/* Collapsible "More" Section */}
            <button
                onClick={() => setShowMore(!showMore)}
                className="w-full flex items-center justify-center gap-2 py-3 text-sm text-slate-400 hover:text-slate-300 transition-colors"
            >
                {showMore ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {showMore ? 'Show less' : 'View progress & achievements'}
            </button>

            {showMore && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    {/* Achievements - Compact */}
                    {(() => {
                        const unlockedBadges = getUnlockedBadges(stats);
                        return (
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-semibold text-white">Achievements</h3>
                                    <span className="text-xs text-cyan-400">{unlockedBadges.length}/{BADGES.length}</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {BADGES.map((badge) => {
                                        const isUnlocked = badge.condition(stats);
                                        return (
                                            <div
                                                key={badge.id}
                                                className={`px-2 py-1 rounded-lg text-xs ${
                                                    isUnlocked
                                                        ? 'bg-cyan-500/10 text-cyan-400'
                                                        : 'bg-slate-800/50 text-slate-600'
                                                }`}
                                                title={badge.desc}
                                            >
                                                {badge.icon} {badge.name}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Calendar */}
                    <CalendarView sessionHistory={sessionHistory} />

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
                            <div className="text-2xl font-bold text-cyan-400">{stats.totalSessions}</div>
                            <div className="text-xs text-slate-500 uppercase">Total Workouts</div>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
                            <div className="text-2xl font-bold text-cyan-400">{stats.completedPlans}</div>
                            <div className="text-xs text-slate-500 uppercase">Plans Mastered</div>
                        </div>
                    </div>

                    {/* All Exercises Link */}
                    <button
                        onClick={() => setActiveTab('plan')}
                        className="w-full py-4 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-medium text-slate-300 transition-colors"
                    >
                        View All Exercises →
                    </button>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
