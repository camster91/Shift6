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
  AlertCircle
} from 'lucide-react'
import { GYM_EXERCISES } from '../../data/gymExercises'
import { vibrate } from '../../utils/device'
import { KG_TO_LBS, LBS_TO_KG } from '../../utils/constants'
import {
  getCurrentWeek,
  getCurrentTarget,
  calculateProgress,
  adjustGoal,
  createFollowUpGoal,
  shouldSetNewGoal
} from '../../utils/gymProgression'

/**
 * Convert weight between kg and lbs
 */
const convertWeight = (weight, fromUnit, toUnit) => {
  if (fromUnit === toUnit) return weight
  if (fromUnit === 'kg' && toUnit === 'lbs') {
    return Math.round(weight * KG_TO_LBS * 2) / 2
  }
  if (fromUnit === 'lbs' && toUnit === 'kg') {
    return Math.round(weight * LBS_TO_KG * 2) / 2
  }
  return weight
}

/**
 * GymGoalSetter - View and adjust exercise goals
 */
const GymGoalSetter = ({
  goal, // Current goal object
  gymWeightUnit = 'kg',
  onUpdateGoal, // (updatedGoal) => void
  onCreateNewGoal, // (newGoal) => void
  onClose,
  theme = 'dark'
}) => {
  const [editMode, setEditMode] = useState(false)
  const [customTarget, setCustomTarget] = useState(goal?.targetWeight || 0)
  const [showConfirm, setShowConfirm] = useState(null) // 'increase' | 'decrease' | 'extend' | 'new'

  const exercise = goal ? GYM_EXERCISES[goal.exerciseId] : null

  // Theme classes
  const bgClass = theme === 'light' ? 'bg-white' : 'bg-slate-900'
  const textPrimary = theme === 'light' ? 'text-slate-900' : 'text-white'
  const textSecondary = theme === 'light' ? 'text-slate-600' : 'text-slate-400'
  const borderColor = theme === 'light' ? 'border-slate-200' : 'border-slate-700'
  const cardBg = theme === 'light' ? 'bg-slate-50' : 'bg-slate-800'

  // Calculate current state
  const currentWeek = goal ? getCurrentWeek(goal) : 1
  const currentTarget = goal ? getCurrentTarget(goal) : null
  const progress = goal ? calculateProgress(goal) : 0
  const needsNewGoal = goal ? shouldSetNewGoal(goal) : false

  // Days remaining
  const daysRemaining = useMemo(() => {
    if (!goal) return 0
    const target = new Date(goal.targetDate)
    const now = new Date()
    return Math.max(0, Math.ceil((target - now) / (1000 * 60 * 60 * 24)))
  }, [goal])

  // Get last workout result
  const lastWorkout = goal?.history?.[goal.history.length - 1]

  if (!goal || !exercise) {
    return (
      <div className={`fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4`}>
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

  // Handle goal adjustment
  const handleAdjust = (type) => {
    vibrate(30)

    if (type === 'new') {
      const newGoal = createFollowUpGoal(goal, goal.fitnessLevel)
      onCreateNewGoal(newGoal)
      onClose()
      return
    }

    let amount = 0
    if (type === 'increase') {
      amount = goal.category === 'compound' ? 5 : 2.5
    } else if (type === 'decrease') {
      amount = goal.category === 'compound' ? 5 : 2.5
    }

    const updatedGoal = adjustGoal(goal, type, amount)
    onUpdateGoal(updatedGoal)
    setShowConfirm(null)
  }

  // Save custom target
  const saveCustomTarget = () => {
    const weightKg = gymWeightUnit === 'lbs'
      ? customTarget * LBS_TO_KG
      : customTarget

    const diff = weightKg - goal.targetWeight
    const type = diff > 0 ? 'increase' : 'decrease'

    const updatedGoal = adjustGoal(goal, type, Math.abs(diff))
    onUpdateGoal(updatedGoal)
    setEditMode(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
      <div className={`fixed inset-0 ${bgClass} md:inset-4 md:rounded-2xl overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${borderColor}`}>
          <h2 className={`text-xl font-bold ${textPrimary}`}>{exercise.shortName || exercise.name}</h2>
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
            <div className={`p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/30`}>
              <div className="flex items-center gap-3">
                <Award className="w-8 h-8 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-emerald-400">
                    {goal.status === 'completed' ? 'Goal Achieved!' : '6 Weeks Complete!'}
                  </h3>
                  <p className={`text-sm ${textSecondary}`}>
                    Time to set a new challenge
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
              <span className={`text-sm ${textSecondary}`}>Week {Math.min(currentWeek, 6)}/6</span>
            </div>

            {/* Progress bar */}
            <div className={`h-3 ${theme === 'light' ? 'bg-slate-200' : 'bg-slate-700'} rounded-full overflow-hidden mb-2`}>
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
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
                {convertWeight(goal.startingWeight, 'kg', gymWeightUnit)}{gymWeightUnit}
              </p>
              <p className={`text-sm ${textSecondary}`}>
                × {goal.startingReps} reps
              </p>
            </div>

            {/* Target */}
            <div className={`${cardBg} rounded-xl p-4 border border-purple-500/30 bg-purple-500/5`}>
              <p className={`text-xs text-purple-400 mb-1`}>Target</p>
              {editMode ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCustomTarget(prev => Math.max(0, prev - 2.5))}
                    className={`p-1 rounded ${theme === 'light' ? 'bg-slate-200' : 'bg-slate-700'}`}
                  >
                    <ChevronDown size={16} className={textSecondary} />
                  </button>
                  <span className="text-xl font-bold text-purple-400">{customTarget}</span>
                  <button
                    onClick={() => setCustomTarget(prev => prev + 2.5)}
                    className={`p-1 rounded ${theme === 'light' ? 'bg-slate-200' : 'bg-slate-700'}`}
                  >
                    <ChevronUp size={16} className={textSecondary} />
                  </button>
                </div>
              ) : (
                <p className="text-2xl font-bold text-purple-400">
                  {convertWeight(goal.targetWeight, 'kg', gymWeightUnit)}{gymWeightUnit}
                </p>
              )}
              <p className={`text-sm ${textSecondary}`}>
                × {goal.targetReps} reps
              </p>
            </div>
          </div>

          {/* This week's target */}
          {currentTarget && !needsNewGoal && (
            <div className={`${cardBg} rounded-xl p-4 border ${borderColor}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs ${textSecondary}`}>This Week&apos;s Target</p>
                  <p className={`text-xl font-bold ${textPrimary}`}>
                    {convertWeight(currentTarget.targetWeight, 'kg', gymWeightUnit)}{gymWeightUnit} × {currentTarget.targetReps}
                  </p>
                </div>
                {currentTarget.isDeloadWeek && (
                  <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full">
                    Deload Week
                  </span>
                )}
              </div>

              {lastWorkout && (
                <div className={`mt-3 pt-3 border-t ${borderColor}`}>
                  <p className={`text-xs ${textSecondary} mb-1`}>Last Workout</p>
                  <div className="flex items-center justify-between">
                    <span className={textPrimary}>
                      {convertWeight(lastWorkout.actualWeight, 'kg', gymWeightUnit)}{gymWeightUnit} × {lastWorkout.actualReps}
                    </span>
                    <span className={`text-sm ${
                      lastWorkout.weightDiff >= 0 ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {lastWorkout.weightDiff >= 0 ? '+' : ''}{convertWeight(lastWorkout.weightDiff, 'kg', gymWeightUnit)}{gymWeightUnit}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Weekly breakdown */}
          <div className={`${cardBg} rounded-xl p-4 border ${borderColor}`}>
            <h3 className={`font-medium ${textPrimary} mb-3`}>Weekly Targets</h3>
            <div className="space-y-2">
              {goal.weeklyTargets.map((week, i) => {
                const isPast = i < currentWeek - 1
                const isCurrent = i === currentWeek - 1
                const weekResult = goal.history.find(h => h.week === week.week)

                return (
                  <div
                    key={week.week}
                    className={`flex items-center justify-between p-2 rounded-lg ${
                      isCurrent
                        ? 'bg-purple-500/20 border border-purple-500/30'
                        : isPast
                          ? 'opacity-60'
                          : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${isCurrent ? 'text-purple-400' : textSecondary}`}>
                        Week {week.week}
                      </span>
                      {week.isDeloadWeek && (
                        <span className="text-xs px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                          Deload
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-sm ${isCurrent ? textPrimary : textSecondary}`}>
                        {convertWeight(week.targetWeight, 'kg', gymWeightUnit)}{gymWeightUnit}
                      </span>

                      {weekResult && (
                        <span className={`text-xs ${
                          weekResult.weightDiff >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {weekResult.weightDiff >= 0 ? '✓' : '✗'}
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
                    className="flex-1 py-2 bg-purple-500 text-white rounded-lg font-medium"
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
                {showConfirm === 'increase' && `Add ${goal.category === 'compound' ? '5kg' : '2.5kg'} to your target weight.`}
                {showConfirm === 'decrease' && `Reduce your target by ${goal.category === 'compound' ? '5kg' : '2.5kg'}. No shame in adjusting!`}
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
                onClick={() => handleAdjust(showConfirm)}
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
  )
}

export default GymGoalSetter
