import { useState, memo } from 'react'
import { Zap, ChevronRight, Trophy, ChevronDown, ChevronUp, Dumbbell, Play, X, Plus, Trash2, Info, Clock, Flame, MapPin, Home, Building2, RotateCcw } from 'lucide-react'
import { EXERCISE_PLANS, DIFFICULTY_LEVELS } from '../../data/exercises.jsx'
import { getDailyStack, getScheduleFocus, getNextSessionForExercise, isTrainingDay } from '../../utils/schedule'
import { vibrate } from '../../utils/device'
import { calculateStreakWithGrace, getStreakStatus, getRemainingFreezeTokens, checkComeback, getPersonalRecords, getLastWorkoutForExercise } from '../../utils/gamification'
import { EXPRESS_MODE_CONFIG, STORAGE_KEYS, WORKOUT_LOCATIONS } from '../../utils/constants'
import { isExpressPersona, isHybridPersona } from '../../utils/personas'
import LocationSelector, { getExercisesForLocation, getLocationColor } from '../UI/LocationSelector'
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

// Location Quick Switch - prominent for hybrid users
const LocationQuickSwitch = ({ currentLocation, onSwitch, exerciseCounts }) => {
    const locations = [
        { id: WORKOUT_LOCATIONS.HOME, icon: Home, label: 'Home', color: 'emerald' },
        { id: WORKOUT_LOCATIONS.GYM, icon: Building2, label: 'Gym', color: 'purple' }
    ]

    return (
        <div className="flex gap-2 mb-4">
            {locations.map(loc => {
                const Icon = loc.icon
                const isActive = currentLocation === loc.id
                const count = exerciseCounts[loc.id] || 0

                return (
                    <button
                        key={loc.id}
                        onClick={() => {
                            vibrate(20)
                            onSwitch(loc.id)
                        }}
                        className={`flex-1 p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                            isActive
                                ? `border-${loc.color}-500 bg-${loc.color}-500/10`
                                : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                        }`}
                    >
                        <Icon size={18} className={isActive ? `text-${loc.color}-400` : 'text-slate-400'} />
                        <span className={`font-medium ${isActive ? `text-${loc.color}-400` : 'text-slate-400'}`}>
                            {loc.label}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                            isActive ? `bg-${loc.color}-500/20 text-${loc.color}-400` : 'bg-slate-700 text-slate-500'
                        }`}>
                            {count}
                        </span>
                    </button>
                )
            })}
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
    onDiscardSession = null
}) => {
    const preferredDays = trainingPreferences?.preferredDays || []
    const dailyStack = getDailyStack(completedDays, allExercises, activeProgram, trainingPreferences)
    const personalRecords = getPersonalRecords(sessionHistory)
    const [showAllExercises, setShowAllExercises] = useState(false)
    const [selectedExercise, setSelectedExercise] = useState(null)
    const [showFAB, setShowFAB] = useState(true)

    // Location state for hybrid users
    const [currentLocation, setCurrentLocation] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.currentLocation)
        return saved || WORKOUT_LOCATIONS.HOME
    })

    // Save location to localStorage when it changes
    const handleLocationChange = (location) => {
        setCurrentLocation(location)
        localStorage.setItem(STORAGE_KEYS.currentLocation, location)
    }

    // Count exercises per location for hybrid users
    const exerciseCountsByLocation = {
        [WORKOUT_LOCATIONS.HOME]: getExercisesForLocation(WORKOUT_LOCATIONS.HOME, allExercises).length,
        [WORKOUT_LOCATIONS.GYM]: getExercisesForLocation(WORKOUT_LOCATIONS.GYM, allExercises).length
    }

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

    // Check if user is hybrid (uses multiple locations)
    const isHybridUser = isHybridPersona(userPersona) || trainingPreferences?.programMode === 'mixed'

    // Get location-filtered exercises for hybrid users
    const locationFilteredExercises = isHybridUser
        ? getExercisesForLocation(currentLocation, allExercises)
        : Object.keys(allExercises)

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

            {/* Location Quick Switch - Prominent for hybrid users */}
            {isHybridUser && (
                <div className="bg-gradient-to-r from-emerald-500/5 to-purple-500/5 border border-slate-700 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <MapPin size={16} className="text-cyan-400" />
                        <h3 className="text-sm font-semibold text-white">Where are you training?</h3>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleLocationChange(WORKOUT_LOCATIONS.HOME)}
                            className={`flex-1 p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                                currentLocation === WORKOUT_LOCATIONS.HOME
                                    ? 'border-emerald-500 bg-emerald-500/10'
                                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                            }`}
                        >
                            <Home size={18} className={currentLocation === WORKOUT_LOCATIONS.HOME ? 'text-emerald-400' : 'text-slate-400'} />
                            <span className={`font-medium ${currentLocation === WORKOUT_LOCATIONS.HOME ? 'text-emerald-400' : 'text-slate-400'}`}>
                                Home
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                currentLocation === WORKOUT_LOCATIONS.HOME ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-500'
                            }`}>
                                {exerciseCountsByLocation[WORKOUT_LOCATIONS.HOME]}
                            </span>
                        </button>
                        <button
                            onClick={() => handleLocationChange(WORKOUT_LOCATIONS.GYM)}
                            className={`flex-1 p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                                currentLocation === WORKOUT_LOCATIONS.GYM
                                    ? 'border-purple-500 bg-purple-500/10'
                                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                            }`}
                        >
                            <Building2 size={18} className={currentLocation === WORKOUT_LOCATIONS.GYM ? 'text-purple-400' : 'text-slate-400'} />
                            <span className={`font-medium ${currentLocation === WORKOUT_LOCATIONS.GYM ? 'text-purple-400' : 'text-slate-400'}`}>
                                Gym
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                currentLocation === WORKOUT_LOCATIONS.GYM ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-700 text-slate-500'
                            }`}>
                                {exerciseCountsByLocation[WORKOUT_LOCATIONS.GYM]}
                            </span>
                        </button>
                    </div>
                </div>
            )}

            {/* Express Mode Quick Start - Show for express mode users */}
            {isExpressModeUser && dailyStack.length > 0 && startExpressWorkout && (
                <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                                <Zap className="text-yellow-400" size={28} />
                            </div>
                            <div>
                                <p className="text-yellow-400 font-bold text-lg">Express Workout</p>
                                <p className="text-slate-400 text-sm flex items-center gap-2">
                                    <Clock size={14} />
                                    {EXPRESS_MODE_CONFIG.targetDuration} min • {EXPRESS_MODE_CONFIG.sets} sets • {EXPRESS_MODE_CONFIG.maxExercises} exercises
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                vibrate(50)
                                startExpressWorkout()
                            }}
                            className="px-5 py-3 bg-yellow-500 text-slate-900 rounded-xl font-bold hover:bg-yellow-400 transition-colors flex items-center gap-2"
                        >
                            <Play size={18} />
                            Go
                        </button>
                    </div>
                </div>
            )}

            {/* Quick Start FAB */}
            <QuickStartFAB
                onClick={startStack}
                exerciseCount={dailyStack.length}
                isVisible={showFAB && dailyStack.length > 0 && !pendingSession}
            />

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
                                You completed {todayWorkouts.map(w => allExercises[w.exerciseKey]?.name || w.exerciseKey).join(' & ')}
                            </p>
                        </div>
                    </div>
                    {dailyStack.length > 0 && (
                        <button
                            onClick={() => { vibrate(20); startStack() }}
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
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-xs font-bold text-cyan-400 uppercase tracking-wider">
                                        Today
                                    </span>
                                    <span className="text-sm font-semibold text-white">
                                        {getScheduleFocus(preferredDays)}
                                    </span>
                                </div>
                                <h1 className="text-3xl font-black text-white">
                                    {dailyStack.length} exercise{dailyStack.length > 1 ? 's' : ''} ready
                                </h1>
                            </div>
                            <button
                                onClick={() => { vibrate(20); startStack() }}
                                className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-900 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 shadow-lg shadow-cyan-500/20"
                            >
                                <Zap size={18} className="fill-current" />
                                Start
                            </button>
                        </div>
                    </div>

                    {/* Next Workout Cards */}
                    <div className="p-4 space-y-3">
                        {dailyStack.map((item, i) => {
                            const ex = allExercises[item.exerciseKey]
                            const pr = personalRecords[item.exerciseKey]
                            const dayNum = (completedDays[item.exerciseKey]?.length || 0) + 1
                            const colors = colorClasses[ex.color] || colorClasses.cyan

                            return (
                                <button
                                    key={i}
                                    onClick={() => {
                                        vibrate(10)
                                        setSelectedExercise({ ...ex, key: item.exerciseKey })
                                    }}
                                    className="w-full flex items-center gap-4 p-4 bg-slate-800/50 hover:bg-slate-800 rounded-xl transition-all group"
                                >
                                    {/* Exercise Icon */}
                                    <div className={`w-12 h-12 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center flex-shrink-0`}>
                                        {ex.image?.startsWith('neo:') ? (
                                            <NeoIcon name={ex.image.replace('neo:', '')} size={20} className={colors.text} />
                                        ) : (
                                            <span className={colors.text}>{ex.icon}</span>
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

                                    {/* Info Icon */}
                                    <Info className="text-slate-500 group-hover:text-cyan-400 transition-colors" size={18} />
                                </button>
                            )
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
                            : 'Great job! Check back tomorrow or browse all exercises below.'}
                    </p>
                </div>
            )}

            {/* Compassionate Streak Display */}
            {(() => {
                const streakData = calculateStreakWithGrace(sessionHistory)
                const streakStatus = getStreakStatus(streakData)
                const freezeTokens = getRemainingFreezeTokens()
                const comebackInfo = checkComeback(sessionHistory)

                // Color mapping based on status
                const statusColors = {
                    inactive: 'text-slate-400',
                    danger: 'text-red-400',
                    warning: 'text-yellow-400',
                    active: 'text-orange-400',
                    hot: 'text-orange-500',
                    legendary: 'text-amber-400'
                }

                const bgColors = {
                    inactive: 'bg-slate-800/50 border-slate-700',
                    danger: 'bg-red-500/10 border-red-500/30',
                    warning: 'bg-yellow-500/10 border-yellow-500/30',
                    active: 'bg-orange-500/10 border-orange-500/30',
                    hot: 'bg-orange-500/15 border-orange-500/40',
                    legendary: 'bg-amber-500/20 border-amber-500/50'
                }

                // Show comeback message if returning after break
                if (comebackInfo) {
                    return (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">🦅</span>
                                <div>
                                    <p className="text-emerald-400 font-bold">Welcome back!</p>
                                    <p className="text-slate-400 text-sm">{comebackInfo.message}</p>
                                </div>
                            </div>
                        </div>
                    )
                }

                return (
                    <div className={`rounded-xl p-4 border ${bgColors[streakStatus.status]}`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">{streakStatus.emoji}</span>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-2xl font-bold ${statusColors[streakStatus.status]}`}>
                                            {streakData.streak}
                                        </span>
                                        <span className="text-slate-400 text-sm">day streak</span>
                                    </div>
                                    {streakData.message && (
                                        <p className="text-xs text-slate-500 mt-0.5">{streakData.message}</p>
                                    )}
                                </div>
                            </div>

                            {/* Streak freeze tokens */}
                            {freezeTokens > 0 && (
                                <div className="flex items-center gap-1" title={`${freezeTokens} streak freeze${freezeTokens > 1 ? 's' : ''} available`}>
                                    {Array.from({ length: freezeTokens }).map((_, i) => (
                                        <span key={i} className="text-blue-400 text-sm">❄️</span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* At-risk warning */}
                        {streakData.isAtRisk && streakData.streak > 0 && (
                            <div className={`mt-3 pt-3 border-t ${streakStatus.status === 'danger' ? 'border-red-500/30' : 'border-yellow-500/30'}`}>
                                <p className={`text-xs ${streakStatus.status === 'danger' ? 'text-red-400' : 'text-yellow-400'}`}>
                                    {streakStatus.status === 'danger'
                                        ? '⚠️ Work out today to keep your streak!'
                                        : `💡 Grace period active (${streakData.graceRemaining} day${streakData.graceRemaining > 1 ? 's' : ''} left)`
                                    }
                                </p>
                            </div>
                        )}
                    </div>
                )
            })()}

            {/* My Program Section */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <button
                    onClick={() => setShowAllExercises(!showAllExercises)}
                    className="w-full p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-800 rounded-lg">
                            <Dumbbell size={18} className="text-cyan-400" />
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold text-white">My Program</h3>
                            <p className="text-xs text-slate-500">
                                {exerciseCount} exercises {customCount > 0 && `(${customCount} custom)`}
                            </p>
                        </div>
                    </div>
                    {showAllExercises ? (
                        <ChevronUp size={20} className="text-slate-400" />
                    ) : (
                        <ChevronDown size={20} className="text-slate-400" />
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
