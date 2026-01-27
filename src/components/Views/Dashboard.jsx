import { useState, useMemo, memo } from 'react'
import { Zap, ChevronRight, Trophy, ChevronDown, ChevronUp, Dumbbell, Play, X, Plus, Trash2, Info, Clock, RotateCcw, Flame, Calendar, TrendingUp } from 'lucide-react'
import { EXERCISE_PLANS, DIFFICULTY_LEVELS } from '../../data/exercises.jsx'
import { getDailyStack, getScheduleFocus, getNextSessionForExercise, isTrainingDay } from '../../utils/schedule'
import { vibrate } from '../../utils/device'
import { calculateStreakWithGrace, getStreakStatus, getRemainingFreezeTokens, checkComeback, getPersonalRecords } from '../../utils/gamification'
import { EXPRESS_MODE_CONFIG } from '../../utils/constants'
import { isExpressPersona } from '../../utils/personas'
import NeoIcon from '../Visuals/NeoIcon'

// Floating Quick Start Button - appears after scroll or always visible
const QuickStartFAB = ({ onClick, exerciseCount, isVisible }) => {
    if (!isVisible || exerciseCount === 0) return null

    return (
        <button
            onClick={() => {
                vibrate(50)
                onClick()
            }}
            className="fixed bottom-24 right-4 z-30 w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full shadow-xl shadow-cyan-500/30 flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-transform"
            aria-label={`Start workout with ${exerciseCount} exercises`}
        >
            <div className="relative">
                <Play size={28} className="fill-current ml-1" />
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-white text-cyan-600 text-xs font-bold rounded-full flex items-center justify-center">
                    {exerciseCount}
                </span>
            </div>
        </button>
    )
}

