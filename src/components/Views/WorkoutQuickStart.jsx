import { memo } from 'react'
import { Play, Zap, Clock, Dumbbell, ChevronRight, Trophy, Flame } from 'lucide-react'
import { getDailyStack, getScheduleFocus, isTrainingDay } from '../../utils/schedule'
import { EXPRESS_MODE_CONFIG } from '../../utils/constants'
import { vibrate } from '../../utils/device'
import NeoIcon from '../Visuals/NeoIcon'

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

const WorkoutQuickStart = ({
    completedDays,
    sessionHistory,
    allExercises,
    activeProgram,
    trainingPreferences,
    startStack,
    startExpressWorkout,
    startWorkout,
    theme = 'dark'
}) => {
    const preferredDays = trainingPreferences?.preferredDays || []
    const dailyStack = getDailyStack(completedDays, allExercises, activeProgram, trainingPreferences)
    const isRestDay = !isTrainingDay(preferredDays)

    // Get today's completed workouts
    const today = new Date().toISOString().split('T')[0]
    const todayWorkouts = sessionHistory.filter(s => s.date.startsWith(today))

    const cardBg = theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'

    // No workouts available
    if (dailyStack.length === 0) {
        return (
            <div className="space-y-6 pb-24">
                <div className={`${cardBg} rounded-xl border p-8 text-center`}>
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-cyan-500/10 flex items-center justify-center">
                        {isRestDay ? (
                            <span className="text-4xl">😴</span>
                        ) : (
                            <Trophy className="text-cyan-400" size={36} />
                        )}
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                        {isRestDay ? 'Rest Day' : 'All Caught Up!'}
                    </h2>
                    <p className="text-slate-400 max-w-xs mx-auto">
                        {isRestDay
                            ? 'Take it easy today. Recovery is part of the process.'
                            : "You've completed all scheduled workouts. Great job!"}
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 pb-24">
            {/* Header */}
            <div className="text-center">
                <p className="text-xs text-cyan-400 uppercase tracking-widest font-semibold mb-1">
                    {getScheduleFocus(preferredDays)}
                </p>
                <h1 className="text-3xl font-black text-white">
                    Ready to Train?
                </h1>
                {todayWorkouts.length > 0 && (
                    <p className="text-sm text-emerald-400 mt-2 flex items-center justify-center gap-1">
                        <Flame size={14} />
                        {todayWorkouts.length} workout{todayWorkouts.length > 1 ? 's' : ''} done today
                    </p>
                )}
            </div>

            {/* Main CTA - Start Full Stack */}
            <button
                onClick={() => {
                    vibrate(50)
                    startStack()
                }}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all active:scale-[0.98]"
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                            <Zap size={28} className="fill-current" />
                        </div>
                        <div className="text-left">
                            <p className="text-lg font-bold">Start Full Workout</p>
                            <p className="text-sm text-cyan-100/80">
                                {dailyStack.length} exercise{dailyStack.length > 1 ? 's' : ''} scheduled
                            </p>
                        </div>
                    </div>
                    <ChevronRight size={24} />
                </div>
            </button>

            {/* Express Mode Option */}
            {startExpressWorkout && (
                <button
                    onClick={() => {
                        vibrate(30)
                        startExpressWorkout()
                    }}
                    className={`w-full ${cardBg} rounded-xl p-5 border hover:border-yellow-500/50 transition-all active:scale-[0.99]`}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                                <Clock size={22} className="text-yellow-400" />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-white">Express Mode</p>
                                <p className="text-xs text-slate-400">
                                    {EXPRESS_MODE_CONFIG.targetDuration} min quick workout
                                </p>
                            </div>
                        </div>
                        <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-bold">
                            QUICK
                        </span>
                    </div>
                </button>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-800" />
                <span className="text-xs text-slate-500 uppercase tracking-wider">Or pick one</span>
                <div className="flex-1 h-px bg-slate-800" />
            </div>

            {/* Individual Exercise Cards */}
            <div className="space-y-3">
                {dailyStack.map((item, i) => {
                    const exercise = allExercises[item.exerciseKey]
                    if (!exercise) return null

                    const colors = colorClasses[exercise.color] || colorClasses.cyan
                    const dayNum = (completedDays[item.exerciseKey]?.length || 0) + 1

                    return (
                        <button
                            key={i}
                            onClick={() => {
                                vibrate(20)
                                startWorkout(item.week, item.dayIndex, item.exerciseKey)
                            }}
                            className={`w-full ${cardBg} rounded-xl p-4 border hover:border-cyan-500/30 transition-all active:scale-[0.99] group`}
                        >
                            <div className="flex items-center gap-4">
                                {/* Exercise Icon */}
                                <div className={`w-14 h-14 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center flex-shrink-0`}>
                                    {exercise.image?.startsWith('neo:') ? (
                                        <NeoIcon name={exercise.image.replace('neo:', '')} size={24} className={colors.text} />
                                    ) : (
                                        <Dumbbell className={colors.text} size={24} />
                                    )}
                                </div>

                                {/* Exercise Info */}
                                <div className="flex-1 text-left">
                                    <h3 className="font-bold text-white">{exercise.name}</h3>
                                    <p className="text-xs text-slate-400">
                                        Day {dayNum} of 18 • {exercise.unit}
                                    </p>
                                </div>

                                {/* Play Button */}
                                <div className={`w-10 h-10 rounded-full ${colors.solid} flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity`}>
                                    <Play size={16} className="text-white fill-current ml-0.5" />
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="mt-3 h-1 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${colors.solid} transition-all`}
                                    style={{ width: `${((dayNum - 1) / 18) * 100}%` }}
                                />
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

export default memo(WorkoutQuickStart)
