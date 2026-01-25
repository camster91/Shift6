import { useState, memo } from 'react'
import { Trophy, Flame, Target, TrendingUp, Calendar as CalendarIcon, ChevronDown, ChevronUp, Award, Zap, Dumbbell } from 'lucide-react'
import { calculateStats, getUnlockedBadges, BADGES, calculateStreakWithGrace, getStreakStatus, getPersonalRecords } from '../../utils/gamification'
import CalendarView from './CalendarView'
import ProgressChart from '../Visuals/ProgressChart'
import NeonBadge from '../Visuals/NeonBadge'
import NeoIcon from '../Visuals/NeoIcon'

// Stats card component
const StatCard = ({ icon: Icon, label, value, subValue, color = 'cyan' }) => {
    const colorClasses = {
        cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
        orange: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
        emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
        amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    }

    return (
        <div className={`p-4 rounded-xl border ${colorClasses[color]} flex items-center gap-3`}>
            <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center`}>
                <Icon size={20} />
            </div>
            <div>
                <p className={`text-2xl font-bold ${colorClasses[color].split(' ')[0]}`}>{value}</p>
                <p className="text-xs text-slate-500">{label}</p>
                {subValue && <p className="text-[10px] text-slate-600">{subValue}</p>}
            </div>
        </div>
    )
}

// Badge display component
const BadgeItem = ({ badge, isUnlocked }) => {
    const rarityColors = {
        common: 'from-slate-400 to-slate-500',
        uncommon: 'from-emerald-400 to-emerald-500',
        rare: 'from-blue-400 to-blue-500',
        epic: 'from-purple-400 to-purple-500',
        legendary: 'from-amber-400 to-orange-500',
    }

    return (
        <div
            className={`relative p-3 rounded-xl border transition-all ${
                isUnlocked
                    ? 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                    : 'bg-slate-900/50 border-slate-800/50 opacity-40'
            }`}
            title={badge.desc}
        >
            <div className="flex items-center gap-2">
                <span className="text-xl">{badge.icon}</span>
                <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold truncate ${isUnlocked ? 'text-white' : 'text-slate-500'}`}>
                        {badge.name}
                    </p>
                    {isUnlocked && badge.rarity && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full bg-gradient-to-r ${rarityColors[badge.rarity]} text-white font-semibold`}>
                            {badge.rarity}
                        </span>
                    )}
                </div>
            </div>
            {!isUnlocked && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-slate-600 text-lg">?</span>
                </div>
            )}
        </div>
    )
}

// Color classes for exercise themes
const colorClasses = {
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', solid: 'bg-blue-500' },
    orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', solid: 'bg-orange-500' },
    cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', solid: 'bg-cyan-500' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', solid: 'bg-emerald-500' },
    yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', solid: 'bg-yellow-500' },
    teal: { bg: 'bg-teal-500/10', border: 'border-teal-500/30', text: 'text-teal-400', solid: 'bg-teal-500' },
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', solid: 'bg-purple-500' },
    pink: { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-400', solid: 'bg-pink-500' },
    indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400', solid: 'bg-indigo-500' },
}

const Progress = ({
    completedDays,
    sessionHistory,
    allExercises,
    activeProgram,
    startWorkout,
    theme = 'dark',
    sprints = {},
    getExerciseSprintProgress = null
}) => {
    const [showAllBadges, setShowAllBadges] = useState(false)
    const [activeSection, setActiveSection] = useState('overview') // overview, achievements, calendar

    // Calculate all stats
    const stats = calculateStats(completedDays, sessionHistory)
    const unlockedBadges = getUnlockedBadges(stats)
    const personalRecords = getPersonalRecords(sessionHistory)
    const streakData = calculateStreakWithGrace(sessionHistory)
    const streakStatus = getStreakStatus(streakData)

    // Count total PRs
    const prCount = Object.keys(personalRecords).length

    // Streak colors
    const streakColors = {
        inactive: 'text-slate-400',
        danger: 'text-red-400',
        warning: 'text-yellow-400',
        active: 'text-orange-400',
        hot: 'text-orange-500',
        legendary: 'text-amber-400'
    }

    const bgColor = theme === 'light' ? 'bg-slate-100' : 'bg-slate-950'
    const cardBg = theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'

    return (
        <div className="space-y-6 pb-24">
            {/* Section Tabs */}
            <div className={`${cardBg} rounded-xl p-1 flex gap-1 border`}>
                {['overview', 'achievements', 'calendar'].map((section) => (
                    <button
                        key={section}
                        onClick={() => setActiveSection(section)}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all capitalize ${
                            activeSection === section
                                ? 'bg-cyan-500/20 text-cyan-400'
                                : theme === 'light'
                                    ? 'text-slate-600 hover:bg-slate-100'
                                    : 'text-slate-400 hover:bg-slate-800'
                        }`}
                    >
                        {section}
                    </button>
                ))}
            </div>

            {/* Overview Section */}
            {activeSection === 'overview' && (
                <div className="space-y-6">
                    {/* Current Streak Hero */}
                    <div className={`${cardBg} rounded-xl p-6 border text-center`}>
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <span className="text-4xl">{streakStatus.emoji}</span>
                        </div>
                        <p className={`text-5xl font-black ${streakColors[streakStatus.status]}`}>
                            {streakData.streak}
                        </p>
                        <p className="text-sm text-slate-400 mt-1">Day Streak</p>
                        {streakData.message && (
                            <p className="text-xs text-slate-500 mt-2">{streakData.message}</p>
                        )}
                        {streakData.isAtRisk && streakData.streak > 0 && (
                            <p className={`text-xs mt-3 ${streakStatus.status === 'danger' ? 'text-red-400' : 'text-yellow-400'}`}>
                                {streakStatus.status === 'danger'
                                    ? 'Work out today to keep your streak!'
                                    : `Grace period: ${streakData.graceRemaining} day${streakData.graceRemaining > 1 ? 's' : ''} left`
                                }
                            </p>
                        )}
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <StatCard
                            icon={Target}
                            label="Total Workouts"
                            value={stats.totalSessions}
                            color="cyan"
                        />
                        <StatCard
                            icon={Trophy}
                            label="Plans Mastered"
                            value={stats.completedPlans}
                            color="emerald"
                        />
                        <StatCard
                            icon={Award}
                            label="Achievements"
                            value={`${unlockedBadges.length}/${BADGES.length}`}
                            color="purple"
                        />
                        <StatCard
                            icon={Zap}
                            label="Personal Records"
                            value={prCount}
                            color="amber"
                        />
                    </div>

                    {/* Progress Chart */}
                    <div className={`${cardBg} rounded-xl border overflow-hidden`}>
                        <div className="p-4 border-b border-slate-800">
                            <h3 className="font-semibold text-white flex items-center gap-2">
                                <TrendingUp size={18} className="text-cyan-400" />
                                Volume Over Time
                            </h3>
                        </div>
                        <div className="p-4">
                            <ProgressChart
                                sessionHistory={sessionHistory}
                                allExercises={allExercises}
                                compact
                            />
                        </div>
                    </div>

                    {/* Recent Personal Records */}
                    {prCount > 0 && (
                        <div className={`${cardBg} rounded-xl border overflow-hidden`}>
                            <div className="p-4 border-b border-slate-800">
                                <h3 className="font-semibold text-white flex items-center gap-2">
                                    <Zap size={18} className="text-amber-400" />
                                    Personal Records
                                </h3>
                            </div>
                            <div className="p-4 grid grid-cols-2 gap-2">
                                {Object.entries(personalRecords).slice(0, 6).map(([key, pr]) => {
                                    const exercise = allExercises[key]
                                    if (!exercise) return null
                                    return (
                                        <div
                                            key={key}
                                            className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg"
                                        >
                                            <p className="text-xs text-slate-400 truncate">{exercise.name}</p>
                                            <p className="text-lg font-bold text-amber-400">
                                                {pr.volume} <span className="text-xs font-normal">{pr.unit}</span>
                                            </p>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Active Sprints - 6-week progression cycles */}
                    {(() => {
                        const activeSprints = Object.values(sprints).filter(s => s.status === 'active')
                        if (activeSprints.length === 0 || !getExerciseSprintProgress) return null

                        return (
                            <div className={`${cardBg} rounded-xl border overflow-hidden`}>
                                <div className="p-4 border-b border-slate-800">
                                    <h3 className="font-semibold text-white flex items-center gap-2">
                                        <Target size={18} className="text-cyan-400" />
                                        Active Training Cycles
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1">6-week progressive programs</p>
                                </div>
                                <div className="p-4 space-y-3">
                                    {activeSprints.map(sprint => {
                                        const exercise = allExercises[sprint.exerciseKey]
                                        if (!exercise) return null
                                        const colors = colorClasses[exercise.color] || colorClasses.cyan
                                        const progressData = getExerciseSprintProgress(sprint.exerciseKey)
                                        const progress = progressData?.progress

                                        return (
                                            <div key={sprint.id} className={`p-3 rounded-lg ${colors.bg} border ${colors.border}`}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-8 h-8 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center`}>
                                                            {exercise.image?.startsWith('neo:') ? (
                                                                <NeoIcon name={exercise.image.replace('neo:', '')} size={16} className={colors.text} />
                                                            ) : (
                                                                <Dumbbell className={colors.text} size={16} />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className={`text-sm font-bold ${colors.text}`}>{exercise.name}</p>
                                                            <p className="text-xs text-slate-500">
                                                                Week {(sprint.currentWeek || 0) + 1}/6 · Day {(sprint.currentDay || 0) + 1}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs text-slate-400">Target</p>
                                                        <p className={`text-sm font-bold ${colors.text}`}>{sprint.targetMax} {exercise.unit}</p>
                                                    </div>
                                                </div>

                                                {/* Progress bar */}
                                                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${colors.solid} transition-all`}
                                                        style={{ width: `${progress?.percentComplete || 0}%` }}
                                                    />
                                                </div>
                                                <div className="flex justify-between text-xs text-slate-500 mt-1">
                                                    <span>{sprint.startingMax} → {sprint.targetMax}</span>
                                                    <span>{progress?.percentComplete || 0}%</span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })()}
                </div>
            )}

            {/* Achievements Section */}
            {activeSection === 'achievements' && (
                <div className="space-y-6">
                    {/* Achievement Summary */}
                    <div className={`${cardBg} rounded-xl p-6 border text-center`}>
                        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <Trophy size={32} className="text-purple-400" />
                        </div>
                        <p className="text-4xl font-black text-purple-400">{unlockedBadges.length}</p>
                        <p className="text-sm text-slate-400">of {BADGES.length} achievements unlocked</p>
                        <div className="mt-4 h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all"
                                style={{ width: `${(unlockedBadges.length / BADGES.length) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Unlocked Badges */}
                    {unlockedBadges.length > 0 && (
                        <div className={`${cardBg} rounded-xl border overflow-hidden`}>
                            <div className="p-4 border-b border-slate-800">
                                <h3 className="font-semibold text-white">Unlocked</h3>
                            </div>
                            <div className="p-4 grid grid-cols-2 gap-2">
                                {unlockedBadges.map((badge) => (
                                    <BadgeItem key={badge.id} badge={badge} isUnlocked />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Locked Badges */}
                    <div className={`${cardBg} rounded-xl border overflow-hidden`}>
                        <button
                            onClick={() => setShowAllBadges(!showAllBadges)}
                            className="w-full p-4 border-b border-slate-800 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
                        >
                            <h3 className="font-semibold text-white">
                                Locked ({BADGES.length - unlockedBadges.length})
                            </h3>
                            {showAllBadges ? (
                                <ChevronUp size={18} className="text-slate-400" />
                            ) : (
                                <ChevronDown size={18} className="text-slate-400" />
                            )}
                        </button>
                        {showAllBadges && (
                            <div className="p-4 grid grid-cols-2 gap-2">
                                {BADGES.filter(b => !b.condition(stats)).map((badge) => (
                                    <BadgeItem key={badge.id} badge={badge} isUnlocked={false} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Calendar Section */}
            {activeSection === 'calendar' && (
                <div className="space-y-6">
                    <CalendarView
                        sessionHistory={sessionHistory}
                        completedDays={completedDays}
                        allExercises={allExercises}
                        activeProgram={activeProgram}
                        startWorkout={startWorkout}
                    />

                    {/* Monthly Stats */}
                    <div className={`${cardBg} rounded-xl border p-4`}>
                        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                            <CalendarIcon size={18} className="text-cyan-400" />
                            This Month
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                            {(() => {
                                const now = new Date()
                                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
                                const monthWorkouts = sessionHistory.filter(s => new Date(s.date) >= monthStart)
                                const monthVolume = monthWorkouts.reduce((sum, s) => sum + (s.volume || 0), 0)
                                const uniqueDays = new Set(monthWorkouts.map(s => s.date.split('T')[0])).size

                                return (
                                    <>
                                        <div className="text-center p-3 bg-slate-800/50 rounded-lg">
                                            <p className="text-xl font-bold text-cyan-400">{monthWorkouts.length}</p>
                                            <p className="text-[10px] text-slate-500">Workouts</p>
                                        </div>
                                        <div className="text-center p-3 bg-slate-800/50 rounded-lg">
                                            <p className="text-xl font-bold text-emerald-400">{uniqueDays}</p>
                                            <p className="text-[10px] text-slate-500">Active Days</p>
                                        </div>
                                        <div className="text-center p-3 bg-slate-800/50 rounded-lg">
                                            <p className="text-xl font-bold text-orange-400">{monthVolume.toLocaleString()}</p>
                                            <p className="text-[10px] text-slate-500">Total Volume</p>
                                        </div>
                                    </>
                                )
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default memo(Progress)