// Resume Workout Banner - shows when there's an interrupted session
const ResumeWorkoutBanner = ({ session, onResume, onDiscard, allExercises }) => {
    if (!session) return null

    const exercise = allExercises[session.exerciseKey]
    const colors = colorClasses[exercise?.color] || colorClasses.cyan

    return (
        <div className={`${colors.bg} border ${colors.border} rounded-xl p-4 mb-4 animate-pulse-slow`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center`}>
                        <RotateCcw className={colors.text} size={20} />
                    </div>
                    <div>
                        <p className={`font-bold ${colors.text}`}>Resume Workout</p>
                        <p className="text-xs text-slate-400">
                            {exercise?.name} - Set {(session.setIndex || 0) + 1}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={onDiscard}
                        className="px-3 py-2 text-xs text-slate-400 hover:text-white transition-colors"
                    >
                        Discard
                    </button>
                    <button
                        onClick={() => {
                            vibrate(30)
                            onResume()
                        }}
                        className={`px-4 py-2 ${colors.solid} text-white rounded-lg text-sm font-bold`}
                    >
                        Continue
                    </button>
                </div>
            </div>
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

// Exercise Info Modal
const ExerciseInfoModal = ({ exercise, onClose, onStart, completedDays, difficulty, onSetDifficulty, onDelete, isCustom, allExercises }) => {
    if (!exercise) return null

    const colors = colorClasses[exercise.color] || colorClasses.cyan
    const nextSession = getNextSessionForExercise(exercise.key, completedDays, allExercises)
    const isComplete = !nextSession
    const completedCount = completedDays[exercise.key]?.length || 0
    const dayNum = completedCount + 1
    const currentDifficulty = difficulty || 3

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                <div className={`p-6 ${colors.bg} border-b ${colors.border}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center`}>
                                {exercise.image?.startsWith('neo:') ? (
                                    <NeoIcon name={exercise.image.replace('neo:', '')} size={24} className={colors.text} />
                                ) : (
                                    <Dumbbell className={colors.text} size={24} />
                                )}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">{exercise.name}</h3>
                                <p className="text-xs text-slate-400">
                                    {isComplete ? 'Completed!' : `Day ${dayNum} of 18`} • {exercise.unit}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg">
                            <X size={20} className="text-slate-400" />
                        </button>
                    </div>
                </div>

                <div className="p-4 space-y-4">
                    {/* Difficulty Selector */}
                    {exercise.variations && exercise.variations.length > 0 && (
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Difficulty Level</p>
                            <div className="grid grid-cols-3 gap-2">
                                {[1, 2, 3, 4, 5, 6].map((level) => {
                                    const variation = exercise.variations.find(v => v.level === level)
                                    const levelInfo = DIFFICULTY_LEVELS[level]
                                    const isSelected = currentDifficulty === level
                                    return (
                                        <button
                                            key={level}
                                            onClick={() => onSetDifficulty && onSetDifficulty(exercise.key, level)}
                                            className={`p-2 rounded-lg border text-center transition-all ${isSelected
                                                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                                                }`}
                                            title={variation?.desc || levelInfo.name}
                                        >
                                            <p className="text-xs font-bold">{levelInfo.name}</p>
                                            <p className="text-[10px] text-slate-500">{levelInfo.multiplier}x</p>
                                        </button>
                                    )
                                })}
                            </div>
                            {exercise.variations[currentDifficulty - 1] && (
                                <p className="text-xs text-slate-400 mt-2 text-center">
                                    {exercise.variations[currentDifficulty - 1].name}: {exercise.variations[currentDifficulty - 1].desc}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Progress Bar */}
                    <div>
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>Progress</span>
                            <span>{Math.min(completedCount, 18)}/18 days</span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${colors.solid} transition-all`}
                                style={{ width: `${Math.min(completedCount / 18 * 100, 100)}%` }}
                            />
                        </div>
                    </div>

                    {/* Goal */}
                    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                        <span className="text-xs text-slate-500">Final Goal</span>
                        <span className={`text-sm font-bold ${colors.text}`}>{exercise.finalGoal}</span>
                    </div>

                    {/* Action Buttons */}
                    {!isComplete && nextSession && (
                        <button
                            onClick={() => {
                                onStart(nextSession.week, nextSession.dayIndex, exercise.key)
                                onClose()
                            }}
                            className={`w-full py-4 ${colors.solid} text-white rounded-xl font-bold flex items-center justify-center gap-2`}
                        >
                            <Play size={18} />
                            Start Day {dayNum}
                        </button>
                    )}
                    {isComplete && (
                        <div className="text-center py-4 text-emerald-400 font-bold flex items-center justify-center gap-2">
                            <Trophy size={18} />
                            Exercise Mastered!
                        </div>
                    )}

                    {/* Delete Custom Exercise */}
                    {isCustom && onDelete && (
                        <button
                            onClick={() => {
                                onDelete(exercise.key)
                                onClose()
                            }}
                            className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
                        >
                            <Trash2 size={16} />
                            Delete Custom Exercise
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

const Dashboard = ({
    completedDays,
    sessionHistory,
    startStack,
    startWorkout,
    startExpressWorkout,
    allExercises = EXERCISE_PLANS,
    customExercises = {},
    exerciseDifficulty = {},
    onSetDifficulty,
    onDeleteExercise,
    onShowAddExercise,
    // eslint-disable-next-line no-unused-vars
    programMode,
    activeProgram,
    onShowExerciseLibrary,
    onShowProgramManager,
    trainingPreferences = null,
    // eslint-disable-next-line no-unused-vars
    customPlans = null,
    // Sprint progression props (now displayed in Progress view)
    // eslint-disable-next-line no-unused-vars
    sprints = {},
    // eslint-disable-next-line no-unused-vars
    getExerciseSprintProgress = null,
    // eslint-disable-next-line no-unused-vars
    ensureSprintExists = null,
    // eslint-disable-next-line no-unused-vars
    onCompleteSprint = null,
    // Session resume props
    pendingSession = null,
    onResumeSession = null,
    onDiscardSession = null,
    // Theme
    theme = 'dark'
}) => {
    const preferredDays = trainingPreferences?.preferredDays || []
    const dailyStack = getDailyStack(completedDays, allExercises, activeProgram, trainingPreferences)
    const personalRecords = getPersonalRecords(sessionHistory)
    const [showAllExercises, setShowAllExercises] = useState(false)
    const [selectedExercise, setSelectedExercise] = useState(null)

    // Theme-aware styling (matching GymDashboard)
    const cardBg = theme === 'light' ? 'bg-white' : 'bg-slate-900'
    const textPrimary = theme === 'light' ? 'text-slate-900' : 'text-white'
    const textSecondary = theme === 'light' ? 'text-slate-600' : 'text-slate-400'
    const borderColor = theme === 'light' ? 'border-slate-200' : 'border-slate-800'

    // Show only active program exercises (or all if no activeProgram)
    const programExercises = activeProgram
        ? Object.fromEntries(activeProgram.map(k => [k, allExercises[k]]).filter(([, v]) => v))
        : allExercises
    const exerciseCount = Object.keys(programExercises).length
    const customCount = Object.keys(customExercises).length

    // Get today's completed workouts
    const today = new Date().toISOString().split('T')[0]
    const todayWorkouts = sessionHistory.filter(s => s.date.startsWith(today))

    // Determine if it's a rest day (use training preferences if available)
    const isRestDay = !isTrainingDay(preferredDays)

    // Check if user has express mode enabled
    const userPersona = trainingPreferences?.persona
    const isExpressModeUser = trainingPreferences?.expressMode || isExpressPersona(userPersona)

    // Calculate weekly stats (matching GymDashboard pattern)
    const weeklyStats = useMemo(() => {
        const now = new Date()
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - now.getDay())
        weekStart.setHours(0, 0, 0, 0)

        const thisWeekWorkouts = sessionHistory.filter(w => {
            const workoutDate = new Date(w.date)
            return workoutDate >= weekStart
        })

        const totalVolume = thisWeekWorkouts.reduce((sum, w) => sum + (w.volume || 0), 0)

        return {
            workouts: thisWeekWorkouts.length,
            totalVolume,
            exercises: new Set(thisWeekWorkouts.map(w => w.exerciseKey)).size
        }
    }, [sessionHistory])

    // Get recent workouts (last 5)
    const recentWorkouts = sessionHistory.slice(0, 5)

    // Get current streak
    const streakData = calculateStreakWithGrace(sessionHistory)

    return (
        <div className="space-y-6 pb-8">
            {/* Resume Workout Banner - Shows when there's an interrupted session */}
            {pendingSession && onResumeSession && (
                <ResumeWorkoutBanner
                    session={pendingSession}
                    onResume={onResumeSession}
                    onDiscard={onDiscardSession}
                    allExercises={allExercises}
                />
            )}

            {/* Current Program Overview - matches GymDashboard style */}
            <div className={`${cardBg} rounded-2xl p-5 border ${borderColor}`}>
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <p className={`text-sm ${textSecondary}`}>Current Program</p>
                        <h2 className={`text-xl font-bold ${textPrimary}`}>
                            {exerciseCount} Exercise{exerciseCount !== 1 ? 's' : ''}
                        </h2>
                    </div>
                    <div className="text-right flex items-center gap-2">
                        {streakData.streak > 0 && (
                            <div className="flex items-center gap-1 text-orange-400">
                                <Flame className="w-4 h-4" />
                                <span className="font-bold">{streakData.streak}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Progress bar showing completed vs total days */}
                {(() => {
                    const totalDays = exerciseCount * 18
                    const completedTotal = Object.values(completedDays).reduce((sum, days) => sum + days.length, 0)
                    const progressPercent = totalDays > 0 ? (completedTotal / totalDays) * 100 : 0
                    return (
                        <>
                            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full transition-all"
                                    style={{ width: `${Math.min(progressPercent, 100)}%` }}
                                />
                            </div>
                            <p className={`text-xs ${textSecondary} mt-2`}>
                                {completedTotal} / {totalDays} days completed
                            </p>
                        </>
                    )
                })()}
            </div>

            {/* Today's Workout - Gradient button matching GymDashboard */}
            {dailyStack.length > 0 ? (
                <div>
                    <h3 className={`text-sm font-medium ${textSecondary} mb-3`}>Today&apos;s Workout</h3>
                    <button
                        onClick={() => { vibrate(20); startStack() }}
                        className="w-full bg-gradient-to-br from-cyan-600 to-teal-600 rounded-2xl p-5 text-left hover:from-cyan-500 hover:to-teal-500 transition-all"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-cyan-200 text-sm">{getScheduleFocus(preferredDays)}</p>
                                <h3 className="text-xl font-bold text-white">
                                    {dailyStack.length} exercise{dailyStack.length > 1 ? 's' : ''} ready
                                </h3>
                            </div>
                            <ChevronRight className="w-6 h-6 text-white" />
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {dailyStack.slice(0, 4).map((item, i) => {
                                const ex = allExercises[item.exerciseKey]
                                return (
                                    <span
                                        key={i}
                                        className="text-xs px-2 py-1 bg-white/20 rounded-lg text-white"
                                    >
                                        {ex?.name}
                                    </span>
                                )
                            })}
                            {dailyStack.length > 4 && (
                                <span className="text-xs px-2 py-1 bg-white/10 rounded-lg text-cyan-200">
                                    +{dailyStack.length - 4} more
                                </span>
                            )}
                        </div>
                    </button>

                    {/* Express Mode Quick Start - Show for express mode users */}
                    {isExpressModeUser && startExpressWorkout && (
                        <button
                            onClick={() => {
                                vibrate(50)
                                startExpressWorkout()
                            }}
                            className="w-full mt-3 flex items-center justify-between px-4 py-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-400 hover:bg-yellow-500/20 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <Zap size={18} />
                                <span className="font-medium">Express Mode</span>
                                <span className={`text-xs ${textSecondary}`}>
                                    {EXPRESS_MODE_CONFIG.targetDuration} min
                                </span>
                            </div>
                            <ChevronRight size={18} />
                        </button>
                    )}
                </div>
            ) : (
                /* Rest Day / All Caught Up - matching GymDashboard style */
                <div>
                    <h3 className={`text-sm font-medium ${textSecondary} mb-3`}>Today&apos;s Workout</h3>
                    <div className={`${cardBg} rounded-2xl p-6 text-center border ${borderColor}`}>
                        <RotateCcw className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                        <h3 className={`font-semibold ${textPrimary} mb-1`}>
                            {isRestDay ? 'Rest Day' : 'All Caught Up!'}
                        </h3>
                        <p className={`text-sm ${textSecondary}`}>
                            {isRestDay
                                ? 'Recovery is part of the process'
                                : 'Great job! Browse exercises below'}
                        </p>
                        <button
                            onClick={() => setShowAllExercises(true)}
                            className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-slate-300 transition-colors"
                        >
                            {isRestDay ? 'Workout anyway' : 'Browse exercises'}
                        </button>
                    </div>
                </div>
            )}

            {/* Today's Summary - Only show if worked out today */}
            {todayWorkouts.length > 0 && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                            <Trophy className="text-emerald-400" size={20} />
                        </div>
                        <div className="flex-1">
                            <p className="text-emerald-400 text-sm font-bold">Great work today!</p>
                            <p className={`text-xs ${textSecondary}`}>
                                Completed {todayWorkouts.map(w => allExercises[w.exerciseKey]?.name || w.exerciseKey).join(', ')}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Weekly Stats - matching GymDashboard style */}
            <div>
                <h3 className={`text-sm font-medium ${textSecondary} mb-3`}>This Week</h3>
                <div className="grid grid-cols-3 gap-3">
                    <div className={`${cardBg} rounded-xl p-4 text-center border ${borderColor}`}>
                        <p className="text-2xl font-bold text-cyan-400">{weeklyStats.workouts}</p>
                        <p className={`text-xs ${textSecondary}`}>Workouts</p>
                    </div>
                    <div className={`${cardBg} rounded-xl p-4 text-center border ${borderColor}`}>
                        <p className="text-2xl font-bold text-cyan-400">{weeklyStats.exercises}</p>
                        <p className={`text-xs ${textSecondary}`}>Exercises</p>
                    </div>
                    <div className={`${cardBg} rounded-xl p-4 text-center border ${borderColor}`}>
                        <p className="text-2xl font-bold text-cyan-400">
                            {weeklyStats.totalVolume >= 1000
                                ? `${(weeklyStats.totalVolume / 1000).toFixed(1)}k`
                                : weeklyStats.totalVolume}
                        </p>
                        <p className={`text-xs ${textSecondary}`}>Total Reps</p>
                    </div>
                </div>
            </div>

            {/* Recent Workouts - matching GymDashboard style */}
            {recentWorkouts.length > 0 && (
                <div>
                    <h3 className={`text-sm font-medium ${textSecondary} mb-3`}>Recent Workouts</h3>
                    <div className="space-y-2">
                        {recentWorkouts.slice(0, 5).map((workout, idx) => {
                            const date = new Date(workout.date)
                            const isToday = date.toDateString() === new Date().toDateString()
                            const dayName = isToday ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                            const exerciseName = allExercises[workout.exerciseKey]?.name || workout.exerciseKey
                            const colors = colorClasses[allExercises[workout.exerciseKey]?.color] || colorClasses.cyan

                            return (
                                <div key={idx} className={`${cardBg} rounded-xl p-4 flex items-center justify-between border ${borderColor}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center`}>
                                            <Calendar className={`w-5 h-5 ${colors.text}`} />
                                        </div>
                                        <div>
                                            <p className={`font-medium ${textPrimary}`}>{exerciseName}</p>
                                            <p className={`text-sm ${textSecondary}`}>{dayName}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-cyan-400 font-medium">{workout.volume} {workout.unit}</p>
                                        <p className={`text-xs ${textSecondary}`}>Day {workout.dayId}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Empty state for no history */}
            {recentWorkouts.length === 0 && (
                <div>
                    <h3 className={`text-sm font-medium ${textSecondary} mb-3`}>Recent Workouts</h3>
                    <div className={`${cardBg} rounded-xl p-6 text-center border ${borderColor}`}>
                        <TrendingUp className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                        <p className={textSecondary}>Complete your first workout to see history</p>
                    </div>
                </div>
            )}

            {/* Quick Start FAB */}
            <QuickStartFAB
                onClick={startStack}
                exerciseCount={dailyStack.length}
                isVisible={dailyStack.length > 0 && !pendingSession}
            />

            {/* My Program Section */}
            <div className={`${cardBg} border ${borderColor} rounded-xl overflow-hidden`}>
                <button
                    onClick={() => setShowAllExercises(!showAllExercises)}
                    className={`w-full p-4 flex items-center justify-between ${theme === 'light' ? 'hover:bg-slate-100' : 'hover:bg-slate-800/50'} transition-colors`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-2 ${theme === 'light' ? 'bg-slate-100' : 'bg-slate-800'} rounded-lg`}>
                            <Dumbbell size={18} className="text-cyan-400" />
                        </div>
                        <div className="text-left">
                            <h3 className={`font-bold ${textPrimary}`}>My Program</h3>
                            <p className={`text-xs ${textSecondary}`}>
                                {exerciseCount} exercises {customCount > 0 && `(${customCount} custom)`}
                            </p>
                        </div>
                    </div>
                    {showAllExercises ? (
                        <ChevronUp size={20} className={textSecondary} />
                    ) : (
                        <ChevronDown size={20} className={textSecondary} />
                    )}
                </button>

                {showAllExercises && (
                    <div className="p-4 pt-0 space-y-3">
                        {/* Quick Actions */}
                        {(onShowExerciseLibrary || onShowProgramManager) && (
                            <div className="flex gap-2 mb-3">
                                {onShowExerciseLibrary && (
                                    <button
                                        onClick={() => { vibrate(10); onShowExerciseLibrary() }}
                                        className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-slate-300 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Plus size={16} />
                                        Browse Library
                                    </button>
                                )}
                                {onShowProgramManager && (
                                    <button
                                        onClick={() => { vibrate(10); onShowProgramManager() }}
                                        className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-slate-300 transition-colors"
                                    >
                                        Manage Program
                                    </button>
                                )}
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {Object.entries(programExercises).map(([key, ex]) => {
                                if (!ex) return null
                                const colors = colorClasses[ex.color] || colorClasses.cyan
                                const dayNum = (completedDays[key]?.length || 0) + 1
                                const isComplete = dayNum > 18
                                const pr = personalRecords[key]
                                const isCustom = !!customExercises[key]
                                const difficulty = exerciseDifficulty[key] || 3
                                const diffLevel = DIFFICULTY_LEVELS[difficulty]

                                return (
                                    <button
                                        key={key}
                                        onClick={() => {
                                            vibrate(10)
                                            setSelectedExercise({ ...ex, key, isCustom })
                                        }}
                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all hover:bg-slate-800/50 ${isComplete
                                                ? 'bg-emerald-500/5 border-emerald-500/20'
                                                : isCustom
                                                    ? 'bg-purple-500/5 border-purple-500/20'
                                                    : 'bg-slate-800/30 border-slate-700/50'
                                            }`}
                                    >
                                        <div className={`w-10 h-10 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center flex-shrink-0`}>
                                            {ex.image?.startsWith('neo:') ? (
                                                <NeoIcon name={ex.image.replace('neo:', '')} size={18} className={colors.text} />
                                            ) : (
                                                <Dumbbell className={colors.text} size={18} />
                                            )}
                                        </div>
                                        <div className="flex-1 text-left min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-sm font-bold text-white truncate">{ex.name}</h4>
                                                {isCustom && <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">Custom</span>}
                                            </div>
                                            <p className="text-xs text-slate-500">
                                                {isComplete ? (
                                                    <span className="text-emerald-400">Complete</span>
                                                ) : (
                                                    `Day ${dayNum}/18`
                                                )}
                                                {difficulty !== 3 && (
                                                    <span className="text-cyan-400 ml-2">{diffLevel.name}</span>
                                                )}
                                                {pr && <span className="text-amber-400 ml-2">PR: {pr.volume}</span>}
                                            </p>
                                        </div>
                                        <ChevronRight size={16} className="text-slate-600 flex-shrink-0" />
                                    </button>
                                )
                            })}
                        </div>

                        {/* Add Exercise Button */}
                        {onShowAddExercise && (
                            <button
                                onClick={() => {
                                    vibrate(10)
                                    onShowAddExercise()
                                }}
                                className="w-full p-4 rounded-xl border-2 border-dashed border-slate-700 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all flex items-center justify-center gap-2 text-slate-400 hover:text-cyan-400"
                            >
                                <Plus size={20} />
                                <span className="font-medium">Add Custom Exercise</span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Exercise Info Modal */}
            {selectedExercise && (
                <ExerciseInfoModal
                    exercise={selectedExercise}
                    completedDays={completedDays}
                    difficulty={exerciseDifficulty[selectedExercise.key]}
                    onSetDifficulty={onSetDifficulty}
                    onDelete={onDeleteExercise}
                    isCustom={selectedExercise.isCustom}
                    onClose={() => setSelectedExercise(null)}
                    onStart={startWorkout}
                    allExercises={allExercises}
                />
            )}
        </div>
    )
}

// Memoize Dashboard to prevent re-renders when props are unchanged.
export default memo(Dashboard)
