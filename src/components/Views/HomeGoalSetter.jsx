import { useState, useMemo } from 'react'
import {
  X,
  Target,
  TrendingUp,
  ChevronUp,
  ChevronDown,
  Award,
  RefreshCw,
  Check
} from 'lucide-react'
import { vibrate } from '../../utils/device'
import {
  getHomeGoalWeek,
  getHomeCurrentTarget,
  calculateHomeProgress,
  createHomeGoal,
  createFollowUpHomeGoal,
  shouldSetNewHomeGoal,
  inferCurrentMax
} from '../../utils/homeGoals'

/**
 * HomeGoalSetter - Set and view 6-week goals for home mode exercises
 */
const HomeGoalSetter = ({
  exerciseKey,
  exercise,
  goal, // existing goal or null
  sessionHistory = [],
  personalRecords = {},
  onSetGoal, // (exerciseKey, goal) => void
  onClose,
  theme = 'dark'
}) => {
  // Infer current max from history
  const currentMax = useMemo(
    () => inferCurrentMax(exerciseKey, sessionHistory, personalRecords),
    [exerciseKey, sessionHistory, personalRecords]
  )

  const [customTarget, setCustomTarget] = useState(() => {
    if (goal) return goal.targetValue
    // Suggest a default target
    const suggested = exercise ? Math.ceil(currentMax * 1.5) || exercise.startReps * 3 : 20
    return Math.max(suggested, (currentMax || 0) + 5)
  })
  const [showConfirm, setShowConfirm] = useState(false)

  // Theme
  const bgClass = theme === 'light' ? 'bg-white' : 'bg-slate-900'
  const textPrimary = theme === 'light' ? 'text-slate-900' : 'text-white'
  const textSecondary = theme === 'light' ? 'text-slate-600' : 'text-slate-400'
  const borderColor = theme === 'light' ? 'border-slate-200' : 'border-slate-700'
  const cardBg = theme === 'light' ? 'bg-slate-50' : 'bg-slate-800'
  const inputBg = theme === 'light' ? 'bg-slate-100' : 'bg-slate-800'

  // Goal state
  const currentWeek = goal ? getHomeGoalWeek(goal) : 0
  const currentTarget = goal ? getHomeCurrentTarget(goal) : null
  const progress = goal ? calculateHomeProgress(goal) : 0
  const needsNewGoal = goal ? shouldSetNewHomeGoal(goal) : true
  const unit = exercise?.unit || 'reps'
  const unitLabel = unit === 'seconds' ? 'sec' : unit

  // Days remaining
  const daysRemaining = useMemo(() => {
    if (!goal) return 42
    const target = new Date(goal.targetDate)
    const now = new Date()
    return Math.max(0, Math.ceil((target - now) / (1000 * 60 * 60 * 24)))
  }, [goal])

  const handleCreateGoal = () => {
    vibrate(30)
    const newGoal = createHomeGoal(
      exerciseKey,
      exercise,
      currentMax || exercise?.startReps || 5,
      customTarget,
      'intermediate'
    )
    onSetGoal(exerciseKey, newGoal)
    onClose()
  }

  const handleCreateFollowUp = () => {
    vibrate(30)
    const newGoal = createFollowUpHomeGoal(goal, exercise, 'intermediate')
    onSetGoal(exerciseKey, newGoal)
    setShowConfirm(false)
  }

  // Increment/decrement target
  const adjustTarget = (amount) => {
    setCustomTarget(prev => Math.max(1, prev + amount))
    vibrate(10)
  }

  // === No existing goal - show setup view ===
  if (!goal || needsNewGoal) {
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
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                  <Target className="w-5 h-5 text-cyan-400" />
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
                {currentMax || exercise?.startReps || '?'} <span className={`text-sm ${textSecondary}`}>{unitLabel}</span>
              </p>
              {currentMax === 0 && (
                <p className={`text-xs ${textSecondary} mt-1`}>
                  Complete a workout to set your baseline
                </p>
              )}
            </div>

            {/* Target selector */}
            <div>
              <p className={`text-xs ${textSecondary} uppercase tracking-wider mb-2`}>Your 6-Week Target</p>
              <div className={`${cardBg} rounded-xl p-4 border-2 border-cyan-500/30`}>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => adjustTarget(unit === 'seconds' ? -5 : -2)}
                    className={`w-10 h-10 rounded-lg ${inputBg} border ${borderColor} flex items-center justify-center hover:border-cyan-500 transition-colors`}
                  >
                    <ChevronDown className={textSecondary} size={20} />
                  </button>

                  <div className="text-center">
                    <p className="text-3xl font-bold text-cyan-400">{customTarget}</p>
                    <p className={`text-xs ${textSecondary}`}>{unitLabel}</p>
                  </div>

                  <button
                    onClick={() => adjustTarget(unit === 'seconds' ? 5 : 2)}
                    className={`w-10 h-10 rounded-lg ${inputBg} border ${borderColor} flex items-center justify-center hover:border-cyan-500 transition-colors`}
                  >
                    <ChevronUp className={textSecondary} size={20} />
                  </button>
                </div>

                {/* Increase preview */}
                <div className="mt-3 text-center">
                  <span className={`text-xs ${textSecondary}`}>
                    +{customTarget - (currentMax || exercise?.startReps || 0)} {unitLabel} in 6 weeks
                  </span>
                </div>
              </div>
            </div>

            {/* Final goal reference */}
            {exercise?.finalGoal && (
              <div className="flex items-center justify-between text-xs">
                <span className={textSecondary}>Exercise Final Goal</span>
                <span className="text-cyan-400 font-medium">{exercise.finalGoal}</span>
              </div>
            )}

            {/* Set Goal Button */}
            <button
              onClick={handleCreateGoal}
              className="w-full py-4 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:from-cyan-600 hover:to-teal-600 transition-all active:scale-[0.98]"
            >
              <Target size={18} />
              {goal?.status === 'completed' ? 'Set New Goal' : 'Set Goal'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // === Existing active goal - show progress view ===
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
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className={`font-bold ${textPrimary}`}>6-Week Goal</h3>
                <p className={`text-xs ${textSecondary}`}>{exercise?.name}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg">
              <X size={20} className={textSecondary} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Progress Overview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${textSecondary}`}>6-Week Progress</span>
              <span className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-full font-medium">
                Week {Math.min(currentWeek, 6)}/6
              </span>
            </div>

            {/* Progress bar */}
            <div className={`h-3 ${theme === 'light' ? 'bg-slate-200' : 'bg-slate-700'} rounded-full overflow-hidden`}>
              <div
                className={`h-full rounded-full transition-all ${
                  progress >= 100 ? 'bg-emerald-500' :
                  progress >= 50 ? 'bg-gradient-to-r from-cyan-500 to-teal-500' :
                  'bg-cyan-500/70'
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
                {goal.startingValue} <span className={`text-xs ${textSecondary}`}>{unitLabel}</span>
              </p>
            </div>
            <div className="bg-cyan-500/5 rounded-xl p-3 border border-cyan-500/30">
              <p className="text-xs text-cyan-400 mb-1">Target</p>
              <p className="text-xl font-bold text-cyan-400">
                {goal.targetValue} <span className="text-xs text-cyan-400/70">{unitLabel}</span>
              </p>
            </div>
          </div>

          {/* This Week's Target */}
          {currentTarget && (
            <div className={`${cardBg} rounded-xl p-4 border ${borderColor}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${textPrimary}`}>This Week&apos;s Target</span>
                {currentTarget.isDeloadWeek && (
                  <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full">
                    Form Focus
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-cyan-400">
                {currentTarget.targetValue} <span className={`text-sm ${textSecondary}`}>{unitLabel}</span>
              </p>

              {/* Last workout result */}
              {goal.lastWorkout && (
                <div className={`mt-3 pt-3 border-t ${borderColor}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${textSecondary}`}>Last Workout</span>
                    <div className="flex items-center gap-1">
                      <span className={`text-sm font-medium ${textPrimary}`}>
                        {goal.lastWorkout.actualValue} {unitLabel}
                      </span>
                      {goal.lastWorkout.diff !== 0 && (
                        <span className={`text-xs ${goal.lastWorkout.diff >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          ({goal.lastWorkout.diff >= 0 ? '+' : ''}{goal.lastWorkout.diff})
                        </span>
                      )}
                    </div>
                  </div>
                  {goal.lastWorkout.analysis && (
                    <p className={`text-xs mt-1 ${
                      goal.lastWorkout.analysis.status === 'ahead' ? 'text-emerald-400' :
                      goal.lastWorkout.analysis.status === 'on_track' ? 'text-cyan-400' :
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
              {goal.weeklyTargets?.map((wt) => {
                const isCurrent = wt.week === Math.min(currentWeek, 6)
                const isPast = wt.week < currentWeek
                const weekResult = goal.history?.find(h => h.week === wt.week)

                return (
                  <div
                    key={wt.week}
                    className={`flex items-center justify-between p-2.5 rounded-lg ${
                      isCurrent ? 'bg-cyan-500/10 border border-cyan-500/30' :
                      isPast ? 'opacity-60' : ''
                    } ${!isCurrent && !isPast ? `${cardBg} border ${borderColor}` : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${isCurrent ? 'text-cyan-400' : textSecondary}`}>
                        Wk {wt.week}
                      </span>
                      {wt.isDeloadWeek && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                          Form
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-sm ${isCurrent ? 'text-cyan-400 font-medium' : textSecondary}`}>
                        {wt.targetValue} {unitLabel}
                      </span>
                      {weekResult && (
                        <span className={`text-xs ${weekResult.diff >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          <Check size={14} />
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Action: Set New Goal (if completed or expired) */}
          {(goal.status === 'completed' || currentWeek > 6) && (
            <button
              onClick={() => setShowConfirm(true)}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:from-cyan-600 hover:to-teal-600 transition-all"
            >
              <RefreshCw size={16} />
              Set New Goal
            </button>
          )}
        </div>

        {/* Confirmation modal for new goal */}
        {showConfirm && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={() => setShowConfirm(false)}>
            <div className={`${bgClass} rounded-xl p-5 max-w-sm w-full border ${borderColor}`} onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-cyan-400" />
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
                  className="flex-1 py-2.5 bg-cyan-500 text-white rounded-lg text-sm font-bold"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default HomeGoalSetter
