import { useState, useMemo } from 'react'
import {
  X,
  TrendingUp,
  TrendingDown,
  ChevronUp,
  ChevronDown,
  Calendar,
  Award,
  RefreshCw,
  AlertCircle,
  Target,
  Flame,
  CheckCircle2
} from 'lucide-react'
import { EXERCISE_PLANS } from '../../data/exercises.jsx'
import { vibrate } from '../../utils/device'
import { TOTAL_DAYS_PER_EXERCISE } from '../../utils/constants'

/**
 * Parse final goal string to get numeric value
 * @param {string} goalStr - e.g., "100 Reps" or "180 Seconds"
 * @returns {number} Numeric value
 */
const parseGoalValue = (goalStr) => {
  if (!goalStr) return 0
  const match = goalStr.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : 0
}

/**
 * Format goal value back to string
 * @param {number} value - Numeric value
 * @param {string} unit - 'reps' or 'seconds'
 * @returns {string} Formatted string
 */
const formatGoalValue = (value, unit) => {
  if (unit === 'seconds') return `${value} Seconds`
  return `${value} Reps`
}

/**
 * Calculate current week based on completed days
 * @param {number} completedDays - Number of completed days
 * @returns {number} Current week (1-6)
 */
const getCurrentWeek = (completedDays) => {
  if (completedDays >= TOTAL_DAYS_PER_EXERCISE) return 6
  return Math.floor(completedDays / 3) + 1
}

/**
 * Generate weekly targets for a goal
 * @param {number} startValue - Starting rep/time value
 * @param {number} targetValue - Final goal value
 * @param {number} weeks - Number of weeks (default 6)
 * @returns {Array} Weekly targets
 */
const generateWeeklyTargets = (startValue, targetValue, weeks = 6) => {
  const targets = []
  const increment = (targetValue - startValue) / weeks

  for (let i = 1; i <= weeks; i++) {
    const weekTarget = Math.round(startValue + (increment * i))
    targets.push({
      week: i,
      targetValue: i === weeks ? targetValue : weekTarget,
      isDeloadWeek: i === 4 // Week 4 is typically a deload week
    })
  }

  return targets
}

/**
 * HomeGoalSetter - View and adjust exercise goals for home mode
 */
