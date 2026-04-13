import { useState, useMemo } from 'react'
import {
  X,
  Target,
  TrendingUp,
  TrendingDown,
  ChevronUp,
  ChevronDown,
  Calendar,
  Award,
  RefreshCw,
  Check,
  AlertCircle
} from 'lucide-react'
import { vibrate } from '../../utils/device'
import { KG_TO_LBS, LBS_TO_KG } from '../../utils/constants'
import {
  getHomeGoalWeek,
  getHomeCurrentTarget,
  calculateHomeProgress,
  createHomeGoal,
  createFollowUpHomeGoal,
  shouldSetNewHomeGoal,
  inferCurrentMax
} from '../../utils/homeGoals'
import {
  getCurrentWeek as getGymCurrentWeek,
  getCurrentTarget as getGymCurrentTarget,
  calculateProgress as calculateGymProgress,
  adjustGoal as adjustGymGoal,
  createFollowUpGoal as createGymFollowUpGoal,
  shouldSetNewGoal as shouldSetNewGymGoal
} from '../../utils/gymProgression'

/**
 * GoalSetter - Unified 6-week goal component for home and gym modes
 * mode='home': rep/time-based goals with cyan accent
 * mode='gym': weight-based goals with purple accent
 */
const GoalSetter = ({
  mode = 'home',
  exerciseKey,
  exercise,
  goal, // existing goal or null (home goal shape or gym goal shape)
  sessionHistory = [],
  gymHistory = [],
  gymWeights = {},
  gymWeightUnit = 'kg',
  personalRecords = {},
  onSetGoal, // (exerciseKey, goal) => void for home; also used for gym new goal
  onUpdateGoal, // (updatedGoal) => void for gym adjustments (optional)
  onClose,
  theme = 'dark'
}) => {
  const isHome = mode === 'home'

  // ──────────── Theme classes ────────────
  const accent = isHome ? 'cyan' : 'purple'
  const bgClass = theme === 'light' ? 'bg-white' : 'bg-slate-900'
  const textPrimary = theme === 'light' ? 'text-slate-900' : 'text-white'
  const textSecondary = theme === 'light' ? 'text-slate-600' : 'text-slate-400'
  const borderColor = theme === 'light' ? 'border-slate-200' : 'border-slate-700'
  const cardBg = theme === 'light' ? 'bg-slate-50' : 'bg-slate-800'
  const inputBg = theme === 'light' ? 'bg-slate-100' : 'bg-slate-800'

  // Tailwind can't resolve dynamic class names, so we map accent classes explicitly
  const accentClasses = isHome
    ? {
        iconBg: 'bg-cyan-500/20',
        iconText: 'text-cyan-400',
        badgeBg: 'bg-cyan-500/20',
        badgeText: 'text-cyan-400',
        borderAccent: 'border-cyan-500/30',
        targetBg: 'bg-cyan-500/5',
        currentBg: 'bg-cyan-500/10',
        currentBorder: 'border-cyan-500/30',
        targetText: 'text-cyan-400',
        targetText70: 'text-cyan-400/70',
        gradientFrom: 'from-cyan-500',
        gradientTo: 'to-teal-500',
        gradientFromHover: 'hover:from-cyan-600',
        gradientToHover: 'hover:to-teal-600',
        progressMid: 'bg-gradient-to-r from-cyan-500 to-teal-500',
        progressLow: 'bg-cyan-500/70',
        hoverBorder: 'hover:border-cyan-500',
        confirmBg: 'bg-cyan-500',
      }
    : {
        iconBg: 'bg-purple-500/20',
        iconText: 'text-purple-400',
        badgeBg: 'bg-purple-500/20',
        badgeText: 'text-purple-400',
        borderAccent: 'border-purple-500/30',
        targetBg: 'bg-purple-500/5',
        currentBg: 'bg-purple-500/20',
        currentBorder: 'border-purple-500/30',
        targetText: 'text-purple-400',
        targetText70: 'text-purple-400/70',
        gradientFrom: 'from-purple-500',
        gradientTo: 'to-pink-500',
        gradientFromHover: 'hover:from-purple-600',
        gradientToHover: 'hover:to-pink-600',
        progressMid: 'bg-gradient-to-r from-purple-500 to-pink-500',
        progressLow: 'bg-purple-500/70',
        hoverBorder: 'hover:border-purple-500',
        confirmBg: 'bg-purple-500',
      }

  // ──────────── Weight conversion helper (gym only) ────────────
  const convertWeight = (weight, fromUnit, toUnit) => {
    if (fromUnit === toUnit) return weight
    if (fromUnit === 'kg' && toUnit === 'lbs') return Math.round(weight * KG_TO_LBS * 2) / 2
    if (fromUnit === 'lbs' && toUnit === 'kg') return Math.round(weight * LBS_TO_KG * 2) / 2
    return weight
  }

  // ──────────── Home mode state ────────────
  const homeCurrentMax = useMemo(
    () => isHome ? inferCurrentMax(exerciseKey, sessionHistory, personalRecords) : 0,
    [isHome, exerciseKey, sessionHistory, personalRecords]
  )

  const [customTarget, setCustomTarget] = useState(() => {
    if (isHome) {
      if (goal) return goal.targetValue
      const suggested = exercise ? Math.ceil(homeCurrentMax * 1.5) || exercise.startReps * 3 : 20
      return Math.max(suggested, (homeCurrentMax || 0) + 5)
    }
    // Gym mode: convert from kg if needed
    return goal ? convertWeight(goal.targetWeight || 0, 'kg', gymWeightUnit) : 0
  })

  const [showConfirm, setShowConfirm] = useState(isHome ? false : null) // home: boolean, gym: null | 'increase' | 'decrease' | 'extend' | 'new'
  const [editMode, setEditMode] = useState(false) // gym only

  // ──────────── Derived state ────────────
  const unit = isHome ? (exercise?.unit || 'reps') : gymWeightUnit
  const unitLabel = isHome
    ? (unit === 'seconds' ? 'sec' : unit)
    : gymWeightUnit

  // Home goal calculations
  const homeCurrentWeek = isHome && goal ? getHomeGoalWeek(goal) : 0
  const homeCurrentTarget = isHome && goal ? getHomeCurrentTarget(goal) : null
  const homeProgress = isHome && goal ? calculateHomeProgress(goal) : 0
  const homeNeedsNew = isHome ? (goal ? shouldSetNewHomeGoal(goal) : true) : false

  // Gym goal calculations
  const gymCurrentWeek = !isHome && goal ? getGymCurrentWeek(goal) : 1
  const gymCurrentTarget = !isHome && goal ? getGymCurrentTarget(goal) : null
  const gymProgress = !isHome && goal ? calculateGymProgress(goal) : 0
  const gymNeedsNew = !isHome && goal ? shouldSetNewGymGoal(goal) : false

  const currentWeek = isHome ? homeCurrentWeek : gymCurrentWeek
  const currentTarget = isHome ? homeCurrentTarget : gymCurrentTarget
  const progress = isHome ? homeProgress : gymProgress
  const needsNewGoal = isHome ? homeNeedsNew : gymNeedsNew

  // Days remaining
  const daysRemaining = useMemo(() => {
    if (!goal) return isHome ? 42 : 0
    const target = new Date(goal.targetDate)
    const now = new Date()
    return Math.max(0, Math.ceil((target - now) / (1000 * 60 * 60 * 24)))
  }, [goal, isHome])

  // Last workout
  const lastWorkout = isHome
    ? goal?.lastWorkout
    : goal?.history?.[goal.history.length - 1]

  // ──────────── Handlers ────────────
  const adjustTarget = (amount) => {
    if (isHome) {
      const step = unit === 'seconds' ? 5 : 2
      setCustomTarget(prev => Math.max(1, prev + (amount > 0 ? step : -step)))
    } else {
      const step = gymWeightUnit === 'lbs' ? 5 : 2.5
      setCustomTarget(prev => Math.max(0, prev + (amount > 0 ? step : -step)))
    }
    vibrate(10)
  }

  const handleCreateGoal = () => {
    vibrate(30)
    if (isHome) {
      const newGoal = createHomeGoal(
        exerciseKey,
        exercise,
        homeCurrentMax || exercise?.startReps || 5,
        customTarget,
        'intermediate'
      )
      onSetGoal(exerciseKey, newGoal)
    } else {
      // Gym: create goal via onSetGoal callback with the custom target
      const weightKg = gymWeightUnit === 'lbs' ? customTarget * LBS_TO_KG : customTarget
      const newGoal = {
        exerciseId: exerciseKey,
        exerciseName: exercise?.name || exerciseKey,
        startingWeight: goal?.startingWeight || weightKg * 0.6,
        startingReps: goal?.startingReps || 8,
        targetWeight: weightKg,
        targetReps: goal?.targetReps || 10,
        fitnessLevel: 'intermediate',
      }
      onSetGoal(exerciseKey, newGoal)
    }
    onClose()
  }

  const handleCreateFollowUp = () => {
    vibrate(30)
    if (isHome) {
      const newGoal = createFollowUpHomeGoal(goal, exercise, 'intermediate')
      onSetGoal(exerciseKey, newGoal)
    } else {
      const newGoal = createGymFollowUpGoal(goal, goal?.fitnessLevel || 'intermediate')
      if (onUpdateGoal) {
        onUpdateGoal(newGoal)
      } else {
        onSetGoal(exerciseKey, newGoal)
      }
    }
    setShowConfirm(isHome ? false : null)
  }

  const handleGymAdjust = (type) => {
    vibrate(30)
    if (!onUpdateGoal) return

    if (type === 'new') {
      const newGoal = createGymFollowUpGoal(goal, goal.fitnessLevel)
      onUpdateGoal(newGoal)
      onClose()
      return
    }

    const amount = goal?.category === 'compound' ? 5 : 2.5
    const updatedGoal = adjustGymGoal(goal, type, amount)
    onUpdateGoal(updatedGoal)
    setShowConfirm(null)
  }

  const saveCustomTarget = () => {
    if (!onUpdateGoal || !goal) return
    const weightKg = gymWeightUnit === 'lbs' ? customTarget * LBS_TO_KG : customTarget
    const diff = weightKg - goal.targetWeight
    const type = diff > 0 ? 'increase' : 'decrease'
    const updatedGoal = adjustGymGoal(goal, type, Math.abs(diff))
    onUpdateGoal(updatedGoal)
    setEditMode(false)
  }

  // ──────────── No goal / needs new goal (setup view) ────────────
  if (!goal || (isHome && needsNewGoal)) {
    // In gym mode with no goal and no exercise, show placeholder
    if (!isHome && !goal) {
      return (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className={`${bgClass} rounded-2xl w-full max-w-md p-6 text-center`}>
            <AlertCircle className={`w-12 h-12 ${textSecondary} mx-auto mb-4`} />
            <h2 className={`text-lg font-bold ${textPrimary} mb-2`}>No Goal Set</h2>
            <p className={textSecondary}>Complete an assessment to set your first goal.</p>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2 bg-purple-500 text-white rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )
    }

    // Home setup view (also shown when home goal completed/expired)
    if (isHome) {
      return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
          <div
            className={`${bgClass} rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto border ${borderColor}`}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${accentClasses.iconBg} flex items-center justify-center`}>
                    <Target className={`w-5 h-5 ${accentClasses.iconText}`} />
                  </div>
                  <div>
                    <h3 className={`font-bold ${textPrimary}`}>Set 6-Week Goal</h3>
                    <p className={`text-xs ${textSecondary}`}>{exercise?.name}</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg">
                  <X size={20} className={textSecondary} />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Previous goal completed banner */}
              {goal?.status === 'completed' && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
                  <Award className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="text-emerald-400 font-bold text-sm">Goal Achieved!</p>
                    <p className={`text-xs ${textSecondary}`}>
                      Reached {goal.targetValue} {unitLabel}. Time for a new challenge.
                    </p>
                  </div>
                </div>
              )}

              {/* Current level */}
              <div className={`${cardBg} rounded-xl p-4 border ${borderColor}`}>
                <p className={`text-xs ${textSecondary} mb-1`}>Your Current Best</p>
                <p className={`text-2xl font-bold ${textPrimary}`}>
                  {homeCurrentMax || exercise?.startReps || '?'} <span className={`text-sm ${textSecondary}`}>{unitLabel}</span>
                </p>
                {homeCurrentMax === 0 && (
                  <p className={`text-xs ${textSecondary} mt-1`}>
                    Complete a workout to set your baseline
                  </p>
                )}
              </div>

              {/* Target selector */}
              <div>
                <p className={`text-xs ${textSecondary} uppercase tracking-wider mb-2`}>Your 6-Week Target</p>
                <div className={`${cardBg} rounded-xl p-4 border-2 ${accentClasses.borderAccent}`}>
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => adjustTarget(-1)}
                      className={`w-10 h-10 rounded-lg ${inputBg} border ${borderColor} flex items-center justify-center ${accentClasses.hoverBorder} transition-colors`}
                    >
                      <ChevronDown className={textSecondary} size={20} />
                    </button>

                    <div className="text-center">
                      <p className={`text-3xl font-bold ${accentClasses.targetText}`}>{customTarget}</p>
                      <p className={`text-xs ${textSecondary}`}>{unitLabel}</p>
                    </div>

                    <button
                      onClick={() => adjustTarget(1)}
                      className={`w-10 h-10 rounded-lg ${inputBg} border ${borderColor} flex items-center justify-center ${accentClasses.hoverBorder} transition-colors`}
                    >
                      <ChevronUp className={textSecondary} size={20} />
                    </button>
                  </div>

                  {/* Increase preview */}
                  <div className="mt-3 text-center">
                    <span className={`text-xs ${textSecondary}`}>
                      +{customTarget - (homeCurrentMax || exercise?.startReps || 0)} {unitLabel} in 6 weeks
                    </span>
                  </div>
                </div>
              </div>

              {/* Final goal reference */}
              {exercise?.finalGoal && (
                <div className="flex items-center justify-between text-xs">
                  <span className={textSecondary}>Exercise Final Goal</span>
                  <span className={`${accentClasses.targetText} font-medium`}>{exercise.finalGoal}</span>
                </div>
              )}

              {/* Set Goal Button */}
              <button
                onClick={handleCreateGoal}
                className={`w-full py-4 bg-gradient-to-r ${accentClasses.gradientFrom} ${accentClasses.gradientTo} text-white rounded-xl font-bold flex items-center justify-center gap-2 ${accentClasses.gradientFromHover} ${accentClasses.gradientToHover} transition-all active:scale-[0.98]`}
              >
                <Target size={18} />
                {goal?.status === 'completed' ? 'Set New Goal' : 'Set Goal'}
              </button>
            </div>
          </div>
        </div>
      )
    }

    // Gym setup view (no goal)
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
        <div
          className={`${bgClass} rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto border ${borderColor}`}
          onClick={e => e.stopPropagation()}
        >
          <div className="p-5 border-b border-slate-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${accentClasses.iconBg} flex items-center justify-center`}>
                  <Target className={`w-5 h-5 ${accentClasses.iconText}`} />
                </div>
                <div>
                  <h3 className={`font-bold ${textPrimary}`}>Set 6-Week Goal</h3>
                  <p className={`text-xs ${textSecondary}`}>{exercise?.name || exerciseKey}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg">
                <X size={20} className={textSecondary} />
              </button>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* Target selector */}
            <div>
              <p className={`text-xs ${textSecondary} uppercase tracking-wider mb-2`}>Your 6-Week Target</p>
              <div className={`${cardBg} rounded-xl p-4 border-2 ${accentClasses.borderAccent}`}>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => adjustTarget(-1)}
                    className={`w-10 h-10 rounded-lg ${inputBg} border ${borderColor} flex items-center justify-center ${accentClasses.hoverBorder} transition-colors`}
                  >
                    <ChevronDown className={textSecondary} size={20} />
                  </button>

                  <div className="text-center">
                    <p className={`text-3xl font-bold ${accentClasses.targetText}`}>{customTarget}{gymWeightUnit}</p>
                    <p className={`text-xs ${textSecondary}`}>{unitLabel}</p>
                  </div>

                  <button
                    onClick={() => adjustTarget(1)}
                    className={`w-10 h-10 rounded-lg ${inputBg} border ${borderColor} flex items-center justify-center ${accentClasses.hoverBorder} transition-colors`}
                  >
                    <ChevronUp className={textSecondary} size={20} />
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleCreateGoal}
              className={`w-full py-4 bg-gradient-to-r ${accentClasses.gradientFrom} ${accentClasses.gradientTo} text-white rounded-xl font-bold flex items-center justify-center gap-2 ${accentClasses.gradientFromHover} ${accentClasses.gradientToHover} transition-all active:scale-[0.98]`}
            >
              <Target size={18} />
              Set Goal
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ──────────── Active goal: Progress view ────────────
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-4" onClick={isHome ? onClose : undefined}>
      <div
        className={`${bgClass} rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto border ${borderColor}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${accentClasses.iconBg} flex items-center justify-center`}>
                <Target className={`w-5 h-5 ${accentClasses.iconText}`} />
              </div>
              <div>
                <h3 className={`font-bold ${textPrimary}`}>6-Week Goal</h3>
                <p className={`text-xs ${textSecondary}`}>
                  {isHome ? exercise?.name : (exercise?.shortName || exercise?.name || goal?.exerciseName)}
                </p>
              </div>
            </div>
            <button onClick={onClose} className={`p-2 ${theme === 'light' ? 'hover:bg-slate-200' : 'hover:bg-slate-800'} rounded-lg`}>
              <X size={20} className={textSecondary} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Goal status banner (gym mode shows for completed/expired) */}
          {!isHome && needsNewGoal && (
            <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
              <div className="flex items-center gap-3">
                <Award className="w-8 h-8 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-emerald-400">
                    {goal.status === 'completed' ? 'Goal Achieved!' : '6 Weeks Complete!'}
                  </h3>
                  <p className={`text-sm ${textSecondary}`}>Time to set a new challenge</p>
                </div>
              </div>
              <button
                onClick={() => setShowConfirm('new')}
                className="mt-3 w-full py-2 bg-emerald-500 text-white rounded-lg font-medium"
              >
                Set New Goal
              </button>
            </div>
          )}

          {/* Progress Overview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${textSecondary}`}>6-Week Progress</span>
              <span className={`text-xs px-2 py-0.5 ${accentClasses.badgeBg} ${accentClasses.badgeText} rounded-full font-medium`}>
                Week {Math.min(currentWeek, 6)}/6
              </span>
            </div>

            {/* Progress bar */}
            <div className={`h-3 ${theme === 'light' ? 'bg-slate-200' : 'bg-slate-700'} rounded-full overflow-hidden`}>
              <div
                className={`h-full rounded-full transition-all ${
                  progress >= 100 ? 'bg-emerald-500' :
                  progress >= 50 ? accentClasses.progressMid :
                  accentClasses.progressLow
                }`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className={`text-xs ${textSecondary}`}>{progress}% complete</span>
              <span className={`text-xs ${textSecondary}`}>{daysRemaining} days left</span>
            </div>
          </div>

          {/* Starting vs Target */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`${cardBg} rounded-xl p-3 border ${borderColor}`}>
              <p className={`text-xs ${textSecondary} mb-1`}>Started At</p>
              <p className={`text-xl font-bold ${textPrimary}`}>
                {isHome
                  ? <>{goal.startingValue} <span className={`text-xs ${textSecondary}`}>{unitLabel}</span></>
                  : <>{convertWeight(goal.startingWeight, 'kg', gymWeightUnit)}{gymWeightUnit}</>
                }
              </p>
              {!isHome && (
                <p className={`text-sm ${textSecondary}`}>&times; {goal.startingReps} reps</p>
              )}
            </div>
            <div className={`${accentClasses.targetBg} rounded-xl p-3 border ${accentClasses.borderAccent}`}>
              <p className={`text-xs ${accentClasses.targetText} mb-1`}>Target</p>
              {isHome ? (
                <p className={`text-xl font-bold ${accentClasses.targetText}`}>
                  {goal.targetValue} <span className={`text-xs ${accentClasses.targetText70}`}>{unitLabel}</span>
                </p>
              ) : editMode ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCustomTarget(prev => Math.max(0, prev - (gymWeightUnit === 'lbs' ? 5 : 2.5)))}
                    className={`p-1 rounded ${theme === 'light' ? 'bg-slate-200' : 'bg-slate-700'}`}
                  >
                    <ChevronDown size={16} className={textSecondary} />
                  </button>
                  <span className={`text-xl font-bold ${accentClasses.targetText}`}>{customTarget}{gymWeightUnit}</span>
                  <button
                    onClick={() => setCustomTarget(prev => prev + (gymWeightUnit === 'lbs' ? 5 : 2.5))}
                    className={`p-1 rounded ${theme === 'light' ? 'bg-slate-200' : 'bg-slate-700'}`}
                  >
                    <ChevronUp size={16} className={textSecondary} />
                  </button>
                </div>
              ) : (
                <p className={`text-xl font-bold ${accentClasses.targetText}`}>
                  {convertWeight(goal.targetWeight, 'kg', gymWeightUnit)}{gymWeightUnit}
                </p>
              )}
              {!isHome && (
                <p className={`text-sm ${textSecondary}`}>&times; {goal.targetReps} reps</p>
              )}
            </div>
          </div>

          {/* This Week's Target */}
          {currentTarget && !(isHome ? false : needsNewGoal) && (
            <div className={`${cardBg} rounded-xl p-4 border ${borderColor}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${textPrimary}`}>This Week&apos;s Target</span>
                {currentTarget.isDeloadWeek && (
                  <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full">
                    {isHome ? 'Form Focus' : 'Deload Week'}
                  </span>
                )}
              </div>
              <p className={`text-2xl font-bold ${accentClasses.targetText}`}>
                {isHome
                  ? <>{currentTarget.targetValue} <span className={`text-sm ${textSecondary}`}>{unitLabel}</span></>
                  : <>{convertWeight(currentTarget.targetWeight, 'kg', gymWeightUnit)}{gymWeightUnit} &times; {currentTarget.targetReps}</>
                }
              </p>

              {/* Last workout result */}
              {lastWorkout && (
                <div className={`mt-3 pt-3 border-t ${borderColor}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${textSecondary}`}>Last Workout</span>
                    <div className="flex items-center gap-1">
                      {isHome ? (
                        <>
                          <span className={`text-sm font-medium ${textPrimary}`}>
                            {goal.lastWorkout.actualValue} {unitLabel}
                          </span>
                          {goal.lastWorkout.diff !== 0 && (
                            <span className={`text-xs ${goal.lastWorkout.diff >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                              ({goal.lastWorkout.diff >= 0 ? '+' : ''}{goal.lastWorkout.diff})
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <span className={textPrimary}>
                            {convertWeight(lastWorkout.actualWeight, 'kg', gymWeightUnit)}{gymWeightUnit} &times; {lastWorkout.actualReps}
                          </span>
                          <span className={`text-sm ${lastWorkout.weightDiff >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {lastWorkout.weightDiff >= 0 ? '+' : ''}{convertWeight(lastWorkout.weightDiff, 'kg', gymWeightUnit)}{gymWeightUnit}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {isHome && goal.lastWorkout?.analysis && (
                    <p className={`text-xs mt-1 ${
                      goal.lastWorkout.analysis.status === 'ahead' ? 'text-emerald-400' :
                      goal.lastWorkout.analysis.status === 'on_track' ? accentClasses.targetText :
                      'text-amber-400'
                    }`}>
                      {goal.lastWorkout.analysis.message}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Weekly Breakdown */}
          <div>
            <p className={`text-xs ${textSecondary} uppercase tracking-wider mb-2`}>Weekly Breakdown</p>
            <div className="space-y-1.5">
              {(isHome ? goal.weeklyTargets : goal.weeklyTargets)?.map((wt) => {
                const isCurrent = isHome
                  ? wt.week === Math.min(currentWeek, 6)
                  : (goal.weeklyTargets.indexOf(wt) === currentWeek - 1)
                const isPast = isHome
                  ? wt.week < currentWeek
                  : (goal.weeklyTargets.indexOf(wt) < currentWeek - 1)
                const weekResult = goal.history?.find(h => h.week === wt.week)

                return (
                  <div
                    key={wt.week}
                    className={`flex items-center justify-between p-2.5 rounded-lg ${
                      isCurrent ? `${accentClasses.currentBg} border ${accentClasses.currentBorder}` :
                      isPast ? 'opacity-60' :
                      `${cardBg} border ${borderColor}`
                    } ${!isCurrent && !isPast ? `${cardBg} border ${borderColor}` : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${isCurrent ? accentClasses.targetText : textSecondary}`}>
                        Wk {wt.week}
                      </span>
                      {wt.isDeloadWeek && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                          {isHome ? 'Form' : 'Deload'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-sm ${isCurrent ? `${accentClasses.targetText} font-medium` : textSecondary}`}>
                        {isHome
                          ? `${wt.targetValue} ${unitLabel}`
                          : `${convertWeight(wt.targetWeight, 'kg', gymWeightUnit)}${gymWeightUnit}`
                        }
                      </span>
                      {weekResult && (
                        <span className={`text-xs ${weekResult.diff >= 0 || weekResult.weightDiff >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {isHome ? <Check size={14} /> : (weekResult.weightDiff >= 0 ? '\u2713' : '\u2717')}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Gym mode: Adjust goal buttons */}
          {!isHome && !needsNewGoal && (
            <div className={`${cardBg} rounded-xl p-4 border ${borderColor}`}>
              <h3 className={`font-medium ${textPrimary} mb-3`}>Adjust Goal</h3>

              {editMode ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditMode(false)}
                    className={`flex-1 py-2 border ${borderColor} ${textSecondary} rounded-lg`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveCustomTarget}
                    className={`flex-1 py-2 ${accentClasses.confirmBg} text-white rounded-lg font-medium`}
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setShowConfirm('increase')}
                    className={`py-2 px-3 rounded-lg ${cardBg} border ${borderColor} ${theme === 'light' ? 'hover:bg-slate-200' : 'hover:bg-slate-700'} flex flex-col items-center gap-1`}
                  >
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    <span className={`text-xs ${textSecondary}`}>Increase</span>
                  </button>
                  <button
                    onClick={() => setShowConfirm('decrease')}
                    className={`py-2 px-3 rounded-lg ${cardBg} border ${borderColor} ${theme === 'light' ? 'hover:bg-slate-200' : 'hover:bg-slate-700'} flex flex-col items-center gap-1`}
                  >
                    <TrendingDown className="w-5 h-5 text-amber-400" />
                    <span className={`text-xs ${textSecondary}`}>Decrease</span>
                  </button>
                  <button
                    onClick={() => setShowConfirm('extend')}
                    className={`py-2 px-3 rounded-lg ${cardBg} border ${borderColor} ${theme === 'light' ? 'hover:bg-slate-200' : 'hover:bg-slate-700'} flex flex-col items-center gap-1`}
                  >
                    <Calendar className="w-5 h-5 text-blue-400" />
                    <span className={`text-xs ${textSecondary}`}>Extend</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Action: Set New Goal (home completed/expired, or gym expired) */}
          {isHome && (goal.status === 'completed' || currentWeek > 6) && (
            <button
              onClick={() => setShowConfirm(true)}
              className={`w-full py-3 bg-gradient-to-r ${accentClasses.gradientFrom} ${accentClasses.gradientTo} text-white rounded-xl font-bold flex items-center justify-center gap-2 ${accentClasses.gradientFromHover} ${accentClasses.gradientToHover} transition-all`}
            >
              <RefreshCw size={16} />
              Set New Goal
            </button>
          )}
        </div>

        {/* Confirmation modal - home mode */}
        {isHome && showConfirm && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={() => setShowConfirm(false)}>
            <div className={`${bgClass} rounded-xl p-5 max-w-sm w-full border ${borderColor}`} onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg ${accentClasses.iconBg} flex items-center justify-center`}>
                  <TrendingUp className={`w-5 h-5 ${accentClasses.iconText}`} />
                </div>
                <div>
                  <p className={`font-bold ${textPrimary}`}>New 6-Week Goal</p>
                  <p className={`text-xs ${textSecondary}`}>Start fresh from your current level</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className={`flex-1 py-2.5 ${cardBg} border ${borderColor} rounded-lg text-sm ${textSecondary}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateFollowUp}
                  className={`flex-1 py-2.5 ${accentClasses.confirmBg} text-white rounded-lg text-sm font-bold`}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation modal - gym mode */}
        {!isHome && showConfirm && (
          <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
            <div className={`${bgClass} rounded-2xl w-full max-w-sm overflow-hidden`}>
              <div className="p-6 text-center">
                <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
                  showConfirm === 'increase' ? 'bg-emerald-500/20' :
                  showConfirm === 'decrease' ? 'bg-amber-500/20' :
                  showConfirm === 'new' ? 'bg-purple-500/20' :
                  'bg-blue-500/20'
                }`}>
                  {showConfirm === 'increase' && <TrendingUp className="w-8 h-8 text-emerald-400" />}
                  {showConfirm === 'decrease' && <TrendingDown className="w-8 h-8 text-amber-400" />}
                  {showConfirm === 'extend' && <Calendar className="w-8 h-8 text-blue-400" />}
                  {showConfirm === 'new' && <RefreshCw className="w-8 h-8 text-purple-400" />}
                </div>

                <h3 className={`text-lg font-bold ${textPrimary} mb-2`}>
                  {showConfirm === 'increase' && 'Increase Target?'}
                  {showConfirm === 'decrease' && 'Decrease Target?'}
                  {showConfirm === 'extend' && 'Extend Timeline?'}
                  {showConfirm === 'new' && 'Set New Goal?'}
                </h3>

                <p className={`text-sm ${textSecondary}`}>
                  {showConfirm === 'increase' && `Add ${goal?.category === 'compound' ? '5kg' : '2.5kg'} to your target weight.`}
                  {showConfirm === 'decrease' && `Reduce your target by ${goal?.category === 'compound' ? '5kg' : '2.5kg'}. No shame in adjusting!`}
                  {showConfirm === 'extend' && 'Add 2 more weeks to reach your current target.'}
                  {showConfirm === 'new' && 'Create a new 6-week goal based on your current progress.'}
                </p>
              </div>

              <div className={`p-4 border-t ${borderColor} flex gap-3`}>
                <button
                  onClick={() => setShowConfirm(null)}
                  className={`flex-1 py-2 border ${borderColor} ${textSecondary} rounded-lg ${theme === 'light' ? 'hover:bg-slate-100' : 'hover:bg-slate-800'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleGymAdjust(showConfirm)}
                  className={`flex-1 py-2 text-white rounded-lg font-medium ${
                    showConfirm === 'increase' ? 'bg-emerald-500 hover:bg-emerald-600' :
                    showConfirm === 'decrease' ? 'bg-amber-500 hover:bg-amber-600' :
                    showConfirm === 'new' ? 'bg-purple-500 hover:bg-purple-600' :
                    'bg-blue-500 hover:bg-blue-600'
                  }`}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default GoalSetter