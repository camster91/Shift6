import { memo, useMemo } from 'react'
import { Home, Dumbbell, Calendar, TrendingUp } from 'lucide-react'

/**
 * RecentWorkouts - Merged recent workouts list from both home and gym histories.
 *
 * Merges both histories, sorts by date desc, shows last 5 entries.
 * Each entry has a Home or Dumbbell icon indicating the mode.
 */
const RecentWorkouts = ({
  sessionHistory = [],
  gymHistory = [],
  allExercises = {},
  theme = 'dark',
}) => {
  const cardBg = theme === 'light' ? 'bg-white' : 'bg-slate-900'
  const textPrimary = theme === 'light' ? 'text-slate-900' : 'text-white'
  const textSecondary = theme === 'light' ? 'text-slate-600' : 'text-slate-400'
  const borderColor = theme === 'light' ? 'border-slate-200' : 'border-slate-800'

  // Merge and sort both histories by date descending
  const mergedWorkouts = useMemo(() => {
    const homeEntries = (sessionHistory || []).map(w => ({
      ...w,
      _mode: 'home',
      _date: new Date(w.date),
    }))

    const gymEntries = (gymHistory || []).map(w => ({
      ...w,
      _mode: 'gym',
      _date: new Date(w.date),
    }))

    return [...homeEntries, ...gymEntries]
      .sort((a, b) => b._date - a._date)
      .slice(0, 5)
  }, [sessionHistory, gymHistory])

  if (mergedWorkouts.length === 0) {
    return (
      <div className="animate-fadeIn">
        <h3 className={`text-sm font-medium ${textSecondary} mb-3 uppercase tracking-wider`}>Recent Workouts</h3>
        <div className={`${cardBg} rounded-xl p-6 text-center border ${borderColor}`}>
          <TrendingUp className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <p className={textSecondary}>Complete your first workout to see history</p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fadeIn">
      <h3 className={`text-sm font-medium ${textSecondary} mb-3 uppercase tracking-wider`}>Recent Workouts</h3>
      <div className="space-y-2">
        {mergedWorkouts.map((workout, idx) => {
          const date = workout._date
          const isToday = date.toDateString() === new Date().toDateString()
          const isYesterday = date.toDateString() === new Date(Date.now() - 86400000).toDateString()
          const dayName = isToday ? 'Today' : isYesterday ? 'Yesterday' : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

          const isHome = workout._mode === 'home'
          const ModeIcon = isHome ? Home : Dumbbell

          // Name differs by mode
          const workoutName = isHome
            ? (allExercises[workout.exerciseKey]?.name || workout.exerciseKey)
            : (workout.dayName || 'Gym Workout')

          // Volume / stats differ by mode
          const statPrimary = isHome
            ? `${workout.volume} ${workout.unit || 'reps'}`
            : `${Math.round(workout.exercises?.reduce((sum, e) => sum + (e.totalVolume || 0), 0) || 0).toLocaleString()} kg`

          const statSecondary = isHome
            ? `Day ${workout.dayId || ''}`
            : `${workout.duration || '~45'} min`

          const iconColor = isHome ? 'text-cyan-400' : 'text-purple-400'
          const iconBg = isHome ? 'bg-cyan-500/20' : 'bg-purple-500/20'

          return (
            <div
              key={`${workout._mode}-${idx}`}
              className={`${cardBg} rounded-xl p-4 flex items-center justify-between border ${borderColor} hover:border-${isHome ? 'cyan' : 'purple'}-500/30 transition-colors`}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>
                  <ModeIcon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <div>
                  <p className={`font-medium ${textPrimary}`}>{workoutName}</p>
                  <p className={`text-sm ${textSecondary}`}>{dayName}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`${isHome ? 'text-cyan-400' : 'text-purple-400'} font-medium`}>{statPrimary}</p>
                <p className={`text-xs ${textSecondary}`}>{statSecondary}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default memo(RecentWorkouts)