const HomeGoalSetter = ({
  exerciseKey,
  exercise, // Exercise object from EXERCISE_PLANS
  completedDays = [], // Array of completed day IDs for this exercise
  goal = null, // Custom goal object (if user has modified)
  onUpdateGoal, // (exerciseKey, updatedGoal) => void
  onCreateNewGoal, // (exerciseKey, newGoal) => void
  onClose,
  theme = 'dark'
}) => {
  const [showConfirm, setShowConfirm] = useState(null) // 'increase' | 'decrease' | 'extend' | 'new'

  // Theme classes
  const bgClass = theme === 'light' ? 'bg-white' : 'bg-slate-900'
  const textPrimary = theme === 'light' ? 'text-slate-900' : 'text-white'
  const textSecondary = theme === 'light' ? 'text-slate-600' : 'text-slate-400'
  const borderColor = theme === 'light' ? 'border-slate-200' : 'border-slate-700'
  const cardBg = theme === 'light' ? 'bg-slate-50' : 'bg-slate-800'

  // Get exercise from EXERCISE_PLANS if not provided
  const exerciseData = exercise || EXERCISE_PLANS[exerciseKey]

  // Calculate progress
  const daysCompleted = completedDays?.length || 0
  const totalDays = goal?.totalDays || TOTAL_DAYS_PER_EXERCISE
  const currentWeek = getCurrentWeek(daysCompleted)
  const progress = Math.round((daysCompleted / totalDays) * 100)
  const isComplete = daysCompleted >= totalDays

  // Get goal values
  const startValue = goal?.startValue || exerciseData?.startReps || 10
  const targetValue = goal?.targetValue || parseGoalValue(exerciseData?.finalGoal) || 100
  const unit = exerciseData?.unit || 'reps'

  // Generate weekly targets
  const weeklyTargets = useMemo(() => {
    const weeks = Math.ceil(totalDays / 3)
    return generateWeeklyTargets(startValue, targetValue, weeks)
  }, [startValue, targetValue, totalDays])

  // Days remaining
  const daysRemaining = Math.max(0, totalDays - daysCompleted)

  // Check if goal is achieved or needs new goal
  const needsNewGoal = isComplete

  if (!exerciseData) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
        <div className={`${bgClass} rounded-2xl w-full max-w-md p-6 text-center`}>
          <AlertCircle className={`w-12 h-12 ${textSecondary} mx-auto mb-4`} />
          <h2 className={`text-lg font-bold ${textPrimary} mb-2`}>Exercise Not Found</h2>
          <p className={textSecondary}>Unable to load exercise data.</p>
          <button
            onClick={onClose}
            className="mt-4 px-6 py-2 bg-cyan-500 text-white rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  // Handle goal adjustment
  const handleAdjust = (type) => {
    vibrate(30)

    if (type === 'new') {
      // Create a new goal cycle starting from current achievement
      const newGoal = {
        exerciseKey,
        startValue: targetValue,
        targetValue: Math.round(targetValue * 1.2), // 20% increase for new goal
        totalDays: TOTAL_DAYS_PER_EXERCISE,
        createdAt: new Date().toISOString(),
        status: 'active'
      }
      onCreateNewGoal && onCreateNewGoal(exerciseKey, newGoal)
      onClose()
      return
    }

    // Calculate adjustment amount (10% of current target, min 5)
    const adjustAmount = Math.max(5, Math.round(targetValue * 0.1))

    let updatedGoal = {
      exerciseKey,
      startValue,
      targetValue,
      totalDays,
      modifiedAt: new Date().toISOString(),
      status: 'active'
    }

    if (type === 'increase') {
      updatedGoal.targetValue = targetValue + adjustAmount
    } else if (type === 'decrease') {
      updatedGoal.targetValue = Math.max(startValue + 10, targetValue - adjustAmount)
    } else if (type === 'extend') {
      updatedGoal.totalDays = totalDays + 6 // Add 2 more weeks (6 days)
    }

    onUpdateGoal && onUpdateGoal(exerciseKey, updatedGoal)
    setShowConfirm(null)
  }

  // Get current week target
  const currentWeekTarget = weeklyTargets[Math.min(currentWeek - 1, weeklyTargets.length - 1)]

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
      <div className={`fixed inset-0 ${bgClass} md:inset-4 md:rounded-2xl overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${borderColor}`}>
          <h2 className={`text-xl font-bold ${textPrimary}`}>{exerciseData.name}</h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg ${theme === 'light' ? 'hover:bg-slate-200' : 'hover:bg-slate-800'}`}
          >
            <X className={textSecondary} size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Goal status banner */}
          {needsNewGoal && (
            <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
              <div className="flex items-center gap-3">
                <Award className="w-8 h-8 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-emerald-400">Goal Achieved!</h3>
                  <p className={`text-sm ${textSecondary}`}>
                    You&apos;ve completed all {totalDays} days!
                  </p>
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

          {/* Progress overview */}
          <div className={`${cardBg} rounded-xl p-4 border ${borderColor}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`font-medium ${textPrimary}`}>6-Week Progress</h3>
              <span className={`text-sm ${textSecondary}`}>Week {Math.min(currentWeek, Math.ceil(totalDays / 3))}/{Math.ceil(totalDays / 3)}</span>
            </div>

            {/* Progress bar */}
            <div className={`h-3 ${theme === 'light' ? 'bg-slate-200' : 'bg-slate-700'} rounded-full overflow-hidden mb-2`}>
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex justify-between text-sm">
              <span className={textSecondary}>{progress}% complete</span>
              <span className={textSecondary}>{daysRemaining} days left</span>
            </div>
          </div>

          {/* Current vs Target */}
          <div className="grid grid-cols-2 gap-3">
            {/* Starting point */}
            <div className={`${cardBg} rounded-xl p-4 border ${borderColor}`}>
              <p className={`text-xs ${textSecondary} mb-1`}>Started At</p>
              <p className={`text-2xl font-bold ${textPrimary}`}>
                {startValue}
              </p>
              <p className={`text-sm ${textSecondary}`}>
                {unit}
              </p>
            </div>

            {/* Target */}
            <div className={`${cardBg} rounded-xl p-4 border border-cyan-500/30 bg-cyan-500/5`}>
              <p className="text-xs text-cyan-400 mb-1">Target</p>
              <p className="text-2xl font-bold text-cyan-400">
                {targetValue}
              </p>
              <p className={`text-sm ${textSecondary}`}>
                {unit}
              </p>
            </div>
          </div>

          {/* This week's target */}
          {currentWeekTarget && !needsNewGoal && (
            <div className={`${cardBg} rounded-xl p-4 border ${borderColor}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs ${textSecondary}`}>This Week&apos;s Target</p>
                  <p className={`text-xl font-bold ${textPrimary}`}>
                    {currentWeekTarget.targetValue} {unit}
                  </p>
                </div>
                {currentWeekTarget.isDeloadWeek && (
                  <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full">
                    Recovery Week
                  </span>
                )}
              </div>

              {/* Day progress within week */}
              <div className={`mt-3 pt-3 border-t ${borderColor}`}>
                <p className={`text-xs ${textSecondary} mb-2`}>Days This Week</p>
                <div className="flex gap-2">
                  {[1, 2, 3].map((day) => {
                    const dayIndex = ((currentWeek - 1) * 3) + day
                    const isCompleted = dayIndex <= daysCompleted
                    const isCurrent = dayIndex === daysCompleted + 1
                    return (
                      <div
                        key={day}
                        className={`flex-1 h-8 rounded-lg flex items-center justify-center text-xs font-medium ${
                          isCompleted
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                            : isCurrent
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-slate-700/50 text-slate-500 border border-slate-600/30'
                        }`}
                      >
                        {isCompleted ? <CheckCircle2 size={14} /> : `Day ${day}`}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Weekly breakdown */}
          <div className={`${cardBg} rounded-xl p-4 border ${borderColor}`}>
            <h3 className={`font-medium ${textPrimary} mb-3`}>Weekly Targets</h3>
            <div className="space-y-2">
              {weeklyTargets.map((week) => {
                const weekStartDay = (week.week - 1) * 3
                const weekEndDay = week.week * 3
                const isPast = daysCompleted >= weekEndDay
                const isCurrent = daysCompleted >= weekStartDay && daysCompleted < weekEndDay
                const weekDaysCompleted = Math.max(0, Math.min(3, daysCompleted - weekStartDay))

                return (
                  <div
                    key={week.week}
                    className={`flex items-center justify-between p-2 rounded-lg ${
                      isCurrent
                        ? 'bg-cyan-500/20 border border-cyan-500/30'
                        : isPast
                          ? 'opacity-60'
                          : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${isCurrent ? 'text-cyan-400' : textSecondary}`}>
                        Week {week.week}
                      </span>
                      {week.isDeloadWeek && (
                        <span className="text-xs px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                          Recovery
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-sm ${isCurrent ? textPrimary : textSecondary}`}>
                        {week.targetValue} {unit}
                      </span>

                      {isPast && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      )}
                      {isCurrent && (
                        <span className="text-xs text-cyan-400">
                          {weekDaysCompleted}/3
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Adjust goal buttons */}
          {!needsNewGoal && (
            <div className={`${cardBg} rounded-xl p-4 border ${borderColor}`}>
              <h3 className={`font-medium ${textPrimary} mb-3`}>Adjust Goal</h3>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setShowConfirm('increase')}
                  className={`py-3 px-3 rounded-lg ${cardBg} border ${borderColor} ${theme === 'light' ? 'hover:bg-slate-200' : 'hover:bg-slate-700'} flex flex-col items-center gap-1 transition-colors`}
                >
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  <span className={`text-xs ${textSecondary}`}>Increase</span>
                </button>
                <button
                  onClick={() => setShowConfirm('decrease')}
                  className={`py-3 px-3 rounded-lg ${cardBg} border ${borderColor} ${theme === 'light' ? 'hover:bg-slate-200' : 'hover:bg-slate-700'} flex flex-col items-center gap-1 transition-colors`}
                >
                  <TrendingDown className="w-5 h-5 text-amber-400" />
                  <span className={`text-xs ${textSecondary}`}>Decrease</span>
                </button>
                <button
                  onClick={() => setShowConfirm('extend')}
                  className={`py-3 px-3 rounded-lg ${cardBg} border ${borderColor} ${theme === 'light' ? 'hover:bg-slate-200' : 'hover:bg-slate-700'} flex flex-col items-center gap-1 transition-colors`}
                >
                  <Calendar className="w-5 h-5 text-blue-400" />
                  <span className={`text-xs ${textSecondary}`}>Extend</span>
                </button>
              </div>
            </div>
          )}

          {/* Motivation section */}
          <div className={`${cardBg} rounded-xl p-4 border ${borderColor}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <Flame className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className={`font-medium ${textPrimary}`}>
                  {daysCompleted === 0
                    ? 'Ready to start!'
                    : daysCompleted < 6
                      ? 'Building momentum!'
                      : daysCompleted < 12
                        ? 'Halfway there!'
                        : daysCompleted < 18
                          ? 'Almost there!'
                          : 'Champion!'}
                </p>
                <p className={`text-sm ${textSecondary}`}>
                  {daysCompleted === 0
                    ? `Your journey to ${targetValue} ${unit} begins now`
                    : `${daysCompleted} day${daysCompleted !== 1 ? 's' : ''} down, ${daysRemaining} to go`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
          <div className={`${bgClass} rounded-2xl w-full max-w-sm overflow-hidden`}>
            <div className="p-6 text-center">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
                showConfirm === 'increase' ? 'bg-emerald-500/20' :
                showConfirm === 'decrease' ? 'bg-amber-500/20' :
                showConfirm === 'new' ? 'bg-cyan-500/20' :
                'bg-blue-500/20'
              }`}>
                {showConfirm === 'increase' && <TrendingUp className="w-8 h-8 text-emerald-400" />}
                {showConfirm === 'decrease' && <TrendingDown className="w-8 h-8 text-amber-400" />}
                {showConfirm === 'extend' && <Calendar className="w-8 h-8 text-blue-400" />}
                {showConfirm === 'new' && <RefreshCw className="w-8 h-8 text-cyan-400" />}
              </div>

              <h3 className={`text-lg font-bold ${textPrimary} mb-2`}>
                {showConfirm === 'increase' && 'Increase Target?'}
                {showConfirm === 'decrease' && 'Decrease Target?'}
                {showConfirm === 'extend' && 'Extend Timeline?'}
                {showConfirm === 'new' && 'Set New Goal?'}
              </h3>

              <p className={`text-sm ${textSecondary}`}>
                {showConfirm === 'increase' && `Increase your target by ${Math.max(5, Math.round(targetValue * 0.1))} ${unit}.`}
                {showConfirm === 'decrease' && `Reduce your target by ${Math.max(5, Math.round(targetValue * 0.1))} ${unit}. No shame in adjusting!`}
                {showConfirm === 'extend' && 'Add 2 more weeks to reach your current target.'}
                {showConfirm === 'new' && 'Create a new 6-week goal with a 20% higher target.'}
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
                onClick={() => handleAdjust(showConfirm)}
                className={`flex-1 py-2 text-white rounded-lg font-medium ${
                  showConfirm === 'increase' ? 'bg-emerald-500 hover:bg-emerald-600' :
                  showConfirm === 'decrease' ? 'bg-amber-500 hover:bg-amber-600' :
                  showConfirm === 'new' ? 'bg-cyan-500 hover:bg-cyan-600' :
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
  )
}

export default HomeGoalSetter
