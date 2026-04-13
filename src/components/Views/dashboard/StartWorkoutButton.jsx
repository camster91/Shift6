import { memo } from 'react'
import { Play, ChevronRight } from 'lucide-react'
import { vibrate } from '../../../utils/device'

/**
 * StartWorkoutButton - Mode-aware hero button for starting a workout.
 *
 * Home mode: cyan gradient, shows "Start Today's Stack" or "Start Workout"
 * Gym mode: purple gradient, shows the day name (e.g. "Start Push Day")
 * Rest day: shows "Workout Anyway" with muted styling
 */
const StartWorkoutButton = ({
  mode = 'home',
  todayWorkout = '',
  isRestDay = false,
  onStart,
  theme = 'dark',
}) => {
  const isHome = mode === 'home'

  // Gradient classes per mode
  const gradientClasses = isRestDay
    ? 'bg-slate-700 hover:bg-slate-600 border border-slate-600'
    : isHome
      ? 'bg-gradient-to-br from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 shadow-lg shadow-cyan-500/20'
      : 'bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-500/20'

  // Label logic
  const getLabel = () => {
    if (isRestDay) return 'Workout Anyway'
    if (isHome) {
      return todayWorkout || 'Start Workout'
    }
    // Gym mode - todayWorkout contains day name like "Push Day"
    return todayWorkout ? `Start ${todayWorkout}` : 'Start Workout'
  }

  // Sub-label
  const getSubLabel = () => {
    if (isRestDay) {
      return isHome ? 'Rest day — go if you want' : 'Rest day — go if you want'
    }
    if (isHome) return 'Today\'s Stack'
    return 'Ready to train'
  }

  const textColor = isRestDay ? 'text-slate-300' : 'text-white'
  const subTextColor = isRestDay ? 'text-slate-400' : isHome ? 'text-cyan-200' : 'text-purple-200'

  return (
    <button
      onClick={() => {
        vibrate(20)
        onStart?.()
      }}
      className={`w-full rounded-2xl p-5 text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${gradientClasses}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm ${subTextColor} flex items-center gap-1`}>
            <Play className="w-3 h-3" />
            {getSubLabel()}
          </p>
          <h3 className={`text-xl font-bold ${textColor} mt-1`}>
            {getLabel()}
          </h3>
        </div>
        <div className={`w-12 h-12 rounded-xl ${
          isRestDay
            ? 'bg-white/10'
            : isHome
              ? 'bg-white/20'
              : 'bg-white/20'
        } flex items-center justify-center group-hover:scale-110 transition-transform`}>
          <ChevronRight className={`w-6 h-6 ${textColor}`} />
        </div>
      </div>
    </button>
  )
}

export default memo(StartWorkoutButton)